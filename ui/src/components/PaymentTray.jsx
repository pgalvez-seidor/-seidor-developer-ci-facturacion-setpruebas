import { Banknote, CreditCard, X } from 'lucide-react';

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
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
                onClick={() => removePago(p.id)}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                className="tray-input"
                placeholder="Monto"
                value={p.monto}
                onChange={(e) => updMonto(p.id, e.target.value)}
              />
              <button 
                className={`btn-auto ${p.autoData ? 'active' : ''}`}
                onClick={() => updAuto(p.id, !p.autoData)}
                title="Generar datos aleatorios"
              >
                AUTO
              </button>
            </div>
          </div>
        ))}
      </div>

      {showVuelto && (
        <div className="vuelto-section animate-slide-up">
          <div className="vuelto-label">MODO DE VUELTO</div>
          <div className="vuelto-options">
            {["Efectivo", "Depósito CTA", "Nota de Crédito"].map(m => (
              <button 
                key={m}
                className={`vuelto-option ${medioVuelto === m ? 'active' : ''}`}
                onClick={() => updateMedioVuelto(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {pagos.length > 0 && (
        <div className="tray-footer">
          <span>Total:</span>
          <strong>S/ {total.toFixed(2)}</strong>
        </div>
      )}
    </div>
  );
};

export default PaymentTray;
