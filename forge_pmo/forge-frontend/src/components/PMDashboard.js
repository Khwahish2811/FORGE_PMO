import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { Chart } from "react-google-charts";

// 1. Helper function for health status colors
const getStatusColor = (endDate) => {
    if (!endDate) return '#cbd5e1';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(endDate);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '#ef4444';
    if (diffDays === 0) return '#f59e0b';
    if (diffDays <= 2) return '#f59e0b';
    return '#10b981';
};

const PMDashboard = ({ username, onLogout }) => {
  const [assignedPrograms, setAssignedPrograms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [myProjects, setMyProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('assignments');
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [workingPrograms, setWorkingPrograms] = useState([]);

  // --- TRACKER STATE ---
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [selectedProgramStats, setSelectedProgramStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // --- CREATE TASK STATE ---
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeProjectForTask, setActiveProjectForTask] = useState(null);
  const [taskData, setTaskData] = useState({
    title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: ''
  });

  // PROJECT FORM STATE
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    priority: 'Medium',
    team: [{ userId: '', fte: 1.0, role: 'Dev' }],
    sprints: [{ name: 'Sprint 1', start_date: '', end_date: '' }],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const progRes = await fetch(`http://127.0.0.1:8000/api/my-assigned-programs/?username=${username || 'rahul_pm'}`);
      if (progRes.ok) {
        const data = await progRes.json();
        setAssignedPrograms(data);
      }
      const empRes = await fetch('http://127.0.0.1:8000/api/get-team-members/');
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data);
      }
      const projRes = await fetch(`http://127.0.0.1:8000/api/get-active-projects/?username=${username}`);
      if (projRes.ok) {
        const data = await projRes.json();
        setMyProjects(data);
      }
      const workingRes = await fetch(`http://127.0.0.1:8000/api/get-working-programs/?username=${username}`);
      if (workingRes.ok) {
        const data = await workingRes.json();
        setWorkingPrograms(data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [username]);

  // --- ADD THIS NEW FUNCTION HERE ---
  const [stats, setStats] = useState({
    active_tasks: 0,
    due_this_week: 0,
    hours_today: 0,
    fte_score: 0,
    total_assigned: 0,   // Naya
    pending_plans: 0,    // Naya
    avg_completion: 0
  });

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/pm-dashboard-stats/?username=${username}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }, [username]);
  // -----------------------------------

  const industryHeader = {
    display: 'flex',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0', // Thoda light border
    padding: '20px 0',
    marginBottom: '20px',
    width: '100%',
    justifyContent: 'space-around' // Items ko barabar distribute karne ke liye
};

const industryStatItem = {
    flex: 1,
    padding: '0 40px', // Side padding badha di
    borderRight: '1px solid #f1f5f9', // Divider lines
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
};

