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

  await page.goto('https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas');
  await shot('navegacion_1');
  await page.locator('html').click();
  await shot('accion_2');
  await expect(page.getByRole('textbox', { name: 'Correo electrónico o nombre' })).toBeVisible();
  await page.locator('input[type="email"], input[type="text"]').first().fill('PIERRE.GALVEZ@SEIDOR.COM');
  await page.locator('input[type="password"]').first().fill('Pavilion23711.26');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  // SAP BTP a veces muestra "Where To?" post-login — recargar resuelve
  if (page.url().includes('where_to') || await page.locator('text=/Where To/i').isVisible().catch(() => false)) {
    await page.goto('https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas');
  await shot('navegacion_3');
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  await page.getByRole('textbox', { name: 'Contraseña' }).dblclick();
  await page.locator('input[type="password"]').first().fill('Pavilion23711.26');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await shot('accion_4');
  await page.getByRole('link', { name: 'Registro de Manufactura' }).click();
  await shot('accion_5');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('progressbar', { name: 'Espere' }).click();
  await shot('accion_6');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('textbox', { name: 'Lote' }).click();
  await shot('accion_7');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('textbox', { name: 'Lote' }).fill('2040196');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('button', { name: 'Ir' }).click();
  await shot('accion_8');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('gridcell', { name: '1020' }).click();
  await shot('accion_9');
  await shot('resultado_final');
});