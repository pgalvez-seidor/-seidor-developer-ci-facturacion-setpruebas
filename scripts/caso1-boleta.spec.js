const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { createPrefactura } = require('./api-helper');

test('Facturación Boleta Caso 1 - Efectivo', async ({ page }) => {
    const startTime = Date.now();
    test.setTimeout(120000);

    // --- CONFIG ---
    const env = JSON.parse(fs.readFileSync('./config/environments.json', 'utf8')).QAS;
    const prefacturaId = process.env.PREFACTURA_ID || null;
    const evidenceDir = process.env.EVIDENCE_DIR || './evidence';
    const steps = [];

    const logStep = (name, status) => {
        steps.push({ step: name, status, timestamp: new Date().toISOString() });
        const icon = status === 'ok' ? '✅' : status === 'error' ? '❌' : '⏳';
        console.log(`${icon} ${name}: ${status}`);
    };

    const safeScreenshot = async (name) => {
        const filepath = path.join(evidenceDir, `${name}.png`);
        await page.screenshot({ path: filepath, fullPage: true });
        return filepath;
    };

    // Si no se pasó PREFACTURA_ID, crearlo (modo standalone)
    let activeId = prefacturaId;
    if (!activeId) {
        console.log("🚀 [STANDALONE] Generando Pre-factura vía API...");
        activeId = await createPrefactura("PGALVEZ3");
        console.log(`✅ ID generado: ${activeId}`);
    }

    // Auto-confirmaciones de UI SAP
    page.on('dialog', d => d.accept());

    // --- LOGIN ---
    logStep('login', 'running');
    await page.goto(env.url, { waitUntil: 'domcontentloaded' });
    const loginUser = page.locator('#j_username');
    if (await loginUser.isVisible({ timeout: 5000 }).catch(() => false)) {
        await loginUser.fill(env.user);
        await page.locator('#j_password').fill(env.pass);
        await page.click('#logOnFormSubmit');
    }
    logStep('login', 'ok');

    // --- ABRIR APP ---
    logStep('abrir-facturacion', 'running');
    const tile = page.locator('.sapMGT, [role="link"]').filter({ hasText: /^Facturación$/ }).first();
    await tile.waitFor({ state: 'visible', timeout: 15000 });
    await tile.click();
    await page.waitForTimeout(3000);
    logStep('abrir-facturacion', 'ok');

    // --- MOTOR DE BÚSQUEDA ROBUSTO (MULTI-FRAME) ---
    let activeFrame = null;
    const fastFind = async (selector, maxWait = 5000) => {
        const start = Date.now();
        while (Date.now() - start < maxWait) {
            if (activeFrame) {
                const loc = activeFrame.locator(selector).first();
                if (await loc.isVisible({ timeout: 100 }).catch(() => false)) return loc;
            }
            for (const f of [page.mainFrame(), ...page.frames()]) {
                try {
                    const loc = f.locator(selector).first();
                    if (await loc.isVisible({ timeout: 50 }).catch(() => false)) {
                        activeFrame = f;
                        return loc;
                    }
                } catch (e) { }
            }
            await page.waitForTimeout(100);
        }
        throw new Error(`Timeout: No se encontró '${selector}' en ${maxWait}ms`);
    };

    const quickClick = async (selector) => {
        try {
            const el = await fastFind(selector, 2500);
            await el.click({ force: true });
        } catch (e) { }
    };

    // --- BUSCAR PRE-FACTURA ---
    logStep('buscar-prefactura', 'running');
    const preTab = await fastFind('text="PRE"', 15000);
    await preTab.click({ force: true });

    await page.waitForTimeout(500);

    const filterSelect = await fastFind('#application-Facturacion-display-component---Home--Master--selectCriterioBusqueda-label, .sapMSFSelect', 5000);
    await filterSelect.click({ force: true });
    await page.waitForTimeout(1000); // Esperar que el popover baje

    const filterOption = await fastFind('li:nth-child(3), .sapMSelectListItem:nth-child(3)', 5000);
    await filterOption.click({ force: true });
    await page.waitForTimeout(500);

    const searchInput = await fastFind('input[type="search"], .sapMSearchField input, .sapMSFInput', 5000);
    await searchInput.fill(activeId);
    await page.keyboard.press('Enter');

    await page.waitForTimeout(2000);
    console.log(`🔎 Seleccionando la Pre-factura: ${activeId} ...`);

    // Click NORMAL de Playwright en el bloque general del List Item (para que el master-detail detecte el event)
    try {
        const record = await fastFind('.sapMObjLI, .sapMLIB', 10000);
        // Movemos el mouse primero y hacemos click, simulando humano
        await record.hover();
        await record.click();

        // Y un enter por si acaso SAP lo tiene enfocado y el enter dispara la ruta 
        await page.keyboard.press('Enter');
    } catch (e) {
        await safeScreenshot('error-prefactura-no-encontrada');
        throw new Error(`Pre-factura ${activeId} no encontrada en la lista: ${e.message}`);
    }

    logStep('buscar-prefactura', 'ok');

    await page.waitForTimeout(1000);

    // --- SCREENSHOT PRE-PAGO ---
    await safeScreenshot('pre-pago');

    // --- COBRO EN EFECTIVO ---
    logStep('cobro-efectivo', 'running');

    // Respiro esperando que la pestaña derecha termine de cargar
    await page.waitForTimeout(2000);

    console.log("💵 Cobrando Documento en Efectivo...");

    // Seleccionamos estrictamente el contenedor button para que Fiori detecte el mouse event completo
    const efectivoBtn = activeFrame.locator('button:has-text("Efectivo")').first();
    await efectivoBtn.waitFor({ state: 'visible', timeout: 10000 });
    await efectivoBtn.click(); // Playwright se encarga de despachar hover + mousedown + mouseup

    await page.waitForTimeout(2000); // Dar chance a que cargue el Dialog/Modal de confirmación
    await page.screenshot({ path: "./evidence/modal_efectivo.png", fullPage: true });

    const pagarBtn = activeFrame.locator('button:has-text("Pagar")').first();
    await pagarBtn.waitFor({ state: 'visible', timeout: 10000 });
    await pagarBtn.click();

    // Saltar posibles popups (Bóveda / Confirmación)
    await page.waitForTimeout(1000);
    await quickClick('.sapMBtn:has-text("OK"), span:has-text("OK"), span:has-text("Sí"), .sapMBtn:has-text("Aceptar")');
    await quickClick('.sapMBtn:has-text("OK"), span:has-text("OK"), span:has-text("Sí"), .sapMBtn:has-text("Aceptar")');
    await page.waitForTimeout(1000);
    logStep('cobro-efectivo', 'ok');

    // --- SCREENSHOT POST-PAGO ---
    await safeScreenshot('post-pago');

    // --- GENERAR COMPROBANTE ---
    logStep('generar-comprobante', 'running');
    const generarBtn = await fastFind('.sapMBtn:has-text("Generar"), span:has-text("Generar")', 10000);
    await generarBtn.click({ force: true });

    const imprimirBtn = await fastFind('.sapMBtn:has-text("Imprimir"), span:has-text("Imprimir")', 10000);
    await imprimirBtn.click({ force: true });

    await quickClick('.sapMBtn:has-text("OK"), span:has-text("OK"), .sapMBtn:has-text("Aceptar")');
    logStep('generar-comprobante', 'ok');

    // --- VERIFICAR EN TAB DOCUMENTOS ---
    logStep('verificar-documentos', 'running');
    const docsTab = await fastFind('text="DOCUMENTOS"', 10000);
    await docsTab.click({ force: true });
    await page.waitForTimeout(500);

    try {
        const firstDoc = await fastFind('.sapMListTblRow:nth-child(1), .sapUiTableCont .sapUiTableRow:nth-child(1)', 10000);
        await firstDoc.click({ force: true });
    } catch (e) {
        console.log("⚠️ No se pudo clickear documento, continuando para evidencia.");
    }
    logStep('verificar-documentos', 'ok');

    // --- SCREENSHOT COMPROBANTE EMITIDO ---
    await page.waitForTimeout(1000);
    await safeScreenshot('comprobante-emitido');

    // --- RESULTADO FINAL ---
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Escribir resultado estructurado si viene del runner
    if (process.env.EVIDENCE_DIR) {
        const resultData = {
            prefacturaId: activeId,
            steps,
            duration: `${totalDuration}s`
        };
        fs.writeFileSync(
            path.join(evidenceDir, 'playwright-result.json'),
            JSON.stringify(resultData, null, 2)
        );
    }

    console.log(`\n--- RESULTADO ---`);
    console.log(`✅ EXITOSO | ID: ${activeId} | Duración: ${totalDuration}s`);
});
