import React from 'react';
import {
  sectionTitle, tableContainer, tableStyle, theadStyle, thStyle, tdStyle, trStyle, primBtn
} from '../common/DashboardStyles';

export default function PGMWorkingPrograms({ programs, formatDate, handleLiveTrack, loadingStats }) {
  return (
    <div style={{ padding: '25px' }}>
      <h3 style={{ ...sectionTitle, marginBottom: '20px', fontSize: '18px' }}> Programs Currently in Execution</h3>
      <div style={tableContainer}>
        <table style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th style={thStyle}>WORKING PROGRAM</th>
              <th style={thStyle}>MANAGER</th>
              <th style={thStyle}>LATEST STATUS</th>
              <th style={thStyle}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {programs.filter(p => (p.status === 'Approved' || p.status === 'In Progress') && p.project_manager_assigned_name).length > 0 ? (
              programs
                .filter(p => (p.status === 'Approved' || p.status === 'In Progress') && p.project_manager_assigned_name)
                .map(pgm => (
                  <tr key={pgm.id} style={trStyle}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>{pgm.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{formatDate(pgm.start_date)} to {formatDate(pgm.end_date)}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '25px', height: '25px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', color: '#fff', fontWeight: 'bold', fontSize: '10px' }}>{pgm.project_manager_assigned_name.charAt(0)}</div>
                        {pgm.project_manager_assigned_name}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {(() => {
                        const pct = pgm.completion_percentage || 0;
                        let label = "IN PROGRESS";
                        let color = "#1e40af";
                        let bg = "#dbeafe";

                        if (pct === 0) { label = "NOT STARTED"; color = "#64748b"; bg = "#f1f5f9"; }
                        else if (pct === 100) { label = "COMPLETED"; color = "#166534"; bg = "#dcfce7"; }
                        else if (pct > 90) { label = "ALMOST DONE"; color = "#854d0e"; bg = "#fef9c3"; }
                        else { label = `${pct}% COMPLETE`; }

                        return (
                          <span style={{ background: bg, color: color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleLiveTrack(pgm.id)}
                        style={{ ...primBtn, padding: '8px 15px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        {loadingStats ? 'Loading...' : 'Live Track '}
                      </button>
                    </td>
                  </tr>
                ))
            ) : (
              <tr><td colSpan="4" style={{ ...tdStyle, textAlign: 'center' }}>No active working programs to track.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
