// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');
const os = require('os');

module.exports = defineConfig({
    timeout: 180000,          // 3 minutos por test (SAP BTP es lento)
    outputDir: path.join(os.tmpdir(), 'autobot-test-results'),
    expect: {
        timeout: 15000,       // 15s para assertions
    },
    use: {
        actionTimeout: 30000,
        navigationTimeout: 60000,
        video: 'off',
        screenshot: 'off',
        locale: 'es-PE',
        timezoneId: 'America/Lima',
        extraHTTPHeaders: {
            'Accept-Language': 'es-PE,es;q=0.9,en;q=0.1'
        },
        launchOptions: {
            args: ['--lang=es-PE', '--no-sandbox'],
        },
    },
    workers: 1,               // Por defecto 1 worker (se controla desde el servidor)
    retries: 0,
});
