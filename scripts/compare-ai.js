require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const SapAiCoreProvider = require('./SapAiCoreProvider');
const fs = require('fs');
const path = require('path');

async function compare() {
    const runDir = 'evidence/run-2026-04-17-21-task_1776461293232_0';
    const testFile = 'comprobante_emitido.png'; // Una imagen con un error interesante
    const imgPath = path.join(runDir, testFile);
    
    if (!fs.existsSync(imgPath)) {
        console.error("❌ No se encontró la imagen de prueba.");
        return;
    }

    const imgBase64 = fs.readFileSync(imgPath).toString('base64');
    const prompt = 'Describe brevemente qué acción de SAP Fiori se ve en esta pantalla y si hay algún problema visible.';

    console.log('\n⚔️  DUELO DE TITANES: GEMINI vs SAP AI CORE');
    console.log('--------------------------------------------');
    console.log('🖼️  Imagen: ' + testFile);

    // --- PRUEBA GEMINI ---
    console.log('\n🔵 Iniciando Gemini 1.5 Flash...');
    const startGemini = Date.now();
    let resGemini = "";
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imgBase64, mimeType: "image/png" } }
        ]);
        resGemini = result.response.text().trim();
    } catch (e) { resGemini = "ERROR: " + e.message; }
    const timeGemini = (Date.now() - startGemini) / 1000;

    // --- PRUEBA SAP AI CORE ---
    console.log('🟠 Iniciando SAP AI Core (GPT-4o-mini)...');
    const startSap = Date.now();
    let resSap = "";
    try {
        resSap = await SapAiCoreProvider.analyzeImage(prompt, imgBase64);
    } catch (e) { resSap = "ERROR: " + e.message; }
    const timeSap = (Date.now() - startSap) / 1000;

    // --- RESULTADOS ---
    console.log('\n📊 RESULTADOS COMPARATIVOS:');
    console.log('===========================');
    
    console.log(`\n🔹 GEMINI 1.5 FLASH [${timeGemini.toFixed(2)}s]`);
    console.log('--------------------------------------------');
    console.log(resGemini);

    console.log(`\n🔸 SAP AI CORE (GPT-4o-mini) [${timeSap.toFixed(2)}s]`);
    console.log('--------------------------------------------');
    console.log(resSap);

    console.log('\n===========================');
    const winner = timeGemini < timeSap ? 'Gemini (Velocidad)' : 'SAP AI Core (Velocidad)';
    console.log(`🏆 Ganador en tiempo: ${winner}`);
}

compare();
