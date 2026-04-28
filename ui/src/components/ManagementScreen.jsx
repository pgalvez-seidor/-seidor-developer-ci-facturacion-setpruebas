import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Upload, 
  ChevronRight,
  Palette,
  Layout,
  LayoutGrid,
  Loader
} from 'lucide-react';

const ManagementScreen = ({ onClose, registry, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('clientes');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  const closeEditor = () => {
    setIsClosing(true);
    setTimeout(() => {
      setEditingItem(null);
      setIsClosing(false);
    }, 400); 
  };

  const handleEdit = (item, type) => {
    setEditingItem({ ...item, type });
    setFormData(type === 'client' ? {
      id: item.id,
      name: item.name,
      descripcion: item.descripcion || '',
      logo_base64: item.logo_base64 || null,
      color_primario: item.color_primario || '#3b82f6'
    } : {
      id: item.id,
      client_id: item.client_id,
      name: item.name,
      descripcion: item.descripcion || ''
    });
  };

  const handleNew = (type) => {
    const newId = type === 'client' ? `cli_${Date.now()}` : `proj_${Date.now()}`;
    setEditingItem({ type, isNew: true });
    setFormData(type === 'client' ? {
      id: newId,
      name: '',
      descripcion: '',
      logo_base64: null,
      color_primario: '#3b82f6'
    } : {
      id: newId,
      client_id: registry[0]?.id || '',
      name: '',
      descripcion: ''
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo_base64: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveChanges = async () => {
    setIsSaving(true);
    const endpoint = editingItem.type === 'client' ? '/api/management/client' : '/api/management/project';
    
    try {
      const res = await fetch(`http://127.0.0.1:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        onRefresh(); 
        closeEditor();
      } else {
        const errData = await res.json();
        alert(`Error al guardar: ${errData.error || 'Error desconocido'}`);
      }
    } catch (e) {
      console.error('Error saving:', e);
      alert(`Error de conexión: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (type, id) => {
    if (!window.confirm('¿Estás seguro de eliminar este elemento?')) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:3001/api/management/${type}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) onRefresh();
    } catch (e) {
      console.error('Error deleting:', e);
    }
  };

  return (
    <div className="mgt-overlay" style={{ opacity: visible ? 1 : 0 }}>
      <div className="mgt-modal" style={{ transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)' }}>
        
        <style dangerouslySetInnerHTML={{ __html: `
          .mgt-overlay {
            position: fixed; inset: 0; z-index: 9999;
            background: rgba(255,255,255,0.7); backdrop-filter: saturate(180%) blur(20px);
            display: flex; align-items: center; justify-content: center; padding: 40px;
            transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .mgt-modal {
            background: white; width: 100%; max-width: 1100px; height: 85vh;
            border-radius: 40px; box-shadow: 0 40px 100px rgba(0,0,0,0.1);
            display: flex; flex-direction: column; overflow: hidden;
            border: 1px solid rgba(0,0,0,0.05);
            transition: 0.7s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .mgt-header { padding: 30px 40px; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
          .mgt-tabs { padding: 16px 40px; background: #f5f5f7; display: flex; gap: 8px; align-items: center; justify-content: space-between; }
          .tab-btn { padding: 8px 24px; border-radius: 100px; border: none; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 8px; }
          .tab-btn.active { background: white; color: #007aff; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
          .tab-btn:not(.active) { background: transparent; color: #86868b; }
          .btn-primary-round { background: #000; color: #fff; width: 42px; height: 42px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.4s; }
          .mgt-content { flex: 1; overflow-y: auto; padding: 40px; background: white; }
          .client-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; }
          .client-card { background: #f5f5f7; border-radius: 32px; padding: 30px; transition: 0.4s; position: relative; }
          .client-card:hover { transform: translateY(-8px); background: white; box-shadow: 0 30px 60px rgba(0,0,0,0.08); }
          .logo-container { width: 70px; height: 70px; border-radius: 22px; background: white; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 24px; }
          .logo-img { width: 100%; height: 100%; object-fit: contain; padding: 10px; }
          .card-actions { position: absolute; top: 24px; right: 24px; display: flex; gap: 6px; opacity: 0; transition: 0.3s; }
          .client-card:hover .card-actions { opacity: 1; }
          .action-btn-round { width: 36px; height: 36px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
          .btn-edit { color: #007aff; }
          .btn-delete { color: #ff3b30; }
          .slide-editor { position: fixed; top: 0; right: 0; bottom: 0; width: 420px; background: white; box-shadow: -30px 0 80px rgba(0,0,0,0.1); z-index: 10000; display: flex; flex-direction: column; transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
          .slide-editor.entering { animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
          .slide-editor.leaving { animation: slideOut 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
          @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes slideOut { from { transform: translateX(0); } to { transform: translateX(100%); } }
          .form-group { margin-bottom: 20px; }
          .form-label { display: block; font-size: 0.65rem; font-weight: 800; color: #98989d; text-transform: uppercase; margin-bottom: 8px; }
          .form-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: none; background: #f2f2f7; font-size: 0.85rem; font-weight: 600; }
          .btn-save-minimal { background: #007aff; color: white; padding: 12px 32px; border-radius: 100px; border: none; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.4s; width: fit-content; margin-left: auto; min-width: 140px; }
          .mgt-table { width: 100%; border-collapse: collapse; }
          .mgt-table th { padding: 16px 24px; font-size: 0.7rem; font-weight: 800; color: #8e8e93; border-bottom: 1px solid #f2f2f7; text-transform: uppercase; text-align: left; }
          .mgt-table td { padding: 16px 24px; border-bottom: 1px solid #fbfbfd; font-size: 0.9rem; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}} />

        {/* Header */}
        <div className="mgt-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', background: '#007aff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <LayoutGrid size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#1d1d1f' }}>Gestión de Mando</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#8e8e93' }}>Administra clientes y proyectos</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f2f2f7', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="mgt-tabs">
          <div style={{ display: 'flex', gap: '4px', background: 'white', padding: '4px', borderRadius: '100px' }}>
            <button className={`tab-btn ${activeTab === 'clientes' ? 'active' : ''}`} onClick={() => setActiveTab('clientes')}>
              <Users size={16} /> Clientes
            </button>
            <button className={`tab-btn ${activeTab === 'proyectos' ? 'active' : ''}`} onClick={() => setActiveTab('proyectos')}>
              <Briefcase size={16} /> Proyectos
            </button>
          </div>
          <button className="btn-primary-round" onClick={() => handleNew(activeTab === 'clientes' ? 'client' : 'project')}>
            <Plus size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="mgt-content">
          {activeTab === 'clientes' ? (
            <div className="client-grid">
              {registry.map((client) => (
                <div key={client.id} className="client-card">
                  <div className="card-actions">
                    <button className="action-btn-round btn-edit" onClick={() => handleEdit(client, 'client')}><Pencil size={14}/></button>
                    <button className="action-btn-round btn-delete" onClick={() => deleteItem('client', client.id)}><Trash2 size={14}/></button>
                  </div>
                  <div className="logo-container">
                    {client.logo_base64 ? (
                      <img src={client.logo_base64} alt={client.name} className="logo-img" />
                    ) : (
                      <Users size={28} style={{ color: '#d1d1d6' }} />
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '800' }}>{client.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#8e8e93' }}>{client.descripcion || 'Sin descripción.'}</p>
                </div>
              ))}
            </div>
          ) : (
            <table className="mgt-table">
              <thead><tr><th>Proyecto</th><th>Cliente</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
              <tbody>
                {registry.flatMap(c => c.procesos.map(p => ({ ...p, clientName: c.name }))).map(p => (
                  <tr key={p.id}>
                    <td><div style={{ fontWeight: '700' }}>{p.name}</div></td>
                    <td><span style={{ padding: '4px 12px', background: '#e5f1ff', color: '#007aff', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800' }}>{p.clientName}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="action-btn-round btn-edit" onClick={() => handleEdit(p, 'project')}><Pencil size={14}/></button>
                        <button className="action-btn-round btn-delete" onClick={() => deleteItem('project', p.id)}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Editor Lateral */}
      {editingItem && (
        <div className={`slide-editor ${isClosing ? 'leaving' : 'entering'}`}>
          <div style={{ padding: '32px', borderBottom: '1px solid #f2f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>{editingItem.isNew ? 'Nuevo' : 'Editar'}</h3>
            <button onClick={closeEditor} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
            {editingItem.type === 'client' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                   <div style={{ position: 'relative', width: '100px', height: '100px', background: '#f2f2f7', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {formData.logo_base64 ? <img src={formData.logo_base64} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }} /> : <Upload size={24} color="#d1d1d6" />}
                      <input type="file" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} accept="image/*" onChange={handleLogoUpload} />
                   </div>
                   <span style={{ marginTop: '8px', fontSize: '0.65rem', fontWeight: '800', color: '#8e8e93' }}>LOGO CORPORATIVO</span>
                </div>
                <div className="form-group"><label className="form-label">Nombre Comercial</label><input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Color Primario</label><input type="color" value={formData.color_primario} onChange={e => setFormData({...formData, color_primario: e.target.value})} style={{ width: '100%', height: '40px', border: 'none', padding: 0 }} /></div>
                <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-input" rows={4} value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} /></div>
              </>
            ) : (
              <>
                <div className="form-group"><label className="form-label">Nombre del Proyecto</label><input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-input" rows={4} value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} /></div>
              </>
            )}
          </div>

          <div style={{ padding: '24px 32px', borderTop: '1px solid #f2f2f7' }}>
            <button className="btn-save-minimal" onClick={saveChanges} disabled={isSaving}>
              {isSaving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementScreen;
