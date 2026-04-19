const { test, expect } = require('@playwright/test');

test('test', async ({ page }) => {
  await page.goto('https://ao1k9k5jk.accounts.ondemand.com/oauth2/authorize?client_id=2fad98f3-610b-4304-bf84-83187c448577&response_type=code&redirect_uri=https%3A%2F%2Fmedifarma-portal-qa-63shgxes.authentication.us10.hana.ondemand.com%2Flogin%2Fcallback%2Fsap.custom&state=GjyPSJaN47&code_challenge=LlfRnFlFNdyZrV6e9F2KPwhEgribp7MCEUh8SaztQp8&code_challenge_method=S256&scope=email+openid+profile&nonce=-hPZRtXZoutT');
  await page.locator('html').click();
  await expect(page.getByRole('textbox', { name: 'Correo electrónico o nombre' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('PIERRE.GALVEZ@SEIDOR.COM');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Pavilion23711.26');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).dblclick();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Pavilion2371126.@');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('link', { name: 'Registro de Manufactura' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('progressbar', { name: 'Espere' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('textbox', { name: 'Lote' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('textbox', { name: 'Lote' }).fill('2040196');
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('button', { name: 'Ir' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('gridcell', { name: '1020' }).click();
});