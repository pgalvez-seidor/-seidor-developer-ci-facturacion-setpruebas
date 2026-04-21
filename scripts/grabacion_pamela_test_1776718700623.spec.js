const { test, expect } = require('@playwright/test');

test('test', async ({ page }) => {
  // --- Helper de capturas automáticas (inyectado por AutoBot) ---
  const _fs = require('fs');
  const _path = require('path');
  const _evidenceDir = process.env.EVIDENCE_DIR || _path.join(__dirname, '..', 'evidence');
  if (!_fs.existsSync(_evidenceDir)) _fs.mkdirSync(_evidenceDir, { recursive: true });
  let _shotN = 0;
  const shot = async (label) => {
    await page.waitForTimeout(600);
    await page.waitForSelector('.sapMBusyIndicator,.sapUiLocalBusyIndicator,.sapMBlockLayer',
      { state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(300);
    const _name = String(++_shotN).padStart(2,'0') + '_' + label.replace(/[^a-zA-Z0-9_-]/g,'_');
    const _p = _path.join(_evidenceDir, _name + '.png');
    await page.screenshot({ path: _p, fullPage: true });
    console.log('📸 ' + _name + '.png');
  };
  // --- Fin helper ---

  const portalUrl = 'https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas#Shell-home';
  await page.goto(portalUrl);
  await shot('navegacion_1');

  // Login SAP IAS (Normalizado)
  await page.locator('input[type="email"], input[type="text"]').first().fill('pierre.galvez@seidor.com');
  await page.locator('input[type="password"]').first().fill('Pavilion2371126.@');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});

  // SAP BTP a veces muestra "Where To?" post-login — recargar resuelve
  if (page.url().includes('where_to') || await page.locator('text=/Where To/i').isVisible().catch(() => false)) {
    await page.goto(portalUrl);
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  await page.getByRole('link', { name: 'Registro de Manufactura' }).click();
  await shot('accion_1');

  const frameHandle = await page.waitForSelector('iframe[title="Aplicación"]');
  const frame = await frameHandle.contentFrame();
  if (!frame) throw new Error('No se pudo acceder al contenido del iframe');
  
  const loteField = frame.getByRole('textbox', { name: 'Lote' });
  
  // 1. Foco y escritura secuencial (simula cadencia humana para el binding)
  await loteField.focus();
  await loteField.pressSequentially('2040196', { delay: 50 });
  
  // 2. Presionar Enter en el campo (a menudo dispara la búsqueda en UI5)
  await loteField.press('Enter');
  
  // 3. Forzar el blur (pérdida de foco) para gatillar el Data Binding
  await loteField.blur();
  
  // 4. Pausa táctica para que el Event Bus de UI5 procese el modelo
  await page.waitForTimeout(500);
  
  // Debug: Verificar si el valor sigue ahí
  const val = await loteField.inputValue();
  console.log(`🔍 Valor en campo Lote antes de Ir: "${val}"`);
  
  console.log('🚀 Ejecutando búsqueda con estrategia de enfoque + teclado...');
  const btnIr = frame.locator('button').filter({ hasText: /^Ir$/ }).first();
  
  // Asegurar foco y disparar vía teclado (más confiable para SAP si el clic visual falla)
  await btnIr.focus();
  await page.waitForTimeout(500);
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  
  // ESPERA DE 2 SEGUNDOS solicitada por el usuario para dejar que SAP reaccione
  console.log('⏳ Esperando 2 segundos para que SAP procese la búsqueda...');
  await page.waitForTimeout(2000);
  
  // Clic físico de respaldo (solo si no ha empezado a cargar)
  if (!await frame.locator('.sapUiLocalBusyIndicator').isVisible()) {
    await btnIr.click({ force: true, delay: 100 }).catch(() => {});
  }
  
  // Esperar a que aparezca y desaparezca el indicador de carga de SAP
  await frame.locator('.sapUiLocalBusyIndicator').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await frame.locator('.sapUiLocalBusyIndicator').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  
  await shot('accion_2');

  await frame.getByRole('gridcell', { name: '1020' }).click();
  await shot('accion_3');

  await frame.getByRole('gridcell', { name: 'Navegación' }).click();
  await shot('accion_4');

  await frame.getByLabel('Opciones de selección').click();
  await frame.getByText('1', { exact: true }).click();
  await frame.getByRole('button', { name: 'Confirmar' }).click();
  await shot('accion_5');

  await frame.locator('[id="__box7-__table5-5"]').click();
  await shot('accion_6');

  await page.getByRole('button', { name: 'Perfil de Pierre Galvez' }).click();
  await page.locator('[id="__list0-5-logoutBtn-img"]').click();
  await page.getByRole('button', { name: 'OK' }).click();
  await shot('resultado_final');
});