import { useState, useEffect } from 'react';
import { ChevronRight, Cloud, CloudOff, Cpu, Loader, RefreshCw, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

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
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 245 && g > 245 && b > 245) data[i + 3] = 0;
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

const HanaInitScreen = ({ onContinue }) => {
  const [testerInput, setTesterInput] = useState('');
  const [nameError, setNameError] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [hanaStatus, setHanaStatus] = useState(null); // null | { connected, lastSync, pending }
  const [phase, setPhase] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [isExiting, setIsExiting] = useState(false);

  // 1. Esperar que el backend esté disponible
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (!res.ok) throw new Error('not ready');
        if (cancelled) return;
        setBackendReady(true);
        setPhase('ready');
      } catch {
        attempts++;
        if (attempts < 20) setTimeout(check, 500);
        else if (!cancelled) setPhase('error');
      }
    };
    setTimeout(check, 600);
    return () => { cancelled = true; };
  }, []);

  // 2. Cuando backend está listo, obtener estado HANA en segundo plano
  useEffect(() => {
    if (!backendReady) return;
    fetch(`${API_BASE}/supabase/status`)
      .then(r => r.json())
      .then(data => setHanaStatus(data))
      .catch(() => setHanaStatus({ connected: false, lastSync: null, pending: 0 }));
  }, [backendReady]);

  const handleContinue = () => {
    if (!testerInput.trim()) {
      setNameError(true);
      return;
    }
    setIsExiting(true);
    setTimeout(() => {
      onContinue(testerInput.trim());
    }, 750); // Tiempo para la animación
  };

  // ── Estado de HANA
  const hanaColor = !hanaStatus
    ? '#8e8e93'
    : hanaStatus.connected
      ? '#34c759'
      : '#ff9500';
  const hanaLabel = !hanaStatus
    ? 'Conectando...'
    : hanaStatus.connected
      ? 'Online'
      : 'Offline';

  const StatusIcon = !hanaStatus
    ? RefreshCw
    : (hanaStatus.connected && hanaStatus.pending === 0)
      ? CheckCircle2
      : RefreshCw;

  const isSpinning = !hanaStatus || (hanaStatus.connected && hanaStatus.pending > 0);
  const iconClass = isSpinning ? 'spin-animation' : 'fade-in-animation';

  return (
    <div className={`git-splash-overlay ${isExiting ? 'login-exit' : ''}`}>
      <div className="git-splash-card animate-modal-enter">

        {/* LOGO */}
        <div className="git-splash-logo-wrap">
          <TransparentLogo src="./logo-pure.png" size={96} className="git-splash-logo" />
          <div className="git-splash-brand">
            Auto<span>Bot</span>
            <span className="git-splash-version">v2.1.0</span>
          </div>
        </div>

        {/* ESTADO BACKEND */}
        {phase === 'loading' && (
          <div className="git-splash-loading">
            <div className="git-splash-spinner" />
            <span>Iniciando AutoBot...</span>
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
            {/* Campo de nombre */}
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
              {nameError && (
                <div style={{ fontSize: '0.7rem', color: '#ff3b30', marginTop: '6px', paddingLeft: '4px' }}>
                  Es obligatorio identificarte para continuar
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              className="git-splash-cta"
              onClick={handleContinue}
              disabled={!testerInput.trim()}
              style={{ opacity: testerInput.trim() ? 1 : 0.45, marginTop: '24px' }}
            >
              Ingresar
              <ChevronRight size={16} />
            </button>

            {/* Estado Supabase Simplificado */}
            <div 
              className={`git-splash-status-area ${hanaStatus ? 'ready' : 'loading'}`}
              style={{ 
                marginTop: '24px', 
                paddingTop: '16px', 
                cursor: (hanaStatus?.connected && hanaStatus?.pending === 0) ? 'default' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                minWidth: '200px',
                pointerEvents: (hanaStatus?.connected && hanaStatus?.pending === 0) ? 'none' : 'auto'
              }}
              onClick={() => {
                if (hanaStatus?.connected && hanaStatus?.pending === 0) return;
                setHanaStatus(null);
                fetch(`${API_BASE}/supabase/status`)
                  .then(r => r.json())
                  .then(data => setHanaStatus(data))
                  .catch(() => setHanaStatus({ connected: false, lastSync: null, pending: 0 }));
              }}
              title={(hanaStatus?.connected && hanaStatus?.pending === 0) ? "Sistema sincronizado" : "Clic para reintentar conexión"}
            >
              <div className="git-splash-status-row" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '100px',
                background: 'rgba(0,0,0,0.03)',
                height: '24px'
              }}>
                <StatusIcon 
                  size={14} 
                  style={{ 
                    color: hanaColor, 
                    transition: 'color 0.5s ease',
                    flexShrink: 0
                  }} 
                  className={iconClass}
                />
                <span style={{ 
                  color: hanaColor, 
                  fontWeight: 700, 
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '60px',
                  textAlign: 'left'
                }}>
                  {hanaLabel}
                </span>
                {hanaStatus?.connected && (
                  <span style={{ 
                    fontSize: '0.65rem', 
                    color: '#98989d', 
                    fontWeight: 500,
                    borderLeft: '1px solid rgba(0,0,0,0.1)',
                    paddingLeft: '8px',
                    whiteSpace: 'nowrap'
                  }}>
                    {hanaStatus.pending > 0 ? `${hanaStatus.pending} pnd.` : 'Sincronizado'}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* FOOTER */}
        <div className="git-splash-footer">
          <Cpu size={12} color="#8e8e93" />
          <span>Seidor Perú · AutoBot QA Engine</span>
        </div>

      </div>
    </div>
  );
};

export default HanaInitScreen;
export { TransparentLogo };
