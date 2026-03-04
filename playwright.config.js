// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    timeout: 180000,          // 3 minutos por test (SAP BTP es lento)
    expect: {
        timeout: 15000,       // 15s para assertions
    },
    use: {
        actionTimeout: 30000, // 30s por acción (click, fill, etc.)
        navigationTimeout: 60000, // 60s para navegaciones
        video: 'off',
        screenshot: 'off',
    },
    workers: 1,               // Por defecto 1 worker (se controla desde el servidor)
    retries: 0,
});
