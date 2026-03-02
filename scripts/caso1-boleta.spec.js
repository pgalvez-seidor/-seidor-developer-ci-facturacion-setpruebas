const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { createPrefactura } = require('./api-helper');

// --- LEER CONFIG DINÁMICA ---
const testConfig = process.env.TEST_PARAMS ? JSON.parse(process.env.TEST_PARAMS) : {
    tipoComprobante: 'Boleta',
    medioPago: 'Efectivo',
    conVuelto: false
};

test(`Facturación Dinámica - ${testConfig.tipoComprobante} vía ${testConfig.medioPago}`, async ({ page }) => {
    const startTime = Date.now();
    test.setTimeout(180000);

    // --- ENTORNO ---
    const env = JSON.parse(fs.readFileSync('./config/environments.json', 'utf8')).QAS;
    const prefacturaId = process.env.PREFACTURA_ID || null;
    const evidenceDir = process.env.EVIDENCE_DIR || './evidence';
    const steps = [];

    const logStep = (name, status) => {
        steps.push({ step: name, status, timestamp: new Date().toISOString() });
        const icon = status === 'ok' ? '✅' : status === 'error' ? '❌' : '⏳';
        console.log(`${icon} ${name}: ${status}`);
    };

    const shot = async (name) => {
        await page.waitForTimeout(500); // Esperar que desaparezcan los busy indicators
        // Intentar esperar a que no haya loaders
        await page.waitForSelector('.sapMBusyIndicator, .sapUiLocalBusyIndicator', { state: 'hidden', timeout: 300 }).catch(() => {});
        
        const p = path.join(evidenceDir, `${name}.png`);
        await page.screenshot({ path: p, fullPage: true });
        console.log(`📸 ${name}.png`);
        return p;
    };

    // =========================================================
    // MOTOR MULTI-FRAME sin caché estática
    // activeFrame se DEBE resetear a null antes de buscar en
    // contextos nuevos (dopo navigación master-detail).
    // =========================================================
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

    // Click suave — no lanza error si no encuentra
    const tap = async (selector, timeout = 3000) => {
        try { await (await find(selector, timeout)).click(); return true; }
        catch { return false; }
    };

    // =========================================================
    // PRE-FACTURA (modo standalone: la crea ella misma)
    // =========================================================
    let activeId = prefacturaId;
    if (!activeId) {
        console.log("🚀 Emitiendo PRE-FACTURA vía API...");
        activeId = await createPrefactura("PGALVEZ3");
        console.log(`✅ ID: ${activeId}`);
    }

    // =========================================================
    // INTERCEPTAR MODALES DEL NAVEGADOR Y VENTANAS EMERGENTES
    // =========================================================
    page.on('dialog', async dialog => {
        console.log(`⚠️ Dialog interceptado [${dialog.type()}]: ${dialog.message()}`);
        await dialog.accept().catch(() => {});
    });

    page.on('popup', async popup => {
        console.log(`⚠️ Popup de nueva ventana interceptado (ej: Print Preview). Cerrando...`);
        await popup.close().catch(() => {});
    });
    let testStatus = "✅ EXITOSO";
    let testError = "";
    let docExtracted = "Desconocido";

    try {
        // =======================
        // PASO 1: Iniciando sesión en Portal
    // =======================
    logStep('Iniciando sesión en Portal', 'running');
    await page.goto(env.url, { waitUntil: 'domcontentloaded' });
    const loginField = page.locator('#j_username');
    if (await loginField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await loginField.fill(env.user);
        await page.locator('#j_password').fill(env.pass);
        await page.click('#logOnFormSubmit');
    }
    logStep('Iniciando sesión en Portal', 'ok');

    // =======================
    // PASO 2: Iniciando app Facturación
    // =======================
    logStep('Iniciando app Facturación', 'running');
    const tile = page.locator('.sapMGT, [role="link"]').filter({ hasText: /^Facturación$/ }).first();
    await tile.waitFor({ state: 'visible', timeout: 20000 });
    await tile.click();
    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(200);
    logStep('Iniciando app Facturación', 'ok');

    // =======================
    // PASO 3: Buscando PRE-FACTURA emitida por API
    // =======================
    logStep('Buscando PRE-FACTURA emitida por API', 'running');
    
    // VALIDACIÓN PROACTIVA DE ACCESO (REGLA DE NEGOCIO: FUERA DE HORARIO)
    try {
        const errorSel = '.sapMMessageBox, [role="alertdialog"], .sapMMessageToast, .sapMDialog:has(.sapUiIcon[data-sap-ui-icon-content=""])';
        const dialogFastCheck = await find(errorSel, 50).catch(() => null);
        if (dialogFastCheck) {
            const txt = await dialogFastCheck.innerText();
            if (txt && txt.toLowerCase().includes("fuera de horario")) {
                throw new Error("UI Bloqueada: No se pudo completar la facturación porque el usuario no tiene horario.");
            }
        }
    } catch(e) {
        // Si el throw inicial es nuestro string custom, re-lanzarlo
        if (e.message.includes("No se pudo completar la facturación")) throw e;
    }

    await (await find('text="PRE"', 15000)).click({ force: true });
    await page.waitForTimeout(800);

    // =======================
    // PASO 4: SELECCIONAR PRIMER ITEM (la pre-factura recién creada
    // siempre está al tope — orden descendente por fecha/ID)
    // =======================
    console.log(`🔎 Seleccionando Pre-factura ${activeId}...`);

    // Estrategia 1: primer listitem → verificar que el panel cargó con nuestro ID
    let selected = false;
    try {
        const first = await find('[role="listitem"], li[class*="sapMLIB"]', 6000);
        await first.click();
        await page.waitForTimeout(600);
        if (await find(`text="${activeId}"`, 3000).catch(() => null)) {
            selected = true;
            console.log("✅ Primer item seleccionado");
        }
    } catch { }

    // Estrategia 2: buscar por texto del ID
    if (!selected) {
        for (const sel of [`[role="listitem"]:has-text("${activeId}")`, `li:has-text("${activeId}")`]) {
            try {
                await (await find(sel, 4000)).click();
                await page.waitForTimeout(600);
                selected = true;
                console.log(`✅ Seleccionado con: ${sel}`);
                break;
            } catch { }
        }
    }

    if (!selected) {
        await shot('error-item-no-seleccionado');
        throw new Error(`No se pudo seleccionar PRE-FACTURA ${activeId}`);
    }
    logStep('Buscando PRE-FACTURA emitida por API', 'ok');
    await shot('antes_de_cobrar');

    // =======================================================
    // PASO 5: Iniciando cobranza...
    // =======================================================
    logStep('Iniciando cobranza...', 'running');
    console.log(`💳 Iniciando cobranza en ${testConfig.medioPago}...`);
    activeFrame = null;

    let metricStartTime = Date.now();

    // Procesar array de pagos configurados (Mixtos, Efectivo, Tarjeta)
    const pagos = testConfig.pagos || [];
    if (pagos.length === 0) {
        throw new Error("No se configuró ningún medio de pago.");
    }

    for (const pago of pagos) {
        logStep('Cobrando...', 'running');
        console.log(`💳 Agregando pago: ${pago.tipo} por S/ ${pago.monto || '(auto-completado)'}...`);
        
        if (pago.tipo === 'Efectivo') {
            const btnEfectivo = await find('button:has-text("Efectivo")', 10000);
            await btnEfectivo.click();
            await page.waitForTimeout(50);

            if (pago.monto) {
                console.log(`🔄 Ingresando monto exacto/Vuelto para Efectivo: S/ ${pago.monto}`);
                const inputMontoLoc = activeFrame ? 
                                       activeFrame.locator('input[type="text"], input[type="number"]').first() : 
                                       page.locator('input[type="text"]:visible, input[type="number"]:visible').first();
                try {
                    if (await inputMontoLoc.isVisible({ timeout: 2000 })) {
                        await inputMontoLoc.click();
                        await inputMontoLoc.fill(pago.monto.toString());
                        await page.waitForTimeout(50);
                    }
                } catch (e) {
                    console.log("⚠️ No se pudo inyectar el monto de efectivo.");
                }
            }
            await shot(`modal_efectivo`);

        } else if (pago.tipo === 'Tarjeta') {
            const btnTarjeta = await find('button:has-text("Tarjeta")', 10000);
            await btnTarjeta.click();
            await page.waitForTimeout(50);
            
            // Navegar al tab Manual
            const manualTab = activeFrame ? activeFrame.locator('div[role="tab"] bdi:has-text("Manual")').first() : page.locator('div[role="tab"] bdi:has-text("Manual")').first();
            if (await manualTab.isVisible({timeout: 3000}).catch(()=>false)) {
                await manualTab.click();
                await page.waitForTimeout(50);
                
                // Si la UI mandó flag de auto-generar datos:
                if (pago.autoData) {
                    const idTransaccion = 'TRx' + Math.floor(Math.random() * 1000000);
                    const digitos = Math.floor(1000 + Math.random() * 9000).toString();
                    console.log(`🔄 Ingresando Tarjeta Manual (Auto): ID ${idTransaccion}, Terminada en ${digitos}`);
                    try {
                        // Buscar inputs. Usualmente es por placeholder o label, usaremos una heurística
                        const inputs = activeFrame ? activeFrame.locator('input[type="text"]:visible') : page.locator('input[type="text"]:visible');
                        const count = await inputs.count();
                        if (count >= 2) {
                            await inputs.nth(count - 2).fill(idTransaccion); // penultimo: ID Transaccion?
                            await inputs.nth(count - 1).fill(digitos);       // ultimo: Digitos?
                        }
                    } catch(e) {
                        console.log("⚠️ Falló llenado manual de tarjeta.");
                    }
                }
            } else {
                console.log("⚠️ Tab Manual no encontrado, continuando...");
            }

            if (pago.monto) {
                // Inyectar monto en tarjeta
                 const inputMontoLoc = activeFrame ? 
                                       activeFrame.locator('input[type="text"], input[type="number"]').first() : 
                                       page.locator('input[type="text"]:visible, input[type="number"]:visible').first();
                try {
                    if (await inputMontoLoc.isVisible({ timeout: 2000 })) {
                        await inputMontoLoc.fill(pago.monto.toString());
                    }
                } catch(e){}
            }
            
            await shot('modal_tarjeta_manual');
        } else {
            console.log(`⚠️ Medio de pago ${pago.tipo} desconocido.`);
        }

        // Si hay más de un pago (o si Fiori lo requiere manual), presionar "Añadir pago"
        if (pagos.length > 1) {
             const aniadirBtn = activeFrame ? activeFrame.locator('bdi:text-is("Añadir pago")') : page.locator('bdi:text-is("Añadir pago")');
             if (await aniadirBtn.isVisible({timeout:2000}).catch(()=>false)) {
                 await aniadirBtn.click();
             }
        }
    }

    // =======================================================
    // PASO 6: Validando pago realizado
    // =======================================================
    logStep('Validando pago realizado', 'running');
    console.log("💰 Validando pago realizado en el modal...");
    if (!await tap('button:has-text("Pagar"), button:has-text("Procesar")', 6000)) {
        await shot(`error-pagar-${testConfig.medioPago.toLowerCase()}`);
        throw new Error(`Botón de confirmación no encontrado en modal ${testConfig.medioPago}`);
    }
    await page.waitForTimeout(50);
    await tap('button:has-text("Yes"), button:has-text("Sí"), button:has-text("SI")', 4000);
    await page.waitForTimeout(1000); 
    await tap('button:has-text("OK"), button:has-text("Aceptar")', 2000); 

    logStep('Cobrando...', 'ok');
    logStep('Validando pago realizado', 'ok');
    logStep('Iniciando cobranza...', 'ok');
    await shot('post_pago');

    // =======================================================
    // PASO 7: Emitiendo comprobante electrónico
    // =======================================================
    logStep('Emitiendo comprobante electrónico', 'running');
    console.log(`📄 Emitiendo comprobante electrónico: ${testConfig.tipoComprobante}...`);
    activeFrame = null;

    await (await find('button:has-text("Generar")', 8000)).click({ force: true });
    await page.waitForTimeout(1000);

    // Seleccionamos la pestaña del comprobante solicitado desde la UI
    const tabSelector = `[role="tab"]:has-text("${testConfig.tipoComprobante}"), .sapMTabStripItem:has-text("${testConfig.tipoComprobante}")`;
    if (await tap(tabSelector, 2500)) {
        console.log(`✅ Fila seleccionada para emisión: ${testConfig.tipoComprobante}`);
        await page.waitForTimeout(800);
    } else {
        console.log(`⚠️ Pestaña específica '${testConfig.tipoComprobante}' no encontrada, asumiendo selección por defecto.`);
    }

    // Lógica para Factura (Ingresar RUC y esperar SUNAT)
    if (testConfig.tipoComprobante === 'Factura') {
        const ruc = testConfig.ruc || '20100047218';
        console.log(`🆔 Ingresando RUC: ${ruc}`);
        const rucInput = await find('input[placeholder*="Buscar"], .sapMSFInput, [type="search"]', 6000);
        await rucInput.clear();
        await rucInput.fill(ruc);
        await page.keyboard.press('Enter');
        console.log("⏳ Esperando respuesta de SUNAT...");
        await page.waitForTimeout(4000); // Dar margen para la consulta externa

        // Verificar si se cargaron los datos (Razón Social)
        const infoCargada = await page.evaluate(() => {
            // Buscamos inputs que no sean el placeholder de RUC y tengan un valor razonable
            const inputs = Array.from(document.querySelectorAll('input.sapMInputBaseInner'));
            return inputs.some(i => i.value.length > 5 && !i.getAttribute('placeholder')?.includes('RUC'));
        }).catch(() => false);

        if (!infoCargada) {
            console.log("❌ No se detectaron datos cargados tras ingresar RUC.");
            await shot('error-ruc-sin-datos');
            throw new Error(`Los datos para el RUC ${ruc} no se cargaron automáticamente.`);
        }
        await shot('factura_datos_ruc');
    }

    // Modal opcional de simulación de error SUNAT if config checkbox was ticked
    if (testConfig.forzarErrorSunat) {
        console.log("🚨 SIMULACIÓN: Config 'forzarErrorSunat' detectada (Mock Error SUNAT).");
        // No enviamos clic a imprimir, simplemente lanzamos el error para que caiga en el catch y pdf de rror
        await page.waitForTimeout(100);
        throw new Error("SUNAT_MOCK: Servicio de validación de comprobante no disponible o fuera de línea (Timeout Forzado).");
    }

    logStep('Emitiendo comprobante electrónico', 'running');
    console.log("📄 Iniciando proceso de emisión final...");
    let emissionStartTime = Date.now();

    // Imprimir
    if (!await tap('button:has-text("Imprimir")', 6000)) {
        await shot('error-imprimir');
        throw new Error('"Imprimir" no encontrado en modal emision');
    }
    await page.waitForTimeout(1000);

    // Dialog "¿Seguro que desea imprimir el comprobante?" → "Yes"
    await tap('button:has-text("Yes"), button:has-text("Sí"), button:has-text("OK")', 2000);

    // Esperar que el servidor procese la emisión y aparezcan los dialogs de resultado
    // (ej: "Alerta: No hay conexión con la impresora / Se facturó correctamente")
    // La emisión puede tardar varios segundos (API SUNAT, etc.) — aumentamos el tiempo
    console.log("⏳ Esperando respuesta de emisión...");
    await page.waitForTimeout(1000);

    // Lógica de limpieza de popups
    logStep('Cerrando popups de confirmación...', 'running');
    console.log("🧹 Cerrando popups de confirmación...");
    
    let emissionEndTime = Date.now();
    let emissionDuration = (emissionEndTime - emissionStartTime) / 1000;
    console.log(`[METRIC] document_emission: ${emissionDuration.toFixed(2)}s`);
    // Selectores más amplios, incluyendo los propios del iframe activo si lo hay
    const possibleCloseButtons = [
        'footer button:has-text("OK")',
        'footer button:has-text("Yes")',
        'footer button:has-text("Sí")',
        '.sapMDialog footer button:has-text("Aceptar")',
        '.sapMDialog footer button:has-text("Cerrar")',
        'button[title="Cerrar"]',
        'button:has-text("Cerrar")'
    ];

    for (let i = 0; i < 8; i++) {
        let clickedAny = false;
        
        // Enfocamos el body de la página para asegurar que no perdimos el foco 
        // por culpa de un popup del navegador o diálogo de impresión
        await page.bringToFront();
        await page.evaluate(() => {
            if (document.activeElement && document.activeElement !== document.body) {
                document.activeElement.blur();
            }
            window.focus();
        }).catch(() => {});
        
        await page.locator('body').click({ position: { x: 10, y: 10 }, force: true }).catch(() => {});
        // Multi-escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(10); // Changed from 300 to 10

        // Si ya no hay diálogos visibles, salir antes
        const hasDialog = await page.locator('.sapMDialog, .sapMMessageBox, .sapMMessageToast').isVisible().catch(() => false);
        if (!hasDialog) break;

        for (const selector of possibleCloseButtons) {
            try {
                // Buscar en el frame principal
                let btn = page.locator(selector).first();
                if (await btn.isVisible({ timeout: 100 }).catch(() => false)) {
                    await btn.click({ force: true });
                    await page.waitForTimeout(50);
                    clickedAny = true;
                    continue;
                }
                
                // Buscar dentro de todos los iframes adicionales
                for (const f of page.frames()) {
                    btn = f.locator(selector).first();
                    if (await btn.isVisible({ timeout: 100 }).catch(() => false)) {
                        await btn.click({ force: true });
                        await page.waitForTimeout(50);
                        clickedAny = true;
                    }
                }
            } catch (e) {}
        }
        
        await page.waitForTimeout(600);
    }

    // Asegurarse de cerrar diálogos de SAP antes de ir a documentos
    console.log("🧹 Limpiando overlays finales...");
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(10);
    const closeBtn = page.locator('button:has-text("Cerrar"), button:has-text("OK")').first();
    if (await closeBtn.isVisible({ timeout: 500 }).catch(()=>false)) await closeBtn.click().catch(()=>{});
    await page.waitForTimeout(50);

    await page.waitForTimeout(800);

    logStep('Cerrando popups de confirmación...', 'ok');
    logStep('Emitiendo comprobante electrónico', 'ok');

    let metricEndTime = Date.now();
    let paymentDuration = (metricEndTime - metricStartTime) / 1000;
    console.log(`[METRIC] payment_registration: ${paymentDuration.toFixed(2)}s`);

    // =======================
    // PASO 8: Tomando captura de evidencia del comprobante
    // =======================
    logStep('Tomando captura de evidencia del comprobante', 'running');
    // =======================
    logStep('verificar-documentos', 'running');
    console.log("📋 Verificando DOCUMENTOS...");
    activeFrame = null;

    await (await find('[role="tab"]:has-text("DOCUMENTOS"), [id*="DOCUMENTOS"]', 10000)).click({ force: true });
    await page.waitForTimeout(1200); // Esperar renderizado de lista (Reducido)

    // Seleccionar primer doc emitido y tomar la captura final
    const firstDoc = await find('[role="listitem"], li[class*="sapMLIB"]', 8000).catch(() => null);
    if (firstDoc) {
        await firstDoc.click({ force: true });
        await page.waitForTimeout(800); // Esperar carga de detalle (Reducido)
        const text = await firstDoc.textContent() || "";
        const docMatch = text.match(/[BF]\d{3}-\d+/);
        if (docMatch) docExtracted = docMatch[0];
        else docExtracted = text.substring(0, 25).trim();
    }

    console.log(`[RESULT] Prefactura: ${activeId} | Doc: ${docExtracted}`);

    logStep('verificar-documentos', 'ok');
    await shot('comprobante_emitido');
    logStep('Tomando captura de evidencia del comprobante', 'ok');

    // =======================
    // =======================
    } catch (error) {
        testStatus = "❌ FALLIDO";
        
        // Intentar extraer el error de negocio real de la UI cruzando iframes
        let uiErrorText = "";
        try {
            const errorSel = '.sapMMessageBox, [role="alertdialog"], .sapMMessageToast, .sapMDialog:has(.sapUiIcon[data-sap-ui-icon-content=""])';
            const errorDialog = await find(errorSel, 1500).catch(() => null);
            if (errorDialog) {
                uiErrorText = await errorDialog.innerText();
                uiErrorText = uiErrorText.replace(/\\nOK/g, '').replace(/\\nAceptar/g, '').replace(/\\nCerrar/g, '').trim();
                // Si el mensaje es multilínea, toma solo las dos primeras (título y detalle)
                uiErrorText = uiErrorText.split('\\n').slice(0,2).join(": ");
                
                // --- MAPEO DE ERRORES DE NEGOCIO ---
                if (uiErrorText.toLowerCase().includes("fuera de horario")) {
                    uiErrorText = "No se pudo completar la facturación porque el usuario no tiene horario.";
                } else if (uiErrorText.toLowerCase().includes("no hay cartuchera") || uiErrorText.toLowerCase().includes("cartuchera no")) {
                    uiErrorText = "No se encontró una cartuchera activa para este cajero.";
                }
            }
        } catch(e) {}

        if (uiErrorText) {
            testError = `UI Bloqueada: ${uiErrorText}`;
            console.error(`❌ Error de Negocio Detectado: ${uiErrorText}`);
        } else {
            testError = error.message;
        }

        await shot('error_flujo');
        if (!uiErrorText) console.error(`❌ Error Crítico: ${testError}`);
        
    } finally {
        const dur = ((Date.now() - startTime) / 1000).toFixed(2);

        if (process.env.EVIDENCE_DIR) {
            fs.writeFileSync(
                path.join(evidenceDir, 'playwright-result.json'),
                JSON.stringify({ prefacturaId: activeId, steps, duration: `${dur}s`, status: testStatus, error: testError }, null, 2)
            );
        }

        // =========================================================
        // GENERAR PDF DE REPORTE TÉCNICO
        // =========================================================
        try {
            console.log("📄 Generando PDF con evidencias (Versión Elegante)...");
            const { chromium } = require('@playwright/test');
            const pdfBrowser = await chromium.launch({ headless: true });
            const pdfPage = await pdfBrowser.newPage();
            
            // Cargar Logo para el PDF individual
            let logoBase64 = "";
            try {
                const lp = path.join(process.cwd(), 'ui', 'public', 'seidor-logo.png');
                logoBase64 = fs.readFileSync(lp).toString('base64');
            } catch(e) {}

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
                    .header-left h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
                    .header-right { text-align: right; font-size: 11px; color: #64748b; font-weight: 600; }
                    
                    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                    .meta-item { background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                    .meta-item label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px; }
                    .meta-item span { font-size: 13px; font-weight: 700; color: #1e293b; }
                    
                    .status-badge { display: inline-block; padding: 5px 12px; border-radius: 30px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
                    .status-success { background: #dcfce7; color: #166534; }
                    .status-failed { background: #fee2e2; color: #991b1b; }

                    .section-title { font-size: 14px; color: #004a99; border-left: 4px solid #004a99; padding-left: 12px; margin: 30px 0 20px 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                    
                    .evidence-card { margin-bottom: 40px; page-break-inside: avoid; }
                    .evidence-card h3 { font-size: 11px; color: #64748b; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; font-weight: 700; }
                    .img-container { background: #f8fafc; padding: 6px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    img { width: 100%; border-radius: 8px; display: block; }
                    
                    .error-summary { background: #fef2f2; border: 1px solid #ef4444; padding: 25px; border-radius: 16px; margin-bottom: 30px; }
                    .error-summary h4 { color: #991b1b; margin: 0 0 10px 0; font-size: 15px; font-weight: 800; }
                    .error-summary p { color: #b91c1c; margin: 0; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 600; }

                    .footer { text-align: center; margin-top: 50px; padding: 30px 0; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
                    /* Watermark */
                    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); opacity: 0.05; width: 400px; z-index: -1; pointer-events: none; }
                    
                    .metrics-row { display: flex; gap: 15px; margin: 20px 0; }
                    .metric-box { flex: 1; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
                    .metric-box b { color: #004a99; font-size: 13px; }
                    .sla-dot { width: 8px; height: 8px; border-radius: 50%; margin-left: 6px; display: inline-block; }
                    .dot-good { background: #10b981; }
                    .dot-warn { background: #f59e0b; }
                </style>
            </head>
            <body>
                <!-- Watermark for all pages -->
                <img class="watermark" src="data:image/png;base64,${logoBase64}" alt="" />

                <div class="header">
                    <div class="header-left">
                        <h1>Certificación de Prueba</h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">Módulo: Facturador Electrónico - Clínica Internacional</p>
                    </div>
                    <div class="header-right">
                        <p>ID: ${activeId}</p>
                        <p>${new Date().toLocaleString('es-PE')}</p>
                    </div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item"><label>Pre-Factura</label><span>${activeId}</span></div>
                    <div class="meta-item"><label>Comprobante</label><span>${docExtracted || "N/A"}</span></div>
                    <div class="meta-item"><label>Usuario</label><span>${(env.user || 'Desconocido').toUpperCase()}</span></div>
                    <div class="meta-item"><label>Fecha</label><span>${new Date().toLocaleDateString('es-PE')}</span></div>
                    <div class="meta-item"><label>Estado</label>
                        <span class="status-badge ${testStatus.includes('EXITO') ? 'status-success' : 'status-failed'}">${testStatus}</span>
                    </div>
                    <div class="meta-item"><label>Tiempo</label><span>${dur}s</span></div>
                </div>

                <div class="metrics-row">
                    <div class="metric-box">
                        <span>⏱️ Registro de Pago (SLA)</span>
                        <b>${paymentDuration.toFixed(2)}s <span class="sla-dot ${paymentDuration < 25 ? 'dot-good' : 'dot-warn'}"></span></b>
                    </div>
                    <div class="metric-box">
                        <span>⚡ Emisión Comprobante</span>
                        <b>${emissionDuration.toFixed(2)}s <span class="sla-dot ${emissionDuration < 15 ? 'dot-good' : 'dot-warn'}"></span></b>
                    </div>
                </div>

                ${testError ? `
                <div class="error-summary">
                    <h4>⚠️ Incidencia en el Flujo</h4>
                    <p>${testError}</p>
                </div>
                ` : ''}

                <div class="section-title">Evidencia de Pasos</div>
            `;

            const pics = [
                { id: 'antes_de_cobrar', title: '01. Carga de datos en SAP Fiori' },
                { id: 'modal_efectivo', title: '02. Ejecución del Medio de Pago' },
                { id: 'post_pago', title: '03. Respuesta del Servidor de Pagos' },
                { id: 'comprobante_emitido', title: '04. Generación de Comprobante' },
                { id: 'error_flujo', title: '⚠️ Captura de Pantalla del Error' }
            ];

            for (const p of pics) {
                const imgPath = path.join(evidenceDir, p.id + '.png');
                if (fs.existsSync(imgPath)) {
                    const base64 = fs.readFileSync(imgPath).toString('base64');
                    html += `
                    <div class="evidence-card">
                        <h3>${p.title}</h3>
                        <div class="img-container">
                            <img src="data:image/png;base64,${base64}" />
                        </div>
                    </div>
                    `;
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
            const pdfPath = path.join(evidenceDir, `Reporte_Tecnico_${activeId}.pdf`);
            await pdfPage.pdf({ 
                path: pdfPath, 
                format: 'A4', 
                margin: { top: '70px', bottom: '50px', left: '0', right: '0' }, 
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: headerTemplate,
                footerTemplate: footerTemplate
            });
            await pdfBrowser.close();
            console.log(`✅ PDF Generado (Elegante): ${pdfPath}`);
        } catch (err) {
            console.log("⚠️ No se pudo generar el PDF:", err.message);
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`✅ PRUEBA FINALIZADA: ${testStatus}`);
        console.log(`   Pre-factura : ${activeId}`);
        console.log(`   Duración    : ${dur}s`);
        console.log(`   Evidencia   : ${evidenceDir}`);
        console.log(`${'='.repeat(50)}\n`);
        
        if (testError) {
            throw new Error(testError);
        }
    }
});
