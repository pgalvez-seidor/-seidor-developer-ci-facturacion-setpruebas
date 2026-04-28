import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Eye, Zap, CreditCard, Banknote, Trash2, Plus, Tag, Brain, GitBranch,
  CheckCircle2, AlertCircle, Clock, Info, ChevronRight, X, Circle, Square, Power,
  Sparkles, FileText, Settings, Cpu, Bot, AlertTriangle, Play, Save, Code, History
} from 'lucide-react';
import './index-a.css';

// Componentes Modularizados (Claude v2)
import GitInitScreen, { TransparentLogo } from './components/GitInitScreen';
import Sidebar, { ModernSelect } from './components/Sidebar';
import PaymentTray from './components/PaymentTray';
import CodeEditor from './components/CodeEditor';
import ManagementScreen from './components/ManagementScreen';
import { ModernSwitch, ModernCheckbox, IteracionesPicker, ThreadsPicker, NuclearSwitch } from './components/UIElements';

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  const [registry, setRegistry] = useState([]);
  const [activeClient, setActiveClient] = useState('Medifarma');
  const [activeProcess, setActiveProcess] = useState('mf_flujos');
  
  // Estados de Git & Configuración
  const [branches, setBranches] = useState([]);
  const [currentBranch, setBranch] = useState('');
  const [projectDir, setProjectDir] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [gitNotLinked, setGitNotLinked] = useState(false);
  const [remoteChangesCount, setRemoteChangesCount] = useState(0);

  // Estados de UI & Modales
  const [toasts, setToasts] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelogContent, setChangelogContent] = useState('');
  const [testerName, setTesterName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  // Estados de Escenario & Ejecución
  const [activeScenarioId, setActiveScenarioId] = useState('');
  const [newScenarioName, setNewScenarioName] = useState('');
  const [instruccionesIa, setInstruccionesIa] = useState('');
  const [builderConfig, setBuilderConfig] = useState({
    iteraciones: 1, headless: true, tipoComprobante: 'Boleta', 
    ruc: '', medioVuelto: 'Efectivo', pagos: [], 
    area: 'AMBULATORIA-ADMISION', periodo: '02-2026',
    usuarioCajero: 'PGALVEZ3', codigoCentro: '4', prefacturaBase: ''
  });

  const [queue, setQueue] = useState([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [globalPdf, setGlobalPdf] = useState(null);

  // --- Helpers UI ---
  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t)), 2700);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // --- Data Fetching ---
  const fetchRegistry = async () => {
    try {
      const res = await fetch(`${API_BASE}/registry`);
      if (res.ok) setRegistry(await res.json());
    } catch (e) { console.error("Error registry:", e); }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (res.ok) {
        const data = await res.json();
        setProjectDir(data.projectDir || '');
        setGitToken(data.gitToken || '');
        setGeminiKey(data.geminiKey || '');
        setGitNotLinked(!data.projectDir);
      }
    } catch (e) { console.error("Error config:", e); }
  };

  const fetchGitStatus = useCallback(async () => {
    if (!projectDir) return;
    try {
      const res = await fetch(`${API_BASE}/git/status`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
        setBranch(data.currentBranch || '');
        setRemoteChangesCount(data.remoteChanges || 0);
      }
    } catch (e) { console.error("Error git status:", e); }
  }, [projectDir]);

  useEffect(() => {
    fetchRegistry();
    fetchConfig();
    
    const handleSyncError = (e) => {
      addToast(`❌ Error de Sincronización: ${e.detail.error}`, "error");
    };
    window.addEventListener('sync-error', handleSyncError);
    return () => window.removeEventListener('sync-error', handleSyncError);
  }, []);

  useEffect(() => {
    if (projectDir) fetchGitStatus();
  }, [projectDir, fetchGitStatus]);

  const handleGitSync = async () => {
    addToast("🔄 Sincronizando con Git...", "info");
    try {
      const res = await fetch(`${API_BASE}/git/sync`, { method: 'POST' });
      if (res.ok) {
        addToast("✅ Sincronización exitosa", "success");
        fetchGitStatus();
      }
    } catch (e) { addToast("❌ Error en sincronización", "error"); }
  };

  const activeProcessScenarios = registry.find(c => c.id === activeClient)?.procesos?.find(p => p.id === activeProcess)?.escenarios || [];
  const activeScenario = activeProcessScenarios.find(s => s.id === activeScenarioId);

  // --- Render Principal ---
  if (!projectDir && !showSettings) {
    return <GitInitScreen onContinue={async () => {
      const path = await window.electron.selectFolder();
      if (path) {
        const res = await fetch(`${API_BASE}/config/project-dir`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectDir: path })
        });
        if (res.ok) fetchConfig();
      }
    }} />;
  }

  return (
    <div className="app">
      <div className="body">
        <Sidebar 
          registry={registry}
          activeClient={activeClient}
          setActiveClient={setActiveClient}
          activeProcess={activeProcess}
          setActiveProcess={setActiveProcess}
          currentBranch={currentBranch}
          branches={branches}
          handleBranchChange={(e) => setBranch(e.target.value)}
          onGitSync={handleGitSync}
          setShowAbout={setShowAbout}
          setShowSettings={setShowSettings}
          setShowManagement={setShowManagement}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ width: '40px', height: '40px', background: 'var(--accent-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Bot size={20} />
                 </div>
                 <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Dashboard de Operaciones</h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activeClient} / {activeProcess}</p>
                 </div>
              </div>
              <button className="btn-run" style={{ background: '#000', color: '#fff', borderRadius: '100px', padding: '10px 24px', fontWeight: '700' }}>
                <Play size={14} style={{ marginRight: '8px' }} /> Ejecutar Proceso
              </button>
            </header>
            
            <div className="scenarios-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {activeProcessScenarios.map(s => (
                <div 
                  key={s.id} 
                  className={`scenario-card ${activeScenarioId === s.id ? 'active' : ''}`}
                  onClick={() => setActiveScenarioId(s.id)}
                  style={{ 
                    padding: '20px', borderRadius: '24px', background: activeScenarioId === s.id ? 'white' : 'transparent',
                    border: '1px solid', borderColor: activeScenarioId === s.id ? 'var(--accent-primary)' : 'rgba(0,0,0,0.05)',
                    boxShadow: activeScenarioId === s.id ? '0 10px 30px rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer', transition: '0.3s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ padding: '8px', background: activeScenarioId === s.id ? 'var(--accent-primary)' : '#f2f2f7', borderRadius: '10px', color: activeScenarioId === s.id ? 'white' : '#8e8e93' }}>
                      <FileText size={16} />
                    </div>
                    {activeScenarioId === s.id && <Zap size={14} color="var(--accent-primary)" fill="var(--accent-primary)" />}
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '800' }}>{s.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#8e8e93' }}>{s.created_by || 'AutoBot v2'}</p>
                </div>
              ))}
              
              <div style={{ padding: '20px', borderRadius: '24px', border: '2px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                <Plus size={24} style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Nuevo Escenario</span>
              </div>
            </div>

            {activeScenario && (
              <div className="scenario-details animate-slide-up" style={{ marginTop: '40px', padding: '40px', background: 'white', borderRadius: '32px', boxShadow: '0 40px 100px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h3 style={{ margin: 0, fontWeight: '800' }}>Configuración: {activeScenario.name}</h3>
                  <button className="btn-secondary" style={{ borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={14} /> Guardar Cambios
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                   <div>
                     <IteracionesPicker value={builderConfig.iteraciones} onChange={v => setBuilderConfig({...builderConfig, iteraciones: v})} />
                     <NuclearSwitch checked={builderConfig.headless} onChange={v => setBuilderConfig({...builderConfig, headless: v})} label="Modo Invisible (Headless)" icon={Eye} />
                   </div>
                   <PaymentTray 
                      pagos={builderConfig.pagos} 
                      medioVuelto={builderConfig.medioVuelto}
                      updatePagos={p => setBuilderConfig({...builderConfig, pagos: p})}
                      updateMedioVuelto={v => setBuilderConfig({...builderConfig, medioVuelto: v})}
                   />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modales Premium */}
      {showManagement && (
        <ManagementScreen 
          onClose={() => setShowManagement(false)} 
          registry={registry} 
          onRefresh={fetchRegistry} 
        />
      )}

      {showSettings && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content animate-slide-up" style={{ width: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={20} color="#6366f1" />
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Configuración</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="btn-close"><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Directorio del Proyecto</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="form-input" value={projectDir} readOnly style={{ flex: 1 }} />
                  <button onClick={async () => {
                    const path = await window.electron.selectFolder();
                    if (path) {
                       setProjectDir(path);
                       await fetch(`${API_BASE}/config/project-dir`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectDir: path }) });
                    }
                  }} className="btn-secondary">Cambiar</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Git Token (ghp_...)</label>
                <input type="password" className="form-input" value={gitToken} onChange={e => setGitToken(e.target.value)} />
              </div>
              <button className="btn-run" style={{ width: '100%', marginTop: '10px' }} onClick={async () => {
                await fetch(`${API_BASE}/config/git-token`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ gitToken })
                });
                setShowSettings(false);
                addToast("✅ Configuración guardada", "success");
              }}>Guardar Configuración</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts System */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type} ${t.exiting ? 'exiting' : ''}`} style={{
            background: 'white', padding: '12px 24px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#6366f1'}`,
            animation: 'toastIn 0.3s ease-out', display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#6366f1' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{t.msg}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .toast.exiting { animation: toastOut 0.3s ease-in forwards; }
        @keyframes toastOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        .scenario-card:hover { transform: scale(1.02); border-color: var(--accent-primary); }
      `}</style>
    </div>
  );
}
