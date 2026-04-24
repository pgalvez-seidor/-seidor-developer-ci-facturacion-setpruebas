require('dotenv').config();
const SapAiCoreProvider = require('./SapAiCoreProvider');
const fs = require('fs');
const path = require('path');

async function test() {
    console.log("🚀 Iniciando prueba de conexión con SAP AI Core...");
    
    // Verificar variables
    const vars = [
        'SAP_AICORE_CLIENT_ID',
        'SAP_AICORE_CLIENT_SECRET',
        'SAP_AICORE_AUTH_URL',
        'SAP_AICORE_BASE_URL',
        'SAP_AICORE_DEPLOYMENT_ID'
    ];

    const missing = vars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        console.error("❌ Faltan variables en el .env:", missing.join(', '));
        process.exit(1);
    }

    try {
        console.log("1. Probando obtención de Token...");
        const token = await SapAiCoreProvider.getAccessToken();
        console.log("✅ Token obtenido con éxito.");

        console.log("2. Probando Inferencia Multimodal (Inyectando imagen de prueba)...");
        
        // Buscar cualquier imagen en evidence/ para probar, o usar un placeholder si no hay
        const evidenceDir = path.join(__dirname, '..', 'evidence');
        let testImage = null;
        
        if (fs.existsSync(evidenceDir)) {
            const files = fs.readdirSync(evidenceDir, { recursive: true }).filter(f => f.endsWith('.png'));
            if (files.length > 0) {
                testImage = fs.readFileSync(path.join(evidenceDir, files[0])).toString('base64');
                console.log(`📸 Usando imagen real para el test: ${files[0]}`);
            }
        }

        if (!testImage) {
            console.log("⚠️ No se encontró imagen en evidence/, usando un pixel rojo de prueba.");
            testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        }

        const prompt = "Responde 'OK' si puedes ver esta imagen.";
        const response = await SapAiCoreProvider.analyzeImage(prompt, testImage);
        
        console.log("🤖 Respuesta de SAP AI Core:", response);
        console.log("✨ Prueba finalizada con éxito.");

    } catch (error) {
        console.error("❌ Error durante el test:", error.message);
        process.exit(1);
    }
}

test();
