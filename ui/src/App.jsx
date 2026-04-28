import { useState, useEffect, useCallback } from 'react';
import { 
  Eye, Zap, CreditCard, Banknote, Trash2, 
  CheckCircle2, AlertCircle, Clock, Info, ChevronRight, X, Circle, Square, Power,
  Sparkles, FileText, Settings, Cpu
} from 'lucide-react';
import './index-a.css';
import ManagementScreen from './components/ManagementScreen';

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  const [registry, setRegistry] = useState([]);
  const [activeClient, setActiveClient] = useState('Medifarma');
  const [activeProcess, setActiveProcess] = useState('mf_flujos');
  const [showManagement, setShowManagement] = useState(false);

  const fetchRegistry = async () => {
    try {
      const res = await fetch(`${API_BASE}/registry`);
      if (res.ok) setRegistry(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchRegistry(); }, []);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh' }}>
      
      {/* Sidebar Clásica Funcional */}
      <aside className="sidebar" style={{ width: '280px', background: '#f8fafc', padding: '24px', borderRight: '1px solid #e2e8f0' }}>
        <div style={{ marginBottom: '32px', fontWeight: '800', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo-pure.png" style={{ width: '32px' }} /> AutoBot
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            MIS PROYECTOS
            <button onClick={() => setShowManagement(true)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }}>
              <Settings size={14} />
            </button>
          </div>
          {registry.map(c => (
            <div key={c.id} onClick={() => setActiveClient(c.id)} style={{ padding: '10px', borderRadius: '8px', background: activeClient === c.id ? '#fff' : 'transparent', cursor: 'pointer', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: activeClient === c.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
              {c.logo_base64 ? <img src={c.logo_base64} style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> : <Info size={16} />}
              <span style={{ fontSize: '0.85rem', fontWeight: activeClient === c.id ? '700' : '500' }}>{c.name}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <header>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#64748b' }}>Gestión de pruebas para {activeClient}</p>
        </header>
      </main>

      {/* Modal de Gestión */}
      {showManagement && (
        <ManagementScreen 
          onClose={() => setShowManagement(false)} 
          registry={registry} 
          onRefresh={fetchRegistry} 
        />
      )}
    </div>
  );
}
