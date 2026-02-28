const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const env = JSON.parse(fs.readFileSync('./config/environments.json', 'utf8')).QAS;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto(env.url, { waitUntil: 'networkidle' });
    await page.fill('#j_username', env.user);
    await page.fill('#j_password', env.pass);
    await page.click('#logOnFormSubmit');
    await page.waitForSelector('.sapMGT', { timeout: 30000 });
    
    // Clic en Horario Supervisor
    const tile = page.locator('.sapMGT').filter({ hasText: /Horario Supervisor/ }).first();
    await tile.click();
    await page.waitForTimeout(5000); // Dar tiempo al app
    
    for (const f of [page.mainFrame(), ...page.frames()]) {
        try {
            const html = await f.evaluate(() => {
                const el = Array.from(document.querySelectorAll('span, div, input, button')).find(x => x.textContent.includes('Seleccione Área') || (x.placeholder && x.placeholder.includes('Área')));
                return el ? el.outerHTML : null;
            });
            if (html) {
                console.log(`✅ Elemento encontrado en frame ${f.url()}:`);
                console.log(html);
                break;
            }
        } catch(e) {}
    }
    
    await browser.close();
})();
