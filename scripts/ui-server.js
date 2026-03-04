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

    const cmd = /^win/.test(process.platform) ? 'npx.cmd' : 'npx';

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

    req.on('close', () => {
        activeProcesses.forEach(p => p.kill());
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

                const cmdArgs = ['playwright', 'test', `scripts/${file || 'caso1-boleta.spec.js'}`, '--reporter=line'];
                if (!isHeadless) cmdArgs.push('--headed');

                const testEnv = {
                    ...process.env,
                    TEST_PARAMS: JSON.stringify(config),
                    EVIDENCE_DIR: runDir
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

                    // Extraer Error de Negocio para globo
                    const errorNegocioMatch = text.match(/❌ Error de Negocio Detectado:\s*(.+)/);
                    if (errorNegocioMatch) {
                        // Enviar tipo 'business_error'
                        sendLog(taskId, 'business_error', errorNegocioMatch[1]);
                    }

                    // Extraer Métricas [METRIC] name: value
                    const metricMatch = text.match(/\[METRIC\]\s+(\w+):\s+([\d\.]+)s/);
                    if (metricMatch) {
                        if (!config.metrics) config.metrics = {}; // Usemos el objeto config de la tarea para guardar temporalmente
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
                    sendLog(taskId, 'log', `[ERROR] ` + stripAnsi(data.toString()));
                });
                workerProcess.on('close', (code) => {
                    runningCount--;
                    const isSuccess = code === 0;
                    const resultMsg = isSuccess ? 'Finalizado con éxito' : `Finalizado con código ${code}`;
                    sendLog(taskId, isSuccess ? 'done' : 'error', resultMsg);

                    // Guardar para el reporte global (incluyendo ruta de evidencias para consolidar)
                    batchResults.push({
                        taskId,
                        config,
                        runDir, // Importante para recuperar fotos
                        status: isSuccess ? 'EXITO' : 'FALLIDO',
                        result: resultMsg,
                        metrics: config.metrics || {},
                        timestamp: new Date().toLocaleString()
                    });

                    activeProcesses = activeProcesses.filter(p => p !== workerProcess);
                    resolve();
                    processNext(); // Intentar lanzar la siguiente tarea en cola
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
                    res.end();
                }).catch(err => {
                    console.error("Error generando reporte global:", err);
                    sendLog('orchestrator', 'done', 'Finalizado (con error en reporte global).');
                    res.end();
                });
            }
        };

        const generateGlobalReport = async (results) => {
            const { chromium } = require('playwright');
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            const timestamp = new Date().getTime();
            const globalPdfName = `Reporte_Final_Autobot_${timestamp}.pdf`;
            const globalPdfPath = path.join(rootDir, 'evidence', globalPdfName);

            // Cargar Logo Seidor para embeber en Base64
            let seidorLogoBase64 = "";
            try {
                const logoPath = path.join(rootDir, 'ui', 'public', 'seidor-logo.png');
                seidorLogoBase64 = fs.readFileSync(logoPath).toString('base64');
            } catch (e) { console.log("⚠️ No se pudo cargar el logo para el PDF:", e.message); }

            let html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
                    body { font-family: 'Poppins', sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.6; }
                    
                    .header-brand { display: flex; justify-content: space-between; align-items: center; margin-bottom: 50px; }
                    .header-brand img { height: 40px; width: auto; }
                    .header-brand .app-name { font-weight: 800; font-size: 1.2rem; color: #004a99; letter-spacing: -1px; }

                    .cover { height: 75vh; display: flex; flex-direction: column; justify-content: center; border-left: 12px solid #004a99; padding-left: 50px; margin-bottom: 100px; }
                    .cover p.subtitle { font-size: 14px; font-weight: 700; text-transform: uppercase; color: #004a99; letter-spacing: 2px; margin-bottom: 10px; }
                    .cover h1 { font-size: 52px; font-weight: 800; margin: 0; color: #0f172a; line-height: 1.05; }
                    .cover p.desc { font-size: 18px; color: #64748b; margin: 20px 0 40px 0; max-width: 600px; }
                    
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 50px 0; }
                    .summary-card { background: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; position: relative; overflow: hidden; }
                    .summary-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #e2e8f0; }
                    .summary-card.success::before { background: #10b981; }
                    .summary-card.error::before { background: #ef4444; }
                    
                    .summary-card label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 8px; letter-spacing: 1px; }
                    .summary-card span { font-size: 32px; font-weight: 700; color: #0f172a; }

                    .cover-container { min-height: 90vh; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }

                    .page-break { page-break-before: always; }
                    .test-header { background: #004a99; color: #fff; padding: 30px 40px; margin: 40px -40px 30px -40px; display: flex; justify-content: space-between; align-items: center; }
                    .test-header h2 { margin: 0; font-size: 18px; font-weight: 700; }
                    .status-pill { padding: 6px 16px; border-radius: 30px; font-size: 10px; font-weight: 800; background: #fff; letter-spacing: 0.5px; }
                    
                    .evidence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-top: 25px; }
                    .evidence-item { break-inside: avoid; margin-bottom: 35px; }
                    .evidence-item h4 { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .img-wrap { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #f8fafc; padding: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    img.evidence-img { width: 100%; display: block; border-radius: 8px; }
                    
                    .footer strong { color: #64748b; }

                    /* Watermark */
                    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); opacity: 0.05; width: 600px; z-index: -1; pointer-events: none; }

                    .metrics-container { display: flex; gap: 15px; margin-bottom: 25px; }
                    .metric-tag { background: #f1f5f9; padding: 10px 15px; border-radius: 10px; border: 1px dashed #cbd5e1; font-size: 11px; flex: 1; display: flex; justify-content: space-between; align-items: center; }
                    .metric-tag b { color: #004a99; font-size: 12px; }
                    .sla-indicator { width: 8px; height: 8px; border-radius: 50%; margin-left: 8px; display: inline-block; }
                    .sla-good { background: #10b981; }
                    .sla-warn { background: #f59e0b; }
                    .sla-bad { background: #ef4444; }
                </style>
            </head>
            <body>
                <!-- Watermark for all pages -->
                <img class="watermark" src="data:image/png;base64,${seidorLogoBase64}" alt="" />

                <div class="cover-container">
                    <div class="cover" style="height: auto; min-height: 60vh; margin-bottom: 40px;">
                        <p class="subtitle">Informe de Ejecución</p>
                        <h1>Evidencia de Certificación Automatizada</h1>
                        <p class="desc">Reporte consolidado de ejecución masiva para entornos SAP BTP. Optimización de ciclos de pruebas completas.</p>
                        
                        <div style="font-size: 13px; color: #475569;">
                            <b>Proyecto:</b> Facturación Clínica Internacional<br>
                            <b>Tester:</b> Pierre Gálvez Larriega<br>
                            <b>Fecha:</b> ${new Date().toLocaleString('es-PE')}
                        </div>
                    </div>

                    <div class="summary-grid" style="margin-top: auto; margin-bottom: 40px;">
                        <div class="summary-card"><label>Total Pruebas</label><span>${results.length}</span></div>
                        <div class="summary-card success"><label>Exitosas</label><span style="color:#10b981">${results.filter(r => r.status === 'EXITO').length}</span></div>
                        <div class="summary-card error"><label>Fallidas</label><span style="color:#ef4444">${results.filter(r => r.status === 'FALLIDO').length}</span></div>
                    </div>
                </div>

                ${results.map((r, index) => {
                const pics = [
                    { id: 'antes_de_cobrar', title: '01. Carga de Pre-Factura' },
                    { id: 'modal_efectivo', title: '02. Ingreso de Pago' },
                    { id: 'post_pago', title: '03. Transacción Registrada' },
                    { id: 'comprobante_emitido', title: '04. Voucher en Documentos' },
                    { id: 'error_flujo', title: '⚠️ Evidencia de Error' }
                ];

                let evidenceHtml = '';
                pics.forEach(p => {
                    const imgPath = path.join(r.runDir, p.id + '.png');
                    if (fs.existsSync(imgPath)) {
                        const b64 = fs.readFileSync(imgPath).toString('base64');
                        evidenceHtml += `
                            <div class="evidence-item">
                                <h4>${p.title}</h4>
                                <div class="img-wrap"><img class="evidence-img" src="data:image/png;base64,${b64}" /></div>
                            </div>`;
                    }
                });

                return `
                    <div class="page-break">
                        <div class="test-header">
                            <div>
                                <span style="font-size: 10px; opacity: 0.8; display: block; text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">Caso de Prueba #${String(index + 1).padStart(3, '0')}</span>
                                <h2>${r.config.tipoComprobante} - Línea de Ejecución #${index + 1}</h2>
                            </div>
                            <div class="status-pill" style="color: ${r.status === 'EXITO' ? '#10b981' : '#ef4444'}">
                                ${r.status}
                            </div>
                        </div>
                        <div style="margin-bottom: 20px; font-size: 12px; color: #64748b; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #f1f5f9;">
                            <b>Configuración:</b> ${r.config.pagos && r.config.pagos.length > 0 ? r.config.pagos.map(p => p.tipo).join(' + ') : (r.config.area ? `Área: ${r.config.area}` : 'Horario')} | <b>Resultado:</b> ${r.result}
                        </div>

                        <!-- Métricas de Negocio -->
                        <div class="metrics-container">
                            <div class="metric-tag">
                                <div>⏱️ Registro de Pago (E2E)</div>
                                <b>${r.metrics.payment_registration || '--'}s <span class="sla-indicator ${parseFloat(r.metrics.payment_registration) < 25 ? 'sla-good' : 'sla-warn'}"></span></b>
                            </div>
                            <div class="metric-tag">
                                <div>⚡ Emisión (Backend/SUNAT)</div>
                                <b>${r.metrics.document_emission || '--'}s <span class="sla-indicator ${parseFloat(r.metrics.document_emission) < 15 ? 'sla-good' : 'sla-warn'}"></span></b>
                            </div>
                        </div>

                        <div class="evidence-grid">
                            ${evidenceHtml}
                        </div>
                    </div>`;
            }).join('')}

                </div>
            </body>
            </html>`;

            const headerTemplate = `
                <div style="font-family: 'Poppins', sans-serif; font-size: 10px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 0.5px solid #e2e8f0; margin-bottom: 15px;">
                    <img src="data:image/png;base64,${seidorLogoBase64}" style="height: 20px; width: auto;" />
                    <div style="font-weight: 800; color: #004a99; font-size: 12px;">AutoBot</div>
                </div>
            `;

            const footerTemplate = `
                <div style="font-family: 'Poppins', sans-serif; font-size: 9px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 40px; color: #94a3b8; border-top: 0.5px solid #e2e8f0;">
                    <div>Impreso: ${new Date().toLocaleString('es-PE')} | Seidor Perú</div>
                    <div>Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
                </div>
            `;

            await page.setContent(html);
            await page.pdf({
                path: globalPdfPath,
                format: 'A4',
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: headerTemplate,
                footerTemplate: footerTemplate,
                margin: { top: '80px', bottom: '60px', left: '0', right: '0' }
            });
            await browser.close();
            return globalPdfPath;
        };

        processNext(); // Iniciar la primera tanda de tareas en cola
    } catch (error) {
        console.error(error);
        sendLog('orchestrator', 'error', `Error crítico en el orquestador: ${error.message}`);
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
            const openCommand = /^win/.test(process.platform) ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
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

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ UI Backend API Server running at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("❌ Error inicializando base de datos SQLite:", err);
});
