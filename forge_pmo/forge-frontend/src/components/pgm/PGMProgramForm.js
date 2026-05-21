import React from 'react';
import { modalOverlay, modalBox, lbl, inp, secBtn, primBtn } from '../common/DashboardStyles';

export default function PGMProgramForm({
  formData,
  onFormChange,
  onSubmit,
  onClose
}) {
  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h3 style={{ color: '#1B3A6B' }}>Initiate New Program</h3>
        <form onSubmit={onSubmit}>
          <label style={lbl}>Title</label>
          <input 
            style={inp} 
            required 
            value={formData.name || ''} 
            onChange={(e) => onFormChange('name', e.target.value)} 
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={lbl}>Start Date</label>
              <input 
                style={inp} 
                type="date" 
                required 
                value={formData.start_date || ''} 
                onChange={(e) => onFormChange('start_date', e.target.value)} 
              />
            </div>
            <div>
              <label style={lbl}>End Date</label>
              <input 
                style={inp} 
                type="date" 
                required 
                value={formData.end_date || ''} 
                onChange={(e) => onFormChange('end_date', e.target.value)} 
              />
            </div>
          </div>
          <label style={lbl}>Description</label>
          <textarea 
            style={{ ...inp, height: '80px' }} 
            placeholder="Program details..." 
            value={formData.description || ''} 
            onChange={(e) => onFormChange('description', e.target.value)}
          ></textarea>
          <label style={lbl}>Reference Document</label>
          <input 
            type="file" 
            style={inp} 
            onChange={(e) => onFormChange('document', e.target.files[0])} 
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} style={secBtn}>Cancel</button>
            <button type="submit" style={primBtn}>Create Program</button>
          </div>
        </form>
      </div>
    </div>
  );
}
