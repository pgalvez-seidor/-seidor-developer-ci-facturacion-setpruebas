require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createPrefactura } = require('./api-helper.js');
const { db, initDb } = require('./db.js');

const app = express();
const PORT = 3001;

const rootDir = path.resolve(__dirname, '..');

app.use(cors());
app.use(express.json());
// Servir imágenes de evidencia y directorios anidados
app.use('/evidence', express.static(path.join(rootDir, 'evidence'), { fallthrough: true }));

// Utilidad para ejecutar comandos
const runCmd = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd: rootDir }, (error, stdout, stderr) => {
            if (error) reject(error.message || stderr);
            else resolve(stdout.trim());
        });
    });
};

// Helper para limpiar códigos ANSI de la terminal
const stripAnsi = (str) => {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
};

// 0. Utilidad para matar procesos de forma recursiva en Windows (evita procesos huérfanos)
const killProcessTree = (pid) => {
    if (!pid) return;
    if (/^win/.test(process.platform)) {
        exec(`taskkill /pid ${pid} /T /F`, (err) => {
            if (err) console.error(`[KILL] Error matando proceso ${pid}:`, err.message);
            else console.log(`[KILL] Árbol de proceso ${pid} eliminado.`);
        });
    } else {
        process.kill(pid, 'SIGKILL');
    }
};

// Sesiones de grabación activas (Playwright Codegen)
const activeRecordings = new Map();

// 1. Obtener ramas locales y remotas
app.get('/api/branches', async (req, res) => {
    try {
        await runCmd('git fetch origin');
        const output = await runCmd('git branch -a');

        let branchesSet = new Set();
        output.split('\n').forEach(line => {
            let b = line.trim().replace(/^\* /, '');
            if (b.includes('->')) return;
            // Limpiar remotes/origin/ -> "" u origin/ -> ""
            b = b.replace('remotes/origin/', '').replace('origin/', '');
            if (b !== 'HEAD') branchesSet.add(b);
        });

        const branches = Array.from(branchesSet);
        const currentBranch = await runCmd('git rev-parse --abbrev-ref HEAD');

        res.json({ branches, current: currentBranch });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// Función para sincronizar archivos del sistema con la DB
const syncScenariosWithFileSystem = async () => {
    try {
        const scriptsPath = path.join(projectDir, 'scripts');
        if (!fs.existsSync(scriptsPath)) {
            console.log(`[SYNC] Carpeta scripts no encontrada en: ${scriptsPath}`);
            return;
        }

        const files = fs.readdirSync(scriptsPath).filter(f => f.endsWith('.js') || f.endsWith('.spec.js'));
        console.log(`[SYNC] Iniciando sincronización de ${files.length} archivos...`);

        db.serialize(() => {
            files.forEach(file => {
                const friendlyName = file.replace(/\.spec\.js$/, '').replace(/\.js$/, '').replace(/-/g, ' ');
                const id = file;

                db.get("SELECT id FROM escenarios WHERE id = ?", [id], (err, row) => {
                    if (!row) {
                        console.log(`[SYNC] + Nuevo escenario: ${file}`);
                        // Insertar en Medifarma (client_id: 1, process_id: 1) por defecto si es nuevo
                        db.run(`INSERT OR IGNORE INTO escenarios (id, process_id, name, config_json) VALUES (?, ?, ?, ?)`,
                            [id, 1, friendlyName, JSON.stringify({ file: file })]);
                    }
                });
            });
        });
    } catch (e) {
        console.error('[SYNC] Error crítico en sincronización:', e);
    }
};


// 2. Cambiar de rama (Checkout)
app.post('/api/checkout', async (req, res) => {
    const { branch } = req.body;
    if (!branch) return res.status(400).json({ error: 'Falta la rama' });

    try {
        await runCmd(`git checkout ${branch}`);
        // Intentar pull si es posible
        await runCmd(`git pull origin ${branch}`).catch(() => { });
        
        // CRÍTICO: Sincronizar escenarios después de cambiar rama
        await syncScenariosWithFileSystem();
        
        res.json({ success: true, message: `Cambiado a ${branch}` });
    } catch (e) {
        // Fallback si hay cambios sin commitear, forzar un stash temporal
        try {
            await runCmd(`git stash && git checkout ${branch}`);
            await syncScenariosWithFileSystem();
            res.json({ success: true, message: `Stash aplicado y cambiado a ${branch}` });
        } catch (stashErr) {
            res.status(500).json({ error: stashErr.toString() });
        }
    }
});


// 3. Obtener el Registro Central de SQLite (Clientes -> Procesos -> Escenarios)
app.get('/api/registry', (req, res) => {
    db.serialize(() => {
        db.all("SELECT * FROM clientes", [], (err, clientesRows) => {
            if (err) return res.status(500).json({ error: err.toString() });

            db.all("SELECT * FROM procesos", [], (err, procesosRows) => {
                if (err) return res.status(500).json({ error: err.toString() });

                db.all("SELECT * FROM escenarios", [], (err, escenariosRows) => {
                    if (err) return res.status(500).json({ error: err.toString() });

                    const result = clientesRows.map(c => {
                        const procs = procesosRows.filter(p => p.client_id === c.id).map(p => {
                            const escens = escenariosRows.filter(e => e.process_id === p.id).map(e => ({
                                id: e.id,
                                name: e.name,
                                config: JSON.parse(e.config_json),
                                instrucciones_ia: e.instrucciones_ia || ""
                            }));
                            return { id: p.id, name: p.name, escenarios: escens };
                        });
                        return { id: c.id, name: c.name, procesos: procs };
                    });

                    console.log(`[REGISTRY] Clientes: ${clientesRows.length}, Procesos: ${procesosRows.length}, Escenarios: ${escenariosRows.length}`);
                    res.json(result);
                });
            });
        });
    });
});

// 3.5. Guardar un Nuevo Escenario (UPSERT en SQLite)
app.post('/api/registry/scenario', (req, res) => {
    const { clientId, processId, scenario } = req.body;
    if (!clientId || !processId || !scenario) {
        return res.status(400).json({ error: 'Faltan parámetros de jerarquía' });
    }

    const { id, name, config, instrucciones_ia } = scenario;
    const configStr = JSON.stringify(config);
    const instStr = instrucciones_ia || "";

    db.get("SELECT id FROM escenarios WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.toString() });

        if (row) {
            db.run(`UPDATE escenarios SET name = ?, config_json = ?, instrucciones_ia = ? WHERE id = ?`,
                [name, configStr, instStr, id], function (err) {
                    if (err) return res.status(500).json({ error: err.toString() });
                    res.json({ success: true, message: 'Escenario actualizado' });
                });
        } else {
            db.run(`INSERT INTO escenarios (id, process_id, name, config_json, instrucciones_ia) VALUES (?, ?, ?, ?, ?)`,
                [id, processId, name, configStr, instStr], function (err) {
                    if (err) return res.status(500).json({ error: err.toString() });
                    res.json({ success: true, message: 'Escenario guardado' });
                });
        }
    });
});

// 3.6. Eliminar un Escenario
app.delete('/api/registry/scenario/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM escenarios WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.toString() });
        res.json({ success: true, message: 'Escenario eliminado' });
    });
});

