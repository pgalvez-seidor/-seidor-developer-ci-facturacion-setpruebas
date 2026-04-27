/**
 * hana-client.js — AutoBot SAP HANA Cloud Connector
 * Conexión directa via @sap/hana-client (SQL nativo, sin CAP, sin BTP deploy)
 * Basic Auth con usuario técnico AUTOBOT_USER
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

let hanaClient;
try {
    hanaClient = require('@sap/hana-client');
} catch (e) {
    console.warn('[HANA] @sap/hana-client no instalado. Modo solo-SQLite activo.');
    hanaClient = null;
}

const SCHEMA = process.env.HANA_SCHEMA || 'AUTOBOT';

let connection = null;
let _isConnected = false;
let pendingQueue = []; // cola de escrituras mientras no hay conexión

// ─── Conexión ────────────────────────────────────────────────────────────────

const connect = async () => {
    if (!hanaClient) {
        console.warn('[HANA] Driver no disponible. Saltando conexión.');
        return false;
    }
    if (_isConnected && connection) return true;

    const host = process.env.HANA_HOST;
    const port = parseInt(process.env.HANA_PORT || '443');
    const user = process.env.HANA_USER;
    const pass = process.env.HANA_PASS;

    if (!host || !user || !pass) {
        console.warn('[HANA] Variables HANA_HOST / HANA_USER / HANA_PASS no configuradas. Modo offline.');
        return false;
    }

    return new Promise((resolve) => {
        connection = hanaClient.createConnection();
        const params = {
            serverNode: `${host}:${port}`,
            uid: user,
            pwd: pass,
            encrypt: true,
            sslValidateCertificate: false,
        };

        connection.connect(params, (err) => {
            if (err) {
                console.error('[HANA] Error al conectar:', err.message);
                connection = null;
                _isConnected = false;
                resolve(false);
            } else {
                _isConnected = true;
                console.log(`[HANA] ✅ Conectado a ${host} como ${user}`);
                resolve(true);
            }
        });
    });
};

const isConnected = () => _isConnected;

// ─── Query Helper ─────────────────────────────────────────────────────────────

const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (!connection || !_isConnected) {
            return reject(new Error('Sin conexión a HANA'));
        }
        connection.exec(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
};

// ─── Auto-provisioning de Tablas ─────────────────────────────────────────────

const createTablesIfNotExist = async () => {
    if (!_isConnected) return;

    const ddls = [
        `CREATE TABLE IF NOT EXISTS ${SCHEMA}.AUTOBOT_CLIENTES (
            ID         NVARCHAR(50)  PRIMARY KEY,
            NOMBRE     NVARCHAR(100) NOT NULL,
            ACTIVO     BOOLEAN       DEFAULT TRUE,
            CREATED_AT TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS ${SCHEMA}.AUTOBOT_PROYECTOS (
            ID         NVARCHAR(50)  PRIMARY KEY,
            CLIENTE_ID NVARCHAR(50)  NOT NULL,
            NOMBRE     NVARCHAR(100) NOT NULL,
            FOREIGN KEY (CLIENTE_ID) REFERENCES ${SCHEMA}.AUTOBOT_CLIENTES(ID)
        )`,
        `CREATE TABLE IF NOT EXISTS ${SCHEMA}.AUTOBOT_ESCENARIOS (
            ID             NVARCHAR(100) PRIMARY KEY,
            PROYECTO_ID    NVARCHAR(50)  NOT NULL,
            NOMBRE         NVARCHAR(200) NOT NULL,
            CONFIG_JSON    NCLOB,
            SCRIPT_CONTENT NCLOB,
            INSTRUCCIONES  NCLOB,
            VERSION        INTEGER       DEFAULT 1,
            CREATED_BY     NVARCHAR(100),
            CREATED_AT     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            UPDATED_AT     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (PROYECTO_ID) REFERENCES ${SCHEMA}.AUTOBOT_PROYECTOS(ID)
        )`,
        `CREATE TABLE IF NOT EXISTS ${SCHEMA}.AUTOBOT_EJECUCIONES (
            ID           NVARCHAR(100) PRIMARY KEY,
            ESCENARIO_ID NVARCHAR(100),
            TESTER       NVARCHAR(100),
            CLIENTE      NVARCHAR(100),
            STATUS       NVARCHAR(20),
            DURACION_SEG DECIMAL(10,2),
            EXECUTED_AT  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const ddl of ddls) {
        try {
            await query(ddl);
        } catch (e) {
            // HANA puede no soportar IF NOT EXISTS en todos los casos — ignorar si ya existe
            if (!e.message.includes('already exists') && !e.message.includes('258')) {
                console.error('[HANA] Error creando tabla:', e.message);
            }
        }
    }

    console.log('[HANA] ✅ Tablas verificadas/creadas en schema:', SCHEMA);
};

// ─── CRUD de Escenarios ───────────────────────────────────────────────────────

/**
 * Obtiene todos los clientes, proyectos y escenarios de HANA
 */
