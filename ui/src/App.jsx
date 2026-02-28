import { useState, useEffect } from 'react';
import './index.css';

const API_BASE = 'http://localhost:3001/api';

const CLIENTS = [
  { id: 'CI', name: 'Clínica Internacional', icon: '🏥', env: 'QAS' },
];

const MEDIOS_VUELTO = ["Efectivo", "Depósito CTA", "Nota de Crédito"];

const Sidebar = ({ activeClient, setActiveClient, currentBranch, branches, handleBranchChange }) => (
  <aside className="sidebar">
    <div className="sidebar-section">
      <div className="sidebar-label">Clientes</div>
      {CLIENTS.map(c => (
        <div key={c.id} className={`client-item ${activeClient === c.id ? 'active' : ''}`} onClick={() => setActiveClient(c.id)}>
          <div className="client-icon">{c.icon}</div>
          <div className="client-info">
            <div className="client-name">{c.name}</div>
            <div className="client-sub">{c.env}</div>
          </div>
        </div>
      ))}
    </div>

    <div className="sidebar-section" style={{marginTop:'auto'}}>
      <div className="sidebar-label">Rama / Entorno</div>
      <select className="branch-select" value={currentBranch} onChange={handleBranchChange}>
        <option value="">-- seleccionar --</option>
        {branches.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
    </div>
  </aside>
);

const PaymentTray = ({ pagos, medioVuelto, updatePagos, updateMedioVuelto }) => {
  const addPago = (tipo) => updatePagos([...pagos, { id: Date.now(), tipo, monto: '', autoData: true }]);
  const removePago = (id) => updatePagos(pagos.filter(p => p.id !== id));
  const updMonto = (id, val) => updatePagos(pagos.map(p => p.id === id ? { ...p, monto: val } : p));
  const updAuto = (id, auto) => updatePagos(pagos.map(p => p.id === id ? { ...p, autoData: auto } : p));

  const total = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
  const showVuelto = total > 0 && pagos.some(p => p.tipo === 'Efectivo');

  return (
    <div className="payment-tray">
      <div className="tray-header">Bandeja de Pagos</div>
      
      <div className="tray-items">
        {pagos.map((p) => (
          <div key={p.id} className={`tray-item type-${p.tipo.toLowerCase()}`}>
            <div className="tray-item-bar">
              <strong>{p.tipo}</strong>
              <button className="btn-icon" onClick={() => removePago(p.id)}>✕</button>
            </div>
            <div className="tray-inputs">
              <input type="number" placeholder="Monto exacto (Dejar vacío para Total)" value={p.monto} onChange={e => updMonto(p.id, e.target.value)} />
            </div>
            {p.tipo === 'Tarjeta' && (
              <div className="tray-subconfig">
                <label style={{fontSize:'11px'}}>
                  <input type="checkbox" checked={p.autoData} onChange={e => updAuto(p.id, e.target.checked)} /> 
                  Auto-generar datos (ID/Bin)
                </label>
                {!p.autoData && (
                  <div className="tray-manual-inputs">
                    <input type="text" placeholder="ID Transacción" className="mini-input" />
                    <input type="text" placeholder="4 Dígitos" maxLength="4" className="mini-input" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="tray-adders">
        <button onClick={() => addPago('Efectivo')}>+ Efectivo</button>
        <button onClick={() => addPago('Tarjeta')}>+ Tarjeta</button>
      </div>

      {showVuelto && (
        <div className="vuelto-alert" style={{marginTop:'1rem'}}>
          <div>⚠️ Medio de Vuelto (Si aplica):</div>
          <select value={medioVuelto || "Efectivo"} onChange={(e)=>updateMedioVuelto(e.target.value)} className="mini-select">
            {MEDIOS_VUELTO.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [activeClient, setActiveClient] = useState('CI');
  const [branches, setBranches] = useState([]);
  const [currentBranch, setBranch] = useState('');
  
  // Builder State
  const [builderConfig, setBuilderConfig] = useState({
    tipoComprobante: 'Boleta',
    iteraciones: 1,
    headless: true,
    medioVuelto: 'Efectivo',
    pagos: []
  });

  // Batch Queue State
  const [queue, setQueue] = useState([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchParallel, setBatchParallel] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/branches`).then(r => r.json()).then(d => { setBranches(d.branches || []); setBranch(d.current || ''); }).catch(()=>{});
  }, []);

  const handleBranchChange = async e => {
    const branch = e.target.value;
    if (branch === currentBranch) return;
    try {
      const r = await fetch(`${API_BASE}/checkout`, { method: 'POST', body: JSON.stringify({ branch }), headers:{'Content-Type':'application/json'} });
      if ((await r.json()).success) setBranch(branch);
    } catch {
       // Ignorar error de red al cambiar rama
    }
  };

  const addToBatch = () => {
    if (builderConfig.pagos.length === 0) {
      alert("Debes agregar al menos un medio de pago al escenario.");
      return;
    }
    const newItems = [];
    const baseId = Date.now();
    for(let i=0; i<builderConfig.iteraciones; i++) {
        // Clon profundo del config para cada fila
        newItems.push({
            taskId: `task_${baseId}_${i}`,
            status: 'idle', // idle, running, done, error
            progress: 0,
            result: null, // "Prefactura: 123 | Doc: 456"
            config: JSON.parse(JSON.stringify({
                ...builderConfig,
                iteraciones: 1 // cada fila es 1 iteración real
            }))
        });
    }
    setQueue(q => [...q, ...newItems]);
  };

  const removeBatchItem = (id) => {
    if(isBatchRunning) return;
    setQueue(q => q.filter(i => i.taskId !== id));
  };
  const clearBatch = () => {
    if(!isBatchRunning) setQueue([]);
  };

  const runBatch = async () => {
    if (queue.length === 0) return;
    setIsBatchRunning(true);
    
    // Set pending to running visually at 5%
    setQueue(q => q.map(t => t.status === 'idle' ? { ...t, status: 'running', progress: 5, result: null } : t));

    const tasksToRun = queue.filter(t => t.status === 'idle' || t.status === 'error');

    try {
      const response = await fetch(`${API_BASE}/run-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            tasks: tasksToRun.map(t => ({ taskId: t.taskId, config: t.config, file: 'caso1-boleta.spec.js' })), 
            parallel: batchParallel 
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        for (const line of chunk.split('\n\n')) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.substring(6));
              const { taskId, type, docData } = d;

              setQueue(q => q.map(t => {
                if (t.taskId !== taskId) return t;
                
                let newProg = t.progress;
                let newSt = t.status;
                let newRes = t.result;

                if (type === 'log') {
                    newProg = Math.min(90, newProg + 5);
                } else if (type === 'result') {
                    newRes = docData; // "Prefactura: X | Doc: Y"
                } else if (type === 'done') {
                    newSt = 'done';
                    newProg = 100;
                } else if (type === 'error') {
                    newSt = 'error';
                    newProg = 100;
                    if(!newRes) newRes = "Error en ejecución";
                }

                return { ...t, progress: newProg, status: newSt, result: newRes };
              }));
            } catch { 
               // Parse error
            }
          }
        }
      }
    } catch (err) {
       console.error(err);
    } finally {
       setIsBatchRunning(false);
    }
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-logo">⚡ <span>Set</span>Pruebas Batch</div>
        <div className="topbar-right">
          <span className="badge badge-green">● QAS</span>
          <span className="badge badge-blue">⎇ {currentBranch || 'CI'}</span>
        </div>
      </div>
      
      <div className="body">
        <Sidebar 
          activeClient={activeClient} setActiveClient={setActiveClient} 
          currentBranch={currentBranch} branches={branches} handleBranchChange={handleBranchChange}
        />
        
        <main className="main split-layout">
          
          {/* LADO IZQUIERDO: Configurador del caso */}
          <div className="config-panel">
            <h2>1. Configurar Caso</h2>
            <div className="config-form">
              <label>Tipo Comprobante</label>
              <select value={builderConfig.tipoComprobante} onChange={e => setBuilderConfig({...builderConfig, tipoComprobante: e.target.value})}>
                <option value="Boleta">Boleta</option>
                <option value="Factura">Factura</option>
              </select>

              <label>Modo de Navegador</label>
              <div className="switch-line">
                  <input type="checkbox" checked={builderConfig.headless} onChange={e => setBuilderConfig({...builderConfig, headless: e.target.checked})} /> 
                  <span>Headless (Oculto - Rápido)</span>
              </div>
              
              <PaymentTray 
                pagos={builderConfig.pagos} 
                medioVuelto={builderConfig.medioVuelto}
                updatePagos={(newPagos) => setBuilderConfig({...builderConfig, pagos: newPagos})}
                updateMedioVuelto={(val) => setBuilderConfig({...builderConfig, medioVuelto: val})}
              />

              <div className="add-batch-row">
                 <div>
                    <label>Repeticiones:</label>
                    <input type="number" min="1" max="100" className="mini-input" value={builderConfig.iteraciones} onChange={e => setBuilderConfig({...builderConfig, iteraciones: parseInt(e.target.value)||1})}/>
                 </div>
                 <button className="btn-primary" onClick={addToBatch} disabled={isBatchRunning}>＋ Añadir al Lote</button>
              </div>
            </div>
          </div>

          {/* LADO DERECHO: Lote de Ejecución */}
          <div className="batch-panel">
            <div className="batch-header">
                <h2>2. Lote de Pruebas ({queue.length})</h2>
                {queue.length > 0 && (
                    <button className="btn-icon" onClick={clearBatch} disabled={isBatchRunning}>🗑 Limpiar</button>
                )}
            </div>
            
            <div className="batch-list">
               {queue.length === 0 ? (
                  <div className="empty-batch">El lote está vacío. Configura tu caso y añádelo aquí.</div>
               ) : (
                  queue.map((qItem, idx) => (
                      <div key={qItem.taskId} className={`batch-item status-${qItem.status}`}>
                          <div className="batch-item-info">
                              <span className="b-idx">{idx + 1}.</span>
                              <span className="b-title">
                                  {qItem.config.tipoComprobante} - {qItem.config.pagos.map(p=>p.tipo).join('+')}
                              </span>
                              <div className="b-tags">
                                 {qItem.config.headless ? <span className="tag">Headless</span> : <span className="tag">Visible</span>}
                              </div>
                          </div>
                          
                          <div className="batch-item-progress">
                             {qItem.status === 'idle' ? (
                                <span className="status-text idle">Pendiente</span>
                             ) : qItem.result ? (
                                 <span className="final-result">{qItem.result}</span>
                             ) : (
                                <div className="bar-wrapper">
                                    <div className="bar-fill" style={{width: `${qItem.progress}%`, background: qItem.status==='error'?'#e74c3c':'#3498db'}}></div>
                                </div>
                             )}
                          </div>

                          <button className="btn-icon del-btn" onClick={() => removeBatchItem(qItem.taskId)} disabled={qItem.status !== 'idle'}>✕</button>
                      </div>
                  ))
               )}
            </div>

            {queue.length > 0 && (
                <div className="batch-footer">
                   <div className="batch-controls">
                      <label>
                          <input type="checkbox" checked={batchParallel} onChange={e=>setBatchParallel(e.target.checked)} disabled={isBatchRunning}/> 
                          Ejecutar en Paralelo
                      </label>
                   </div>
                   <button className="btn-run-batch" onClick={runBatch} disabled={isBatchRunning || queue.every(q => q.status === 'done')}>
                      {isBatchRunning ? '⏳ Procesando Lote...' : '▶ EJECUTAR TODOS'}
                   </button>
                </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
