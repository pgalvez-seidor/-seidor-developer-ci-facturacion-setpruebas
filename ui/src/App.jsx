import { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

const API_BASE = 'http://localhost:3001/api';

// ── STEP DEFINITIONS (matched to caso1 log output) ─────────────────────────
const STEP_DEFS = [
  { id: 'api',              label: 'Crear Pre-factura API' },
  { id: 'login',            label: 'Login SAP Fiori' },
  { id: 'abrir-facturacion',label: 'Abrir Facturación' },
  { id: 'buscar-prefactura',label: 'Seleccionar Pre-factura' },
  { id: 'cobro-efectivo',   label: 'Cobro en Efectivo' },
  { id: 'generar-comprobante', label: 'Generar Boleta' },
  { id: 'verificar-documentos', label: 'Verificar DOCUMENTOS' },
];

// ── HELPERS ─────────────────────────────────────────────────────────────────
function useTimer(active) {
  const [secs, setSecs] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (active) {
      setSecs(0);
      ref.current = setInterval(() => setSecs(s => s + 1), 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [active]);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function inferStep(msg) {
  if (msg.includes('Pre-factura') && msg.includes('API')) return { id: 'api', status: 'ok' };
  if (msg.includes('⏳ login: running'))                   return { id: 'login', status: 'running' };
  if (msg.includes('✅ login: ok'))                        return { id: 'login', status: 'ok' };
  if (msg.includes('⏳ abrir-facturacion'))                return { id: 'abrir-facturacion', status: 'running' };
  if (msg.includes('✅ abrir-facturacion'))                return { id: 'abrir-facturacion', status: 'ok' };
  if (msg.includes('⏳ buscar-prefactura'))                return { id: 'buscar-prefactura', status: 'running' };
  if (msg.includes('✅ buscar-prefactura'))                return { id: 'buscar-prefactura', status: 'ok' };
  if (msg.includes('⏳ cobro-efectivo'))                   return { id: 'cobro-efectivo', status: 'running' };
  if (msg.includes('✅ cobro-efectivo'))                   return { id: 'cobro-efectivo', status: 'ok' };
  if (msg.includes('⏳ generar-comprobante'))              return { id: 'generar-comprobante', status: 'running' };
  if (msg.includes('✅ generar-comprobante'))              return { id: 'generar-comprobante', status: 'ok' };
  if (msg.includes('⏳ verificar-documentos'))             return { id: 'verificar-documentos', status: 'running' };
  if (msg.includes('✅ verificar-documentos'))             return { id: 'verificar-documentos', status: 'ok' };
  return null;
}

const CLIENTS = [
  { id: 'CI', name: 'Clínica Internacional', icon: '🏥', env: 'QAS' },
];

const SCENARIOS = {
  CI: [
    { id: 'caso1-boleta.spec.js', title: 'Boleta Efectivo', desc: 'Cobro en caja — efectivo PEN', icon: '📄', locked: false },
    { id: 'caso2-tarjeta', title: 'Boleta Tarjeta', desc: 'Próximamente', icon: '💳', locked: true },
  ],
};

// ── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeClient, setActiveClient]   = useState('CI');
  const [selectedScenario, setSelected]   = useState(SCENARIOS.CI[0]);
  const [view, setView]                   = useState('main'); // main | running | result
  const [branches, setBranches]           = useState([]);
  const [currentBranch, setBranch]        = useState('');
  const [logs, setLogs]                   = useState([]);
  const [steps, setSteps]                 = useState({});
  const [evidence, setEvidence]           = useState([]);
  const [lastRun, setLastRun]             = useState(null);
  const [testSuccess, setTestSuccess]     = useState(null);
  const [runningScenario, setRunning]     = useState(null);

  const esRef      = useRef(null);
  const termRef    = useRef(null);
  const timer      = useTimer(view === 'running');

  // ── Init ──
  useEffect(() => {
    fetch(`${API_BASE}/branches`)
      .then(r => r.json())
      .then(d => { setBranches(d.branches || []); setBranch(d.current || ''); })
      .catch(() => {});
    fetch(`${API_BASE}/evidence`)
      .then(r => r.json())
      .then(d => setEvidence(d || []))
      .catch(() => {});
  }, []);

  // Auto-scroll terminal
  useEffect(() => { termRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const addLog = useCallback((type, message) => {
    setLogs(prev => [...prev, { type, message, ts: Date.now() }]);
    const step = inferStep(message);
    if (step) setSteps(prev => ({ ...prev, [step.id]: step.status }));
  }, []);

  // ── Run test ──
  const runTest = () => {
    if (!selectedScenario || selectedScenario.locked) return;
    setLogs([]);
    setSteps({});
    setEvidence([]);
    setTestSuccess(null);
    setRunning(selectedScenario);
    setView('running');

    esRef.current = new EventSource(`${API_BASE}/run-test?file=${selectedScenario.id}`);
    esRef.current.onmessage = e => {
      const d = JSON.parse(e.data);
      addLog(d.type, d.message);
      if (d.type === 'done') {
        esRef.current.close();
        const success = d.message.includes('código 0');
        setTestSuccess(success);
        fetch(`${API_BASE}/evidence`).then(r => r.json()).then(setEvidence).catch(() => {});
        setLastRun({ scenario: selectedScenario.title, success, ts: new Date().toLocaleString('es-PE') });
        setView('result');
      }
    };
    esRef.current.onerror = () => {
      esRef.current?.close();
      addLog('error', '❌ Conexión perdida con el servidor.');
      setView('result');
      setTestSuccess(false);
    };
  };

  const stopTest = () => {
    esRef.current?.close();
    addLog('error', '🛑 Cancelado por el usuario.');
    setTestSuccess(false);
    setView('result');
  };

  const handleBranchChange = async e => {
    const branch = e.target.value;
    if (branch === currentBranch) return;
    try {
      const r = await fetch(`${API_BASE}/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch }) });
      const d = await r.json();
      if (d.success) setBranch(branch);
    } catch { }
  };

  // ── STEP STATUS ICONS ──
  const stepIcon = (id) => {
    const s = steps[id];
    if (s === 'ok')      return { char: '✓', cls: 'ok' };
    if (s === 'running') return { char: '…', cls: 'running' };
    if (s === 'error')   return { char: '✗', cls: 'error' };
    return { char: '○', cls: 'pending' };
  };

  // ── SIDEBAR ──
  const Sidebar = () => (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Clientes</div>
        {CLIENTS.map(c => (
          <div
            key={c.id}
            className={`client-item ${activeClient === c.id ? 'active' : ''}`}
            onClick={() => { setActiveClient(c.id); setSelected(SCENARIOS[c.id][0]); }}
          >
            <div className="client-icon">{c.icon}</div>
            <div className="client-info">
              <div className="client-name">{c.name}</div>
              <div className="client-sub">{c.env}</div>
            </div>
          </div>
        ))}
        <div className="client-item client-add" onClick={() => alert('Usa /nuevo-cliente en el chat')}>
          <span>＋</span> Agregar cliente
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Rama / Entorno</div>
        <select className="branch-select" value={currentBranch} onChange={handleBranchChange} disabled={view === 'running'}>
          <option value="">-- seleccionar --</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
    </aside>
  );

  // ── VIEW: MAIN ──
  const ViewMain = () => (
    <div className="view-main">
      <div className="view-header">
        <h2>Escenarios — {activeClient}</h2>
        <p>{CLIENTS.find(c => c.id === activeClient)?.name} · {CLIENTS.find(c => c.id === activeClient)?.env}</p>
      </div>

      <div className="scenarios-grid">
        {(SCENARIOS[activeClient] || []).map(sc => (
          <div
            key={sc.id}
            className={`scenario-card ${sc.locked ? 'locked' : ''} ${selectedScenario?.id === sc.id ? 'selected' : ''}`}
            onClick={() => !sc.locked && setSelected(sc)}
          >
            <div className="scenario-icon">{sc.icon}</div>
            <div className="scenario-title">{sc.title}</div>
            <div className="scenario-desc">{sc.desc}</div>
            {!sc.locked && lastRun?.scenario === sc.title && (
              <div className="scenario-meta">⏱ Último: 36.5s ✓</div>
            )}
            <button
              className="btn-run"
              disabled={sc.locked}
              onClick={e => { e.stopPropagation(); setSelected(sc); runTest(); }}
            >
              ▶ Ejecutar
            </button>
          </div>
        ))}
      </div>

      {lastRun && (
        <div className="last-run-bar">
          <span>{lastRun.success ? '✅' : '❌'}</span>
          <span>Última prueba: {lastRun.scenario} · {lastRun.ts}</span>
          <a href="#" onClick={e => { e.preventDefault(); setView('result'); }}>Ver resultado →</a>
        </div>
      )}
    </div>
  );

  // ── VIEW: RUNNING ──
  const ViewRunning = () => (
    <div className="view-running">
      <div className="running-header">
        <div className="running-title">
          <div className="pulse-dot" />
          Ejecutando: {runningScenario?.title} — {activeClient}
        </div>
        <div className="timer">{timer}</div>
      </div>

      <div className="running-body">
        {/* Step Tracker */}
        <div className="steps-panel">
          {STEP_DEFS.map(sd => {
            const { char, cls } = stepIcon(sd.id);
            return (
              <div key={sd.id} className="step-item">
                <div className={`step-icon ${cls}`}>{char}</div>
                <div className="step-info">
                  <div className="step-name">{sd.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Log */}
        <div className="log-panel">
          <div className="log-toolbar">
            <span>📋</span> Log en vivo
          </div>
          <div className="terminal">
            {logs.map((l, i) => (
              <div key={i} className={`log-line ${l.type}`}>{l.message}</div>
            ))}
            <div ref={termRef} />
          </div>
        </div>
      </div>

      <div className="running-footer">
        <button className="btn-danger" onClick={stopTest}>⏹ Cancelar prueba</button>
      </div>
    </div>
  );

  // ── VIEW: RESULT ──
  const ViewResult = () => (
    <div className="view-result">
      <div className="result-hero">
        <div className={`result-icon ${testSuccess ? 'success' : 'failure'}`}>
          {testSuccess ? '✓' : '✗'}
        </div>
        <div className="result-title">
          {testSuccess ? '✅ PRUEBA EXITOSA' : '❌ PRUEBA FALLIDA'}
        </div>
        <div className="result-meta">
          {runningScenario?.title} · {activeClient} · {CLIENTS.find(c => c.id === activeClient)?.env}<br />
          {lastRun?.ts}
        </div>
      </div>

      {evidence.length > 0 && (
        <div className="evidence-grid">
          {evidence.slice(0, 4).map(img => (
            <div key={img.name} className="evidence-thumb" onClick={() => window.open(img.url, '_blank')}>
              <img src={img.url} alt={img.name} />
              <div className="evidence-thumb-label">{img.name.replace(/_/g, ' ').replace('.png', '')}</div>
            </div>
          ))}
        </div>
      )}

      <div className="result-actions">
        <button className="btn-primary" onClick={() => window.open('/evidence', '_blank')}>📄 Ver Reporte</button>
        <button className="btn-outline" onClick={() => { setView('main'); }}>🔁 Nueva Prueba</button>
        {testSuccess && (
          <div className="git-status">✓ Commit automático en CI + main</div>
        )}
      </div>
    </div>
  );

  // ── TOPBAR ──
  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-logo">⚡ <span>Set</span>Pruebas</div>
        <div className="topbar-right">
          <span className="badge badge-green">● QAS</span>
          <span className="badge badge-blue">⎇ {currentBranch || 'CI'}</span>
          <div className="avatar">PG</div>
        </div>
      </div>

      <div className="body">
        <Sidebar />
        <main className="main">
          {view === 'main'    && <ViewMain />}
          {view === 'running' && <ViewRunning />}
          {view === 'result'  && <ViewResult />}
        </main>
      </div>
    </div>
  );
}
