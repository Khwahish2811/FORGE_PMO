import React, { useState } from 'react';
import {
  primBtn, secBtn, lbl, inp
} from '../common/DashboardStyles';

const miniThStyle = { padding: '10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' };

export default function PMProjectPlanForm({
  selectedProgram,
  employees,
  onSubmitPlan,
  onClose,
  showToast
}) {
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    priority: 'Medium',
    team: [{ userId: '', fte: 1.0, role: 'Dev' }],
    sprints: [{ name: 'Sprint 1', start_date: '', end_date: '' }],
  });

  const onInputChange = (key, value) => {
    setProjectData(prev => ({ ...prev, [key]: value }));
  };

  const onMemberChange = (idx, key, value) => {
    setProjectData(prev => {
      const copy = [...prev.team];
      copy[idx] = { ...copy[idx], [key]: key === 'fte' ? parseFloat(value) || 0 : value };
      return { ...prev, team: copy };
    });
  };

  const addMemberRow = () => {
    setProjectData(prev => ({
      ...prev,
      team: [...prev.team, { userId: '', fte: 1.0, role: 'Dev' }]
    }));
  };

  const removeMemberRow = (idx) => {
    setProjectData(prev => ({
      ...prev,
      team: prev.team.filter((_, i) => i !== idx)
    }));
  };

  const onSprintChange = (idx, key, value) => {
    setProjectData(prev => {
      const copy = [...prev.sprints];
      copy[idx] = { ...copy[idx], [key]: value };
      return { ...prev, sprints: copy };
    });
  };

  const addSprintRow = () => {
    setProjectData(prev => ({
      ...prev,
      sprints: [...prev.sprints, { name: `Sprint ${prev.sprints.length + 1}`, start_date: '', end_date: '' }]
    }));
  };

  const removeSprintRow = (idx) => {
    setProjectData(prev => ({
      ...prev,
      sprints: prev.sprints.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (projectData.team.some(m => !m.userId)) {
      showToast('Please assign a member to all selected team slots.', 'warning');
      return;
    }

    const pStart = new Date(selectedProgram.start_date);
    const pEnd = new Date(selectedProgram.end_date);
    const prjStart = new Date(projectData.start_date);
    const prjEnd = new Date(projectData.end_date);

    if (prjStart < pStart || prjEnd > pEnd) {
      showToast(`Project timeline must be within Program bounds (${selectedProgram.start_date} to ${selectedProgram.end_date})`, 'error');
      return;
    }
    if (prjStart > prjEnd) {
      showToast('Project start date must be before end date.', 'error');
      return;
    }

    for (let s of projectData.sprints) {
      if (!s.name || !s.start_date || !s.end_date) {
        showToast('Please fill all sprint fields.', 'error');
        return;
      }
      const sStart = new Date(s.start_date);
      const sEnd = new Date(s.end_date);
      if (sStart < prjStart || sEnd > prjEnd) {
        showToast(`Sprint '${s.name}' must be within project timeline (${projectData.start_date} to ${projectData.end_date})`, 'error');
        return;
      }
      if (sStart > sEnd) {
        showToast(`Sprint '${s.name}' start date must be before end date.`, 'error');
        return;
      }
    }

    onSubmitPlan(projectData);
  };

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
      <div style={{ ...modalContentStyle, width: '800px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        {/* Header */}
        <div style={{ background: '#1B3A6B', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Setup Project: {selectedProgram?.name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '30px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}> Project Name</label>
              <input style={{...inp, padding: '12px', borderRadius: '8px'}} required value={projectData.name} onChange={(e) => onInputChange('name', e.target.value)} placeholder="e.g., Marketing Campaign Q3" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}> Description</label>
              <textarea style={{ ...inp, minHeight: '80px', padding: '12px', borderRadius: '8px', resize: 'none' }} value={projectData.description} onChange={(e) => onInputChange('description', e.target.value)} placeholder="Briefly describe the project objectives..." />
            </div>
            <div>
                <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}> Start Date</label>
                <input type="date" style={{...inp, padding: '12px', borderRadius: '8px'}} required 
                     min={selectedProgram?.start_date} max={selectedProgram?.end_date}
                     value={projectData.start_date} onChange={(e) => onInputChange('start_date', e.target.value)} 
                />
                <small style={{color: '#64748b', fontSize: '10px'}}>Program Start: {selectedProgram?.start_date}</small>
            </div>
            <div>
                <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}> End Date</label>
                <input type="date" style={{...inp, padding: '12px', borderRadius: '8px'}} required 
                     min={selectedProgram?.start_date} max={selectedProgram?.end_date}
                     value={projectData.end_date} onChange={(e) => onInputChange('end_date', e.target.value)} 
                />
                <small style={{color: '#64748b', fontSize: '10px'}}>Program End: {selectedProgram?.end_date}</small>
            </div>
          </div>

          {/* Resource Allocation Section */}
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
            <h4 style={{ color: '#1B3A6B', marginTop: 0, fontSize: '15px', marginBottom: '15px' }}> Resource Allocation</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{...miniThStyle, padding: '10px', textAlign: 'left'}}>Member</th>
                    <th style={{...miniThStyle, padding: '10px', textAlign: 'left'}}>Role</th>
                    <th style={{...miniThStyle, padding: '10px', textAlign: 'left'}}>FTE</th>
                    <th style={{width: '40px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {projectData.team.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{padding: '5px'}}>
                        <select style={{...inp, margin: 0, padding: '8px'}} value={m.userId} onChange={(e) => onMemberChange(idx, 'userId', e.target.value)}>
                          <option value="">Select Member</option>
                          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.username}</option>)}
                        </select>
                      </td>
                      <td style={{padding: '5px'}}><input style={{...inp, margin: 0, padding: '8px'}} value={m.role} onChange={(e) => onMemberChange(idx, 'role', e.target.value)} placeholder="e.g. Dev" /></td>
                      <td style={{padding: '5px'}}><input type="number" step="0.1" style={{...inp, margin: 0, padding: '8px'}} value={m.fte} onChange={(e) => onMemberChange(idx, 'fte', e.target.value)} /></td>
                      <td style={{padding: '5px', textAlign: 'center'}}><button type="button" onClick={() => removeMemberRow(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addMemberRow} style={{ ...secBtn, marginTop: '12px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', fontSize: '12px' }}>+ Add Team Member</button>
          </div>

          {/* Sprints Section */}
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
            <h4 style={{ color: '#1B3A6B', marginTop: 0, fontSize: '15px', marginBottom: '15px' }}> Sprints</h4>
            {projectData.sprints.map((s, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 40px', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                <input style={{...inp, margin: 0, padding: '8px'}} value={s.name} onChange={(e) => onSprintChange(idx, 'name', e.target.value)} placeholder="Sprint Name" />
                <input type="date" style={{...inp, margin: 0, padding: '8px'}} 
                     min={projectData.start_date} max={projectData.end_date}
                     value={s.start_date} onChange={(e) => onSprintChange(idx, 'start_date', e.target.value)} 
                />
                <input type="date" style={{...inp, margin: 0, padding: '8px'}} 
                     min={projectData.start_date} max={projectData.end_date}
                     value={s.end_date} onChange={(e) => onSprintChange(idx, 'end_date', e.target.value)} 
                />
                <button type="button" onClick={() => removeSprintRow(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
            ))}
            <button type="button" onClick={addSprintRow} style={{ ...secBtn, marginTop: '12px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', fontSize: '12px' }}>+ Add Sprint</button>
          </div>

          {/* Submit Actions */}
          <div style={{ borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '20px' }}>
            <button type="button" onClick={onClose} style={{ ...secBtn, padding: '10px 20px', fontWeight: '600', borderRadius: '8px' }}>Cancel</button>
            <button type="submit" style={{ ...primBtn, padding: '10px 30px', background: '#10B981', fontWeight: '600', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>Submit Project Plan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
