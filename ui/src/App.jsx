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
import GitInitScreen, { TransparentLogo } from './components/GitInitScreen';
import Sidebar, { ModernSelect } from './components/Sidebar';
import PaymentTray from './components/PaymentTray';
import CodeEditor from './components/CodeEditor';
import { ModernSwitch, ModernCheckbox, IteracionesPicker, ThreadsPicker, NuclearSwitch } from './components/UIElements';

const API_BASE = 'http://localhost:3001/api';


// ─── CodeEditor modularizado ───


// ─── TransparentLogo modularizado ───


// ─── Componentes UI modularizados ───

// ─────────────────────────────────────────────────────────────
// GIT INIT SCREEN — Splash elegante y minimalista
// ─────────────────────────────────────────────────────────────

const CLIENTS = [
  { id: 'CI', name: 'Clínica Internacional', icon: <div style={{ width: '24px', height: '24px', background: 'var(--accent-primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>CI</div>, env: 'QAS' },
];

const MEDIOS_VUELTO = ["Efectivo", "Depósito CTA", "Nota de Crédito"];


// ─── Sidebar y PaymentTray modularizados ───

export default function App() {
  const [gitInitDone, setGitInitDone] = useState(false);
  const [hanaStatus, setHanaStatus] = useState(null); // { connected, lastSync, pending }

  const [registry, setRegistry] = useState([]);
  const [activeClient, setActiveClient] = useState('Medifarma');
  const [activeProcess, setActiveProcess] = useState('mf_flujos');

  const [activeScenarioId, setActiveScenarioId] = useState('');
  const [newScenarioName, setNewScenarioName] = useState('');
  const [instruccionesIa, setInstruccionesIa] = useState('');
  const [testerName, setTesterName] = useState('Pierre');
  const [projectName, setProjectName] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [environment, setEnvironment] = useState('QAS');
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
  const [backendError, setBackendError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
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
  
  // Nuevo Escenario Modal
  const [showNewScenarioModal, setShowNewScenarioModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
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
      setBackendError(null);
    } catch (err) {
      console.error("Fetch Registry Error:", err);
      setBackendError("⚠️ No hay conexión con el servidor (Puerto 3005). Intentando reconectar...");
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    fetchRegistry();
    
    // Conexión al canal de eventos (SSE) para refresco automático Nivel 3
    const eventSource = new EventSource(`http://localhost:3001/events-push`);
    eventSource.onmessage = (event) => {
      if (event.data === 'refresh') {
        console.log('%c[SSE] 🔔 ¡Señal de cambio recibida del servidor!', 'color: #00d1ff; font-weight: bold;');
        console.log('[UI] 🔄 Iniciando actualización de datos...');
        fetchRegistry().then(() => {
          console.log('%c[UI] ✅ Interfaz sincronizada con la nube.', 'color: #00ff88; font-weight: bold;');
        });
      }
    };

    return () => eventSource.close();
  }, [fetchInitialData, fetchRegistry]);

  // Poll Supabase status each 60s
  useEffect(() => {
    const pollSupabase = () => {
      fetch(`${API_BASE}/supabase/status`)
        .then(r => r.json())
        .then(data => setHanaStatus(data))
        .catch(() => setHanaStatus({ connected: false, lastSync: null, pending: 0 }));
    };
    pollSupabase();
    const timer = setInterval(pollSupabase, 60000);
    return () => clearInterval(timer);
  }, []);

  // Notificaciones Nativas de Sincronización
  useEffect(() => {
    if (hanaStatus?.pending > 0) {
      try {
        new Notification('🤖 AutoBotIA: Cambios en Nube', { 
          body: `Tienes ${hanaStatus.pending} cambios pendientes por sincronizar con Supabase.`, 
          icon: '/favicon.png'
        });
      } catch (err) {}
    }
  }, [hanaStatus?.pending]);

  // Al cambiar de cliente, resetear escenario y proceso al primero disponible
  useEffect(() => {
    setActiveScenarioId('');
    setNewScenarioName('');
    setInstruccionesIa('');
    // El proceso ahora se gestiona de forma inteligente en el Sidebar para no perder escenarios
  }, [activeClient]);


  const handleScenarioSelect = (scenarioId) => {
    setActiveScenarioId(scenarioId);
    setIsCreating(false);
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
        addToast("✨ Escenario blindado con éxito.", "success");
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
        addToast("🧹 Limpieza completada. Registro eliminado.", "success");
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
        addToast("🔗 Vinculación precisa establecida.", "success");
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
        addToast("💾 Código preservado con éxito.", "success");
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
        addToast("🧬 Evolución del código completada.", "success");
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
        addToast(`🏆 Flujo "${recordingName}" capturado y asegurado.`, "success");
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
                  addToast("📊 Análisis consolidado. Todo bajo control.", "success");
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
    return <GitInitScreen onContinue={(name) => {
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
          hanaStatus={hanaStatus}
          onHanaSync={() => {
            fetch(`${API_BASE}/supabase/status`)
              .then(r => r.json())
              .then(data => setHanaStatus(data))
              .catch(() => {});
            fetchRegistry();
          }}
          setShowSettings={setShowSettings}
          testerName={testerName}
          setTesterName={setTesterName}
          projectName={projectName}
          setProjectName={setProjectName}
          moduleName={moduleName}
          setModuleName={setModuleName}
          environment={environment}
          setEnvironment={setEnvironment}
          setShowChangelog={setShowChangelog}
        />
        <main className="main split-layout">
          <div className="config-panel stagger-item">
            <div className="config-flow">
              
              {/* BLOQUE 1: CONTROL DE FLUJO */}
              <div className="config-block">
                <div className="config-block-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={16} color="var(--accent-primary)" />
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      ESCENARIOS 
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>
                        ({registry.find(c => c.id === activeClient)?.procesos?.find(p => p.id === activeProcess)?.escenarios?.length || 0})
                      </span>
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowNewScenarioModal(true)}
                    title="Nuevo Escenario"
                    style={{ 
                      background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '50%', 
                      width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '1.8rem', fontWeight: '400', cursor: 'pointer', 
                      boxShadow: '0 4px 12px rgba(99,102,241,0.4)', transition: 'transform 0.15s, box-shadow 0.15s',
                      lineHeight: '0'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.6)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.4)'; }}
                  >
                    <span style={{ position: 'relative', top: '-2px' }}>+</span>
                  </button>
                </div>
                <div className="control-card-inner">
                  <div className="scenario-selector-group" style={{ position: 'relative', marginTop: '-4px' }}>
                    {/* Lista de escenarios — máx 4 visibles, scroll interno */}
                    {(() => {
                      const escenarios = [...(registry.find(c => c.id === activeClient)?.procesos?.find(p => p.id === activeProcess)?.escenarios || [])].sort((a, b) => {
                        const da = a.created_at ? new Date(a.created_at) : new Date(0);
                        const db2 = b.created_at ? new Date(b.created_at) : new Date(0);
                        return db2 - da;
                      });
                      const fmtDate = (iso) => {
                        if (!iso) return '—';
                        const d = new Date(iso);
                        const day = d.getDate();
                        const mon = d.toLocaleString('es-PE', { month: 'short' }).replace('.','');
                        const yr = String(d.getFullYear()).slice(-2);
                        return `${day} ${mon} '${yr}`;
                      };
                      return (
                        <div className="modern-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', paddingBottom: '2px' }}>
                          {escenarios.length === 0 && (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin flujos grabados</div>
                          )}
                          {escenarios.map(s => {
                            const isActive = s.id === activeScenarioId;
                            const author = s.created_by || '—';
                            return (
                              <div
                                key={s.id}
                                onClick={() => handleScenarioSelect(s.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '10px',
                                  padding: '11px 16px', borderRadius: '100px', cursor: 'pointer',
                                  background: isActive ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.02)',
                                  border: `1px solid ${isActive ? 'rgba(99,102,241,0.3)' : 'var(--card-border)'}`,
                                  transition: 'all 0.15s', flexShrink: 0
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: isActive ? 'var(--accent-primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                </div>
                                {(s.created_at || s.created_by) && (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px', flexShrink: 0 }}>
                                    {s.created_at && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '-0.01em' }}>{fmtDate(s.created_at)}</div>}
                                    {s.created_by && <div style={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.8)', maxWidth: '90px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{author}</div>}
                                  </div>
                                )}
                                <button
                                  onClick={e => deleteScenario(e, s.id, s.name)}
                                  title="Eliminar"
                                  style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: 0.45, padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'opacity 0.15s' }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                  onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}
                                >
                                  <X size={15} strokeWidth={3} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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

              {(activeScenarioId || isCreating) && (
                <div className="stagger-container" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* BLOQUE 2: MOTOR DE EJECUCIÓN */}
                  <div className="config-block stagger-item" style={{ margin: 0 }}>
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
                  <div className="config-block stagger-item">
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
                  <div className="stagger-item" style={{ position: 'sticky', bottom: '12px', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
              )}

            </div>

          </div>

          <div className="batch-panel stagger-item">
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
                      <button className="qrow-del" onClick={() => removeTask(q.taskId)}><X size={15} strokeWidth={3} /></button>
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

      {showNewScenarioModal && (
        <div className="modal-overlay" onClick={() => setShowNewScenarioModal(false)}>
          <div className="modal-content about-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '1.3rem', fontWeight: '800' }}>Nuevo Escenario</h2>
              <button onClick={() => setShowNewScenarioModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              ¿Cómo deseas crear este nuevo flujo de automatización?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => { setShowNewScenarioModal(false); openRecordModal(); }}
                style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Circle size={18} fill="#ef4444" color="#ef4444" className="rec-pulse" />
                </div>
                <div>
                  <div style={{ fontWeight: '800', color: '#ef4444', fontSize: '1rem', marginBottom: '3px' }}>Grabar Flujo</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Abre el navegador y registra tus clics automáticamente sin programar.</div>
                </div>
              </button>

              <button 
                onClick={() => { 
                  setShowNewScenarioModal(false); 
                  setActiveScenarioId(null);
                  setIsCreating(true);
                  setNewScenarioName('');
                  setInstruccionesIa('');
                  setBuilderConfig({ headless: true });
                }}
                style={{ padding: '16px', background: 'var(--apple-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--apple-bg)'}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color="var(--text-main)" />
                </div>
                <div>
                  <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '1rem', marginBottom: '3px' }}>Script Manual</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Crea un escenario en blanco para escribir o pegar código directamente.</div>
                </div>
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
          <div className="modal-content about-modal animate-modal-enter" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
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


              <button
                className="btn-run"
                style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', marginTop: '6px' }}
                onClick={async () => {
                  addToast('🛡️ Configuración blindada. Todo listo para operar.', 'success'); 
                  setShowSettings(false); 
                  fetchInitialData(); 
                }}
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sincronización eliminado por migración a Supabase */}

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
          <div className="animate-modal-enter" style={{ background: '#fff', borderRadius: '20px', padding: '28px 28px 24px', maxWidth: '380px', width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}
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
                style={{ padding: '10px 22px', borderRadius: '100px', border: '1px solid var(--card-border)', background: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '700' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                style={{ 
                  padding: '10px 22px', 
                  borderRadius: '100px', 
                  border: 'none', 
                  background: deleteModal.step === 2 ? '#ef4444' : 'var(--accent-primary)', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  fontSize: '0.85rem', 
                  fontWeight: '700',
                  boxShadow: deleteModal.step === 2 ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(99,102,241,0.3)'
                }}
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
