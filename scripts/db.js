const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const configDir = path.join(__dirname, '..', 'config');
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);

const dbPath = path.join(configDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Configuraciones de robustez para Windows/OneDrive
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");
db.configure("busyTimeout", 5000);

const initDb = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 1. Create Tables
            db.run(`CREATE TABLE IF NOT EXISTS clientes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS procesos (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                name TEXT NOT NULL,
                FOREIGN KEY(client_id) REFERENCES clientes(id) ON DELETE CASCADE
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS escenarios (
                id TEXT PRIMARY KEY,
                process_id TEXT NOT NULL,
                name TEXT NOT NULL,
                config_json TEXT NOT NULL,
                instrucciones_ia TEXT,
                created_at TEXT,
                created_by TEXT,
                FOREIGN KEY(process_id) REFERENCES procesos(id) ON DELETE CASCADE
            )`);

            db.run(`ALTER TABLE escenarios ADD COLUMN created_at TEXT`, () => {});
            db.run(`ALTER TABLE escenarios ADD COLUMN created_by TEXT`, () => {});

            // 2. Seed Data if Empty
            db.get("SELECT COUNT(*) as count FROM clientes", (err, row) => {
                if (err) return reject(err);
                if (row.count === 0) {
                    console.log("🌱 Inicializando SQLite DB con datos semilla...");
                    seedData();
                }
            });

            // 3. Asegurar cliente Medifarma (rama Medifarma — INSERT OR IGNORE es idempotente)
            db.run(`INSERT OR IGNORE INTO clientes (id, name) VALUES ('Medifarma', 'Medifarma')`);
            db.run(`INSERT OR IGNORE INTO procesos (id, client_id, name) VALUES ('mf_facturacion', 'Medifarma', 'Facturación')`);
            db.run(`INSERT OR IGNORE INTO procesos (id, client_id, name) VALUES ('mf_flujos', 'Medifarma', 'Flujos Grabados')`, function (err) {
                if (err) return reject(err);
                resolve();
            });
        });
    });
};

const seedData = () => {
    const defaultEscenarios = [
        {
            id: "esc_1709140000000",
            name: "Efectivo 100% de la Deuda",
            config: { tipoComprobante: "Boleta", iteraciones: 1, headless: true, medioVuelto: "Efectivo", pagos: [{ id: 1, tipo: "Efectivo", monto: "" }], usuarioCajero: 'PGALVEZ3', codigoCentro: '4' }
        },
        {
            id: "esc_1709140000001",
            name: "Mixto: Efectivo y Tarjeta Manual",
            config: { tipoComprobante: "Factura", iteraciones: 1, headless: true, medioVuelto: "Efectivo", pagos: [{ id: 1, tipo: "Tarjeta", monto: "25.00", autoData: true }, { id: 2, tipo: "Efectivo", monto: "" }], usuarioCajero: 'PGALVEZ3', codigoCentro: '4' }
        }
    ];

    db.serialize(() => {
        db.run(`INSERT INTO clientes (id, name) VALUES ('CI', 'Clínica Internacional')`);

        db.run(`INSERT INTO procesos (id, client_id, name) VALUES ('facturacion', 'CI', 'Facturación')`);
        db.run(`INSERT INTO procesos (id, client_id, name) VALUES ('horario_supervisor', 'CI', 'Horario Supervisor')`);
        db.run(`INSERT INTO procesos (id, client_id, name) VALUES ('horario_cajero', 'CI', 'Horario Cajero')`);

        const stmt = db.prepare(`INSERT INTO escenarios (id, process_id, name, config_json, instrucciones_ia) VALUES (?, ?, ?, ?, ?)`);
        for (const esc of defaultEscenarios) {
            stmt.run(esc.id, 'facturacion', esc.name, JSON.stringify(esc.config), "1. Navegar a Fiori.\n2. Abrir Cobranzas.");
        }

        // Seed para Horario Supervisor
        stmt.run("esc_hs_01", "horario_supervisor", "Creación Diaria (Ambulatoria)", JSON.stringify({
            area: "AMBULATORIA-ADMISION",
            periodo: "02-2026",
            headless: false,
            iteraciones: 1
        }), "Automatización de horario supervisor para el día de hoy.");

        stmt.finalize();
        console.log("✅ Datos semilla inyectados correctamente.");
    });
};

