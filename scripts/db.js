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
                name TEXT NOT NULL,
                descripcion TEXT,
                logo_base64 TEXT,
                color_primario TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS procesos (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                name TEXT NOT NULL,
                descripcion TEXT,
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

            // Migraciones seguras para bases de datos existentes
            db.run(`ALTER TABLE clientes ADD COLUMN descripcion TEXT`, () => {});
            db.run(`ALTER TABLE clientes ADD COLUMN logo_base64 TEXT`, () => {});
            db.run(`ALTER TABLE clientes ADD COLUMN color_primario TEXT`, () => {});
            db.run(`ALTER TABLE procesos ADD COLUMN descripcion TEXT`, () => {});
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

// ─── Cloud Sync Functions ──────────────────────────────────────────────────────

let lastSyncTimestamp = null;

/**
 * syncFromCloud — descarga toda la data de Supabase y hace UPSERT quirúrgico en SQLite local.
 */
const syncFromCloud = async () => {
    let supabase;
    try { supabase = require('./supabase-client'); } catch (e) { return; }
    if (!supabase.isConnected()) return;

    try {
        let hasChanges = false;
        const { clientes, proyectos, escenarios } = await supabase.fetchAll();

        // 1. Sincronización de Clientes (Surgical)
        for (const c of clientes) {
            await new Promise((resolve) => {
                db.get("SELECT name, descripcion, logo_base64, color_primario FROM clientes WHERE id = ?", [c.ID], (err, row) => {
                    if (!row) {
                        console.log(`[Sync] 🌱 Nuevo cliente: ${c.NOMBRE}`);
                        db.run("INSERT INTO clientes (id, name, descripcion, logo_base64, color_primario) VALUES (?, ?, ?, ?, ?)", 
                               [c.ID, c.NOMBRE, c.DESCRIPCION, c.LOGO_BASE64, c.COLOR_PRIMARIO], () => { 
                            hasChanges = true; 
                            resolve(); 
                        });
                    } else if (row.name !== c.NOMBRE || row.descripcion !== c.DESCRIPCION || row.logo_base64 !== c.LOGO_BASE64 || row.color_primario !== c.COLOR_PRIMARIO) {
                        console.log(`[Sync] 🔄 Actualizando cliente: ${c.ID}`);
                        db.run("UPDATE clientes SET name = ?, descripcion = ?, logo_base64 = ?, color_primario = ? WHERE id = ?", 
                               [c.NOMBRE, c.DESCRIPCION, c.LOGO_BASE64, c.COLOR_PRIMARIO, c.ID], () => { 
                            hasChanges = true; 
                            resolve(); 
                        });
                    } else {
                        resolve();
                    }
                });
            });
        }

        // 2. Sincronización de Procesos/Proyectos (Surgical)
        for (const p of proyectos) {
            await new Promise((resolve) => {
                db.get("SELECT name, descripcion FROM procesos WHERE id = ?", [p.ID], (err, row) => {
                    if (!row) {
                        db.run("INSERT INTO procesos (id, client_id, name, descripcion) VALUES (?, ?, ?, ?)", 
                               [p.ID, p.CLIENTE_ID, p.NOMBRE, p.DESCRIPCION], () => { 
                            hasChanges = true; 
                            resolve(); 
                        });
                    } else if (row.name !== p.NOMBRE || row.descripcion !== p.DESCRIPCION) {
                        db.run("UPDATE procesos SET name = ?, descripcion = ? WHERE id = ?", 
                               [p.NOMBRE, p.DESCRIPCION, p.ID], () => { 
                            hasChanges = true; 
                            resolve(); 
                        });
                    } else {
                        resolve();
                    }
                });
            });
        }

        // 3. Sincronización de Escenarios (Surgical)
        for (const e of escenarios) {
            await new Promise((resolve) => {
                db.get("SELECT name, config_json, instrucciones_ia FROM escenarios WHERE id = ?", [e.ID], (err, row) => {
                    if (!row) {
                        db.run(`INSERT INTO escenarios (id, process_id, name, config_json, instrucciones_ia, created_at, created_by) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                                [e.ID, e.PROYECTO_ID, e.NOMBRE, e.CONFIG_JSON || '{}', e.INSTRUCCIONES || '', e.CREATED_AT, e.CREATED_BY], () => { 
                                    hasChanges = true; 
                                    resolve(); 
                                });
                    } else if (row.name !== e.NOMBRE || row.config_json !== e.CONFIG_JSON || row.instrucciones_ia !== e.INSTRUCCIONES) {
                        db.run(`UPDATE escenarios SET name = ?, config_json = ?, instrucciones_ia = ? WHERE id = ?`,
                                [e.NOMBRE, e.CONFIG_JSON || '{}', e.INSTRUCCIONES || '', e.ID], () => { 
                                    hasChanges = true; 
                                    resolve(); 
                                });
                    } else {
                        resolve();
                    }
                });
            });
        }

        lastSyncTimestamp = new Date().toISOString();
        if (hasChanges) console.log('[Sync] ✅ Sincronización completada con cambios.');
        return hasChanges;
    } catch (e) {
        console.error('[Sync] Error:', e.message);
        return false;
    }
};

/**
 * pushToCloud — escribe un escenario a Supabase de forma asíncrona.
 */
const pushToCloud = async (escenario) => {
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
 * pushClienteToCloud — sincroniza un cliente y su proyecto a Supabase.
 */
const pushClienteToCloud = async (cliente, proyecto) => {
    let supabase;
    try { supabase = require('./supabase-client'); } catch (e) { return; }
    if (!supabase.isConnected()) return;
    try {
        await supabase.upsertCliente({
            id: cliente.id,
            nombre: cliente.name,
            descripcion: cliente.descripcion,
            logoBase64: cliente.logo_base64,
            colorPrimario: cliente.color_primario
        });
        if (proyecto) {
            await supabase.upsertProyecto({
                id: proyecto.id,
                clienteId: proyecto.client_id,
                nombre: proyecto.name,
                descripcion: proyecto.descripcion
            });
        }
    } catch (e) {
        console.error('[SQLite→Supabase] Error sync cliente/proyecto:', e.message);
    }
};

const getLastSyncTimestamp = () => lastSyncTimestamp;

module.exports = {
    db,
    initDb,
    syncFromCloud,
    pushToCloud,
    pushClienteToCloud,
    getLastSyncTimestamp
};
