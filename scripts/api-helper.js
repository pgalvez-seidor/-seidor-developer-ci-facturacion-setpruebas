const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');

async function createPrefactura(user, centro = "4") {
    const config = JSON.parse(fs.readFileSync('./config/api-config.json', 'utf8')).QAS;
    const template = fs.readFileSync('./templates/pre-factura-caso-1.json', 'utf8');

    // Sincronizar correlativo más reciente con git antes de leer
    try {
        console.log("🔄 Sincronizando correlativo con repositorio...");
        execSync('git pull origin HEAD --rebase', { stdio: 'ignore' });
    } catch (e) {
        console.log("⚠️ Advertencia: No se pudo hacer git pull del correlativo.");
    }

    const state = fs.readFileSync('./config/state.properties', 'utf8');
    let lastId = parseInt(state.match(/last_prefactura_id=(\d+)/)[1]);
    let currentId = lastId + 1;

    const auth = Buffer.from(`${config.user}:${config.pass}`).toString('base64');

    let lastReason = '';
    for (let attempt = 0; attempt < 20; attempt++) {
        const idStr = currentId.toString();
        const payload = JSON.parse(
            template
                .replace(/{{ID}}/g, idStr)
                .replace(/{{USER}}/g, user)
                .replace(/{{CENTRO}}/g, centro)
        );

        console.log(`Intentando con PK: ${idStr}`);
        try {
            const response = await axios.post(config.url_create_prefactura, payload, {
                headers: {
                    ...config.headers,
                    'Authorization': `Basic ${auth}`
                }
            });

            if (response.data.EPrefacturaResponse.co_rcode === "0") {
                console.log(`ÉXITO: Pre-factura ${idStr} creada.`);
                fs.writeFileSync('./config/state.properties', `# Últimos IDs usados para pruebas\nlast_prefactura_id=${idStr}\n`);
                return idStr;
            } else {
                const apiMsg = response.data.EPrefacturaResponse.de_info_error || 'Rechazado por el servidor';
                console.log(`Respuesta API: ${apiMsg}`);
                lastReason = apiMsg;
                currentId++;
            }
        } catch (error) {
            const errMsg = `Error HTTP (status ${error.response?.status}): ${error.message}`;
            console.error(errMsg);
            lastReason = errMsg;
            currentId++;
        }
    }

    // Mensaje de error claro para el reporte
    const yaExiste = lastReason && lastReason.toLowerCase().includes('ya existe');
    throw new Error(yaExiste
        ? `Pre-factura enviada ya existe (último PK: ${currentId - 1}). Actualiza el correlativo en state.properties.`
        : `No se pudo crear la pre-factura tras varios intentos. Último error: ${lastReason}`);
}

module.exports = { createPrefactura };