// Last item se border hatane ke liye is style ka use karein
const lastStatItem = {
    ...industryStatItem,
    borderRight: 'none'
};

  useEffect(() => {
    fetchData();
    fetchDashboardStats();
  }, [fetchData, fetchDashboardStats]);

  const toggleRow = (id) => {
    setExpandedProjectId(expandedProjectId === id ? null : id);
  };

  const handleBuildPlan = (pgm) => {
    setSelectedProgram(pgm);
    setShowProjectForm(true);
  };

  const handleLiveTrack = async (pgmId) => {
    setLoadingStats(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/program-tracker/?program_id=${pgmId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProgramStats(data);
        setShowTrackerModal(true);
      }
    } catch (err) {
      alert("Error fetching tracker data.");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCreateTask = async (e) => {
    if (e) e.preventDefault();
    if (!taskData.title || !taskData.assigned_to || !taskData.sprint_id) {
        alert("Please fill all required fields!");
        return;
    }
    try {
      const response = await fetch('http://127.0.0.1:8000/api/create-task/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: taskData.title,
            assigned_to: taskData.assigned_to,
            sprint_id: taskData.sprint_id,
            due_date: taskData.due_date,
            project_id: activeProjectForTask?.id,
            priority: taskData.priority || 'Medium',
            description: taskData.description || ''
        })
      });
      if (response.ok) {
        alert("✅ Success! Task Created.");
        setShowTaskModal(false);
        setTaskData({ title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' });
        fetchData();
      }
    } catch (err) { alert("❌ Connection failed."); }
  };






  const addMemberRow = () => setProjectData({ ...projectData, team: [...projectData.team, { userId: '', fte: 1.0, role: 'Dev' }] });
  const removeMemberRow = (index) => setProjectData({ ...projectData, team: projectData.team.filter((_, i) => i !== index) });
  const addSprintRow = () => {
    const nextSprintNum = projectData.sprints.length + 1;
    setProjectData({ ...projectData, sprints: [...projectData.sprints, { name: `Sprint ${nextSprintNum}`, start_date: '', end_date: '' }] });
  };
  const handleInputChange = (field, value) => setProjectData({ ...projectData, [field]: value });
  const handleMemberChange = (index, field, value) => {
    const newTeam = [...projectData.team];
    newTeam[index][field] = field === 'userId' ? (value ? Number(value) : '') : value;
    setProjectData({ ...projectData, team: newTeam });
  };
  const handleSprintChange = (index, field, value) => {
    const updatedSprints = [...projectData.sprints];
    updatedSprints[index][field] = value;
    setProjectData({ ...projectData, sprints: updatedSprints });
  };

  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    const formattedTeam = projectData.team.map(m => ({ userId: m.userId, role: m.role, fte: m.fte }));
    const payload = { ...projectData, team: formattedTeam, program_id: selectedProgram?.id, pm_username: username };
    try {
      const response = await fetch('http://127.0.0.1:8000/api/create-project-plan/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert("Success! Project plan submitted.");
        setShowProjectForm(false);
        setProjectData({ name: '', description: '', start_date: '', end_date: '', priority: 'Medium', team: [{ userId: '', fte: 1.0, role: 'Dev' }], sprints: [{ name: 'Sprint 1', start_date: '', end_date: '' }] });
        fetchData();
      }
    } catch (err) { alert("Connection failed."); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={logoBox}>F FORGE</div>
        <div style={sbSecTitle}>Navigation</div>
        <div style={{ ...sbItem, backgroundColor: activeTab === 'assignments' ? '#2563EB' : 'transparent', color: '#fff' }} onClick={() => { setActiveTab('assignments'); setShowProjectForm(false); }}>My Assignments</div>
        <div style={{ ...sbItem, backgroundColor: activeTab === 'execution' ? '#2563EB' : 'transparent', color: '#fff' }} onClick={() => { setActiveTab('execution'); setShowProjectForm(false); }}>Project Execution</div>
        <div style={{ ...sbItem, backgroundColor: activeTab === 'working_programs' ? '#2563EB' : 'transparent', color: '#fff' }} onClick={() => { setActiveTab('working_programs'); setShowProjectForm(false); }}>Working Programs</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <div style={headerStyle}>
          <span style={{ fontWeight: 700 }}>Project Manager Dashboard</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '12px' }}>Welcome, <b>{username}</b></span>
            <button onClick={onLogout} style={logoutBtnStyle}>LOGOUT</button>
            <div style={userCircleStyle}>{username?.charAt(0).toUpperCase() || 'U'}</div>
          </div>
        </div>

        <div style={{ padding: '25px', overflowY: 'auto' }}>
          {!showProjectForm ? (
            <>
              {activeTab === 'execution' && (
                <>
                  <h3 style={sectionTitle}>Project Execution & Task Management</h3>
                  <div style={tableContainer}>
                    <table style={tableStyle}>
                      <thead style={theadStyle}>
                        <tr><th style={thStyle}>PROJECT NAME</th><th style={thStyle}>STATUS</th><th style={thStyle}>TASK ACTION</th></tr>
                      </thead>
                      <tbody>
                        {myProjects.map((project) => (
                          <React.Fragment key={project.id}>
                            <tr style={trStyle}>
                              <td style={tdStyle}><span onClick={() => toggleRow(project.id)} style={{ cursor: 'pointer', color: '#2563EB', textDecoration: 'underline' }}><b>{project.name}</b> {expandedProjectId === project.id ? '▴' : '▾'}</span></td>
                             <td style={tdStyle}>
  <span style={{
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    backgroundColor: (project.status === 'Active' || project.status === 'Approved') ? '#dcfce7' : '#fef3c7',
    color: (project.status === 'Active' || project.status === 'Approved') ? '#166534' : '#92400e'
  }}>
    {project.status}
  </span>
</td>
                              <td style={tdStyle}>
  {/* Active or Approved,  */}
  {(project.status === 'Active' || project.status === 'Approved') ? (
    <button
      onClick={() => {
        setActiveProjectForTask(project);
        setShowTaskModal(true);
      }}
      style={primBtn}
    >
      + Create Task
    </button>
  ) : (
    <span style={{ color: '#94a3b8', fontSize: '12px' }}>Waiting Approval</span>
  )}
</td>
                            </tr>
                            {expandedProjectId === project.id && (
                              <tr>
                                <td colSpan="3" style={{ padding: '20px', backgroundColor: '#f8fafc' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div style={innerCardStyle}>
                                      <h5 style={innerTitleStyle}>👥 Project Team</h5>
                                      <table style={miniTableStyle}>
                                        <thead><tr style={miniTheadStyle}><th style={miniThStyle}>Member</th><th style={miniThStyle}>Role</th><th style={miniThStyle}>FTE</th></tr></thead>
                                        <tbody>
                                          {project.team_members?.map((m, idx) => (
                                            <tr key={idx} style={miniTrStyle}><td style={miniTdStyle}>{m.username}</td><td style={miniTdStyle}>{m.role}</td><td style={miniTdStyle}>{m.fte}</td></tr>
                                          )) || <tr><td colSpan="3">No members</td></tr>}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div style={innerCardStyle}>
                                      <h5 style={innerTitleStyle}>📅 Sprint Timeline</h5>
                                      <table style={miniTableStyle}>
                                        <thead><tr style={miniTheadStyle}><th style={miniThStyle}>Sprint</th><th style={miniThStyle}>Duration</th><th style={miniThStyle}>Status</th></tr></thead>
                                        <tbody>
                                          {project.sprints?.map((s, idx) => {
                                            const sColor = getStatusColor(s.end_date);
                                            return (
                                              <tr key={idx} style={miniTrStyle}>
                                                <td style={miniTdStyle}>{s.name}</td>
                                                <td style={miniTdStyle}>{s.start_date} to {s.end_date}</td>
                                                <td style={miniTdStyle}><span style={{ backgroundColor: sColor === '#ef4444' ? '#fee2e2' : '#DCFCE7', color: sColor, padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{sColor === '#ef4444' ? '● Overdue' : '● On Track'}</span></td>
                                              </tr>
                                            );
                                          }) || <tr><td colSpan="3">No sprints</td></tr>}
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
                </>
              )}
              {activeTab === 'assignments' && (
                <>

                  {/* --- Horizontal Stats Cards Section --- */}
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
</div>
{/* --- End of Section --- */}

                  <h3 style={sectionTitle}>Assigned Programs</h3>
                  <div style={tableContainer}>
                    <table style={tableStyle}>
                      <thead style={theadStyle}><tr><th style={thStyle}>PROGRAM NAME</th><th style={thStyle}>TIMELINE</th><th style={thStyle}>ASSIGNED BY</th><th style={thStyle}>ACTION</th></tr></thead>
                      <tbody>
                        {assignedPrograms.map((pgm) => (
                          <tr key={pgm.id} style={trStyle}>
                            <td style={tdStyle}><b>{pgm.name}</b></td>
                            <td style={tdStyle}>{pgm.start_date} to {pgm.end_date}</td>
                            <td style={tdStyle}>{pgm.assigned_by_pgm || 'Directly Assigned'}</td>
                           <td style={tdStyle}>
    <button
        onClick={() => handleBuildPlan(pgm)}
        style={{
            ...primBtn,
            backgroundColor: '#2563eb',
            opacity: pgm.status_label === 'Build Plan' || pgm.status_label === 'Rejected' ? 1 : 0.7,
            cursor: pgm.status_label === 'Build Plan' || pgm.status_label === 'Rejected' ? 'pointer' : 'not-allowed'
        }}
        disabled={pgm.status_label === 'Waiting' || pgm.status_label === 'Approved'}
    >
        {/* ... */}
        {pgm.status_label === 'Build Plan' ? '+ Build Plan' :
         pgm.status_label === 'Waiting' ? '🕒 Waiting' :
         pgm.status_label === 'Approved' ? '✅ Approved' :
         pgm.status_label === 'Rejected' ? '❌ Rejected (Re-build)' : pgm.status_label}
    </button>
</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {activeTab === 'working_programs' && (
                <>
                  <h3 style={sectionTitle}>🚀 Programs Currently in Execution</h3>
                  <div style={tableContainer}>
                    <table style={tableStyle}>
                      <thead style={theadStyle}>
                        <tr><th style={thStyle}>WORKING PROGRAM</th><th style={thStyle}>MANAGER</th><th style={thStyle}>LATEST STATUS</th><th style={thStyle}>ACTIONS</th></tr>
                      </thead>
                      <tbody>
                        {workingPrograms.length > 0 ? workingPrograms.map((pgm) => (
                          <tr key={pgm.id} style={trStyle}>
                            <td style={tdStyle}><b>{pgm.name}</b><div style={{ fontSize: '11px', color: '#64748b' }}>{pgm.start_date} to {pgm.end_date}</div></td>
                            <td style={tdStyle}>{pgm.pm_name}</td>
                            <td style={tdStyle}><span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>IN PROGRESS</span></td>
                            <td style={tdStyle}><button onClick={() => handleLiveTrack(pgm.id)} style={{ ...primBtn, padding: '6px 12px', fontSize: '12px', backgroundColor: '#8b5cf6' }}>Live Track 📊</button></td>
                          </tr>
                        )) : (<tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No programs in execution.</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={formContainerStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#1B3A6B' }}>Setup Project: {selectedProgram?.name}</h2>
                <button onClick={() => setShowProjectForm(false)} style={secBtn}>Cancel / Back</button>
              </div>
              <form onSubmit={handleSubmitPlan}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={lbl}>Project Name</label>
                    <input style={inp} required value={projectData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={lbl}>Description</label>
                    <textarea style={{ ...inp, minHeight: '80px' }} value={projectData.description} onChange={(e) => handleInputChange('description', e.target.value)} />
                  </div>
                  <div><label style={lbl}>Start Date</label><input type="date" style={inp} required value={projectData.start_date} onChange={(e) => handleInputChange('start_date', e.target.value)} /></div>
                  <div><label style={lbl}>End Date</label><input type="date" style={inp} required value={projectData.end_date} onChange={(e) => handleInputChange('end_date', e.target.value)} /></div>
                </div>
                <h4 style={{ color: '#1B3A6B' }}>👥 Resource Allocation</h4>
                <table style={{ width: '100%' }}>
                  <thead><tr><th style={miniTh}>Team Member</th><th style={miniTh}>Role</th><th style={miniTh}>FTE</th><th></th></tr></thead>
                  <tbody>
                    {projectData.team.map((m, idx) => (
                      <tr key={idx}>
                        <td><select style={inp} value={m.userId} onChange={(e) => handleMemberChange(idx, 'userId', e.target.value)}><option value="">Select Member</option>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.username}</option>)}</select></td>
                        <td><input style={inp} value={m.role} onChange={(e) => handleMemberChange(idx, 'role', e.target.value)} /></td>
                        <td><input type="number" step="0.1" style={inp} value={m.fte} onChange={(e) => handleMemberChange(idx, 'fte', e.target.value)} /></td>
                        <td><button type="button" onClick={() => removeMemberRow(idx)} style={{ color: 'red', border: 'none', background: 'none' }}>✖</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={addMemberRow} style={secBtn}>+ Add Member</button>
                <h4 style={{ color: '#1B3A6B', marginTop: '20px' }}>📅 Sprints</h4>
                {projectData.sprints.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input style={inp} value={s.name} onChange={(e) => handleSprintChange(idx, 'name', e.target.value)} />
                    <input type="date" style={inp} value={s.start_date} onChange={(e) => handleSprintChange(idx, 'start_date', e.target.value)} />
                    <input type="date" style={inp} value={s.end_date} onChange={(e) => handleSprintChange(idx, 'end_date', e.target.value)} />
                  </div>
                ))}
                <button type="button" onClick={addSprintRow} style={secBtn}>+ Add Sprint</button>
                <div style={{ marginTop: '30px', textAlign: 'right' }}><button type="submit" style={primBtn}>Submit Project Plan</button></div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* --- LIVE TRACKER MODAL (UPDATED TO MATCH IMAGE_B5EB1E.PNG) --- */}
      {showTrackerModal && selectedProgramStats && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '1000px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px' }}>

            {/* Header with Activity Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1B3A6B', fontSize: '24px' }}>Live Tracker: {selectedProgramStats.program_name}</h2>
                <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                  Tracking real-time execution for Manager: <span style={{ fontWeight: 'bold', color: '#1B3A6B' }}>{selectedProgramStats.pm_name || 'Not Assigned'}</span>
                </p>
              </div>
              <button onClick={() => setShowTrackerModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Reordered Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
              <div style={liveStatCard('#3b82f6')}>
                <div style={liveStatLabel}>OVERALL COMPLETION</div>
                <div style={liveStatValue}>{selectedProgramStats.completion_percentage || 0}%</div>
              </div>
              <div style={liveStatCard('#10b981')}>
                <div style={liveStatLabel}>TOTAL TASKS</div>
                <div style={liveStatValue}>{selectedProgramStats.total_tasks || 0}</div>
              </div>
              <div style={liveStatCard('#f59e0b')}>
                <div style={liveStatLabel}>COMPLETED</div>
                <div style={liveStatValue}>{selectedProgramStats.completed_tasks || 0}</div>
              </div>
              <div style={liveStatCard('#8b5cf6')}>
                <div style={liveStatLabel}>TEAM MEMBERS</div>
                <div style={liveStatValue}>{selectedProgramStats.team_count || 1}</div>
              </div>
            </div>

            {/* Charts Row: Velocity and Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Sprint Progress Velocity (Left) */}
              <div style={chartContainer}>
                <h4 style={{ marginTop: 0, fontSize: '15px', color: '#1B3A6B' }}>Sprint Progress Velocity</h4>
               <div style={{ height: '280px', width: '100%', display: 'block' }}>
                 <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={selectedProgramStats.velocity_data || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{fontSize: 11}} />
                      <YAxis domain={[0, 100]} tick={{fontSize: 11}} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="completion"
                        stroke="#2563EB"
                        strokeWidth={3}
                        dot={{ r: 6, fill: '#fff', strokeWidth: 2, stroke: '#2563EB' }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Task Distribution (Right) */}
              <div style={chartContainer}>
                <h4 style={{ marginTop: 0, fontSize: '15px', color: '#1B3A6B' }}>Task Distribution</h4>
               <div style={{ height: '280px', width: '100%', display: 'block' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Done', value: selectedProgramStats.completed_tasks || 0 },
                          { name: 'Doing', value: selectedProgramStats.pending_tasks || 0 },
                          { name: 'Todo', value: Math.max(0, (selectedProgramStats.total_tasks || 0) - (selectedProgramStats.completed_tasks || 0) - (selectedProgramStats.pending_tasks || 0)) }
                        ]}
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                    <span><span style={{color:'#10b981', marginRight: '4px'}}>●</span>Done</span>
                    <span><span style={{color:'#3b82f6', marginRight: '4px'}}>●</span>Doing</span>
                    <span><span style={{color:'#ef4444', marginRight: '4px'}}>●</span>Todo</span>
                </div>
              </div>
            </div>

            {/* Gantt Chart Section */}
<div style={{ ...chartContainer, marginTop: '20px', padding: '20px', minHeight: '350px', backgroundColor: '#fff', borderRadius: '12px' }}>
    <h4 style={{ marginTop: 0, marginBottom: '20px', fontSize: '15px', color: '#1B3A6B' }}>
        Project Timeline (Gantt Chart)
    </h4>
    <div style={{ width: '100%', overflowX: 'auto' }}>
        <Chart
            chartType="Gantt"
            width="100%"
            height="300px"
           data={[
    [
        { type: "string", label: "Task ID" },
        { type: "string", label: "Task Name" },
        { type: "date", label: "Start Date" },
        { type: "date", label: "End Date" },
        { type: "number", label: "Duration" },
        { type: "number", label: "Percent Complete" },
        { type: "string", label: "Dependencies" },
    ],
    // selectedProgramStats.gantt_data
    ...(selectedProgramStats?.gantt_data || []).map((task) => [
        String(task.id),
        task.name || "Unnamed Task",
        new Date(task.start), // Backend
        new Date(task.end),   // Backend
        null,
        task.progress || 0,
        null,
    ]),
]}

            options={{
                height: 280,
                gantt: {
                    trackHeight: 40,
                    barHeight: 25,
                    labelStyle: { fontName: 'Segoe UI', fontSize: 12 },
                    palette: [{ "color": "#2563EB", "dark": "#1e40af", "light": "#60a5fa" }]
                },
            }}
        />
    </div>
</div>

            {/* Recent Team Activity Log (Bottom) */}
            <div style={{ ...chartContainer, marginBottom: '0' }}>
              <h4 style={{ marginTop: 0, fontSize: '15px', color: '#1B3A6B', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>Recent Team Activity Log</h4>
              <div style={{ marginTop: '10px' }}>
                {(selectedProgramStats?.recent_logs || []).length > 0 ? (
                    selectedProgramStats.recent_logs.map((act, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx !== (selectedProgramStats?.recent_logs?.length - 1) ? '1px solid #f8fafc' : 'none' }}>
                        <div>
                        <div style={{ fontSize: '14px' }}><b style={{ color: '#2563EB' }}>{act.user}</b> in <span style={{ fontWeight: '600' }}>{act.sprint}</span></div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Task: {act.task_name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>Due: {act.due_date}</div>
                        <div style={{ marginTop: '5px' }}>
                            <span style={{
                                fontSize: '10px',
                                padding: '3px 10px',
                                borderRadius: '10px',
                                background: act.status === 'Done' ? '#DCFCE7' : '#f1f5f9',
                                color: act.status === 'Done' ? '#166534' : '#64748b',
                                fontWeight: 'bold'
                            }}>
                            {act.status}
                            </span>
                        </div>
                        </div>
                    </div>
                ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>No recent activity to display.</div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showTaskModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginTop: 0, color: '#1B3A6B' }}>Create Task: {activeProjectForTask?.name}</h3>
            <form onSubmit={handleCreateTask}>
              <label style={lbl}>Task Title</label>
              <input style={inp} required placeholder="e.g. Research, Design..." value={taskData.title} onChange={(e) => setTaskData({...taskData, title: e.target.value})} />
              <label style={lbl}>Assign To</label>
              <select style={inp} required value={taskData.assigned_to} onChange={(e) => setTaskData({...taskData, assigned_to: e.target.value})}>
                <option value="">Select Member</option>
                {activeProjectForTask?.team_members?.map(m => ( <option key={m.username} value={m.username}>{m.username}</option> ))}
              </select>
              <label style={lbl}>Sprint</label>
              <select style={inp} required value={taskData.sprint_id} onChange={(e) => setTaskData({...taskData, sprint_id: e.target.value})}>
                <option value="">Select Sprint</option>
                {activeProjectForTask?.sprints?.map(s => ( <option key={s.id} value={s.id}>{s.name}</option> ))}
              </select>
              <label style={lbl}>Due Date</label>
              <input type="date" style={inp} required value={taskData.due_date} onChange={(e) => setTaskData({...taskData, due_date: e.target.value})} />
              <div style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="submit" style={primBtn}>Save Task</button>
                <button type="button" onClick={() => setShowTaskModal(false)} style={secBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 0.5s ease-in; }
      `}</style>
    </div>
  );
};

// --- STYLES ---
const sidebarStyle = { width: '220px', backgroundColor: '#1B3A6B', color: '#fff', display: 'flex', flexDirection: 'column' };
const logoBox = { padding: '25px 20px', fontSize: '22px', fontWeight: 'bold' };
const sbSecTitle = { fontSize: '10px', color: '#8ab0d8', padding: '20px 20px 5px' };
const sbItem = { padding: '12px 20px', fontSize: '13px', cursor: 'pointer' };
const headerStyle = { height: '60px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 25px', borderBottom: '1px solid #e2e8f0' };
const logoutBtnStyle = { background: '#EF4444', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' };
const userCircleStyle = { width: '32px', height: '32px', borderRadius: '50%', background: '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const sectionTitle = { color: '#1B3A6B' };
const tableContainer = { background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const theadStyle = { background: '#f8fafc' };
const thStyle = { padding: '15px', textAlign: 'left', fontSize: '12px', color: '#64748B' };
const tdStyle = { padding: '15px', borderTop: '1px solid #f1f5f9' };
const trStyle = { transition: '0.2s' };
const primBtn = { background: '#2563EB', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const secBtn = { background: '#e2e8f0', color: '#475569', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' };
const formContainerStyle = { background: '#fff', padding: '30px', borderRadius: '8px' };
const inp = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '5px' };
const lbl = { fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '10px' };
const miniTh = { textAlign: 'left', fontSize: '11px', color: '#94a3b8' };
const innerCardStyle = { background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' };
const innerTitleStyle = { margin: '0 0 10px 0', color: '#1B3A6B' };
const miniTableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '12px' };
const miniTheadStyle = { borderBottom: '2px solid #f1f5f9', background: '#f8fafc' };
const miniThStyle = { padding: '8px' };
const miniTrStyle = { borderBottom: '1px solid #f1f5f9' };
const miniTdStyle = { padding: '8px' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: '#fff', padding: '30px', borderRadius: '12px' };

const liveStatCard = (color) => ({ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderTop: `4px solid ${color}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' });
const liveStatLabel = { fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '5px', letterSpacing: '0.5px' };
const liveStatValue = { fontSize: '24px', fontWeight: '800', color: '#1B3A6B' };
const chartContainer = { background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' };

export default PMDashboard;