const { test, expect } = require('@playwright/test');

test('test', async ({ page }) => {
  await page.goto('https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas');
  await page.locator('input[type="email"], input[type="text"]').first().fill('pierre.galvez@seidor.com');
  await page.locator('input[type="password"]').first().fill('Pavilion2371126.@');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('main').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByText('Gestion de UsuariosIngresarAdministracionAbre en una nueva ventanaAuditorí').click();
  await page.getByRole('link', { name: 'Registro de Manufactura' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('textbox', { name: 'Lote' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('textbox', { name: 'Lote' }).fill('2040196');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('button', { name: 'Ir' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('button', { name: 'Ir' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('gridcell', { name: '3003' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('gridcell', { name: 'Navegación' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByLabel('Opciones de selección').click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByText('1', { exact: true }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('button', { name: 'Confirmar' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().locator('[id="__box7-__table5-0"]').click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('textbox', { name: 'Ingrese el motivo de' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('textbox', { name: 'Ingrese el motivo de' }).fill('no quiero');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().getByRole('button', { name: 'Confirmar' }).click();
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"], iframe[title="Anwendung"]').first().contentFrame().locator('[id="__box7-__table5-0"]').click();
});