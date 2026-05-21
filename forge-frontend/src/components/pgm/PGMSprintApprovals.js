import React from 'react';
import {
  tableContainer, tableStyle, theadStyle, thStyle, tdStyle, trStyle,
  primBtn, reviewBtn, lbl, inp, secBtn
} from '../common/DashboardStyles';

export default function PGMSprintApprovals({
  pendingSprints,
  selectedSprintReview,
  onOpenSprintReview,
  onCloseSprintReview,
  sprintReturnNote,
  onSprintReturnNoteChange,
  onSprintDecision
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
      <div style={tableContainer}>
        <table style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th style={thStyle}>SPRINT NAME</th>
              <th style={thStyle}>PROJECT</th>
              <th style={thStyle}>PM USERNAME</th>
              <th style={thStyle}>REQUESTED DURATION</th>
              <th style={thStyle}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {pendingSprints.length > 0 ? (
              pendingSprints.map((s) => (
                <tr key={s.sprint_id} style={trStyle}>
                  <td style={tdStyle}><b>{s.sprint_name}</b></td>
                  <td style={tdStyle}>{s.project_name} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>({s.program_name})</span></td>
                  <td style={tdStyle}>{s.pm_username}</td>
                  <td style={tdStyle}>{s.start_date} to {s.end_date}</td>
                  <td style={tdStyle}>
                    <button onClick={() => onOpenSprintReview(s)} style={reviewBtn}>
                      Review Request
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '25px', color: '#64748B' }}>
                  No additional sprint requests pending approval.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedSprintReview && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '550px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ background: '#0891b2', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Review Additional Sprint Request</h3>
              <button onClick={onCloseSprintReview} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', opacity: 0.8 }}>✕</button>
            </div>
            
            <div style={{ padding: '30px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ ...lbl, fontSize: '12px', color: '#0891b2', textTransform: 'uppercase' }}>Project Info</label>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1E293B', marginTop: '4px' }}>{selectedSprintReview.project_name}</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>Program: <b>{selectedSprintReview.program_name}</b> • PM: <b>{selectedSprintReview.pm_username}</b></div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ ...lbl, fontSize: '12px', color: '#0891b2', textTransform: 'uppercase' }}>Requested Sprint Details</label>
                <div style={{ fontSize: '14px', color: '#334155', marginTop: '5px' }}>
                  Sprint Name: <b>{selectedSprintReview.sprint_name}</b>
                </div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '3px' }}>
                  Duration: <b>{selectedSprintReview.start_date}</b> to <b>{selectedSprintReview.end_date}</b>
                </div>
              </div>
              
              <div style={{ marginBottom: '25px' }}>
                <label style={{ ...lbl, fontSize: '12px', color: '#0891b2', textTransform: 'uppercase', marginBottom: '8px' }}>Feedback Notes (Required if returning)</label>
                <textarea 
                  style={{ ...inp, height: '70px', resize: 'none', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  placeholder="Provide feedback note if returning this sprint request..."
                  value={sprintReturnNote}
                  onChange={(e) => onSprintReturnNoteChange(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
                <button onClick={onCloseSprintReview} style={{ ...secBtn, padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}>Cancel</button>
                <button onClick={() => onSprintDecision('Returned')} style={{ ...primBtn, background: '#F59E0B', padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}>Return Sprint</button>
                <button onClick={() => onSprintDecision('Approved')} style={{ ...primBtn, background: '#10B981', padding: '10px 25px', borderRadius: '8px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>Approve Sprint</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
