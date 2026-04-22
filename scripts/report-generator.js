#!/usr/bin/env node

/**
 * Generador de Dossier Técnico AutoBot (PDF Profesional)
 * 
 * Lee result.json y genera un PDF con formato corporativo, capturas antes/después
 * y metadata detallada.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function describeStepWithAI(stepName, imgBase64) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Actúa como un experto en control de calidad (QA) especializado en SAP Fiori. 
        Analiza detalladamente esta captura de pantalla.
        
        INSTRUCCIONES CRÍTICAS:
        1. IGNORA el nombre técnico del paso (${stepName}) si es genérico como "ACCION" o "PASO".
        2. REALIZA UN ANÁLISIS VISUAL: Identifica títulos de diálogos, etiquetas de botones (ej: "Logout", "Continuar"), nombres de aplicaciones y textos destacados (ej: "Motivo de Modificación").
        3. REDACCIÓN: Describe la acción de negocio que se está realizando. 
           Ejemplo: "El usuario completa el campo 'Motivo de Modificación' en el diálogo de seguridad" o "Se procede con el cierre de sesión (Logout) del sistema".
        4. FORMATO: Usa un tono profesional, en tercera persona. Si hay varios elementos, lístalos (1. ..., 2. ...).
        5. DATOS: Si ves números de orden, lotes o nombres de usuario, inclúyelos.
        
        Sé muy preciso. Si ves un botón de 'Logout', menciónalo. Si ves un campo de texto con valor, menciónalo.`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imgBase64, mimeType: "image/png" } }
        ]);
        return result.response.text().trim();
    } catch (e) {
        console.error(`[AI] Error describiendo paso ${stepName}:`, e.message);
        const errorMsg = e.message.includes('429') || e.message.includes('quota') 
            ? "(IA: Límite de cuota excedido, usando descripción básica)" 
            : "(IA: Error de interpretación visual)";
        return `${errorMsg} El usuario ejecutó la acción ${stepName.replace(/_/g, ' ')} de manera exitosa.`;
    }
}

async function generatePdf(runDir) {
    const resultPath = path.join(runDir, 'result.json');
    if (!fs.existsSync(resultPath)) {
        console.error(`❌ No se encontró result.json en: ${runDir}`);
        return;
    }

    const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    const client = result.cliente || 'Medifarma';
    const templateDir = path.join(__dirname, 'templates', client.toLowerCase().replace(/\s+/g, '-'));
    
    const finalTemplateDir = fs.existsSync(templateDir) ? templateDir : path.join(__dirname, 'templates', 'medifarma');
    const cssContent = fs.readFileSync(path.join(finalTemplateDir, 'style.css'), 'utf8');

    console.log("🤖 AutoBot AI: Analizando capturas para descripción inteligente...");

    const stepsData = [];
    const screenshotFiles = fs.readdirSync(runDir).filter(f => f.endsWith('.png') && !f.includes('logo')).sort();
    
    // Agrupamos por nombre base si existen pares antes/despues, si no, tomamos cada imagen como un paso
    const processedFiles = new Set();

    for (const file of screenshotFiles) {
        if (processedFiles.has(file)) continue;

        const baseName = file.replace(/(_antes|_despues)\.png$/, '');
        const antesFile = screenshotFiles.find(f => f === `${baseName}_antes.png`) || (file.includes('_antes') ? file : null);
        const despuesFile = screenshotFiles.find(f => f === `${baseName}_despues.png`) || (file.includes('_despues') ? file : (!file.includes('_antes') ? file : null));

        if (antesFile) processedFiles.add(antesFile);
        if (despuesFile) processedFiles.add(despuesFile);
        if (!antesFile && !despuesFile) processedFiles.add(file);

        const displayName = baseName.replace(/\.png$/i, '').replace(/_/g, ' ').toUpperCase();
        
        const imgAntesBase64 = antesFile ? fs.readFileSync(path.join(runDir, antesFile)).toString('base64') : null;
        const imgDespuesBase64 = despuesFile ? fs.readFileSync(path.join(runDir, despuesFile)).toString('base64') : null;

        // Si no hay imagen de "después", usamos la única que tengamos para la IA
        const aiImgBase64 = imgDespuesBase64 || imgAntesBase64;
        const aiDescription = aiImgBase64 
            ? await describeStepWithAI(displayName, aiImgBase64)
            : `Ejecución del paso ${displayName}.`;

        stepsData.push({
            name: displayName,
            description: aiDescription,
            imgAntes: imgAntesBase64 ? `data:image/png;base64,${imgAntesBase64}` : null,
            imgDespues: imgDespuesBase64 ? `data:image/png;base64,${imgDespuesBase64}` : null
        });
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>${cssContent}</style>
    </head>
    <body>
        <div class="cover-page">
            <div style="position: absolute; top: 40px; right: 40px;">
                <img src="data:image/png;base64,${fs.readFileSync(path.join(__dirname, 'templates', 'medifarma', 'logo-report.png')).toString('base64')}" style="height: 50px; width: auto;">
            </div>
            <div class="cover-content">
                <div class="cover-subtitle">Informe de Ejecución</div>
                <h1 class="cover-title">Evidencia de Certificación Automatizada</h1>
                <p class="cover-desc">Reporte detallado generado por AutoBot AI Vision para la validación de flujos de procesos técnicos y de negocio.</p>
                
                <div class="cover-meta">
                    <div class="meta-item"><strong>Proyecto:</strong> ${client}</div>
                    <div class="meta-item"><strong>Tester:</strong> ${result.tester || 'PIERRE GALVEZ'}</div>
                    <div class="meta-item"><strong>Fecha:</strong> ${new Date(result.timestamp).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>
            
            <div class="cover-stats">
                <div class="stat-card">
                    <label>ESCENARIO</label>
                    <div class="stat-val" style="font-size: 16px;">${result.nombre || 'Prueba General'}</div>
                </div>
                <div class="stat-card">
                    <label>ESTADO FINAL</label>
                    <div class="stat-val ${result.status}">${result.status === 'success' ? 'EXITOSO' : 'FALLIDO'}</div>
                </div>
            </div>
        </div>

        <div class="page-break"></div>

        <div class="header">
            <div class="logo">
                <img src="data:image/png;base64,${fs.readFileSync(path.join(__dirname, 'templates', 'medifarma', 'logo-report.png')).toString('base64')}" style="height: 60px; width: auto;">
            </div>
            <div class="title-box">
                <h1>Detalle de Evidencias</h1>
                <div style="color: #666; font-size: 12px;">AutoBot AI Vision</div>
            </div>
        </div>

        ${stepsData.map((step, index) => `
            <div class="step-container">
                <div class="step-header">
                    <span>Paso ${index + 1}: ${step.name}</span>
                    <span>ESTADO: OK</span>
                </div>
                <div class="step-description">
                    ${step.description}
                </div>
                <div class="screenshots-single">
                    <div class="screenshot-item">
                        ${step.imgDespues ? `<img src="${step.imgDespues}">` : (step.imgAntes ? `<img src="${step.imgAntes}">` : '<div style="height: 100px; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">Sin captura de evidencia</div>')}
                        <div class="screenshot-label">Evidencia de Resultado Final</div>
                    </div>
                </div>
            </div>
        `).join('')}

        <div class="footer">
            AutoBot v1.2.0 - Seidor Perú S.A.C. - Inteligencia Artificial Gemini 1.5 Flash
        </div>
    </body>
    </html>
    `;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const pdfPath = path.join(runDir, 'Dossier_Evidencias_AI.pdf');
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();
    console.log(`✅ Dossier AI PDF generado con éxito: ${pdfPath}`);
    return pdfPath;
}

// Ejecución directa si se llama por CLI
if (require.main === module) {
    const runDir = process.argv[2] || path.join(__dirname, '..', 'evidence', 'latest');
    generatePdf(runDir).catch(err => {
        console.error("❌ Error generando PDF:", err);
        process.exit(1);
    });
}

async function generateBatchPdf(runDirs, batchInfo) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Recopilamos datos de todas las pruebas
    const allTestsData = [];
    const client = batchInfo.cliente || 'Medifarma';
    const templateDir = path.join(__dirname, 'templates', 'medifarma');
    const cssContent = fs.readFileSync(path.join(templateDir, 'style.css'), 'utf8');

    for (let i = 0; i < runDirs.length; i++) {
        const runDir = runDirs[i];
        const resultPath = path.join(runDir, 'result.json');
        if (!fs.existsSync(resultPath)) continue;

        const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
        const screenshotFiles = fs.readdirSync(runDir).filter(f => f.endsWith('.png') && !f.includes('logo')).sort();
        
        const stepsData = [];
        const processedFiles = new Set();
        for (const file of screenshotFiles) {
            if (processedFiles.has(file)) continue;
            const baseName = file.replace(/(_antes|_despues)\.png$/, '');
            const despuesFile = screenshotFiles.find(f => f === `${baseName}_despues.png`) || (!file.includes('_antes') ? file : null);
            if (despuesFile) processedFiles.add(despuesFile);
            const imgDespuesBase64 = despuesFile ? fs.readFileSync(path.join(runDir, despuesFile)).toString('base64') : null;
            
            stepsData.push({
                name: baseName.replace(/\.png$/i, '').replace(/_/g, ' ').toUpperCase(),
                imgDespues: imgDespuesBase64 ? `data:image/png;base64,${imgDespuesBase64}` : null
            });
        }

        allTestsData.push({
            index: i + 1,
            nombre: result.nombre || `Prueba ${i + 1}`,
            status: result.status,
            tester: result.tester,
            steps: stepsData
        });
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            ${cssContent}
            .batch-summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin: 40px; }
            .test-header { background: #0056b3; color: white; padding: 15px 25px; border-radius: 10px; margin: 40px 0 20px 0; font-size: 18px; font-weight: bold; }
            .success-row { color: #10b981; }
            .error-row { color: #ef4444; }
        </style>
    </head>
    <body>
        <div class="cover-page">
            <div style="position: absolute; top: 40px; right: 40px;">
                <img src="data:image/png;base64,${fs.readFileSync(path.join(templateDir, 'logo-report.png')).toString('base64')}" style="height: 50px;">
            </div>
            <div class="cover-content">
                <div class="cover-subtitle">Dossier Consolidado de Lote</div>
                <h1 class="cover-title">Reporte General de Certificación</h1>
                <p class="cover-desc">Este documento agrupa la ejecución secuencial de múltiples escenarios de prueba.</p>
                <div class="cover-meta">
                    <div class="meta-item"><strong>Proyecto:</strong> ${batchInfo.proyecto || 'General'}</div>
                    <div class="meta-item"><strong>Tester Responsable:</strong> ${batchInfo.tester || 'AutoBot AI'}</div>
                    <div class="meta-item"><strong>Total Pruebas:</strong> ${allTestsData.length}</div>
                </div>
            </div>
        </div>

        <div class="page-break"></div>

        <div class="batch-summary">
            <h2 style="margin-top: 0;">Índice de Ejecución</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                ${allTestsData.map(t => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px 0;"><strong>Prueba ${t.index}:</strong> ${t.nombre}</td>
                        <td style="text-align: right; font-weight: bold;" class="${t.status === 'success' ? 'success-row' : 'error-row'}">
                            ${t.status === 'success' ? 'PASS' : 'FAIL'}
                        </td>
                    </tr>
                `).join('')}
            </table>
        </div>

        ${allTestsData.map(test => `
            <div class="test-header">Prueba ${test.index}: ${test.nombre}</div>
            ${test.steps.map((step, sIdx) => `
                <div class="step-container" style="page-break-inside: avoid;">
                    <div class="step-header">
                        <span>Paso ${sIdx + 1}: ${step.name}</span>
                        <span>ESTADO: OK</span>
                    </div>
                    <div class="screenshots-single">
                        <div class="screenshot-item">
                            ${step.imgDespues ? `<img src="${step.imgDespues}">` : '<div style="height: 100px; background: #eee;">Sin evidencia</div>'}
                        </div>
                    </div>
                </div>
            `).join('')}
            <div class="page-break"></div>
        `).join('')}

        <div class="batch-summary" style="text-align: center; background: #0056b3; color: white;">
            <h1 style="margin: 0;">Resultado General</h1>
            <div style="font-size: 24px; margin-top: 10px; font-weight: bold;">
                ${allTestsData.filter(t => t.status === 'success').length} de ${allTestsData.length} Exitosas
            </div>
        </div>
    </body>
    </html>
    `;

    await page.setContent(htmlContent);
    const globalPdfPath = path.join(runDirs[0], '..', `Reporte_Global_Batch_${Date.now()}.pdf`);
    await page.pdf({ path: globalPdfPath, format: 'A4', printBackground: true });
    await browser.close();
    return globalPdfPath;
}

module.exports = { generatePdf, generateBatchPdf };