// 4. Ejecutar prueba con SSE (POST paramétrico multi-hilos)
app.post('/api/run-test', async (req, res) => {
    const { file, config } = req.body;

    if (!file) {
        return res.status(400).json({ error: "No se especificó un archivo de prueba." });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const _npx = /^win/.test(process.platform) ? 'npx.cmd' : 'npx';
    const cmd = /^win/.test(process.platform) ? '"' + _npx + '"' : _npx;
    const iterations = config.iteraciones || 1;
    const isHeadless = config.headless || false;

    const sendLog = (type, message) => {
        const payload = JSON.stringify({ type, message: message.toString(), timestamp: new Date().toISOString() });
        res.write(`data: ${payload}\n\n`);
    };

    sendLog('info', `Iniciando prueba: ${file} | Config: ${JSON.stringify(config || {})}`);

    let activeProcesses = [];
    req.on('close', () => {
        console.log('[SSE] Cliente desconectado en run-test, limpiando procesos...');
        activeProcesses.forEach(p => killProcessTree(p.pid));
    });

    try {
        // Fase 1: Preparación (Generar Prefacturas previas si es en paralelo)
        let prefacturaIds = [];
        if (iterations > 1) {
            sendLog('info', `🚀 Fase 1: Emitiendo ${iterations} PRE-FACTURAs vía API para evitar bloqueos...`);
            for (let i = 0; i < iterations; i++) {
                sendLog('info', `⏳ Obteniendo PRE-FACTURA (${i + 1}/${iterations})...`);
                const user = config.usuarioCajero || "PGALVEZ3";
                const centro = config.codigoCentro || "4";
                const id = await createPrefactura(user, centro);
                prefacturaIds.push(id);
                sendLog('info', `✅ PRE-FACTURA reservada: ${id}`);
            }
        } else {
            prefacturaIds.push(null); // el script se encargará de crear una si es null
        }

        // Fase 2: Ejecución (Paralela)
        sendLog('info', `🚀 Fase 2: Ejecutando ${iterations} hilos en paralelo (Headless: ${isHeadless})...`);
        const runWorker = (preId, index) => {
            return new Promise((resolve) => {
                const normalizedFile = file.replace(/\\/g, '/');
                const relativePath = normalizedFile.startsWith('scripts/') ? normalizedFile : `scripts/${normalizedFile}`;
                const cmdArgs = ['playwright', 'test', relativePath];
                if (!isHeadless) cmdArgs.push('--headed');

                const testEnv = {
                    ...process.env,
                    TEST_PARAMS: config ? JSON.stringify(config) : '{}'
                };
                if (preId) testEnv.PREFACTURA_ID = preId;

                const workerProcess = spawn(cmd, cmdArgs, {
                    cwd: rootDir,
                    env: testEnv,
                    shell: true,
                    windowsVerbatimArguments: false
                });
                activeProcesses.push(workerProcess);

                workerProcess.stdout.on('data', (data) => {
                    sendLog('log', `[Worker ${index}] ` + stripAnsi(data.toString()));
                });
                workerProcess.stderr.on('data', (data) => {
                    sendLog('error', `[Worker ${index}] ` + stripAnsi(data.toString()));
                });
                workerProcess.on('close', (code) => {
                    sendLog('done', `[Worker ${index}] Finalizado con código ${code}`);
                    resolve();
                });
            });
        };

        const workers = prefacturaIds.map((id, index) => runWorker(id, index + 1));
        await Promise.all(workers);

        sendLog('done', `✅ LA BATERÍA ENTERA FINALIZÓ CON ÉXITO.`);
        res.end();
    } catch (error) {
        sendLog('error', `❌ Error Crítico en Orquestador: ${error.message}`);
        res.end();
    }
});

// 4.5. Ejecutar Lote (POST paramétrico multi-hilos con Array)
app.post('/api/run-batch', async (req, res) => {
    console.log("--> [BACKEND] Endpoint POST /api/run-batch invocado!");
    const { tasks, parallel } = req.body;

    if (!tasks || !tasks.length) {
        return res.status(400).json({ error: "No se especificaron tareas." });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Usar npx local para asegurar que encuentra el binario de playwright correctamente y
    // evitar el bug de cmd.exe donde las comillas manuales se eliminan si es el único texto citado.
    const _npx = /^win/.test(process.platform) ? 'npx.cmd' : 'npx';
    const playwrightBin = _npx;

    const sendLog = (taskId, type, message, docData = null) => {
        const payload = JSON.stringify({ taskId, type, message: message.toString(), docData, timestamp: new Date().toISOString() });
        res.write(`data: ${payload}\n\n`);
        console.log(`[SSE Emit] Type: ${type}, Msg: ${message}`);
    };

    const MAX_CONCURRENT = req.body.concurrency || (parallel ? 5 : 1);
    let activeProcesses = [];
    let pendingTasks = [...tasks];
    let runningCount = 0;
    let batchResults = []; // Almacenar resultados para reporte global
    let intentionalEnd = false;

    // Keepalive ping cada 20s para que el SSE no se cierre por timeout del browser
    const keepAliveInterval = setInterval(() => {
        try { res.write(': ping\n\n'); } catch (e) { /* stream ya cerrado */ }
    }, 20000);

    // res.on('close') = cliente se desconectó (tab cerrado, etc.)
    // req.on('close') se dispara cuando el body del request termina de leerse — NO usar para detectar desconexión
    res.on('close', () => {
        clearInterval(keepAliveInterval);
        if (!intentionalEnd) {
            console.log('[SSE] Cliente desconectado en run-batch, limpiando procesos...');
            activeProcesses.forEach(p => killProcessTree(p.pid));
        }
    });

    try {
        const runTask = (task) => {
            return new Promise(async (resolve) => {
                runningCount++;
                const { taskId, config, file } = task;
                const isHeadless = config.headless !== false;

                // Generar carpeta de evidencia aislada
                const timestamp = new Date().toISOString().replace(/T/, '-').replace(/:/g, '').substring(0, 13);
                const runDirName = `run-${timestamp}-${taskId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
                const runDir = path.join(rootDir, 'evidence', runDirName);
                if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });

                sendLog(taskId, 'log', `Iniciando tarea ${taskId}...`);

                let preId = config.prefacturaId || null;
                const isFacturacion = (file || '').includes('boleta') || (file || '').includes('factura');
                if (isFacturacion && !preId) {
                    try {
                        const user = config.usuarioCajero || "PGALVEZ3";
                        const centro = config.codigoCentro || "4";
                        preId = await createPrefactura(user, centro);
                        sendLog(taskId, 'log', `✅ PRE-FACTURA emitida vía API: ${preId}`);
                    } catch (e) {
                        sendLog(taskId, 'business_error', e.message);
                        sendLog(taskId, 'error', `Falló la generación de Pre-Factura: ${e.message}`);
                        runningCount--;
                        resolve();
                        processNext();
                        return;
                    }
                } else if (preId) {
                    sendLog(taskId, 'log', `📋 Usando Pre-Factura manual: ${preId}`);
                }

                if (!file) {
                    sendLog(taskId, 'error', '❌ Sin script asignado. Graba primero el flujo desde el botón "Grabar Flujo Nuevo".');
                    runningCount--;
                    resolve();
                    processNext();
                    return;
                }
                // Normalizar separadores (Mac guarda '/', Windows usa '\') para soportar ambos
                const normalizedFile = file.replace(/\\/g, '/');
                const relativePath = normalizedFile.startsWith('scripts/') ? normalizedFile : `scripts/${normalizedFile}`;
                const absScriptPath = path.join(rootDir, relativePath);
                // En Mac/Linux, asegurar que los binarios sean ejecutables (prevenir código 126)
                if (process.platform !== 'win32') {
                    try { 
                        const { execSync } = require('child_process'); 
                        execSync('chmod -R +x node_modules/.bin/', { cwd: rootDir }); 
                    } catch (e) {
                        console.error('[Permissions] Error fijando chmod:', e.message);
                    }
                }
                // Windows BUG FIX: pasar relativePath (con slash '/') en vez de absScriptPath (con backslashes '\')
                // porque Playwright en Windows interpreta las rutas absolutas con '\' como Regex.
                const cmdArgs = ['playwright', 'test', relativePath, '--reporter=line'];
                if (!isHeadless) cmdArgs.push('--headed');

                const testEnv = {
                    ...process.env,
                    TEST_PARAMS: JSON.stringify(config),
                    EVIDENCE_DIR: runDir
                };
                if (preId) testEnv.PREFACTURA_ID = preId;

                console.log(`[WORKER] Spawning: ${playwrightBin} ${cmdArgs.join(' ')}`);
                const workerProcess = spawn(playwrightBin, cmdArgs, {
                    cwd: rootDir,
                    env: testEnv,
                    stdio: ['ignore', 'pipe', 'pipe'],
                    shell: true,
                    windowsVerbatimArguments: false
                });
                console.log(`[WORKER] PID: ${workerProcess.pid}`);
                activeProcesses.push(workerProcess);

                let lastError = ''; // Captura el último error relevante del test

                workerProcess.stdout.on('data', (data) => {
                    const text = stripAnsi(data.toString());
                    sendLog(taskId, 'log', text);

                    // Capturar línea de error de Playwright para mensaje final
                    const timeoutMatch = text.match(/TimeoutError:\s*(.+?)(?:\n|$)/);
                    const errorMatch = text.match(/Error:\s*(.+?)(?:\n|$)/);
                    const failMatch = text.match(/✘.+›\s*(.+?)(?:\s*\([\d.]+s\))?$/m);
                    if (timeoutMatch) lastError = `Timeout: ${timeoutMatch[1].trim().substring(0, 120)}`;
                    else if (failMatch) lastError = failMatch[1].trim().substring(0, 120);
                    else if (errorMatch) lastError = errorMatch[1].trim().substring(0, 120);

                    // Extraer Resultado Final si el script de Playwright lo imprime
                    const match = text.match(/\\[RESULT\\] (Prefactura: .+ \\| Doc: .+)/);
                    if (match) {
                        sendLog(taskId, 'result', 'Documentos generados', match[1]);
                    }

                    // Extraer Error de Negocio para globo
                    const errorNegocioMatch = text.match(/❌ Error de Negocio Detectado:\s*(.+)/);
                    if (errorNegocioMatch) {
                        sendLog(taskId, 'business_error', errorNegocioMatch[1]);
                    }

                    // Extraer Métricas [METRIC] name: value
                    const metricMatch = text.match(/\[METRIC\]\s+(\w+):\s+([\d\.]+)s/);
                    if (metricMatch) {
                        if (!config.metrics) config.metrics = {};
                        config.metrics[metricMatch[1]] = metricMatch[2];
                        sendLog(taskId, 'log', `📊 Métrica capturada -> ${metricMatch[1]}: ${metricMatch[2]}s`);
                    }

                    // Extraer Ruta del PDF
                    const pdfMatch = text.match(/✅ PDF Generado:\s*(.+)/);
                    if (pdfMatch) {
                        const absPath = pdfMatch[1].trim();
                        const idx = absPath.indexOf('/evidence/');
                        if (idx !== -1) {
                            sendLog(taskId, 'pdf', 'Reporte PDF', absPath.substring(idx));
                        } else {
                            const arrPath = absPath.split(/[\\/]/);
                            sendLog(taskId, 'pdf', 'Reporte PDF', `/evidence/${arrPath.pop()}`);
                        }
                    }
                });
                workerProcess.stderr.on('data', (data) => {
                    const text = stripAnsi(data.toString());
                    // Capturar errores de stderr también
                    const errLine = text.match(/Error:\s*(.+?)(?:\n|$)/);
                    if (errLine) lastError = errLine[1].trim().substring(0, 120);
                    sendLog(taskId, 'log', `[stderr] ` + text);
                });
                workerProcess.on('error', (err) => {
                    sendLog(taskId, 'error', `❌ No se pudo lanzar Playwright: ${err.message}`);
                });
                workerProcess.on('close', (code, signal) => {
                    runningCount--;
                    const isSuccess = code === 0;
                    let resultMsg;
                    if (isSuccess) {
                        resultMsg = 'Finalizado con éxito';
                    } else if (code !== null) {
                        resultMsg = lastError
                            ? `❌ ${lastError}`
                            : `Test fallido (código ${code})`;
                    } else {
                        resultMsg = `Proceso interrumpido por señal ${signal || 'desconocida'}`;
                    }
                    sendLog(taskId, isSuccess ? 'done' : 'error', resultMsg, runDir); // Enviamos runDir como docData para que el front lo guarde

                    // Crear result.json para el generador de reportes
                    const resultData = {
                        nombre: config.scenarioName || taskId,
                        tester: req.body.metadata?.tester || 'USUARIO DESCONOCIDO',
                        cliente: req.body.metadata?.project || 'PROYECTO DESCONOCIDO',
                        timestamp: new Date().toISOString(),
                        status: isSuccess ? 'success' : 'failed',
                        env: config.env || 'QAS',
                        metrics: config.metrics || {}
                    };
                    fs.writeFileSync(path.join(runDir, 'result.json'), JSON.stringify(resultData, null, 2));

                    // El dossier ahora se genera bajo demanda desde el botón "Ver PDF"
                    // para ahorrar cuota de IA.
                    batchResults.push({
                        taskId,
                        config,
                        runDir, // Importante para recuperar fotos
                        status: isSuccess ? 'EXITO' : 'FALLIDO',
                        result: resultMsg,
                        metrics: config.metrics || {},
                        timestamp: new Date().toLocaleString(),
                        metadata: req.body.metadata
                    });

                        activeProcesses = activeProcesses.filter(p => p !== workerProcess);
                        resolve();
                        processNext(); // Solo avanzar cuando el PDF esté listo
                    });
                });
            };

        const processNext = () => {
            while (runningCount < MAX_CONCURRENT && pendingTasks.length > 0) {
                const task = pendingTasks.shift();
                runTask(task); // runTask returns a Promise, but we don't await it here to allow concurrency
            }
            if (runningCount === 0 && pendingTasks.length === 0) {
                // Todas las tareas terminaron -> Generar Reporte Global
                generateGlobalReport(batchResults).then(globalPdfPath => {
                    const relativeUrl = globalPdfPath.replace(rootDir, '').replace(/\\/g, '/');
                    sendLog('orchestrator', 'pdf_global', 'Reporte Global de Lote Listo', relativeUrl);
                    sendLog('orchestrator', 'done', 'Todas las tareas del lote han finalizado.');
                    clearInterval(keepAliveInterval);
                    intentionalEnd = true;
                    res.end();
                }).catch(err => {
                    console.error("Error generando reporte global:", err);
                    sendLog('orchestrator', 'done', 'Finalizado (con error en reporte global).');
                    clearInterval(keepAliveInterval);
                    intentionalEnd = true;
                    res.end();
                });
            }
        };

        // El dossier global también se genera bajo demanda
        const generateGlobalReport = async (results) => {
            console.log(`🤖 AutoBot: El reporte global se generará bajo demanda.`);
            return null;
        };

        processNext(); // Iniciar la primera tanda de tareas en cola
    } catch (error) {
        console.error(error);
        sendLog('orchestrator', 'error', `Error crítico en el orquestador: ${error.message}`);
        clearInterval(keepAliveInterval);
        intentionalEnd = true;
        res.end();
    }
});

// 4.6. Abrir PDF usando visor Nativo (macOS/Windows) para saltar bloqueo Chrome
app.post('/api/open-pdf', async (req, res) => {
    let { pdfUrl } = req.body;
    if (!pdfUrl) return res.status(400).json({ error: 'Falta pdfUrl' });
    try {
        pdfUrl = pdfUrl.trim();
        // pdfUrl viene como /evidence/run-202X-XX/Reporte.pdf
        const relativeUrl = pdfUrl.startsWith('/evidence') ? pdfUrl.replace('/evidence', 'evidence') : pdfUrl;
        const absolutePath = path.join(rootDir, relativeUrl);

        console.log(`[OPEN-PDF] Intento de abrir ruta absoluta nativa: ${absolutePath}`);

        if (fs.existsSync(absolutePath)) {
            const openCommand = /^win/.test(process.platform) ? 'start ""' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
            await runCmd(`${openCommand} "${absolutePath}"`);
            res.json({ success: true, message: 'Abierto en el visor de sistema' });
        } else {
            res.status(404).json({ error: 'El archivo PDF no se encontró físicamente en el disco' });
        }
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// 5. Listar imágenes de evidencia
app.get('/api/evidence', (req, res) => {
    try {
        const evidenceDir = path.join(rootDir, 'evidence');
        if (!fs.existsSync(evidenceDir)) return res.json([]);

        const files = fs.readdirSync(evidenceDir)
            .filter(f => /\.(png|jpg|jpeg|webp|pdf)$/i.test(f))
            .map(f => ({
                name: f,
                url: `http://localhost:${PORT}/evidence/${f}`,
                time: fs.statSync(path.join(evidenceDir, f)).mtimeMs
            }))
            .sort((a, b) => b.time - a.time); // Más recientes primero

        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// 6. Listar scripts grabados disponibles
app.get('/api/scripts', (req, res) => {
    try {
        const scriptsDir = path.join(rootDir, 'scripts');
        const files = fs.readdirSync(scriptsDir)
            .filter(f => f.startsWith('grabacion_') && f.endsWith('.spec.js'))
            .map(f => {
                const tsMatch = f.match(/_(\d{13})\.spec\.js$/);
                const created = tsMatch ? new Date(parseInt(tsMatch[1])) : fs.statSync(path.join(scriptsDir, f)).birthtime;
                return {
                    file: `scripts/${f}`,
                    name: f.replace(/^grabacion_/, '').replace(/_\d+\.spec\.js$/, '').replace(/_/g, ' '),
                    created
                };
            })
            .sort((a, b) => new Date(b.created) - new Date(a.created));
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

/**
 * Normaliza un script de Playwright: ESM -> CJS, URL de OAuth, Login SAP IAS y Screenshots
 */
function normalizeScript(content, portalUrl) {
    // 1. ESM -> CJS
    content = content.replace(
        /^import\s*\{\s*([^}]+)\}\s*from\s*['"]@playwright\/test['"]\s*;?/m,
        (_, imports) => `const { ${imports.trim()} } = require('@playwright/test');`
    );

    // 2. Reemplazar primera URL de OAuth2 (tokens de sesión ya expirados) con la URL original del portal
    if (portalUrl) {
        content = content.replace(
            /await page\.goto\('https?:\/\/[^']*[?&](?:code_challenge|response_type=code)[^']*'\)/,
            `await page.goto('${portalUrl}')`
        );
    }

    // 3. Normalizar login SAP IAS: selectores de idioma -> atributos HTML universales
    //    Elimina clicks redundantes, botón "Mostrar contraseña" y adapta a inglés/español
    const emailFill = content.match(/\.fill\('([^']+@[^']+)'\)/)?.[1];
    const passFill  = content.match(/getByRole\('textbox',\s*\{\s*name:\s*'(?:Contraseña|Password|Kennwort)'\s*\}\)\.fill\('([^']+)'\)/)?.[1];
    
    if (emailFill) {
        // Quitar todas las líneas del campo email (clicks + fill) y reemplazar por una sola
        content = content.replace(
            /(\s*await page\.getByRole\('textbox',\s*\{\s*name:\s*'(?:Correo electrónico o nombre|Email or User Name|Benutzername)[^']*'\s*\}\)\.(?:click|fill)\([^)]*\);?\n?)+/g,
            `\n  await page.locator('input[type="email"], input[type="text"]').first().fill('${emailFill}');\n`
        );
    }
    
    if (passFill) {
        // Quitar todas las líneas del campo contraseña (clicks + fill) y reemplazar por una sola
        // + añadir click en botón submit + manejo de pantalla "Where To?" de SAP BTP
        const whereTo = `
  await page.locator('input[type="password"]').first().fill('${passFill}');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  // SAP BTP a veces muestra "Where To?" post-login — recargar resuelve
  if (page.url().includes('where_to') || await page.locator('text=/Where To/i').isVisible().catch(() => false)) {
    await page.goto('${portalUrl}');
    await page.waitForLoadState('networkidle').catch(() => {});
  }`;
        content = content.replace(
            /(\s*await page\.getByRole\('textbox',\s*\{\s*name:\s*'(?:Contraseña|Password|Kennwort)'\s*\}\)\.(?:click|fill)\([^)]*\);?\n?)+/g,
            whereTo + '\n'
        );
    }

    // Eliminar clics en "Mostrar contraseña" / "Show Password" (ruido innecesario)
    content = content.replace(
        /\s*await page\.getByRole\('button',\s*\{\s*name:\s*'(?:Mostrar contraseña|Show Password|Passwort anzeigen)'\s*\}\)\.click\(\);?\n?/g,
        ''
    );

    // Quitar el goto redundante al portal que viene justo después del login
    // (la redirección post-login ya lleva al portal automáticamente)
    content = content.replace(
        /\n  await page\.goto\('https?:\/\/[^']*\.hana\.ondemand\.com[^']*'\);\n  await page\.waitForLoadState[^\n]*\n  await page\.goto\('https?:\/\/[^']*\.hana\.ondemand\.com[^']*'\);/,
        (match) => match.split('\n  await page.goto(').slice(0, 2).join('\n  await page.goto(')
    );

    // 4. Inyectar helper shot() y capturas automáticas antes/después de cada acción clave
    content = injectScreenshots(content);

    // 5. Normalización de Búsqueda SAP (Botón "Ir" / "Search")
    // Detecta clics en botones de búsqueda de SAP y aplica la estrategia de sincronización + 2s de espera
    const sapSearchPattern = /await\s+(frame|page)\.getByRole\('button',\s*{\s*name:\s*['"]Ir['"]\s*}\)\.click\(\);/g;
    content = content.replace(sapSearchPattern, (match, context) => {
        return `
  // --- Normalización SAP Search (AutoBot) ---
  console.log('🚀 Sincronizando modelo SAP antes de búsqueda...');
  await ${context}.locator('button').filter({ hasText: /^Ir$/ }).first().focus();
  await page.keyboard.press('Enter'); // Disparador primario
  await page.waitForTimeout(2000);   // Pausa de sincronización UI5
  await ${context}.locator('button').filter({ hasText: /^Ir$/ }).first().click({ force: true }).catch(() => {});
  // -------------------------------------------`;
    });

    // 6. Inteligencia de Checkboxes (AutoBot)
    // Convierte .click() en .setChecked(true) para evitar desmarcar accidentalmente
    const checkboxPattern = /await\s+(frame|page)\.getByRole\('(checkbox|radio)',\s*([^)]+)\)\.click\(\);/g;
    content = content.replace(checkboxPattern, (match, context, role, options) => {
        return `await ${context}.getByRole('${role}', ${options}).setChecked(true);`;
    });

    return content;
}

// Helper: inyecta shot() y capturas automáticas en scripts grabados
function injectScreenshots(content) {
    const shotHelper = `
  // --- Helper de Dossier Técnico (inyectado por AutoBot) ---
  const _fs = require('fs');
  const _path = require('path');
  const _evidenceDir = process.env.EVIDENCE_DIR || _path.join(__dirname, '..', 'evidence');
  if (!_fs.existsSync(_evidenceDir)) _fs.mkdirSync(_evidenceDir, { recursive: true });
  
  const shot = async (label) => {
    await page.waitForTimeout(500);
    // Esperar a que desaparezcan indicadores de carga de SAP
    await page.waitForSelector('.sapMBusyIndicator,.sapUiLocalBusyIndicator,.sapMBlockLayer',
      { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    
    const _p = _path.join(_evidenceDir, label + '.png');
    await page.screenshot({ path: _p, fullPage: true });
    console.log('📸 Captura guardada: ' + label + '.png');
  };
  // --- Fin helper ---
`;

    // Insertar helper al inicio del cuerpo del test
    content = content.replace(
        /(test\([^)]*,\s*async\s*\(\{\s*page\s*\}\)\s*=>\s*\{)/,
        `$1\n${shotHelper}`
    );

    let stepN = 0;
    const lines = content.split('\n');
    const result = [];
    let inHelper = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('Helper de capturas') || line.includes('Helper de Dossier')) inHelper = true;
        if (line.includes('Fin helper')) { inHelper = false; result.push(line); continue; }
        if (inHelper) { result.push(line); continue; }

        // Acciones que disparan captura dual (Antes/Después)
        const isAction = /await\s+(page|frame|iframe)\.(click|fill|goto|selectOption|press|type|focus|hover)\(/.test(line);
        const isLogin = /button\[type="submit"\]/.test(line) || /logon/.test(line) || /Iniciando sesión/.test(line);

        if (isAction && !isLogin && !line.trim().startsWith('//')) {
            stepN++;
            const stepLabel = `paso_${String(stepN).padStart(2, '0')}`;
            result.push(`  await shot('${stepLabel}_antes');`);
            result.push(line);
            result.push(`  await shot('${stepLabel}_despues');`);
        } else {
            result.push(line);
        }
    }

    // Limpieza agresiva: si hay un logout, eliminar cualquier shot posterior
    let finalLines = content.split('\n');
    let firstLogoutIndex = -1;
    for (let i = 0; i < finalLines.length; i++) {
        const line = finalLines[i].toLowerCase();
        if (line.includes('logout') || line.includes('cerrar_sesion') || line.includes('logoutbtn')) {
            firstLogoutIndex = i;
            break;
        }
    }
    
    if (firstLogoutIndex !== -1) {
        // Eliminar cualquier shot que ocurra después del logout detectado
        finalLines = finalLines.filter((line, index) => {
            if (index > firstLogoutIndex && line.includes('shot(')) return false;
            return true;
        });
        content = finalLines.join('\n');
    }
    
    return content;
}

// 8. Iniciar grabación con Playwright Codegen
app.post('/api/record/start', (req, res) => {
    const { url, outputName, credentials = {}, extraData = [] } = req.body;
    if (!url) return res.status(400).json({ error: 'Falta la URL de inicio' });

    const ts = Date.now();
    const recordingId = `rec_${ts}`;  // FIX: recordingId no estaba definido — causaba ReferenceError en cada grabación
    const safeName = (outputName || 'grabacion').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const outputFile = path.join(rootDir, 'scripts', `grabacion_${safeName}_${ts}.spec.js`);

    // Usar el binario local de Playwright (más confiable que npx en Windows)
    const pwBin = path.join(rootDir, 'node_modules', '.bin',
        process.platform === 'win32' ? 'playwright.cmd' : 'playwright');

    console.log(`[RECORD] Lanzando: ${pwBin} codegen "${url}" --output="${outputFile}"`);

    const proc = spawn(`"${pwBin}"`, ['codegen', url, `--output="${outputFile}"`], {
        cwd: rootDir,
        shell: true,
        windowsVerbatimArguments: false
    });

    activeRecordings.set(recordingId, { process: proc, outputFile, done: false, url, credentials, extraData });

    proc.on('close', (code) => {
        const rec = activeRecordings.get(recordingId);
        if (rec) rec.done = true;
        console.log(`[RECORD] Codegen terminó con código ${code}`);
    });
    proc.on('error', (err) => {
        console.error(`[RECORD] Error al lanzar codegen: ${err.message}`);
    });

    console.log(`[RECORD] Iniciada grabación ${recordingId} -> ${outputFile}`);
    res.json({ recordingId, outputFile: path.relative(rootDir, outputFile) });
});

// 9. Estado de grabación
app.get('/api/record/status/:id', (req, res) => {
    const rec = activeRecordings.get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Grabación no encontrada' });
    res.json({ done: rec.done, outputFile: path.relative(rootDir, rec.outputFile) });
});

// 10. Detener grabación y guardar escenario en SQLite
app.post('/api/record/stop', (req, res) => {
    const { recordingId, scenarioName, clientId, processId, credentials = {}, extraData = [] } = req.body;
    const rec = activeRecordings.get(recordingId);
    if (!rec) return res.status(404).json({ error: 'Grabación no encontrada o ya finalizó' });

    try { rec.process.kill(); } catch (e) { /* ya terminó */ }
    activeRecordings.delete(recordingId);

    // Convertir ESM import → CommonJS require (codegen genera ESM, el proyecto usa CJS)
    if (fs.existsSync(rec.outputFile)) {
        let content = fs.readFileSync(rec.outputFile, 'utf8');

        // Normalizar script (CJS + OAuth URL + selectores universales + screenshots)
        content = normalizeScript(content, rec.url);
        fs.writeFileSync(rec.outputFile, content, 'utf8');
        console.log(`[RECORD] Script normalizado: ${rec.outputFile}`);
    }

    const relFile = path.relative(rootDir, rec.outputFile);
    const scenarioId = `esc_rec_${Date.now()}`;

    // Merge credentials y extraData del stop con los del start (stop tiene prioridad)
    const finalCredentials = { ...rec.credentials, ...credentials };
    const finalExtraData = extraData.length > 0 ? extraData : rec.extraData;

    const config = {
        recordedScript: relFile,
        url: rec.url,
        headless: false,
        iteraciones: 1,
        pagos: [],
        credentials: {
            username: finalCredentials.username || '',
            appName: finalCredentials.appName || ''
            // Contraseña NO se guarda en texto plano en la config
        },
        extraData: finalExtraData
    };

    // Instrucciones legibles para el analista
    const extraSummary = finalExtraData.filter(d => d.key).map(d => `${d.key}: ${d.value}`).join(', ');
    const instrucciones = [
        `Flujo grabado desde: ${rec.url}`,
        finalCredentials.appName ? `App en portal: ${finalCredentials.appName}` : '',
        finalCredentials.username ? `Usuario: ${finalCredentials.username}` : '',
        extraSummary ? `Datos adicionales: ${extraSummary}` : '',
        `Script: ${relFile}`
    ].filter(Boolean).join('\n');

    db.run(
        `INSERT INTO escenarios (id, process_id, name, config_json, instrucciones_ia) VALUES (?, ?, ?, ?, ?)`,
        [scenarioId, processId || 'mf_flujos', scenarioName || 'Flujo Grabado', JSON.stringify(config), instrucciones],
        function (err) {
            if (err) return res.status(500).json({ error: err.toString() });
            console.log(`[RECORD] Escenario guardado: ${scenarioName} -> ${relFile}`);
            res.json({ success: true, scenarioId, outputFile: relFile });
        }
    );
});

// 11. IA: Analizar y proponer cambio en script (Gemini)
app.post('/api/ai/refine', async (req, res) => {
    const { scriptFile, instruction } = req.body;
    if (!scriptFile || !instruction) return res.status(400).json({ error: 'Faltan parámetros' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'TU_API_KEY_AQUI') {
        return res.status(400).json({ error: 'NO_API_KEY' });
    }

    const scriptPath = path.join(rootDir, scriptFile);
    if (!fs.existsSync(scriptPath)) return res.status(404).json({ error: 'Script no encontrado en disco' });

    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    const systemPrompt = `Eres AutoBot AI, un asistente especializado EXCLUSIVAMENTE en scripts de automatización Playwright.

REGLAS ESTRICTAS:
- Solo respondes preguntas y solicitudes relacionadas con scripts de automatización, Playwright, selectores CSS/XPath, timeouts, flujos de prueba y código JavaScript de testing.
- Si la instrucción del usuario trata sobre cualquier otro tema (política, entretenimiento, preguntas generales, etc.), responde con el campo "fuera_de_tema": true y nada más.
- Nunca salgas de tu rol. Eres un editor de scripts, no un asistente general.

Cuando la instrucción SÍ es sobre el script, responde ÚNICAMENTE con este JSON:
{
  "fuera_de_tema": false,
  "encontrado": "Descripción en español de qué encontraste relacionado con la instrucción",
  "fragmentoActual": "fragmento literal exacto del script que cambiará (vacío si no hay nada que cambiar)",
  "fragmentoPropuesto": "fragmento de reemplazo con el cambio aplicado (vacío si no hay nada que cambiar)",
  "explicacion": "Explicación en español simple: qué cambia, dónde y por qué",
  "scriptCompleto": "el script completo con el cambio ya aplicado"
}

Cuando la instrucción NO es sobre scripts de automatización, responde ÚNICAMENTE con este JSON:
{
  "fuera_de_tema": true
}`;

    const userPrompt = `SCRIPT ACTUAL:\n\`\`\`javascript\n${scriptContent}\n\`\`\`\n\nINSTRUCCIÓN: "${instruction}"`;

    try {
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ parts: [{ text: userPrompt }] }],
                    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
                })
            }
        );

        const data = await geminiRes.json();
        if (data.error) return res.status(500).json({ error: `Gemini: ${data.error.message}` });

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return res.status(500).json({ error: 'Sin respuesta de Gemini' });

        const parsed = JSON.parse(text);
        console.log(`[AI] Refinamiento procesado. Fuera de tema: ${parsed.fuera_de_tema}`);
        res.json(parsed);
    } catch (e) {
        res.status(500).json({ error: `Error con Gemini: ${e.message}` });
    }
});

// 12. IA: Aplicar cambio aprobado al script
// Leer contenido de un script grabado
app.get('/api/script/content', (req, res) => {
    const { file } = req.query;
    if (!file) return res.status(400).json({ error: 'Falta parámetro file' });
    const scriptPath = path.join(rootDir, file);
    if (!fs.existsSync(scriptPath)) return res.status(404).json({ error: 'Script no encontrado' });
    res.json({ content: fs.readFileSync(scriptPath, 'utf8') });
});

app.post('/api/ai/apply', (req, res) => {
    const { scriptFile, scriptCompleto } = req.body;
    if (!scriptFile || !scriptCompleto) return res.status(400).json({ error: 'Faltan parámetros' });

    const scriptPath = path.join(rootDir, scriptFile);
    try {
        // Backup antes de sobrescribir
        const backupPath = scriptPath.replace('.spec.js', `_backup_${Date.now()}.spec.js`);
        if (fs.existsSync(scriptPath)) fs.copyFileSync(scriptPath, backupPath);

        fs.writeFileSync(scriptPath, scriptCompleto, 'utf8');
        console.log(`[AI] Script actualizado: ${scriptFile} (backup: ${path.basename(backupPath)})`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// 13. Normalizar un script existente en disco
app.post('/api/script/normalize', (req, res) => {
    const { file, portalUrl } = req.body;
    if (!file) return res.status(400).json({ error: 'Falta parámetro file' });

    const scriptPath = path.join(rootDir, file);
    if (!fs.existsSync(scriptPath)) return res.status(404).json({ error: 'Script no encontrado' });

    try {
        let content = fs.readFileSync(scriptPath, 'utf8');
        content = normalizeScript(content, portalUrl);
        fs.writeFileSync(scriptPath, content, 'utf8');
        res.json({ success: true, message: 'Script normalizado correctamente' });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});


// 15. GIT: Sincronización automática (Commit & Push)
app.post('/api/git/sync', (req, res) => {
    console.log('🚀 Iniciando sincronización automática con Git...');
    try {
        const timestamp = new Date().toLocaleString();
        const branch = execSync('git branch --show-current').toString().trim() || 'Medifarma';
        
        execSync('git add .', { stdio: 'inherit' });
        try {
            execSync(`git commit -m "autobot: sincronización automática desde Dashboard UI - ${timestamp}"`, { stdio: 'inherit' });
        } catch (e) {
            // Si falla el commit, probablemente es porque no hay cambios
            if (e.message.includes('nothing to commit')) {
                console.log('ℹ️ No hay cambios para commitear.');
            } else {
                throw e;
            }
        }
        execSync(`git push origin ${branch}`, { stdio: 'inherit' });
        
        console.log('✅ Sincronización completada con éxito.');
        res.json({ success: true, message: 'Cambios subidos al repositorio correctamente.' });
    } catch (e) {
        console.error('❌ Error en sincronización Git:', e.message);
        res.status(500).json({ error: `Fallo en Git: ${e.message}` });
    }
});

// 17. CONFIG: Guardar API Key de Gemini
app.post('/api/config/gemini', (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) return res.status(400).json({ error: 'API Key es requerida' });
        
        const envPath = path.join(rootDir, '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
            // Reemplazar si existe
            if (envContent.includes('GEMINI_API_KEY=')) {
                envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${apiKey}`);
            } else {
                envContent += `\nGEMINI_API_KEY=${apiKey}\n`;
            }
        } else {
            envContent = `GEMINI_API_KEY=${apiKey}\n`;
        }
        
        fs.writeFileSync(envPath, envContent);
        process.env.GEMINI_API_KEY = apiKey; // Actualizar en memoria
        
        console.log('✅ API Key de Gemini guardada correctamente.');
        res.json({ success: true, message: 'API Key configurada correctamente.' });
    } catch (e) {
        console.error('❌ Error guardando API Key:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// 18. REPORT: Generar PDF con IA Bajo Demanda (SSE)
app.get('/api/reports/generate-ai', async (req, res) => {
    const { runDir } = req.query;
    if (!runDir) return res.status(400).json({ error: 'runDir es requerido' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendProgress = (message) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', message })}\n\n`);
    };

    try {
        const absRunDir = path.isAbsolute(runDir) ? runDir : path.join(rootDir, runDir);
        const { generatePdf } = require('./report-generator');
        
        const pdfPath = await generatePdf(absRunDir, (msg) => {
            sendProgress(msg);
        });

        if (!pdfPath) {
            throw new Error("El generador no devolvió una ruta de PDF válida.");
        }

        const relativeUrl = pdfPath.replace(rootDir, '').replace(/\\/g, '/');
        res.write(`data: ${JSON.stringify({ type: 'done', url: relativeUrl })}\n\n`);
        res.end();
    } catch (e) {
        console.error('❌ Error generando PDF bajo demanda:', e.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: e.message })}\n\n`);
        res.end();
    }
});

// 19. SYSTEM: Shutdown local server (backend + Vite)
app.post('/api/system/shutdown', (req, res) => {
    console.log('[SHUTDOWN] Recibida solicitud de apagado. Cerrando todos los servicios...');

    res.json({ success: true, message: 'AutoBot se está apagando...' });

    setTimeout(() => {
        if (process.platform === 'win32') {
            // En Windows, matar procesos hijos de NPM/Vite no funciona bien con señales normales.
            // La forma más robusta es encontrar el PID padre (el comando concurrently o npm) 
            // y aniquilar todo su árbol de procesos con taskkill, incluyéndonos a nosotros mismos.
            console.log(`[SHUTDOWN] Ejecutando taskkill sobre árbol padre (PPID: ${process.ppid})...`);
            exec(`taskkill /PID ${process.ppid} /T /F`, (err) => {
                if (err) {
                    console.error('[SHUTDOWN] Error matando árbol padre:', err);
                    process.exit(0);
                }
            });
        } else {
            // En Mac/Linux: matar Vite asumiendo puerto por defecto (5173), luego salir
            exec(`lsof -ti:5173 | xargs kill -9 2>/dev/null`, () => {
                console.log('[SHUTDOWN] Cerrando backend...');
                process.exit(0);
            });
        }
    }, 500);
});

// 20. Obtener Changelog (Historial de Evolución)
app.get('/api/changelog', (req, res) => {
    const changelogPath = path.join(rootDir, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
        res.send(fs.readFileSync(changelogPath, 'utf8'));
    } else {
        res.status(404).send('Changelog no encontrado');
    }
});

initDb().then(async () => {
    // Sincronización inicial al arrancar el servidor
    await syncScenariosWithFileSystem();
    
    app.listen(PORT, () => {
        console.log(`✅ UI Backend API Server running at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("❌ Error inicializando base de datos SQLite:", err);
});
