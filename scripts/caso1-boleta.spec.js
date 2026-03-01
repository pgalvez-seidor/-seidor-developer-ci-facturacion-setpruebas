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
        await page.waitForTimeout(1500); // Esperar que desaparezcan los busy indicators
        // Intentar esperar a que no haya loaders
        await page.waitForSelector('.sapMBusyIndicator, .sapUiLocalBusyIndicator', { state: 'hidden', timeout: 3000 }).catch(() => {});
        
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
        console.log("🚀 Generando Pre-factura vía API...");
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
        // PASO 1: LOGIN
    // =======================
    logStep('login', 'running');
    await page.goto(env.url, { waitUntil: 'domcontentloaded' });
    const loginField = page.locator('#j_username');
    if (await loginField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await loginField.fill(env.user);
        await page.locator('#j_password').fill(env.pass);
        await page.click('#logOnFormSubmit');
    }
    logStep('login', 'ok');

    // =======================
    // PASO 2: ABRIR APP FACTURACIÓN
    // =======================
    logStep('abrir-facturacion', 'running');
    const tile = page.locator('.sapMGT, [role="link"]').filter({ hasText: /^Facturación$/ }).first();
    await tile.waitFor({ state: 'visible', timeout: 20000 });
    await tile.click();
    await page.waitForSelector('iframe', { timeout: 15000 });
    await page.waitForTimeout(2000);
    logStep('abrir-facturacion', 'ok');

    // =======================
    // PASO 3: TAB PRE
    // =======================
    logStep('buscar-prefactura', 'running');
    
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
        throw new Error(`No se pudo seleccionar pre-factura ${activeId}`);
    }

    logStep('buscar-prefactura', 'ok');
    await shot('antes_de_cobrar');

    // =======================================================
    // PASO 5: COBRO DINÁMICO (EFECTIVO O TARJETA)
    // =======================================================
    logStep('cobro-efectivo', 'running');
    console.log(`💳 Iniciando Cobro en ${testConfig.medioPago}...`);
    activeFrame = null;

    // Procesar array de pagos configurados (Mixtos, Efectivo, Tarjeta)
    const pagos = testConfig.pagos || [];
    if (pagos.length === 0) {
        throw new Error("No se configuró ningún medio de pago.");
    }

    for (const pago of pagos) {
        console.log(`💳 Agregando pago: ${pago.tipo} por S/ ${pago.monto || '(auto-completado)'}...`);
        
        if (pago.tipo === 'Efectivo') {
            const btnEfectivo = await find('button:has-text("Efectivo")', 10000);
            await btnEfectivo.click();
            await page.waitForTimeout(500);

            if (pago.monto) {
                console.log(`🔄 Ingresando monto exacto/Vuelto para Efectivo: S/ ${pago.monto}`);
                const inputMontoLoc = activeFrame ? 
                                       activeFrame.locator('input[type="text"], input[type="number"]').first() : 
                                       page.locator('input[type="text"]:visible, input[type="number"]:visible').first();
                try {
                    if (await inputMontoLoc.isVisible({ timeout: 2000 })) {
                        await inputMontoLoc.click();
                        await inputMontoLoc.fill(pago.monto.toString());
                        await page.waitForTimeout(500);
                    }
                } catch (e) {
                    console.log("⚠️ No se pudo inyectar el monto de efectivo.");
                }
            }
            await shot(`modal_efectivo`);

        } else if (pago.tipo === 'Tarjeta') {
            const btnTarjeta = await find('button:has-text("Tarjeta")', 10000);
            await btnTarjeta.click();
            await page.waitForTimeout(500);
            
            // Navegar al tab Manual
            const manualTab = activeFrame ? activeFrame.locator('div[role="tab"] bdi:has-text("Manual")').first() : page.locator('div[role="tab"] bdi:has-text("Manual")').first();
            if (await manualTab.isVisible({timeout: 3000}).catch(()=>false)) {
                await manualTab.click();
                await page.waitForTimeout(500);
                
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
    // PASO 6: CONFIRMAR PAGO
    // =======================================================
    console.log("💰 Confirmando pago en el modal...");
    if (!await tap('button:has-text("Pagar"), button:has-text("Procesar")', 6000)) {
        await shot(`error-pagar-${testConfig.medioPago.toLowerCase()}`);
        throw new Error(`Botón de confirmación no encontrado en modal ${testConfig.medioPago}`);
    }
    await page.waitForTimeout(500);
    await tap('button:has-text("Yes"), button:has-text("Sí"), button:has-text("SI")', 4000);
    await page.waitForTimeout(1000); 
    await tap('button:has-text("OK"), button:has-text("Aceptar")', 2000); 

    logStep('cobro-efectivo', 'ok');
    await shot('post_pago');

    // =======================================================
    // PASO 7: GENERAR COMPROBANTE DINÁMICO
    // =======================================================
    logStep('generar-comprobante', 'running');
    console.log(`📄 Generando comprobante: ${testConfig.tipoComprobante}...`);
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
        await page.waitForTimeout(1000);
        throw new Error("SUNAT_MOCK: Servicio de validación de comprobante no disponible o fuera de línea (Timeout Forzado).");
    }

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
    await page.waitForTimeout(5000);

    // Fuerza bruta para cerrar todos los modales (SAP Fragments, MessageToasts, Dialogs)
    console.log("🧹 Cerrando popups y overlays (Fragments)...");
    
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
        await page.waitForTimeout(300);

        for (const selector of possibleCloseButtons) {
            try {
                // Buscar en el frame principal
                let btn = page.locator(selector).first();
                if (await btn.isVisible({ timeout: 100 }).catch(() => false)) {
                    await btn.click({ force: true });
                    await page.waitForTimeout(500);
                    clickedAny = true;
                    continue;
                }
                
                // Buscar dentro de todos los iframes adicionales
                for (const f of page.frames()) {
                    btn = f.locator(selector).first();
                    if (await btn.isVisible({ timeout: 100 }).catch(() => false)) {
                        await btn.click({ force: true });
                        await page.waitForTimeout(500);
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
    await page.waitForTimeout(300);
    const closeBtn = page.locator('button:has-text("Cerrar"), button:has-text("OK")').first();
    if (await closeBtn.isVisible({ timeout: 500 }).catch(()=>false)) await closeBtn.click().catch(()=>{});
    await page.waitForTimeout(500);

    // Dar un tiempo extra y asegurarse que desaparezca la caparazón de overlays
    await page.waitForTimeout(800);

    logStep('generar-comprobante', 'ok');

    // =======================
    // PASO 8: TAB DOCUMENTOS → CAPTURAR COMPROBANTE
    //
    // Sin ningún overlay activo, ir a DOCUMENTOS, seleccionar el primer
    // documento emitido (el más reciente aparece al tope) y capturar.
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
            
            let html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    body { font-family: 'Inter', 'Segoe UI', sans-serif; padding: 50px; color: #1e293b; background: #fff; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
                    .header-left h1 { margin: 0; color: #0f172a; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
                    .header-right { text-align: right; color: #64748b; font-size: 12px; }
                    
                    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .meta-item { background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0; }
                    .meta-item label { display: block; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
                    .meta-item span { font-size: 14px; font-weight: 600; color: #0f172a; }

                    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
                    .status-success { background: #dcfce7; color: #166534; }
                    .status-failed { background: #fee2e2; color: #991b1b; }

                    .section-title { font-size: 18px; color: #334155; border-left: 4px solid #3b82f6; padding-left: 12px; margin: 40px 0 20px 0; font-weight: 700; }
                    
                    .evidence-card { margin-bottom: 50px; page-break-inside: avoid; }
                    .evidence-card h3 { font-size: 14px; color: #475569; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9; }
                    .img-container { background: #f1f5f9; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    img { width: 100%; border-radius: 4px; display: block; }
                    
                    .error-summary { background: #fef2f2; border: 1px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
                    .error-summary h4 { color: #991b1b; margin: 0 0 10px 0; font-size: 16px; }
                    .error-summary p { color: #b91c1c; margin: 0; font-family: monospace; font-size: 13px; }

                    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-left">
                        <h1>Reporte de Certificación</h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Suite de Automatización - Facturador CI</p>
                    </div>
                    <div class="header-right">
                        <p>ID Ejecución: ${Date.now()}</p>
                        <p>${new Date().toLocaleString('es-PE')}</p>
                    </div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item"><label>Pre-Factura ID</label><span>${activeId}</span></div>
                    <div class="meta-item"><label>Comprobante</label><span>${docExtracted || "Pendiente/Error"}</span></div>
                    <div class="meta-item"><label>Estado Final</label>
                        <span class="status-badge ${testStatus.includes('EXITO') ? 'status-success' : 'status-failed'}">${testStatus}</span>
                    </div>
                    <div class="meta-item"><label>Duración</label><span>${dur} segundos</span></div>
                </div>

                ${testError ? `
                <div class="error-summary">
                    <h4>🔴 Detalle de Interrupción</h4>
                    <p>${testError}</p>
                </div>
                ` : ''}

                <div class="section-title">EVIDENCIAS FOTOGRÁFICAS</div>
            `;

            const pics = [
                { id: 'antes_de_cobrar', title: '01. CARGA DE PRE-FACTURA' },
                { id: 'modal_efectivo', title: '02. PROCESO DE PAGO' },
                { id: 'post_pago', title: '03. REGISTRO DE TRANSACCIÓN' },
                { id: 'comprobante_emitido', title: '04. VERIFICACIÓN EN TAB DOCUMENTOS' },
                { id: 'error_flujo', title: '⚠️ CAPTURA DE ERROR / INCIDENCIA' }
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
                <div class="footer">
                    Este documento es una evidencia generada automáticamente por el sistema de QA de Seidor/CI.<br>
                    © 2026 Seidor - Todos los derechos reservados.
                </div>
            </body></html>`;
            
            await pdfPage.setContent(html, { waitUntil: 'networkidle' });
            const pdfPath = path.join(evidenceDir, `Reporte_Tecnico_${activeId}.pdf`);
            await pdfPage.pdf({ path: pdfPath, format: 'A4', margin: { top: '0', bottom: '0' }, printBackground: true });
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
