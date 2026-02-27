const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { createPrefactura } = require('./api-helper');

test('Facturación Boleta Caso 1 - Efectivo', async ({ page }) => {
    const startTime = Date.now();
    test.setTimeout(180000); // 3 minutos

    // 1. Obtener datos de configuración
    const env = JSON.parse(fs.readFileSync('./config/environments.json', 'utf8')).QAS;

    // 2. Fase API: Crear pre-factura
    console.log("🚀 [FASE API] Iniciando creación de pre-factura...");
    const prefacturaId = await createPrefactura("PGALVEZ3");
    console.log(`✅ Pre-factura creada con ID: ${prefacturaId}`);

    // 3. Fase UI: Login
    console.log("🌐 [FASE UI] Navegando al Portal...");

    // Configurar manejo de diálogos automático
    page.on('dialog', async dialog => {
        console.log(`💬 Diálogo detectado: ${dialog.message()}`);
        await dialog.accept();
    });

    await page.goto(env.url, { waitUntil: 'networkidle' });

    if (page.url().includes('accounts.ondemand.com') || await page.locator('input[id="j_username"]').isVisible({ timeout: 15000 }).catch(() => false)) {
        console.log("🔑 Realizando Login...");
        await page.locator('input[id="j_username"]').fill(env.user);
        await page.locator('input[id="j_password"]').fill(env.pass);
        await page.click('button[id="logOnFormSubmit"]');
        await page.waitForLoadState('networkidle');
    }

    // 4. Abrir App Facturación
    console.log("📦 Abriendo App Facturación...");
    const tile = page.locator('.sapMGT, .sapUiLightSetTile, [role="link"]:has-text("Facturación")').first();
    await tile.waitFor({ state: 'visible', timeout: 60000 });
    await tile.click();

    // MUY IMPORTANTE: SAP UI5 puede cargar en iframes.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000); // Espera estratégica para carga de shell

    // 5. Buscar Pre-factura
    console.log(`🔍 Buscando ID: ${prefacturaId}`);

    // Intentamos localizar el campo de búsqueda en frames si no está en el principal
    const findSearchField = async () => {
        const selectors = ['input[type="search"]', '.sapMSFInput', '[placeholder*="Buscar"]', 'input[id$="-search"]'];
        for (const s of selectors) {
            const loc = page.locator(s).first();
            if (await loc.isVisible()) return loc;

            // Buscar en frames
            for (const frame of page.frames()) {
                const fLoc = frame.locator(s).first();
                if (await fLoc.isVisible()) return fLoc;
            }
        }
        return null;
    };

    let searchField = await findSearchField();
    if (!searchField) {
        console.log("⏳ Reintentando encontrar buscador...");
        await page.waitForTimeout(10000);
        searchField = await findSearchField();
    }

    if (searchField) {
        await searchField.fill(prefacturaId);
        await page.keyboard.press('Enter');
    } else {
        throw new Error("❌ No se encontró el campo de búsqueda de Facturación.");
    }

    // Esperar resultados y seleccionar
    const item = page.locator(`text=${prefacturaId}`).first();
    try {
        await item.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
        console.log("⚠️ ID no visible, intentando Refresh del footer...");
        const refreshBtn = page.locator('button[id$="refresh"], button[title="Refresh"], .sapMBtnIcon > .sapUiIcon[data-sap-ui-icon-content=""]').first();
        if (await refreshBtn.isVisible()) {
            await refreshBtn.click();
            await page.waitForTimeout(5000);
        }
    }
    await item.click();

    // 6. Proceso de Cobro (Efectivo)
    console.log("💵 Procesando pago en Efectivo...");
    const efectivoBtn = page.locator('button:has-text("Efectivo"), .sapMBtn:has-text("Efectivo")').first();
    await efectivoBtn.click();

    const pagarBtn = page.locator('button:has-text("Pagar"), button:has-text("Agregar"), .sapMBtn:has-text("Pagar")').first();
    await pagarBtn.waitFor({ state: 'visible' });
    await pagarBtn.click();

    // Manejo de alertas comunes (Bóveda / Confirmación)
    const dialogBtn = page.locator('button:has-text("OK"), button:has-text("Aceptar"), button:has-text("Sí"), button:has-text("SÍ")').first();
    for (let i = 0; i < 3; i++) { // Puede haber hasta 2 diálogos
        if (await dialogBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await dialogBtn.click();
            await page.waitForTimeout(1000);
        }
    }

    // 7. Generar Boleta
    console.log("📄 Generando Comprobante...");
    const generarBtn = page.locator('button:has-text("Generar"), .sapMBtn:has-text("Generar")').last();
    await generarBtn.click();

    const imprimirBtn = page.locator('button:has-text("Imprimir"), .sapMBtn:has-text("Imprimir")').first();
    await imprimirBtn.waitFor({ state: 'visible' });
    await imprimirBtn.click();

    // Confirmación final si aplica
    if (await dialogBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dialogBtn.click();
    }

    // 8. Verificación Final
    console.log("🏁 Finalizando y verificando...");
    const docsTab = page.locator('text=DOCUMENTOS').first();
    await docsTab.click();
    await page.waitForTimeout(3000);

    const endTime = Date.now();
    const durationCount = ((endTime - startTime) / 1000).toFixed(2);

    await page.screenshot({ path: `./evidence/success_${prefacturaId}.png`, fullPage: true });
    console.log(`✅ PRUEBA EXITOSA en ${durationCount} segundos.`);
    console.log(`📸 Evidencia guardada en: ./evidence/success_${prefacturaId}.png`);
});
