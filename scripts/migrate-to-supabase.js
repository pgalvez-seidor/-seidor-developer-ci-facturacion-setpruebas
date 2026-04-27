require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const supabaseClient = require('./supabase-client');

const dbPath = path.join(__dirname, '..', 'config', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Iniciando Migración Masiva a Supabase...');

const migrate = async () => {
    console.log('🔗 Conectando a Supabase...');
    await supabaseClient.connect();

    if (!supabaseClient.isConnected()) {
        console.error('❌ Error: No hay conexión con Supabase. Verifica tus credenciales.');
        process.exit(1);
    }

    db.serialize(async () => {
        try {
            console.log('📦 Extrayendo datos de SQLite...');
            
            const clientes = await new Promise((res, rej) => db.all("SELECT * FROM clientes", (err, rows) => err ? rej(err) : res(rows)));
            const procesos = await new Promise((res, rej) => db.all("SELECT * FROM procesos", (err, rows) => err ? rej(err) : res(rows)));
            const escenarios = await new Promise((res, rej) => db.all("SELECT * FROM escenarios", (err, rows) => err ? rej(err) : res(rows)));

            console.log(`📊 Encontrados: ${clientes.length} clientes, ${procesos.length} procesos, ${escenarios.length} escenarios.`);

            // 1. Migrar Clientes
            for (const c of clientes) {
                console.log(`  -> Sincronizando Cliente: ${c.name}`);
                await supabaseClient.upsertCliente({ id: c.id, nombre: c.name });
            }

            // 2. Migrar Procesos (Proyectos)
            for (const p of procesos) {
                console.log(`  -> Sincronizando Proceso: ${p.name}`);
                await supabaseClient.upsertProyecto({ id: p.id, clienteId: p.client_id, nombre: p.name });
            }

            // 3. Migrar Escenarios
            for (const e of escenarios) {
                console.log(`  -> Sincronizando Escenario: ${e.name}`);
                await supabaseClient.upsertEscenario({
                    id: e.id,
                    proyectoId: e.process_id,
                    nombre: e.name,
                    configJson: e.config_json,
                    scriptContent: '', // Optional, currently pulled via file later
                    instrucciones: e.instrucciones_ia,
                    createdBy: e.created_by || 'AutoBot Migration'
                });
            }

            console.log('✅ Migración Masiva Completada con Éxito. ¡Tus datos están en la nube!');
            process.exit(0);

        } catch (error) {
            console.error('❌ Error durante la migración:', error);
            process.exit(1);
        }
    });
};

migrate();
