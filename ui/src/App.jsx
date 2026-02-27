import { useState, useEffect, useRef } from 'react';
import { Play, Terminal, GitBranch, RefreshCw, FolderTree, PowerOff } from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [ruc, setRuc] = useState('');
  const [showRucInput, setShowRucInput] = useState(false);

  const eventSourceRef = useRef(null);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    fetchBranches();
    fetchScenarios();
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_BASE}/branches`);
      const data = await res.json();
      setBranches(data.branches || []);
      setCurrentBranch(data.current || '');
    } catch (e) {
      console.error('Error fetching branches:', e);
    }
  };

  const fetchEvidence = async () => {
    try {
      const res = await fetch(`${API_BASE}/evidence`);
      const data = await res.json();
      setEvidence(data);
    } catch (e) {
      console.error('Error fetching evidence:', e);
    }
  };

  const fetchScenarios = async () => {
    try {
      const res = await fetch(`${API_BASE}/scenarios`);
      const data = await res.json();
      setScenarios(data);
      if (data.length > 0 && data[0].cases.length > 0) {
        setSelectedScenario(data[0].cases[0]);
      }
    } catch (e) {
      console.error('Error fetching scenarios:', e);
    }
  };

  const handleScenarioSelect = (scenario) => {
    if (isRunning) return;
    setSelectedScenario(scenario);
    if (scenario.requiresRuc) {
      setShowRucInput(true);
    } else {
      setShowRucInput(false);
    }
  };

  const handleBranchChange = async (e) => {
    const branch = e.target.value;
    if (branch === currentBranch) return;

    setIsLoading(true);
    setLogs([{ type: 'info', message: `🔄 Cambiando a rama: ${branch}...` }]);
    try {
      const res = await fetch(`${API_BASE}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentBranch(branch);
        setLogs(prev => [...prev, { type: 'success', message: `✅ Rama ${branch} cargada correctamente.` }]);
        fetchScenarios(); // Refresh scenarios incase branch has different tests
      } else {
        setLogs(prev => [...prev, { type: 'error', message: `❌ Error: ${data.error}` }]);
      }
    } catch (err) {
      setLogs(prev => [...prev, { type: 'error', message: `❌ Exception: ${err.message}` }]);
    }
    setIsLoading(false);
  };

  const stopTest = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRunning(false);
    setLogs(prev => [...prev, { type: 'error', message: '🛑 Ejecución cancelada por el usuario.' }]);
  };

  const runTest = () => {
    if (!selectedScenario || isRunning) return;

    if (selectedScenario.requiresRuc && !ruc) {
      alert("Por favor ingresa un RUC válido.");
      return;
    }

    setLogs([]);
    setEvidence([]);
    setShowReport(false);
    setIsRunning(true);
    setShowRucInput(false);

    const queryParams = new URLSearchParams({
      file: selectedScenario.id,
      template: selectedScenario.template,
      ruc: ruc
    });

    eventSourceRef.current = new EventSource(`${API_BASE}/run-test?${queryParams.toString()}`);

    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      setLogs(prev => [...prev, data]);

      if (data.type === 'done') {
        eventSourceRef.current.close();
        setIsRunning(false);
        setLogs(prev => [...prev, { type: 'success', message: '✨ Proceso completado exitosamente.' }]);
        fetchEvidence();
        setShowReport(true);
      }
    };

    eventSourceRef.current.onerror = (err) => {
      console.error("SSE Error", err);
      eventSourceRef.current.close();
      setIsRunning(false);
    };
  };

  // UI Helpers
  const formatLog = (log) => {
    return log.message.split('\n').map((line, i) => (
      <div key={`${log.timestamp}-${i}`} className={`log-line ${log.type}`}>
        {line}
      </div>
    ));
  };

  return (
    <div className="app-container">

      {/* Sidebar Panel */}
      <aside className="sidebar">
        <h1 className="logo">
          <Terminal size={20} color="var(--accent)" />
          Test Runner UI
        </h1>

        <div className="section-title">Entorno Actual</div>
        <div className="select-wrapper">
          <select
            value={currentBranch}
            onChange={handleBranchChange}
            disabled={isLoading || isRunning}
          >
            <option disabled value="">Seleccionar Cliente / Rama</option>
            <option value={currentBranch}>{currentBranch} (Actual)</option>
            {branches.filter(b => b !== currentBranch).map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {isLoading && <span style={{ position: 'absolute', right: '12px', top: '12px' }}><RefreshCw size={14} className="spin" /></span>}
        </div>

        <div className="section-title" style={{ marginTop: '2rem' }}>
          Escenarios Disponibles
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {scenarios.map(module => (
            <div key={module.id} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FolderTree size={14} /> {module.name}
              </div>
              <ul className="menu-list">
                {module.cases.map(c => (
                  <li
                    key={c.id}
                    className={`menu-item ${selectedScenario?.id === c.id ? 'active' : ''}`}
                    onClick={() => handleScenarioSelect(c)}
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Dynamic Inputs (RUC) */}
        {showRucInput && (
          <div className="ruc-box">
            <div className="section-title">Datos Requeridos</div>
            <input
              className="ruc-input"
              type="text"
              placeholder="Ingresa RUC (11 dígitos)"
              maxLength={11}
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runTest()}
              autoFocus
            />
          </div>
        )}
      </aside>

      {/* Main Workspace */}
      <main className="main-area">
        <header className="header">
          <div>
            <h2>Ejecución de Pruebas</h2>
            <p>Selecciona un escenario y observa los resultados en tiempo real.</p>
          </div>
          <div>
            {isRunning ? (
              <button className="danger" onClick={stopTest} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PowerOff size={16} /> Cancelar Proceso
              </button>
            ) : (
              <button
                className="primary"
                onClick={runTest}
                disabled={!selectedScenario || isLoading}
              >
                <Play size={16} fill="var(--bg)" /> Lanzar Escenario
              </button>
            )}
          </div>
        </header>

        {/* Terminal Window */}
        <div className="terminal" style={{ flex: showReport ? '0 0 40%' : '1' }}>
          {logs.length === 0 ? (
            <div style={{ color: '#666', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
              <Terminal size={48} opacity={0.2} />
              Esperando ejecución...
            </div>
          ) : (
            logs.map((log, idx) => <div key={idx}>{formatLog(log)}</div>)
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Evidence Report Gallery */}
        {showReport && evidence.length > 0 && (
          <div className="report-gallery">
            <div className="section-title" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Evidencia del Test</span>
              <button onClick={() => setShowReport(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>Cerrar Reporte</button>
            </div>
            <div className="grid-evidence">
              {evidence.map(img => (
                <div key={img.name} className="img-card">
                  <img src={img.url} alt={img.name} onClick={() => window.open(img.url, '_blank')} />
                  <div className="img-label">{img.name.replace(/_/g, ' ').replace('.png', '')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

    </div>
  );
}

export default App;
