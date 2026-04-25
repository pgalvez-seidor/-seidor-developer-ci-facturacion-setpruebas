import { useState, useEffect, useCallback } from 'react';
import {
  Eye, Zap, CreditCard, Banknote, Trash2,
  CheckCircle2, AlertCircle, Clock, Info, ChevronRight, X, Circle, Square, Power,
  Sparkles, FileText, Settings, Cpu, AlertTriangle
} from 'lucide-react';
import './index-a.css';

const API_BASE = 'http://localhost:3001/api';

const ModernSwitch = ({ checked, onChange, label, icon: Icon }) => (
  <div className="modern-switch-wrapper" onClick={() => onChange(!checked)}>
    <div className="modern-switch-info">
      {Icon && <Icon size={14} className="modern-switch-icon" />}
      <span>{label}</span>
    </div>
    <div className={`modern-switch-track ${checked ? 'active' : ''}`}>
      <div className="modern-switch-thumb" />
    </div>
  </div>
);

const ModernCheckbox = ({ checked, onChange, label }) => (
  <label className="modern-checkbox-container" onClick={() => onChange(!checked)}>
    <div className={`modern-checkbox-box ${checked ? 'checked' : ''}`}>
      {checked && <div className="modern-checkbox-tick" />}
    </div>
    {label && <span className="modern-checkbox-label">{label}</span>}
  </label>
);

