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
    // Buscamos el Tile con el texto EXACTO "Facturación" para evitar "Horario Supervisor" u otros
    const tile = page.locator('.sapMGT, .sapUiLightSetTile, [role="link"]').filter({ hasText: /^Facturación$/ }).first();
    await tile.waitFor({ state: 'visible', timeout: 60000 });
    await tile.click();

    console.log("⏳ Esperando cargue de la App (Iframe)...");
    // SAP Launchpad carga las apps en un iframe. Buscamos el primero que sea visible y tenga ID de aplicación.
    await page.waitForSelector('iframe[id*="application-"]', { state: 'attached', timeout: 45000 });
    const appFrame = page.frameLocator('iframe[id*="application-"]').first();

    // 5. Buscar Pre-factura
    console.log(`🔍 Buscando ID: ${prefacturaId}`);

    const searchField = appFrame.locator('input[type="search"], .sapMSFInput, [placeholder*="Buscar"]').first();
    await searchField.waitFor({ state: 'visible', timeout: 60000 });
    await searchField.fill(prefacturaId);
    await page.keyboard.press('Enter');

    // Esperar resultados y seleccionar
    const item = appFrame.locator(`text=${prefacturaId}`).first();
    await item.waitFor({ state: 'visible', timeout: 20000 });
    await item.click();

    // 6. Proceso de Cobro (Efectivo)
    console.log("💵 Procesando pago en Efectivo...");
    const efectivoBtn = appFrame.locator('button:has-text("Efectivo"), .sapMBtn:has-text("Efectivo")').first();
    await efectivoBtn.click();

    const pagarBtn = appFrame.locator('button:has-text("Pagar"), button:has-text("Agregar")').first();
    await pagarBtn.waitFor({ state: 'visible' });
    await pagarBtn.click();

    // Manejo de alertas SAP (pueden ser diálogos del sistema o del app)
    const handleDialogs = async () => {
        const btns = ['button:has-text("OK")', 'button:has-text("Aceptar")', 'button:has-text("Sí")', 'button:has-text("SÍ")'];
        for (const b of btns) {
            const loc = appFrame.locator(b).first();
            if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
                await loc.click();
                return true;
            }
        }
        return false;
    };

    for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(1000);
        await handleDialogs();
    }

    // 7. Generar Boleta
    console.log("📄 Generando Comprobante...");
    const generarBtn = appFrame.locator('button:has-text("Generar")').last();
    await generarBtn.click();

    const imprimirBtn = appFrame.locator('button:has-text("Imprimir")').first();
    await imprimirBtn.waitFor({ state: 'visible' });
    await imprimirBtn.click();

    await page.waitForTimeout(2000);
    await handleDialogs();

    // 8. Verificación Final
    console.log("🏁 Finalizando y verificando...");
    const docsTab = appFrame.locator('text=DOCUMENTOS').first();
    await docsTab.click();
    await page.waitForTimeout(5000);

    const endTime = Date.now();
    const durationCount = ((endTime - startTime) / 1000).toFixed(2);

    await page.screenshot({ path: `./evidence/success_${prefacturaId}.png`, fullPage: true });
    console.log(`✅ PRUEBA EXITOSA en ${durationCount} segundos.`);
    console.log(`📸 Evidencia guardada en: ./evidence/success_${prefacturaId}.png`);
});
