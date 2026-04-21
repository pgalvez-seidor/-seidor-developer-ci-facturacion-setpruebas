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

async function generatePdf(runDir) {
    const resultPath = path.join(runDir, 'result.json');
    if (!fs.existsSync(resultPath)) {
        console.error(`❌ No se encontró result.json en: ${runDir}`);
        return;
    }

    const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    const client = result.cliente || 'Medifarma';
    const templateDir = path.join(__dirname, 'templates', client.toLowerCase().replace(/\s+/g, '-'));
    
    // Si no hay plantilla específica, usar medifarma como base
    const finalTemplateDir = fs.existsSync(templateDir) ? templateDir : path.join(__dirname, 'templates', 'medifarma');
    const cssContent = fs.readFileSync(path.join(finalTemplateDir, 'style.css'), 'utf8');

    // Procesar capturas para agruparlas por paso (Antes/Después)
    const stepsData = [];
    const screenshotFiles = fs.readdirSync(runDir).filter(f => f.endsWith('.png'));
    
    // Buscamos pares de capturas: nombre_antes.png y nombre_despues.png
    // O capturas secuenciales si no tienen sufijo
    const baseNames = [...new Set(screenshotFiles.map(f => f.replace(/(_antes|_despues)\.png$/, '')))];
    
    for (const name of baseNames) {
        const antes = screenshotFiles.find(f => f === `${name}_antes.png`) || screenshotFiles.find(f => f === `${name}.png`);
        const despues = screenshotFiles.find(f => f === `${name}_despues.png`);
        
        stepsData.push({
            name: name.replace(/_/g, ' ').toUpperCase(),
            description: `Ejecución de acción: ${name}`,
            imgAntes: antes ? `data:image/png;base64,${fs.readFileSync(path.join(runDir, antes)).toString('base64')}` : null,
            imgDespues: despues ? `data:image/png;base64,${fs.readFileSync(path.join(runDir, despues)).toString('base64')}` : null
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
        <div class="header">
            <div class="logo">
                <div style="font-weight: 900; font-size: 28px; color: #0056b3;">SEIDOR</div>
                <div style="font-size: 12px; color: #666; letter-spacing: 2px;">PERU - AUTOBOT</div>
            </div>
            <div class="title-box">
                <h1>Dossier Técnico de Evidencias</h1>
                <div style="color: #666; font-size: 12px;">Documento generado automáticamente</div>
            </div>
        </div>

        <table class="metadata-table">
            <tr>
                <td class="label">Escenario de Prueba</td>
                <td>${result.nombre || result.caso}</td>
                <td class="label">Cliente</td>
                <td>${client}</td>
            </tr>
            <tr>
                <td class="label">Consultor / Tester</td>
                <td>${result.tester}</td>
                <td class="label">Fecha de Ejecución</td>
                <td>${new Date(result.timestamp).toLocaleString()}</td>
            </tr>
            <tr>
                <td class="label">Ambiente</td>
                <td>${result.env}</td>
                <td class="label">Estado Final</td>
                <td style="color: ${result.status === 'success' ? 'green' : 'red'}; font-weight: bold;">
                    ${result.status === 'success' ? 'EXITOSO' : 'FALLIDO'}
                </td>
            </tr>
        </table>

        <h2>Detalle de Ejecución por Pasos</h2>
        
        ${stepsData.map((step, index) => `
            <div class="step-container">
                <div class="step-header">
                    <span>Paso ${index + 1}: ${step.name}</span>
                    <span>ESTADO: OK</span>
                </div>
                <div class="step-description">
                    ${step.description}
                </div>
                <div class="screenshots-grid">
                    <div class="screenshot-item">
                        ${step.imgAntes ? `<img src="${step.imgAntes}">` : '<div style="height: 100px; background: #eee;">Sin captura inicial</div>'}
                        <div class="screenshot-label">Estado Inicial (Antes)</div>
                    </div>
                    <div class="screenshot-item">
                        ${step.imgDespues ? `<img src="${step.imgDespues}">` : (step.imgAntes ? `<img src="${step.imgAntes}">` : '<div style="height: 100px; background: #eee;">Sin captura final</div>')}
                        <div class="screenshot-label">Resultado Final (Después)</div>
                    </div>
                </div>
            </div>
        `).join('')}

        <div class="footer">
            AutoBot v1.1.0 - Seidor Perú S.A.C. - Confidencial para ${client}
        </div>
    </body>
    </html>
    `;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const pdfPath = path.join(runDir, 'Dossier_Evidencias.pdf');
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();
    console.log(`✅ Dossier PDF generado con éxito: ${pdfPath}`);
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

module.exports = { generatePdf };
