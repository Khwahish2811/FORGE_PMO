import React, { useState } from 'react';

// Styling
const sectionTitle = { fontSize: '20px', fontWeight: '800', color: '#1B3A6B', marginBottom: '20px', textAlign: 'left' };
const tableContainer = { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const theadStyle = { background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' };
const thStyle = { padding: '14px 20px', fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' };
const trStyle = { borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.2s' };
const tdStyle = { padding: '14px 20px', fontSize: '13px', color: '#334155', verticalAlign: 'middle' };
const primBtn = { background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' };

const PerformanceDashboard = ({ teamPerformance = [] }) => {
  const [selectedMemberDetail, setSelectedMemberDetail] = useState(null);

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={sectionTitle}>Team Performance Leaderboard</h3>
      
      {/* Top Performers Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {teamPerformance.slice(0, 3).map((member, idx) => (
          <div key={idx} style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '20px', borderRadius: '15px', color: '#fff', position: 'relative', overflow: 'hidden', textAlign: 'left' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: '0.1' }}>🏆</div>
            <div style={{ fontSize: '11px', fontWeight: '800', opacity: '0.8', textTransform: 'uppercase' }}>Rank #{idx + 1} Performer</div>
            <h3 style={{ margin: '10px 0 5px 0', fontSize: '18px' }}>{member.full_name}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
               <div>
                  <div style={{ fontSize: '10px', opacity: '0.8' }}>SCORE</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{member.performance_score}</div>
               </div>
               <div>
                  <div style={{ fontSize: '10px', opacity: '0.8' }}>COMPLETION</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{member.completion_rate}%</div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div style={tableContainer}>
        <table style={tableStyle}>
          <thead style={theadStyle}>
             <tr>
                <th style={thStyle}>TEAM MEMBER</th>
                <th style={thStyle}>PROJECTS</th>
                <th style={thStyle}>TOTAL FTE</th>
                <th style={thStyle}>TASK RATIO</th>
                <th style={thStyle}>SCORE</th>
                <th style={thStyle}>ACTION</th>
             </tr>
          </thead>
          <tbody>
             {teamPerformance.map((member, i) => (
               <tr key={i} style={trStyle}>
                  <td style={tdStyle}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#F1F5F9', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                           <div style={{ fontWeight: 'bold', color: '#1B3A6B' }}>{member.username}</div>
                           <div style={{ fontSize: '11px', color: '#64748B' }}>{member.full_name}</div>
                        </div>
                     </div>
                  </td>
                  <td style={tdStyle}>{member.total_projects}</td>
                  <td style={tdStyle}>
                     <span style={{ color: member.total_fte > 1.5 ? '#EF4444' : '#10B981', fontWeight: 'bold' }}>
                       {member.total_fte.toFixed(1)}
                     </span>
                  </td>
                  <td style={tdStyle}>
                     <div style={{ fontSize: '12px', textAlign: 'left' }}>{member.completed_tasks}/{member.total_tasks} Tasks</div>
                     <div style={{ width: '100px', height: '4px', background: '#F1F5F9', borderRadius: '2px', marginTop: '4px' }}>
                        <div style={{ width: `${member.completion_rate}%`, height: '100%', background: member.completion_rate > 80 ? '#10B981' : '#F59E0B', borderRadius: '2px' }}></div>
                     </div>
                  </td>
                  <td style={tdStyle}>
                     <span style={{ background: '#EEF2FF', color: '#4F46E5', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                        {member.performance_score}
                     </span>
                  </td>
                  <td style={tdStyle}>
                     <button onClick={() => setSelectedMemberDetail(member)} style={{ ...primBtn, padding: '6px 12px', fontSize: '11px' }}>
                       View Details
                     </button>
                  </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedMemberDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', width: '600px', borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: '#1B3A6B' }}>Member Performance: {selectedMemberDetail.username}</h2>
                    <button onClick={() => setSelectedMemberDetail(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                   <div style={{ background: '#F8FAF6', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'left' }}>
                      <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>Efficiency</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10B981' }}>{selectedMemberDetail.completion_rate}%</div>
                   </div>
                   <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'left' }}>
                      <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>Projects</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3B82F6' }}>{selectedMemberDetail.total_projects}</div>
                   </div>
                   <div style={{ background: '#FFF7ED', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'left' }}>
                      <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>Workload (FTE)</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#F59E0B' }}>{selectedMemberDetail.total_fte.toFixed(1)}</div>
                   </div>
                </div>

                <h4 style={{ fontSize: '14px', color: '#1B3A6B', marginBottom: '15px', textAlign: 'left' }}>Recent Task Execution</h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #F1F5F9', borderRadius: '12px' }}>
                   {selectedMemberDetail.recent_tasks.length > 0 ? (
                     selectedMemberDetail.recent_tasks.map((t, idx) => (
                       <div key={idx} style={{ padding: '15px', borderBottom: idx !== selectedMemberDetail.recent_tasks.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ textAlign: 'left' }}>
                             <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{t.title}</div>
                             <div style={{ fontSize: '11px', color: '#64748B' }}>{t.project} • Due: {t.due_date}</div>
                          </div>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '12px', 
                            fontSize: '10px', 
                            fontWeight: 'bold',
                            background: t.status === 'Done' ? '#DCFCE7' : '#FEF3C7',
                            color: t.status === 'Done' ? '#166534' : '#92400E'
                          }}>{t.status}</span>
                       </div>
                     ))
                   ) : <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No recent tasks found.</div>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
