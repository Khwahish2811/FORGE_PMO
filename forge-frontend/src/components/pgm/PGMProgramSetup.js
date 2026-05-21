import React from 'react';
import {
  primBtn, secBtn, lbl, inp
} from '../common/DashboardStyles';

export default function PGMProgramSetup({
  formData,
  onInputChange,
  onSubmit,
  onClose,
  onOpenImport
}) {
  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(8px)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const modalContentStyle = {
    background: '#fff',
    padding: '30px',
    borderRadius: '15px',
    position: 'relative'
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, width: '550px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        {/* Header */}
        <div style={{ background: '#1B3A6B', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Create New Program</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        
        <form onSubmit={onSubmit} style={{ padding: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}>Program Name</label>
            <input 
              style={{ ...inp, padding: '12px', borderRadius: '8px' }} 
              required 
              placeholder="e.g. Enterprise Cloud Migration" 
              value={formData.name} 
              onChange={(e) => onInputChange('name', e.target.value)} 
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}>Description</label>
            <textarea 
              style={{ ...inp, height: '80px', resize: 'none', padding: '12px', borderRadius: '8px' }} 
              required 
              placeholder="Provide program details, goals, and reference info..." 
              value={formData.description} 
              onChange={(e) => onInputChange('description', e.target.value)} 
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
            <div>
              <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}>Start Date</label>
              <input 
                type="date" 
                style={{ ...inp, padding: '12px', borderRadius: '8px' }} 
                required 
                value={formData.start_date} 
                onChange={(e) => onInputChange('start_date', e.target.value)} 
              />
            </div>
            <div>
              <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}>End Date</label>
              <input 
                type="date" 
                style={{ ...inp, padding: '12px', borderRadius: '8px' }} 
                required 
                value={formData.end_date} 
                onChange={(e) => onInputChange('end_date', e.target.value)} 
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <button 
              type="button" 
              onClick={() => {
                onClose();
                onOpenImport();
              }} 
              style={{ ...secBtn, background: '#EFF6FF', border: '1px dashed #3B82F6', color: '#1D4ED8', padding: '10px 15px', fontSize: '12px' }}
            >
              📥 Bulk Import Programs
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} style={{ ...secBtn, padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}>Cancel</button>
              <button type="submit" style={{ ...primBtn, padding: '10px 25px', background: '#10B981', borderRadius: '8px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>Save Program</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
