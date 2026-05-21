import React from 'react';
import {
  tableContainer, tableStyle, theadStyle, thStyle, tdStyle, trStyle,
  primBtn, reviewBtn, lbl, inp, secBtn
} from '../common/DashboardStyles';

export default function PGMPlanReview({
  pendingProjects,
  selectedReview,
  onOpenReview,
  onCloseReview,
  returnNote,
  onReturnNoteChange,
  onDecision
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
    <>
      {selectedReview && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '750px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ background: '#1B3A6B', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Review Plan: {selectedReview.project_name}</h3>
              <button onClick={onCloseReview} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ padding: '30px', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <div>
                  <label style={{ ...lbl, fontSize: '12px', color: '#64748B', textTransform: 'uppercase' }}>Program Name</label>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1B3A6B', marginTop: '4px' }}>{selectedReview.program_name}</div>
                </div>
                <div>
                  <label style={{ ...lbl, fontSize: '12px', color: '#64748B', textTransform: 'uppercase' }}>Project Manager</label>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1B3A6B', marginTop: '4px' }}>{selectedReview.pm_name}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ ...lbl, fontSize: '12px', color: '#64748B', textTransform: 'uppercase' }}>Project Description</label>
                  <div style={{ fontSize: '14px', color: '#334155', marginTop: '4px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', lineHeight: '1.5' }}>
                    {selectedReview.description}
                  </div>
                </div>
              </div>

              {/* Resources */}
              <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '25px' }}>
                <h4 style={{ color: '#1B3A6B', marginTop: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '15px' }}>Team & FTE Allocation</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', color: '#64748B' }}>USERNAME</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', color: '#64748B' }}>ROLE</th>
                      <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: '#64748B' }}>ALLOCATED FTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReview.team_members?.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 8px', fontSize: '13px', color: '#334155' }}><b>{m.username}</b></td>
                        <td style={{ padding: '10px 8px', fontSize: '13px', color: '#64748B' }}>{m.role}</td>
                        <td style={{ padding: '10px 8px', fontSize: '13px', color: '#10B981', fontWeight: 'bold', textAlign: 'right' }}>{m.fte} FTE</td>
                      </tr>
                    )) || <tr><td colSpan="3">No members allocated</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* Sprints */}
              <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '25px' }}>
                <h4 style={{ color: '#1B3A6B', marginTop: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '15px' }}>Sprints Roadmap</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', color: '#64748B' }}>SPRINT NAME</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', color: '#64748B' }}>TIMELINE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReview.sprints?.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 8px', fontSize: '13px', color: '#334155' }}><b>{s.name}</b></td>
                        <td style={{ padding: '10px 8px', fontSize: '13px', color: '#64748B' }}>{s.start_date} to {s.end_date}</td>
                      </tr>
                    )) || <tr><td colSpan="2">No sprints roadmap built</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* Feedback Note */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ ...lbl, fontSize: '12px', color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>Feedback Notes / Return Message</label>
                <textarea 
                  style={{ ...inp, height: '70px', resize: 'none', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  placeholder="Provide feedback note if returning the plan for corrections..."
                  value={returnNote}
                  onChange={(e) => onReturnNoteChange(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
                <button onClick={onCloseReview} style={{ ...secBtn, padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}>Cancel</button>
                <button onClick={() => onDecision('reject')} style={{ ...primBtn, background: '#EF4444', padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}>Reject Plan</button>
                <button onClick={() => onDecision('return')} style={{ ...primBtn, background: '#F59E0B', padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}>Return for updates</button>
                <button onClick={() => onDecision('approve')} style={{ ...primBtn, background: '#10B981', padding: '10px 25px', borderRadius: '8px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>Approve & Release</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
