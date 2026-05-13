import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';

import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";

// Helper function for health status colors
const getStatusColor = (endDate) => {
    if (!endDate) return '#cbd5e1';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(endDate);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '#ef4444'; // Red (Overdue)
    if (diffDays <= 2) return '#f59e0b'; // Amber (Urgent)
    return '#10b981'; // Green (On Track)
};

const PGMDashboard = ({ username, onLogout }) => {
  // --- EXISTING STATES (Preserved) ---
  const [showModal, setShowModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [pmList, setPmList] = useState([]);
  const [pendingProjects, setPendingProjects] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedPMs, setSelectedPMs] = useState({});
  const [formData, setFormData] = useState({ name: '', description: '', start_date: '', end_date: '' });

  // --- NEW STATES FOR NAVIGATION & TRACKING ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [selectedProgramStats, setSelectedProgramStats] = useState(null);

  // --- 1. Fetch Data ---
  const fetchData = useCallback(async () => {
    try {
      const progRes = await fetch('http://127.0.0.1:8000/api/get-all-programs/');
      if (progRes.ok) setPrograms(await progRes.json());

      const pmRes = await fetch('http://127.0.0.1:8000/api/get-project-managers/');
      if (pmRes.ok) setPmList(await pmRes.json());

      const pendingRes = await fetch('http://127.0.0.1:8000/api/get-pending-projects/');
      if (pendingRes.ok) {
          const data = await pendingRes.json();
          setPendingProjects(data);
      }
    } catch (err) {
      console.error("Fetch fail:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
        fetchData();
    }, 5000); // Auto refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // --- 2. Action Handlers (Original Functions Preserved) ---
  const handleAssignPM = async (programId) => {
    const pmId = selectedPMs[programId];
    if (!pmId) return alert("Select a PM first!");
    try {
      const res = await fetch('http://127.0.0.1:8000/api/assign-pm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: programId, pm_id: pmId, manager_name: username })
      });
      if (res.ok) { 
        alert("PM Assigned!"); 
        fetchData(); 
        window.location.reload(); 
      }
    } catch (err) { alert("Error!"); }
  };

  const handleReviewAction = async (projectId, decision) => {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/approve-project-plan/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: projectId, decision: decision })
        });
        if (response.ok) {
            alert(`Project ${decision === 'approve' ? 'Approved' : 'Rejected'}!`);
            setShowReviewModal(false);
            fetchData();
            window.location.reload();
        } else {
            const errorData = await response.json();
            alert("Error: " + (errorData.error || "Action failed"));
        }
    } catch (err) { alert("Failed to connect to the server."); }
  };

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('start_date', formData.start_date);
    data.append('end_date', formData.end_date);
    if (formData.document) { data.append('document', formData.document); }

    try {
      const res = await fetch('http://127.0.0.1:8000/api/create-program/', {
        method: 'POST',
        body: data
      });
      if (res.ok) {
        alert("Program created!");
        setShowModal(false);
        setFormData({ name: '', description: '', start_date: '', end_date: '', document: null });
        fetchData();
        window.location.reload();
      }
    } catch (err) { alert("Error connecting to server!"); }
  };

  const handleDecision = async (projectId, decision) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/approve-project-plan/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          decision: decision
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowReviewModal(false);
        fetchData();
        window.location.reload();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Action failed!");
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
      } else {
        alert("Tracker data not available.");
      }
    } catch (err) {
      alert("Error fetching tracker data.");
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
    csv += "\nRecent Activity Log\n";
    csv += "User,Sprint,Task,Due Date,Status\n";
    (selectedProgramStats.recent_logs || []).forEach(log => { csv += `"${log.user}","${log.sprint}","${log.task_name}","${log.due_date}","${log.status}"\n`; });
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7fa', fontFamily: 'Segoe UI' }}>

      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={logoBox}>F FORGE</div>
        <div style={sbSecTitle}>Navigation</div>
        <div
            onClick={() => setActiveTab('dashboard')}
            style={{ ...sbItem, backgroundColor: activeTab === 'dashboard' ? '#2563EB' : 'transparent', color: '#fff', fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal' }}
        >
            📊 Dashboard
        </div>
        <div
            onClick={() => setActiveTab('working')}
            style={{ ...sbItem, backgroundColor: activeTab === 'working' ? '#2563EB' : 'transparent', color: '#fff', fontWeight: activeTab === 'working' ? 'bold' : 'normal' }}
        >
            💼 Working Programs
        </div>
        <div style={sbItem}>📈 Resource Tracker</div>
        <div style={sbItem}>⚙️ Settings</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <div style={headerStyle}>
          <span style={{ fontWeight: 700, color: '#1B3A6B' }}>
              {activeTab === 'dashboard' ? 'Program Manager Dashboard' : 'Working Programs Control'}
          </span>
          <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <span style={{ fontSize: '12px' }}>Welcome, <b>{username}</b></span>
            <div style={userCircle}>{username?.charAt(0).toUpperCase() || 'U'}</div>
            <button onClick={onLogout} style={logoutBtnStyle}>LOGOUT</button>
          </div>
        </div>

        {/* --- DYNAMIC CONTENT --- */}
        {activeTab === 'dashboard' ? (
          <>
            <div style={cardGrid}>
              <SummaryCard num={programs.length} label="Total Programs" />
              <SummaryCard num={pendingProjects.length} label="Pending Approvals" isAmber={pendingProjects.length > 0} />
              <SummaryCard num={programs.filter(p => p.status === 'Approved').length} label="Active Programs" />
              <SummaryCard num="94%" label="Resource Health" />
            </div>

            <div style={{ padding: '0 25px 25px' }}>
              {/* 1. ACTION REQUIRED */}
              <div style={{ marginBottom: '35px' }}>
                <div style={alertHeader}>
                  <h3 style={{...sectionTitle, color: '#92400e'}}>⚠️ Action Required: Project Approvals</h3>
                  <span style={{fontWeight:'bold'}}>{pendingProjects.length} Pending</span>
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
                              <span style={{fontWeight:700, color:'#1B3A6B'}}>{proj.name}</span><br/>
                              <small style={{color:'#666'}}>Program: {proj.program_name}</small>
                            </td>
                            <td style={tdStyle}>{proj.created_by_name || proj.pm_name}</td>
                            <td style={tdStyle}>{proj.start_date} to {proj.end_date}</td>
                            <td style={tdStyle}>
                              <button onClick={() => { setSelectedReview(proj); setShowReviewModal(true); }} style={reviewBtn}>
                                Review Plan
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" style={{...tdStyle, textAlign:'center'}}>No pending approvals found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. ACTIVE PROGRAMS LIST */}
              <div style={{ marginBottom: '35px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={sectionTitle}>All Programs Overview</h3>
                    <button onClick={() => setShowModal(true)} style={primBtn}>+ Create New Program</button>
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
                            {pgm.status === 'Approved' ? (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <select style={miniSelect} onChange={(e) => setSelectedPMs({ ...selectedPMs, [pgm.id]: e.target.value })}>
                                  <option value="">Select PM</option>
                                  {pmList.map(pm => <option key={pm.id} value={pm.id}>{pm.username}</option>)}
                                </select>
                                <button onClick={() => handleAssignPM(pgm.id)} style={assignBtn}>Update</button>
                              </div>
                            ) : <span style={{fontSize:'11px', fontStyle:'italic'}}>Waiting Approval</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* WORKING PROGRAMS TAB */
          <div style={{ padding: '25px' }}>
             <h3 style={{...sectionTitle, marginBottom: '20px', fontSize: '18px' }}>🚀 Programs Currently in Execution</h3>
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
                    {programs.filter(p => p.status === 'Approved' && p.project_manager_assigned_name).length > 0 ? (
                      programs
                        .filter(p => p.status === 'Approved' && p.project_manager_assigned_name)
                        .map(pgm => (
                        <tr key={pgm.id} style={trStyle}>
                          <td style={tdStyle}>
                            <div style={{fontWeight:'700', color:'#1e293b'}}>{pgm.name}</div>
                            <div style={{fontSize:'11px', color:'#64748b'}}>{pgm.start_date} to {pgm.end_date}</div>
                          </td>
                          <td style={tdStyle}>
                             <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                               <div style={{...userCircle, width:'25px', height:'25px', fontSize:'10px'}}>{pgm.project_manager_assigned_name.charAt(0)}</div>
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
                              style={{...primBtn, padding:'8px 15px', fontSize:'12px', display:'flex', alignItems:'center', gap:'5px'}}
                            >
                              {loadingStats ? 'Loading...' : 'Live Track 📈'}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" style={{...tdStyle, textAlign:'center'}}>No active working programs to track.</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {/* NEW MODAL: Real-time Live Tracking Charts */}
      {showTrackerModal && selectedProgramStats && (
        <div style={modalOverlay}>
           <div style={{...modalBox, width:'900px', maxHeight:'90vh', overflowY:'auto'}}>
              <div style={{display:'flex', justifyContent:'space-between', borderBottom:'2px solid #f1f5f9', paddingBottom:'15px', marginBottom:'20px'}}>
                 <div>
                    <h2 style={{margin:0, color:'#1B3A6B'}}>Live Tracker: {selectedProgramStats.program_name}</h2>
                    <p style={{margin:0, fontSize:'12px', color:'#64748b'}}>Tracking real-time execution for Manager: <b>{selectedProgramStats.pm_name}</b></p>
                 </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                      onClick={handleDownloadReport} 
                      style={{ ...primBtn, background: '#10b981', border: 'none', padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}
                    >
                      📥 Download Report
                    </button>
                    <button onClick={() => setShowTrackerModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                  </div>
              </div>

              {/* Real-time Summary Cards */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'15px', marginBottom:'25px'}}>
                 <div style={liveStatCard('#2563EB')}>
                    <div style={liveStatLabel}>OVERALL COMPLETION</div>
                    <div style={liveStatValue}>{selectedProgramStats.overall_progress}%</div>
                 </div>
                 <div style={liveStatCard('#10B981')}>
                    <div style={liveStatLabel}>TOTAL TASKS</div>
                    <div style={liveStatValue}>{selectedProgramStats.total_tasks}</div>
                 </div>
                 <div style={liveStatCard('#f59e0b')}>
                    <div style={liveStatLabel}>COMPLETED</div>
                    <div style={liveStatValue}>{selectedProgramStats.completed_tasks}</div>
                 </div>
                 <div style={liveStatCard('#6366f1')}>
                    <div style={liveStatLabel}>TEAM MEMBERS</div>
                    <div style={liveStatValue}>{selectedProgramStats.team_count}</div>
                 </div>
              </div>

              {/* Data Visualization Charts */}
              <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:'20px'}}>
                 <div style={chartContainer}>
                    <h4 style={chartHeader}>Sprint Progress Velocity</h4>
                    <ResponsiveContainer width="100%" height={250}>
                       <LineChart data={selectedProgramStats.velocity_data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{fontSize:10}} />
                          <YAxis tick={{fontSize:10}} />
                          <Tooltip />
                          <Line type="monotone" dataKey="completion" stroke="#2563EB" strokeWidth={3} dot={{r:6}} />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
                 <div style={chartContainer}>
                    <h4 style={chartHeader}>Task Distribution</h4>
                    <ResponsiveContainer width="100%" height={250}>
                       <PieChart>
                          <Pie
                            data={selectedProgramStats.task_distribution}
                            innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                          >
                             <Cell fill="#10B981" /> {/* Done */}
                             <Cell fill="#f59e0b" /> {/* Doing */}
                             <Cell fill="#ef4444" /> {/* Todo */}
                          </Pie>
                          <Tooltip />
                       </PieChart>
                    </ResponsiveContainer>
                    <div style={legendContainer}>
                       <span><i style={{background:'#10B981'}}></i> Done</span>
                       <span><i style={{background:'#f59e0b'}}></i> Doing</span>
                       <span><i style={{background:'#ef4444'}}></i> Todo</span>
                    </div>
                 </div>
              </div>
                {/* --- Gran Tracker Section Start --- */}
<div style={{ width: '100%', marginTop: '25px', padding: '20px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
    <h5 style={{ marginBottom: '15px', fontWeight: 'bold', color: '#1e293b' }}>📊 Program Gran Tracker</h5>

   {selectedProgramStats?.gantt_data?.length > 0 ? (
    <div style={{ width: '100%', overflowX: 'auto', background: '#fff' }}>
        <Gantt
            tasks={selectedProgramStats.gantt_data.map(t => ({
                id: String(t.id),
                name: t.name || "Task",
                start: new Date(t.start || new Date()),
                end: new Date(t.end || new Date(new Date().getTime() + 86400000)),
                progress: t.progress || 0,
                type: 'task',
                styles: { progressColor: '#1e293b', progressSelectedColor: '#3b82f6' },
            }))}
            viewMode={ViewMode.Day}
            listCellWidth="150px"
            columnWidth={60}
        />
    </div>
) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
            <p>No timeline data available for this program.</p>
        </div>
    )}
</div>              <div style={{marginTop:'25px', padding:'15px', background:'#f8fafc', borderRadius:'10px', border:'1px solid #e2e8f0'}}>
    <h4 style={{marginTop:0, fontSize:'13px', color:'#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px'}}>
        Recent Team Activity Log
    </h4>
    <div style={{maxHeight:'200px', overflowY:'auto'}}>
        {selectedProgramStats.recent_logs && selectedProgramStats.recent_logs.length > 0 ? (
            selectedProgramStats.recent_logs.map((log, i) => (
                <div key={i} style={{
                    padding: '10px 0',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div style={{ fontSize: '12px' }}>
                        <strong style={{ color: '#2563EB' }}>{log.user}</strong>
                        <span style={{ color: '#64748b' }}> in </span>
                        <strong style={{ color: '#1e293b' }}>{log.sprint || 'N/A'}</strong>
                        <div style={{ marginTop: '4px', color: '#475569' }}>
                            <b>Task:</b> {log.task_name || 'Unnamed Task'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ef4444' }}>
                           Due: {log.due_date || 'No Date'}
                        </div>
                        <div style={{
                            fontSize: '10px',
                            marginTop: '4px',
                            background: '#dcfce7',
                            color: '#166534',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            display: 'inline-block'
                        }}>
                            {log.status || 'In Progress'}
                        </div>
                    </div>
                </div>
            ))
        ) : (
            <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94a3b8' }}>
                No activity logs available for this program.
            </div>
        )}
    </div>
</div>
           </div>
        </div>
      )}

      {/* MODAL: Review Plan (Original Code - Preserved) */}
      {showReviewModal && selectedReview && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#1B3A6B', borderBottom:'2px solid #2563EB', paddingBottom:'10px' }}>Project Plan Review</h2>
            <div style={reviewGrid}>
              <div><label style={lbl}>Project Name</label><div style={valText}>{selectedReview.project_name || selectedReview.name}</div></div>
              <div><label style={lbl}>Submitted By</label><div style={valText}>{selectedReview.pm_name || selectedReview.created_by_name}</div></div>
            </div>
            <label style={lbl}>Description</label>
            <div style={valText}>{selectedReview.description || 'No description provided'}</div>
            <h4 style={{marginTop:'20px'}}>👥 Team & Resource Allocation</h4>
            <div style={miniTableContainer}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={miniTh}>User</th><th style={miniTh}>Role</th><th style={miniTh}>FTE</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReview.team_members && selectedReview.team_members.length > 0 ? (
                    selectedReview.team_members.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #edf2f7' }}>
                        <td style={tdStyle}>{m.username}</td><td style={tdStyle}>{m.role}</td><td style={tdStyle}>{m.fte}</td>
                      </tr>
                    ))
                  ) : (<tr><td colSpan="3" style={{...tdStyle, textAlign:'center'}}>No members found</td></tr>)}
                </tbody>
              </table>
            </div>
            <h4 style={{ marginTop: '20px' }}>📅 Proposed Sprints</h4>
            <div style={miniTableContainer}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={miniTh}>Sprint Name</th><th style={miniTh}>Timeline</th><th style={miniTh}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReview.sprints && selectedReview.sprints.length > 0 ? (
                    selectedReview.sprints.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #edf2f7' }}>
                        <td style={tdStyle}>{s.name}</td><td style={tdStyle}>{s.start_date} to {s.end_date}</td>
                        <td style={tdStyle}>
                           <span style={{ height: '10px', width: '10px', borderRadius: '50%', backgroundColor: getStatusColor(s.end_date), display: 'inline-block', marginRight:'5px' }}></span>
                           <span style={{fontSize:'11px', color: getStatusColor(s.end_date)}}>{new Date(s.end_date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) ? 'Overdue' : 'On Track'}</span>
                        </td>
                      </tr>
                    ))
                  ) : (<tr><td colSpan="3" style={{...tdStyle, textAlign:'center'}}>No sprints found</td></tr>)}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
    <button onClick={() => setShowReviewModal(false)} style={secBtn}>Back</button>

    {/* Approve button: Ye status ko 'Approved' kar dega */}
    <button
  onClick={() => handleDecision(selectedReview.id, 'approve')}
  style={{ ...primBtn, backgroundColor: '#10b981' }}
>
  Approve
</button>

{/* Reject button - Line 555 */}
<button
  onClick={() => handleDecision(selectedReview.id, 'reject')}
  style={{ ...primBtn, backgroundColor: '#ef4444' }}
>
  Reject
</button>
</div>
          </div>
        </div>
      )}

      {/* MODAL: New Program Creation (Original Code - Preserved) */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ color: '#1B3A6B' }}>Initiate New Program</h3>
            <form onSubmit={handleCreateProgram}>
              <label style={lbl}>Title</label>
              <input style={inp} required onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                <div><label style={lbl}>Start Date</label><input style={inp} type="date" required onChange={(e) => setFormData({...formData, start_date: e.target.value})} /></div>
                <div><label style={lbl}>End Date</label><input style={inp} type="date" required onChange={(e) => setFormData({...formData, end_date: e.target.value})} /></div>
              </div>
              <label style={lbl}>Description</label>
              <textarea style={{...inp, height:'80px'}} placeholder="Program details..." onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
              <label style={lbl}>Reference Document</label>
              <input type="file" style={inp} onChange={(e) => setFormData({...formData, document: e.target.files[0]})}/>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={secBtn}>Cancel</button>
                <button type="submit" style={primBtn}>Create Program</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- ADDITIONAL STYLES FOR TRACKER ---
const liveStatCard = (color) => ({ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderTop: `4px solid ${color}` });
const liveStatLabel = { fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '5px' };
const liveStatValue = { fontSize: '24px', fontWeight: '800', color: '#1B3A6B' };
const chartContainer = { background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' };
const chartHeader = { margin: '0 0 15px 0', fontSize: '13px', color: '#1e293b' };
const legendContainer = { display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '11px', marginTop: '10px' };
const logItem = { fontSize: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9', color: '#475569' };

// --- STYLES (Preserved) ---
const sidebarStyle = { width: '220px', backgroundColor: '#1B3A6B', color: '#fff' };
const logoBox = { padding: '25px', color: '#fff', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #2a4f8a' };
const sbSecTitle = { fontSize: '10px', color: '#8ab0d8', textTransform: 'uppercase', padding: '25px 20px 8px' };
const sbItem = { padding: '12px 20px', color: '#ccdaee', cursor: 'pointer', fontSize: '13px', transition: '0.3s' };
const headerStyle = { height: '65px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 25px' };
const userCircle = { width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' };
const cardGrid = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', padding: '25px' };
const summCard = { background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' };
const sectionTitle = { margin: 0, color: '#1B3A6B', fontSize: '14px', fontWeight: '800' };
const alertHeader = { display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fffbeb', padding:'12px 20px', borderRadius:'8px 8px 0 0', border:'1px solid #fef3c7' };
const tableContainer = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0 0 8px 8px', overflow: 'hidden' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const theadStyle = { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' };
const thStyle = { padding: '15px', textAlign: 'left', color: '#64748B', fontSize: '11px', fontWeight: '700' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' };
const trStyle = { transition: '0.2s hover' };
const primBtn = { background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' };
const reviewBtn = { background: '#1B3A6B', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const secBtn = { background: '#f1f5f9', color:'#475569', border: '1px solid #e2e8f0', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer' };
const assignBtn = { background: '#10B981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' };
const miniSelect = { padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize:'12px' };
const modalOverlay = { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(15, 23, 42, 0.7)', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 1000 };
const modalBox = { background: '#fff', padding: '35px', borderRadius: '15px', width: '500px' };
const lbl = { display: 'block', fontSize: '11px', fontWeight: '800', marginBottom: '6px', color:'#64748B' };
const inp = { width: '100%', padding: '12px', marginBottom: '18px', border: '1px solid #e2e8f0', borderRadius: '6px' };
const valText = { background:'#f8fafc', padding:'10px', borderRadius:'6px', border:'1px solid #eff6ff', marginBottom:'15px', fontSize:'14px' };
const reviewGrid = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' };
const miniTableContainer = { border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', marginTop:'10px' };
const miniTh = { padding:'10px', textAlign:'left', fontSize:'10px', color:'#64748B' };
const logoutBtnStyle = { padding: '5px 10px', fontSize: '11px', cursor: 'pointer', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px' };

const SummaryCard = ({ num, label, isAmber }) => (
    <div style={summCard}>
      <div style={{ fontSize: '24px', fontWeight: '800', color: isAmber ? '#d97706' : '#1B3A6B' }}>{num}</div>
      <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase' }}>{label}</div>
    </div>
);

const statusBadge = (s) => ({
    fontSize: '10px', padding: '4px 12px', borderRadius: '20px', fontWeight: '800',
    background: s === 'Approved' ? '#dcfce7' : s === 'Rejected' ? '#fee2e2' : '#fef3c7',
    color: s === 'Approved' ? '#166534' : s === 'Rejected' ? '#991b1b' : '#92400e',
});

export default PGMDashboard;