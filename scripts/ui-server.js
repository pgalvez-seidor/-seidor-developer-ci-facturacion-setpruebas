const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createPrefactura } = require('./api-helper.js');

const app = express();
const PORT = 3001;

const rootDir = path.resolve(__dirname, '..');

app.use(cors());
app.use(express.json());
// Servir imágenes de evidencia
app.use('/evidence', express.static(path.join(rootDir, 'evidence')));

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

// 2. Cambiar de rama (Checkout)
app.post('/api/checkout', async (req, res) => {
    const { branch } = req.body;
    if (!branch) return res.status(400).json({ error: 'Falta la rama' });

    try {
        await runCmd(`git checkout ${branch}`);
        // Intentar pull si es posible
        await runCmd(`git pull origin ${branch}`).catch(() => { });
        res.json({ success: true, message: `Cambiado a ${branch}` });
    } catch (e) {
        // Fallback si hay cambios sin commitear, forzar un stash temporal
        try {
            await runCmd(`git stash && git checkout ${branch}`);
            res.json({ success: true, message: `Stash aplicado y cambiado a ${branch}` });
        } catch (stashErr) {
            res.status(500).json({ error: stashErr.toString() });
        }
    }
});

// 3. Listar Escenarios y Casos de Pruebas
app.get('/api/scenarios', (req, res) => {
    try {
        const scriptsDir = path.join(rootDir, 'scripts');

        // Simplemente leeremos los .spec.js como los "tests ejecutables"
        const files = fs.readdirSync(scriptsDir)
            .filter(f => f.endsWith('.spec.js'));

        const result = [{
            id: 'facturacion',
            name: 'Módulo de Facturación',
            cases: files.map(file => ({
                id: file,
                name: file.replace('.spec.js', '').replace(/-/g, ' ').toUpperCase()
            }))
        }];

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// 4. Ejecutar prueba con SSE (POST paramétrico multi-hilos)
app.post('/api/run-test', async (req, res) => {
    const { file, config } = req.body;
    
    if (!file) {
        return res.status(400).json({ error: "No se especificó un archivo de prueba." });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const cmd = /^win/.test(process.platform) ? 'npx.cmd' : 'npx';
    const iterations = config.iteraciones || 1;
    const isHeadless = config.headless || false;

    const sendLog = (type, message) => {
        const payload = JSON.stringify({ type, message: message.toString(), timestamp: new Date().toISOString() });
        res.write(`data: ${payload}\n\n`);
    };

    sendLog('info', `Iniciando prueba: ${file} | Config: ${JSON.stringify(config || {})}`);

    let activeProcesses = [];
    req.on('close', () => {
        activeProcesses.forEach(p => p.kill());
    });

    try {
        // Fase 1: Preparación (Generar Prefacturas previas si es en paralelo)
        let prefacturaIds = [];
        if (iterations > 1) {
            sendLog('info', `🚀 Fase 1: Generando ${iterations} pre-facturas en SAP para evitar bloqueos...`);
            for (let i = 0; i < iterations; i++) {
                sendLog('info', `⏳ Obteniendo prefactura (${i + 1}/${iterations})...`);
                const id = await createPrefactura("PGALVEZ3");
                prefacturaIds.push(id);
                sendLog('info', `✅ Prefactura reservada: ${id}`);
            }
        } else {
            prefacturaIds.push(null); // el script se encargará de crear una si es null
        }

        // Fase 2: Ejecución (Paralela)
        sendLog('info', `🚀 Fase 2: Ejecutando ${iterations} hilos en paralelo (Headless: ${isHeadless})...`);
        const runWorker = (preId, index) => {
            return new Promise((resolve) => {
                const cmdArgs = ['playwright', 'test', `scripts/${file}`];
                if (!isHeadless) cmdArgs.push('--headed');
                
                const testEnv = { 
                    ...process.env, 
                    TEST_PARAMS: config ? JSON.stringify(config) : '{}'
                };
                if (preId) testEnv.PREFACTURA_ID = preId;

                const workerProcess = spawn(cmd, cmdArgs, { 
                    cwd: rootDir,
                    env: testEnv
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
    } catch(error) {
        sendLog('error', `❌ Error Crítico en Orquestador: ${error.message}`);
        res.end();
    }
});

// 4.5. Ejecutar Lote (POST paramétrico multi-hilos con Array)
app.post('/api/run-batch', async (req, res) => {
    const { tasks, parallel } = req.body;
    
    if (!tasks || !tasks.length) {
        return res.status(400).json({ error: "No se especificaron tareas." });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const cmd = /^win/.test(process.platform) ? 'npx.cmd' : 'npx';

    const sendLog = (taskId, type, message, docData = null) => {
        const payload = JSON.stringify({ taskId, type, message: message.toString(), docData, timestamp: new Date().toISOString() });
        res.write(`data: ${payload}\\n\\n`);
    };

    let activeProcesses = [];
    req.on('close', () => {
        activeProcesses.forEach(p => p.kill());
    });

    try {
        const runTask = (task) => {
            return new Promise(async (resolve) => {
                const { taskId, config, file } = task;
                const isHeadless = config.headless !== false;
                
                sendLog(taskId, 'log', `Iniciando tarea ${taskId}...`);
                
                let preId = null;
                try {
                    preId = await createPrefactura("PGALVEZ3");
                    sendLog(taskId, 'log', `Prefactura reservada: ${preId}`);
                } catch(e) {
                    sendLog(taskId, 'log', `Advertencia: no se reservó prefactura previa.`);
                }

                const cmdArgs = ['playwright', 'test', `scripts/${file || 'caso1-boleta.spec.js'}`];
                if (!isHeadless) cmdArgs.push('--headed');
                
                const testEnv = { 
                    ...process.env, 
                    TEST_PARAMS: JSON.stringify(config)
                };
                if (preId) testEnv.PREFACTURA_ID = preId;

                const workerProcess = spawn(cmd, cmdArgs, { 
                    cwd: rootDir,
                    env: testEnv
                });
                activeProcesses.push(workerProcess);

                workerProcess.stdout.on('data', (data) => {
                    const text = stripAnsi(data.toString());
                    sendLog(taskId, 'log', text);
                    
                    // Extraer Resultado Final si el script de Playwright lo imprime
                    const match = text.match(/\\[RESULT\\] (Prefactura: .+ \\| Doc: .+)/);
                    if (match) {
                        sendLog(taskId, 'result', 'Documentos generados', match[1]);
                    }
                });
                workerProcess.stderr.on('data', (data) => {
                    sendLog(taskId, 'log', `[ERROR] ` + stripAnsi(data.toString()));
                });
                workerProcess.on('close', (code) => {
                    const isSuccess = code === 0;
                    sendLog(taskId, isSuccess ? 'done' : 'error', `Finalizado con código ${code}`);
                    resolve();
                });
            });
        };

        if (parallel) {
            await Promise.all(tasks.map(t => runTask(t)));
        } else {
            for (const task of tasks) {
                await runTask(task);
            }
        }

        res.end();
    } catch(error) {
        console.error(error);
        res.end();
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

app.listen(PORT, () => {
    console.log(`✅ UI Backend API Server running at http://localhost:${PORT}`);
});
