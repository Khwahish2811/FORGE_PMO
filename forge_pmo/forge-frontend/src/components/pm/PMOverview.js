import React from 'react';
import {
  tableContainer, tableStyle, theadStyle, thStyle, tdStyle, trStyle,
  primBtn, sectionTitle
} from '../common/DashboardStyles';

export default function PMOverview({
  assignedPrograms,
  stats,
  resources,
  username,
  onBuildPlan,
  onLiveTrack
}) {
  return (
    <>
      {/* Horizontal Stats Cards Section */}
      <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '30px',
          marginTop: '20px'
      }}>
          {/* Card 1 */}
          <div style={{
              flex: 1,
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: '5px solid #4e73df'
          }}>
              <h6 style={{ color: '#858796', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Total Assigned</h6>
              <h3 style={{ margin: 0, fontWeight: 'bold', color: '#4e73df' }}>{stats.total_assigned || 0}</h3>
          </div>

          {/* Card 2 */}
          <div style={{
              flex: 1,
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: '5px solid #f6c23e'
          }}>
              <h6 style={{ color: '#858796', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Pending Plans</h6>
              <h3 style={{ margin: 0, fontWeight: 'bold', color: '#f6c23e' }}>{stats.pending_plans || 0}</h3>
          </div>

          {/* Card 3 */}
          <div style={{
              flex: 1,
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: '5px solid #1cc88a'
          }}>
              <h6 style={{ color: '#858796', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Overall Progress</h6>
              <h3 style={{ margin: 0, fontWeight: 'bold', color: '#1cc88a' }}>{stats.avg_completion || 0}%</h3>
          </div>

          {/* Card 4 - Your FTE Load */}
          {(() => {
            const myRes = resources.find(r => r.username === username);
            const myFteVal = myRes ? myRes.assigned_fte : 0;
            const myStatus = myRes ? myRes.workload_status : 'Free';
            const myColor = myRes ? myRes.workload_color : 'Green';
            return (
              <div style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderLeft: `5px solid ${myColor === 'Red' ? '#EF4444' : myColor === 'Yellow' ? '#F59E0B' : '#10B981'}`
              }}>
                  <h6 style={{ color: '#858796', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Your FTE Load</h6>
                  <h3 style={{ margin: 0, fontWeight: 'bold', color: myColor === 'Red' ? '#EF4444' : myColor === 'Yellow' ? '#D97706' : '#10B981' }}>
                      {myFteVal.toFixed(2)} FTE <span style={{ fontSize: '11px', fontWeight: 'bold', marginLeft: '5px', color: '#64748B' }}>({myStatus.toUpperCase()})</span>
                  </h3>
              </div>
            );
          })()}
      </div>

      <h3 style={sectionTitle}>Assigned Programs</h3>
      <div style={tableContainer}>
        <table style={tableStyle}>
          <thead style={theadStyle}><tr><th style={thStyle}>PROGRAM NAME</th><th style={thStyle}>TIMELINE</th><th style={thStyle}>ASSIGNED BY</th><th style={thStyle}>ACTION</th></tr></thead>
          <tbody>
            {assignedPrograms.length > 0 ? (
              assignedPrograms.map((pgm) => {
                const isNew = pgm.status_label === 'Build Plan';
                const isReturned = pgm.status_label === 'Returned';
                return (
                  <tr
                    key={pgm.id}
                    style={{
                      ...trStyle,
                      backgroundColor: isNew ? '#F0F9FF' : isReturned ? '#FEF2F2' : '#fff',
                      borderLeft: isNew ? '4px solid #3B82F6' : isReturned ? '4px solid #EF4444' : '4px solid transparent'
                    }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <b style={{ color: '#1E293B' }}>{pgm.name}</b>
                        {isNew && (
                          <span style={{
                            background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                            color: '#fff',
                            fontSize: '9px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 4px rgba(59,130,246,0.3)'
                          }}>
                            New Assignment
                          </span>
                        )}
                        {isReturned && (
                          <span style={{
                            background: 'linear-gradient(135deg, #EF4444, #F87171)',
                            color: '#fff',
                            fontSize: '9px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 4px rgba(239,68,68,0.3)'
                          }}>
                            Returned Plan
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', maxWidth: '400px', lineHeight: '1.4' }}>
                        {pgm.description}
                      </div>
                      {pgm.document && (
                        <div style={{ marginTop: '8px' }}>
                          <a
                            href={pgm.document}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#2563EB',
                              fontSize: '11px',
                              fontWeight: '600',
                              textDecoration: 'none',
                              backgroundColor: '#EFF6FF',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px dashed #BFDBFE',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            📁 View Reference Document
                          </a>
                        </div>
                      )}
                      {isReturned && pgm.return_note && (
                        <div style={{
                          marginTop: '8px',
                          padding: '10px',
                          background: '#FEF2F2',
                          border: '1px solid #FCA5A5',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#991B1B'
                        }}>
                          <strong>Return Note:</strong> {pgm.return_note}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>
                        {pgm.start_date} to {pgm.end_date}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#E2E8F0',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          {pgm.manager_name?.substring(0, 2).toUpperCase() || 'PG'}
                        </div>
                        <span style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>
                          {pgm.manager_name || 'Program Manager'}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {(() => {
                        if (pgm.status_label === 'Build Plan') {
                          return (
                            <button
                              onClick={() => onBuildPlan(pgm)}
                              style={{
                                ...primBtn,
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                boxShadow: '0 4px 6px -1px rgba(16,185,129,0.2)',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              Build Plan
                            </button>
                          );
                        } else if (pgm.status_label === 'Returned') {
                          return (
                            <button
                              onClick={() => onBuildPlan(pgm)}
                              style={{
                                ...primBtn,
                                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                boxShadow: '0 4px 6px -1px rgba(245,158,11,0.2)',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              Update Plan
                            </button>
                          );
                        } else {
                          return (
                            <span style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: pgm.status_label === 'Waiting' ? '#FEE2E2' : '#DCFCE7',
                              color: pgm.status_label === 'Waiting' ? '#991B1B' : '#15803D',
                              border: pgm.status_label === 'Waiting' ? '1px solid #FCA5A5' : '1px solid #BBF7D0',
                              display: 'inline-block',
                              textAlign: 'center'
                            }}>
                              {pgm.status_label.toUpperCase()}
                            </span>
                          );
                        }
                      })()}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No assigned programs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
