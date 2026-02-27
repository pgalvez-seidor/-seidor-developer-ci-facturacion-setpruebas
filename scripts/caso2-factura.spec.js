const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { createPrefactura } = require('./api-helper');

test('Facturación Factura Caso 2 - RUC', async ({ page }) => {
    const startTime = Date.now();
    test.setTimeout(180000);

    // --- CONFIG ---
    const env = JSON.parse(fs.readFileSync('./config/environments.json', 'utf8')).QAS;
    const prefacturaId = process.env.PREFACTURA_ID || null;
    const templateName = process.env.PREFAC_TEMPLATE || 'pre-factura-caso-2';
    const ruc = process.env.RUC || '';
    const evidenceDir = process.env.EVIDENCE_DIR || './evidence';
    const steps = [];

    if (!ruc && templateName.includes('factura')) {
        throw new Error("El RUC es obligatorio para el escenario de Factura.");
    }

    const logStep = (name, status) => {
        steps.push({ step: name, status, timestamp: new Date().toISOString() });
        const icon = status === 'ok' ? '✅' : status === 'error' ? '❌' : '⏳';
        console.log(`${icon} ${name}: ${status}`);
    };

    const shot = async (name) => {
        const p = path.join(evidenceDir, `${name}.png`);
        await page.screenshot({ path: p, fullPage: true });
        console.log(`📸 ${name}.png`);
        return p;
    };

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

    const tap = async (selector, timeout = 3000) => {
        try { await (await find(selector, timeout)).click(); return true; }
        catch { return false; }
    };

    // =========================================================
    // PRE-FACTURA
    // =========================================================
    let activeId = prefacturaId;
    if (!activeId) {
        console.log(`🚀 Generando Pre-factura vía API (Template: ${templateName})...`);
        activeId = await createPrefactura("PGALVEZ3", templateName);
        console.log(`✅ ID: ${activeId}`);
    }

    page.on('dialog', d => d.accept());

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
    // PASO 4: SELECCIONAR ITEM
    // =======================
    console.log(`🔎 Seleccionando Pre-factura ${activeId}...`);
    let selected = false;
    try {
        const first = await find('[role="listitem"], li[class*="sapMLIB"]', 6000);
        await first.click();
        await page.waitForTimeout(600);
        if (await find(`text="${activeId}"`, 3000).catch(() => null)) {
            selected = true;
        }
    } catch { }

    if (!selected) {
        for (const sel of [`[role="listitem"]:has-text("${activeId}")`, `li:has-text("${activeId}")`]) {
            try {
                await (await find(sel, 4000)).click();
                await page.waitForTimeout(600);
                selected = true;
                break;
            } catch { }
        }
    }

    if (!selected) {
        await shot('error-item-no-seleccionado');
        throw new Error(`No se pudo seleccionar pre-factura ${activeId}`);
    }

    logStep('buscar-prefactura', 'ok');
    await page.waitForTimeout(800);

    // =======================
    // PASO 5: COBRO EN EFECTIVO
    // =======================
    logStep('cobro-efectivo', 'running');
    console.log("💵 Cobro en Efectivo...");
    activeFrame = null;
    await (await find('button:has-text("Efectivo")', 10000)).click();
    await page.waitForTimeout(800);
    await shot('modal_efectivo');

    // =======================
    // PASO 6: CONFIRMAR PAGO
    // =======================
    console.log("💰 Confirmar pago...");
    await tap('button:has-text("Pagar")', 6000);
    await page.waitForTimeout(500);
    await tap('button:has-text("Yes"), button:has-text("Sí"), button:has-text("SI")', 4000);
    await page.waitForTimeout(300);
    await tap('button:has-text("OK"), button:has-text("Aceptar")', 2000);
    await page.waitForTimeout(800);

    logStep('cobro-efectivo', 'ok');

    // =======================
    // PASO 7: GENERAR FACTURA
    // =======================
    logStep('generar-comprobante', 'running');
    console.log("📄 Generando Factura...");
    activeFrame = null;

    await (await find('button:has-text("Generar")', 8000)).click({ force: true });
    await page.waitForTimeout(1000);

    // Seleccionar tab Factura
    console.log("📑 Cambiando a Factura...");
    const facturaTab = await find('[role="tab"]:has-text("Factura"), .sapMTabStripItem:has-text("Factura")', 5000);
    await facturaTab.click();
    await page.waitForTimeout(1000);

    // Ingresar RUC en el campo de búsqueda
    console.log(`🆔 Ingresando RUC: ${ruc}`);
    const rucInput = await find('input[placeholder*="Buscar"], .sapMSFInput, [type="search"]', 6000);
    await rucInput.clear();
    await rucInput.fill(ruc);
    await page.keyboard.press('Enter');
    console.log("⏳ Esperando respuesta de SUNAT...");
    await page.waitForTimeout(4000); // Dar un poco más de margen para la consulta externa

    // Verificar si se cargaron los datos (Razón Social)
    // El input de Razón Social suele ser deshabilitado o de solo lectura
    const infoCargada = await page.evaluate(() => {
        // Buscar inputs que no sean el de RUC y que tengan valor
        const inputs = Array.from(document.querySelectorAll('input.sapMInputBaseInner'));
        return inputs.some(i => i.value.length > 5 && !i.getAttribute('placeholder')?.includes('RUC'));
    }).catch(() => false);

    if (!infoCargada) {
        console.log("❌ No se detectaron datos cargados tras ingresar RUC.");
        await shot('error-ruc-sin-datos');
        throw new Error(`Los datos para el RUC ${ruc} no se cargaron automáticamente.`);
    }

    await shot('factura_datos_ruc');

    // Imprimir
    console.log("🖨️ Imprimiendo...");
    await tap('button:has-text("Imprimir")', 6000);
    await page.waitForTimeout(500);
    await tap('button:has-text("Yes"), button:has-text("Sí"), button:has-text("OK")', 2000);

    await page.waitForTimeout(2000);

    // Limpiar diálogos
    console.log("🧹 Limpiando diálogos finales...");
    await page.waitForTimeout(1500);
    for (let i = 0; i < 6; i++) {
        activeFrame = null;
        const closed = await tap(
            'button:has-text("OK"), button:has-text("Yes"), button:has-text("Sí"), button:has-text("Cerrar"), button:has-text("Aceptar"), [id*="mbox-btn"], [id*="btncerrar"], [id*="BDI-content"], .sapMBtn',
            1500
        );
        if (!closed) break;
        await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1000);

    logStep('generar-comprobante', 'ok');

    // =======================
    // PASO 8: TAB DOCUMENTOS
    // =======================
    logStep('verificar-documentos', 'running');
    activeFrame = null;
    const docTab = await find('[role="tab"]:has-text("DOCUMENTOS"), .sapMTabStripItem:has-text("DOCUMENTOS")', 10000);
    await docTab.click({ force: true });
    await page.waitForTimeout(1500);

    try {
        const firstDoc = await find('[role="listitem"], li[class*="sapMLIB"]', 8000);
        await firstDoc.click({ force: true });
        await page.waitForTimeout(800);
    } catch (e) { }

    logStep('verificar-documentos', 'ok');
    await shot('comprobante_emitido');

    const dur = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ FACTURA GENERADA EN ${dur}s\n`);
});
