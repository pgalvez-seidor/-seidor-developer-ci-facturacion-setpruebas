import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Eye, Zap, CreditCard, Banknote, Trash2, Plus, Tag, Brain, GitBranch,
  CheckCircle2, AlertCircle, Clock, Info, ChevronRight, X, Circle, Square, Power,
  Sparkles, FileText, Settings, Cpu, Bot, AlertTriangle, Play
} from 'lucide-react';
import { basicSetup, EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentWithTab } from '@codemirror/commands';
import './index-a.css';

const API_BASE = 'http://localhost:3001/api';

const CodeEditor = ({ value, onChange }) => {
  const containerRef = useRef(null);
  const viewRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const extensions = [
      basicSetup,
      javascript({ jsx: false }),
      oneDark,
      keymap.of([indentWithTab]),
      EditorView.updateListener.of(update => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
      EditorView.theme({
        '&': { height: '60vh', borderRadius: '10px', overflow: 'hidden', fontSize: '13px' },
        '.cm-scroller': { fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace', lineHeight: '1.65', overflowY: 'auto' },
        '.cm-content': { padding: '12px 0' },
        '.cm-gutters': { borderRight: '1px solid rgba(255,255,255,0.06)' },
      }),
    ];
    const view = new EditorView({
      state: EditorState.create({ doc: value || '', extensions }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value || '' } });
    }
  }, [value]);

  return <div ref={containerRef} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }} />;
};

const TransparentLogo = ({ src, className, size = 64 }) => {
  const [processedSrc, setProcessedSrc] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        // Si es casi blanco (threshold 245), hacemos alfa 0
        if (r > 245 && g > 245 && b > 245) {
          data[i+3] = 0;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      setProcessedSrc(canvas.toDataURL());
    };
  }, [src]);

  return processedSrc ? (
    <img src={processedSrc} className={className} style={{ width: size, height: size, objectFit: 'contain' }} />
  ) : (
    <div style={{ width: size, height: size, background: 'rgba(0,0,0,0.05)', borderRadius: '50%' }} />
  );
};

const ModernSwitch = ({ checked, onChange, label, description, icon: Icon }) => (
  <div className="modern-switch-wrapper" onClick={() => onChange(!checked)}>
    <div className="modern-switch-info-group">
      <div className="modern-switch-info">
        {Icon && <Icon size={14} className="modern-switch-icon" />}
        <span>{label}</span>
      </div>
      {description && <div className="modern-switch-description">{description}</div>}
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

const IteracionesPicker = ({ value, onChange }) => {
  const [rotation, setRotation] = useState(0);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newValue = Math.max(1, Math.min(50, value + delta));
    if (newValue !== value) {
      onChange(newValue);
      setRotation(prev => prev + (delta * 45)); // Gira 45 grados por paso
    }
  };

  return (
    <div className="iter-picker-container" onWheel={handleWheel}>
      <div className="iter-wheel-wrapper">
        <Settings 
          size={28} 
          className="iter-wheel-icon" 
          style={{ transform: `rotate(${rotation}deg)` }} 
        />
      </div>
      <input 
        type="number" 
        className="iter-manual-input"
        value={value} 
        onChange={e => onChange(parseInt(e.target.value) || 1)}
        min="1" max="50"
      />
    </div>
  );
};

const ThreadsPicker = ({ value, onChange }) => {
  const [rotation, setRotation] = useState(0);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newValue = Math.max(1, Math.min(100, value + delta));
    if (newValue !== value) {
      onChange(newValue);
      setRotation(prev => prev + (delta * 30));
    }
  };

  return (
    <div className="iter-picker-container dark-mode-picker" onWheel={handleWheel} style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
      <div className="iter-wheel-wrapper">
        <Cpu 
          size={24} 
          className="iter-wheel-icon" 
          style={{ transform: `rotate(${rotation}deg)`, color: '#007aff' }} 
        />
      </div>
      <input 
        type="number" 
        className="iter-manual-input"
        value={value} 
        onChange={e => onChange(parseInt(e.target.value) || 1)}
        min="1" max="100"
        style={{ color: 'white' }}
      />
    </div>
  );
};