const fetchAll = async () => {
    const clientes  = await query(`SELECT * FROM ${SCHEMA}.AUTOBOT_CLIENTES WHERE ACTIVO = TRUE`);
    const proyectos = await query(`SELECT * FROM ${SCHEMA}.AUTOBOT_PROYECTOS`);
    const escenarios = await query(`SELECT ID, PROYECTO_ID, NOMBRE, CONFIG_JSON, SCRIPT_CONTENT, INSTRUCCIONES, CREATED_BY, CREATED_AT FROM ${SCHEMA}.AUTOBOT_ESCENARIOS`);
    return { clientes, proyectos, escenarios };
};

/**
 * Upsert de un escenario completo (metadata + script)
 */
const upsertEscenario = async ({ id, proyectoId, nombre, configJson, scriptContent, instrucciones, createdBy }) => {
    // Intentar UPDATE primero
    const updated = await query(
        `UPDATE ${SCHEMA}.AUTOBOT_ESCENARIOS
         SET NOMBRE = ?, CONFIG_JSON = ?, SCRIPT_CONTENT = ?, INSTRUCCIONES = ?, UPDATED_AT = CURRENT_TIMESTAMP, VERSION = VERSION + 1
         WHERE ID = ?`,
        [nombre, configJson || '{}', scriptContent || '', instrucciones || '', id]
    );

    // Si no existía, INSERT
    const rowCount = updated?.rowsAffected || 0;
    if (rowCount === 0) {
        await query(
            `INSERT INTO ${SCHEMA}.AUTOBOT_ESCENARIOS (ID, PROYECTO_ID, NOMBRE, CONFIG_JSON, SCRIPT_CONTENT, INSTRUCCIONES, CREATED_BY)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, proyectoId, nombre, configJson || '{}', scriptContent || '', instrucciones || '', createdBy || '']
        );
    }
};

/**
 * Upsert de un cliente
 */
const upsertCliente = async ({ id, nombre }) => {
    const rows = await query(`SELECT ID FROM ${SCHEMA}.AUTOBOT_CLIENTES WHERE ID = ?`, [id]);
    if (rows.length === 0) {
        await query(`INSERT INTO ${SCHEMA}.AUTOBOT_CLIENTES (ID, NOMBRE) VALUES (?, ?)`, [id, nombre]);
    }
};

/**
 * Upsert de un proyecto
 */
const upsertProyecto = async ({ id, clienteId, nombre }) => {
    const rows = await query(`SELECT ID FROM ${SCHEMA}.AUTOBOT_PROYECTOS WHERE ID = ?`, [id]);
    if (rows.length === 0) {
        await query(`INSERT INTO ${SCHEMA}.AUTOBOT_PROYECTOS (ID, CLIENTE_ID, NOMBRE) VALUES (?, ?, ?)`, [id, clienteId, nombre]);
    }
};

/**
 * Registrar una ejecución en el historial
 */
const registrarEjecucion = async ({ id, escenarioId, tester, cliente, status, duracionSeg }) => {
    try {
        await query(
            `INSERT INTO ${SCHEMA}.AUTOBOT_EJECUCIONES (ID, ESCENARIO_ID, TESTER, CLIENTE, STATUS, DURACION_SEG)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, escenarioId || '', tester || '', cliente || '', status, duracionSeg || 0]
        );
    } catch (e) {
        console.warn('[HANA] No se pudo registrar ejecución:', e.message);
    }
};

// ─── Cola de Sync Offline ─────────────────────────────────────────────────────

const enqueue = (fn) => {
    pendingQueue.push(fn);
    console.log(`[HANA] 📥 Cambio encolado (sin conexión). Pendientes: ${pendingQueue.length}`);
};

const flushPending = async () => {
    if (!_isConnected || pendingQueue.length === 0) return;
    console.log(`[HANA] 🔄 Procesando ${pendingQueue.length} cambios pendientes...`);
    const queue = [...pendingQueue];
    pendingQueue = [];
    for (const fn of queue) {
        try { await fn(); } catch (e) {
            console.error('[HANA] Error al procesar cola:', e.message);
            pendingQueue.push(fn); // re-encolar si falla
        }
    }
    console.log('[HANA] ✅ Cola procesada.');
};

// ─── Inicialización completa ──────────────────────────────────────────────────

/**
 * Llama esto al arrancar el servidor.
 * Devuelve { connected, error } sin lanzar excepción.
 */
const init = async () => {
    try {
        const ok = await connect();
        if (ok) {
            await createTablesIfNotExist();
            await flushPending();
        }
        return { connected: ok };
    } catch (e) {
        console.error('[HANA] Error en init:', e.message);
        return { connected: false, error: e.message };
    }
};

module.exports = {
    init,
    connect,
    isConnected,
    query,
    fetchAll,
    upsertEscenario,
    upsertCliente,
    upsertProyecto,
    registrarEjecucion,
    enqueue,
    flushPending,
    getPendingCount: () => pendingQueue.length,
};