const ModernSelect = ({ value, onChange, options, placeholder = '-- seleccionar --', style = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <div className="modern-select-container" style={style}>
      <div className="modern-select-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedLabel}</span>
        <ChevronRight size={16} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: '0.3s' }} />
      </div>
      {isOpen && (
        <div className="modern-select-dropdown">
          {options.length === 0 ? (
            <div className="modern-select-option empty">{placeholder}</div>
          ) : (
            options.map(o => (
              <div 
                key={o.value} 
                className={`modern-select-option ${value === o.value ? 'active' : ''}`}
                onClick={() => { onChange({ target: { value: o.value } }); setIsOpen(false); }}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const CLIENTS = [
  { id: 'CI', name: 'Clínica Internacional', icon: <div style={{ width: '24px', height: '24px', background: 'var(--accent-primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>CI</div>, env: 'QAS' },
];

const MEDIOS_VUELTO = ["Efectivo", "Depósito CTA", "Nota de Crédito"];

const Sidebar = ({
  registry, activeClient, setActiveClient,
  activeProcess, setActiveProcess,
  currentBranch, branches, handleBranchChange,
  onGitSync,
  setShowAbout,
  setShowSettings,
  gitNotLinked,
  remoteChangesCount,
  testerName, setTesterName,
  projectName, setProjectName,
  geminiKey, setGeminiKey,
  setShowChangelog
}) => {
  const saveGeminiKey = async () => {
    if (!geminiKey) return;
    try {
      const res = await fetch(`${API_BASE}/config/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiKey })
      });
      if (res.ok) alert("✅ Llave de Gemini guardada correctamente.");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '0 5px' }}>
        <img
          src="/logo-pure.png"
          alt="AutoBot"
          style={{ width: '42px', height: '42px', objectFit: 'contain' }}
        />
        <div style={{ 
          fontSize: '1.4rem', 
          fontWeight: '300', 
          letterSpacing: '1px', 
          color: 'var(--text-main)',
          background: 'linear-gradient(135deg, #0f172a, #475569)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: "'Inter', sans-serif"
        }}>
          Auto<span style={{ fontWeight: '700' }}>Bot</span>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Metadata del Reporte</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '-5px' }}>PROYECTO</div>
          <input 
            type="text" 
            className="branch-select" 
            value={projectName} 
            onChange={e => setProjectName(e.target.value)}
            placeholder="Ej: Medifarma - SAP Fiori"
            style={{ fontSize: '0.75rem' }}
          />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '-5px' }}>USUARIO (TESTER)</div>
          <input 
            type="text" 
            className="branch-select" 
            value={testerName} 
            onChange={e => setTesterName(e.target.value)}
            placeholder="Tu nombre completo"
            style={{ fontSize: '0.75rem' }}
          />
        </div>
      </div>

      <div className="sidebar-section">
        <div className="ai-badge">
          <div className="ai-badge-label">Inteligencia Artificial</div>
          <div className="ai-badge-name">
            <Cpu size={14} /> SAP Core AI
          </div>
        </div>
        
        <div className="sidebar-label">Entorno Git</div>
        {gitNotLinked ? (
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', marginTop: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertTriangle size={12} /> Git no vinculado
            </div>
            <p style={{ fontSize: '0.65rem', color: '#92400e', margin: 0 }}>
              Abre <span style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: '700' }} onClick={() => setShowSettings(true)}>⚙️ Configuración</span> y pega la ruta de tu proyecto.
            </p>
          </div>
        ) : (
          <>
            <select className="branch-select" value={currentBranch} onChange={handleBranchChange}>
              <option value="">-- seleccionar --</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            
            <button 
              onClick={onGitSync} 
              className="btn-sync-git"
              style={{
                marginTop: '10px', width: '100%', padding: '10px',
                background: remoteChangesCount > 0 ? 'var(--accent-primary)' : 'rgba(99, 102, 241, 0.1)',
                color: remoteChangesCount > 0 ? 'white' : '#6366f1',
                border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px',
                fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: remoteChangesCount > 0 ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Zap size={14} fill={remoteChangesCount > 0 ? 'white' : '#6366f1'} />
              {remoteChangesCount > 0 ? `Sincronizar con Git (${remoteChangesCount})` : 'Sincronizar con Git'}
            </button>
          </>
        )}
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
            <ModernSelect 
              value={activeProcess} 
              onChange={e => setActiveProcess(e.target.value)}
              options={registry.find(c => c.id === activeClient)?.procesos?.map(p => ({ label: p.name, value: p.id })) || []}
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', padding: '1.5rem 0', display: 'flex', justifyContent: 'center', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
        <button 
          onClick={() => setShowChangelog(true)}
          className="evolution-portal-trigger"
          style={{ 
            background: 'none', border: 'none', color: '#94a3b8', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            opacity: 0.7, letterSpacing: '0.5px'
          }}
        >
          <Sparkles size={14} className="sparkle-icon" />
          <span style={{ fontSize: '0.72rem', fontWeight: '500' }}>Evolución del Sistema</span>
        </button>
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
                  <ModernCheckbox 
                    checked={p.autoData} 
                    onChange={val => updAuto(p.id, val)}
                    label="Autodatos"
                  />
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
  const [testerName, setTesterName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

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
  const [batchConcurrency, setBatchConcurrency] = useState(1);
  const [runSequential, setRunSequential] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [globalPdf, setGlobalPdf] = useState(null);

  const [toasts, setToasts] = useState([]);
  const [showAbout, setShowAbout] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);

  // Grabación de flujos (Playwright Codegen)
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordingStep, setRecordingStep] = useState('intro'); // 'intro' | 'form' | 'recording'
  const [isRecording, setIsRecording] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelogContent, setChangelogContent] = useState('');
  const [gitNotLinked, setGitNotLinked] = useState(false);
  const [remoteChangesCount, setRemoteChangesCount] = useState(0);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [gitToken, setGitToken] = useState('');
  const [projectDir, setProjectDir] = useState('');


  const [recordingId, setRecordingId] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingName, setRecordingName] = useState('');
  const [recordingCredentials, setRecordingCredentials] = useState({ username: '', password: '', appName: '' });
  const [recordingExtraData, setRecordingExtraData] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  // Asistente IA de refinamiento
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null); // { encontrado, fragmentoActual, fragmentoPropuesto, explicacion, scriptCompleto }
  const [aiApplied, setAiApplied] = useState(false);
  const [aiScriptFile, setAiScriptFile] = useState('');

  // Asignación de script a escenario existente
  const [showScriptPicker, setShowScriptPicker] = useState(false);
  const [availableScripts, setAvailableScripts] = useState([]);

  // Editor manual de script
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [scriptEditorFile, setScriptEditorFile] = useState('');
  const [scriptEditorContent, setScriptEditorContent] = useState('');
  const [scriptEditorSaving, setScriptEditorSaving] = useState(false);
  
  // Generación de PDF bajo demanda
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMessages, setPdfMessages] = useState([]);
  const [pdfDoneUrl, setPdfDoneUrl] = useState(null);

  const CHANGELOG = [
    { version: '1.1.0', date: '2026-04-19', changes: ['Rama Medifarma — cliente independiente', 'Grabación de flujos sin código (Playwright Codegen)', 'Botón Grabar Flujo Nuevo en dashboard', 'Flujos grabados guardados automáticamente en SQLite'] },
    { version: '1.0.0', date: '2026-03-01', changes: ['Rebranding total a AutoBot', 'Interfaz Premium Seidor Perú', 'Concurrencia dinámica (Threads)', 'Modo Turbo (Timeouts optimizados)', 'Limpieza inteligente de fragments SAP'] },
    { version: '0.9.0', date: '2026-02-28', changes: ['Integración de reportes PDF', 'Detección de errores de negocio', 'Sistema de logs SSE en tiempo real'] }
  ];

  const addToast = (msg, type = 'error') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
    }, 5000);
  };

  const handleOpenPdf = async (pdfUrl) => {
    try { await fetch(`${API_BASE}/open-pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdfUrl }) }); }
    catch (err) {
      console.error("Open PDF Error:", err);
      addToast("Error al abrir PDF nativo.", "error");
    }
  };

  const fetchInitialData = useCallback(async () => {
    try {
      const bRes = await fetch(`${API_BASE}/branches`);
      if (bRes.ok) {
        const d = await bRes.json();
        if (d.gitNotLinked) {
          setGitNotLinked(true);
          setBranches([]);
          setBranch('');
        } else {
          setGitNotLinked(false);
          setBranches(d.branches || []);
          setBranch(d.current || '');
        }
      }

      const sRes = await fetch(`${API_BASE}/settings`);
      if (sRes.ok) {
        const d = await sRes.json();
        if (d.testerName) setTesterName(d.testerName);
        if (d.gitToken) setGitToken(d.gitToken);
        if (d.projectName) setProjectName(d.projectName);
        if (d.projectDir) setProjectDir(d.projectDir);
        if (d.geminiKey) setGeminiKey(d.geminiKey);
      }
      setBackendError(null);
    } catch (err) {
      setBackendError("⚠️ No hay conexión con el servidor (Puerto 3005). Intentando reconectar...");
    }
  }, []);

  const fetchRegistry = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/registry`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setRegistry(data);

      const statRes = await fetch(`${API_BASE}/git/status`);
      if (statRes.ok) {
        const statData = await statRes.json();
        setHasPendingChanges(statData.hasChanges);
        setRemoteChangesCount(statData.behind || 0);
      }
      setBackendError(null);
    } catch (err) {
      console.error("Fetch Registry Error:", err);
      setBackendError("⚠️ No hay conexión con el servidor (Puerto 3005). Intentando reconectar...");
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    fetchRegistry();
    const timer = setInterval(fetchRegistry, 30000); // Cada 30s
    return () => clearInterval(timer);
  }, [fetchInitialData, fetchRegistry]);

  // 2.3. Notificaciones Nativas de Git
  useEffect(() => {
    if (remoteChangesCount > 0) {
      const lastCount = parseInt(localStorage.getItem('lastGitCount') || '0');
      if (remoteChangesCount > lastCount) {
        try {
          new Notification('🤖 AutoBotIA: Cambios Detectados', { 
            body: `Hay ${remoteChangesCount} nuevos escenarios o cambios en la rama ${currentBranch}.`, 
            icon: '/favicon.png'
          });
        } catch (err) {}
      }
      localStorage.setItem('lastGitCount', remoteChangesCount.toString());
    } else {
      localStorage.setItem('lastGitCount', '0');
    }
  }, [remoteChangesCount, currentBranch]);

  // Al cambiar de cliente, resetear escenario y proceso al primero disponible
  useEffect(() => {
    setActiveScenarioId('');
    setNewScenarioName('');
    setInstruccionesIa('');
    const client = registry.find(c => c.id === activeClient);
    if (client?.procesos?.length > 0) {
      setActiveProcess(client.procesos[0].id);
    }
  }, [activeClient]);

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

  const openRecordModal = (prefilledName = '') => {
    setRecordingStep('intro');
    setRecordingName(prefilledName);
    setShowRecordModal(true);
  };

  const openScriptPicker = async () => {
    try {
      const res = await fetch(`${API_BASE}/scripts`);
      const data = await res.json();
      setAvailableScripts(data);
      setShowScriptPicker(true);
    } catch { addToast("Error al cargar scripts disponibles", "error"); }
  };

  const assignScript = async (scriptFile) => {
    if (!activeScenarioId) { addToast("Selecciona un escenario primero", "error"); return; }
    const sData = registry.find(c => c.id === activeClient)?.procesos.find(p => p.id === activeProcess)?.escenarios.find(e => e.id === activeScenarioId);
    if (!sData) return;
    const updatedConfig = { ...sData.config, recordedScript: scriptFile };
    try {
      const res = await fetch(`${API_BASE}/registry/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: activeClient, processId: activeProcess, scenario: { ...sData, config: updatedConfig } })
      });
      if ((await res.json()).success) {
        await fetchRegistry();
        setShowScriptPicker(false);
        addToast("Script asignado correctamente.", "success");
      }
    } catch { addToast("Error al asignar script", "error"); }
  };

  const openAiModal = (scriptFile) => {
    setAiScriptFile(scriptFile);
    setAiInstruction('');
    setAiResponse(null);
    setAiApplied(false);
    setShowAiModal(true);
  };

  const openScriptEditor = async (scriptFile) => {
    setScriptEditorFile(scriptFile);
    setScriptEditorContent('');
    setShowScriptEditor(true);
    try {
      const res = await fetch(`${API_BASE}/script/content?file=${encodeURIComponent(scriptFile)}`);
      const data = await res.json();
      if (data.content) setScriptEditorContent(data.content);
      else addToast("No se pudo cargar el script", "error");
    } catch { addToast("Error al cargar el script", "error"); }
  };

  const saveScriptEditor = async () => {
    if (!scriptEditorFile || !scriptEditorContent.trim()) return;
    setScriptEditorSaving(true);
    try {
      const res = await fetch(`${API_BASE}/ai/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptFile: scriptEditorFile, scriptCompleto: scriptEditorContent }),
      });
      const data = await res.json();
      if (data.ok) {
        addToast("Script guardado correctamente.", "success");
        setShowScriptEditor(false);
      } else {
        addToast(data.error || "Error al guardar", "error");
      }
    } catch { addToast("Error al guardar el script", "error"); }
    finally { setScriptEditorSaving(false); }
  };

  const analyzeWithAi = async () => {
    if (!aiInstruction.trim()) { addToast("Describe qué quieres cambiar", "error"); return; }
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch(`${API_BASE}/ai/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptFile: aiScriptFile, instruction: aiInstruction })
      });
      const data = await res.json();
      if (data.error === 'NO_API_KEY') { addToast("Configura GEMINI_API_KEY en el archivo .env", "error"); return; }
      if (data.error) { addToast(data.error, "error"); return; }
      setAiResponse(data);
    } catch { addToast("Error al conectar con el asistente IA", "error"); }
    finally { setAiLoading(false); }
  };

  const applyAiChange = async () => {
    if (!aiResponse?.scriptCompleto) return;
    try {
      const res = await fetch(`${API_BASE}/ai/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptFile: aiScriptFile, scriptCompleto: aiResponse.scriptCompleto })
      });
      if ((await res.json()).success) {
        setAiApplied(true);
        addToast("Cambio aplicado y guardado correctamente.", "success");
      }
    } catch { addToast("Error al aplicar el cambio", "error"); }
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
        setRecordingStep('recording');
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
        setRecordingStep('intro');
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
      if (prefBase > 0) cfg.prefacturaId = (prefBase + i).toString();
      newItems.push({
        taskId: `task_${baseId}_${i}`,
        status: 'idle',
        progress: 0,
        result: null,
        currentLog: '',
        scenarioName: newScenarioName || '',
        clientId: activeClient,
        config: cfg
      });
    }
    setQueue(q => [...q, ...newItems]);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1400);
  };

  const getBatchItemLabel = (q) => {
    const name = q.scenarioName || q.config.tipoComprobante || q.config.area || 'Flujo';
    const isMedifarma = q.clientId === 'Medifarma';
    let detail = '';
    if (q.config.pagos?.length > 0) detail = q.config.pagos.map(p => p.tipo).join('+');
    else if (!isMedifarma && q.config.periodo) detail = q.config.periodo;
    else if (!isMedifarma && q.config.semana) detail = `Sem. ${q.config.semana}`;
    else if (q.config.recordedScript) detail = 'Grabado';
    return detail ? `${name} — ${detail}` : name;
  };

  const clearBatch = () => { if (!isBatchRunning) setQueue([]); setGlobalPdf(null); };

  const removeTask = (taskId) => {
    setQueue(prev => prev.filter(t => t.taskId !== taskId));
  };

  // --- Lógica de Drag & Drop ---
  const handleDragStart = (index) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Permitir el drop
  };

  const handleDrop = (index) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newQueue = [...queue];
    const [movedItem] = newQueue.splice(draggedItemIndex, 1);
    newQueue.splice(index, 0, movedItem);
    setQueue(newQueue);
    setDraggedItemIndex(null);
  };

  const runBatch = async () => {
    if (queue.length === 0 || isBatchRunning) return;
    
    if (!testerName.trim() || !projectName.trim()) {
      addToast("⚠️ Debes ingresar el nombre del PROYECTO y del TESTER antes de ejecutar.", "error");
      return;
    }

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
          tasks: tasksToRun.map(t => ({ taskId: t.taskId, config: t.config, file: t.config.recordedScript || processScripts[activeProcess] || null })),
          parallel: !runSequential,
          concurrency: runSequential ? 1 : batchConcurrency,
          metadata: {
            tester: testerName,
            project: projectName
          }
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
                    if (docData) t.runDir = docData; // Guardar la ruta de la carpeta de resultados
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

  const handleShutdown = async () => {
    if (window.confirm("¿Estás seguro de que deseas APAGAR AutoBot? Esto cerrará todos los procesos y el servidor local.")) {
      try {
        await fetch(`${API_BASE}/system/shutdown`, { method: 'POST' });
        addToast("Apagando sistema...", "success");
        setTimeout(() => {
          window.location.href = "about:blank";
        }, 2000);
      } catch {
        addToast("Error al intentar apagar el servidor.", "error");
      }
    }
  };

  useEffect(() => {
    if (showChangelog) {
      fetch(`${API_BASE}/changelog`)
        .then(res => res.text())
        .then(text => setChangelogContent(text))
        .catch(err => console.error("Error loading changelog:", err));
    }
  }, [showChangelog]);

  const handleGitSync = async () => {
    addToast("Iniciando sincronización con Git...", "success");
    try {
      const res = await fetch(`${API_BASE}/git/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) addToast(data.message, "success");
      else addToast(data.error || "Error en sincronización", "error");
    } catch {
      addToast("Error de conexión al sincronizar Git", "error");
    }
  };

  const generatePdfOnDemand = async (runDir) => {
    setPdfLoading(true);
    setPdfMessages(["🚀 Conectando con AutoBot AI..."]);
    setPdfDoneUrl(null);
    
    try {
      const eventSource = new EventSource(`${API_BASE}/reports/generate-ai?runDir=${encodeURIComponent(runDir)}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setPdfMessages(prev => [...prev, data.message]);
          // Scroll automático hacia abajo en el log
          setTimeout(() => {
            const log = document.getElementById('pdf-log-bottom');
            if (log) log.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        } else if (data.type === 'done') {
          setPdfDoneUrl(data.url);
          setPdfMessages(prev => [...prev, "✅ ¡Dossier generado correctamente!"]);
          eventSource.close();
        } else if (data.type === 'error') {
          addToast(data.message, "error");
          setPdfLoading(false);
          eventSource.close();
        }
      };

      eventSource.onerror = (e) => {
        console.error("EventSource Error:", e);
        eventSource.close();
        setPdfLoading(false);
      };
    } catch (err) {
      console.error("PDF Generate Error:", err);
      addToast("Error al iniciar la generación del PDF.", "error");
      setPdfLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="body">
        <Sidebar
          registry={registry} activeClient={activeClient} setActiveClient={setActiveClient}
          activeProcess={activeProcess} setActiveProcess={setActiveProcess}
          currentBranch={currentBranch} branches={branches} handleBranchChange={handleBranchChange}
          onGitSync={handleGitSync}
          setShowAbout={setShowAbout}
          setShowSettings={setShowSettings}
          gitNotLinked={gitNotLinked}
          remoteChangesCount={remoteChangesCount}
          testerName={testerName}
          setTesterName={setTesterName}
          projectName={projectName}
          setProjectName={setProjectName}
          geminiKey={geminiKey}
          setGeminiKey={setGeminiKey}
          setShowChangelog={setShowChangelog}
        />

        <main className="main split-layout">
          <div className="config-panel">
            <header className="main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>Configuración del Escenario</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="power-off-btn"
                    style={{
                      background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
                      border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '50%',
                      width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: '0.3s'
                    }}
                  >
                    <Settings size={18} />
                  </button>
                  <button 
                    onClick={handleShutdown}
                    title="Apagar AutoBot"
                    className="power-off-btn"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '50%',
                      width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: '0.3s'
                    }}
                  >
                    <Power size={18} />
                  </button>
                </div>

            </header>

            <div className="control-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="control-label">Gestión de Escenarios</span>
                <span className="control-badge">{registry.find(c => c.id === activeClient)?.procesos?.find(p => p.id === activeProcess)?.escenarios?.length || 0} Guardados</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <ModernSelect 
                  style={{ flex: 1 }} 
                  value={activeScenarioId} 
                  onChange={e => handleScenarioSelect(e.target.value)}
                  placeholder="-- Iniciar Nuevo Flujo --"
                  options={registry.find(c => c.id === activeClient)?.procesos?.find(p => p.id === activeProcess)?.escenarios?.map(s => ({ label: s.name, value: s.id })) || []}
                />
                <button 
                  className="btn-record-mini" 
                  onClick={() => openRecordModal()}
                  title="Grabar ahora"
                >
                  <Circle size={14} fill="white" className="rec-pulse" />
                  Grabar
                </button>
                {activeScenarioId && (
                  <button 
                    onClick={deleteScenario} 
                    className="btn-icon-danger"
                    title="Eliminar este escenario"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Banner: escenario sin script grabado */}
            {activeClient === 'Medifarma' && activeScenarioId && (() => {
              const esc = registry.find(c => c.id === activeClient)?.procesos.find(p => p.id === activeProcess)?.escenarios.find(e => e.id === activeScenarioId);
              if (esc?.config?.recordedScript) return (
                <div style={{ marginBottom: '1rem', padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700' }}>✅ Flujo grabado asignado</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={openScriptPicker} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.07)', color: 'var(--text-main)', border: '1px solid var(--card-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.72rem' }}>
                        🔄 Cambiar
                      </button>
                      <button onClick={() => openScriptEditor(esc.config.recordedScript)} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.07)', color: 'var(--text-main)', border: '1px solid var(--card-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.72rem' }}>
                        📝 Ver/Editar
                      </button>
                      <button onClick={() => openAiModal(esc.config.recordedScript)} style={{ padding: '5px 10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🤖 Afinar con IA
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {esc.config.recordedScript.replace('scripts/', '')}
                  </div>
                </div>
              );
              if (!esc?.config?.recordedScript) return (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#f59e0b', marginBottom: '8px' }}>⚠️ ESCENARIO SIN FLUJO GRABADO</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>Este escenario aún no tiene un flujo grabado. Puedes grabarlo ahora o asignar uno existente.</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openRecordModal(esc.name)} style={{ flex: 1, padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}>
                      ● Grabar ahora
                    </button>
                    <button onClick={openScriptPicker} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--card-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}>
                      📂 Usar existente
                    </button>
                  </div>
                </div>
              );
              return null;
            })()}

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

              <div className="settings-grid">
                <ModernSwitch 
                  checked={builderConfig.headless} 
                  onChange={checked => setBuilderConfig({ ...builderConfig, headless: checked })}
                  label="Modo Ultra-Velocidad (Headless)"
                  icon={Zap}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-8px', marginLeft: '24px' }}>
                  {builderConfig.headless 
                    ? "La prueba volará en segundo plano (Ideal para ejecución masiva)" 
                    : "El navegador se abrirá para auditoría visual (Ideal para depurar)"
                  }
                </div>
              </div>

              {activeClient !== 'Medifarma' && activeProcess === 'facturacion' && (
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
              </div>

              {/* ── Botonera de acción ── */}
              {(() => {
                const isMedifarmaFlow = activeClient === 'Medifarma';
                const hasName = !!newScenarioName.trim();
                const hasScript = !!builderConfig.recordedScript;
                const hasPayment = (builderConfig.pagos?.length ?? 0) > 0;
                const validFiscal = builderConfig.tipoComprobante !== 'Factura' || !!builderConfig.ruc?.trim();
                const canAdd = hasName && (isMedifarmaFlow ? hasScript : (hasPayment && validFiscal));
                const disabledReason = !hasName
                  ? 'Ingresa un nombre para el escenario'
                  : isMedifarmaFlow && !hasScript
                  ? 'Asigna un flujo grabado primero'
                  : !isMedifarmaFlow && !hasPayment
                  ? 'Agrega un método de pago'
                  : !isMedifarmaFlow && !validFiscal
                  ? 'Ingresa el RUC de la factura'
                  : null;

                return (
                  <div style={{ marginTop: '1.25rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn-secondary"
                      onClick={saveScenario}
                      disabled={!hasName}
                    >
                      Guardar
                    </button>
                    <div style={{ flex: 1 }} />
                    {disabledReason && !addedFlash && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '150px', textAlign: 'right', lineHeight: 1.3 }}>
                        {disabledReason}
                      </span>
                    )}
                    <button
                      className={`btn-add${addedFlash ? ' btn-add-success' : ''}`}
                      onClick={addToBatch}
                      disabled={!canAdd || addedFlash}
                    >
                      {addedFlash
                        ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:'popIn 300ms cubic-bezier(0.34,1.56,0.64,1)'}}><polyline points="20 6 9 17 4 12"/></svg> Añadido</>
                        : '+ Añadir al lote'
                      }
                    </button>
                  </div>
                );
              })()}
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
                  <div
                    key={q.taskId}
                    className={`batch-task-card ${q.status} ${draggedItemIndex === idx ? 'dragging' : ''}`}
                    draggable={!isBatchRunning}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!isBatchRunning && (
                          <div style={{ cursor: 'grab', color: 'var(--text-muted)', display: 'flex' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                          </div>
                        )}
                        <span className="b-task-name">
                          {idx + 1}. {getBatchItemLabel(q)}
                        </span>
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
                        {q.status === 'done' && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            {q.pdfUrl ? (
                              <button className="btn-open-pdf" style={{ flex: 1 }} onClick={() => handleOpenPdf(q.pdfUrl)}>
                                <FileText size={14} style={{ marginRight: '6px' }} /> VER PDF
                              </button>
                            ) : (
                              <button className="btn-open-pdf btn-gemini-gen" style={{ flex: 1 }} onClick={() => generatePdfOnDemand(q.runDir)}>
                                <Sparkles size={14} style={{ marginRight: '6px' }} /> GENERAR PDF
                              </button>
                            )}
                          </div>
                        )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.05)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.1)' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main, #1a1a1a)' }}>Modo de Ejecución</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #666)', fontWeight: '600' }}>{runSequential ? 'Paso a paso (Secuencial)' : 'Multi-hilo (Paralelo)'}</div>
                  </div>
                  <div
                    onClick={() => !isBatchRunning && setRunSequential(!runSequential)}
                    style={{
                      width: '50px', height: '26px', background: runSequential ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                      borderRadius: '20px', position: 'relative', cursor: isBatchRunning ? 'not-allowed' : 'pointer', transition: '0.3s'
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', background: 'white', borderRadius: '50%',
                      position: 'absolute', top: '3px', left: runSequential ? '27px' : '3px', transition: '0.3s',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>

                {!runSequential && (
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
                )}

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

      {showAiModal && (
        <div className="modal-overlay" onClick={() => !aiLoading && setShowAiModal(false)}>
          <div className="modal-content about-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🤖 Asistente IA</h2>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Solo responde sobre scripts de automatización Playwright</div>
              </div>
              {!aiLoading && <button onClick={() => setShowAiModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>}
            </div>

            {/* Input de instrucción */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: '700', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>¿Qué quieres cambiar en el flujo?</label>
              <textarea
                value={aiInstruction}
                onChange={e => { setAiInstruction(e.target.value); setAiResponse(null); setAiApplied(false); }}
                placeholder={'Ej: "El botón Confirmar a veces demora, espera hasta 5 segundos"\n"Después del login aparece un modal, ignóralo"\n"Graba el número de documento que aparece en pantalla"'}
                style={{ width: '100%', height: '90px', boxSizing: 'border-box', resize: 'vertical', marginTop: '0', fontFamily: 'inherit', lineHeight: '1.5' }}
                disabled={aiLoading}
              />
            </div>

            <button
              onClick={analyzeWithAi}
              disabled={aiLoading || !aiInstruction.trim()}
              style={{ width: '100%', padding: '12px', background: aiLoading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', cursor: aiLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {aiLoading ? <><div style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'pulse 0.8s linear infinite' }} /> Analizando...</> : '🔍 Analizar y proponer cambio'}
            </button>

            {/* Respuesta de la IA */}
            {aiResponse && (
              aiResponse.fuera_de_tema ? (
                <div style={{ padding: '1.2rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🚫</div>
                  <p style={{ fontWeight: '700', color: '#ef4444', margin: '0 0 4px' }}>Fuera de mi área</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No estoy autorizado para responder eso. Enfoquémonos en tu trabajo, gracias.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Qué encontró */}
                  <div style={{ padding: '1rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>🔎 Lo que encontré</div>
                    <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: '1.5' }}>{aiResponse.encontrado}</p>
                  </div>

                  {/* Diff: actual vs propuesto */}
                  {aiResponse.fragmentoActual && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#ef4444', marginBottom: '6px' }}>ANTES</div>
                        <pre style={{ margin: 0, padding: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '0.72rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{aiResponse.fragmentoActual}</pre>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#10b981', marginBottom: '6px' }}>DESPUÉS</div>
                        <pre style={{ margin: 0, padding: '10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '0.72rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{aiResponse.fragmentoPropuesto}</pre>
                      </div>
                    </div>
                  )}

                  {/* Explicación */}
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>💡 Explicación</div>
                    <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: '1.5', color: 'var(--text-muted)' }}>{aiResponse.explicacion}</p>
                  </div>

                  {/* Botón aplicar */}
                  {aiResponse.fragmentoActual && !aiApplied && (
                    <button
                      onClick={() => { if (window.confirm('¿Aplicar este cambio al script? Se creará un backup automático.')) applyAiChange(); }}
                      style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem' }}
                    >
                      ✅ Aplicar cambio al script
                    </button>
                  )}
                  {aiApplied && (
                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', fontWeight: '700', color: '#10b981' }}>
                      ✅ Cambio aplicado. El backup del script anterior se guardó automáticamente.
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {showScriptPicker && (
        <div className="modal-overlay" onClick={() => setShowScriptPicker(false)}>
          <div className="modal-content about-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>📂 Seleccionar Script Grabado</h2>
              <button onClick={() => setShowScriptPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Selecciona un flujo grabado previamente para asignarlo a <strong>{registry.find(c => c.id === activeClient)?.procesos.find(p => p.id === activeProcess)?.escenarios.find(e => e.id === activeScenarioId)?.name}</strong>.
            </p>
            {availableScripts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '2px dashed var(--card-border)', borderRadius: '12px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                <p style={{ margin: 0 }}>No hay flujos grabados todavía.<br/>Usa "Grabar Flujo Nuevo" para crear uno.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableScripts.map((s, i) => (
                  <button key={i} onClick={() => assignScript(s.file)} style={{ textAlign: 'left', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '10px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
                  >
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>{s.file.replace('scripts/', '')} · {new Date(s.created).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showScriptEditor && (
        <div className="modal-overlay" onClick={() => setShowScriptEditor(false)}>
          <div className="modal-content about-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', width: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '1rem' }}>📝 Editor de Script</h2>
              <button onClick={() => setShowScriptEditor(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', wordBreak: 'break-all' }}>{scriptEditorFile}</div>
            <textarea
              value={scriptEditorContent}
              onChange={e => setScriptEditorContent(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%', height: '60vh', fontFamily: 'monospace', fontSize: '0.8rem',
                background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', border: '1px solid var(--card-border)',
                borderRadius: '8px', padding: '12px', resize: 'vertical', boxSizing: 'border-box',
                outline: 'none', lineHeight: '1.5',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
              <button onClick={() => setShowScriptEditor(false)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.07)', color: 'var(--text-main)', border: '1px solid var(--card-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                Cancelar
              </button>
              <button onClick={saveScriptEditor} disabled={scriptEditorSaving} style={{ padding: '8px 20px', background: scriptEditorSaving ? '#555' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '8px', cursor: scriptEditorSaving ? 'not-allowed' : 'pointer', fontWeight: '700' }}>
                {scriptEditorSaving ? 'Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecordModal && (
        <div className="modal-overlay" onClick={() => recordingStep !== 'recording' && setShowRecordModal(false)}>
          <div className="modal-content about-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>
                {recordingStep === 'intro' ? '¿Cómo funciona?' : recordingStep === 'recording' ? 'Grabando...' : 'Configurar Grabación'}
              </h2>
              {recordingStep !== 'recording' && (
                <button onClick={() => setShowRecordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  <X size={20} />
                </button>
              )}
            </div>

            {/* ── STEP 1: INTRO ANIMADA ── */}
            {recordingStep === 'intro' && (
              <div>
                {/* Mockup animado de navegador */}
                <div style={{ animation: 'browserSlideIn 0.5s ease forwards', background: '#1e293b', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.8rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                  {/* Barra del navegador */}
                  <div style={{ background: '#0f172a', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                    </div>
                    <div style={{ flex: 1, background: '#1e293b', borderRadius: '6px', padding: '4px 10px', fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#10b981' }}>🔒</span> portal.medifarma.com
                    </div>
                  </div>
                  {/* Contenido del navegador con cursor animado */}
                  <div style={{ height: '130px', position: 'relative', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', overflow: 'hidden' }}>
                    {/* Elementos de UI simulados */}
                    <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
                    <div style={{ position: 'absolute', top: '40px', left: '20px', width: '120px', height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
                    <div style={{ position: 'absolute', top: '55px', left: '20px', width: '80px', height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
                    <div style={{ position: 'absolute', top: '38px', right: '20px', width: '60px', height: '24px', background: 'rgba(0,74,153,0.5)', borderRadius: '6px', border: '1px solid rgba(0,74,153,0.8)' }} />
                    <div style={{ position: 'absolute', top: '72px', right: '20px', width: '60px', height: '24px', background: 'rgba(16,185,129,0.2)', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.4)' }} />
                    {/* Cursor animado */}
                    <div style={{ position: 'absolute', top: 0, left: 0, animation: 'cursorMove 3s ease-in-out infinite', fontSize: '18px', pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                      🖱️
                    </div>
                    {/* Indicador REC */}
                    <div style={{ position: 'absolute', bottom: '10px', right: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.15)', padding: '4px 8px', borderRadius: '20px', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'recordingPulse 1.5s ease infinite' }} />
                      <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: '800', letterSpacing: '1px' }}>GRABANDO</span>
                    </div>
                  </div>
                </div>

                {/* Pasos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
                  {[
                    { num: '1', icon: '🌐', title: 'Se abre un navegador', desc: 'Apuntando directo a la URL de tu portal. Sin configurar nada.' },
                    { num: '2', icon: '🖱️', title: 'Haces el flujo normalmente', desc: 'Haz clic, llena campos, navega — exactamente como lo harías tú.' },
                    { num: '3', icon: '⏹️', title: 'Vuelves aquí y guardas', desc: 'Haz clic en Detener. El flujo queda grabado y listo para replicar.' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', animation: `stepFadeIn 0.4s ease ${i * 0.15}s both` }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '0.8rem', flexShrink: 0 }}>{s.num}</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '2px' }}>{s.icon} {s.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="btn-run" style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => setRecordingStep('form')}>
                  Entendido — Configurar grabación →
                </button>
              </div>
            )}

            {/* ── STEP 2: FORMULARIO ── */}
            {recordingStep === 'form' && !isRecording && (
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
            )}

            {/* ── STEP 3: GRABANDO ── */}
            {recordingStep === 'recording' && (
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

      {/* Modal de Generación de PDF Bajo Demanda */}
      {pdfLoading && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '500px', textAlign: 'center', padding: '2.5rem' }}>
            <div className="ai-loader" style={{ marginBottom: '1.5rem' }}>
              <div className="ai-circle"></div>
              <Sparkles size={32} color="#6366f1" className="ai-sparkle" />
            </div>
            
            <h3 style={{ marginBottom: '10px', color: 'var(--text-main, #fff)' }}>Generando PDF</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Nuestra IA está analizando las capturas de pantalla de SAP para explicar el flujo de negocio...
            </p>

            <div className="pdf-progress-log" style={{
              background: '#0a0a0a', borderRadius: '12px', padding: '1.2rem',
              textAlign: 'left', maxHeight: '180px', overflowY: 'auto', marginBottom: '2rem',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
            }}>
              {pdfMessages.map((msg, i) => (
                <div key={i} style={{ 
                  fontSize: '0.8rem', 
                  color: i === pdfMessages.length - 1 ? '#a78bfa' : 'rgba(255,255,255,0.5)', 
                  marginBottom: '8px', 
                  display: 'flex', 
                  gap: '10px',
                  lineHeight: '1.4'
                }}>
                  <span style={{ color: '#6366f1', fontWeight: '700', fontSize: '0.7rem' }}>[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>
                  <span style={{ color: i === pdfMessages.length - 1 ? '#fff' : 'inherit' }}>{msg}</span>
                </div>
              ))}
              <div id="pdf-log-bottom"></div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {pdfDoneUrl ? (
                <>
                  <button className="btn-add" style={{ flex: 1 }} onClick={() => { handleOpenPdf(pdfDoneUrl); setPdfLoading(false); setPdfMessages([]); setPdfDoneUrl(null); }}>
                    📄 Abrir PDF
                  </button>
                  <button className="btn-secondary" onClick={() => { setPdfLoading(false); setPdfMessages([]); setPdfDoneUrl(null); }}>
                    Cerrar
                  </button>
                </>
              ) : (
                <div style={{ flex: 1, color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Esto puede tardar unos segundos dependiendo del número de pasos...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estilos dinámicos para el cargador IA */}
      {showSettings && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px' }}>
                  <Settings size={20} color="#6366f1" />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Configuración</h2>
              </div>
              <button className="btn-close" onClick={() => setShowSettings(false)}><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Directorio del Proyecto</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" value={projectDir} readOnly style={{ flex: 1, background: '#f8fafc', color: '#64748b' }} />
                  <button 
                    onClick={async () => {
                      const path = await window.electron.selectFolder();
                      if (path) {
                        setProjectDir(path);
                        const res = await fetch(`${API_BASE}/config/project-dir`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ projectDir: path })
                        });
                        if (res.ok) {
                          addToast("📁 Directorio actualizado.", "success");
                          fetchInitialData();
                        }
                      }
                    }}
                    style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '0 12px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Cambiar
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Git Token (Seidor)</label>
                <input 
                  type="password" 
                  value={gitToken} 
                  onChange={e => setGitToken(e.target.value)}
                  placeholder="ghp_..."
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '6px' }}>Requerido para el pull automático de ramas remotas.</p>
              </div>

              <button 
                className="btn-run"
                style={{ background: 'var(--accent-primary)', color: 'white', width: '100%', marginTop: '10px' }}
                onClick={async () => {
                  const res = await fetch(`${API_BASE}/config/git-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gitToken })
                  });
                  if (res.ok) {
                    addToast("✅ Configuración guardada.", "success");
                    setShowSettings(false);
                    fetchInitialData();
                  }
                }}
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangelog && (
        <div className="modal-overlay" onClick={() => setShowChangelog(false)}>
          <div className="evolution-modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="evolution-header">
              <div className="evolution-title">
                <Sparkles size={20} className="sparkle-icon" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Evolución de AutoBot</h2>
              </div>
              <button className="evolution-close" onClick={() => setShowChangelog(false)}><X size={20} /></button>
            </div>
            
            <div className="evolution-timeline">
              <div className="timeline-item">
                <div className="timeline-icon rocket" style={{ border: '2px solid #f59e0b', color: '#f59e0b' }}><Zap size={12} /></div>
                <div className="timeline-content">
                  <div className="timeline-version">v2.1.0 — La Era de la Sincronización</div>
                  <div className="timeline-date">Hoy</div>
                  <p>Unificación total de ramas CI y Medifarma con el nuevo diseño <strong>Enterprise Glass</strong>.</p>
                  <ul className="timeline-list">
                    <li>Centro de mando unificado para escenarios.</li>
                    <li>Interruptores de alta velocidad (Headless Mode).</li>
                    <li>Branding remasterizado con logo "Pure".</li>
                  </ul>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-icon gear" style={{ border: '2px solid #64748b', color: '#64748b' }}><Settings size={12} /></div>
                <div className="timeline-content">
                  <div className="timeline-version">v2.0.0 — Estabilidad Definitiva</div>
                  <div className="timeline-date">Ayer</div>
                  <p>Implementación de la arquitectura nativa para macOS y persistencia de base de datos local.</p>
                </div>
              </div>
            </div>

            <div className="evolution-footer">
              <button className="btn-evolution-ok" onClick={() => setShowChangelog(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pdf-progress-log div:last-child {
          animation: fadeIn 0.3s ease-out;
        }
        .btn-gemini-gen {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)) !important;
          color: #8b5cf6 !important;
          border: 1px solid rgba(139, 92, 246, 0.3) !important;
        }
        .btn-gemini-gen:hover {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2)) !important;
          border-color: rgba(139, 92, 246, 0.5) !important;
        }
        .ai-loader {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }
        .ai-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 4px solid rgba(99, 102, 241, 0.1);
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .ai-sparkle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast${t.exiting ? ' exiting' : ''}`}>
            <div className={`toast-icon ${t.type}`}>
              {t.type === 'success'
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              }
            </div>
            <span className="toast-msg">{t.msg}</span>
            <div className={`toast-progress ${t.type}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
