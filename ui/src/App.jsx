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

// ── SUB-COMPONENTES OUTSIDE APP TO PREVENT RE-RENDERS ───────────────────────

const Sidebar = ({ activeClient, setActiveClient, setSelected, currentBranch, branches, handleBranchChange, view }) => (
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

const ViewMain = ({
  activeClient, SCENARIOS, selectedScenario, setSelected, lastRun, setView, openConfig, configModalOpen, setConfigOpen, testConfig, setTestConfig, runTest 
}) => (
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
          <div className="scenario-actions">
            <button
              className="btn-run"
              disabled={sc.locked}
              onClick={e => { e.stopPropagation(); openConfig(sc); }}
            >
              ⚙️ Configurar y Ejecutar
            </button>
          </div>
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

    {configModalOpen && (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>⚙️ Configurar Escenario: {selectedScenario?.title}</h3>
            <button className="btn-close-modal" onClick={() => setConfigOpen(false)}>✕</button>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label>Tipo de Comprobante</label>
              <select 
                value={testConfig.tipoComprobante} 
                onChange={e => setTestConfig({...testConfig, tipoComprobante: e.target.value})}
              >
                <option value="Boleta">Boleta</option>
                <option value="Factura">Factura</option>
                <option value="NotaCredito">Nota de Crédito</option>
              </select>
            </div>

            <div className="form-group">
              <label>Medio de Pago</label>
              <select 
                value={testConfig.medioPago} 
                onChange={e => setTestConfig({...testConfig, medioPago: e.target.value})}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta (Visa/MC)</option>
                <option value="Mixto">Cobro Mixto</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={testConfig.conVuelto}
                  onChange={e => setTestConfig({...testConfig, conVuelto: e.target.checked})}
                />
                Forzar Monto Mayor (Probar Vuelto)
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={testConfig.pacienteExtranjero}
                  onChange={e => setTestConfig({...testConfig, pacienteExtranjero: e.target.checked})}
                />
                Paciente Extranjero (Pasaporte)
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={testConfig.forzarErrorSunat}
                  onChange={e => setTestConfig({...testConfig, forzarErrorSunat: e.target.checked})}
                />
                Simular Caída de SUNAT
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-outline" onClick={() => setConfigOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={runTest}>▶ Iniciar Prueba</button>
          </div>
        </div>
      </div>
    )}
  </div>
);

const ViewRunning = ({ runningScenario, activeClient, timer, steps, logs, stopTest, termRef }) => {
  const stepIcon = (id) => {
    const s = steps[id];
    if (s === 'ok')      return { char: '✓', cls: 'ok' };
    if (s === 'running') return { char: '…', cls: 'running' };
    if (s === 'error')   return { char: '✗', cls: 'error' };
    return { char: '○', cls: 'pending' };
  };

  return (
    <div className="view-running">
      <div className="running-header">
        <div className="running-title">
          <div className="pulse-dot" />
          Ejecutando: {runningScenario?.title} — {activeClient}
        </div>
        <div className="timer">{timer}</div>
      </div>

      <div className="running-body">
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
};

const ViewResult = ({ testSuccess, runningScenario, activeClient, lastRun, evidence, setView }) => (
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

    {evidence.filter(img => img.name.endsWith('.png')).length > 0 && (
      <div className="evidence-grid">
        {evidence.filter(img => img.name.endsWith('.png')).slice(0, 4).map(img => (
          <div key={img.name} className="evidence-thumb" onClick={() => window.open(img.url, '_blank')}>
            <img src={img.url} alt={img.name} />
            <div className="evidence-thumb-label">{img.name.replace(/_/g, ' ').replace('.png', '')}</div>
          </div>
        ))}
      </div>
    )}

    <div className="result-actions">
      {evidence.find(file => file.name.endsWith('.pdf')) && (
        <button 
          className="btn-primary" 
          onClick={() => {
            const pdf = evidence.find(file => file.name.endsWith('.pdf'));
            window.open(pdf.url, '_blank');
          }}
          style={{ backgroundColor: '#dc2626', color: 'white', border: 'none' }}
        >
          📄 Descargar Reporte PDF
        </button>
      )}
      
      <button className="btn-outline" onClick={() => { setView('main'); }}>🔁 Nueva Prueba</button>
      {testSuccess && (
        <div className="git-status">✓ Commit automático en CI + main</div>
      )}
    </div>
  </div>
);

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
  const [configModalOpen, setConfigOpen]  = useState(false);
  const [testConfig, setTestConfig]       = useState({
    tipoComprobante: 'Boleta', // Boleta, Factura
    medioPago: 'Efectivo',     // Efectivo, Tarjeta, Mixto
    conVuelto: false,          
    pacienteExtranjero: false,
    forzarErrorSunat: false
  });

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
  const openConfig = (sc) => {
    setSelected(sc);
    setConfigOpen(true);
  };

  const runTest = async () => {
    if (!selectedScenario || selectedScenario.locked) return;
    setConfigOpen(false);
    setLogs([]);
    setSteps({});
    setEvidence([]);
    setTestSuccess(null);
    setRunning(selectedScenario);
    setView('running');

    try {
      const response = await fetch(`${API_BASE}/run-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: selectedScenario.id, config: testConfig })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.substring(6));
              addLog(d.type, d.message);
              if (d.type === 'done') {
                const success = d.message.includes('código 0');
                setTestSuccess(success);
                fetch(`${API_BASE}/evidence`).then(r => r.json()).then(setEvidence).catch(() => {});
                setLastRun({ scenario: selectedScenario.title, success, ts: new Date().toLocaleString('es-PE') });
                setView('result');
              }
            } catch (e) { /* ignore incomplete json chunks */ }
          }
        }
      }
    } catch (err) {
      addLog('error', '❌ Error de conexión enviando configuración al servidor.');
      setView('result');
      setTestSuccess(false);
    }
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
        <Sidebar 
          activeClient={activeClient} 
          setActiveClient={setActiveClient} 
          setSelected={setSelected}
          currentBranch={currentBranch}
          branches={branches}
          handleBranchChange={handleBranchChange}
          view={view}
        />
        <main className="main">
          {view === 'main'    && <ViewMain 
                                    activeClient={activeClient}
                                    SCENARIOS={SCENARIOS}
                                    selectedScenario={selectedScenario}
                                    setSelected={setSelected}
                                    lastRun={lastRun}
                                    setView={setView}
                                    openConfig={openConfig}
                                    configModalOpen={configModalOpen}
                                    setConfigOpen={setConfigOpen}
                                    testConfig={testConfig}
                                    setTestConfig={setTestConfig}
                                    runTest={runTest}
                                  />}
          {view === 'running' && <ViewRunning 
                                    runningScenario={runningScenario}
                                    activeClient={activeClient}
                                    timer={timer}
                                    steps={steps}
                                    logs={logs}
                                    stopTest={stopTest}
                                    termRef={termRef}
                                  />}
          {view === 'result'  && <ViewResult 
                                    testSuccess={testSuccess}
                                    runningScenario={runningScenario}
                                    activeClient={activeClient}
                                    lastRun={lastRun}
                                    evidence={evidence}
                                    setView={setView}
                                  />}
        </main>
      </div>
    </div>
  );
}
