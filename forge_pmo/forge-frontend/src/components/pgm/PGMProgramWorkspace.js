import React from 'react';
import {
  sectionTitle, alertHeader, tableContainer, tableStyle, theadStyle, thStyle, tdStyle, trStyle,
  reviewBtn, primBtn, miniSelect, assignBtn, statusBadge
} from '../common/DashboardStyles';

export default function PGMProgramWorkspace({
  pendingProjects,
  onReviewProject,
  programs,
  pmList,
  selectedPMs,
  onPMSelectChange,
  onAssignPM,
  onOpenCreateModal,
  onOpenImportModal,
  formatDate
}) {
  return (
    <div style={{ padding: '0 25px 25px' }}>
      {/* 1. ACTION REQUIRED */}
      <div style={{ marginBottom: '35px' }}>
        <div style={alertHeader}>
          <h3 style={{ ...sectionTitle, color: '#92400e', margin: 0 }}> Action Required: Project Approvals</h3>
          <span style={{ fontWeight: 'bold' }}>{pendingProjects.length} Pending</span>
        </div>
        <div style={tableContainer}>
          <table style={tableStyle}>
            <thead style={theadStyle}>
              <tr>
                <th style={thStyle}>PROJECT DETAILS</th>
                <th style={thStyle}>SUBMITTED BY</th>
                <th style={thStyle}>TIMELINE</th>
                <th style={thStyle}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {pendingProjects.length > 0 ? (
                pendingProjects.map(proj => (
                  <tr key={proj.id} style={trStyle}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: '#1B3A6B' }}>{proj.name}</span><br />
                      <small style={{ color: '#666' }}>Program: {proj.program_name}</small>
                    </td>
                    <td style={tdStyle}>{proj.created_by_name || proj.pm_name}</td>
                    <td style={tdStyle}>{formatDate(proj.start_date)} to {formatDate(proj.end_date)}</td>
                    <td style={tdStyle}>
                      <button onClick={() => onReviewProject(proj)} style={reviewBtn}>
                        Review Plan
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" style={{ ...tdStyle, textAlign: 'center' }}>No pending approvals found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. ACTIVE PROGRAMS LIST */}
      <div style={{ marginBottom: '35px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ ...sectionTitle, margin: 0 }}>All Programs Overview</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onOpenCreateModal} style={primBtn}>+ Create New Program</button>
            <button onClick={onOpenImportModal} style={{ ...primBtn, background: '#10b981' }}>+ Bulk Import Programs</button>
          </div>
        </div>
        <div style={tableContainer}>
          <table style={tableStyle}>
            <thead style={theadStyle}>
              <tr>
                <th style={thStyle}>PROGRAM NAME</th>
                <th style={thStyle}>TIMELINE</th>
                <th style={thStyle}>STATUS</th>
                <th style={thStyle}>PROJECT MANAGER</th>
                <th style={thStyle}>ASSIGNMENT</th>
              </tr>
            </thead>
            <tbody>
              {programs.map(pgm => (
                <tr key={pgm.id} style={trStyle}>
                  <td style={tdStyle}><b>{pgm.name}</b></td>
                  <td style={tdStyle}>{pgm.start_date} - {pgm.end_date}</td>
                  <td style={tdStyle}><span style={statusBadge(pgm.status)}>{pgm.status}</span></td>
                  <td style={tdStyle}><b>{pgm.project_manager_assigned_name || 'Not Assigned'}</b></td>
                  <td style={tdStyle}>
                    {(pgm.status === 'Approved' || pgm.status === 'In Progress') ? (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <select 
                          style={miniSelect} 
                          value={selectedPMs[pgm.id] || ''}
                          onChange={(e) => onPMSelectChange(pgm.id, e.target.value)}
                        >
                          <option value="">Select PM</option>
                          {pmList.map(pm => <option key={pm.id} value={pm.id}>{pm.username}</option>)}
                        </select>
                        <button onClick={() => onAssignPM(pgm.id)} style={assignBtn}>Update</button>
                      </div>
                    ) : <span style={{ fontSize: '11px', fontStyle: 'italic' }}>Waiting Approval</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
