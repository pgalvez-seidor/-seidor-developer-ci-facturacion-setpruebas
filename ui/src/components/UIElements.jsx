import { useState } from 'react';
import { Settings, Cpu } from 'lucide-react';

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
      setRotation(prev => prev + (delta * 45));
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

export { ModernSwitch, ModernCheckbox, IteracionesPicker, ThreadsPicker, NuclearSwitch };
