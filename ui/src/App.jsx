import { useState, useEffect, useCallback } from 'react';
import {
  Eye, Zap, CreditCard, Banknote, Trash2,
  CheckCircle2, AlertCircle, Clock, Info, ChevronRight, X, Circle, Square
} from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:3001/api';

const CLIENTS = [
  { id: 'CI', name: 'Clínica Internacional', icon: <div style={{ width: '24px', height: '24px', background: 'var(--accent-primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>CI</div>, env: 'QAS' },
];

const MEDIOS_VUELTO = ["Efectivo", "Depósito CTA", "Nota de Crédito"];

const Sidebar = ({
  registry, activeClient, setActiveClient,
  activeProcess, setActiveProcess,
  currentBranch, branches, handleBranchChange,
  setShowAbout
}) => {
  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
        <img
          src="/seidor-logo.png"
          alt="Seidor Peru"
          style={{ width: '90%', height: 'auto', objectFit: 'contain', marginLeft: '-5px' }}
        />
        <span style={{ fontWeight: '800', fontSize: '1.4rem', letterSpacing: '-0.05em', color: 'var(--accent-primary)', alignSelf: 'flex-end', paddingRight: '15px' }}>AutoBot</span>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Entorno Git</div>
        <select className="branch-select" value={currentBranch} onChange={handleBranchChange}>
          <option value="">-- seleccionar --</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="sidebar-section" style={{ flex: 1, marginTop: '2rem' }}>
        <div className="sidebar-label">Mis Proyectos</div>
        {registry.map(c => (
          <div key={c.id} className={`client-item ${activeClient === c.id ? 'active' : ''}`} onClick={() => { setActiveClient(c.id); setActiveProcess(c.procesos[0]?.id || ''); }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>{c.icon || <Info size={18} />}</span>
            <div className="client-name">{c.name}</div>
          </div>
        ))}

        {activeClient && (
          <div style={{ marginTop: '2rem' }}>
            <div className="sidebar-label">Proceso Analítico</div>
            <select className="branch-select" value={activeProcess} onChange={e => setActiveProcess(e.target.value)}>
              {registry.find(c => c.id === activeClient)?.procesos.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div onClick={() => setShowAbout(true)} style={{ opacity: 0.4, fontSize: '0.7rem', textAlign: 'center', cursor: 'pointer', transition: 'opacity 0.2s' }}>
        AutoBot v1.0.0 by Pierre Gálvez Larriega for Seidor Peru
      </div>
    </aside>
  );
};

const PaymentTray = ({ pagos, medioVuelto, updatePagos, updateMedioVuelto }) => {
  const addPago = (tipo) => updatePagos([...pagos, { id: Date.now(), tipo, monto: '', autoData: true }]);
  const removePago = (id) => updatePagos(pagos.filter(p => p.id !== id));
  const updMonto = (id, val) => updatePagos(pagos.map(p => p.id === id ? { ...p, monto: val } : p));
  const updAuto = (id, auto) => updatePagos(pagos.map(p => p.id === id ? { ...p, autoData: auto } : p));

  const total = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
  const showVuelto = total > 0 && pagos.some(p => p.tipo === 'Efectivo');

  return (
    <div className="payment-tray">
      <div className="tray-header">Métodos de Pago</div>

      <div className="tray-adders" style={{ marginBottom: pagos.length > 0 ? '1.5rem' : '0' }}>
        <button className="btn-payment-method" onClick={() => addPago('Efectivo')}>
          <Banknote size={18} color="var(--accent-primary)" strokeWidth={1.5} />
          <span>Efectivo</span>
        </button>
        <button className="btn-payment-method" onClick={() => addPago('Tarjeta')}>
          <CreditCard size={18} color="var(--accent-primary)" strokeWidth={1.5} />
          <span>Tarjeta</span>
        </button>
      </div>

      <div className="tray-items">
        {pagos.map((p) => (
          <div key={p.id} className={`tray-item type-${p.tipo.toLowerCase()}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>{p.tipo.toUpperCase()}</strong>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => removePago(p.id)}>
                <X size={14} />
              </button>
            </div>
            <div className="tray-inputs">
              <input type="number" placeholder="Monto (Opcional)" value={p.monto} onChange={e => updMonto(p.id, e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            {p.tipo === 'Tarjeta' && (
              <div style={{ marginTop: '0.8rem' }}>
                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input type="checkbox" checked={p.autoData} onChange={e => updAuto(p.id, e.target.checked)} />
                  Auto-generar datos (ID/Bin)
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      {showVuelto && (
        <div style={{ background: 'rgba(241, 196, 15, 0.1)', border: '1px solid rgba(241, 196, 15, 0.3)', padding: '1rem', borderRadius: '12px', marginTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#f1c40f', marginBottom: '8px' }}>MEDIO DE VUELTO</div>
          <select value={medioVuelto || "Efectivo"} onChange={(e) => updateMedioVuelto(e.target.value)} style={{ width: '100%', background: 'white', border: '1px solid var(--card-border)', color: 'var(--text-main)', padding: '8px', borderRadius: '8px' }}>
            {MEDIOS_VUELTO.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [registry, setRegistry] = useState([]);
  const [activeClient, setActiveClient] = useState('Medifarma');
  const [activeProcess, setActiveProcess] = useState('mf_flujos');

  const [branches, setBranches] = useState([]);
  const [currentBranch, setBranch] = useState('');

  const [activeScenarioId, setActiveScenarioId] = useState('');
  const [newScenarioName, setNewScenarioName] = useState('');
  const [instruccionesIa, setInstruccionesIa] = useState('');

  const [builderConfig, setBuilderConfig] = useState({
    iteraciones: 1,
    headless: true,
    tipoComprobante: 'Boleta',
    ruc: '',
    medioVuelto: 'Efectivo',
    pagos: [],
    area: 'AMBULATORIA-ADMISION',
    periodo: '02-2026',
    usuarioCajero: 'PGALVEZ3',
    codigoCentro: '4',
    prefacturaBase: ''
  });

  const [queue, setQueue] = useState([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchConcurrency, setBatchConcurrency] = useState(5);
  const [globalPdf, setGlobalPdf] = useState(null);

  const [toasts, setToasts] = useState([]);
  const [showAbout, setShowAbout] = useState(false);

  // Grabación de flujos (Playwright Codegen)
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingName, setRecordingName] = useState('');
  const [recordingCredentials, setRecordingCredentials] = useState({ username: '', password: '', appName: '' });
  const [recordingExtraData, setRecordingExtraData] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const CHANGELOG = [
    { version: '1.1.0', date: '2026-04-19', changes: ['Rama Medifarma — cliente independiente', 'Grabación de flujos sin código (Playwright Codegen)', 'Botón Grabar Flujo Nuevo en dashboard', 'Flujos grabados guardados automáticamente en SQLite'] },
    { version: '1.0.0', date: '2026-03-01', changes: ['Rebranding total a AutoBot', 'Interfaz Premium Seidor Perú', 'Concurrencia dinámica (Threads)', 'Modo Turbo (Timeouts optimizados)', 'Limpieza inteligente de fragments SAP'] },
    { version: '0.9.0', date: '2026-02-28', changes: ['Integración de reportes PDF', 'Detección de errores de negocio', 'Sistema de logs SSE en tiempo real'] }
  ];

  const addToast = (msg, type = 'error') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 8000);
  };

  const handleOpenPdf = async (pdfUrl) => {
    try { await fetch(`${API_BASE}/open-pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdfUrl }) }); }
    catch (err) {
      console.error("Open PDF Error:", err);
      addToast("Error al abrir PDF nativo.", "error");
    }
  };

  const fetchRegistry = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/registry`);
      const data = await res.json();
      setRegistry(data);
    } catch (err) {
      console.error("Fetch Registry Error:", err);
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/branches`).then(r => r.json()).then(d => { setBranches(d.branches || []); setBranch(d.current || ''); }).catch(() => { });
    fetchRegistry();
  }, [fetchRegistry]);

  const handleBranchChange = async e => {
    const branch = e.target.value;
    if (branch === currentBranch) return;
    try {
      const r = await fetch(`${API_BASE}/checkout`, { method: 'POST', body: JSON.stringify({ branch }), headers: { 'Content-Type': 'application/json' } });
      if ((await r.json()).success) setBranch(branch);
    } catch (err) {
      console.error("Branch Change Error:", err);
    }
  };

  const handleScenarioSelect = (scenarioId) => {
    setActiveScenarioId(scenarioId);
    if (!scenarioId) { setNewScenarioName(''); setInstruccionesIa(''); return; }
    const sData = registry.find(c => c.id === activeClient)?.procesos.find(p => p.id === activeProcess)?.escenarios.find(e => e.id === scenarioId);
    if (sData) {
      setBuilderConfig(JSON.parse(JSON.stringify(sData.config)));
      setNewScenarioName(sData.name);
      setInstruccionesIa(sData.instrucciones_ia || "");
    }
  };

  const saveScenario = async () => {
    if (!newScenarioName.trim()) { addToast("Ingresa un nombre para el escenario", "error"); return; }
    const scenarioToSave = { id: activeScenarioId || `esc_${Date.now()}`, name: newScenarioName.trim(), instrucciones_ia: instruccionesIa, config: builderConfig };
    try {
      const res = await fetch(`${API_BASE}/registry/scenario`, { method: 'POST', body: JSON.stringify({ clientId: activeClient, processId: activeProcess, scenario: scenarioToSave }), headers: { 'Content-Type': 'application/json' } });
      if ((await res.json()).success) { await fetchRegistry(); setActiveScenarioId(scenarioToSave.id); addToast("Escenario guardado en SQLite.", "success"); }
    } catch { addToast("Error al guardar escenario.", "error"); }
  };

  const deleteScenario = async () => {
    if (!activeScenarioId || !window.confirm("¿Eliminar permanentemente?")) return;
    try {
      const res = await fetch(`${API_BASE}/registry/scenario/${activeScenarioId}`, { method: 'DELETE' });
      if ((await res.json()).success) { await fetchRegistry(); setActiveScenarioId(''); setNewScenarioName(''); setInstruccionesIa(''); addToast("Escenario eliminado.", "success"); }
    } catch { addToast("Error al eliminar.", "error"); }
  };

  const addExtraField = () => setRecordingExtraData(prev => [...prev, { key: '', value: '' }]);
  const removeExtraField = (i) => setRecordingExtraData(prev => prev.filter((_, idx) => idx !== i));
  const updateExtraField = (i, field, val) => setRecordingExtraData(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const startRecording = async () => {
    if (!recordingUrl.trim()) { addToast("Ingresa una URL de inicio", "error"); return; }
    if (!recordingName.trim()) { addToast("Ingresa un nombre para el flujo", "error"); return; }
    try {
      const safeName = recordingName.replace(/\s+/g, '_').toLowerCase();
      const res = await fetch(`${API_BASE}/record/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: recordingUrl,
          outputName: safeName,
          credentials: recordingCredentials,
          extraData: recordingExtraData
        })
      });
      const data = await res.json();
      if (data.recordingId) {
        setRecordingId(data.recordingId);
        setIsRecording(true);
      } else {
        addToast("No se pudo iniciar la grabación", "error");
      }
    } catch { addToast("Error al conectar con el servidor", "error"); }
  };

  const stopRecording = async () => {
    try {
      const res = await fetch(`${API_BASE}/record/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordingId,
          scenarioName: recordingName,
          clientId: activeClient,
          processId: 'mf_flujos',
          credentials: recordingCredentials,
          extraData: recordingExtraData
        })
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Flujo "${recordingName}" guardado correctamente.`, "success");
        await fetchRegistry();
        setIsRecording(false);
        setShowRecordModal(false);
        setRecordingUrl('');
        setRecordingName('');
        setRecordingId('');
        setRecordingCredentials({ username: '', password: '', appName: '' });
        setRecordingExtraData([]);
      } else {
        addToast("Error al guardar el flujo grabado", "error");
      }
    } catch { addToast("Error al detener la grabación", "error"); }
  };

  const addToBatch = () => {
    if (activeProcess === 'facturacion') {
      if (!builderConfig.pagos || builderConfig.pagos.length === 0) { addToast("Agrega un medio de pago.", "error"); return; }
      if (builderConfig.tipoComprobante === 'Factura' && !builderConfig.ruc.trim()) { addToast("El RUC es obligatorio para Facturas.", "error"); return; }
    }
    const newItems = [];
    const baseId = Date.now();
    const prefBase = parseInt(builderConfig.prefacturaBase) || 0;
    for (let i = 0; i < builderConfig.iteraciones; i++) {
      const cfg = JSON.parse(JSON.stringify({ ...builderConfig, iteraciones: 1 }));
      // Si hay número base de pre-factura, asignar N, N+1, N+2... a cada copia
      if (prefBase > 0) cfg.prefacturaId = (prefBase + i).toString();
      newItems.push({
        taskId: `task_${baseId}_${i}`,
        status: 'idle',
        progress: 0,
        result: null,
        currentLog: '',
        config: cfg
      });
    }
    setQueue(q => [...q, ...newItems]);
  };

  const clearBatch = () => { if (!isBatchRunning) setQueue([]); setGlobalPdf(null); };

  const removeTask = (taskId) => {
    if (isBatchRunning) {
      addToast("No se puede eliminar tareas mientras el lote está en ejecución.", "error");
      return;
    }
    if (window.confirm("¿Estás seguro de que deseas eliminar esta tarea del lote?")) {
      setQueue(prev => prev.filter(t => t.taskId !== taskId));
    }
  };

  const runBatch = async () => {
    if (queue.length === 0 || isBatchRunning) return;
    setIsBatchRunning(true);
    setGlobalPdf(null);

    setQueue(q => q.map(t => (t.status === 'idle' || t.status === 'error') ? { ...t, status: 'running', progress: 5, result: null, currentLog: 'Iniciando...' } : t));

    const tasksToRun = queue.filter(t => t.status === 'idle' || t.status === 'error');
    const processScripts = { 'facturacion': 'caso1-boleta.spec.js', 'horarios': 'caso-horario-supervisor.spec.js', 'horario_supervisor': 'caso-horario-supervisor.spec.js', 'horario_cajero': 'caso-horario-cajero.spec.js' };

    try {
      const response = await fetch(`${API_BASE}/run-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasksToRun.map(t => ({ taskId: t.taskId, config: t.config, file: processScripts[activeProcess] || 'caso1-boleta.spec.js' })),
          parallel: batchConcurrency > 1,
          concurrency: batchConcurrency
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (chunk.startsWith('data: ')) {
            try {
              const d = JSON.parse(chunk.substring(6));
              const { taskId, type, docData } = d;
              const msg = d.message || "";

              setQueue(q => q.map(t => {
                if (t.taskId !== taskId && taskId !== 'orchestrator') return t;

                let newProg = t.progress;
                let newSt = t.status;
                let newRes = t.result;
                let newLog = t.currentLog;
                let newPdfUrl = t.pdfUrl;

                if (type === 'business_error') {
                  newRes = msg; // Persistir detalle del error en la fila
                  newSt = 'error';
                  newProg = 100;
                  addToast(msg, 'error');
                } else if (type === 'log') {
                  newProg = Math.min(95, newProg + 2);
                  if (/[⏳💳✅🔄👉❌]/u.test(msg)) newLog = msg.replace(/\[Worker \d+\]\s*/, '').trim();
                } else if (type === 'result') {
                  newRes = docData || msg;
                } else if (type === 'done') {
                  if (taskId !== 'orchestrator') {
                    newSt = 'done';
                    newProg = 100;
                    if (!newRes) newRes = "Validación Exitosa";
                  }
                } else if (type === 'error') {
                  newSt = 'error';
                  newProg = 100;
                  newRes = msg.split('\n')[0].replace(/\[Worker \d+\]\s*/, '').replace('Error:', '').trim();
                } else if (type === 'pdf') {
                  newPdfUrl = docData || msg;
                } else if (type === 'pdf_global') {
                  setGlobalPdf(docData);
                  addToast("¡Reporte Global Listo!", "success");
                }

                return { ...t, progress: newProg, status: newSt, result: newRes, currentLog: newLog, pdfUrl: newPdfUrl };
              }));
            } catch (e) { console.error("JSON Parse Error in SSE:", e); }
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (err) {
      console.error("Batch Stream Error:", err);
      addToast("Error en la conexión con el servidor.", "error");
    }
    finally { setIsBatchRunning(false); }
  };

  return (
    <div className="app">
      <div className="body">
        <Sidebar
          registry={registry} activeClient={activeClient} setActiveClient={setActiveClient}
          activeProcess={activeProcess} setActiveProcess={setActiveProcess}
          currentBranch={currentBranch} branches={branches} handleBranchChange={handleBranchChange}
          setShowAbout={setShowAbout}
        />

        <main className="main split-layout">
          <div className="config-panel">
            <h2>Configuración del Escenario</h2>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '1.2rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
              <label>Escenario Guardado</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <select style={{ flex: 1 }} value={activeScenarioId} onChange={e => handleScenarioSelect(e.target.value)}>
                  <option value="">-- Nuevo (En Blanco) --</option>
                  {registry.find(c => c.id === activeClient)?.procesos.find(p => p.id === activeProcess)?.escenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={deleteScenario} disabled={!activeScenarioId} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '0 12px', cursor: 'pointer' }}>Borrar</button>
              </div>
            </div>

            <button
              onClick={() => setShowRecordModal(true)}
              style={{
                width: '100%', marginBottom: '1.5rem', padding: '12px',
                background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px',
                cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Circle size={14} fill="#ef4444" color="#ef4444" />
              Grabar Flujo Nuevo
            </button>

            <div className="config-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {activeClient !== 'Medifarma' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label>Tipo Comprobante</label>
                    <select value={builderConfig.tipoComprobante} onChange={e => setBuilderConfig({ ...builderConfig, tipoComprobante: e.target.value })}>
                      <option value="Boleta">Boleta</option>
                      <option value="Factura">Factura</option>
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label>Iteraciones</label>
                  <input type="number" min="1" value={builderConfig.iteraciones} onChange={e => setBuilderConfig({ ...builderConfig, iteraciones: parseInt(e.target.value) || 1 })} />
                </div>
              </div>

              {activeClient !== 'Medifarma' && builderConfig.tipoComprobante === 'Factura' && (
                <div style={{ marginTop: '1rem', background: 'rgba(52, 152, 219, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(52, 152, 219, 0.2)' }}>
                  <label style={{ color: '#3498db', fontWeight: '800', fontSize: '0.7rem', display: 'block', marginBottom: '8px' }}>DATOS FISCALES OBLIGATORIOS</label>
                  <input
                    type="text"
                    placeholder="Ingrese RUC (11 dígitos)"
                    maxLength="11"
                    value={builderConfig.ruc}
                    onChange={e => setBuilderConfig({ ...builderConfig, ruc: e.target.value.replace(/\D/g, '') })}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--card-border)', background: 'white', color: 'var(--text-main)' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                <input type="checkbox" checked={builderConfig.headless} onChange={e => setBuilderConfig({ ...builderConfig, headless: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Ejecutar en Segundo Plano (Headless)</span>
              </div>

              {activeProcess === 'facturacion' && (
                <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                  <div style={{ gridColumn: 'span 2', fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '5px' }}>Destino de Pre-Factura API</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label>Usuario Cajero</label>
                    <input type="text" value={builderConfig.usuarioCajero} onChange={e => setBuilderConfig({ ...builderConfig, usuarioCajero: e.target.value.toUpperCase() })} placeholder="Eje: PGALVEZ3" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label>Código Centro</label>
                    <input type="text" maxLength="8" value={builderConfig.codigoCentro} onChange={e => setBuilderConfig({ ...builderConfig, codigoCentro: e.target.value })} placeholder="Eje: 4" />
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      N° Pre-Factura
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '400' }}>(opcional — si hay varias copias, se incrementa automáticamente)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Ej: 1393497298 — vacío = API lo crea sola"
                      value={builderConfig.prefacturaBase}
                      onChange={e => setBuilderConfig({ ...builderConfig, prefacturaBase: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {activeClient !== 'Medifarma' && (
                <PaymentTray pagos={builderConfig.pagos} medioVuelto={builderConfig.medioVuelto} updatePagos={p => setBuilderConfig({ ...builderConfig, pagos: p })} updateMedioVuelto={v => setBuilderConfig({ ...builderConfig, medioVuelto: v })} />
              )}

              <div style={{ marginTop: '1rem' }}>
                <label>Nombre del Escenario</label>
                <input type="text" placeholder="Ej: Pago Efectivo 100%" value={newScenarioName} onChange={e => setNewScenarioName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginTop: '8px' }} />

                <label style={{ marginTop: '1.2rem', display: 'block' }}>Instrucciones Detalladas</label>
                <textarea placeholder="Describe el flujo para la bitácora..." value={instruccionesIa} onChange={e => setInstruccionesIa(e.target.value)} style={{ width: '100%', height: '80px', boxSizing: 'border-box', marginTop: '8px' }} />

                <button className="btn-run" style={{ width: '100%', marginTop: '1rem', background: 'white', color: 'var(--text-main)', border: '1px solid var(--card-border)', boxShadow: 'none' }} onClick={saveScenario}>Guardar Configuración Permanente</button>
              </div>

              <button className="btn-run" style={{ marginTop: '1.5rem', background: 'var(--accent-success)', color: 'white', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }} onClick={addToBatch}>＋ Añadir al Lote de Pruebas</button>
            </div>
          </div>

          <div className="batch-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>Lote de Ejecución ({queue.length})</h2>
              {queue.length > 0 && <button onClick={clearBatch} disabled={isBatchRunning} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>🗑 Limpiar Lote</button>}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {queue.length === 0 ? (
                <div style={{ border: '2px dashed var(--card-border)', borderRadius: '16px', padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>El lote está vacío. Configura un caso y añádelo.</div>
              ) : (
                queue.map((q, idx) => (
                  <div key={q.taskId} className="batch-item">
                    <div className="batch-item-top">
                      <span className="b-title">
                        {idx + 1}. {q.config.tipoComprobante || q.config.area || 'Horario'} - {q.config.pagos && q.config.pagos.length > 0 ? q.config.pagos.map(p => p.tipo).join('+') : (q.config.periodo || q.config.semana || 'Configurado')}
                        <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }} title={q.config.headless ? "Modo Headless (Oculto)" : "Modo Headed (Visible)"}>
                          {q.config.headless ? (
                            <Zap size={14} color="var(--accent-primary)" strokeWidth={2} />
                          ) : (
                            <Eye size={14} color="var(--accent-primary)" strokeWidth={2} />
                          )}
                        </span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`status-tag ${q.status === 'done' ? 'success' : q.status === 'error' ? 'error' : q.status === 'running' ? 'running' : ''}`}>
                          {q.status === 'idle' ? 'Pendiente' :
                            q.status === 'running' ? <><Clock size={12} style={{ marginRight: '4px' }} /> Procesando</> :
                              q.status === 'done' ? <><CheckCircle2 size={12} style={{ marginRight: '4px' }} /> Éxito</> :
                                <><AlertCircle size={12} style={{ marginRight: '4px' }} /> Fallo</>}
                        </span>
                        {q.status !== 'running' && (
                          <button
                            onClick={() => removeTask(q.taskId)}
                            disabled={isBatchRunning}
                            title="Quitar de la lista"
                            className="btn-remove-task"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {q.status === 'running' && (
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' }}>
                        <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${q.progress}%`, transition: 'width 0.4s ease' }} />
                      </div>
                    )}

                    {q.result && (
                      <div className="b-result-detail">
                        <span className={q.status === 'error' ? 'b-error-msg' : ''}>
                          {q.status === 'error' ? `Detalle: ${q.result}` : `Resultado: ${q.result}`}
                        </span>
                        {q.pdfUrl && <button className="btn-open-pdf" onClick={() => handleOpenPdf(q.pdfUrl)}>VER PDF</button>}
                      </div>
                    )}

                    {q.status === 'running' && q.currentLog && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>{q.currentLog}</div>
                    )}
                  </div>
                ))
              )}
            </div>

            {queue.length > 0 && (
              <div className="batch-footer">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Hilos en Paralelo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="range" min="1" max="50" step="1"
                      value={batchConcurrency}
                      onChange={(e) => setBatchConcurrency(parseInt(e.target.value))}
                      disabled={isBatchRunning}
                      style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                    />
                    <input
                      type="number" min="1" max="100"
                      value={batchConcurrency}
                      onChange={(e) => setBatchConcurrency(parseInt(e.target.value) || 1)}
                      disabled={isBatchRunning}
                      className="concurrency-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
                  {globalPdf && <button className="btn-run-all" onClick={() => handleOpenPdf(globalPdf)} style={{ background: 'var(--text-main)', color: 'white' }}>📄 REPORTE GLOBAL</button>}
                  <button className="btn-run-all" onClick={runBatch} disabled={isBatchRunning}>
                    {isBatchRunning ? 'PROCESANDO...' : `EJECUTAR ${queue.length} PRUEBAS`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showRecordModal && (
        <div className="modal-overlay" onClick={() => !isRecording && setShowRecordModal(false)}>
          <div className="modal-content about-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>Grabar Flujo de Prueba</h2>
              {!isRecording && (
                <button onClick={() => setShowRecordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  <X size={20} />
                </button>
              )}
            </div>

            {!isRecording ? (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  Se abrirá el navegador. Realiza las acciones que quieres automatizar y cuando termines haz clic en <strong>Detener Grabación</strong>.
                </p>

                {/* Sección: Flujo */}
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Flujo</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Nombre del flujo</label>
                    <input type="text" placeholder="Ej: Registro de Pedido Urgente" value={recordingName} onChange={e => setRecordingName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>URL de inicio</label>
                    <input type="text" placeholder="https://portal.medifarma.com/..." value={recordingUrl} onChange={e => setRecordingUrl(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Nombre de la app en el portal <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>(opcional)</span></label>
                    <input type="text" placeholder="Ej: Gestión de Pedidos / Fiori Launchpad" value={recordingCredentials.appName} onChange={e => setRecordingCredentials(p => ({ ...p, appName: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Sección: Credenciales */}
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Credenciales del Portal</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Usuario</label>
                    <input type="text" placeholder="Ej: JPEREZ" value={recordingCredentials.username} onChange={e => setRecordingCredentials(p => ({ ...p, username: e.target.value.toUpperCase() }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={recordingCredentials.password} onChange={e => setRecordingCredentials(p => ({ ...p, password: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', paddingRight: '36px' }} />
                      <button onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sección: Datos adicionales */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Datos Adicionales</div>
                  <button onClick={addExtraField} style={{ fontSize: '0.75rem', fontWeight: '700', background: 'rgba(var(--accent-primary-rgb, 0,74,153), 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(var(--accent-primary-rgb, 0,74,153), 0.25)', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer' }}>+ Agregar dato</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem', minHeight: recordingExtraData.length === 0 ? '0' : 'auto' }}>
                  {recordingExtraData.length === 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed var(--card-border)', textAlign: 'center' }}>
                      Ej: Número de Lote, Número de Documento, Centro de Costo...
                    </div>
                  )}
                  {recordingExtraData.map((field, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                      <input type="text" placeholder="Nombre (ej: N° Lote)" value={field.key} onChange={e => updateExtraField(i, 'key', e.target.value)} style={{ boxSizing: 'border-box' }} />
                      <input type="text" placeholder="Valor (ej: LOT-001)" value={field.value} onChange={e => updateExtraField(i, 'value', e.target.value)} style={{ boxSizing: 'border-box' }} />
                      <button onClick={() => removeExtraField(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
                    </div>
                  ))}
                </div>

                <button className="btn-run" style={{ width: '100%', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={startRecording}>
                  <Circle size={14} fill="white" color="white" />
                  Iniciar Grabación
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', margin: '0 auto 1.5rem', animation: 'pulse 1.2s ease-in-out infinite' }} />
                <p style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Grabando...</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Realiza las acciones en el navegador que se abrió.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Flujo: <strong style={{ color: 'var(--text-main)' }}>{recordingName}</strong></p>
                {recordingCredentials.username && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '2rem' }}>Usuario: <strong style={{ color: 'var(--text-main)' }}>{recordingCredentials.username}</strong></p>
                )}
                <button className="btn-run" style={{ background: '#1e293b', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={stopRecording}>
                  <Square size={14} fill="white" color="white" />
                  Detener y Guardar Flujo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-content about-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>Acerca de AutoBot</h2>
              <button onClick={() => setShowAbout(false)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="credits-section">
              <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>Pierre Gálvez Larriega</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Autor & Arquitecto de Solución</div>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Desarrollado para <strong>Seidor Perú</strong>. AutoBot es un ecosistema de automatización avanzada diseñado para optimizar ciclos de pruebas completas en entornos SAP BTP.
              </p>
            </div>

            <div className="changelog-container">
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Change Log</h3>
              {CHANGELOG.map(v => (
                <div key={v.version} className="changelog-version">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong>v{v.version}</strong>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{v.date}</span>
                  </div>
                  <ul style={{ paddingLeft: '20px', fontSize: '0.85rem' }}>
                    {v.changes.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', fontSize: '0.7rem', textAlign: 'center', opacity: 0.4 }}>
              © 2026 Seidor Perú. Todos los derechos reservados.
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: 'white', color: 'var(--text-main)', padding: '16px 24px', borderRadius: '16px',
            border: `1px solid ${t.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '400px', fontSize: '0.9rem'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.type === 'error' ? '#ef4444' : '#10b981' }} />
            <span style={{ flex: 1 }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
