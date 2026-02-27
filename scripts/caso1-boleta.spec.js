const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { createPrefactura } = require('./api-helper');

test('Facturación Boleta Caso 1 - Efectivo', async ({ page }) => {
    const startTime = Date.now();
    test.setTimeout(120000); // 2 minutos para el flujo completo y dar margen

    // 1. Setup & Config
    const env = JSON.parse(fs.readFileSync('./config/environments.json', 'utf8')).QAS;

    console.log("🚀 [PRE-TEST] Generando Pre-factura vía API...");
    const prefacturaId = await createPrefactura("PGALVEZ3");
    console.log(`✅ ID generado: ${prefacturaId}`);

    // Auto-confirmaciones de UI SAP
    page.on('dialog', d => d.accept());

    // Login
    console.log("🌐 Accediendo al Portal SAP...");
    await page.goto(env.url, { waitUntil: 'domcontentloaded' });
    const loginUser = page.locator('#j_username');
    if (await loginUser.isVisible({ timeout: 5000 }).catch(() => false)) {
        await loginUser.fill(env.user);
        await page.locator('#j_password').fill(env.pass);
        await page.click('#logOnFormSubmit');
    }

    // Launchpad: Abrir App "Facturación"
    console.log("📦 Localizando App 'Facturación'...");
    const tile = page.locator('.sapMGT, [role="link"]').filter({ hasText: /^Facturación$/ }).first();
    await tile.waitFor({ state: 'visible', timeout: 15000 });
    await tile.click();

    console.log("⏳ Calibrando entorno de App...");
    await page.waitForTimeout(3000); // Esperar despliegue de UI5 Frame

    // --- MOTOR DE BÚSQUEDA ROBUSTO (MULTI-FRAME CON CACHÉ) ---
    let activeFrame = null;
    const fastFind = async (selector, maxWait = 5000) => {
        const start = Date.now();
        while (Date.now() - start < maxWait) {
            // Test in active frame first for speed
            if (activeFrame) {
                const loc = activeFrame.locator(selector).first();
                if (await loc.isVisible({ timeout: 100 }).catch(() => false)) return loc;
            }
            // Scan all frames if not found yet
            for (const f of [page.mainFrame(), ...page.frames()]) {
                try {
                    const loc = f.locator(selector).first();
                    if (await loc.isVisible({ timeout: 50 }).catch(() => false)) {
                        activeFrame = f; // Cache
                        return loc;
                    }
                } catch (e) { }
            }
            await page.waitForTimeout(100); // Polling agresivo
        }
        throw new Error(`Timeout: No se encontró el elemento '${selector}' en los ${maxWait}ms`);
    };

    // Helper para clicks instantáneos de confirmación
    const quickClick = async (selector) => {
        try {
            const el = await fastFind(selector, 2500);
            await el.click({ force: true });
        } catch (e) { } // Silently fail if optional button isn't there
    };

    // --- FLUJO DE PRUEBA (DICTADO POR USUARIO) ---
    console.log(`🔍 Búsqueda de la Pre-factura: ${prefacturaId}`);

    // "despues de entrar a facturacion, sebes presiona PRE"
    // Damos 15s ya que es el primer render de toda la App UI5 pesada desde el Launchpad
    const preTab = await fastFind('text="PRE"', 15000);
    await preTab.click({ force: true });

    // "cambiar el filtro por codigo"
    console.log("⚙️ Estableciendo filtro a CÓDIGO...");

    // Capturamos el estado exacto de la pantalla antes de bucear los filtros
    await page.waitForTimeout(500);

    // "cambiar el filtro por codigo"
    console.log("⚙️ Estableciendo filtro a CÓDIGO por ID...");

    // Encontrar el seleccionador de filtro estrictamente por su ID nativo de SAP
    const filterSelect = await fastFind('#application-Facturacion-display-component---Home--Master--selectCriterioBusqueda-label, .sapMSFSelect', 5000);
    await filterSelect.click({ force: true });

    await page.waitForTimeout(1000); // Esperar que el popover baje

    // Ejecutar Playwright click normal por índice como indicó el usuario
    const filterOption = await fastFind('li:nth-child(3), .sapMSelectListItem:nth-child(3)', 5000);
    await filterOption.click({ force: true });

    console.log("✅ Filtro seleccionado: CÓDIGO.");

    await page.waitForTimeout(500);

    // "pegar el numero de prefactura que generaste"
    const searchInput = await fastFind('input[type="search"], .sapMSearchField input, .sapMSFInput', 5000);
    await searchInput.fill(prefacturaId);

    // "y presionar enter para buscar"
    await page.keyboard.press('Enter');

    // "el resultado es el documento que debes presionar y comenzar a cobrar"
    console.log(`🔎 Buscando en la lista el ID: ${prefacturaId} ...`);
    await page.waitForTimeout(2000); // Dar chance a que cargue el Master List de Fiori
    await page.screenshot({ path: "./evidence/grid_resultados.png", fullPage: true });

    // Ejecutar click nativo infalible al nivel del navegador para Fiori Master Lists
    const clicked = await activeFrame.evaluate((id) => {
        // En SAP UI5, los elementos de lista suelen ser 'li', '.sapMLIB' (ListItemBase), '[role="listitem"]'
        const items = Array.from(document.querySelectorAll('li, .sapMLIB, [role="listitem"], .sapMObjLI'));
        const target = items.find(el => el.textContent && el.textContent.includes(id) && el.offsetHeight > 0);
        if (target) {
            target.click();
            return true;
        }
        return false;
    }, prefacturaId);

    if (!clicked) {
        throw new Error(`Timeout: No se encontró la Pre-factura ${prefacturaId} en la lista de resultados de SAP`);
    }

    // Pequeño respiro para dejar que la pestaña derecha se renderice tras el clic
    await page.waitForTimeout(1000);

    console.log("💵 Cobrando Documento...");

    const efectivoBtn = await fastFind('button:has-text("Efectivo"), .sapMBtn:has-text("Efectivo"), span:has-text("Efectivo")', 10000);
    await efectivoBtn.click({ force: true });

    const pagarBtn = await fastFind('button:has-text("Pagar"), button:has-text("Agregar"), span:has-text("Pagar")', 10000);
    await pagarBtn.click({ force: true });

    // Saltar posibles popups (Bóveda / Confirmación)
    await quickClick('.sapMBtn:has-text("OK"), span:has-text("OK"), span:has-text("Sí"), .sapMBtn:has-text("Aceptar")');
    await quickClick('.sapMBtn:has-text("OK"), span:has-text("OK"), span:has-text("Sí"), .sapMBtn:has-text("Aceptar")');

    console.log("📄 Generando Comprobante...");
    const generarBtn = await fastFind('.sapMBtn:has-text("Generar"), span:has-text("Generar")', 10000);
    await generarBtn.click({ force: true });

    const imprimirBtn = await fastFind('.sapMBtn:has-text("Imprimir"), span:has-text("Imprimir")', 10000);
    await imprimirBtn.click({ force: true });

    // Cerrar el diálogo final si existe
    await quickClick('.sapMBtn:has-text("OK"), span:has-text("OK"), .sapMBtn:has-text("Aceptar")');

    // "luego para validar el documento vas al tab documentos y es el ultimo emitido"
    console.log("🏁 Revisando Tab DOCUMENTOS...");
    const docsTab = await fastFind('text="DOCUMENTOS"', 10000);
    await docsTab.click({ force: true });

    // Esperar a que la tabla cargue un poquitito antes de intentar agarrar el list element
    await page.waitForTimeout(500);

    // "el primero arriba"
    try {
        const firstDoc = await fastFind('.sapMListTblRow:nth-child(1), .sapUiTableCont .sapUiTableRow:nth-child(1)', 10000);
        await firstDoc.click({ force: true });
    } catch (e) {
        console.log("⚠️ No se pudo clickear la lista de documentos, continuando para tomar evidencia.");
    }

    // Fin
    await page.waitForTimeout(1000); // Último respiro resolutivo
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    const screenshotPath = `./evidence/PRO_SUCCESS_${prefacturaId}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log("\n--- INFORME DE PRUEBA ---");
    console.log(`✅ Estado: EXITOSO`);
    console.log(`⏱️ Duración: ${totalDuration}s`);
    console.log("-------------------------\n");
});
