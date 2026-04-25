import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://ao1k9k5jk.accounts.ondemand.com/oauth2/authorize?client_id=2fad98f3-610b-4304-bf84-83187c448577&response_type=code&redirect_uri=https%3A%2F%2Fmedifarma-portal-qa-63shgxes.authentication.us10.hana.ondemand.com%2Flogin%2Fcallback%2Fsap.custom&state=PIMD0PeuDu&code_challenge=vWQ-yx4-unof6jtRdNiujyj_R4C6TPtoFaKuFAU0Yyo&code_challenge_method=S256&scope=email+openid+profile&nonce=4CL9F4y1PIuo');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('pierre.galvez@seidor.com');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Pavilion2371126.@');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.goto('https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas#Shell-home');
  await page.getByRole('link', { name: 'Auditoría Ingresar' }).click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().locator('[id="__status1-__clone0-statusIcon"]').click();
  await page.locator('iframe[title="Aplicación"]').contentFrame().getByRole('button', { name: 'Cerrar' }).click();
  await page.getByRole('button', { name: 'Perfil de Pierre Galvez' }).click();
  await page.getByText('Salir').click();
  await page.getByRole('button', { name: 'OK' }).click();
});