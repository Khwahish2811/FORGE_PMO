import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Chart } from "react-google-charts";

const TMDashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyInput, setDailyInput] = useState({});
  const [stats, setStats] = useState({
    active_tasks: 0,
    due_this_week: 0,
    hours_today: 0,
    fte_score: 0,
    total_programs: 0,
    daily_limit: 9
  });
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const totalSprintCapacity = 20;

  const currentProjectTasks = tasks.filter(t => t.project_name === selectedProjectId);

  // Bar Chart Data
  const sprintCounts = currentProjectTasks.reduce((acc, task) => {
      const sName = task.sprint_name || 'Unassigned';
      acc[sName] = (acc[sName] || 0) + 1;
      return acc;
  }, {});
  const barData = Object.keys(sprintCounts).map(name => ({ name, tasks: sprintCounts[name] }));

  // Pie Chart Data
  const doneCount = currentProjectTasks.filter(t => t.status === 'Done').length;
  const pendingCount = currentProjectTasks.length - doneCount;
  const pieData = [
      { name: 'Completed', value: doneCount, color: '#10B981' },
      { name: 'Pending', value: pendingCount, color: '#EF4444' }
  ];

  // Gantt Chart Data Mapping
  const ganttColumns = [
    { type: "string", label: "Task ID" },
    { type: "string", label: "Task Name" },
    { type: "date", label: "Start Date" },
    { type: "date", label: "End Date" },
    { type: "number", label: "Duration" },
    { type: "number", label: "Percent Complete" },
    { type: "string", label: "Dependencies" },
  ];

  const ganttData = [
    ganttColumns,
    ...currentProjectTasks.map((task) => {
      const start = new Date(2026, 4, 1);
      const end = task.due_date ? new Date(task.due_date) : new Date(2026, 4, 15);

      return [
        String(task.id),
        task.task_title || "Task",
        start,
        end,
        null,
        task.status === 'Done' ? 100 : (task.status === 'In Progress' ? 50 : 0),
        null,
      ];
    }),
  ];

  const fetchDashboardStats = async () => {
    try {
      let url = `http://127.0.0.1:8000/api/get-dashboard-stats/?username=${user}`;
      if (selectedProjectId) {
          url += `&project_id=${selectedProjectId}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) { console.error("Stats fetch error:", err); }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/get-kanban-tasks/?username=${user}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);

        const projMap = {};
        data.forEach(item => {
          if (!projMap[item.project_name]) {
            projMap[item.project_name] = {
              name: item.project_name,
              pm: item.project_manager,
              sprint: item.sprint_name
            };
          }
        });

        const uniqueProjects = Object.values(projMap);
        setProjects(uniqueProjects);
      }
    } catch (err) { console.error("Fetch error:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projects[0].name);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (user) {
        fetchTasks();
        const interval = setInterval(() => {
            fetchTasks();
        }, 30000);
        return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedProjectId) {
        fetchDashboardStats();
        const interval = setInterval(() => {
            fetchDashboardStats();
        }, 30000);
        return () => clearInterval(interval);
    }
  }, [user, selectedProjectId]);

  const handleDailyEffortChange = (taskId, hours) => {
    setDailyInput(prev => ({ ...prev, [taskId]: parseFloat(hours || 0) }));
  };

  const saveDailyLog = async () => {
    const taskIdsToUpdate = Object.keys(dailyInput).filter(id => dailyInput[id] > 0);
    if (taskIdsToUpdate.length === 0) {
        showToast('⚠️ Please enter hours for at least one task.', 'warning');
        return;
    }
    setLoading(true);
    try {
      const updates = taskIdsToUpdate.map(taskId => {
        return fetch('http://127.0.0.1:8000/api/log-daily-effort/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: taskId,
            hours_added: dailyInput[taskId],
            username: user,
            log_date: new Date().toISOString().split('T')[0]
          })
        });
      });
      const results = await Promise.all(updates);
      const allOk = results.every(res => res.ok);
      if (allOk) {
          showToast('✅ Daily Effort Saved Successfully!', 'success');
          setDailyInput({});
          await fetchTasks();
          await fetchDashboardStats();
      } else {
          const errorData = await results[0].json();
          showToast(`❌ Error: ${errorData.message || 'Failed to save effort'}`, 'error');
      }
    } catch (err) {
        showToast('❌ Server connection failed.', 'error');
    } finally {
        setLoading(false);
    }
  };

  const updateSprintStatus = async (sprintId, newStatus) => {
    if (!sprintId) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/update-sprint-status/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprint_id: sprintId, status: newStatus })
      });
      if (response.ok) {
        await fetchTasks();
        await fetchDashboardStats();
      }
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (taskId, newStatus) => {
    try {
     const response = await fetch('http://127.0.0.1:8000/api/update-task-status-with-tracker/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, status: newStatus })
      });
      if (response.ok) {
          fetchTasks();
          fetchDashboardStats();
      }
    } catch (err) { console.error(err); }
  };

  const totalTasks = currentProjectTasks.length;
  const completedTasks = currentProjectTasks.filter(t => t.status === 'Done').length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const tasksBySprint = currentProjectTasks.reduce((groups, task) => {
    const sprint = task.sprint_name || 'Unassigned';
    if (!groups[sprint]) groups[sprint] = [];
    groups[sprint].push(task);
    return groups;
  }, {});

  return (
    <div style={layoutContainer}>
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '30px', right: '30px', zIndex: 9999,
          background: toastMessage.type === 'error' ? '#ef4444' : toastMessage.type === 'warning' ? '#f59e0b' : '#10b981',
          color: 'white', padding: '16px 24px', borderRadius: '10px', fontWeight: '600', fontSize: '14px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          animation: 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {toastMessage.msg}
        </div>
      )}
      {/* SIDEBAR - Fixed with Scroll */}
      <div style={sidebarStyle}>
        <div style={logoSection}><div style={logoCircle}>F</div><span style={logoText}>FORGE PMO</span></div>

        {/* Scrollable Area Start */}
        <div style={sidebarScrollArea}>
            <div style={navGroup}>
                <p style={navLabel}>NAVIGATION</p>
                <div style={navItemActive}>📊 My Dashboard</div>
                <div style={navItem}>⏱ Timesheet Log</div>
            </div>
            <div style={navGroup}>
                <p style={navLabel}>MY PROJECTS</p>
                {projects.map(proj => (
                    <div key={proj.name} onClick={() => setSelectedProjectId(proj.name)} style={selectedProjectId === proj.name ? projectItemActive : projectItem}>
                        ● {proj.name}
                        <div style={subLabel}>{proj.sprint}</div>
                    </div>
                ))}
            </div>
        </div>
        {/* Scrollable Area End */}

        <button onClick={onLogout} style={logoutBtnSide}>LOGOUT</button>
      </div>

      <div style={mainContent}>
        {/* NEW TOP HEADER - With User Info and Logout */}
        <div style={topHeaderStyle}>
            <h2 style={topTitleStyle}>Team Member Dashboard</h2>
            <div style={userActionGroup}>
                <span style={welcomeTextStyle}>Welcome, <b>{user}</b></span>
                <div style={userAvatarStyle}>{user?.charAt(0).toUpperCase()}</div>
                <button onClick={onLogout} style={topLogoutBtn}>LOGOUT</button>
            </div>
        </div>

        {/* STATS HEADER */}
        <div style={industryHeader}>
            <div style={industryStatItem}>
                <p style={indLabel}>ACTIVE TASKS</p>
                <h2 style={indValue}>{stats.active_tasks}</h2>
                <span style={indSub}>Across all projects</span>
            </div>
            <div style={industryStatItem}>
                <p style={indLabel}>DUE THIS WEEK</p>
                <h2 style={{...indValue, color: '#EF4444'}}>{stats.due_this_week}</h2>
                <span style={indSub}>Needs attention</span>
            </div>
            <div style={{...industryStatItem, borderRight: 'none'}}>
                <p style={indLabel}>TOTAL PROGRAMS</p>
                <h2 style={indValue}>{stats.total_programs || 0}</h2>
                <span style={indSub}>Live in Portfolio</span>
            </div>
        </div>

        {/* PROJECT INFO BAR */}
        <div style={projectInfoBar}>
            <span style={{color: '#10B981'}}>● Viewing active project</span>
            <div style={projectTitleRow}>
                <strong>● {selectedProjectId} • {projects.find(p => p.name === selectedProjectId)?.sprint}</strong>
                <span style={activeBadge}>Active</span>
            </div>
        </div>

        {/* PROGRESS & FTE CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '20px', padding: '0 25px 25px 25px' }}>
            <div style={trackerContainerCompact}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <span style={trackerLabel}>Sprint Progress</span>
                    <span style={trackerPercentage}>{progressPercentage}% Completed</span>
                </div>
                <div style={progressBarBg}>
                    <div style={{...progressBarFill, width: `${progressPercentage}%`}}></div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
                <div style={projectSpecificStatCard}>
                    <p style={indLabel}>HOURS TODAY</p>
                    <h3 style={{...indValueCompact, color: '#10B981'}}>{stats.hours_today}</h3>
                    <span style={indSubCompact}>of {stats.daily_limit}h</span>
                </div>
                <div style={projectSpecificStatCard}>
                    <p style={indLabel}>PROJECT FTE</p>
                    <h3 style={indValueCompact}>{stats.fte_score}</h3>
                    <span style={indSubCompact}>{stats.fte_score < 0.5 ? 'Low' : 'Good'}</span>
                </div>
            </div>
        </div>

        {/* CHARTS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '0 25px 25px 25px' }}>
            <div style={chartCardStyle}>
                <h4 style={chartTitleStyleCustom}>TASKS PER SPRINT</h4>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData}>
                        <XAxis dataKey="name" fontSize={10} stroke="#64748B" />
                        <YAxis fontSize={10} stroke="#64748B" />
                        <Tooltip />
                        <Bar dataKey="tasks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div style={chartCardStyle}>
                <h4 style={chartTitleStyleCustom}>SPRINT PROGRESS</h4>
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* GANTT CHART */}
        <div style={{ padding: '0 25px 25px 25px' }}>
            <div style={chartCardStyle}>
                <h4 style={chartTitleStyleCustom}>PROJECT TIMELINE (GANTT)</h4>
                {currentProjectTasks.length > 0 ? (
                    <Chart
                        chartType="Gantt"
                        width="100%"
                        height="200px"
                        data={ganttData}
                        options={{
                            height: 200,
                            gantt: {
                                trackHeight: 30,
                                barHeight: 20,
                                labelStyle: { fontSize: 12, color: '#334155' },
                                criticalPathEnabled: false,
                                innerGridHorizLine: { stroke: '#f1f5f9', strokeWidth: 1 }
                            },
                        }}
                    />
                ) : (
                    <p style={{fontSize: '12px', color: '#64748B'}}>No tasks available for timeline.</p>
                )}
            </div>
        </div>

        {/* KANBAN BOARD */}
        <div style={{ padding: '0 25px 25px 25px' }}>
          <h3 style={sectionTitle}>KANBAN BOARD</h3>
          {Object.keys(tasksBySprint).sort().map(sprintName => {
            const firstTask = tasksBySprint[sprintName][0];
            const sprintId = firstTask?.sprint_id;
            const sprintStatus = firstTask?.sprint_status || 'Planned';

            return (
              <div key={sprintName} style={{marginBottom: '35px'}}>
                <div style={{...sprintDivider, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span>📦 {sprintName.toUpperCase()}</span>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: sprintStatus === 'In Progress' ? '#dbeafe' : '#f1f5f9',
                      color: sprintStatus === 'In Progress' ? '#1e40af' : '#64748b',
                      fontWeight: 'bold'
                    }}>
                      {sprintStatus.toUpperCase()}
                    </span>
                    {sprintStatus === 'Planned' && (
                      <button 
                        onClick={() => updateSprintStatus(sprintId, 'In Progress')}
                        style={{
                          padding: '4px 12px',
                          fontSize: '10px',
                          backgroundColor: '#10B981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        START SPRINT
                      </button>
                    )}
                  </div>
                </div>
              <div style={kanbanGrid}>
                {['To Do', 'In Progress', 'Done'].map(col => (
                  <div key={col} style={columnStyle}>
                    <p style={colTitle}>{col.toUpperCase()}</p>
                    {tasksBySprint[sprintName].filter(t => t.status === col).map(task => (
                      <div key={task.id} style={cardStyle}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom: '5px'}}>
                           <span style={tagStyle}>{task.priority}</span>
                           <small style={{color: '#94a3b8'}}>#{task.id}</small>
                        </div>
                        <strong style={cardTitleStyleMain}>{task.task_title}</strong>
                        <div style={detailBox}>
                            <div style={detailRow}>👤 <b>User:</b> <span>{user}</span></div>
                            <div style={detailRow}>👨‍💼 <b>SPOC/PM:</b> <span>{task.project_manager}</span></div>
                            <div style={detailRow}>📁 <b>Project:</b> <span>{task.project_name}</span></div>
                            <div style={{...detailRow, color:'#EF4444', fontWeight: '600'}}>📅 <b>Due:</b> <span>{task.due_date}</span></div>
                        </div>

                        <div style={cardActions}>
                            {task.status === 'To Do' && (
                                <button onClick={() => updateStatus(task.id, 'In Progress')} style={{...moveBtn, backgroundColor: '#3B82F6', color: '#fff', border: 'none'}}>Start Dev →</button>
                            )}
                            {task.status === 'In Progress' && (
                                <button onClick={() => updateStatus(task.id, 'Done')} style={finishBtn}>Done ✓</button>
                            )}
                            {task.status === 'Done' && (
                                <button onClick={() => updateStatus(task.id, 'In Progress')} style={{...moveBtn, fontSize: '9px', border: '1px dashed #cbd5e1'}}>↩ Re-open</button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        </div>

        {/* EFFORT LOG */}
        <div style={effortLogSection}>
            <h3 style={sectionTitle}>TODAY'S EFFORT LOG</h3>
            <table style={effortTable}>
                <thead>
                    <tr style={tableHeader}>
                        <th style={{padding: '12px'}}>Task Name</th>
                        <th>Status</th>
                        <th>Daily Effort</th>
                        <th>Total Consumed</th>
                    </tr>
                </thead>
                <tbody>
                    {currentProjectTasks.filter(t => t.status !== 'Done').map(task => (
                        <tr key={task.id} style={tableRow}>
                            <td style={{padding:'12px'}}>{task.task_title}</td>
                            <td><span style={statusBadge}>{task.status}</span></td>
                            <td>
                                <input
                                    type="number"
                                    value={dailyInput[task.id] || ''}
                                    style={tableInput}
                                    placeholder="0.0"
                                    onChange={(e) => handleDailyEffortChange(task.id, e.target.value)}
                                />
                            </td>
                            <td><b>{task.hours_logged || 0} hrs</b></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={saveDailyLog} style={saveLogBtn} disabled={loading}>
                {loading ? 'SAVING...' : 'SAVE DAILY EFFORT'}
            </button>
        </div>
      </div>
    </div>
  );
};

// --- STYLES (Cleaned & Updated) ---
const topHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', background: '#fff', borderBottom: '1px solid #e2e8f0' };
const topTitleStyle = { fontSize: '18px', fontWeight: 'bold', color: '#1B3A6B', margin: 0 };
const userActionGroup = { display: 'flex', alignItems: 'center', gap: '15px' };
const welcomeTextStyle = { fontSize: '13px', color: '#475569' };
const userAvatarStyle = { width: '32px', height: '32px', background: '#3B82F6', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' };
const topLogoutBtn = { background: '#EF4444', color: '#fff', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };

const sidebarScrollArea = { flex: 1, overflowY: 'auto', paddingRight: '5px' }; // This makes the projects scrollable

const projectSpecificStatCard = { flex: 1, background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' };
const trackerContainerCompact = { padding: '20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' };
const indValueCompact = { fontSize: '18px', fontWeight: '800', margin: '2px 0' };
const indSubCompact = { fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' };

const chartCardStyle = { background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const chartTitleStyleCustom = { fontSize: '12px', color: '#475569', marginBottom: '15px', fontWeight: 'bold' };
const cardTitleStyleMain = { fontSize: '13px', color: '#1E293B', marginTop: '5px', display: 'block', borderBottom: '1px solid #eee', paddingBottom: '8px' };
const industryHeader = { display: 'flex', background: '#fff', borderBottom: '2px solid #1B3A6B', padding: '15px 0' };
const industryStatItem = { flex: 1, padding: '0 25px', borderRight: '1px solid #e2e8f0' };
const indLabel = { fontSize: '10px', color: '#64748B', fontWeight: 'bold', margin: 0 };
const indValue = { fontSize: '22px', fontWeight: '800', margin: '5px 0' };
const indSub = { fontSize: '10px', color: '#94a3b8' };
const projectInfoBar = { padding: '15px 25px', fontSize: '11px' };
const projectTitleRow = { display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px', fontSize: '14px', background: '#1B3A6B', color: '#fff', padding: '10px', borderRadius: '4px' };
const activeBadge = { background: '#10B981', padding: '2px 8px', borderRadius: '12px', fontSize: '10px' };
const detailRow = { display: 'flex', justifyContent: 'space-between', marginBottom: '3px', borderBottom: '1px solid #edf2f7', paddingBottom: '2px' };
const trackerLabel = { fontSize: '12px', fontWeight: 'bold', color: '#64748B' };
const trackerPercentage = { fontSize: '12px', fontWeight: 'bold', color: '#3B82F6' };
const progressBarBg = { width: '100%', height: '10px', backgroundColor: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' };
const progressBarFill = { height: '100%', backgroundColor: '#3B82F6', transition: 'width 0.4s ease-in-out' };
const layoutContainer = { display: 'flex', height: '100vh', backgroundColor: '#f8fafc', overflow: 'hidden' };
const sidebarStyle = { width: '250px', backgroundColor: '#1B3A6B', color: '#fff', padding: '25px', display: 'flex', flexDirection: 'column', flexShrink: 0 };
const logoSection = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' };
const logoCircle = { width: '30px', height: '30px', background: '#3B82F6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' };
const logoText = { fontSize: '14px', fontWeight: '600' };
const navGroup = { marginBottom: '30px' };
const navLabel = { fontSize: '10px', color: '#94a3b8', marginBottom: '15px', fontWeight: 'bold' };
const navItemActive = { padding: '12px', borderRadius: '6px', fontSize: '13px', backgroundColor: '#2563EB', cursor: 'pointer', color: '#fff' };
const navItem = { padding: '12px', borderRadius: '6px', fontSize: '13px', color: '#cbd5e1' };
const projectItem = { padding: '12px', cursor: 'pointer', borderRadius: '6px', marginBottom: '10px', color: '#cbd5e1' };
const projectItemActive = { ...projectItem, backgroundColor: '#162e56', borderLeft: '4px solid #3B82F6', color: '#fff' };
const subLabel = { fontSize: '10px', color: '#94a3b8' };
const mainContent = { flex: 1, overflowY: 'auto' };
const sectionTitle = { fontSize: '14px', color: '#1e293b', marginBottom: '15px', fontWeight: 'bold', borderLeft:'4px solid #1B3A6B', paddingLeft:'10px' };
const sprintDivider = { background: '#E2E8F0', padding: '8px 15px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '15px' };
const kanbanGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' };
const columnStyle = { background: '#f1f5f9', borderRadius: '10px', padding: '15px' };
const colTitle = { fontSize: '11px', fontWeight: 'bold', color: '#64748B', textAlign: 'center', marginBottom: '15px' };
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const tagStyle = { background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' };
const detailBox = { background: '#F8FAFC', padding: '10px', borderRadius: '6px', margin: '12px 0', fontSize: '10px', color: '#475569' };
const cardActions = { display: 'flex', gap: '5px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' };
const moveBtn = { flex: 1, padding: '6px', fontSize: '10px', cursor: 'pointer', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' };
const finishBtn = { ...moveBtn, background: '#10B981', color: '#fff', border: 'none' };
const effortLogSection = { padding: '20px 25px 50px 25px' };
const effortTable = { width: '100%', background: '#fff', borderRadius: '8px', borderCollapse: 'collapse' };
const tableHeader = { background: '#1B3A6B', color: '#fff', textAlign: 'left', fontSize: '12px' };
const tableRow = { borderBottom: '1px solid #f1f5f9', fontSize: '13px' };
const tableInput = { width: '70px', padding: '5px', borderRadius: '4px', border: '1px solid #e2e8f0' };
const statusBadge = { background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' };
const saveLogBtn = { marginTop: '15px', padding: '10px 20px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const logoutBtnSide = { marginTop: '20px', background: '#EF4444', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 };

export default TMDashboard;