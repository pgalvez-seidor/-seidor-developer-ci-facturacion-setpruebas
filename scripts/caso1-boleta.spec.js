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

    if (testConfig.medioPago === 'Efectivo') {
        const btnEfectivo = await find('button:has-text("Efectivo")', 10000);
        await btnEfectivo.click();
        console.log("✅ Modal de Efectivo abierto");
        await page.waitForTimeout(1000);

        // Si se configuró cobrar CON VUELTO, ingresamos un monto alto (p.ej S/ 1000)
        // El input del monto por defecto tiene el total exacto enfocado
        if (testConfig.conVuelto) {
            console.log("🔄 ConfigVuelto=ON: Ingresando monto para provocar vuelto...");
            // Localizamos el control de input dentro del modal de efectivo activo
            const inputMontoLoc = activeFrame ? 
                                   activeFrame.locator('input[type="text"], input[type="number"]').first() : 
                                   page.locator('input[type="text"]:visible, input[type="number"]:visible').first();
            try {
                if (await inputMontoLoc.isVisible({ timeout: 2000 })) {
                    await inputMontoLoc.click();
                    await inputMontoLoc.fill('1000.00');
                    await page.waitForTimeout(500);
                }
            } catch (e) {
                console.log("⚠️ No se pudo inyectar el monto de vuelto, procediendo con monto exacto.");
            }
        }
        await shot(`modal_${testConfig.medioPago.toLowerCase()}`);

    } else if (testConfig.medioPago === 'Tarjeta') {
        const btnTarjeta = await find('button:has-text("Tarjeta")', 10000);
        await btnTarjeta.click();
        console.log("✅ Modal de Tarjeta abierto");
        await shot('modal_tarjeta');
        
        // La tarjeta usualmente requiere seleccionar el tipo de tarjeta (Visa, MC)
        // y el terminal (POS). Ajustar según el Fiori real.
        // Haremos click en los dropdowns por defecto.
        try {
            // Seleccionar primer terminal POS si existe el dropdown
            await tap('.sapMSelect:has(span:has-text("Terminal"))', 2000);
            await tap('.sapMSelectList li:nth-child(2)', 2000);
            
            // Seleccionar primer operador de tarjeta (Visa/MC)
            await tap('.sapMSelect:has(span:has-text("Operador"))', 2000);
            await tap('.sapMSelectList li:nth-child(2)', 2000);
        } catch(e) {
            console.log("⚠️ Saltando selects de POS/Tarjeta, quizá no sean obligatorios.");
        }
    } else {
        throw new Error(`Medio de pago ${testConfig.medioPago} no soportado en script dinámico.`);
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
        
        if (!clickedAny) {
            // Un escape más fuerte si no reaccionó a botones
            await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(600);
    }

    // Dar un tiempo extra y asegurarse que desaparezca la caparazón de overlays
    await page.waitForTimeout(2000);

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

    await (await find('[role="tab"]:has-text("DOCUMENTOS"), [id*="DOCUMENTOS"]', 8000)).click({ force: true });
    await page.waitForTimeout(600);

    // Seleccionar primer doc emitido y tomar la captura final
    const firstDoc = await find('[role="listitem"], li[class*="sapMLIB"]', 5000).catch(() => null);
    if (firstDoc) {
        await firstDoc.click({ force: true });
        await page.waitForTimeout(500);
    }

    logStep('verificar-documentos', 'ok');
    await shot('comprobante_emitido');

    // =======================
    // RESULTADO FINAL
    // =======================
    } catch (error) {
        testStatus = "❌ FALLIDO";
        testError = error.message;
        await shot('error_flujo');
        console.log(`🛑 Prueba falló: ${testError}`);
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
            console.log("📄 Generando PDF con evidencias...");
            const { chromium } = require('@playwright/test');
            // Lanzamos un browser headless temporal solo para imprimir el documento
            const pdfBrowser = await chromium.launch({ headless: true });
            const pdfPage = await pdfBrowser.newPage();
            
            let html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                        h1 { color: #005587; border-bottom: 2px solid #005587; padding-bottom: 10px; }
                        .step { margin-bottom: 40px; page-break-inside: avoid; }
                        img { max-width: 100%; border: 1px solid #ccc; border-radius: 4px; box-shadow: 2px 2px 10px rgba(0,0,0,0.1); margin-top: 10px; }
                        .meta { background: #f8fafc; padding: 15px; border-radius: 5px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                        .error-box { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 5px; color: #b91c1c; margin-bottom: 30px; }
                    </style>
                </head>
                <body>
                    <h1>Reporte Técnico - SetPruebas CI</h1>
                    <h2>Configuración de Escenario Dinámico</h2>
                    <div class="meta">
                        <p><strong>ID Pre-Factura:</strong> ${activeId}</p>
                        <p><strong>Comprobante:</strong> ${testConfig.tipoComprobante}</p>
                        <p><strong>Medio de Pago:</strong> ${testConfig.medioPago}</p>
                        <p><strong>Retorno de Vuelto:</strong> ${testConfig.conVuelto ? 'Forzado' : 'Natural'}</p>
                        <hr style="border: 0; border-top: 1px dashed #ccc; margin: 10px 0;">
                        <p><strong>Duración:</strong> ${dur} segundos | <strong>Fecha:</strong> ${new Date().toLocaleString('es-PE')}</p>
                        <p><strong>Estado:</strong> ${testStatus}</p>
                    </div>
                        <p><strong>Pre-Factura ID:</strong> ${activeId}</p>
                        <p><strong>Duración del flujo:</strong> ${dur} segundos</p>
                        <p><strong>Fecha de ejecución:</strong> ${new Date().toLocaleString('es-PE')}</p>
                        <p><strong>Estado:</strong> ${testStatus}</p>
                        <p><strong>Descripción:</strong> Flujo automatizado sin intervención manual que ingresa un pago en efectivo y emite el documento electrónico.</p>
                    </div>
                    ${testError ? `<div class="error-box"><strong>Error en ejecución:</strong> ${testError}</div>` : ''}
                    <h2>Evidencias Fotográficas</h2>
            `;

            const pics = [
                { id: 'antes_de_cobrar', title: '1. Antes del Cobro (Detalle de pre-factura cargado)' },
                { id: 'modal_efectivo', title: '2. Modal de Pago (Monto ingresado)' },
                { id: 'post_pago', title: '3. Posterior al Pago (Efectivo registrado)' },
                { id: 'comprobante_emitido', title: '4. Comprobante Emitido (Verificación en tab Documentos)' },
                { id: 'error_flujo', title: '🔴 Error de Flujo (Captura de pantalla al fallar el test)' }
            ];

            for (const p of pics) {
                const imgPath = path.join(evidenceDir, p.id + '.png');
                if (fs.existsSync(imgPath)) {
                    const base64 = fs.readFileSync(imgPath).toString('base64');
                    html += `
                    <div class="step">
                        <h3>${p.title}</h3>
                        <img src="data:image/png;base64,${base64}" />
                    </div>
                    `;
                }
            }
            
            html += `</body></html>`;
            
            await pdfPage.setContent(html, { waitUntil: 'networkidle' });
            const pdfPath = path.join(evidenceDir, `Reporte_Tecnico_${activeId}.pdf`);
            await pdfPage.pdf({ path: pdfPath, format: 'A4', margin: { top: '20px', bottom: '20px' } });
            await pdfBrowser.close();
            console.log(`✅ PDF Generado: ${pdfPath}`);
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
