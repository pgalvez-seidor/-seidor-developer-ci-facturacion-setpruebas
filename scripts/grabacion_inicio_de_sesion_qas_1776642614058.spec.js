const { test, expect } = require("@playwright/test");
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

  await page.goto("https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas");
  await shot('navegacion_1');
  await page.locator('input[type="email"], input[type="text"]').first().fill("pierre.galvez@seidor.com");
  await page.locator('input[type="password"]').first().fill("Pavilion2371126.@");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  if (page.url().includes('where_to') || await page.locator('text=/Where To/i').isVisible().catch(() => false)) {
    await page.goto('https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/site/portalqas');
  await shot('navegacion_2');
  await page.waitForLoadState('networkidle').catch(() => {});
  }
  await page.getByRole('link', { name: 'Registro de Manufactura' }).click();
  await shot('accion_3');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByRole('textbox', { name: 'Lote' }).click();
  await shot('accion_4');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByRole('textbox', { name: 'Lote' }).fill('2040196');

  const iframeLocator = page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame();
  const irButton = iframeLocator.getByRole('button', { name: 'Ir' });
  const gridCellLocator = iframeLocator.getByRole('gridcell'); // Selector para verificar si hay resultados en la tabla

  let attempts = 0;
  const maxAttempts = 3;
  let resultsFound = false;

  while (attempts < maxAttempts && !resultsFound) {
    attempts++;
    console.log(`Intento ${attempts} de hacer clic en el botón 'Ir'.`);
    await irButton.click();

    // Esperar a que los indicadores de carga desaparezcan dentro del iframe
    await iframeLocator.waitForSelector('.sapMBusyIndicator,.sapUiLocalBusyIndicator,.sapMBlockLayer',
      { state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500); // Pequeña espera después del indicador de carga

    // Verificar si los resultados (celdas de la tabla) son visibles
    const firstGridCell = gridCellLocator.first();
    resultsFound = await firstGridCell.isVisible().catch(() => false);

    if (!resultsFound && attempts < maxAttempts) {
      console.log(`No se encontraron resultados después del intento ${attempts}. Reintentando en 2 segundos...`);
      await page.waitForTimeout(2000); // Esperar 2 segundos antes del siguiente intento
    } else if (resultsFound) {
      console.log(`Resultados encontrados después del intento ${attempts}.`);
    } else {
      console.log(`No se encontraron resultados después de ${maxAttempts} intentos. El script continuará.`);
    }
  }
  await shot('accion_5'); // Captura de pantalla después de intentar cargar los resultados

  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByRole('button', { name: 'Ir' }).click();
  await shot('accion_6');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByRole('gridcell', { name: '1020' }).click();
  await shot('accion_7');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByRole('gridcell', { name: 'Navegación' }).click();
  await shot('accion_8');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByLabel('Opciones de selección').click();
  await shot('accion_9');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByText('1', { exact: true }).click();
  await shot('accion_10');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByRole('button', { name: 'Confirmar' }).click();
  await shot('accion_11');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().locator('[id="__box7-__table5-0"]').click();
  await shot('accion_12');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByRole('textbox', { name: 'Ingrese el motivo de' }).click();
  await shot('accion_13');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByRole('textbox', { name: 'Ingrese el motivo de' }).fill('aaa');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByRole('button', { name: 'Confirmar' }).click();
  await shot('accion_14');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().locator('[id="__box7-__table5-0"]').click();
  await shot('accion_15');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByRole('row', { name: 'EVITAR EL INGRESO AL AREA DE' }).getByLabel('Opciones').click();
  await shot('accion_16');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByText('Historial por paso').click();
  await shot('accion_17');
  await page.locator('iframe[title="Aplicación"], iframe[title="Application"]').first().contentFrame().getByLabel('Historial por paso - EVITAR').getByRole('button', { name: 'Cerrar' }).click();
  await shot('accion_18');
  await page.getByRole('button', { name: 'Logotipo de SAP' }).click();
  await shot('accion_19');
  await page.getByRole('button', { name: 'Perfil de Pierre Galvez' }).click();
  await shot('accion_20');
  await page.getByText('Salir').click();
  await shot('accion_21');
  await page.getByRole('button', { name: 'OK' }).click();
  await shot('accion_22');
  await page.goto('https://medifarma-portal-qa-63shgxes.cpp.cfapps.us10.hana.ondemand.com/logoff.html?siteAlias=portalqas&sap-language=es-ES');
  await shot('navegacion_23');
  await shot('resultado_final');
});