const NuclearSwitch = ({ active, onClick }) => {
  return (
    <div className={`nuclear-container nuclear-headless ${active ? 'active' : ''}`} onClick={() => onClick(!active)}>
      <div className="nuclear-base">
        <div className="nuclear-toggle"></div>
      </div>
      <div className="nuclear-label-group">
        <span className="nuclear-main-label">HEADLESS</span>
      </div>
    </div>
  );
};

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
          <div className="modern-select-dropdown animate-scale-in">
            {/* Opción de "Reset" o "Nuevo" (el placeholder) */}
            <div 
              className={`modern-select-option ${!value ? 'active' : ''} ${value ? 'disabled-placeholder' : ''}`}
              onClick={() => { if (!value) return; onChange(''); setIsOpen(false); }}
              style={{ 
                color: !value ? 'white' : '#98989d',
                opacity: value ? 0.5 : 1,
                cursor: value ? 'not-allowed' : 'pointer',
                pointerEvents: value ? 'none' : 'auto' // No seleccionable si ya hay otro
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

// ─────────────────────────────────────────────────────────────
// GIT INIT SCREEN — Splash elegante y minimalista
// ─────────────────────────────────────────────────────────────
const GitInitScreen = ({ onContinue }) => {
  const [gitInfo, setGitInfo] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [phase, setPhase] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [checkTrigger, setCheckTrigger] = useState(0);
  const [pullWhisper, setPullWhisper] = useState(null);
  const [testerInput, setTesterInput] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });
  const carouselRef = useRef(null);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  useEffect(() => {
    if (selectedBranch && carouselRef.current) {
      setTimeout(() => {
        const selectedEl = carouselRef.current.querySelector('.selected');
        if (selectedEl) {
          selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
    }
  }, [selectedBranch, gitInfo]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const MAX = 16;
    const delay = checkTrigger === 0 ? 800 : 400;
    const check = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_BASE}/git/init-check`);
        if (!res.ok) throw new Error('not ready');
        const data = await res.json();
        if (cancelled) return;
        setGitInfo(data);
        setSelectedBranch(data.current || data.branch || '');
        setPhase('ready');
        if (data.gitConnected) {
          fetch(`${API_BASE}/git/pull`, { method: 'POST' })
            .then(r => r.json())
            .then(pull => {
              if (pull.newScripts?.length > 0) {
                const nombres = pull.newScripts.slice(0, 2).join(', ');
                const resto = pull.newScripts.length > 2 ? ` y ${pull.newScripts.length - 2} más` : '';
                setPullWhisper(`Escenarios nuevos: ${nombres}${resto}`);
              }
            })
            .catch(() => {});
        }
      } catch (e) {
        if (cancelled) return;
        attempts++;
        if (attempts < MAX) setTimeout(check, 500);
        else setPhase('error');
      }
    };
    setTimeout(check, delay);
    return () => { cancelled = true; };
  }, [checkTrigger]);

  const handleSelectFolder = async () => {
    let folder = null;

    if (window.electron?.selectFolder) {
      setIsSelectingFolder(true);
      try {
        folder = await window.electron.selectFolder();
      } catch (e) {
        console.error("Electron selectFolder error:", e);
      }
      setIsSelectingFolder(false);
    } else {
      // Fallback para cuando se usa en el navegador (Desarrollo)
      folder = window.prompt("Introduce la ruta absoluta de la carpeta del proyecto:", gitInfo?.projectDir || "");
    }

    if (!folder) return;

    try {
      // Alerta solicitada por el usuario al cambiar la ruta
      alert("⚠️ Has cambiado la ruta del proyecto.\n\nIMPORTANTE: Asegúrate de mover manualmente tus archivos de prueba a esta carpeta o realizar un 'Clone' para inicializarla correctamente.");

      await fetch(`${API_BASE}/config/project-dir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir: folder })
      });
      setPhase('loading');
      setGitInfo(null);
      setCheckTrigger(t => t + 1);
    } catch (err) {
      alert("Error al actualizar la ruta en el servidor");
    }
  };

  const handleClone = async () => {
    if (!repoUrl || !gitInfo?.projectDir && !isSelectingFolder) {
      if (!gitInfo?.projectDir) await handleSelectFolder();
      return;
    }
    setIsCloning(true);
    try {
      const res = await fetch(`${API_BASE}/git/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, projectDir: gitInfo.projectDir })
      });
      const data = await res.json();
      if (data.success) {
        setCheckTrigger(t => t + 1);
      } else {
        alert(data.error || "Error al clonar");
      }
    } catch (e) {
      alert("Error de conexión al clonar");
    }
    setIsCloning(false);
  };

  const handleContinue = async () => {
    if (!testerInput.trim()) {
      setNameError(true);
      showToast("Es obligatorio identificarte");
      return;
    }
    
    if (gitInfo?.gitConnected && selectedBranch !== (gitInfo.current || gitInfo.branch)) {
      setIsChanging(true);
      try {
        await fetch(`${API_BASE}/git/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch: selectedBranch })
        });
      } catch (_) {}
      setIsChanging(false);
    }
    onContinue(selectedBranch, testerInput.trim());
  };

  const statusColor  = gitInfo?.gitConnected ? '#34c759' : gitInfo?.gitNotLinked ? '#ff9500' : '#8e8e93';
  const statusLabel  = gitInfo?.gitConnected ? 'Conectado' : gitInfo?.gitNotLinked ? 'Sin repositorio' : 'Local';
  const statusDot    = gitInfo?.gitConnected ? 'pulse-green' : 'pulse-orange';

  return (
    <div className="git-splash-overlay">
      <div className="git-splash-card">

        {/* ── LOGO ── */}
        <div className="git-splash-logo-wrap">
          <TransparentLogo src="./logo-pure.png" size={96} className="git-splash-logo" />
          <div className="git-splash-brand">
            Auto<span>Bot</span>
            <span className="git-splash-version">v2.1.0</span>
          </div>
        </div>

        {/* ── ESTADO GIT ── */}
        {phase === 'loading' && (
          <div className="git-splash-loading">
            <div className="git-splash-spinner" />
            <span>Conectando con repositorio...</span>
          </div>
        )}

        {phase === 'error' && (
          <div className="git-splash-status-row" style={{ color: '#ff3b30' }}>
            <div className="git-splash-dot" style={{ background: '#ff3b30' }} />
            <span>No se pudo conectar al backend. ¿Está iniciado el servidor?</span>
          </div>
        )}

        {phase === 'ready' && (
          <>
            {/* Campo de nombre (AHORA ARRIBA) */}
            <div style={{ width: '100%', marginBottom: '20px' }}>
              <label className="git-splash-input-label">TU NOMBRE COMPLETO</label>
              <input
                className={`git-splash-name-input ${nameError ? 'error' : ''}`}
                type="text"
                placeholder=""
                value={testerInput}
                onChange={e => {
                  setTesterInput(e.target.value);
                  if (nameError) setNameError(false);
                }}
                onKeyDown={e => e.key === 'Enter' && handleContinue()}
                autoFocus
              />
            </div>

            {/* Status & Path Area */}
            <div className="git-splash-status-area">
              <div className="git-splash-status-row">
                <div className={`git-splash-dot ${statusDot}`} style={{ background: statusColor }} />
                <span style={{ color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
              </div>
              
              {/* Ruta del proyecto (Clickable para cambiar) */}
              <div className="git-splash-path-card" onClick={handleSelectFolder}>
                <span className="git-splash-path-label">UBICACIÓN DEL PROYECTO</span>
                <div className="git-splash-path-value">
                  <span className="git-splash-path-text">{gitInfo.projectDir}</span>
                  <div className="git-splash-path-action">
                    <Settings size={12} />
                    Cambiar
                  </div>
                </div>
              </div>
            </div>

            {/* Clone Section if no repo */}
            {gitInfo.gitNotLinked && (
              <div className="git-splash-clone-box">
                <label className="git-splash-input-label">URL del Repositorio Git</label>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="https://github.com/usuario/repo.git"
                    value={repoUrl}
                    onChange={e => setRepoUrl(e.target.value)}
                    style={{ flex: 1, textAlign: 'left', padding: '10px 15px' }}
                  />
                  <button 
                    className="git-splash-clone-btn" 
                    onClick={handleClone}
                    disabled={isCloning || !repoUrl}
                  >
                    {isCloning ? <div className="git-splash-spinner small" /> : <GitBranch size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Ramas - Pill Style */}
            {gitInfo.branches?.length > 0 && (
              <div className="git-splash-branches">
                <div className="git-splash-branches-label">RAMA DE TRABAJO</div>
                <div className="git-splash-branch-pills" ref={carouselRef}>
                  {gitInfo.branches.map(b => {
                    const isActive = b === (gitInfo.current || gitInfo.branch);
                    const isSelected = b === selectedBranch;
                    return (
                      <button
                        key={b}
                        className={`git-splash-branch-pill ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedBranch(b)}
                      >
                        <span className="git-splash-branch-name">{b}</span>
                        {isActive && <div className="git-splash-active-dot" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Info adicional */}
            {(gitInfo.behind > 0 || gitInfo.uncommitted) && (
              <div className="git-splash-notices">
                {gitInfo.behind > 0 && (
                  <div className="git-splash-notice warning">
                    <Zap size={12} />
                    {gitInfo.behind} commit{gitInfo.behind > 1 ? 's' : ''} pendiente{gitInfo.behind > 1 ? 's' : ''} de pull
                  </div>
                )}
                {gitInfo.uncommitted && (
                  <div className="git-splash-notice info">
                    <AlertCircle size={12} />
                    Escenarios nuevos detectados localmente
                  </div>
                )}
              </div>
            )}





            {/* CTA */}
            <button
              className="git-splash-cta"
              onClick={handleContinue}
              disabled={isChanging || !testerInput.trim() || (gitInfo.gitNotLinked && !gitInfo.branches?.length)}
              style={{ opacity: (testerInput.trim() && (gitInfo.branches?.length > 0 || !gitInfo.gitNotLinked)) ? 1 : 0.45 }}
            >
              {isChanging
                ? 'Cambiando rama...'
                : 'Ingresar'
              }
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* ── WHISPER ── */}
        {pullWhisper && (
          <div className="git-splash-whisper">
            <Sparkles size={11} />
            <span>Hey, {pullWhisper}</span>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="git-splash-footer">
          <Cpu size={12} color="#8e8e93" />
          <span>Seidor Perú · AutoBot QA Engine</span>
        </div>
      </div>
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
  setShowChangelog,
  isGitLoading
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

      {/* HEADER FIJO */}
      <div className="sidebar-header-fixed" style={{ flexDirection: 'row', alignItems: 'center', padding: '14px 16px', justifyContent: 'flex-start', gap: '10px' }}>
        <TransparentLogo src="./logo-pure.png" className="brand-isotype" size={68} style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div className="brand-name" style={{ fontSize: '1.2rem', lineHeight: 1 }}>
            Auto<span style={{ fontWeight: '700' }}>Bot</span>
          </div>
          {currentBranch && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', background: remoteChangesCount > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.12)', borderRadius: '100px', fontSize: '0.6rem', fontWeight: '800', color: remoteChangesCount > 0 ? '#d97706' : '#6366f1', border: `1px solid ${remoteChangesCount > 0 ? 'rgba(245,158,11,0.35)' : 'rgba(99,102,241,0.25)'}`, alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
              <GitBranch size={9} />
              {currentBranch}
              {remoteChangesCount > 0 && <span style={{ background: '#f59e0b', color: 'white', borderRadius: '100px', padding: '0 4px', fontSize: '0.52rem', fontWeight: '900' }}>{remoteChangesCount}</span>}
            </div>
          )}
        </div>
      </div>

      {/* CONTENIDO SCROLLABLE */}
      <div className="sidebar-scroll-body">

        <div className="sidebar-section">
          <div className="sidebar-label">Metadata del Reporte</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '4px', letterSpacing: '0.5px' }}>PROYECTO</div>
            <input
              type="text"
              className="branch-select"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Ej: Medifarma - SAP Fiori"
              style={{ fontSize: '0.85rem', borderRadius: '24px', padding: '12px 20px', background: 'var(--apple-bg)' }}
            />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '4px', marginTop: '8px', letterSpacing: '0.5px' }}>USUARIO (TESTER)</div>
            <input
              type="text"
              className="branch-select"
              value={testerName}
              onChange={e => setTesterName(e.target.value)}
              placeholder="Tu nombre completo"
              style={{ fontSize: '0.85rem', borderRadius: '24px', padding: '12px 20px', background: 'var(--apple-bg)' }}
            />
          </div>
        </div>

        <div className="sidebar-section">
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.7rem', fontWeight: '700', color: remoteChangesCount > 0 ? '#d97706' : '#10b981' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: remoteChangesCount > 0 ? '#f59e0b' : '#10b981', boxShadow: remoteChangesCount > 0 ? '0 0 6px rgba(245,158,11,0.6)' : '0 0 6px rgba(16,185,129,0.6)' }} />
                {remoteChangesCount > 0 ? `${remoteChangesCount} cambios pendientes` : 'Sincronizado'}
              </div>
              <ModernSelect
                value={currentBranch}
                onChange={val => handleBranchChange({ target: { value: val } })}
                options={branches.map(b => ({ label: b, value: b }))}
                placeholder="Seleccionar Rama "
              />
              <button
                onClick={onGitSync}
                className="btn-sync-git"
                style={{
                  marginTop: '10px', width: '100%', padding: '10px',
                  background: remoteChangesCount > 0 ? 'var(--accent-primary)' : 'rgba(99, 102, 241, 0.1)',
                  color: remoteChangesCount > 0 ? 'white' : '#6366f1',
                  border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '100px',
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

        <div className="sidebar-section">
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
                onChange={val => setActiveProcess(val)}
                options={registry.find(c => c.id === activeClient)?.procesos?.map(p => ({ label: p.name, value: p.id })) || []}
              />
            </div>
          )}
        </div>

      </div>

      {/* FOOTER FIJO */}
      <div className="sidebar-footer-fixed" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', paddingBottom: '4px' }}>
          <button
            onClick={() => setShowSettings(true)}
            title="Configuración"
            style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid rgba(37,99,235,0.35)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.7)'; e.currentTarget.style.background = 'rgba(37,99,235,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.35)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Settings size={18} strokeWidth={2.5} color="#2563eb" />
          </button>
          <button
            onClick={() => window.handleShutdown()}
            title="Apagar"
            style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid rgba(239,68,68,0.3)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.7)'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Power size={18} strokeWidth={2.5} color="#ef4444" />
          </button>
        </div>
        <div className="sap-branding-badge">
          <Cpu size={13} color="var(--accent-primary)" />
          <span className="sap-branding-text">Potencia por SAP AI Core</span>
        </div>
        <button
          onClick={() => setShowChangelog(true)}
          className="evolution-text"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Sparkles size={11} color="#f59e0b" />
          <span>AutoBotAI v2.1.0</span>
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
          <ModernSelect 
            value={medioVuelto || "Efectivo"} 
            onChange={(val) => updateMedioVuelto(val)} 
            options={MEDIOS_VUELTO.map(m => ({ label: m, value: m }))}
          />
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [gitInitDone, setGitInitDone] = useState(false);

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
  const [appVisible, setAppVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAppVisible(true), 60); return () => clearTimeout(t); }, []);

  // Grabación de flujos (Playwright Codegen)
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordingStep, setRecordingStep] = useState('intro'); // 'intro' | 'form' | 'recording'
  const [isRecording, setIsRecording] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelogContent, setChangelogContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [isGitLoading, setIsGitLoading] = useState(false);
  const [remoteChangesCount, setRemoteChangesCount] = useState(0);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [gitNotLinked, setGitNotLinked] = useState(false);
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
    if (!branch || branch === currentBranch) return;
    setIsGitLoading(true);
    try {
      const r = await fetch(`${API_BASE}/checkout`, { 
        method: 'POST', 
        body: JSON.stringify({ branch }), 
        headers: { 'Content-Type': 'application/json' } 
      });
      const data = await r.json();
      if (data.success) {
        setBranch(branch);          // FIX: era setCurrentBranch (no definido)
        await fetchRegistry();     // FIX: era loadRegistry (no definido)
        console.log(`[GIT] ${data.message}`);
      } else {
        alert(`❌ Error Git: ${data.error}`);
      }
    } catch (err) {
      console.error("Branch Change Error:", err);
      alert("Error de conexión al cambiar de rama.");
    } finally {
      setIsGitLoading(false);
    }
  };

  const handleScenarioSelect = (scenarioId) => {
    setActiveScenarioId(scenarioId);
    if (!scenarioId) { setNewScenarioName(''); setInstruccionesIa(''); return; }
    const sData = registry.find(c => c.id === activeClient)?.procesos.find(p => p.id === activeProcess)?.escenarios.find(e => e.id === scenarioId);
    if (sData) {
      setBuilderConfig(prev => ({ ...JSON.parse(JSON.stringify(sData.config)), headless: prev.headless ?? true }));
      setNewScenarioName(sData.name);
      setInstruccionesIa(sData.instrucciones_ia || "");
    }
  };

  const saveScenario = async () => {
    if (!newScenarioName) return;
    setSaveStatus('loading');
    try {
      const response = await fetch(`${API_BASE}/registry/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: activeClient,
          process: activeProcess,
          scenarioId: activeScenarioId || Date.now().toString(),
          name: newScenarioName,
          config: {
            ...builderConfig,
            instruccionesIa
          }
        })
      });
      if (response.ok) {
        await loadRegistry();
        setSaveStatus('success');
        addToast("Escenario guardado correctamente.", "success");
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        addToast("Error al guardar el escenario.", "error");
      }
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
      addToast("Error de conexión.", "error");
    }
  };

  const [deleteModal, setDeleteModal] = useState({ open: false, step: 1, scenarioId: null, scenarioName: '' });

  const deleteScenario = (e, scenarioId, scenarioName) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const id = scenarioId || activeScenarioId;
    if (!id) return;
    const esc = registry.flatMap(c => c.procesos).flatMap(p => p.escenarios).find(s => s.id === id);
    setDeleteModal({ open: true, step: 1, scenarioId: id, scenarioName: scenarioName || esc?.name || id });
  };

  const confirmDelete = async () => {
    if (deleteModal.step === 1) {
      setDeleteModal(m => ({ ...m, step: 2 }));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/registry/scenario/${encodeURIComponent(deleteModal.scenarioId)}`, { method: 'DELETE' });
      const data = await res.json();
      setDeleteModal({ open: false, step: 1, scenarioId: null, scenarioName: '' });
      if (data.success) {
        await fetchRegistry();
        setActiveScenarioId('');
        setNewScenarioName('');
        setInstruccionesIa('');
        addToast("Escenario eliminado y sincronizado.", "success");
      }
    } catch {
      addToast("Error al eliminar.", "error");
      setDeleteModal({ open: false, step: 1, scenarioId: null, scenarioName: '' });
    }
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
    for (let i = 0; i < (builderConfig.iteraciones || 1); i++) {
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
          tasks: tasksToRun.map(t => ({ taskId: t.taskId, config: { ...t.config, headless: builderConfig.headless }, file: t.config.recordedScript || (t.config.file ? `scripts/${t.config.file}` : null) || processScripts[activeProcess] || null })),
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
      } catch (_) {}
      setTimeout(() => {
        if (window.electron?.quit) window.electron.quit();
        else window.close();
      }, 800);
    }
  };

  useEffect(() => { window.handleShutdown = handleShutdown; }, [handleShutdown]);

  useEffect(() => {
    if (showChangelog) {
      fetch(`${API_BASE}/changelog`)
        .then(res => res.text())
        .then(text => setChangelogContent(text))
        .catch(err => console.error("Error loading changelog:", err));
    }
  }, [showChangelog]);

  const handleGitSync = async () => {
    addToast("Sincronizando con Git...", "info");
    try {
      const res = await fetch(`${API_BASE}/git/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: testerName,
          projectName,
          scenarioName: newScenarioName
        })
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message, data.upToDate ? "info" : "success");
        if (!data.upToDate) fetchInitialData();
      } else {
        addToast(data.error || "Error en sincronización", "error");
      }
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

  if (!gitInitDone) {
    return <GitInitScreen onContinue={(branch, name) => {
      if (branch) setBranch(branch);
      if (name) setTesterName(name);
      setGitInitDone(true);
    }} />;
  }

  return (
    <div className={`app app-entrance${appVisible ? ' app-entrance--visible' : ''}`}>
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
          isGitLoading={isGitLoading}
        />
        <main className="main split-layout">
          <div className="config-panel">
            <div className="config-flow">
              
              {/* BLOQUE 1: CONTROL DE FLUJO */}
              <div className="config-block">
                <div className="config-block-header">
                  <Cpu size={16} color="var(--accent-primary)" />
                  <h3>Escenarios</h3>
                </div>
                <div className="control-card-inner">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="control-label">Flujos</span>
                    <span className="control-badge">{registry.find(c => c.id === activeClient)?.procesos?.find(p => p.id === activeProcess)?.escenarios?.length || 0} Guardados</span>
                  </div>
                  <div className="scenario-selector-group">
                    {/* Lista de escenarios con metadata */}
                    {(() => {
                      const escenarios = [...(registry.find(c => c.id === activeClient)?.procesos?.find(p => p.id === activeProcess)?.escenarios || [])].sort((a, b) => {
                        const da = a.created_at ? new Date(a.created_at) : new Date(0);
                        const db2 = b.created_at ? new Date(b.created_at) : new Date(0);
                        return db2 - da;
                      });
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto', paddingRight: '2px' }}>
                          {escenarios.length === 0 && (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin flujos grabados</div>
                          )}
                          {escenarios.map(s => {
                            const isActive = s.id === activeScenarioId;
                            const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
                            const author = s.created_by || '—';
                            return (
                              <div
                                key={s.id}
                                onClick={() => handleScenarioSelect(s.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '10px',
                                  padding: '10px 16px', borderRadius: '100px', cursor: 'pointer',
                                  background: isActive ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.02)',
                                  border: `1px solid ${isActive ? 'rgba(99,102,241,0.3)' : 'var(--card-border)'}`,
                                  transition: 'all 0.15s'
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: '600', fontSize: '0.82rem', color: isActive ? 'var(--accent-primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                </div>
                                {(s.created_at || s.created_by) && (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                                    {s.created_at && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '500' }}>{dateStr}</div>}
                                    {s.created_by && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '90px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{author}</div>}
                                  </div>
                                )}
                                <button
                                  onClick={e => deleteScenario(e, s.id, s.name)}
                                  title="Eliminar"
                                  style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: 0.5, padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                  onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        className="btn-record"
                        onClick={() => openRecordModal()}
                        title="Grabar nuevo flujo"
                      >
                        <Circle size={20} fill="white" className="rec-pulse" />
                      </button>
                    </div>
                  </div>

                  {/* Banner: escenario sin script grabado (INTEGRADO) */}
                  {activeScenarioId && (() => {
                    const esc = registry.find(c => c.id === activeClient)?.procesos.find(p => p.id === activeProcess)?.escenarios.find(e => e.id === activeScenarioId);
                    const scriptRef = esc?.config?.recordedScript || (esc?.config?.file ? `scripts/${esc.config.file}` : null) || (esc?.id?.endsWith('.js') ? `scripts/${esc.id}` : null);
                    if (scriptRef) return (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '100px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', flexShrink: 0 }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.7)' }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#10b981', whiteSpace: 'nowrap' }}>Flujo listo</span>
                          </div>
                          <button
                            onClick={() => openScriptEditor(scriptRef)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                              padding: '6px 12px', borderRadius: '100px', cursor: 'pointer',
                              background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)',
                              color: '#2563eb', fontSize: '0.72rem', fontWeight: '700', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.14)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.08)'; }}
                          >
                            <FileText size={12} /> Ver código
                          </button>
                          <button
                            onClick={() => openAiModal(scriptRef)}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              padding: '6px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 60%, #ec4899 100%)',
                              color: 'white', fontSize: '0.72rem', fontWeight: '700',
                              boxShadow: '0 2px 12px rgba(139,92,246,0.35)',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(139,92,246,0.55)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(139,92,246,0.35)'}
                          >
                            ✨ Mejorar con IA
                          </button>
                        </div>
                      </div>
                    );
                    return (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '800' }}>⚠️ SIN FLUJO GRABADO</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* BLOQUE 2: MOTOR DE EJECUCIÓN */}
              <div className="config-block">
                <div className="config-block-header">
                  <Zap size={16} color="#f59e0b" />
                  <h3>Configuración</h3>
                </div>
                <div className="execution-grid">
                  <div className="execution-item">
                    <label className="sidebar-label" style={{ marginBottom: '12px', display: 'block' }}>Iteraciones</label>
                    <IteracionesPicker 
                      value={builderConfig.iteraciones || 1} 
                      onChange={val => setBuilderConfig({ ...builderConfig, iteraciones: val })}
                    />
                  </div>
                  <div className="execution-item">
                    <label className="sidebar-label" style={{ marginBottom: '12px', display: 'block' }}>Velocidad</label>
                    <NuclearSwitch 
                      active={builderConfig.headless}
                      onClick={val => setBuilderConfig({ ...builderConfig, headless: val })}
                    />
                  </div>
                </div>
              </div>

              {/* BLOQUE 3: IDENTIDAD Y BITÁCORA */}
              <div className="config-block">
                <div className="config-block-header">
                  <FileText size={16} color="#af52de" />
                  <h3 className="apple-intelligence-title">Identidad del Escenario</h3>
                </div>
                
                <div className="field-group-modern">
                  <label className="modern-label"><Tag size={12} /> Nombre escenario</label>
                  <div className="input-with-icon">
                    <input 
                      type="text" 
                      className="modern-input"
                      placeholder="Ej: Nombre escenario - CI"
                      value={newScenarioName}
                      onChange={e => setNewScenarioName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field-group-modern">
                  <label className="modern-label"><Brain size={12} /> Instrucciones de Negocio (IA Prompt)</label>
                  <div className="prompt-box-container">
                    <textarea 
                      className="modern-textarea"
                      placeholder="Describe el flujo para que la IA lo entienda..."
                      value={instruccionesIa}
                      onChange={e => setInstruccionesIa(e.target.value)}
                    />
                    <div className="prompt-magic-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                      <span className="sap-badge-new">NEW</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1d1d1f' }}>Optimizado por SAP AI Core</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACCIONES FINALES */}
              <div style={{ display: 'flex', justifyContent: 'center', position: 'sticky', bottom: '12px', zIndex: 10 }}>
              <div className="config-actions" style={{ position: 'static', margin: 0 }}>
                <button 
                  onClick={saveScenario} 
                  className="btn-save-scenario"
                  disabled={!newScenarioName}
                >
                  {saveStatus === 'loading' ? 'Guardando...' : saveStatus === 'success' ? '✅ Guardado' : 'Guardar'}
                </button>

                <button 
                  className="btn-add-batch" 
                  onClick={addToBatch}
                  disabled={!activeScenarioId && !newScenarioName}
                >
                  <span>Apilar</span>
                  <ChevronRight size={16} />
                </button>
              </div>
              </div>

            </div>

          </div>

          <div className="batch-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>Lote de pruebas ({queue.length})</h2>
              {queue.length > 0 && <button onClick={clearBatch} disabled={isBatchRunning} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>🗑 Limpiar Lote</button>}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {queue.length === 0 ? (
                <div className="sleeping-robot-container">
                  <div className="zz-container">
                    <span className="z-particle z1">Z</span>
                    <span className="z-particle z2">Z</span>
                    <span className="z-particle z3">Z</span>
                  </div>
                  <Bot size={64} className="robot-snoring" />
                  <div className="empty-state-text">El lote está vacío. Configura un caso y añádelo para despertar al sistema.</div>
                </div>
              ) : (
                queue.map((q, idx) => (
                  <div key={q.taskId} className={`qrow ${q.status}${q.headless ? ' qrow--headless' : ''}`}>
                    {/* COL IZQUIERDA: status dot */}
                    <div className="qrow-status">
                      {q.status === 'running' ? (
                        <span className="qrow-dot qrow-dot--running" />
                      ) : q.status === 'done' ? (
                        <CheckCircle2 size={14} color="#16a34a" />
                      ) : q.status === 'error' ? (
                        <AlertCircle size={14} color="#dc2626" />
                      ) : (
                        <span className="qrow-dot qrow-dot--idle" />
                      )}
                    </div>

                    {/* COL CENTRO: info + barra */}
                    <div className="qrow-info">
                      <div className="qrow-name">
                        {q.scenarioName || 'Sin nombre'}
                        {!q.headless && (
                          <span className="zap-electric qrow-zap" title="Modo visible — el navegador abre en pantalla">
                            <Zap size={11} />
                          </span>
                        )}
                      </div>
                      <div className="qrow-sub">{q.clientName} · {q.processName}</div>
                      {q.status === 'running' && (
                        <div className="qrow-bar-wrap">
                          <div className="qrow-bar-fill" style={{ width: `${Math.max(q.progress || 2, 2)}%` }} />
                        </div>
                      )}
                      {q.status === 'running' && (
                        <div className="qrow-log">{q.currentLog || 'Iniciando...'}</div>
                      )}
                      {q.result && q.status !== 'running' && (
                        <div className={`qrow-result ${q.status === 'error' ? 'qrow-result--err' : ''}`}>
                          {q.status === 'error' ? q.result : q.result}
                        </div>
                      )}
                    </div>

                    {/* COL DERECHA: número + acciones */}
                    <div className="qrow-right">
                      {q.status === 'running' && (
                        <span className="qrow-pct">
                          {Math.round(q.progress || 0)}<small>%</small>
                        </span>
                      )}
                      {q.status === 'done' && (
                        q.pdfUrl ? (
                          <button className="qrow-btn qrow-btn--pdf" onClick={() => handleOpenPdf(q.pdfUrl)}>
                            <FileText size={12} /> PDF
                          </button>
                        ) : (
                          <button className="qrow-btn qrow-btn--gen" onClick={() => generatePdfOnDemand(q.runDir)}>
                            <Sparkles size={12} /> PDF
                          </button>
                        )
                      )}
                      <button className="qrow-del" onClick={() => removeTask(q.taskId)}><X size={13} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {queue.length > 0 && (
              <div className="batch-actions-footer">
                <div
                  className={`footer-toggle ${!runSequential ? 'active' : ''}`}
                  onClick={() => !isBatchRunning && setRunSequential(!runSequential)}
                >
                  <div className="footer-toggle-track"><div className="footer-toggle-thumb" /></div>
                  <span className="footer-toggle-label">{runSequential ? 'Secuencial' : 'Paralelo'}</span>
                </div>

                {!runSequential && (
                  <ThreadsPicker
                    value={batchConcurrency}
                    onChange={val => setBatchConcurrency(val)}
                  />
                )}

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {globalPdf && (
                    <button
                      className="btn-execute-batch"
                      onClick={() => handleOpenPdf(globalPdf)}
                      style={{ background: '#323232', fontSize: '0.8rem', padding: '0 20px', height: '48px' }}
                    >
                      REPORTE
                    </button>
                  )}
                  <div className={`play-ring ${isBatchRunning ? 'play-ring--spinning' : ''}`}>
                    <button className="play-btn" onClick={runBatch} disabled={isBatchRunning}>
                      <Play size={22} fill="white" color="white" style={{ marginLeft: '3px' }} />
                    </button>
                  </div>
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
                <h2 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={18} /> Asistente IA</h2>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>Solo responde sobre scripts de automatización Playwright</div>
              </div>
              {!aiLoading && <button onClick={() => setShowAiModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>}
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label className="modern-label" style={{ display: 'block', marginBottom: '8px' }}>¿Qué quieres cambiar en el flujo?</label>
              <textarea
                value={aiInstruction}
                onChange={e => { setAiInstruction(e.target.value); setAiResponse(null); setAiApplied(false); }}
                placeholder={'Ej: "El botón Confirmar a veces demora, espera hasta 5 segundos"\n"Después del login aparece un modal, ignóralo"\n"Graba el número de documento que aparece en pantalla"'}
                className="modern-textarea"
                style={{ height: '90px', resize: 'vertical' }}
                disabled={aiLoading}
              />
            </div>

            <button
              onClick={analyzeWithAi}
              disabled={aiLoading || !aiInstruction.trim()}
              style={{ width: '100%', padding: '11px', background: aiLoading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '100px', cursor: aiLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.82rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '0.2px' }}
            >
              {aiLoading ? <><div style={{ width: '13px', height: '13px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Analizando...</> : <><Brain size={14} /> Analizar y proponer cambio</>}
            </button>

            {/* Respuesta de la IA */}
            {aiResponse && (
              aiResponse.fuera_de_tema ? (
                <div style={{ padding: '1.2rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>AutoBot v2.1.0 — Evolution Era</div>
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
              <h2 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}><FileText size={16} /> Editor de Script</h2>
              <button onClick={() => setShowScriptEditor(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', wordBreak: 'break-all' }}>{scriptEditorFile}</div>
            <CodeEditor value={scriptEditorContent} onChange={setScriptEditorContent} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '1rem' }}>
              <button
                onClick={() => { setShowScriptEditor(false); openAiModal(scriptEditorFile); }}
                style={{ padding: '7px 18px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: 'white', border: 'none', borderRadius: '100px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.2px' }}
              >
                <Sparkles size={13} /> Evaluar con IA
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowScriptEditor(false)} style={{ padding: '7px 18px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', borderRadius: '100px', cursor: 'pointer', fontWeight: '600', fontSize: '0.78rem' }}>
                  Cancelar
                </button>
                <button onClick={saveScriptEditor} disabled={scriptEditorSaving} style={{ padding: '7px 20px', background: scriptEditorSaving ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,1)', color: 'white', border: 'none', borderRadius: '100px', cursor: scriptEditorSaving ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={13} /> {scriptEditorSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
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

                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.78rem', color: '#dc2626', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                  <span>Cuando termines, <strong>vuelve aquí</strong> y usa el botón Detener. No cierres el navegador directamente — el flujo no se guardará.</span>
                </div>
                <button className="btn-run" style={{ width: '100%', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', animation: 'none' }} onClick={startRecording}>
                  <Circle size={14} fill="white" color="white" />
                  Iniciar Grabación
                </button>
              </>
            )}

            {/* ── STEP 3: GRABANDO ── */}
            {recordingStep === 'recording' && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem', animation: 'recordingPulse 1.5s ease infinite' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444' }} />
                </div>
                <p style={{ fontWeight: '800', fontSize: '1.15rem', marginBottom: '4px', color: '#ef4444' }}>Grabando en curso</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>Flujo: <strong style={{ color: 'var(--text-main)' }}>{recordingName}</strong></p>
                {recordingCredentials.username && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Usuario: <strong style={{ color: 'var(--text-main)' }}>{recordingCredentials.username}</strong></p>
                )}
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', padding: '10px 14px', margin: '1.2rem 0', fontSize: '0.78rem', color: '#dc2626', display: 'flex', gap: '8px', alignItems: 'flex-start', textAlign: 'left' }}>
                  <span style={{ flexShrink: 0 }}>⚠️</span>
                  <span>No cierres el navegador. Cuando termines de grabar, regresa aquí y haz clic en <strong>Detener</strong>.</span>
                </div>
                <button
                  className="btn-run"
                  onClick={stopRecording}
                  style={{ background: '#1e293b', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '8px', animation: 'recBtnGlow 2s ease-in-out infinite' }}
                >
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
      {pdfLoading && (() => {
        const STEPS = [
          { key: 'analiz', label: 'Analizando capturas', icon: Brain },
          { key: 'maqueta', label: 'Maquetando documento', icon: FileText },
          { key: 'export', label: 'Exportando PDF', icon: Sparkles },
          { key: 'done', label: 'Dossier listo', icon: CheckCircle2 },
        ];
        const activeIdx = pdfDoneUrl ? 3 : Math.min(Math.max(pdfMessages.length - 1, 0), 2);
        return (
          <div className="modal-overlay" style={{ zIndex: 10000, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)' }}>
            <div className="modal-content about-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '2rem', background: '#ffffff', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.8rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)' }}>Generando Dossier IA</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Analizando capturas SAP para explicar el flujo</div>
                </div>
              </div>

              {/* Stepper */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', marginBottom: '1.8rem' }}>
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const done = i < activeIdx || pdfDoneUrl;
                  const active = i === activeIdx && !pdfDoneUrl;
                  return (
                    <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {i < STEPS.length - 1 && (
                        <div style={{ position: 'absolute', top: '20px', left: '50%', width: '100%', height: '2px', background: done ? 'linear-gradient(90deg,#6366f1,#a855f7)' : 'rgba(0,0,0,0.08)', transition: 'background 0.4s', zIndex: 0 }} />
                      )}
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%', zIndex: 1, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done || active ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'rgba(0,0,0,0.06)',
                        border: `2px solid ${done || active ? '#6366f1' : 'rgba(0,0,0,0.1)'}`,
                        boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.15)' : 'none',
                        transition: 'all 0.4s',
                      }}>
                        {active ? (
                          <div style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        ) : (
                          <Icon size={16} color={done || active ? 'white' : '#94a3b8'} />
                        )}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: '700', color: done || active ? 'var(--accent-primary)' : 'var(--text-muted)', textAlign: 'center', marginTop: '6px', lineHeight: '1.3', letterSpacing: '0.2px' }}>
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Log compacto */}
              <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '10px', padding: '12px 14px', border: '1px solid var(--card-border)', marginBottom: '1.5rem', minHeight: '60px' }}>
                {pdfMessages.slice(-3).map((msg, i, arr) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: i === arr.length - 1 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: i === arr.length - 1 ? '600' : '400', marginBottom: i < arr.length - 1 ? '4px' : 0, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ color: '#6366f1', flexShrink: 0, marginTop: '1px' }}>›</span>
                    <span>{msg.replace(/^[^\s]*\s/, '')}</span>
                  </div>
                ))}
                {!pdfMessages.length && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Iniciando...</div>}
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {pdfDoneUrl ? (
                  <>
                    <button onClick={() => { handleOpenPdf(pdfDoneUrl); setPdfLoading(false); setPdfMessages([]); setPdfDoneUrl(null); }}
                      style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: 'white', border: 'none', borderRadius: '100px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                      <FileText size={15} /> Abrir PDF
                    </button>
                    <button onClick={() => { setPdfLoading(false); setPdfMessages([]); setPdfDoneUrl(null); }}
                      style={{ padding: '10px 18px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', borderRadius: '100px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                      Cerrar
                    </button>
                  </>
                ) : (
                  <div style={{ flex: 1, fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                    Esto puede tardar unos segundos...
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Estilos dinámicos para el cargador IA */}
      {showSettings && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => setShowSettings(false)}>
          <div className="modal-content about-modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={18} /> Configuración
              </h2>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>REPOSITORIO</div>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>Carpeta del proyecto</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text" value={projectDir} readOnly
                    style={{ flex: 1, fontSize: '0.8rem', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', background: '#f8fafc', color: 'var(--text-muted)', fontFamily: 'inherit' }}
                  />
                  <button
                    onClick={async () => {
                      const p = await window.electron?.selectFolder();
                      if (p) {
                        setProjectDir(p);
                        const res = await fetch(`${API_BASE}/config/project-dir`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ projectDir: p })
                        });
                        if (res.ok) { addToast('📁 Directorio actualizado.', 'success'); fetchInitialData(); }
                      }
                    }}
                    style={{ padding: '8px 14px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                  >
                    Cambiar
                  </button>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '5px' }}>Carpeta raíz del repo git con los scripts de prueba.</p>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>AUTENTICACIÓN</div>
                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>Git Token</label>
                <input
                  type="password" value={gitToken} onChange={e => setGitToken(e.target.value)}
                  placeholder="ghp_..."
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.85rem', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: '8px', background: 'white', color: 'var(--text-main)', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '5px' }}>Requerido para el pull automático de ramas remotas.</p>
              </div>

              <button
                className="btn-run"
                style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', marginTop: '6px' }}
                onClick={async () => {
                  const res = await fetch(`${API_BASE}/config/git-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gitToken })
                  });
                  if (res.ok) { addToast('✅ Configuración guardada.', 'success'); setShowSettings(false); fetchInitialData(); }
                }}
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {isGitLoading && (
        <div className="modal-overlay" style={{ zIndex: 20000, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div className="sparkle-spin" style={{ marginBottom: '20px' }}>
              <Zap size={48} color="#fbbf24" fill="#fbbf24" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>Sincronizando con el Futuro</h2>
            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Git está realizando un Checkout + Pull blindado...</p>
            <div style={{ marginTop: '20px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.5 }}>No cierres la aplicación</div>
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
              <div className="timeline-item milestone">
                <div className="timeline-icon"><Sparkles size={16} /></div>
                <div className="timeline-content">
                  <div className="timeline-version">v2.1.0 — El Amanecer de la IA Corporativa</div>
                  <div className="timeline-date">Hoy</div>
                  <span className="timeline-feature">✨ Integración con SAP Core AI</span>
                  <p>AutoBot se une oficialmente a la infraestructura de inteligencia de la empresa para análisis profundo y generación de escenarios autónomos.</p>
                  <ul className="timeline-list">
                    <li><strong>Escudo de Sincronización Blindada</strong>: Checkout + Pull automático.</li>
                    <li><strong>Lockdown UI</strong>: Bloqueo de seguridad durante sincronización Git.</li>
                    <li><strong>Identidad Unificada</strong>: Versión v2.1.0 sincronizada en todo el sistema.</li>
                  </ul>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-icon gear" style={{ border: '2px solid #64748b', color: '#64748b' }}><Settings size={12} /></div>
                <div className="timeline-content">
                  <div className="timeline-version">v2.0.0 — Estabilidad Enterprise</div>
                  <div className="timeline-date">Ayer</div>
                  <p>Arquitectura nativa para macOS y persistencia SQLite para una experiencia sin interrupciones.</p>
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

      {/* Modal de doble confirmación para eliminar escenario */}
      {deleteModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDeleteModal({ open: false, step: 1, scenarioId: null, scenarioName: '' })}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px 28px 24px', maxWidth: '380px', width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', animation: 'modalPop 0.2s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={18} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>
                  {deleteModal.step === 1 ? 'Eliminar escenario' : '¿Estás seguro?'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>"{deleteModal.scenarioName}"</div>
              </div>
            </div>

            {deleteModal.step === 1 ? (
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.6', marginBottom: '20px' }}>
                Esta acción eliminará el flujo de la base de datos y <strong>borrará el archivo físico</strong> de tu disco. No se puede deshacer.
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.6', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
                  <div style={{ fontWeight: '700', color: '#dc2626', fontSize: '0.78rem', marginBottom: '4px' }}>⚠️ Acción irreversible</div>
                  <div>El archivo <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 4px', borderRadius: '4px', fontSize: '0.75rem' }}>.spec.js</code> será eliminado permanentemente de tu repositorio local. Tendrás que sincronizar para que el cambio se refleje en el equipo.</div>
                </div>
                ¿Confirmas que deseas continuar?
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteModal({ open: false, step: 1, scenarioId: null, scenarioName: '' })}
                style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'none', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: deleteModal.step === 2 ? '#ef4444' : '#0f172a', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700' }}
              >
                {deleteModal.step === 1 ? 'Continuar →' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
