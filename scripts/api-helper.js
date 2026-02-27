const axios = require('axios');
const fs = require('fs');

async function createPrefactura(user, templateName = 'pre-factura-caso-1') {
    const config = JSON.parse(fs.readFileSync('./config/api-config.json', 'utf8')).QAS;
    const templatePath = `./templates/${templateName}.json`;
    const template = fs.readFileSync(templatePath, 'utf8');
    const state = fs.readFileSync('./config/state.properties', 'utf8');

    // Determinar sufijo de estado según el template (ej: pre-factura-caso-1 -> c1)
    const caseMatch = templateName.match(/caso-(\d+)/);
    const caseNum = caseMatch ? caseMatch[1] : '1';
    const stateKey = `last_prefactura_id_c${caseNum}`;

    let lastId;
    const keyMatch = state.match(new RegExp(`${stateKey}=(\\d+)`));

    if (keyMatch) {
        lastId = parseInt(keyMatch[1]);
    } else {
        // Fallback: usar el ID base de 139 pero cambiar el prefijo según el caso
        const baseIdStr = state.match(/last_prefactura_id=(\d+)/)[1];
        const newIdStr = caseNum + baseIdStr.substring(1);
        lastId = parseInt(newIdStr);
    }

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

                // Actualizar solo la clave específica en el archivo de estado
                let newState = state;
                if (state.includes(stateKey)) {
                    newState = state.replace(new RegExp(`${stateKey}=\\d+`), `${stateKey}=${idStr}`);
                } else {
                    newState = state.trim() + `\n${stateKey}=${idStr}\n`;
                }
                fs.writeFileSync('./config/state.properties', newState);

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
