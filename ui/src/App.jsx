import { useState, useEffect, useCallback } from 'react';
import './index.css';

const API_BASE = 'http://localhost:3001/api';

const CLIENTS = [
  { id: 'CI', name: 'Clínica Internacional', icon: '🏥', env: 'QAS' },
];

const MEDIOS_VUELTO = ["Efectivo", "Depósito CTA", "Nota de Crédito"];

const Sidebar = ({ 
  registry, activeClient, setActiveClient, 
  activeProcess, setActiveProcess,
  currentBranch, branches, handleBranchChange 
}) => {
  const clientData = registry.find(c => c.id === activeClient);
  const procesos = clientData ? clientData.procesos : [];

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Entorno Git</div>
        <select className="branch-select" value={currentBranch} onChange={handleBranchChange}>
          <option value="">-- seleccionar --</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="sidebar-section" style={{flex: 1, marginTop: '1rem'}}>
        <div className="sidebar-label">Selección de Cliente</div>
        {registry.map(c => (
           <div key={c.id} className={`client-item ${activeClient === c.id ? 'active' : ''}`} onClick={() => { setActiveClient(c.id); setActiveProcess(c.procesos[0]?.id || ''); }}>
               <div className="client-name">[{c.id}] {c.name}</div>
           </div>
        ))}

        {procesos.length > 0 && (
          <div style={{marginTop: '2rem'}}>
            <div className="sidebar-label">Proceso Analítico</div>
            <select className="branch-select" value={activeProcess} onChange={e => setActiveProcess(e.target.value)}>
              {procesos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
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
  const [registry, setRegistry] = useState([]);
  const [activeClient, setActiveClient] = useState('CI');
  const [activeProcess, setActiveProcess] = useState('facturacion');

  const [branches, setBranches] = useState([]);
  const [currentBranch, setBranch] = useState('');
  
  // Estado para el Escenario Seleccionado / Edición
  const [activeScenarioId, setActiveScenarioId] = useState('');
  const [newScenarioName, setNewScenarioName] = useState('');
  const [instruccionesIa, setInstruccionesIa] = useState('');

  // Builder State
  const [builderConfig, setBuilderConfig] = useState({
    // Generic
    iteraciones: 1,
    headless: true,
    // Facturación only
    tipoComprobante: 'Boleta',
    medioVuelto: 'Efectivo',
    pagos: [],
    // Horarios only
    area: 'AMBULATORIA-ADMISION',
    periodo: '02-2026'
  });

  // Batch Queue State
  const [queue, setQueue] = useState([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchParallel, setBatchParallel] = useState(true);

  // Floating Balloons (Toasts)
  const [toasts, setToasts] = useState([]);
  const addToast = (msg, type = 'error') => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 7000);
  };

  const handleOpenPdf = async (pdfUrl) => {
    try {
      await fetch(`${API_BASE}/open-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl })
      });
    } catch(err) {
      console.error(err);
      addToast("Hubo un error contactando al servidor local para abrir el PDF nativo.", "error");
    }
  };

  const fetchRegistry = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/registry`);
      const data = await res.json();
      setRegistry(data);
      if(data.length > 0 && !data.find(c => c.id === activeClient)) {
         setActiveClient(data[0].id);
         setActiveProcess(data[0].procesos[0]?.id || '');
      }
    } catch {
       // Ignore registry fetch error
    }
  }, [activeClient]);

  useEffect(() => {
    fetch(`${API_BASE}/branches`).then(r => r.json()).then(d => { setBranches(d.branches || []); setBranch(d.current || ''); }).catch(()=>{});
    fetchRegistry();
  }, [fetchRegistry]);

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

  // Carga la configuración visual de un escenario previamente guardado
  const handleScenarioSelect = (scenarioId) => {
    setActiveScenarioId(scenarioId);
    if (!scenarioId) {
        setNewScenarioName('');
        setInstruccionesIa('');
        return;
    }
    
    const clientData = registry.find(c => c.id === activeClient);
    if (!clientData) return;
    
    const processData = clientData.procesos.find(p => p.id === activeProcess);
    if (!processData) return;
    
    const sData = processData.escenarios.find(e => e.id === scenarioId);
    if (sData) {
        setBuilderConfig(JSON.parse(JSON.stringify(sData.config)));
        setNewScenarioName(sData.name);
        setInstruccionesIa(sData.instrucciones_ia || "");
    }
  };

  // Metodo para hacer POST a SQLite y guardar/actualizar el escenario actual
  const saveScenario = async () => {
    if (!newScenarioName.trim()) { 
        alert("Ingresa un nombre para el escenario"); 
        return; 
    }

    const scenarioToSave = {
        id: activeScenarioId || `esc_${Date.now()}`,
        name: newScenarioName.trim(),
        instrucciones_ia: instruccionesIa,
        config: builderConfig
    };

    try {
        const res = await fetch(`${API_BASE}/registry/scenario`, {
            method: 'POST',
            body: JSON.stringify({ clientId: activeClient, processId: activeProcess, scenario: scenarioToSave }),
            headers:{'Content-Type': 'application/json'}
        });
        if((await res.json()).success) {
            await fetchRegistry();
            setActiveScenarioId(scenarioToSave.id);
            alert("Escenario guardado en SQLite de forma exitosa.");
        }
    } catch { 
       alert("Error de red al guardar el escenario."); 
    }
  };

  // Metodo para hacer DELETE a SQLite
  const deleteScenario = async () => {
    if (!activeScenarioId) return;
    if (!window.confirm("¿Seguro que deseas eliminar este escenario permanentemente?")) return;

    try {
        const res = await fetch(`${API_BASE}/registry/scenario/${activeScenarioId}`, {
            method: 'DELETE'
        });
        if((await res.json()).success) {
            await fetchRegistry();
            // Reset state
            setActiveScenarioId('');
            setNewScenarioName('');
            setInstruccionesIa('');
            alert("Escenario eliminado.");
        }
    } catch {
       alert("Error de red al eliminar el escenario.");
    }
  };

  const addToBatch = () => {
    if (activeProcess === 'facturacion' && builderConfig.pagos.length === 0) {
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
            currentLog: '', // Texto en vivo del worker
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
    setQueue(q => q.map(t => t.status === 'idle' ? { ...t, status: 'running', progress: 5, result: null, currentLog: '⏳ Iniciando worker...' } : t));

    const tasksToRun = queue.filter(t => t.status === 'idle' || t.status === 'error');
    
    // Mapeo de procesos a scripts
    const processScripts = {
      'facturacion': 'caso1-boleta.spec.js',
      'horario_supervisor': 'caso-horario-supervisor.spec.js',
      'horario_cajero': 'caso-horario-cajero.spec.js'
    };

    try {
      const response = await fetch(`${API_BASE}/run-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            tasks: tasksToRun.map(t => ({ 
                taskId: t.taskId, 
                config: t.config, 
                file: processScripts[activeProcess] || 'caso1-boleta.spec.js' 
            })), 
            parallel: batchParallel 
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

              // Mostrar globo flotante si hay un error de negocio
              if (type === 'business_error') {
                  addToast(msg, 'error');
              }

              setQueue(q => q.map(t => {
                if (t.taskId !== taskId) return t;
                
                let newProg = t.progress;
                let newSt = t.status;
                let newRes = t.result;
                let newLog = t.currentLog;
                let newPdfUrl = t.pdfUrl;
                const msg = d.message || "";

                if (type === 'log') {
                    newProg = Math.min(90, newProg + 5);
                    // Actualizar UI de logs
                    if (/[⏳💳✅🔄👉❌]/u.test(msg)) {
                        newLog = msg.replace(/\[Worker \d+\]\s*/, '').trim(); 
                    }
                } else if (type === 'result') {
                    newRes = docData || msg;
                } else if (type === 'done') {
                    newSt = 'done';
                    newProg = 100;
                    if(!newRes) newRes = "Completado con éxito";
                } else if (type === 'error') {
                    newSt = 'error';
                    newProg = 100;
                    const cleanError = msg.split('\n')[0].replace(/\[Worker \d+\]\s*/, '').replace('Error:', '').trim();
                    newRes = cleanError || "Error desconocido";
                } else if (type === 'pdf') {
                    // msg contiene la URL relativa de descarga
                    newPdfUrl = msg;
                }

                return { ...t, progress: newProg, status: newSt, result: newRes, currentLog: newLog, pdfUrl: newPdfUrl };
              }));
            } catch (err) { 
               console.error("Error parsing chunk:", err, chunk);
            }
          }
          boundary = buffer.indexOf('\n\n');
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
      {/* BARRA SUPERIOR */}
      <div className="topbar">
        <div className="topbar-logo">SetPruebas Batch</div>
        <div className="topbar-right">
          <span className="badge badge-green">● QAS</span>
          <span className="badge badge-blue">⎇ {currentBranch || 'CI'}</span>
        </div>
      </div>
      
      <div className="body">
        <Sidebar 
          registry={registry}
          activeClient={activeClient} setActiveClient={setActiveClient} 
          activeProcess={activeProcess} setActiveProcess={setActiveProcess}
          currentBranch={currentBranch} branches={branches} handleBranchChange={handleBranchChange}
        />
        
        <main className="main split-layout">
          
          {/* LADO IZQUIERDO: CONFIGURADOR DINÁMICO */}
          <div className="config-panel">
            <h2>1. Configurar Caso de Prueba</h2>

            {/* Panel de Selección de Escenarios Guardados */}
            <div className="scenario-selector-box" style={{marginBottom: '1.5rem', padding: '1rem', background: '#ecf0f1', borderRadius: '8px'}}>
               <label style={{fontSize: '0.85rem', fontWeight: 600, color: '#34495e'}}>Escenarios Guardados (SQLite):</label>
               <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                 <select 
                   style={{flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #bdc3c7'}}
                   value={activeScenarioId} 
                   onChange={e => handleScenarioSelect(e.target.value)}
                 >
                   <option value="">-- Nuevo Escenario (En Blanco) --</option>
                   {registry.find(c => c.id === activeClient)?.procesos.find(p => p.id === activeProcess)?.escenarios.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                   ))}
                 </select>
                 
                 {/* Botón Eliminar Escenario Habilitado Solo Si Hay Uno Seleccionado */}
                 <button 
                    className="btn-icon" 
                    title="Eliminar este escenario"
                    style={{background: '#e74c3c', color: 'white', padding: '0 0.8rem', borderRadius: '4px', opacity: activeScenarioId ? 1 : 0.5}} 
                    onClick={deleteScenario}
                    disabled={!activeScenarioId}
                 >
                    Borrar
                 </button>
               </div>
            </div>
            <div className="config-form">
              {activeProcess === 'facturacion' ? (
                <>
                  <label>Tipo Comprobante</label>
                  <select value={builderConfig.tipoComprobante} onChange={e => setBuilderConfig({...builderConfig, tipoComprobante: e.target.value})}>
                    <option value="Boleta">Boleta</option>
                    <option value="Factura">Factura</option>
                  </select>
                </>
              ) : (
                <>
                  <label>Área de Selección</label>
                  <select value={builderConfig.area} onChange={e => setBuilderConfig({...builderConfig, area: e.target.value})}>
                    <option value="AMBULATORIA-ADMISION">AMBULATORIA-ADMISION</option>
                    <option value="EMERGENCIA-ADMISION">EMERGENCIA-ADMISION</option>
                    <option value="HOSPITAL-ADMISION">HOSPITAL-ADMISION</option>
                  </select>

                  <label>Período (MM-YYYY)</label>
                  <input 
                    type="text" 
                    className="mini-input" 
                    style={{width: '100%', textAlign: 'left'}}
                    value={builderConfig.periodo} 
                    onChange={e => setBuilderConfig({...builderConfig, periodo: e.target.value})} 
                  />
                </>
              )}

              <label>Modo de Navegador</label>
              <div className="switch-line">
                  <input type="checkbox" checked={builderConfig.headless} onChange={e => setBuilderConfig({...builderConfig, headless: e.target.checked})} /> 
                  <span>Headless (Oculto - Rápido)</span>
              </div>
              
              {activeProcess === 'facturacion' && (
                <PaymentTray 
                  pagos={builderConfig.pagos} 
                  medioVuelto={builderConfig.medioVuelto}
                  updatePagos={(newPagos) => setBuilderConfig({...builderConfig, pagos: newPagos})}
                  updateMedioVuelto={(val) => setBuilderConfig({...builderConfig, medioVuelto: val})}
                />
              )}

              <div className="add-batch-row" style={{alignItems: 'center'}}>
                 <div style={{flex: 1}}>
                    <label>Nombre a Guardar (Escenario):</label>
                    <div style={{display:'flex', gap:'0.5rem', marginTop: '0.3rem'}}>
                        <input type="text" className="mini-input" style={{flex: 1}} placeholder="Ej: Pago total efectivo" value={newScenarioName} onChange={e => setNewScenarioName(e.target.value)} />
                    </div>

                    <label style={{marginTop: '1rem', display: 'block'}}>Instrucciones para IA / QA (Narrativa):</label>
                    <textarea 
                        className="mini-input" 
                        style={{width: '100%', resize: 'vertical', minHeight: '60px', marginTop: '0.3rem'}} 
                        placeholder="Escribe el paso a paso o reglas de negocio de este escenario..." 
                        value={instruccionesIa} 
                        onChange={e => setInstruccionesIa(e.target.value)} 
                    />
                    
                    <button className="btn-icon" style={{background: '#3498db', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', marginTop: '0.5rem', width: '100%'}} onClick={saveScenario}>
                        Guardar Configuración en SQLite
                    </button>
                 </div>
              </div>

              <hr style={{opacity: 0.2, margin: '1rem 0'}} />

              <div className="add-batch-row">
                 <div>
                    <label>Nº Repeticiones:</label>
                    <input type="number" min="1" max="100" className="mini-input" value={builderConfig.iteraciones} onChange={e => setBuilderConfig({...builderConfig, iteraciones: parseInt(e.target.value)||1})}/>
                 </div>
                 <button className="btn-primary" onClick={addToBatch} disabled={isBatchRunning}>＋ Añadir Escenario al Lote</button>
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
                                  {activeProcess === 'facturacion' 
                                    ? `${qItem.config.tipoComprobante} - ${qItem.config.pagos.map(p=>p.tipo).join('+')}`
                                    : `${activeProcess === 'horario_supervisor' ? 'HS' : 'HC'} - ${qItem.config.area} (${qItem.config.periodo})`
                                  }
                              </span>
                              <div className="b-tags">
                                 {qItem.config.headless ? <span className="tag">Headless</span> : <span className="tag">Visible</span>}
                              </div>
                          </div>
                          
                          <div className="batch-item-progress">
                              {qItem.status === 'idle' ? (
                                 <span className="status-text idle">Pendiente</span>
                              ) : qItem.status === 'done' && qItem.result ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span className="final-result">{qItem.result}</span>
                                      {qItem.pdfUrl && (
                                          <a href="#" onClick={(e) => { e.preventDefault(); handleOpenPdf(qItem.pdfUrl); }} style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: '#e2e8f0', color: '#005587', textDecoration: 'none', border: '1px solid #cbd5e1' }}>📄 Ver PDF Nativ</a>
                                      )}
                                  </div>
                              ) : qItem.status === 'error' ? (
                                  <div className="error-result-container">
                                     <span className="error-title">Fallo Crítico:</span>
                                     <div className="error-text" title={qItem.result}>{qItem.result}</div>
                                     {qItem.pdfUrl && (
                                          <a href="#" onClick={(e) => { e.preventDefault(); handleOpenPdf(qItem.pdfUrl); }} style={{ alignSelf: 'flex-start', fontSize: '0.8rem', marginTop: '4px', padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c', textDecoration: 'none', border: '1px solid #fca5a5' }}>📄 Ver PDF Nativ (Fallo)</a>
                                      )}
                                  </div>
                              ) : (
                                 <div style={{ flex: 1, minWidth: 0, marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ width: '100%', height: '8px', background: '#ccc', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', background: qItem.status === 'error' ? '#ef4444' : '#3498db', width: `${qItem.progress}%`, transition: 'width 0.3s' }}></div>
                                </div>
                                {qItem.currentLog && (
                                    <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: qItem.status === 'error' ? '#991b1b' : '#666', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {qItem.currentLog}
                                    </div>
                                )}
                              </div>)}
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

      {/* FLOATING BALLOONS (TOASTS) */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
              background: t.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: t.type === 'error' ? '#b91c1c' : '#166534',
              padding: '12px 20px',
              borderRadius: '8px',
              borderLeft: `4px solid ${t.type === 'error' ? '#ef4444' : '#22c55e'}`,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: '10px',
              maxWidth: '400px', wordBreak: 'break-word',
              fontSize: '0.9rem',
              transition: 'opacity 0.3s'
          }}>
              <span style={{fontSize:'1.2rem'}}>{t.type === 'error' ? '🚫' : '✅'}</span>
              <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
