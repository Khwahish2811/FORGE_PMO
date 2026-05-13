import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";

const SPOCDashboard = ({ username, onLogout }) => {
  const [allPrograms, setAllPrograms] = useState([]);
  const [displayPrograms, setDisplayPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // --- TRACKER STATES ---
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [selectedProgramStats, setSelectedProgramStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/all-programs/');
      if (response.ok) {
        const data = await response.json();
        setAllPrograms(data);

        if (activeTab === 'reports') {
            setDisplayPrograms(data.filter(p => p.status?.toLowerCase() === 'approved'));
        } else {
            const filtered = data.filter(p =>
              activeTab === 'pending'
                ? p.status?.toLowerCase() === 'pending'
                : (p.status?.toLowerCase() === 'approved' || p.status?.toLowerCase() === 'rejected')
            );
            setDisplayPrograms(filtered);
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
        fetchData(true);
    }, 5000); // Auto refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAction = async (programId, newStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/update-program-status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: programId, status: newStatus })
      });
      if (response.ok) {
        alert(`Program ${newStatus} successfully!`);
        fetchData();
        window.location.reload();
      }
    } catch (err) {
      alert("Backend error!");
    }
  };

  const handleLiveTrack = async (programId) => {
    setLoadingStats(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/program-tracker/?program_id=${programId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProgramStats(data);
        setShowTrackerModal(true);
      }
    } catch (err) {
      console.error("Tracker error:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDownloadReport = () => {
    if (!selectedProgramStats) return;
    let csv = "Program Name,Project Manager,Overall Progress,Total Tasks,Completed Tasks,Team Members\n";
    csv += `"${selectedProgramStats.program_name}","${selectedProgramStats.pm_name}",${selectedProgramStats.overall_progress}%,${selectedProgramStats.total_tasks},${selectedProgramStats.completed_tasks},${selectedProgramStats.team_count}\n\n`;
    csv += "Sprint Name,Completion %\n";
    (selectedProgramStats.velocity_data || []).forEach(s => { csv += `"${s.name}",${s.completion}%\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${selectedProgramStats.program_name}_Report.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadDocument = async (docPath) => {
    if (!docPath || docPath === "null" || docPath === "undefined") {
      return alert("No document was uploaded for this program.");
    }
    const backendBase = window.location.origin.includes('3000') 
        ? window.location.origin.replace(':3000', ':8000') 
        : 'http://127.0.0.1:8000';
    let finalUrl = docPath.trim();
    if (finalUrl.startsWith('http')) {
        try {
            const url = new URL(finalUrl);
            if (url.origin === window.location.origin) {
                finalUrl = `${backendBase}${url.pathname}${url.search}`;
            }
        } catch (e) { console.error("URL parsing error:", e); }
    } else {
        let cleanPath = finalUrl;
        if (cleanPath.includes('/media/')) { cleanPath = cleanPath.split('/media/')[1]; }
        else if (cleanPath.startsWith('media/')) { cleanPath = cleanPath.replace('media/', ''); }
        if (cleanPath.startsWith('/')) { cleanPath = cleanPath.substring(1); }
        finalUrl = `${backendBase}/media/${cleanPath}`;
    }
    try {
        const response = await fetch(finalUrl);
        if (!response.ok) throw new Error("File not found");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = finalUrl.split('/').pop() || 'document';
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) { window.open(finalUrl, '_blank'); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0' }}>
      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={logoBox}>F FORGE</div>
        <div onClick={() => setActiveTab('pending')} style={activeTab === 'pending' ? activeSbItem : sbItem}>Pending Requests</div>
        <div onClick={() => setActiveTab('history')} style={activeTab === 'history' ? activeSbItem : sbItem}>Approval History</div>
        <div onClick={() => setActiveTab('reports')} style={activeTab === 'reports' ? activeSbItem : sbItem}>Live Program Tracking</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <div style={headerStyle}>
          <span style={{ fontWeight: 700 }}>Business SPOC Dashboard</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '12px' }}>Welcome, <b>{username || 'pranav_spoc'}</b></span>
            <button onClick={onLogout} style={logoutBtnStyle}>LOGOUT</button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div style={cardGrid}>
          <div onClick={() => setActiveTab('pending')} style={summCard(activeTab === 'pending')}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#D97706' }}>
              {allPrograms.filter(p => p.status?.toLowerCase() === 'pending').length}
            </div>
            <div style={cardLabel}>Pending Approvals</div>
          </div>
          <div onClick={() => setActiveTab('history')} style={summCard(activeTab === 'history')}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1B3A6B' }}>
              {allPrograms.filter(p => p.status?.toLowerCase() === 'approved').length}
            </div>
            <div style={cardLabel}>Active Programs</div>
          </div>
          <div onClick={() => setActiveTab('reports')} style={summCard(activeTab === 'reports')}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
               {allPrograms.filter(p => p.status?.toLowerCase() === 'approved').length}
            </div>
            <div style={cardLabel}>Programs to Track</div>
          </div>
        </div>

        {/* DYNAMIC TABLE SECTION */}
        <div style={{ padding: '20px' }}>
          <h3 style={sectionTitle}>
            {activeTab === 'pending' ? '📥 New Program Requests' : activeTab === 'reports' ? '🚀 Real-time Program Tracking' : '📋 Approval History'}
          </h3>

          <div style={tableContainer}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Updating list...</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr style={theadStyle}>
                    <th style={thStyle}>PROGRAM NAME</th>
                    <th style={thStyle}>MANAGER</th>
                    <th style={thStyle}>TIMELINE</th>
                    <th style={thStyle}>STATUS</th>
                    {activeTab === 'pending' ? (
                      <th style={thStyle}>ACTIONS</th>
                    ) : activeTab === 'reports' ? (
                      <th style={thStyle}>OVERVIEW</th>
                    ) : (
                      <th style={thStyle}>DOCS</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayPrograms.length > 0 ? displayPrograms.map((pgm) => (
                    <tr key={pgm.id} style={trStyle}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 'bold', color: '#1B3A6B' }}>{pgm.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{pgm.description}</div>
                      </td>
                      <td style={tdStyle}>{pgm.manager_name || 'shailja_pgm'}</td>
                      <td style={tdStyle}>{pgm.start_date} to {pgm.end_date}</td>
                      <td style={tdStyle}>
                        <span style={statusBadge(pgm.status)}>{pgm.status}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {activeTab === 'pending' ? (
                            <>
                              <button onClick={() => downloadDocument(pgm.document)} style={btnDoc}>📄 Doc</button>
                              <button onClick={() => handleAction(pgm.id, 'Approved')} style={btnApprove}>Approve</button>
                              <button onClick={() => handleAction(pgm.id, 'Rejected')} style={btnReject}>Reject</button>
                            </>
                          ) : activeTab === 'reports' ? (
                            <button onClick={() => handleLiveTrack(pgm.id)} style={{ ...btnApprove, background: '#8b5cf6' }}>
                              Track Progress 📊
                            </button>
                          ) : (
                            <button onClick={() => downloadDocument(pgm.document)} style={btnHistoryDoc}>📄 Download Doc</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>No records found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* LIVE TRACKER MODAL */}
      {showTrackerModal && selectedProgramStats && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '950px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1B3A6B' }}>Live Program Oversight: {selectedProgramStats.program_name}</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Business SPOC View • Real-time Data</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleDownloadReport} style={{ ...btnApprove, background: '#10B981', padding: '8px 15px', fontSize: '12px' }}>Download PDF Report</button>
                <button onClick={() => setShowTrackerModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
               <StatBox label="OVERALL PROGRESS" val={`${selectedProgramStats.overall_progress}%`} color="#2563EB" />
               <StatBox label="TOTAL TASKS" val={selectedProgramStats.total_tasks} color="#10B981" />
               <StatBox label="COMPLETED" val={selectedProgramStats.completed_tasks} color="#f59e0b" />
               <StatBox label="TEAM SIZE" val={selectedProgramStats.team_count} color="#6366f1" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
               <div style={chartContainer}>
                  <h4 style={chartHeader}>Execution Velocity (Sprints)</h4>
                  <ResponsiveContainer width="100%" height={250}>
                     <LineChart data={selectedProgramStats.velocity_data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="completion" stroke="#2563EB" strokeWidth={3} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
               <div style={chartContainer}>
                  <h4 style={chartHeader}>Workload Distribution</h4>
                  <ResponsiveContainer width="100%" height={250}>
                     <PieChart>
                        <Pie data={selectedProgramStats.task_distribution} innerRadius={60} outerRadius={80} dataKey="value">
                           <Cell fill="#10B981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div style={{ marginTop: '25px', padding: '20px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
               <h4 style={chartHeader}>Program Roadmap (Gantt)</h4>
               <Gantt
                  tasks={selectedProgramStats.gantt_data.map(t => ({
                    id: String(t.id),
                    name: t.name,
                    start: new Date(t.start),
                    end: new Date(t.end),
                    progress: t.progress,
                    type: 'task',
                    styles: { progressColor: '#1B3A6B', progressSelectedColor: '#2563EB' },
                  }))}
                  viewMode={ViewMode.Day}
               />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox = ({ label, val, color }) => (
  <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderTop: `4px solid ${color}` }}>
    <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '5px' }}>{label}</div>
    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1B3A6B' }}>{val}</div>
  </div>
);

// --- Styles ---
const sidebarStyle = { width: '220px', backgroundColor: '#1B3A6B', color: '#fff' };
const logoBox = { padding: '25px', fontSize: '22px', fontWeight: 'bold', borderBottom: '1px solid #2a4f8a' };
const sbItem = { padding: '15px 25px', cursor: 'pointer', fontSize: '14px', borderLeft: '4px solid transparent', transition: '0.3s' };
const activeSbItem = { ...sbItem, backgroundColor: '#2563EB', borderLeft: '4px solid #60a5fa', fontWeight: 'bold' };
const headerStyle = { height: '70px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', borderBottom: '1px solid #ddd' };
const logoutBtnStyle = { background: '#EF4444', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const cardGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', padding: '30px' };
const summCard = (active) => ({ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', border: active ? '2px solid #2563EB' : '1px solid #ddd', cursor: 'pointer', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' });
const cardLabel = { fontSize: '13px', color: '#64748B', marginTop: '8px', fontWeight: 'bold' };
const sectionTitle = { color: '#1B3A6B', marginBottom: '20px', fontSize: '16px', fontWeight: 'bold' };
const tableContainer = { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const theadStyle = { backgroundColor: '#f8fafc', borderBottom: '2px solid #edf2f7' };
const thStyle = { padding: '15px 20px', textAlign: 'left', fontSize: '12px', color: '#64748B', textTransform: 'uppercase' };
const tdStyle = { padding: '15px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
const trStyle = { transition: 'background 0.2s' };
const btnApprove = { backgroundColor: '#10B981', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const btnReject = { backgroundColor: '#EF4444', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const btnDoc = { backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' };
const btnHistoryDoc = { backgroundColor: '#E0F2FE', color: '#0369A1', border: '1px solid #7DD3FC', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' };

const statusBadge = (s) => {
  const status = s?.toLowerCase();
  let colors = { backgroundColor: '#FEF3C7', color: '#92400E' };
  if (status === 'approved') colors = { backgroundColor: '#DCFCE7', color: '#166534' };
  if (status === 'rejected') colors = { backgroundColor: '#FEE2E2', color: '#991B1B' };
  return { padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', ...colors };
};

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: '#fff', padding: '40px', borderRadius: '20px', position: 'relative' };
const chartContainer = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const chartHeader = { margin: '0 0 20px 0', fontSize: '15px', color: '#1B3A6B', fontWeight: 'bold' };

export default SPOCDashboard;
