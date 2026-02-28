const { test, expect } = require('@playwright/test');

test('Explore Fiori Payment', async ({ page }) => {
    test.setTimeout(120000);
    
    const find = async (selector, timeout = 30000) => {
        const locator = page.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout });
        return locator;
    };

    const fs = require('fs');
    const env = JSON.parse(fs.readFileSync('./config/environments.json', 'utf8')).QAS;

    console.log("⏳ login: running");
    await page.goto(env.url);
    await page.fill('input[name="j_username"]', env.user);
    await page.fill('input[name="j_password"]', env.pass);
    await page.click('button[type="submit"]');
    console.log("✅ login: ok");

    console.log("⏳ abrir-facturacion: running");
    const tile = await find('div.sapMGT[title="Facturación de atención ambulatoria"]');
    await tile.click();
    console.log("✅ abrir-facturacion: ok");

    console.log("⏳ buscar-prefactura: running");
    const frame = await find('iframe[id="application-ZMED_SEM_HC_AMB01-manage-iframe"]');
    const contentFrame = frame.contentFrame();

    // Buscamos cualquier prefactura pendiente en la grilla PRE
    const filterInput = await contentFrame.locator('input[type="search"]').first();
    await filterInput.waitFor({ state: 'visible', timeout: 60000 });

    const gridRow = await contentFrame.locator('table.sapMListTbl tbody tr').first();
    await gridRow.waitFor({ state: 'visible', timeout: 30000 });
    await gridRow.click();
    
    const theButton = contentFrame.locator('bdi:has-text("Atender")').first();
    await theButton.waitFor({ state: 'visible', timeout: 30000 });
    await theButton.click();
    console.log("✅ buscar-prefactura: ok");

    console.log("⏳ cobro-dialog: running");
    const cobroBtn = contentFrame.locator('bdi:text-is("Cobros")').first();
    await cobroBtn.waitFor({ state: 'visible', timeout: 30000 });
    await cobroBtn.click();
    
    // Wait for the modal
    await contentFrame.getByText("Condiciones de Pago").first().waitFor({ state: 'visible', timeout: 30000 });

    // Click on Tarjeta
    const tarjetaIcon = contentFrame.locator('span[data-sap-ui-icon-content=""]').first();
    await tarjetaIcon.click();
    await page.screenshot({ path: 'evidence/explore_tarjeta_clicked.png' });
    console.log("📸 Shot: Tarjeta Tab");

    // Click on Manual Tab inside Tarjeta
    const manualTab = contentFrame.locator('div[role="tab"] bdi:has-text("Manual")').first();
    if (await manualTab.isVisible()) {
        await manualTab.click();
        await page.screenshot({ path: 'evidence/explore_tarjeta_manual.png' });
        console.log("📸 Shot: Tarjeta Manual fields");
    } else {
        console.log("⚠️ Manual tab not found");
        // Dump HTML to trace where manual is
        const html = await contentFrame.locator('section').last().innerHTML();
        fs.writeFileSync('evidence/dom_tarjeta.html', html);
    }
    
    // Switch to Efectivo, test oversized payment (Vuelto)
    const efectivoIcon = contentFrame.locator('span[data-sap-ui-icon-content=""]').first();
    await efectivoIcon.click();
    
    const numberInput = contentFrame.locator('input[type="text"]').filter({ hasText: '' }).first();
    await numberInput.fill('1000');
    
    const aniadirPago = contentFrame.locator('bdi:text-is("Añadir pago")');
    await aniadirPago.click();
    
    await page.waitForTimeout(2000); // Wait for Dialog
    await page.screenshot({ path: 'evidence/explore_vuelto_dialog.png' });
    console.log("📸 Shot: Vuelto Dialog");

    const htmlVuelto = await contentFrame.locator('body').innerHTML();
    fs.writeFileSync('evidence/dom_vuelto.html', htmlVuelto);

});
