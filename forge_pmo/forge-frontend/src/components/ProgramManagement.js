import React, { useEffect, useState } from 'react';

const ProgramManagement = () => {
  const [programs, setPrograms] = useState([]);
  const [expandedProgram, setExpandedProgram] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/programs/')
      .then(res => res.json())
      .then(data => setPrograms(data))
      .catch(err => console.error("Error fetching programs:", err));
  }, []);

  return (
    <div>
      {/* ... Filters wala code same rahega ... */}

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #d0cec8' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '1px solid #d0cec8' }}>
            <th style={thStyle}>PROGRAM NAME</th>
            <th style={thStyle}>STATUS</th>
            <th style={thStyle}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {programs.map(pgm => (
            <React.Fragment key={pgm.id}>
              {/* Main Row */}
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td
                  style={{ ...tdStyle, color: '#2563EB', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => setExpandedProgram(expandedProgram === pgm.id ? null : pgm.id)}
                >
                  {pgm.name} {expandedProgram === pgm.id ? '▴' : '▾'}
                </td>
                <td style={tdStyle}>{pgm.status}</td>
                <td style={tdStyle}>
                   <button style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>
                     + Create Task
                   </button>
                </td>
              </tr>

              {/* YAHAN DALNA HAI REVIEW MODAL WALA LOGIC */}
              {expandedProgram === pgm.id && (
                <tr>
                  <td colSpan="3" style={{ padding: '20px', background: '#f8fafc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                      {/* Project Team Section */}
                      <div style={boxStyle}>
                        <div style={boxTitle}>👥 Project Team</div>
                        {/* Team members render here */}
                      </div>

                      {/* Sprint Timeline Section - Sahi Logic Idhar Hai */}
                      <div style={boxStyle}>
                        <div style={boxTitle}>📅 Sprint Timeline</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ textAlign: 'left', fontSize: '11px', color: '#666' }}>
                              <th style={{ padding: '8px' }}>Sprint</th>
                              <th style={{ padding: '8px' }}>Duration</th>
                              <th style={{ padding: '8px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pgm.sprints && pgm.sprints.map((s, idx) => {

                              // REVIEW MODAL WALA LOGIC START
                              const today = new Date();
                              today.setHours(0,0,0,0); // Aaj 29 April hai

                              // Duration string se End Date nikalo (Ex: "2026-04-22 to 2026-04-24")
                              const durationString = s.duration || "";
                              const endDateStr = s.end_date || durationString.split(' to ')[1];
                              const deadline = new Date(endDateStr);
                              deadline.setHours(0,0,0,0);

                              // Comparison (24 April < 29 April)
                              const isOverdue = deadline.getTime() < today.getTime();
                              // REVIEW MODAL WALA LOGIC END

                              return (
                                <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px', fontSize: '12px' }}>{s.name}</td>
                                  <td style={{ padding: '8px', fontSize: '12px' }}>{s.duration}</td>
                                  <td style={{ padding: '8px' }}>
                                    {/* Yahan wahi Review Modal ki tarah UI aayega */}
                                    <span style={{
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      backgroundColor: isOverdue ? '#fee2e2' : '#dcfce7',
                                      color: isOverdue ? '#ef4444' : '#10b981'
                                    }}>
                                      {isOverdue ? '● Overdue' : '● On Track'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Styles
const thStyle = { padding: '12px', fontSize: '11px', color: '#666' };
const tdStyle = { padding: '12px', fontSize: '13px' };
const boxStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' };
const boxTitle = { fontSize: '12px', fontWeight: 'bold', color: '#1B3A6B', marginBottom: '10px' };

export default ProgramManagement;