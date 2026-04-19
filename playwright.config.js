// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    timeout: 180000,          // 3 minutos por test (SAP BTP es lento)
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
            args: ['--lang=es-PE']  // Fuerza idioma a nivel del proceso Chromium
        },
    },
    workers: 1,               // Por defecto 1 worker (se controla desde el servidor)
    retries: 0,
});
