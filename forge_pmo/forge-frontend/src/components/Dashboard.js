import React, { useEffect, useState } from 'react';
import ProgramManagement from './ProgramManagement';
import { DataProvider } from '../services/DataProvider';
import { openNotification } from '../utils/NotificationMessageMapping';

const dataProvider = new DataProvider();

// STEP 1: getStatusColor Function (Already added by you)
const getStatusColor = (endDate) => {
    if (!endDate) return '#cbd5e1';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(endDate);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '#ef4444'; // Red: Overdue
    if (diffDays <= 2) return '#f59e0b'; // Amber: Close to deadline
    return '#10b981'; // Green: On Track
};

const Dashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [stats, setStats] = useState({ programs: 0, projects: 0, tasks: 0 });

  // Example data for Step 2 testing (Web 3 project)
  const [sampleProjects, setSampleProjects] = useState([
    { id: 1, name: 'Web 3', end_date: '2026-04-24', duration: '2026-04-22 to 2026-04-24' }
  ]);

  useEffect(() => {
    if (activeTab === 'Dashboard') {
      dataProvider.getProjects()
        .then(res => {
          if (res.ok) {
            return res.json().then(data => setStats(prev => ({ ...prev, projects: data.length })));
          } else {
            return res.json().then(errorData => {
              openNotification('error', errorData['message'] || 'Failed to fetch projects');
            });
          }
        })
        .catch(err => console.error("Error fetching projects:", err));
    }
  }, [activeTab]);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#eeeee8', fontFamily: 'Arial, sans-serif' }}>

      {/* 1. SIDEBAR */}
      <div style={{ width: '220px', background: '#fff', borderRight: '1px solid #d0cec8', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', fontSize: '11px', fontWeight: 'bold', color: '#b0aea6', letterSpacing: '1.5px' }}>MAIN MENU</div>
        <nav style={{ flex: 1 }}>
          {['Dashboard', 'Programs', 'Projects', 'Sprints', 'Effort Logging', 'Reports'].map((item) => (
            <div
              key={item}
              onClick={() => setActiveTab(item)}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                color: activeTab === item ? '#1B3A6B' : '#555',
                cursor: 'pointer',
                borderBottom: '1px solid #f9f9f9',
                backgroundColor: activeTab === item ? '#f0f4ff' : 'transparent',
                borderLeft: activeTab === item ? '4px solid #1B3A6B' : '4px solid transparent',
                fontWeight: activeTab === item ? 'bold' : 'normal',
                transition: '0.2s'
              }}
            >
              {item}
            </div>
          ))}
        </nav>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Navy Title Bar */}
        <div style={{ background: '#1B3A6B', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#2563EB', color: '#fff', padding: '2px 8px', fontWeight: 'bold', borderRadius: '3px' }}>F</div>
          <span style={{ color: '#fff', fontWeight: 'bold', letterSpacing: '0.5px' }}>FORGE</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>|</span>
          <span style={{ color: '#fff', fontWeight: '300', fontSize: '14px' }}>{activeTab}</span>
        </div>

        <div style={{ padding: '25px', flex: 1, overflowY: 'auto' }}>
          {activeTab === 'Dashboard' && (
            <div>
              <h2 style={{ fontSize: '20px', color: '#1B3A6B', marginBottom: '20px' }}>Welcome, {user}</h2>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={cardStyle}><div style={cardNumStyle}>3</div><div style={cardLabelStyle}>Active Programs</div></div>
                <div style={cardStyle}><div style={cardNumStyle}>{stats.projects}</div><div style={cardLabelStyle}>Active Projects</div></div>
                <div style={cardStyle}><div style={cardNumStyle}>12</div><div style={cardLabelStyle}>Sprints This Month</div></div>
                <div style={{...cardStyle, borderLeftColor: '#f39c12'}}><div style={{...cardNumStyle, color: '#f39c12'}}>2</div><div style={cardLabelStyle}>Pending Approvals</div></div>
              </div>

              {/* STEP 2: Yahan maine placeholder hata kar actual logic daal diya hai */}
              <div style={{ background: '#fff', padding: '20px', border: '1px solid #d0cec8' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '15px', letterSpacing: '1px' }}>QUICK HEALTH TRACKER</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', fontSize: '12px', color: '#666', borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: '10px' }}>PROJECT</th>
                      <th style={{ padding: '10px' }}>DEADLINE</th>
                      <th style={{ padding: '10px' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleProjects.map(proj => (
                      <tr key={proj.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                        <td style={{ padding: '10px', fontSize: '13px' }}>{proj.name}</td>
                        <td style={{ padding: '10px', fontSize: '13px' }}>{proj.end_date}</td>
                        <td style={{ padding: '10px' }}>
                          {/* YEH HAI STEP 2 KA LOGIC */}
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            color: getStatusColor(proj.end_date),
                            backgroundColor: getStatusColor(proj.end_date) === '#ef4444' ? '#fee2e2' : '#dcfce7'
                          }}>
                            {new Date(proj.end_date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) ? '● Overdue' : '● On Track'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Programs' && <ProgramManagement />}

          {['Projects', 'Sprints', 'Effort Logging', 'Reports'].includes(activeTab) && (
            <div style={{ textAlign: 'center', marginTop: '100px', color: '#888' }}>
              <h3>{activeTab} Module</h3>
              <p>Work in progress matching Wireframes...</p>
            </div>
          )}
        </div>

        {/* Footer Band */}
        <div style={{ background: '#e4e2dc', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', borderTop: '1px solid #d0cec8' }}>
          <span>AMNS India – Internal Use Only</span>
          <div style={{ display: 'flex', gap: '15px' }}>
            <span>Status: <span style={{ color: 'green' }}>● Ready</span></span>
            <span>User: {user}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles
const cardStyle = { background: '#fff', flex: 1, padding: '18px', border: '1px solid #d0cec8', borderLeft: '5px solid #1B3A6B', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', borderRadius: '2px' };
const cardNumStyle = { fontSize: '28px', fontWeight: 'bold', color: '#1B3A6B' };
const cardLabelStyle = { fontSize: '11px', color: '#888', textTransform: 'uppercase', marginTop: '8px', fontWeight: 'bold' };

export default Dashboard;