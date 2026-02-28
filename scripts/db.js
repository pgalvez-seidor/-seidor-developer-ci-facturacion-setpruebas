const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const configDir = path.join(__dirname, '..', 'config');
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);

const dbPath = path.join(configDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

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
                FOREIGN KEY(process_id) REFERENCES procesos(id) ON DELETE CASCADE
            )`);

            // 2. Seed Data if Empty
            db.get("SELECT COUNT(*) as count FROM clientes", (err, row) => {
                if (err) return reject(err);
                if (row.count === 0) {
                    console.log("🌱 Inicializando SQLite DB con datos semilla...");
                    seedData();
                } else {
                    resolve();
                }
            });
        });
    });
};

const seedData = () => {
    const defaultEscenarios = [
        {
            id: "esc_1709140000000",
            name: "Efectivo 100% de la Deuda",
            config: { tipoComprobante: "Boleta", iteraciones: 1, headless: true, medioVuelto: "Efectivo", pagos: [{ id: 1, tipo: "Efectivo", monto: "" }] }
        },
        {
            id: "esc_1709140000001",
            name: "Mixto: Efectivo y Tarjeta Manual",
            config: { tipoComprobante: "Factura", iteraciones: 1, headless: true, medioVuelto: "Efectivo", pagos: [{ id: 1, tipo: "Tarjeta", monto: "25.00", autoData: true }, { id: 2, tipo: "Efectivo", monto: "" }] }
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

module.exports = { db, initDb };
