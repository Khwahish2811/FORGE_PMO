import React from 'react';
import {
  lbl, inp
} from '../common/DashboardStyles';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function PMSprintRequestModal({
  showSprintModal,
  sprintIdToUpdate,
  sprintName,
  onSprintNameChange,
  sprintStartDate,
  onSprintStartDateChange,
  sprintEndDate,
  onSprintEndDateChange,
  selectedProjectForSprint,
  onSubmit,
  onClose
}) {
  if (!showSprintModal) return null;

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
      <div style={{ ...modalContentStyle, width: '500px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ background: '#0891b2', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{sprintIdToUpdate ? 'Update Returned Sprint' : 'Request Additional Sprint'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', opacity: 0.8 }}>✕</button>
        </div>
        <div style={{ padding: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...lbl, fontSize: '13px', color: '#0891b2' }}>Project Name</label>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginTop: '5px' }}>{selectedProjectForSprint?.name}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Project Timeline: <b>{formatDate(selectedProjectForSprint?.start_date)}</b> to <b>{formatDate(selectedProjectForSprint?.end_date)}</b></div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...lbl, fontSize: '13px', color: '#0891b2' }}>Sprint Name</label>
            <input 
              style={{ ...inp, padding: '12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
              required 
              placeholder="e.g. Sprint 3" 
              value={sprintName} 
              onChange={(e) => onSprintNameChange(e.target.value)} 
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ ...lbl, fontSize: '13px', color: '#0891b2' }}>Start Date</label>
              <input 
                type="date"
                style={{ ...inp, padding: '12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                required 
                min={selectedProjectForSprint?.start_date}
                max={selectedProjectForSprint?.end_date}
                value={sprintStartDate} 
                onChange={(e) => onSprintStartDateChange(e.target.value)} 
              />
            </div>
            <div>
              <label style={{ ...lbl, fontSize: '13px', color: '#0891b2' }}>End Date</label>
              <input 
                type="date"
                style={{ ...inp, padding: '12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                required 
                min={selectedProjectForSprint?.start_date}
                max={selectedProjectForSprint?.end_date}
                value={sprintEndDate} 
                onChange={(e) => onSprintEndDateChange(e.target.value)} 
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={onClose} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
            <button onClick={onSubmit} style={{ background: '#0891b2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>{sprintIdToUpdate ? 'Update Sprint' : 'Request Sprint'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
