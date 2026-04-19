const { test, expect } = require('@playwright/test');

test('test', async ({ page }) => {
  await page.goto('https://ao1k9k5jk.accounts.ondemand.com/oauth2/authorize?client_id=2fad98f3-610b-4304-bf84-83187c448577&response_type=code&redirect_uri=https%3A%2F%2Fmedifarma-portal-qa-63shgxes.authentication.us10.hana.ondemand.com%2Flogin%2Fcallback%2Fsap.custom&state=U5JT3xMNCe&code_challenge=YDk7a7eVADNAFnsaJBS-L24-DiZTmLf9t5-tj07a-OM&code_challenge_method=S256&scope=email+openid+profile&nonce=KH8Tz2surf0Q');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('Pavilion2371126.@');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).dblclick();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).dblclick();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('pierre.galvez');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).press('Alt+@');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('pierre.galvez');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).press('Alt+@');
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Pavilion2371126.@');
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).dblclick();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('');
});