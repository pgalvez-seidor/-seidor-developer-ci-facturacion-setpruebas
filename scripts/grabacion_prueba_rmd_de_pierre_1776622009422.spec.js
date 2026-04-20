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
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await shot('accion_2');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await shot('accion_3');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('Pavilion2371126.@');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).dblclick();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await shot('accion_4');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).dblclick();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('pierre.galvez');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).press('Alt+@');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('pierre.galvez');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).press('Alt+@');
  await page.locator('input[type="password"]').first().fill('Pavilion2371126.@');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  // SAP BTP a veces muestra "Where To?" post-login — recargar resuelve
  if (page.url().includes('where_to') || await page.locator('text=/Where To/i').isVisible().catch(() => false)) {
    await page.goto('https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas');
  await shot('navegacion_5');
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).dblclick();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('');
  await shot('resultado_final');
});