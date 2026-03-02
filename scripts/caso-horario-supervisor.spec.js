const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Script: Horario Supervisor — Asignación Diaria
 * Cliente: Clínica Internacional (CI)
 * 
 * Verifica si ya existe el horario supervisor DEL DÍA ACTUAL.
 * Si no existe, ingresa al detalle del supervisor, agrega un nuevo detalle
 * con la fecha de hoy, usa el check, habilita (persona), y guarda.
 */

const testConfig = process.env.TEST_PARAMS ? JSON.parse(process.env.TEST_PARAMS) : {
    area: 'AMBULATORIA-ADMISION',
    periodo: (() => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` })(),
    fechaHoy: (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` })()
};

test(`Horario Supervisor — Flujo Diario [${testConfig.fechaHoy}]`, async ({ page }) => {
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
        await page.waitForTimeout(100);
        await page.waitForSelector('.sapMBusyIndicator, .sapUiLocalBusyIndicator', { state: 'hidden', timeout: 4000 }).catch(() => { });
        const p = path.join(evidenceDir, `${name}.png`);
        await page.screenshot({ path: p, fullPage: true });
        console.log(`📸 ${name}.png`);
        return p;
    };

    let activeFrame = null;
    const find = async (selector, timeout = 10000) => {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            if (activeFrame) {
                try {
                    const loc = activeFrame.locator(selector).first();
                    if (await loc.isVisible({ timeout: 100 }).catch(() => false)) return loc;
                } catch { activeFrame = null; }
            }
            for (const f of [page.mainFrame(), ...page.frames()]) {
                try {
                    const loc = f.locator(selector).first();
                    if (await loc.isVisible({ timeout: 100 }).catch(() => false)) {
                        activeFrame = f;
                        return loc;
                    }
                } catch { }
            }
            await page.waitForTimeout(200);
        }
        throw new Error(`[find] Timeout ${timeout}ms: '${selector}'`);
    };

    const tap = async (selector, timeout = 1000) => {
        try { await (await find(selector, timeout)).click(); return true; }
        catch { return false; }
    };

    page.on('dialog', async dialog => {
        console.log(`⚠️ Dialog [${dialog.type()}]: ${dialog.message()}`);
        await dialog.accept().catch(() => { });
    });

    try {
        // 1. LOGIN
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
        }
        logStep('login', 'ok');

        // 2. ABRIR APP con reintento inteligente
        logStep('abrir-app', 'running');
        let appLoaded = false;
        for (let i = 1; i <= 5; i++) {
            console.log(`🔄 Intento de carga de app Horario Supervisor ${i}/5...`);
            const tile = page.locator('.sapMGT, [role="link"]').filter({ hasText: /^Horario Supervisor$/ }).first();
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
        if (!appLoaded) throw new Error("La aplicación de Horario Supervisor no cargó correctamente.");
        await page.waitForTimeout(1000);
        await shot('hs_01_app_inicial');
        logStep('abrir-app', 'ok');

        // 3. FILTRAR EN PANEL IZQUIERDO
        logStep('filtrar-lista', 'running');
        console.log(`🔍 Filtrando: Área -> ${testConfig.periodo} -> ${env.user.toUpperCase()} -> Buscar`);

        // Área
        const areaField = await find('span:has-text("Seleccione Área"), input[placeholder*="rea" i]', 10000);
        await areaField.click({ force: true });
        await tap(`[role="option"]:has-text("${testConfig.area}"), li:has-text("${testConfig.area}")`, 3000);
        await page.waitForTimeout(2000);

        // Período
        const periodoInput = await find('input[placeholder*="eríodo"], input[placeholder*="eriod"]', 3000);
        await periodoInput.click({ force: true });
        await periodoInput.fill(testConfig.periodo);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Supervisor
        const supervisorInput = await find('input[placeholder*="upervisor" i]', 3000);
        await supervisorInput.click({ force: true });
        await supervisorInput.fill("");
        await supervisorInput.fill(env.user.toUpperCase());
        await page.keyboard.press('Escape');
        await page.waitForTimeout(50);

        // LUPA DE BÚSQUEDA DEL LISTADO
        console.log("🔍 Clic en Lupa de búsqueda...");
        // Usamos el ID exacto y title "Search" extraído del DOM real de este frame
        const btnLupa = await find('button[title="Search"], button[title="Buscar"]', 5000);

        await btnLupa.click({ force: true });
        await page.waitForTimeout(1500);

        console.log("🔍 Re-presionando Lupa...");
        await btnLupa.click({ force: true }).catch(() => { });

        // Espera Busy Final
        await page.waitForSelector('.sapMBusyIndicator', { state: 'hidden', timeout: 10000 }).catch(() => { });
        await page.waitForTimeout(2000);
        await shot('hs_02_lista_filtrada');
        logStep('filtrar-lista', 'ok');

        // 4. VERIFICAR EXISTENCIA DEL SUPERVISOR EN LA LISTA
        logStep('seleccionar-supervisor', 'running');
        const userPeriodoTexto = `${env.user.toUpperCase()}`;
        // Declarar frameInputs!
        let frameInputs = activeFrame ? activeFrame : page;

        const listItem = frameInputs.locator(`.sapMList .sapMLIBContent, .sapMList [role="listitem"]`)
            .filter({ hasText: userPeriodoTexto })
            .first();

        let supervisorExiste = false;
        try {
            await listItem.waitFor({ state: 'visible', timeout: 5000 });
            supervisorExiste = true;
        } catch {
            supervisorExiste = false;
        }

        let necesitaCrear = false;

        if (supervisorExiste) {
            console.log("✅ El supervisor YA EXISTE para este período. Seleccionando de la lista...");
            await listItem.click({ timeout: 5000, force: true });

            console.log("⏳ Esperando que cargue el panel de Horario...");
            await frameInputs.locator('.sapMTitle:has-text("Horario"), .sapMPageTitle:has-text("Horario"), .sapMTable').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => { });

            // Check for empty screen (No Data/MessagePage) by absence of table or presence of Asignación text
            const tieneTabla = await frameInputs.locator('.sapMTable').first().isVisible().catch(() => false);
            const textEmpty = await frameInputs.locator('text="Asignación Supervisor"').first().isVisible().catch(() => false);
            const esVacio = !tieneTabla || textEmpty;

            if (esVacio) {
                console.log("⚠️ El detalle está vacío.");
                necesitaCrear = true;
            } else {
                await shot('hs_03_detalle_abierto');
                console.log("📝 Haciendo scroll al contenedor de la tabla...");
                await page.evaluate(() => {
                    const scrollable = document.querySelector('[id$="--table-scroll"], .sapUiTableCtrlScr, .sapMScrollCont:last-child');
                    if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
                }).catch(() => { });
                await page.waitForTimeout(50);

                const lastRowContent = await frameInputs.locator('.sapMTable tbody tr, [role="row"]').last().textContent({ timeout: 3000 }).catch(() => "");
                if (lastRowContent.includes(testConfig.fechaHoy)) {
                    console.log(`✅ ¡Ya existe un horario activo para hoy (${testConfig.fechaHoy})!`);
                    testStatus = '✅ EXITOSO (Ya existía)';
                    return;
                }
                console.log(`📝 Procediendo a crear el horario para HOY (${testConfig.fechaHoy})...`);
            }
        } else {
            console.log("📝 Llenando formulario Agregar Asignación en el panel derecho...");

            try {
                console.log("   -> Seleccionando Área...");
                const areaDropDer = frameInputs.locator('.sapMSplitContainerDetail .sapMComboBox, .sapMSplitContainerDetail .sapMSelect, .sapMSplitContainerDetail [role="combobox"]').first();
                await areaDropDer.click({ force: true, timeout: 5000 });
                await tap(`[role="option"]:has-text("${testConfig.area}"), li:has-text("${testConfig.area}")`, 5000);
                await page.waitForTimeout(100);

                console.log("   -> Ingresando Supervisor...");
                // Es el primer input vacío no-readonly (el de Sede es readonly)
                const supInpDer = frameInputs.locator('.sapMSplitContainerDetail input:not([readonly])').first();
                await supInpDer.click({ force: true });
                await supInpDer.fill(env.user.toUpperCase());
                await page.waitForTimeout(50);
                await page.keyboard.press('Escape');
                await page.waitForTimeout(50);

                console.log("   -> Ingresando Período...");
                const perInpDer = frameInputs.locator('.sapMSplitContainerDetail input[placeholder*="eríodo"], .sapMSplitContainerDetail input[placeholder*="eriod"], .sapMSplitContainerDetail input:not([readonly])').nth(1);
                await perInpDer.click({ force: true });
                await perInpDer.fill(testConfig.periodo);
                await page.keyboard.press('Enter');
                await page.waitForTimeout(100);
            } catch (err) {
                console.log("⚠️ Hubo un error al llenar el formulario explícito. Fallback...", err.message);
                const supInputFallback = await find('.sapMSplitContainerDetail input[placeholder*="upervisor" i], .sapMSplitContainerDetail input:not([readonly])', 3000);
                await supInputFallback.first().fill(env.user.toUpperCase());
                await page.keyboard.press('Escape');
                await page.waitForTimeout(100);
            }

            await shot('hs_03_form_nuevo');
        }

        logStep('seleccionar-supervisor', 'ok');

        // 6. AGREGAR DETALLE (+) DE UN DÍA
        logStep('agregar-dia', 'running');
        const selectorIconoMas = '[data-sap-ui-icon-content=""]';
        let btnMas;
        try {
            btnMas = frameInputs.locator(`button:has(${selectorIconoMas}), .sapMTableToolbar button, .sapMTB button`).last();
            await btnMas.click({ timeout: 5000, force: true });
        } catch {
            btnMas = frameInputs.locator('button[id$="add-btn"], button[id$="addRow-btn"]').last();
            await btnMas.click({ timeout: 5000, force: true });
        }
        await page.waitForTimeout(50);

        // Identificar los inputs de fecha
        const dateInputsList = await frameInputs.locator('input[placeholder*="echa"], input[type="date"], input.sapMInputBaseInner').all();
        // Filtrar a mano los visibles para evitar problemas de locator inter-frames
        const dateInputs = [];
        for (const input of dateInputsList) {
            if (await input.isVisible().catch(() => false)) {
                dateInputs.push(input);
            }
        }

        // Usualmente los dos últimos editables son de la nueva fila añadida
        if (dateInputs.length >= 2) {
            await dateInputs[dateInputs.length - 2].fill(testConfig.fechaHoy);
            await dateInputs[dateInputs.length - 1].fill(testConfig.fechaHoy);
            await page.keyboard.press('Tab');
        }
        await page.waitForTimeout(100);

        // Botón CHECK (✔️)
        const btnCheck = await frameInputs.locator('button[title*="Aceptar"], button[title*="Confirmar"], button[title*="Guardar"], .sapUiIcon[data-sap-ui-icon-content=""]').last();
        if (await btnCheck.isVisible({ timeout: 2000 }).catch(() => false)) {
            await btnCheck.click({ timeout: 5000, force: true });
        }
        await page.waitForTimeout(100);

        // Botón PERSONA (👤) para Habilitar el día
        const btnPersona = await frameInputs.locator('button[title*="Habilitar"], button[title*="Persona"], button[title*="habilitar"], .sapUiIcon[data-sap-ui-icon-content=""]').last();
        if (await btnPersona.isVisible({ timeout: 3000 }).catch(() => false)) {
            await btnPersona.click({ timeout: 5000, force: true });
            await page.waitForTimeout(1500);
            await shot('hs_05_popup_habilitar');

            // Popup > Seleccionar check
            const filaPopup = frameInputs.locator('[role="dialog"], .sapMDialog').locator('.sapMLIBContent, [role="row"]').filter({ hasText: testConfig.fechaHoy }).first();
            if (await filaPopup.isVisible({ timeout: 2000 })) {
                await filaPopup.locator('.sapMCb, [role="checkbox"]').click({ timeout: 5000, force: true });
            } else {
                await tap('[role="dialog"] .sapMCb, [role="dialog"] [role="checkbox"]', 2000);
            }

            await tap('[role="dialog"] button:has-text("OK"), [role="dialog"] button:has-text("Aceptar")', 3000);
            await page.waitForTimeout(100);
        }

        await shot('hs_06_dia_agregado');
        logStep('agregar-dia', 'ok');

        // 7. GUARDAR FINAL
        logStep('guardar', 'running');
        // Botón guardar principal suele estar abajo a la derecha
        const btnGuardar = await find('button[title*="Guardar"], button:has-text("Guardar"), [aria-label*="Guardar"]', 5000);
        await btnGuardar.click({ timeout: 5000, force: true });
        await page.waitForTimeout(2000);

        // Confirmación
        await tap('button:has-text("Sí"), button:has-text("Aceptar"), button:has-text("OK")', 3000);
        await page.waitForTimeout(2000);

        await shot('hs_07_guardado_final');
        logStep('guardar', 'ok');

    } catch (error) {
        testStatus = '❌ FALLIDO';
        testError = error.message;
        await shot('hs_error_flujo');
        console.error(`❌ Error Crítico: ${testError}`);
    } finally {
        const dur = ((Date.now() - startTime) / 1000).toFixed(2);

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
                    
                    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
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
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">Módulo: Horario Supervisor - Clínica Internacional</p>
                    </div>
                    <div class="header-right">
                        <p>FECHA: ${testConfig.fechaHoy}</p>
                        <p>${new Date().toLocaleString('es-PE')}</p>
                    </div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item"><label>Usuario</label><span>${env.user.toUpperCase()}</span></div>
                    <div class="meta-item"><label>Estado</label>
                        <span class="status-badge ${testStatus.includes('EXITO') ? 'status-success' : 'status-failed'}">${testStatus}</span>
                    </div>
                    <div class="meta-item"><label>Duración</label><span>${dur}s</span></div>
                    <div class="meta-item"><label>ID</label><span>${Date.now()}</span></div>
                </div>

                ${testError ? `
                <div class="error-box">
                    <strong>⚠️ Interrupción detectada</strong>
                    <p>${testError}</p>
                </div>
                ` : ''}

                <div class="section-title">Evidencias Fotográficas</div>
                
                <div style="margin: 20px 0; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                    <span>⏱️ Tiempo Total de Certificación (SLA)</span>
                    <b style="color: #004a99; font-size: 13px;">${dur}s <span style="width: 8px; height: 8px; border-radius: 50%; margin-left: 6px; display: inline-block; background: ${dur < 120 ? '#10b981' : '#f59e0b'};"></span></b>
                </div>`;

            const fsImages = fs.readdirSync(evidenceDir).filter(f => f.startsWith('hs_') && f.endsWith('.png')).sort();
            for (const imgName of fsImages) {
                const imgPath = path.join(evidenceDir, imgName);
                const b64 = fs.readFileSync(imgPath).toString('base64');
                html += `
                <div class="evidence-card">
                    <h3>Paso: ${imgName}</h3>
                    <div class="img-container">
                        <img src="data:image/png;base64,${b64}" />
                    </div>
                </div>`;
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
            const pdfPath = path.join(evidenceDir, `Reporte_HS_Diario_${Date.now()}.pdf`);
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
        } catch (e) {
            console.log('⚠️ Error PDF:', e.message);
        }

        console.log(`\n================================`);
        console.log(`  RESULTADO: ${testStatus} `);
        console.log(`================================\n`);
        if (testError) throw new Error(testError);
    }
});
