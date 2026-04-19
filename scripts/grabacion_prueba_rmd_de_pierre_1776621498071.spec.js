const { test, expect } = require('@playwright/test');

test('test', async ({ page }) => {
  await page.goto('https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas');
  await page.locator('html').click();
  await expect(page.getByRole('textbox', { name: 'Correo electrónico o nombre' })).toBeVisible();
  await page.locator('input[type="email"], input[type="text"]').first().fill('PIERRE.GALVEZ@SEIDOR.COM');
  await page.locator('input[type="password"]').first().fill('Pavilion23711.26');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('textbox', { name: 'Contraseña' }).dblclick();
  await page.locator('input[type="password"]').first().fill('Pavilion23711.26');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('link', { name: 'Registro de Manufactura' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('progressbar', { name: 'Espere' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('textbox', { name: 'Lote' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('textbox', { name: 'Lote' }).fill('2040196');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('button', { name: 'Ir' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('gridcell', { name: '1020' }).click();
});