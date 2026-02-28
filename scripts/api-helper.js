const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');

async function createPrefactura(user) {
    const config = JSON.parse(fs.readFileSync('./config/api-config.json', 'utf8')).QAS;
    const template = fs.readFileSync('./templates/pre-factura-caso-1.json', 'utf8');

    // Sincronizar correlativo más reciente con git antes de leer
    try {
        console.log("🔄 Sincronizando correlativo con repositorio...");
        execSync('git pull origin HEAD --rebase', { stdio: 'ignore' });
    } catch(e) {
        console.log("⚠️ Advertencia: No se pudo hacer git pull del correlativo.");
    }

    const state = fs.readFileSync('./config/state.properties', 'utf8');
    let lastId = parseInt(state.match(/last_prefactura_id=(\d+)/)[1]);
    let currentId = lastId + 1;

    const auth = Buffer.from(`${config.user}:${config.pass}`).toString('base64');

    for (let attempt = 0; attempt < 5; attempt++) {
        const idStr = currentId.toString();
        const payload = JSON.parse(template.replace(/{{ID}}/g, idStr).replace(/{{USER}}/g, user));

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
                console.log(`Respuesta API: ${response.data.EPrefacturaResponse.de_info_error}`);
                currentId++;
            }
        } catch (error) {
            console.error(`Error en API (status ${error.response?.status}): ${error.message}`);
            currentId++;
        }
    }
    throw new Error("No se pudo crear la pre-factura tras varios intentos.");
}

module.exports = { createPrefactura };
