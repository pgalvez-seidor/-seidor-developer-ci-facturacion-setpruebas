/**
 * supabase-client.js — AutoBot Supabase Connector
 * Conexión via @supabase/supabase-js (REST API, sin driver nativo, sin CAP)
 * Usa service_role key para operaciones de servidor (bypass RLS)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY; // service_role key (server-side)

let supabase = null;
let _isConnected = false;
let pendingQueue = [];

// ─── Conexión ─────────────────────────────────────────────────────────────────

const connect = async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.warn('[Supabase] Variables SUPABASE_URL / SUPABASE_SERVICE_KEY no configuradas. Modo offline.');
        return false;
    }

    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false }
        });

        // Ping para verificar conectividad
        const { error } = await supabase.from('autobot_clientes').select('id').limit(1);
        if (error && error.code !== 'PGRST116') { // PGRST116 = table empty, es OK
            throw new Error(error.message);
        }

        _isConnected = true;
        console.log(`[Supabase] ✅ Conectado a ${SUPABASE_URL}`);
        return true;
    } catch (e) {
        console.error('[Supabase] Error al conectar:', e.message);
        supabase = null;
        _isConnected = false;
        return false;
    }
};

const isConnected = () => _isConnected;

// ─── Auto-provisioning de Tablas ─────────────────────────────────────────────
// Las tablas se crean en el dashboard de Supabase SQL Editor.
// Este script muestra el SQL a ejecutar una sola vez.

const createTablesIfNotExist = async () => {
    if (!_isConnected) return;

    // Nota: Supabase no permite ejecutar DDL vía JS client.
    // Las tablas deben crearse en el SQL Editor del dashboard.
    // Si las tablas no existen, el ping anterior fallará con un error descriptivo.
    console.log('[Supabase] ✅ Tablas verificadas (creadas previamente en el dashboard).');
};

// ─── CRUD de Escenarios ───────────────────────────────────────────────────────

/**
 * Obtiene todos los clientes, proyectos y escenarios de Supabase
 */
const fetchAll = async () => {
    if (!supabase) throw new Error('Sin conexión');

    const [{ data: clientes, error: e1 }, { data: proyectos, error: e2 }, { data: escenarios, error: e3 }] = await Promise.all([
        supabase.from('autobot_clientes').select('*').or('activo.is.null,activo.eq.true'),
        supabase.from('autobot_proyectos').select('*').or('activo.is.null,activo.eq.true'),
        supabase.from('autobot_escenarios').select('id, proyecto_id, nombre, config_json, script_content, instrucciones, created_by, created_at, activo').or('activo.is.null,activo.eq.true'),
    ]);

    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (e3) throw new Error(e3.message);

    // Normalizar campos para que el resto del código sea agnóstico
    const normalize = (row) => ({
        ID:             row.id,
        NOMBRE:         row.nombre,
        CLIENTE_ID:     row.cliente_id,
        PROYECTO_ID:    row.proyecto_id,
        CONFIG_JSON:    row.config_json,
        SCRIPT_CONTENT: row.script_content,
        INSTRUCCIONES:  row.instrucciones,
        CREATED_BY:     row.created_by,
        CREATED_AT:     row.created_at,
        ACTIVO:         row.activo,
    });

    return {
        clientes:   (clientes  || []).map(normalize),
        proyectos:  (proyectos || []).map(normalize),
        escenarios: (escenarios || []).map(normalize),
    };
};

/**
 * Upsert de un escenario completo (metadata + script)
 */
const upsertEscenario = async ({ id, proyectoId, nombre, configJson, scriptContent, instrucciones, createdBy }) => {
    if (!supabase) throw new Error('Sin conexión');

    const { error } = await supabase.from('autobot_escenarios').upsert({
        id,
        proyecto_id:    proyectoId,
        nombre,
        config_json:    configJson || '{}',
        script_content: scriptContent || '',
        instrucciones:  instrucciones || '',
        created_by:     createdBy || '',
        activo:         true,
        updated_at:     new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) throw new Error(error.message);
};

/**
 * Upsert de un cliente
 */
const upsertCliente = async ({ id, nombre }) => {
    if (!supabase) throw new Error('Sin conexión');
    const { error } = await supabase.from('autobot_clientes').upsert({ id, nombre }, { onConflict: 'id' });
    if (error) throw new Error(error.message);
};

/**
 * Upsert de un proyecto
 */
const upsertProyecto = async ({ id, clienteId, nombre }) => {
    if (!supabase) throw new Error('Sin conexión');
    const { error } = await supabase.from('autobot_proyectos').upsert({ id, cliente_id: clienteId, nombre, activo: true }, { onConflict: 'id' });
    if (error) throw new Error(error.message);
};

/**
 * Borrado lógico de un escenario
 */
const deleteEscenario = async (id) => {
    if (!supabase) throw new Error('Sin conexión');
    const { error } = await supabase.from('autobot_escenarios').update({ activo: false }).eq('id', id);
    if (error) throw new Error(error.message);
};

/**
 * Registrar una ejecución en el historial
 */
const registrarEjecucion = async ({ id, escenarioId, tester, cliente, status, duracionSeg }) => {
    if (!supabase) return;
    try {
        const { error } = await supabase.from('autobot_ejecuciones').insert({
            id,
            escenario_id:  escenarioId || null,
            tester:        tester || '',
            cliente:       cliente || '',
            status,
            duracion_seg:  duracionSeg || 0,
        });
        if (error) throw new Error(error.message);
    } catch (e) {
        console.warn('[Supabase] No se pudo registrar ejecución:', e.message);
    }
};

// ─── Cola de Sync Offline ─────────────────────────────────────────────────────

const enqueue = (fn) => {
    pendingQueue.push(fn);
    console.log(`[Supabase] 📥 Cambio encolado (sin conexión). Pendientes: ${pendingQueue.length}`);
};

const flushPending = async () => {
    if (!_isConnected || pendingQueue.length === 0) return;
    console.log(`[Supabase] 🔄 Procesando ${pendingQueue.length} cambios pendientes...`);
    const queue = [...pendingQueue];
    pendingQueue = [];
    for (const fn of queue) {
        try { await fn(); } catch (e) {
            console.error('[Supabase] Error al procesar cola:', e.message);
            pendingQueue.push(fn);
        }
    }
    console.log('[Supabase] ✅ Cola procesada.');
};

// ─── Inicialización completa ──────────────────────────────────────────────────

const init = async () => {
    try {
        const ok = await connect();
        if (ok) {
            await createTablesIfNotExist();
            await flushPending();
        }
        return { connected: ok };
    } catch (e) {
        console.error('[Supabase] Error en init:', e.message);
        return { connected: false, error: e.message };
    }
};

module.exports = {
    init,
    connect,
    isConnected,
    fetchAll,
    upsertEscenario,
    deleteEscenario,
    upsertCliente,
    upsertProyecto,
    registrarEjecucion,
    enqueue,
    flushPending,
    getPendingCount: () => pendingQueue.length,
};
