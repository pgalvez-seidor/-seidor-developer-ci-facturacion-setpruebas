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
        await page.waitForTimeout(1000);
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

    const tap = async (selector, timeout = 5000) => {
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

        // 2. ABRIR APP
        logStep('abrir-app', 'running');
        const tile = page.locator('.sapMGT, [role="link"]').filter({ hasText: /^Horario Supervisor$/ }).first();
        await tile.waitFor({ state: 'visible', timeout: 20000 });
        await tile.click();
        await page.waitForTimeout(4000);
        await shot('hs_01_app_inicial');
        logStep('abrir-app', 'ok');

        // 3. FILTRAR EN PANEL IZQUIERDO
        logStep('filtrar-lista', 'running');
        console.log(`🔍 Filtrando Área: ${testConfig.area}, Período: ${testConfig.periodo}, Sup: ${env.user.toUpperCase()}`);
        
        // Área: Primer dropdown/combobox disponible en el panel de filtros
        const areaDropdown = await find('input[placeholder*="rea"], div[title*="Área"], span:has-text("Seleccione Área"), .sapMSlt, .sapMComboBox', 3000);
        await areaDropdown.click({ force: true });
        await page.waitForTimeout(500);
        // Clic en la opción AMBULATORIA-ADMISION
        await tap(`[role="option"]:has-text("${testConfig.area}"), li:has-text("${testConfig.area}"), div:has-text("${testConfig.area}")`, 3000);
        
        // ESPERAR DATOS MAESTROS (Busy Indicator) ante el cambio de área
        console.log("⏳ Esperando carga de datos maestros para el área seleccionada...");
        await page.waitForSelector('.sapMBusyIndicator, .sapUiLocalBusyIndicator', { state: 'visible', timeout: 5000 }).catch(() => {});
        await page.waitForSelector('.sapMBusyIndicator, .sapUiLocalBusyIndicator', { state: 'hidden', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1000);

        // Período: Input interactivo después del área
        const periodoInput = await find('input[placeholder*="eríodo"], input[placeholder*="eriod"], input.sapMInputBaseInner:not([readonly])', 3000);
        await periodoInput.click({ force: true });
        await periodoInput.fill(testConfig.periodo);
        await page.keyboard.press('Tab');
        await page.waitForTimeout(500);
        
        // Supervisor (Usuario logueado)
        logStep('filtrar-supervisor', 'running');
        const supervisorInput = await find('input[placeholder*="upervisor" i]', 3000);
        await supervisorInput.click({ force: true });
        await supervisorInput.fill(env.user.toUpperCase());
        await page.waitForTimeout(500);
        
        // Clic en Buscar
        console.log("🔍 Clic en la lupa de búsqueda...");
        await tap('button[id*="buscar", i], button[title*="Buscar", i], button:has-text("Buscar"), .sapMSearchFieldSearch', 5000);
        
        // Esperar bloqueador de UI (sapMBusyIndicator)
        await page.waitForSelector('.sapMBusyIndicator, .sapUiLocalBusyIndicator', { state: 'visible', timeout: 5000 }).catch(() => {});
        await page.waitForSelector('.sapMBusyIndicator, .sapUiLocalBusyIndicator', { state: 'hidden', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1500); // extra wait for rendering
        await shot('hs_02_lista_filtrada');
        logStep('filtrar-lista', 'ok');

        // 4. VERIFICAR EXISTENCIA DEL SUPERVISOR EN LA LISTA
        logStep('seleccionar-supervisor', 'running');
        // Quitamos el filtro de periodo porque el panel izquierdo ya fue filtrado y a veces la estructura del texto en Fiori cambia
        const userPeriodoTexto = `${env.user.toUpperCase()}`;
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
        
        if (supervisorExiste) {
            console.log("✅ El supervisor YA EXISTE para este período. Seleccionando de la lista...");
            // Aseguramos el click en el supervisor
            await listItem.click({ timeout: 5000, force: true });
            
            // ESPERAR A QUE CARGUE EL DETALLE (Panel derecho con título "Horario")
            console.log("⏳ Esperando que cargue el panel de Horario...");
            const detalleCargado = await frameInputs.locator('.sapMTitle:has-text("Horario"), .sapMPageTitle:has-text("Horario"), .sapMTable').first().waitFor({ state: 'visible', timeout: 5000 })
                .then(()=>true).catch(() => false);
            
            const esVacio = await frameInputs.locator('.sapMTitle:has-text("Asignación Supervisor")').isVisible().catch(()=>false);
            
            if (!detalleCargado || esVacio) {
                 console.log("⚠️ El detalle está vacío. Iniciando flujo de creación de asignación...");
                 const btnFooterAdd = frameInputs.locator('.sapMPageFooter button, .sapMTB button').filter({ has: frameInputs.locator('[data-sap-ui-icon-content=""]') }).first();
                 await btnFooterAdd.click({ force: true });
                 await page.waitForTimeout(2000);
                 
                 // Flujo Popup Buscar Supervisor (común para ambos casos de creación)
                 console.log("📝 Buscando supervisor en el popup...");
                 const popInput = await find('[role="dialog"] input[type="search"], .sapMDialog input', 5000);
                 await popInput.fill(env.user.toUpperCase());
                 await page.keyboard.press('Enter');
                 await page.waitForTimeout(1000);
                 
                 const userText = `Usuario: ${env.user.toUpperCase()}`;
                 const popItem = frameInputs.locator('.sapMDialog, [role="dialog"]').getByText(userText, { exact: false }).first();
                 await popItem.click({ timeout: 5000, force: true });
                 await page.waitForTimeout(2000);
            }
            
            await shot('hs_03_detalle_abierto');
            
            // VALIDAR ÚLTIMA FILA (FECHA DE HOY)
            console.log("📝 Haciendo scroll al contenedor de la tabla...");
            await page.evaluate(() => {
                const scrollable = document.querySelector('[id$="--table-scroll"], .sapUiTableCtrlScr, .sapMScrollCont:last-child');
                if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
            }).catch(() => {});
            await page.waitForTimeout(500);

            // Obtener el contenido de la última fila visible
            const lastRowContent = await frameInputs.locator('.sapMTable tbody tr, [role="row"]').last().textContent({ timeout: 3000 }).catch(() => "");
            if (lastRowContent.includes(testConfig.fechaHoy)) {
                console.log(`✅ ¡Ya existe un horario activo para hoy (${testConfig.fechaHoy})!`);
                testStatus = '✅ EXITOSO (Ya existía)';
                return;
            }
            console.log(`📝 Procediendo a crear el horario para HOY (${testConfig.fechaHoy})...`);
        } else {
            console.log("⚠️ El supervisor NO SE ENCONTRÓ en la lista. CREANDO NUEVA ASIGNACIÓN...");
            const btnAgregarSup = await find('button[title*="Agregar"], button .sapUiIcon[data-sap-ui-icon-content=""]', 5000);
            await btnAgregarSup.click({ timeout: 5000, force: true });
            await page.waitForTimeout(2000);
            
            const popInput = await find('[role="dialog"] input[type="search"], .sapMDialog input', 5000);
            await popInput.fill(env.user.toUpperCase());
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);

            const userText = `Usuario: ${env.user.toUpperCase()}`;
            const popItem = frameInputs.locator('.sapMDialog, [role="dialog"]').getByText(userText, { exact: false }).first();
            await popItem.click({ timeout: 5000, force: true });
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
        await page.waitForTimeout(500);

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
        await page.waitForTimeout(1000);

        // Botón CHECK (✔️)
        const btnCheck = await frameInputs.locator('button[title*="Aceptar"], button[title*="Confirmar"], button[title*="Guardar"], .sapUiIcon[data-sap-ui-icon-content=""]').last();
        if (await btnCheck.isVisible({timeout:2000}).catch(()=>false)) {
            await btnCheck.click({ timeout: 5000, force: true });
        }
        await page.waitForTimeout(1000);

        // Botón PERSONA (👤) para Habilitar el día
        const btnPersona = await frameInputs.locator('button[title*="Habilitar"], button[title*="Persona"], button[title*="habilitar"], .sapUiIcon[data-sap-ui-icon-content=""]').last();
        if (await btnPersona.isVisible({timeout:3000}).catch(()=>false)) {
            await btnPersona.click({ timeout: 5000, force: true });
            await page.waitForTimeout(1500);
            await shot('hs_05_popup_habilitar');

            // Popup > Seleccionar check
            const filaPopup = frameInputs.locator('[role="dialog"], .sapMDialog').locator('.sapMLIBContent, [role="row"]').filter({hasText: testConfig.fechaHoy}).first();
            if (await filaPopup.isVisible({timeout:2000})) {
                await filaPopup.locator('.sapMCb, [role="checkbox"]').click({ timeout: 5000, force: true });
            } else {
                await tap('[role="dialog"] .sapMCb, [role="dialog"] [role="checkbox"]', 2000);
            }
            
            await tap('[role="dialog"] button:has-text("OK"), [role="dialog"] button:has-text("Aceptar")', 3000);
            await page.waitForTimeout(1000);
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
            console.log('📄 Generando PDF...');
            const { chromium } = require('@playwright/test');
            const pdfBrowser = await chromium.launch({ headless: true });
            const pdfPage = await pdfBrowser.newPage();

            let html = `<html><head><style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                h1 { color: #005587; border-bottom: 2px solid #005587; padding-bottom: 10px; }
                .meta { background: #f8fafc; padding: 15px; border-radius: 5px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                .step { margin-bottom: 40px; }
                img { max-width: 100%; border: 1px solid #ccc; border-radius: 4px; }
                .error-box { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 5px; color: #b91c1c; }
            </style></head><body>
                <h1>Reporte Técnico — Horario Supervisor (Flujo Diario CI)</h1>
                <div class="meta">
                    <p><strong>Fecha Objetivo:</strong> ${testConfig.fechaHoy}</p>
                    <p><strong>Usuario Logueado:</strong> ${env.user.toUpperCase()}</p>
                    <p><strong>Estado:</strong> ${testStatus}</p>
                    <p><strong>Duración:</strong> ${dur}s</p>
                </div>
                ${testError ? `<div class="error-box"><strong>Error:</strong> ${testError}</div>` : ''}
                <h2>Evidencias</h2>`;

            const fsImages = fs.readdirSync(evidenceDir).filter(f => f.startsWith('hs_') && f.endsWith('.png')).sort();
            for (const imgName of fsImages) {
                const imgPath = path.join(evidenceDir, imgName);
                const base64 = fs.readFileSync(imgPath).toString('base64');
                html += `<div class="step"><h3>Vaso Visual: ${imgName}</h3><img src="data:image/png;base64,${base64}" /></div>`;
            }

            html += '</body></html>';
            await pdfPage.setContent(html, { waitUntil: 'networkidle' });
            const pdfPath = path.join(evidenceDir, `Reporte_HS_Diario_${Date.now()}.pdf`);
            await pdfPage.pdf({ path: pdfPath, format: 'A4' });
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
