import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://ao1k9k5jk.accounts.ondemand.com/oauth2/authorize?client_id=2fad98f3-610b-4304-bf84-83187c448577&response_type=code&redirect_uri=https%3A%2F%2Fmedifarma-portal-qa-63shgxes.authentication.us10.hana.ondemand.com%2Flogin%2Fcallback%2Fsap.custom&state=IuMMWMJSjy&code_challenge=H4T4_UTb1s3keuoStHnV3xx8p2EMvcT_nd70JnT8YWM&code_challenge_method=S256&scope=email+openid+profile&nonce=1yIMLvU_MwJa');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('pierre.galvez@seidor.com');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Pavilion2371126.@');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('link', { name: 'Gestion de Usuarios Ingresar' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByLabel('Opciones de selección').click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByText('MANUFACTURA DIGITAL').click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().locator('[id="__item9-application-administracionSemantic-display-component---masterMenuRol--idLstResult-1"]').click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByLabel('Barra de navegación de').getByText('Usuarios').click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().locator('div').filter({ hasText: /^ZSALCEDO$/ }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().locator('div').filter({ hasText: /^salcedoz@medifarma\.com\.pe$/ }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().locator('div').filter({ hasText: /^YTORRESP$/ }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('treeitem', { name: 'Aplicaciones' }).click();
  await page.getByRole('button', { name: 'Perfil de Pierre Galvez' }).click();
  await page.getByText('Salir').click();
  await page.getByRole('button', { name: 'OK' }).click();
});