const supabaseClient = require('./supabase-client.js');
const { syncFromCloud } = require('./db.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'config', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function test() {
    console.log('--- [1] Probando Conexión Supabase ---');
    const connected = await supabaseClient.connect();
    if (!connected) {
        console.error('❌ Error: No se pudo conectar a Supabase.');
        return;
    }

    console.log('\n--- [2] Ejecutando Sincronización Quirúrgica (Cloud -> Local) ---');
    await syncFromCloud();

    console.log('\n--- [3] Verificando Base de Datos SQLite Local ---');
    db.all("SELECT id, name FROM clientes", [], (err, rows) => {
        if (err) {
            console.error('❌ Error al leer SQLite:', err.message);
            return;
        }
        console.log('✅ Estado actual en SQLite Local:');
        rows.forEach(row => {
            console.log(` - ID: ${row.id.padEnd(10)} | Nombre: ${row.name}`);
        });
        db.close();
    });
}

test();
