#!/usr/bin/env node

/**
 * Generador de Reportes de Evidencia
 * 
 * Lee result.json de una ejecución y genera un reporte .md con screenshots embebidos.
 * 
 * Uso: node scripts/report-generator.js [path-to-run-dir]
 *      node scripts/report-generator.js  (usa evidence/latest por defecto)
 */

const fs = require('fs');
const path = require('path');

const runDir = process.argv[2] || path.join(__dirname, '..', 'evidence', 'latest');
const resultPath = path.join(runDir, 'result.json');

if (!fs.existsSync(resultPath)) {
    console.error(`❌ No se encontró result.json en: ${runDir}`);
    process.exit(1);
}

const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

// Build report
let md = '';

// Header
const statusIcon = result.status === 'success' ? '✅' : result.status === 'dry-run' ? '🔵' : '❌';
md += `# ${statusIcon} Reporte de Prueba: ${result.nombre}\n\n`;

// Metadata table
md += `| Campo | Valor |\n`;
md += `|-------|-------|\n`;
md += `| **Caso** | ${result.caso} - ${result.nombre} |\n`;
md += `| **Estado** | ${result.status.toUpperCase()} |\n`;
md += `| **Cliente** | ${result.cliente} |\n`;
md += `| **Pre-factura ID** | ${result.prefacturaId} |\n`;
md += `| **Tester** | ${result.tester} |\n`;
md += `| **Ambiente** | ${result.env} |\n`;
md += `| **Duración** | ${result.duration} |\n`;
md += `| **Fecha** | ${result.timestamp} |\n`;
md += `\n`;

// Steps
md += `## Pasos de Ejecución\n\n`;
for (const step of result.steps) {
    const icon = step.status === 'ok' ? '✅' : step.status === 'skipped' ? '⏭️' : '❌';
    md += `- ${icon} **${step.step}**: ${step.status}\n`;
}
md += `\n`;

// Error detail
if (result.error) {
    md += `## ❌ Detalle del Error\n\n`;
    md += `\`\`\`\n${result.error}\n\`\`\`\n\n`;
}

// Screenshots
const screenshots = Object.entries(result.screenshots);
if (screenshots.length > 0) {
    md += `## 📸 Capturas de Pantalla\n\n`;
    for (const [name, filepath] of screenshots) {
        const relativePath = path.relative(runDir, filepath);
        md += `### ${name}\n`;
        md += `![${name}](${relativePath})\n\n`;
    }
}

// DOM Snapshot
if (result.domSnapshot) {
    md += `## 🔍 DOM Snapshot\n\n`;
    md += `Disponible en: \`${path.relative(runDir, result.domSnapshot)}\`\n\n`;
}

// Footer
md += `---\n`;
md += `*Reporte generado automáticamente por report-generator.js*\n`;

// Write report
const reportPath = path.join(runDir, 'reporte.md');
fs.writeFileSync(reportPath, md);
console.log(`📄 Reporte generado: ${reportPath}`);
