import React from 'react';
import {
  sectionTitle, tableContainer, tableStyle, theadStyle, thStyle, tdStyle, trStyle, primBtn
} from '../common/DashboardStyles';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function PMWorkingPrograms({ workingPrograms, onLiveTrack }) {
  return (
    <>
      <h3 style={sectionTitle}> Programs Currently in Execution</h3>
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
            {workingPrograms.length > 0 ? (
              workingPrograms.map((pgm) => (
                <tr key={pgm.id} style={trStyle}>
                  <td style={tdStyle}>
                    <b>{pgm.name}</b>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {formatDate(pgm.start_date)} to {formatDate(pgm.end_date)}
                    </div>
                  </td>
                  <td style={tdStyle}>{pgm.pm_name}</td>
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
                        <span style={{ backgroundColor: bg, color: color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => onLiveTrack(pgm.id)}
                      style={{ ...primBtn, padding: '6px 12px', fontSize: '12px', backgroundColor: '#8b5cf6' }}
                    >
                      Live Track
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                  No programs in execution.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
