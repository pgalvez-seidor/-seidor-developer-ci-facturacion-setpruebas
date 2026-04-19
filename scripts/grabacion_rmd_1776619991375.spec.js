const { test, expect } = require('@playwright/test');

test('test', async ({ page }) => {
  await page.goto('https://ao1k9k5jk.accounts.ondemand.com/oauth2/authorize?client_id=2fad98f3-610b-4304-bf84-83187c448577&response_type=code&redirect_uri=https%3A%2F%2Fmedifarma-portal-qa-63shgxes.authentication.us10.hana.ondemand.com%2Flogin%2Fcallback%2Fsap.custom&state=OEB8JKqfrJ&code_challenge=mN4_3I0-yUZRFaytzN7NCTYpN95LgCwOaNgbCdA8DcY&code_challenge_method=S256&scope=email+openid+profile&nonce=en7w9pZExIPt');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('pierre.galvez@seidor.com');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Pavilion2371126.@');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await page.goto('https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas#Shell-home');
  await page.getByRole('link', { name: 'Registro de Manufactura' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('textbox', { name: 'Lote' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('textbox', { name: 'Lote' }).fill('2040196');
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('button', { name: 'Ir' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('gridcell', { name: '1020' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('gridcell', { name: 'Navegación' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByLabel('Opciones de selección').click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByText('1', { exact: true }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('button', { name: 'Confirmar' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().locator('[id="__box7-__table5-4"]').click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('textbox', { name: 'Ingrese el motivo de' }).fill('ok');
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('button', { name: 'Confirmar' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().locator('[id="__box7-__table5-4"]').click();
});