const { test, expect } = require('@playwright/test');

test('test', async ({ page }) => {
  await page.goto('https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas');
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
  await page.locator('input[type="password"]').first().fill('Pavilion2371126.@');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).dblclick();
  await page.getByRole('textbox', { name: 'Correo electrónico o nombre' }).fill('');
});