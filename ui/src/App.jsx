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
        <div className="ai-badge">
          <div className="ai-badge-label">Inteligencia Artificial</div>
          <div className="ai-badge-name">
            <Cpu size={14} /> SAP Core AI
          </div>
        </div>
        
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
        <div className="sidebar-label">Entorno Git</div>
        {gitNotLinked ? (
          <div className="git-not-linked-banner">
             <AlertTriangle size={12} /> Git no vinculado
          </div>
        ) : (
          <>
            <ModernSelect 
              value={currentBranch} 
              onChange={handleBranchChange} 
              options={['', ...branches].map(b => ({ label: b || '-- seleccionar --', value: b }))} 
            />
            <button onClick={onGitSync} className="btn-sync-git">
              <Zap size={14} /> Sincronizar Git
            </button>
          </>
        )}
      </div>

      <div className="sidebar-section" style={{ flex: 1, marginTop: '2rem' }}>
        <div className="sidebar-label">Mis Proyectos</div>
        {registry?.map(c => (
          <div key={c.id} className={`client-item ${activeClient === c.id ? 'active' : ''}`} onClick={() => { setActiveClient(c.id); setActiveProcess(c.procesos[0]?.id || ''); }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>{c.icon || <Info size={18} />}</span>
            <div className="client-name">{c.name}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', padding: '1rem 0', display: 'flex', justifyContent: 'center', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
        <button 
          onClick={() => setShowChangelog(true)}
          className="evolution-portal-trigger"
        >
          <Sparkles size={14} className="sparkle-icon" />
          <span style={{ fontSize: '0.72rem', fontWeight: '500' }}>Evolución del Sistema</span>
        </button>
      </div>
    </aside>
  );
};

const App = () => {
  const [registry, setRegistry] = useState([]);
  const [activeClient, setActiveClient] = useState('CI');
  const [activeProcess, setActiveProcess] = useState('');
  const [activeScenarioId, setActiveScenarioId] = useState('');
  const [builderConfig, setBuilderConfig] = useState({ headless: true });
  const [showChangelog, setShowChangelog] = useState(false);
  const [testerName, setTesterName] = useState('Pierre Gálvez');
  const [projectName, setProjectName] = useState('AutoBot Project');
  const [currentBranch, setCurrentBranch] = useState('');
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/registry`).then(r => r.json()).then(data => {
      setRegistry(data);
      if (data[0]) {
        setActiveClient(data[0].id);
        setActiveProcess(data[0].procesos[0]?.id || '');
      }
    });
    fetch(`${API_BASE}/git/branches`).then(r => r.json()).then(setBranches);
    fetch(`${API_BASE}/git/current-branch`).then(r => r.text()).then(setCurrentBranch);
  }, []);

  const handleScenarioSelect = (id) => {
    setActiveScenarioId(id);
    // Cargar datos del escenario si es necesario
  };

  const openRecordModal = () => {
    // Lógica para abrir modal de grabación
  };

  const deleteScenario = () => {
    // Lógica para borrar escenario
  };

  return (
    <div className="app-container">
      <Sidebar 
        registry={registry}
        activeClient={activeClient}
        setActiveClient={setActiveClient}
        activeProcess={activeProcess}
        setActiveProcess={setActiveProcess}
        currentBranch={currentBranch}
        branches={branches}
        testerName={testerName}
        setTesterName={setTesterName}
        projectName={projectName}
        setProjectName={setProjectName}
        setShowChangelog={setShowChangelog}
      />
      
      <main className="main-content">
        <header className="main-header">
          <div className="header-info">
            <h1 className="main-title">Configuración del Escenario</h1>
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
            <button className="btn-record-mini" onClick={openRecordModal}>
              <Circle size={14} fill="white" className="rec-pulse" />
              Grabar
            </button>
            {activeScenarioId && (
              <button onClick={deleteScenario} className="btn-icon-danger">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

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
      </main>

      {showChangelog && (
        <div className="modal-overlay" onClick={() => setShowChangelog(false)}>
          <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2>Evolución de AutoBot</h2>
            {/* Contenido del changelog */}
            <button className="btn-close" onClick={() => setShowChangelog(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
