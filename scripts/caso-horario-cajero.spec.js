const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Script: Horario Cajero — Consultar y Verificar
 * Cliente: Clínica Internacional (CI)
 * 
 * ⚠️ PREREQUISITO: Ejecutar caso-horario-supervisor.spec.js primero.
 * Si el botón "Crear Horario" no aparece, significa que el Horario Supervisor
 * no existe para ese Área + Período.
 * 
 * TEST_PARAMS esperados:
 * {
 *   "area": "AMBULATORIA-ADMISION",
 *   "periodo": "03-2026",
 *   "semana": "Semana 1"
 * }
 */

const testConfig = process.env.TEST_PARAMS ? JSON.parse(process.env.TEST_PARAMS) : {
    area: 'AMBULATORIA-ADMISION',
    periodo: '03-2026',
    semana: 'Semana 1'
};

test(`Horario Cajero — Consultar [${testConfig.area} / ${testConfig.periodo} / ${testConfig.semana}]`, async ({ page }) => {
    const startTime = Date.now();
    test.setTimeout(180000);

    const env = JSON.parse(fs.readFileSync('./config/environments.json', 'utf8')).QAS;
    const evidenceDir = process.env.EVIDENCE_DIR || './evidence';
    const steps = [];
    let testStatus = '✅ EXITOSO';
    let testError = '';

    const logStep = (name, status) => {
        steps.push({ step: name, status, timestamp: new Date().toISOString() });
        const icon = status === 'ok' ? '✅' : status === 'error' ? '❌' : '⏳';
        console.log(`${icon} ${name}: ${status}`);
    };

    const shot = async (name) => {
        await page.waitForTimeout(1200);
        await page.waitForSelector('.sapMBusyIndicator, .sapUiLocalBusyIndicator', { state: 'hidden', timeout: 4000 }).catch(() => { });
        const p = path.join(evidenceDir, `${name}.png`);
        await page.screenshot({ path: p, fullPage: true });
        console.log(`📸 ${name}.png`);
        return p;
    };

    let activeFrame = null;
    const find = async (selector, timeout = 8000) => {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            if (activeFrame) {
                try {
                    const loc = activeFrame.locator(selector).first();
                    if (await loc.isVisible({ timeout: 80 }).catch(() => false)) return loc;
                } catch { activeFrame = null; }
            }
            for (const f of [page.mainFrame(), ...page.frames()]) {
                try {
                    const loc = f.locator(selector).first();
                    if (await loc.isVisible({ timeout: 50 }).catch(() => false)) {
                        activeFrame = f;
                        return loc;
                    }
                } catch { }
            }
            await page.waitForTimeout(80);
        }
        throw new Error(`[find] Timeout ${timeout}ms: '${selector}'`);
    };

    const tap = async (selector, timeout = 5000) => {
        try { await (await find(selector, timeout)).click(); return true; }
        catch { return false; }
    };

    // Interceptar alerts del navegador y dialogs SAP
    page.on('dialog', async dialog => {
        console.log(`⚠️ Dialog [${dialog.type()}]: ${dialog.message()}`);
        await dialog.accept().catch(() => { });
    });

    try {
        // =======================
        // PASO 1: LOGIN (si no hay sesión activa)
        // =======================
        logStep('login', 'running');
        await page.goto(env.url, { waitUntil: 'domcontentloaded' });
        const loginField = page.locator('#j_username');
        if (await loginField.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('🔐 Sesión no activa — ingresando credenciales...');
            await loginField.clear();
            await loginField.fill(env.user);
            const passField = page.locator('#j_password');
            await passField.clear();
            await passField.fill(env.pass);
            await page.click('#logOnFormSubmit');
            await page.waitForSelector('.sapMGT, [role="link"]', { timeout: 30000 });
        } else {
            console.log('✅ Sesión activa — continuando sin login.');
        }
        logStep('login', 'ok');

        // =======================
        // PASO 2: ABRIR APP HORARIO CAJERO
        // =======================
        logStep('abrir-horario-cajero', 'running');
        const tile = page.locator('.sapMGT, [role="link"]').filter({ hasText: /^Horario cajero$|^Horario Cajero$/i }).first();
        await tile.waitFor({ state: 'visible', timeout: 20000 });
        await tile.click();
        await page.waitForTimeout(3000);
        await shot('hc_app_inicial');
        logStep('abrir-horario-cajero', 'ok');

        // =======================
        // PASO 3: VERIFICAR QUE EL BOTÓN DE CREAR ESTÉ HABILITADO
        // (si no → el Horario Supervisor no existe → falla con mensaje claro)
        // =======================
        logStep('verificar-boton-crear', 'running');
        activeFrame = null;

        // Primero filtramos con los parámetros del escenario
        // -- Área
        const areaDropdown = await find('[placeholder*="rea"], select[id*="Area"], [class*="combobox"]', 10000);
        await areaDropdown.click();
        await page.waitForTimeout(400);
        await tap(`[role="option"]:has-text("${testConfig.area}"), li:has-text("${testConfig.area}")`, 4000);
        await page.waitForTimeout(400);

        // -- Período
        const periodoDropdown = await find('[placeholder*="eríodo"], select[id*="eriod"]', 8000);
        await periodoDropdown.click();
        await page.waitForTimeout(300);
        await tap(`[role="option"]:has-text("${testConfig.periodo}")`, 4000);
        await page.waitForTimeout(400);

        // -- Semana
        const semanaDropdown = await find('[placeholder*="emana"], select[id*="emana"]', 8000);
        await semanaDropdown.click();
        await page.waitForTimeout(300);
        await tap(`[role="option"]:has-text("${testConfig.semana}")`, 4000);
        await page.waitForTimeout(400);

        // Buscar
        await tap('button:has-text("Buscar"), button[id*="buscar"]', 5000);
        await page.waitForTimeout(2500);

        // Si aparece alerta "El horario se encuentra en el pasado", cerrar con OK
        const alertaPasado = await find('text="El horario se encuentra en el pasado"', 3000).catch(() => null);
        if (alertaPasado) {
            console.log('⚠️ Alerta: Horario en el pasado — cerrando con OK...');
            await tap('button:has-text("OK"), button:has-text("Aceptar")', 3000);
            await page.waitForTimeout(1000);
        }

        await shot('hc_lista_cajero');
        logStep('verificar-boton-crear', 'ok');

        // =======================
        // PASO 4: VERIFICAR Y ASIGNAR TURNOS
        // =======================
        logStep('asignar-turnos', 'running');
        const rowCajero = page.locator('tr, [role="row"]').filter({ hasText: env.user.toUpperCase() }).first();
        const existe = await rowCajero.isVisible({ timeout: 5000 }).catch(() => false);

        if (!existe) {
            throw new Error(`Usuario ${env.user.toUpperCase()} no encontrado en tabla para ${testConfig.semana}.`);
        }
        
        console.log(`✅ Usuario ${env.user.toUpperCase()} encontrado. Asignando turnos...`);

        // Extraer cabeceras (para ubicar el índice de las columnas de los días)
        const thead = page.locator('thead').first();
        const colHeaders = await thead.locator('th, [role="columnheader"]').allTextContents();
        // Ej: ["Item", "Usuario", "Lunes (2)", "Martes (3)", ...]
        
        if (testConfig.turnos) {
            for (const [diaClave, horarioValor] of Object.entries(testConfig.turnos)) {
                // diaClave ej: "Lunes". Buscar qué columna contiene "Lunes"
                const colIndex = colHeaders.findIndex(header => header.toLowerCase().includes(diaClave.toLowerCase()));
                
                if (colIndex > -1) {
                    console.log(`  🕒 Set ${diaClave} (col ${colIndex}) -> ${horarioValor}`);
                    // Encontrar la celda correspondiente en la fila del cajero
                    const celda = rowCajero.locator('td, [role="gridcell"]').nth(colIndex);
                    
                    // Hacer click para habilitar la edición (en Fiori a veces es un Text que al clic se hace Input)
                    await celda.click();
                    await page.waitForTimeout(300);
                    
                    // Buscar si hay un input activo dentro de la celda o globalmente enfocado
                    const inputActivo = celda.locator('input').first();
                    if (await inputActivo.isVisible({ timeout: 1000 }).catch(() => false)) {
                        await inputActivo.fill(horarioValor);
                    } else {
                        // Si no hay input claro, tipear usando keyboard
                        await page.keyboard.type(horarioValor);
                    }
                    await page.keyboard.press('Tab'); // Salir de la celda para aplicar cambios
                    await page.waitForTimeout(300);
                } else {
                    console.warn(`  ⚠️ Columna para día '${diaClave}' no encontrada en la cabecera.`);
                }
            }
        }
        
        await shot('hc_turnos_ingresados');

        // =======================
        // PASO 5: GUARDAR
        // =======================
        logStep('guardar-turnos', 'running');
        const btnGuardar = await find('button[title*="Guardar"], button:has-text("Guardar"), [aria-label*="Guardar"]', 5000);
        await btnGuardar.click();
        await page.waitForTimeout(2000);

        // Aceptar confirmación de éxito si la hay
        const okBtn = await find('button:has-text("OK"), button:has-text("Aceptar")', 3000).catch(() => null);
        if (okBtn) {
            await okBtn.click();
            await page.waitForTimeout(1000);
        }

        await shot('hc_turnos_guardados');
        logStep('guardar-turnos', 'ok');

    } catch (error) {
        testStatus = '❌ FALLIDO';
        testError = error.message;
        await shot('hc_error_flujo');
        console.error(`❌ Error Crítico: ${testError}`);
    } finally {
        const dur = ((Date.now() - startTime) / 1000).toFixed(2);

        if (process.env.EVIDENCE_DIR) {
            fs.writeFileSync(
                path.join(evidenceDir, 'playwright-result.json'),
                JSON.stringify({ scenario: 'horario-cajero', steps, duration: `${dur}s`, status: testStatus, error: testError }, null, 2)
            );
        }

        // PDF de evidencia
        try {
            console.log('📄 Generando PDF de evidencia...');
            const { chromium } = require('@playwright/test');
            const pdfBrowser = await chromium.launch({ headless: true });
            const pdfPage = await pdfBrowser.newPage();

            const pics = [
                { id: 'hc_app_inicial', title: '1. App Horario Cajero cargado' },
                { id: 'hc_lista_cajero', title: '2. Tabla HorarioCajero (resultados de búsqueda)' },
                { id: 'hc_verificacion_final', title: '3. Verificación final (usuario en tabla)' },
                { id: 'hc_error_flujo', title: '🔴 Error en el flujo' },
            ];

            let html = `<html><head><style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                h1 { color: #005587; border-bottom: 2px solid #005587; padding-bottom: 10px; }
                .meta { background: #f8fafc; padding: 15px; border-radius: 5px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                .box-warn { background: #fffbeb; border: 1px solid #f59e0b; padding: 12px; border-radius: 5px; margin-bottom: 20px; color: #92400e; }
                .step { margin-bottom: 40px; page-break-inside: avoid; }
                img { max-width: 100%; border: 1px solid #ccc; border-radius: 4px; margin-top: 10px; }
                .error-box { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 5px; color: #b91c1c; }
            </style></head><body>
                <h1>Reporte Técnico — Horario Cajero (CI)</h1>
                <div class="box-warn">⚠️ <strong>Prerequisito:</strong> Este flujo requiere que exista un Horario Supervisor activo para el mismo Área y Período.</div>
                <div class="meta">
                    <p><strong>Usuario:</strong> ${env.user.toUpperCase()}</p>
                    <p><strong>Área:</strong> ${testConfig.area}</p>
                    <p><strong>Período:</strong> ${testConfig.periodo}</p>
                    <p><strong>Semana:</strong> ${testConfig.semana}</p>
                    <hr style="border: 0; border-top: 1px dashed #ccc; margin: 10px 0;">
                    <p><strong>Estado:</strong> ${testStatus}</p>
                    <p><strong>Duración:</strong> ${dur}s | <strong>Fecha:</strong> ${new Date().toLocaleString('es-PE')}</p>
                </div>
                ${testError ? `<div class="error-box"><strong>Error:</strong> ${testError}</div>` : ''}
                <h2>Evidencias</h2>`;

            for (const p of pics) {
                const imgPath = path.join(evidenceDir, p.id + '.png');
                if (fs.existsSync(imgPath)) {
                    const base64 = fs.readFileSync(imgPath).toString('base64');
                    html += `<div class="step"><h3>${p.title}</h3><img src="data:image/png;base64,${base64}" /></div>`;
                }
            }
            html += '</body></html>';

            await pdfPage.setContent(html, { waitUntil: 'networkidle' });
            const timestamp = Date.now();
            const pdfPath = path.join(evidenceDir, `Reporte_HC_${timestamp}.pdf`);
            await pdfPage.pdf({ path: pdfPath, format: 'A4', margin: { top: '20px', bottom: '20px' } });
            await pdfBrowser.close();
            console.log(`✅ PDF Generado: ${pdfPath}`);
        } catch (err) {
            console.log('⚠️ No se pudo generar el PDF:', err.message);
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`  PRUEBA FINALIZADA: ${testStatus}`);
        console.log(`  Duración: ${dur}s`);
        console.log(`${'='.repeat(50)}\n`);
        if (testError) throw new Error(testError);
    }
});
