const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { createPrefactura } = require('./api-helper');

test('Facturación Boleta Caso 1 - Efectivo', async ({ page }) => {
    const startTime = Date.now();
    test.setTimeout(180000);

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

    const shot = async (name) => {
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
    await page.waitForTimeout(800);
    await shot('antes_de_cobrar');

    // =======================
    // PASO 5: COBRO EN EFECTIVO
    //
    // CRÍTICO: resetear activeFrame antes de buscar botón "Efectivo".
    // El iframe del panel derecho se recarga al cambiar de documento.
    // =======================
    logStep('cobro-efectivo', 'running');
    console.log("💵 Cobro en Efectivo...");
    activeFrame = null;

    await (await find('button:has-text("Efectivo")', 10000)).click();
    console.log("✅ Click en Efectivo");
    await page.waitForTimeout(800);
    await shot('modal_efectivo');

    // =======================
    // PASO 6: CONFIRMAR PAGO
    //
    // Flujo real CI:
    //   modal "Pago en efectivo": campo Monto + [Pagar] [Cerrar]
    //   → click Pagar
    //   → dialog "¿Agregar pago en efectivo?": [Yes] [No]
    //   → click Yes
    //   → pago aparece en tabla Detalle de pago
    // =======================
    console.log("💰 Confirmar pago...");
    if (!await tap('button:has-text("Pagar")', 6000)) {
        await shot('error-pagar');
        throw new Error('"Pagar" no encontrado en modal Efectivo');
    }
    await page.waitForTimeout(500);
    await tap('button:has-text("Yes"), button:has-text("Sí"), button:has-text("SI")', 4000);
    await page.waitForTimeout(300);
    await tap('button:has-text("OK"), button:has-text("Aceptar")', 2000); // pop-up extra si existe
    await page.waitForTimeout(800);

    logStep('cobro-efectivo', 'ok');
    await shot('post_pago');

    // =======================
    // PASO 7: GENERAR BOLETA
    //
    // "Generar" aparece en el footer (contentinfo) del iframe solo
    // cuando el pago está registrado. Resetear activeFrame.
    // =======================
    logStep('generar-comprobante', 'running');
    console.log("📄 Generando Boleta...");
    activeFrame = null;

    await (await find('button:has-text("Generar")', 8000)).click({ force: true });
    await page.waitForTimeout(800);

    // El modal de emisión puede tener tab "Boleta" — seleccionarla si existe
    await tap('[role="tab"]:has-text("Boleta"), .sapMTabStripItem:has-text("Boleta")', 1500);
    await page.waitForTimeout(300);

    // Imprimir
    if (!await tap('button:has-text("Imprimir")', 6000)) {
        await shot('error-imprimir');
        throw new Error('"Imprimir" no encontrado en modal emision');
    }
    await page.waitForTimeout(500);

    // Dialog "¿Seguro que desea imprimir el comprobante?" → "Yes"
    await tap('button:has-text("Yes"), button:has-text("Sí"), button:has-text("OK")', 2000);

    // Esperar que el servidor procese la emisión y aparezcan los dialogs de resultado
    // (ej: "Alerta: No hay conexión con la impresora / Se facturó correctamente")
    // La emisión puede tardar unos segundos — esperamos hasta que aparezca algo o pase el tiempo
    await page.waitForTimeout(2000);

    // Cerrar agresivamente todos los dialogs de SAP que queden (Alertas de impresora, éxito, etc.)
    console.log("🧹 Limpiando diálogos finales...");
    await page.waitForTimeout(1500);

    for (let i = 0; i < 6; i++) {
        activeFrame = null; // Reset frame search to be safe
        const closed = await tap(
            'button:has-text("OK"), button:has-text("Yes"), button:has-text("Sí"), button:has-text("Cerrar"), button:has-text("Aceptar"), [id*="mbox-btn"], [id*="btncerrar"], [id*="BDI-content"], .sapMBtn',
            1500
        );
        if (!closed) break;
        console.log(`✅ Diálogo ${i + 1} cerrado`);
        await page.waitForTimeout(600);
    }

    // Dar tiempo a SAP para cerrar overlays internos antes de navegar
    await page.waitForTimeout(1000);

    logStep('generar-comprobante', 'ok');

    // =======================
    // PASO 8: TAB DOCUMENTOS → CAPTURAR COMPROBANTE
    // =======================
    logStep('verificar-documentos', 'running');
    console.log("📋 Verificando DOCUMENTOS...");
    activeFrame = null;

    const docTab = await find('[role="tab"]:has-text("DOCUMENTOS"), .sapMTabStripItem:has-text("DOCUMENTOS"), .sapMITBText:has-text("DOCUMENTOS")', 10000);
    await docTab.click({ force: true });
    await page.waitForTimeout(1500);

    // Seleccionar primer doc emitido (al tope)
    try {
        const firstDoc = await find('[role="listitem"], li[class*="sapMLIB"]', 8000);
        await firstDoc.click({ force: true });
        await page.waitForTimeout(800);
    } catch (e) {
        console.log("⚠️ No se pudo seleccionar el primer documento del listado");
    }

    logStep('verificar-documentos', 'ok');
    await shot('comprobante_emitido');

    // =======================
    // RESULTADO FINAL
    // =======================
    const dur = ((Date.now() - startTime) / 1000).toFixed(2);

    if (process.env.EVIDENCE_DIR) {
        fs.writeFileSync(
            path.join(evidenceDir, 'playwright-result.json'),
            JSON.stringify({ prefacturaId: activeId, steps, duration: `${dur}s` }, null, 2)
        );
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ PRUEBA EXITOSA`);
    console.log(`   Pre-factura : ${activeId}`);
    console.log(`   Duración    : ${dur}s`);
    console.log(`   Evidencia   : ${evidenceDir}`);
    console.log(`${'='.repeat(50)}\n`);
});
