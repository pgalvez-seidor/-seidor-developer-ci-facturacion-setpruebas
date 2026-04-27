import { useState } from 'react';
import {
  Cloud, CloudOff, Info, Settings, Power, Sparkles, Cpu, ChevronRight, Loader
} from 'lucide-react';
import { TransparentLogo } from './GitInitScreen';

const API_BASE = 'http://localhost:3001/api';

const ModernSelect = ({ value, onChange, options, placeholder = '-- seleccionar --', style = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <div className="modern-select-container" style={style}>
      <div 
        className={`modern-select-trigger ${!value ? 'is-placeholder' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        style={{ color: !value ? '#98989d' : 'inherit' }}
      >
        <span>{selectedLabel}</span>
        <ChevronRight size={16} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: '0.3s', opacity: 0.5 }} />
      </div>
      {isOpen && (
        <>
          <div className="modern-select-backdrop" onClick={() => setIsOpen(false)} />
          <div className="modern-select-dropdown animate-scale-in" style={{
              position: 'absolute',
              top: '105%',
              left: 0,
              right: 0,
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              padding: '8px',
              zIndex: 10000,
              border: '1px solid rgba(0,0,0,0.05)',
              marginTop: '4px'
            }}>
            <div 
              className={`modern-select-option ${!value ? 'active' : ''} ${value ? 'disabled-placeholder' : ''}`}
              onClick={() => { if (!value) return; onChange(''); setIsOpen(false); }}
              style={{ 
                color: !value ? 'white' : '#98989d',
                opacity: value ? 0.5 : 1,
                cursor: value ? 'not-allowed' : 'pointer',
                pointerEvents: value ? 'none' : 'auto'
              }}
            >
              <span>{placeholder}</span>
              {!value && <div className="modern-select-tick">✓</div>}
            </div>
            <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '4px 8px' }} />
            {options.length === 0 ? (
              <div className="modern-select-option empty">Sin opciones</div>
            ) : (
              options.map(o => (
                <div 
                  key={o.value} 
                  className={`modern-select-option ${value === o.value ? 'active' : ''}`}
                  onClick={() => { onChange(o.value); setIsOpen(false); }}
                >
                  <span>{o.label}</span>
                  {value === o.value && <div className="modern-select-tick">✓</div>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};


// ─── Sidebar Component ───

const Sidebar = ({
  registry, activeClient, setActiveClient,
  activeProcess, setActiveProcess,
  onHanaSync,
  hanaStatus,
  setShowSettings,
  testerName, setTesterName,
  projectName, setProjectName,
  setShowChangelog,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (isSyncing || !hanaStatus?.connected) return;
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE}/supabase/sync`, { method: 'POST' });
      if (onHanaSync) onHanaSync();
    } catch (e) {
      console.error('Sync error:', e);
    }
    setIsSyncing(false);
  };

  const hanaConnected = hanaStatus?.connected;
  const hanaColor = !hanaStatus ? '#8e8e93' : hanaConnected ? '#10b981' : '#f59e0b';

  return (
    <aside className="sidebar stagger-container">
      <div className="sidebar-header-fixed stagger-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="./logo-pure.png" alt="AutoBot Logo" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
          <div style={{ fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Auto<span style={{ fontWeight: '700' }}>Bot</span></span>
          </div>
        </div>
        
        {/* Indicador de Nube Simplificado en el Header */}
        <div 
          title={hanaConnected ? (hanaStatus?.pending > 0 ? `Sincronizando ${hanaStatus.pending} items...` : 'Sincronizado') : 'Offline'}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', 
            background: hanaConnected ? (hanaStatus?.pending > 0 ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)') : 'rgba(245,158,11,0.1)', 
            borderRadius: '100px', fontSize: '0.65rem', fontWeight: '800', 
            color: hanaConnected ? (hanaStatus?.pending > 0 ? '#6366f1' : '#10b981') : '#f59e0b', 
            border: `1px solid ${hanaConnected ? (hanaStatus?.pending > 0 ? 'rgba(99,102,241,0.3)' : 'rgba(16,185,129,0.3)') : 'rgba(245,158,11,0.3)'}`,
            transition: 'all 0.3s'
          }}
        >
          {isSyncing || (hanaConnected && hanaStatus?.pending > 0) 
            ? <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} />
            : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 6px currentColor' }} className={hanaStatus?.pending === 0 && hanaConnected ? 'pulse-green' : ''} />
          }
          {hanaConnected ? (hanaStatus?.pending > 0 ? 'Sync...' : 'Online') : 'Offline'}
        </div>
      </div>

      <div className="sidebar-scroll-body">
        
        {/* 1. METADATA DEL TEST (Para el PDF) */}
        <div className="sidebar-section stagger-item">
          <div className="sidebar-label">Información del Test</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '2px', letterSpacing: '0.5px' }}>PROYECTO / CASO</div>
            <input
              type="text"
              className="branch-select"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Ej: Central de Pesado"
              style={{ fontSize: '0.85rem', borderRadius: '12px', padding: '10px 16px', background: 'var(--apple-bg)', marginBottom: '4px' }}
            />

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '2px', letterSpacing: '0.5px' }}>MÓDULO / SISTEMA</div>
            <input
              type="text"
              className="branch-select"
              placeholder="Ej: SAP MM / Fiori"
              style={{ fontSize: '0.85rem', borderRadius: '12px', padding: '10px 16px', background: 'var(--apple-bg)', marginBottom: '4px' }}
            />

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '2px', letterSpacing: '0.5px' }}>AMBIENTE</div>
            <div style={{ marginBottom: '4px' }}>
              <ModernSelect
                value="QAS"
                onChange={() => {}}
                options={[
                  { label: 'QAS (Calidad)', value: 'QAS' },
                  { label: 'PRD (Producción)', value: 'PRD' },
                  { label: 'DEV (Desarrollo)', value: 'DEV' }
                ]}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '2px', letterSpacing: '0.5px' }}>USUARIO (TESTER)</div>
            <input
              type="text"
              className="branch-select"
              value={testerName}
              onChange={e => setTesterName(e.target.value)}
              placeholder="Tu nombre"
              style={{ fontSize: '0.85rem', borderRadius: '12px', padding: '10px 16px', background: 'var(--apple-bg)' }}
            />

          </div>
        </div>

        {/* 2. CLIENTES (El Proceso Analítico se oculta para simplificar UI) */}
        <div className="sidebar-section stagger-item">
          <div className="sidebar-label">Clientes</div>
          {registry.map(c => (
            <div key={c.id} className={`client-item ${activeClient === c.id ? 'active' : ''}`} onClick={() => { 
              setActiveClient(c.id); 
              const bestProcess = c.procesos.find(p => p.escenarios && p.escenarios.length > 0) || c.procesos[0];
              setActiveProcess(bestProcess?.id || ''); 
            }}>
              <div className="client-name">{c.name}</div>
            </div>
          ))}
        </div>

      </div>

      {/* FOOTER FIJO - BOTONES MODERNOS REDONDOS */}
      <div className="sidebar-footer-fixed stagger-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'center', gap: '20px' }}>
          <button
            onClick={() => setShowSettings(true)}
            title="Configuración"
            className="sidebar-footer-btn settings"
          >
            <Settings size={20} strokeWidth={2} />
          </button>
          <button
            onClick={() => window.handleShutdown()}
            title="Apagar"
            className="sidebar-footer-btn shutdown"
          >
            <Power size={20} strokeWidth={2} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(0,0,0,0.25)', fontSize: '0.65rem', fontWeight: '700' }}>
            <Cpu size={12} />
            POTENCIADA POR SAP AI CORE
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.15)', fontWeight: '800', letterSpacing: '0.05em' }}>
            AUTOBOT AI v2.1.0
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
export { ModernSelect };
