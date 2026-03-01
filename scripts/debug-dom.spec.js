const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('Debug DOM', async ({ page }) => {
    const env = JSON.parse(fs.readFileSync('./config/environments.json', 'utf8')).QAS;
    
    await page.goto(env.url);
    await page.fill('#j_username', env.user);
    await page.fill('#j_password', env.pass);
    await page.click('#logOnFormSubmit');
    
    await page.waitForSelector('.sapMGT, [role="link"]', { timeout: 30000 });
    const tile = page.locator('.sapMGT, [role="link"]').filter({ hasText: /^Horario Supervisor$/ }).first();
    await tile.click();
    
    await page.waitForTimeout(15000); // Wait for app to load completely
    
    // Expand list if needed or just dump
    const domData = await page.evaluate(() => {
        const leftPanel = document.querySelector('section.sapMPage, .sapMSplitContainerMaster, aside') || document.body;
        const interactables = Array.from(leftPanel.querySelectorAll('input, button, div.sapUiIcon'));
        return interactables.map(el => {
            return {
                tag: el.tagName,
                id: el.id,
                className: el.className,
                placeholder: el.getAttribute('placeholder') || '',
                title: el.getAttribute('title') || '',
                text: el.innerText ? el.innerText.trim() : '',
                ariaLabel: el.getAttribute('aria-label') || '',
                iconContent: el.getAttribute('data-sap-ui-icon-content') || ''
            };
        });
    });
    
    fs.writeFileSync('dom-dump.json', JSON.stringify(domData, null, 2));
    console.log('Saved to dom-dump.json');
});
