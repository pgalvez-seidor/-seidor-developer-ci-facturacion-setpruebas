import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://ao1k9k5jk.accounts.ondemand.com/oauth2/authorize?client_id=2fad98f3-610b-4304-bf84-83187c448577&response_type=code&redirect_uri=https%3A%2F%2Fmedifarma-portal-qa-63shgxes.authentication.us10.hana.ondemand.com%2Flogin%2Fcallback%2Fsap.custom&state=yKceN8bbZv&code_challenge=ADw9QR3WHBPXGvhrvc_iY1XbGp3aZm3GYk8GGFGTGVY&code_challenge_method=S256&scope=email+openid+profile&nonce=M9ATDsXJWSW9');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('pierre.galvez@seidor.com');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Pavilion2371126.@');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('link', { name: 'Auditoría Ingresar' }).click();
  await page.getByRole('button', { name: 'Logotipo de SAP' }).click();
  await page.getByRole('link', { name: 'Gestion de Usuarios Externos' }).click();
});