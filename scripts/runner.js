#!/usr/bin/env node

/**
 * Runner / Orquestador de Pruebas
 *
 * Ejecuta el flujo completo sin IA:
 * 1. Lee config y test-registry
 * 2. Crea pre-factura vía API
 * 3. Lanza Playwright
 * 4. Genera result.json + screenshots
 *
 * Uso: node scripts/runner.js --caso caso1 --env QAS --tester Pierre
 *      node scripts/runner.js --caso caso1 --env QAS --dry-run
 *      node scripts/runner.js --all --env QAS --tester Pierre
 */

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { createPrefactura } = require("./api-helper");

// --- Parse CLI args ---
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const casoId = getArg("caso");
const env = getArg("env") || "QAS";
const tester = getArg("tester") || "unknown";
const dryRun = hasFlag("dry-run");
const runAll = hasFlag("all");

// --- Paths ---
const ROOT = path.resolve(__dirname, "..");
const registryPath = path.join(ROOT, "config", "test-registry.json");
const evidenceBase = path.join(ROOT, "evidence");
const latestLink = path.join(evidenceBase, "latest");

// --- Helpers ---
function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function createRunDir(casoId) {
  const dirName = `run-${timestamp()}-${casoId}`;
  const dirPath = path.join(evidenceBase, dirName);
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function updateLatestLink(runDir) {
  try {
    if (fs.existsSync(latestLink)) {
      fs.unlinkSync(latestLink);
    }
    fs.symlinkSync(runDir, latestLink);
  } catch (e) {
    console.warn(`⚠️ No se pudo crear symlink 'latest': ${e.message}`);
  }
}

// --- Main ---
async function runCaso(caso) {
  const runDir = createRunDir(caso.id);
  const startTime = Date.now();

  const result = {
    status: "pending",
    caso: caso.id,
    nombre: caso.nombre,
    prefacturaId: null,
    tester,
    env,
    cliente: null,
    duration: null,
    timestamp: new Date().toISOString(),
    screenshots: {},
    steps: [],
    error: null,
    domSnapshot: null,
  };

  // Read registry for client info
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    result.cliente = registry.cliente;
  } catch (e) {
    result.cliente = "unknown";
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Ejecutando: ${caso.nombre}`);
  console.log(`   Caso: ${caso.id} | Env: ${env} | Tester: ${tester}`);
  console.log(`${"=".repeat(60)}\n`);

  // Step 1: Create pre-factura via API
  console.log("📡 Paso 1: Creando pre-factura vía API...");
  result.steps.push({ step: "api-create-prefactura", status: "running" });

  if (dryRun) {
    console.log("   [DRY-RUN] Saltando llamada API");
    result.prefacturaId = "DRY-RUN-000";
    result.steps[result.steps.length - 1].status = "skipped";
  } else {
    try {
      const prefacturaId = await createPrefactura(tester.toUpperCase());
      result.prefacturaId = prefacturaId;
      result.steps[result.steps.length - 1].status = "ok";
      console.log(`   ✅ Pre-factura creada: ${prefacturaId}`);
    } catch (e) {
      result.steps[result.steps.length - 1].status = "error";
      result.error = `Error creando pre-factura: ${e.message}`;
      result.status = "error";
      console.error(`   ❌ ${result.error}`);
      saveResult(runDir, result, startTime);
      return result;
    }
  }

  // Step 2: Run Playwright
  console.log("\n🎭 Paso 2: Ejecutando Playwright...");
  result.steps.push({ step: "playwright-execution", status: "running" });

  if (dryRun) {
    console.log("   [DRY-RUN] Saltando ejecución Playwright");
    result.steps[result.steps.length - 1].status = "skipped";
    result.status = "dry-run";
  } else {
    try {
      const playwrightResult = spawnSync(
        "npx",
        ["playwright", "test", caso.script, "--headed", "--reporter=list"],
        {
          cwd: ROOT,
          env: {
            ...process.env,
            PREFACTURA_ID: result.prefacturaId,
            EVIDENCE_DIR: runDir,
            TEST_ENV: env,
          },
          stdio: "inherit",
          timeout: 180000, // 3 minutos máx
        },
      );

      if (playwrightResult.status === 0) {
        result.steps[result.steps.length - 1].status = "ok";
        result.status = "success";
        console.log("\n   ✅ Playwright completó exitosamente");
      } else {
        result.steps[result.steps.length - 1].status = "error";
        result.status = "error";
        result.error = `Playwright falló con exit code: ${playwrightResult.status}`;
        console.error(`\n   ❌ ${result.error}`);
      }
    } catch (e) {
      result.steps[result.steps.length - 1].status = "error";
      result.status = "error";
      result.error = `Error ejecutando Playwright: ${e.message}`;
      console.error(`   ❌ ${result.error}`);
    }
  }

  // Collect screenshots from evidence dir
  try {
    const files = fs.readdirSync(runDir);
    for (const f of files) {
      if (f.endsWith(".png") || f.endsWith(".jpg")) {
        const key = path.basename(f, path.extname(f));
        result.screenshots[key] = path.join(runDir, f);
      }
    }
  } catch (e) {
    /* no screenshots yet */
  }

  // Check for DOM snapshot
  const domPath = path.join(runDir, "dom-snapshot.yaml");
  if (fs.existsSync(domPath)) {
    result.domSnapshot = domPath;
  }

  saveResult(runDir, result, startTime);
  updateLatestLink(runDir);

  return result;
}

function saveResult(runDir, result, startTime) {
  result.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
  const resultPath = path.join(runDir, "result.json");
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  console.log(`\n📄 Resultado guardado en: ${resultPath}`);
}

async function main() {
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

  // Extraer escenarios (casos) de la estructura anidada: [ { procesos: [ { escenarios: [] } ] } ]
  let allCasos = [];
  if (Array.isArray(registry)) {
    registry.forEach(cliente => {
      if (cliente.procesos) {
         cliente.procesos.forEach(proceso => {
            if (proceso.escenarios) {
               allCasos = allCasos.concat(proceso.escenarios.map(esc => ({ ...esc, _proceso: proceso.id })));
            }
         });
      }
    });
  } else if (registry.casos) {
    allCasos = registry.casos; // fallback legacy
  }

  if (runAll) {
    console.log(`\n🏁 Ejecutando TODOS los casos (${allCasos.length})\n`);
    const results = [];
    for (const caso of allCasos) {
      const res = await runCaso(caso);
      results.push(res);
    }
    // Summary
    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 RESUMEN DE EJECUCIÓN");
    console.log(`${"=".repeat(60)}`);
    for (const r of results) {
      const icon =
        r.status === "success" ? "✅" : r.status === "dry-run" ? "🔵" : "❌";
      console.log(`${icon} ${r.caso} - ${r.nombre} (${r.duration})`);
    }
    return;
  }

  if (!casoId) {
    console.error("❌ Debes especificar --caso <id> o --all");
    console.log("\nCasos disponibles:");
    for (const c of allCasos) {
      console.log(`  - ${c.id}: ${c.name}`);
    }
    process.exit(1);
  }

  const caso = allCasos.find((c) => c.id === casoId);
  if (!caso) {
    console.error(`❌ Caso '${casoId}' no encontrado en test-registry.json`);
    console.log("\nCasos disponibles:");
    for (const c of allCasos) {
      console.log(`  - ${c.id}: ${c.name}`);
    }
    process.exit(1);
  }

  await runCaso(caso);
}

main().catch((e) => {
  console.error(`\n💥 Error fatal: ${e.message}`);
  process.exit(1);
});
