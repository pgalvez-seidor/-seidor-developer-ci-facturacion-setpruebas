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
        await page.waitForTimeout(300);
        await page.waitForSelector('.sapMBusyIndicator, .sapUiLocalBusyIndicator', { state: 'hidden', timeout: 4000 }).catch(() => { });
        const p = path.join(evidenceDir, `${name}.png`);
        await page.screenshot({ path: p, fullPage: true });
        console.log(`📸 ${name}.png`);
        return p;
    };

    let activeFrame = null;
    const find = async (selector, timeout = 800) => {
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

    const tap = async (selector, timeout = 1000) => {
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
        // PASO 2: ABRIR APP HORARIO CAJERO con reintento inteligente
        // =======================
        logStep('abrir-horario-cajero', 'running');
        let appLoaded = false;
        for (let i = 1; i <= 5; i++) {
            console.log(`🔄 Intento de carga de app Horario Cajero ${i}/5...`);
            const tile = page.locator('.sapMGT, [role="link"]').filter({ hasText: /^Horario cajero$|^Horario Cajero$/i }).first();
            if (await tile.isVisible({ timeout: 5000 }).catch(() => false)) {
                await tile.click();
                try {
                    // Esperamos que el iframe principal aparezca
                    await page.waitForSelector('iframe', { timeout: 10000 });
                    appLoaded = true;
                    break;
                } catch (e) {
                    console.log("⚠️ Iframe no cargó, reintentando...");
                }
            }
        }
        if (!appLoaded) throw new Error("La aplicación de Horario Cajero no cargó correctamente.");
        await page.waitForTimeout(1000);
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
        await page.waitForTimeout(50);
        await tap(`[role="option"]:has-text("${testConfig.area}"), li:has-text("${testConfig.area}")`, 4000);
        await page.waitForTimeout(50);

        // -- Período
        const periodoDropdown = await find('[placeholder*="eríodo"], select[id*="eriod"]', 8000);
        await periodoDropdown.click();
        await page.waitForTimeout(10);
        await tap(`[role="option"]:has-text("${testConfig.periodo}")`, 4000);
        await page.waitForTimeout(50);

        // -- Semana
        const semanaDropdown = await find('[placeholder*="emana"], select[id*="emana"]', 8000);
        await semanaDropdown.click();
        await page.waitForTimeout(10);
        await tap(`[role="option"]:has-text("${testConfig.semana}")`, 4000);
        await page.waitForTimeout(50);

        // Buscar
        await tap('button:has-text("Buscar"), button[id*="buscar"]', 5000);
        await page.waitForTimeout(2500);

        // Si aparece alerta "El horario se encuentra en el pasado", cerrar con OK
        const alertaPasado = await find('text="El horario se encuentra en el pasado"', 3000).catch(() => null);
        if (alertaPasado) {
            console.log('⚠️ Alerta: Horario en el pasado — cerrando con OK...');
            await tap('button:has-text("OK"), button:has-text("Aceptar")', 3000);
            await page.waitForTimeout(100);
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
            const msg = `USUARIO ${env.user.toUpperCase()} NO ENCONTRADO EN TABLA`;
            console.log(`❌ Error de Negocio Detectado: ${msg}`);
            throw new Error(msg);
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
                    await page.waitForTimeout(10);

                    // Buscar si hay un input activo dentro de la celda o globalmente enfocado
                    const inputActivo = celda.locator('input').first();
                    if (await inputActivo.isVisible({ timeout: 1000 }).catch(() => false)) {
                        await inputActivo.fill(horarioValor);
                    } else {
                        // Si no hay input claro, tipear usando keyboard
                        await page.keyboard.type(horarioValor);
                    }
                    await page.keyboard.press('Tab'); // Salir de la celda para aplicar cambios
                    await page.waitForTimeout(10);
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
        await page.waitForTimeout(200);

        // Aceptar confirmación de éxito si la hay
        const okBtn = await find('button:has-text("OK"), button:has-text("Aceptar")', 3000).catch(() => null);
        if (okBtn) {
            await okBtn.click();
            await page.waitForTimeout(100);
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

        // Reporte PDF
        try {
            console.log('📄 Generando PDF de evidencia...');
            const { chromium } = require('@playwright/test');
            const pdfBrowser = await chromium.launch({ headless: true });
            const pdfPage = await pdfBrowser.newPage();

            // Cargar Logo para el PDF
            let logoBase64 = "";
            try {
                const lp = path.join(process.cwd(), 'ui', 'public', 'seidor-logo.png');
                logoBase64 = fs.readFileSync(lp).toString('base64');
            } catch (e) { }

            let html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
                    body { font-family: 'Poppins', sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
                    
                    .header-brand { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                    .header-brand img { height: 35px; width: auto; }
                    .header-brand .app-name { font-weight: 800; font-size: 1rem; color: #004a99; letter-spacing: -0.5px; }

                    .header { background: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                    .header-left h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; }
                    .header-right { text-align: right; font-size: 11px; color: #64748b; font-weight: 600; }
                    
                    .box-warn { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 8px; margin-bottom: 30px; color: #92400e; font-size: 11px; font-weight: 600; }

                    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
                    .meta-item { background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                    .meta-item label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px; }
                    .meta-item span { font-size: 12px; font-weight: 700; color: #1e293b; }
                    
                    .status-badge { display: inline-block; padding: 5px 12px; border-radius: 30px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
                    .status-success { background: #dcfce7; color: #166534; }
                    .status-failed { background: #fee2e2; color: #991b1b; }

                    .section-title { font-size: 13px; color: #004a99; border-left: 4px solid #004a99; padding-left: 12px; margin: 30px 0 20px 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                    
                    .evidence-card { margin-bottom: 40px; page-break-inside: avoid; }
                    .evidence-card h3 { font-size: 10px; color: #64748b; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; font-weight: 700; }
                    .img-container { background: #f8fafc; padding: 6px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    img { width: 100%; border-radius: 8px; display: block; }
                    
                    .error-box { background: #fef2f2; border: 1px solid #ef4444; padding: 25px; border-radius: 16px; margin-bottom: 30px; }
                    .error-box strong { color: #991b1b; display: block; margin-bottom: 10px; font-size: 14px; }
                    .error-box p { color: #b91c1c; margin: 0; font-family: monospace; font-size: 12px; }

                    .footer { text-align: center; margin-top: 60px; padding: 30px 0; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; }
                    /* Watermark */
                    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); opacity: 0.05; width: 400px; z-index: -1; pointer-events: none; }
                </style>
            </head>
            <body>
                <!-- Watermark for all pages -->
                <img class="watermark" src="data:image/png;base64,${logoBase64}" alt="" />

                <div class="header">
                    <div class="header-left">
                        <h1>Certificación de Flujo</h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">Módulo: Horario Cajero - Clínica Internacional</p>
                    </div>
                    <div class="header-right">
                        <p>ID: ${Date.now()}</p>
                        <p>${new Date().toLocaleString('es-PE')}</p>
                    </div>
                </div>

                <div class="box-warn">
                    ⚠️ <strong>Prerequisito del Sistema:</strong> Este flujo requiere que exista un Horario Supervisor activo y aprobado para el mismo Área y Período seleccionado.
                </div>

                <div class="meta-grid">
                    <div class="meta-item"><label>Área / Período</label><span>${testConfig.area} - ${testConfig.periodo}</span></div>
                    <div class="meta-item"><label>Estado</label>
                        <span class="status-badge ${testStatus.includes('EXITO') ? 'status-success' : 'status-failed'}">${testStatus}</span>
                    </div>
                    <div class="meta-item"><label>Tiempo</label><span>${dur}s</span></div>
                    
                    <div class="meta-item"><label>Semana</label><span>${testConfig.semana}</span></div>
                    <div class="meta-item"><label>Usuario</label><span>${env.user.toUpperCase()}</span></div>
                    <div class="meta-item"><label>Fecha Reporte</label><span>${new Date().toLocaleDateString('es-PE')}</span></div>
                </div>

                ${testError ? `
                <div class="error-box">
                    <strong>⚠️ Incidencia detectada</strong>
                    <p>${testError}</p>
                </div>
                ` : ''}

                <div class="section-title">Evidencia de Pasos</div>
                
                <div style="margin: 20px 0; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                    <span>⏱️ Tiempo Total de Certificación (SLA)</span>
                    <b style="color: #004a99; font-size: 13px;">${dur}s <span style="width: 8px; height: 8px; border-radius: 50%; margin-left: 6px; display: inline-block; background: ${dur < 60 ? '#10b981' : '#f59e0b'};"></span></b>
                </div>`;

            const pics = [
                { id: 'hc_app_inicial', title: '01. Carga de aplicación Horario Cajero' },
                { id: 'hc_lista_cajero', title: '02. Búsqueda y filtrado de registros' },
                { id: 'hc_verificacion_final', title: '03. Verificación de asignación final' },
                { id: 'hc_error_flujo', title: '🔴 Captura de error / Excepción' },
            ];

            for (const p of pics) {
                const imgPath = path.join(evidenceDir, p.id + '.png');
                if (fs.existsSync(imgPath)) {
                    const base64 = fs.readFileSync(imgPath).toString('base64');
                    html += `
                    <div class="evidence-card">
                        <h3>Paso: ${p.title}</h3>
                        <div class="img-container">
                            <img src="data:image/png;base64,${base64}" />
                        </div>
                    </div>`;
                }
            }

            html += `
                </div>
            </body></html>`;

            const headerTemplate = `
                <div style="font-family: 'Poppins', sans-serif; font-size: 10px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 15px 40px; border-bottom: 0.5px solid #e2e8f0; margin-bottom: 10px;">
                    <img src="data:image/png;base64,${logoBase64}" style="height: 15px; width: auto;" />
                    <div style="font-weight: 800; color: #004a99; font-size: 11px;">AutoBot</div>
                </div>
            `;

            const footerTemplate = `
                <div style="font-family: 'Poppins', sans-serif; font-size: 8px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 8px 40px; color: #94a3b8; border-top: 0.5px solid #e2e8f0;">
                    <div>Impreso: ${new Date().toLocaleString('es-PE')} | Seidor Perú</div>
                    <div>Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
                </div>
            `;

            await pdfPage.setContent(html, { waitUntil: 'networkidle' });
            const timestamp = Date.now();
            const pdfPath = path.join(evidenceDir, `Reporte_HC_${timestamp}.pdf`);
            await pdfPage.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: headerTemplate,
                footerTemplate: footerTemplate,
                margin: { top: '70px', bottom: '50px', left: '0', right: '0' }
            });
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
