import React from 'react';
import {
  lbl, inp
} from '../common/DashboardStyles';

export default function PMUpdateNoteModal({
  showNoteModal,
  selectedProjectForNote,
  updateNoteText,
  onUpdateNoteTextChange,
  onSubmit,
  onClose,
  modalOverlayStyle,
  modalContentStyle
}) {
  if (!showNoteModal) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, width: '500px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ background: '#4f46e5', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Post Project Update / Announcement</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', opacity: 0.8 }}>✕</button>
        </div>
        <div style={{ padding: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...lbl, fontSize: '13px', color: '#4f46e5' }}>Project Name</label>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginTop: '5px' }}>{selectedProjectForNote?.name}</div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...lbl, fontSize: '13px', color: '#4f46e5' }}>Announcement Note</label>
            <textarea 
              style={{ ...inp, padding: '12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', height: '100px', resize: 'vertical' }} 
              required 
              placeholder="Enter latest project update, notes, or warning for team members..." 
              value={updateNoteText} 
              onChange={(e) => onUpdateNoteTextChange(e.target.value)} 
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={onClose} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
            <button onClick={onSubmit} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Post Update</button>
          </div>
        </div>
      </div>
    </div>
  );
}