// ─── HANA Sync Functions ──────────────────────────────────────────────────────

let lastSyncTimestamp = null;

/**
 * syncFromSupabase — descarga toda la data de Supabase y hace UPSERT en SQLite local.
 * Es el reemplazo de syncScenariosWithFileSystem().
 */
const syncFromHana = async () => {
    let supabase;
    try { supabase = require('./supabase-client'); } catch (e) { return; }
    if (!supabase.isConnected()) return;

    try {
        console.log('[Supabase→SQLite] Iniciando sincronización descendente...');
        const { clientes, proyectos, escenarios } = await supabase.fetchAll();

        await new Promise((resolve) => {
            db.serialize(() => {
                // Upsert clientes
                for (const c of clientes) {
                    db.run(`INSERT OR REPLACE INTO clientes (id, name) VALUES (?, ?)`,
                        [c.ID, c.NOMBRE]);
                }
                // Upsert procesos
                for (const p of proyectos) {
                    db.run(`INSERT OR IGNORE INTO procesos (id, client_id, name) VALUES (?, ?, ?)`,
                        [p.ID, p.CLIENTE_ID, p.NOMBRE]);
                }
                // Upsert escenarios (la config_json viene de HANA como CONFIG_JSON)
                for (const e of escenarios) {
                    // Si el script está en Supabase, escribirlo al disco también para compatibilidad
                    if (e.SCRIPT_CONTENT) {
                        const fs = require('fs');
                        const path = require('path');
                        const scriptName = JSON.parse(e.CONFIG_JSON || '{}').file || JSON.parse(e.CONFIG_JSON || '{}').recordedScript;
                        if (scriptName) {
                            const scriptPath = path.join(__dirname, '..', scriptName.startsWith('scripts/') ? scriptName : `scripts/${scriptName}`);
                            try {
                                if (!fs.existsSync(scriptPath)) {
                                    fs.writeFileSync(scriptPath, e.SCRIPT_CONTENT, 'utf8');
                                    console.log(`[Supabase→SQLite] Script restaurado: ${scriptName}`);
                                }
                            } catch (_) {}
                        }
                    }
                    db.run(
                        `INSERT OR REPLACE INTO escenarios (id, process_id, name, config_json, instrucciones_ia, created_at, created_by)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [e.ID, e.PROYECTO_ID, e.NOMBRE,
                         e.CONFIG_JSON || '{}',
                         e.INSTRUCCIONES || '',
                         e.CREATED_AT || new Date().toISOString(),
                         e.CREATED_BY || '']
                    );
                }
                resolve();
            });
        });

        lastSyncTimestamp = new Date().toISOString();
        console.log(`[Supabase→SQLite] ✅ Sync completo. Clientes: ${clientes.length}, Proyectos: ${proyectos.length}, Escenarios: ${escenarios.length}`);
    } catch (e) {
        console.error('[Supabase→SQLite] Error en sync:', e.message);
    }
};

/**
 * pushToHana — escribe un escenario a Supabase de forma asíncrona (fire-and-forget seguro).
 * Si Supabase no está disponible, encola para sync posterior.
 */
const pushToHana = async (escenario) => {
    let supabase;
    try { supabase = require('./supabase-client'); } catch (e) { return; }

    const fn = () => supabase.upsertEscenario(escenario);

    if (!supabase.isConnected()) {
        supabase.enqueue(fn);
        return;
    }
    try {
        await fn();
        console.log(`[SQLite→Supabase] ✅ Escenario sincronizado: ${escenario.id}`);
    } catch (e) {
        console.error('[SQLite→Supabase] Error, encolando:', e.message);
        supabase.enqueue(fn);
    }
};

/**
 * pushClienteToHana — sincroniza un cliente y su proyecto a Supabase.
 */
const pushClienteToHana = async (cliente, proyecto) => {
    let supabase;
    try { supabase = require('./supabase-client'); } catch (e) { return; }
    if (!supabase.isConnected()) return;
    try {
        await supabase.upsertCliente(cliente);
        if (proyecto) await supabase.upsertProyecto(proyecto);
    } catch (e) {
        console.error('[SQLite→Supabase] Error sync cliente/proyecto:', e.message);
    }
};

const getLastSyncTimestamp = () => lastSyncTimestamp;

module.exports = { db, initDb, syncFromHana, pushToHana, pushClienteToHana, getLastSyncTimestamp };
