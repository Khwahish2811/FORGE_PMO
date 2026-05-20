import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import FocusMode from './common/FocusMode';
import KanbanBoard from './common/KanbanBoard';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

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
    assigned_fte: 0,
    total_programs: 0,
    daily_limit: 9,
    latest_update_note: ''
  });
  const [toastMessage, setToastMessage] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [expandedNodes, setExpandedNodes] = useState({});
  const toggleNode = (nodeId) => setExpandedNodes(prev => ({...prev, [nodeId]: !prev[nodeId]}));

  // Focus Mode State - Pro Version
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusPhase, setFocusPhase] = useState('setup'); // 'setup', 'active', 'completed', 'break'
  const [focusTask, setFocusTask] = useState(null);
  const [totalTime, setTotalTime] = useState(25 * 60); // Total selected duration
  const [timerLeft, setTimerLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [focusHistory, setFocusHistory] = useState({});
  const timerRef = useRef(null);

  // --- NEW FEATURES STATES ---
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
      username: user,
      email: '',
      role: 'Team Member',
      bio: '',
      phone: ''
  });

  const [newProjectCount, setNewProjectCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/get-notifications/?username=${user}`);
      if (res.ok) setNotifications(await res.json());
    } catch (err) { console.error("Notif fetch error:", err); }
  }, [user]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDashboardStats = useCallback(async () => {
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
  }, [user, selectedProjectId]);

  const fetchTasks = useCallback(async () => {
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
              sprint: item.sprint_name,
              program_document: item.program_document
            };
          }
        });
        const uniqueProjects = Object.values(projMap);
        setProjects(uniqueProjects);
        
        // --- NOTIFICATION LOGIC ---
        const savedProjectCount = localStorage.getItem(`forge_projects_${user}`);
        if (savedProjectCount !== null) {
            const diff = uniqueProjects.length - parseInt(savedProjectCount, 10);
            if (diff > 0) {
                setNewProjectCount(diff);
            }
        }
        localStorage.setItem(`forge_projects_${user}`, uniqueProjects.length);
      }
    } catch (err) { console.error("Fetch error:", err); }
    finally { setLoading(false); }
  }, [user]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/get-user-profile/?username=${user}`);
      if (res.ok) setProfileData(await res.json());
    } catch (err) { console.error("Profile fetch error:", err); }
  }, [user]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projects[0].name);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (user) {
        fetchTasks();
        fetchDashboardStats();
            fetchNotifications();
        fetchUserProfile();
        fetchNotifications();
        const interval = setInterval(() => { 
            fetchTasks();
            fetchDashboardStats();
            fetchNotifications();
        }, 5000);
        const handleFocus = () => {
            fetchTasks();
            fetchDashboardStats();
            fetchNotifications();
            fetchUserProfile();
        };
        window.addEventListener('focus', handleFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }
  }, [user, fetchTasks, fetchDashboardStats, fetchNotifications, fetchUserProfile]);

  useEffect(() => {
    if (user && selectedProjectId) {
        fetchDashboardStats();
        const interval = setInterval(() => { fetchDashboardStats(); }, 5000);
        const handleFocus = () => fetchDashboardStats();
        window.addEventListener('focus', handleFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }
  }, [user, selectedProjectId, fetchDashboardStats]);

  // Focus Timer Logic
  useEffect(() => {
    if (isTimerRunning && timerLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimerLeft(prev => prev - 1);
      }, 1000);
    } else if (timerLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      clearInterval(timerRef.current);
      if (focusPhase === 'active') {
          // Finished main focus session
          setFocusPhase('completed');
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
      } else if (focusPhase === 'break') {
          // Finished break
          showToast('Break time is over! Ready to focus again?', 'success');
          setIsFocusMode(false);
      }
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timerLeft, focusPhase]);

  const clearNotifications = async () => {
      try {
        await fetch('http://127.0.0.1:8000/api/mark-notifications-read/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user })
        });
        setNotifications([]);
        setNewProjectCount(0);
      } catch (err) {
        console.error("Error clearing notifications:", err);
      }
  };

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  
  const startFocusForTask = (task) => {
     setFocusTask(task);
     setFocusPhase('setup');
     setIsFocusMode(true);
  };

  const startSession = (minutes) => {
     setTotalTime(minutes * 60);
     setTimerLeft(minutes * 60);
     setFocusPhase('active');
     setIsTimerRunning(true);
  };

  const logPartialTimeAndClose = () => {
      // Calculate how many minutes were spent
      const secondsSpent = totalTime - timerLeft;
      const hoursSpent = Math.max(0.1, Math.round((secondsSpent / 3600) * 10) / 10); // Round to 1 decimal, min 0.1
      const sessionMins = Math.round(secondsSpent / 60);
      const sessionType = totalTime === 15 * 60 ? 'Quick Fix' : totalTime === 25 * 60 ? 'Deep Work' : totalTime === 45 * 60 ? 'Hyper Focus' : 'Flow State';
      
      if (focusTask) {
          setDailyInput(prev => ({...prev, [focusTask.id]: (prev[focusTask.id] || 0) + hoursSpent}));
          setFocusHistory(prev => {
              const currentHistory = prev[focusTask.id] || [];
              return { ...prev, [focusTask.id]: [...currentHistory, { type: sessionType, mins: sessionMins }] };
          });
      }
      showToast(`Logged ${hoursSpent}h (${Math.round(secondsSpent/60)} mins) for your session!`, 'success');
      setIsFocusMode(false);
      setIsTimerRunning(false);
  };

  const startBreak = () => {
      setFocusPhase('break');
      setTotalTime(5 * 60); // 5 min break
      setTimerLeft(5 * 60);
      setIsTimerRunning(true);
  };


  const handleDailyEffortChange = (taskId, hours) => {
    setDailyInput(prev => ({ ...prev, [taskId]: parseFloat(hours || 0) }));
  };

  const saveDailyLog = async () => {
    const taskIdsToUpdate = Object.keys(dailyInput).filter(id => dailyInput[id] > 0);
    if (taskIdsToUpdate.length === 0) {
        showToast('Please enter hours for at least one task.', 'warning');
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
          showToast(' Daily Effort Saved Successfully!', 'success');
          setDailyInput({});
          setFocusHistory({});
          await fetchTasks();
          await fetchDashboardStats();
      } else {
          const errorData = await results[0].json();
          showToast(` Error: ${errorData.message || 'Failed to save effort'}`, 'error');
      }
    } catch (err) {
        showToast(' Server connection failed.', 'error');
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
        showToast(` Sprint is now ${newStatus}`, 'success');
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
          showToast(`Task moved to ${newStatus}`, 'success');
      }
    } catch (err) { console.error(err); }
  };

  const currentProjectTasks = tasks.filter(t => t.project_name === selectedProjectId);
  const tasksBySprint = currentProjectTasks.reduce((groups, task) => {
    const sprint = task.sprint_name || 'Unassigned';
    if (!groups[sprint]) groups[sprint] = [];
    groups[sprint].push(task);
    return groups;
  }, {});

  let urgentTask = null;
  const activeTasks = currentProjectTasks.filter(t => t.status !== 'Done');
  if (activeTasks.length > 0) {
     urgentTask = activeTasks.sort((a, b) => new Date(a.due_date || '2099-01-01') - new Date(b.due_date || '2099-01-01'))[0];
  }

  const unsavedHours = Object.values(dailyInput).reduce((sum, h) => sum + (parseFloat(h) || 0), 0);
  const effectiveHoursToday = (stats.hours_today || 0) + unsavedHours;

  const utilization = effectiveHoursToday / (stats.daily_limit || 9);
  let wellnessStatus = 'Optimal';
  let wellnessColor = '#10B981';
  let wellnessMsg = "You're pacing perfectly for today.";
  if (utilization < 0.3 && effectiveHoursToday !== 0) { wellnessStatus = 'Under-utilized'; wellnessColor = '#3B82F6'; wellnessMsg = "Capacity available for more tasks."; }
  else if (utilization > 0.8) { wellnessStatus = 'At Risk of Burnout'; wellnessColor = '#EF4444'; wellnessMsg = "Approaching daily limit. Time to wrap up!"; }
  if (effectiveHoursToday === 0) { wellnessStatus = 'Fresh Start'; wellnessColor = '#8B5CF6'; wellnessMsg = "Ready to tackle the day!"; }

  // SVG Circular Progress logic
  const radius = 100;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = totalTime > 0 ? circumference - (timerLeft / totalTime) * circumference : 0;
  const formatTime = (secs) => {
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
  };

  // --- CHART DATA CALCULATION ---
  const sprintStatusData = [
    { name: 'To Do', value: currentProjectTasks.filter(t => t.status === 'To Do').length, color: '#EF4444' },
    { name: 'In Progress', value: currentProjectTasks.filter(t => t.status === 'In Progress').length, color: '#F59E0B' },
    { name: 'Done', value: currentProjectTasks.filter(t => t.status === 'Done').length, color: '#10B981' }
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: 'High', count: currentProjectTasks.filter(t => t.priority === 'High' || t.priority === 'Urgent').length, fill: '#EF4444' },
    { name: 'Medium', count: currentProjectTasks.filter(t => t.priority === 'Medium').length, fill: '#F59E0B' },
    { name: 'Low', count: currentProjectTasks.filter(t => t.priority === 'Low').length, fill: '#3B82F6' }
  ];

  const ganttTasks = currentProjectTasks.map((t, idx) => {
      let sDate = new Date(t.start_date);
      if (isNaN(sDate)) sDate = new Date(new Date(t.due_date || new Date()).getTime() - 3*24*60*60*1000);
      let eDate = new Date(t.due_date);
      if (isNaN(eDate)) eDate = new Date(new Date().getTime() + 2*24*60*60*1000);
      return {
          id: String(t.id || `task-${idx}`),
          name: t.task_title || "Unnamed Task",
          start: sDate,
          end: eDate,
          progress: t.status === 'Done' ? 100 : t.status === 'In Progress' ? 50 : 0,
          type: 'task',
          styles: { progressColor: '#3B82F6', progressSelectedColor: '#1E40AF' }
      };
  });

  const hierarchyData = tasks.reduce((acc, task) => {
      const prog = task.program_name || 'Standard';
      const proj = task.project_name || 'No Project';
      const spr = task.sprint_name || 'Unassigned';
      if (!acc[prog]) acc[prog] = {};
      if (!acc[prog][proj]) acc[prog][proj] = {};
      if (!acc[prog][proj][spr]) acc[prog][proj][spr] = [];
      acc[prog][proj][spr].push(task);
      return acc;
  }, {});

  return (
    <div style={layoutContainer}>
      {/* PROFILE MODAL */}
      {showProfileModal && (
        <div style={focusOverlay}>
            <div style={{ ...focusCardPro, width: '450px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
                    <h2 style={{ margin: 0, color: '#1B3A6B' }}>User Profile</h2>
                    <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}>✕</button>
                </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #3B82F6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }}>
                        {profileData.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#0F172A' }}>{profileData.username}</h3>
                        <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>{profileData.role}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Email Address</label>
                        <div style={{ fontSize: '14px', color: '#1e293b', marginTop: '4px' }}>{profileData.email}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Contact Number</label>
                        <div style={{ fontSize: '14px', color: '#1e293b', marginTop: '4px' }}>{profileData.phone}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Bio / About</label>
                        <div style={{ fontSize: '14px', color: '#1e293b', marginTop: '4px', lineHeight: '1.5' }}>{profileData.bio}</div>
                    </div>
                    <div style={{ marginTop: '10px', padding: '12px', background: '#FEF3C7', color: '#92400E', borderRadius: '8px', fontSize: '12px', border: '1px solid #FDE68A', textAlign: 'center' }}>
                         Profile details are managed by HR/Admin and cannot be edited.
                    </div>
                </div>
            </div>
        </div>
      )}

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

      {/* FOCUS MODE PRO OVERLAY */}
      <FocusMode
        isOpen={isFocusMode}
        focusTask={focusTask}
        focusPhase={focusPhase}
        timerLeft={timerLeft}
        isTimerRunning={isTimerRunning}
        totalTime={totalTime}
        startSession={startSession}
        toggleTimer={toggleTimer}
        logPartialTimeAndClose={logPartialTimeAndClose}
        startBreak={startBreak}
        setIsFocusMode={setIsFocusMode}
        setFocusPhase={setFocusPhase}
      />

      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={{ ...logoSection, flexDirection: 'column', alignItems: 'flex-start', gap: '2px', paddingLeft: '15px' }}>
        <span style={{ fontSize: '11px', fontWeight: '500', color: '#93c5fd', letterSpacing: '2px', textTransform: 'uppercase' }}>AM/NS</span>
        <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>FORGE</span>
      </div>

        <div style={sidebarScrollArea}>
            <div style={navGroup}>
                <p style={navLabel}>NAVIGATION</p>
                <div onClick={() => setActiveView('dashboard')} style={activeView === 'dashboard' ? navItemActive : navItem}> My Dashboard</div>
            </div>
            <div style={navGroup}>
                <p style={navLabel}>MY PROJECTS</p>
                {projects.map(proj => (
                    <div key={proj.name} onClick={() => { setSelectedProjectId(proj.name); setActiveView('project'); }} style={activeView === 'project' && selectedProjectId === proj.name ? projectItemActive : projectItem}>
                        <span style={{marginRight: '8px', color: activeView === 'project' && selectedProjectId === proj.name ? '#60A5FA' : '#cbd5e1'}}>•</span> 
                        {proj.name}
                    </div>
                ))}
            </div>
        </div>
        <button onClick={onLogout} style={logoutBtnSide}>LOGOUT</button>
      </div>

      <div style={mainContent}>
        {/* HEADER */}
        <div style={topHeaderStyle}>
            <div>
               <h2 style={topTitleStyle}>Hello, {user} </h2>
               <p style={{margin: 0, fontSize: '13px', color: '#64748B'}}>Here is your personalized workspace.</p>
            </div>
            <div style={{...userAvatarStyle, cursor: 'pointer'}} onClick={() => setShowProfileModal(true)} title="View Profile">
                {user?.charAt(0).toUpperCase()}
            </div>
        </div>

                {/* --- HEADER SUMMARY CARDS REMOVED --- */}
        {activeView === 'dashboard' ? (
            <div style={{ padding: '25px' }}>
                {/* STICKY KANBAN CARDS FOR FTE AND PROGRAMS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#64748B', fontSize: '13px', textTransform: 'uppercase' }}>Total Active Programs</h4>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1B3A6B' }}>{Object.keys(hierarchyData).length}</div>
                    </div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#64748B', fontSize: '13px', textTransform: 'uppercase' }}>Total Assigned FTE</h4>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10B981' }}>{stats.assigned_fte || '0.0'}</div>
                    </div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#64748B', fontSize: '13px', textTransform: 'uppercase' }}>Total Calculated FTE</h4>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#F59E0B' }}>{stats.fte_score || '0.0'}</div>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '15px', border: '1px solid #e2e8f0', padding: '20px' }}>
                    <h3 style={sectionTitlePremium}>Hierarchy: Programs & Projects</h3>
                    {Object.keys(hierarchyData).length > 0 ? Object.entries(hierarchyData).map(([progName, projectsMap]) => (
                        <div key={progName} style={{ marginBottom: '15px', border: '1px solid #f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                            <div 
                                onClick={() => toggleNode(`prog-${progName}`)} 
                                style={{ background: '#f8fafc', padding: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '15px' }}>Program: {progName}</span>
                                    {notifications.some(n => Object.keys(projectsMap).some(p => n.message.includes(p))) && (
                                        <span style={{ background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px' }}>UPDATES INSIDE</span>
                                    )}
                                </div>
                                <span>{expandedNodes[`prog-${progName}`] ? '▼' : '▶'}</span>
                            </div>
                            {expandedNodes[`prog-${progName}`] && (
                                <div style={{ padding: '15px', background: '#fff' }}>
                                    {Object.entries(projectsMap).map(([projName, sprintsMap]) => {
                                        const projTasks = tasks.filter(t => t.project_name === projName);
                                        const done = projTasks.filter(t => t.status === 'Done').length;
                                        const progress = projTasks.length === 0 ? 0 : Math.round((done / projTasks.length) * 100);
                                        return (
                                            <div key={projName} style={{ marginBottom: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                <div 
                                                    style={{ padding: '12px', background: '#f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                    onClick={() => toggleNode(`proj-${progName}-${projName}`)}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#334155' }}>Project: {projName}</span>
                                                        {notifications.some(n => n.message.includes(projName)) && (
                                                            <span style={{ background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px' }}>NEW UPDATE</span>
                                                        )}
                                                        <button onClick={(e) => { e.stopPropagation(); setSelectedProjectId(projName); setActiveView('project'); }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>View Board</button>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <span style={{ fontSize: '12px', color: '#64748b' }}>{progress}% Done</span>
                                                        <span>{expandedNodes[`proj-${progName}-${projName}`] ? '▼' : '▶'}</span>
                                                    </div>
                                                </div>
                                                {expandedNodes[`proj-${progName}-${projName}`] && (
                                                    <div style={{ padding: '15px' }}>
                                                        {Object.entries(sprintsMap).map(([sprintName, sprintTasks]) => (
                                                            <div key={sprintName} style={{ marginBottom: '10px' }}>
                                                                <div 
                                                                    style={{ padding: '8px', background: '#e0e7ff', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                                                                    onClick={() => toggleNode(`spr-${progName}-${projName}-${sprintName}`)}>
                                                                    <span style={{ fontWeight: 'bold', color: '#3730a3', fontSize: '13px' }}>Sprint: {sprintName}</span>
                                                                    <span>{expandedNodes[`spr-${progName}-${projName}-${sprintName}`] ? '▼' : '▶'}</span>
                                                                </div>
                                                                {expandedNodes[`spr-${progName}-${projName}-${sprintName}`] && (
                                                                    <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        {sprintTasks.map(t => (
                                                                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', border: '1px solid #f1f5f9', borderRadius: '4px', fontSize: '13px' }}>
                                                                                <span>{t.task_title}</span>
                                                                                <span style={{ 
                                                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                                                                    background: t.status === 'Done' ? '#d1fae5' : t.status === 'In Progress' ? '#fef3c7' : '#fee2e2',
                                                                                    color: t.status === 'Done' ? '#065f46' : t.status === 'In Progress' ? '#92400e' : '#991b1b'
                                                                                }}>{t.status}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No active assignments found.</div>
                    )}
                </div>
            </div>
        ) : (
            <>
              {stats.latest_update_note && (
                  <div style={{ margin: '25px 25px 0 25px', padding: '15px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #1B3A6B 0%, #1e40af 100%)', boxShadow: '0 4px 12px rgba(27,58,107,0.15)', display: 'flex', alignItems: 'center', gap: '15px', color: '#fff' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '8px' }}>ANNOUNCEMENT</div>
                      <div>
                          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Latest Announcement from PM</div>
                          <p style={{ margin: '5px 0 0 0', fontSize: '14px', fontWeight: '500', lineHeight: '1.5' }}>"{stats.latest_update_note}"</p>
                      </div>
                  </div>
              )}
              {(() => {
                const selectedProj = projects.find(p => p.name === selectedProjectId);
                if (selectedProj && selectedProj.program_document) {
                  const absoluteDocUrl = selectedProj.program_document.startsWith('http') 
                    ? selectedProj.program_document 
                    : `http://127.0.0.1:8000${selectedProj.program_document}`;
                  
                  return (
                    <div style={{ 
                      margin: '25px 25px 0 25px', 
                      padding: '20px', 
                      borderRadius: '16px', 
                      background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', 
                      border: '1px solid #BFDBFE', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.05)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                          Doc
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Reference Document</div>
                          <h4 style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#1E3A8A', fontWeight: 'bold' }}>Reference document for {selectedProjectId} is available.</h4>
                        </div>
                      </div>
                      <a 
                        href={absoluteDocUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ 
                          background: '#2563EB', 
                          color: '#fff', 
                          textDecoration: 'none', 
                          padding: '10px 20px', 
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          fontSize: '13px', 
                          boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)', 
                          transition: '0.2s',
                          cursor: 'pointer'
                        }}
                      >
                        Download Document
                      </a>
                    </div>
                  );
                }
                return null;
              })()}
        <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px', padding: '25px', alignItems: 'stretch'}}>
           {/* SMART AGENDA */}
           <div style={{ ...premiumCard, display: 'flex', flexDirection: 'column' }}>
              <h3 style={sectionTitlePremium}> Smart Agenda</h3>
              <div style={{ display: 'grid', gridTemplateColumns: ((newProjectCount > 0 && activeView === 'dashboard') || notifications.filter(n => activeView === 'dashboard' || n.message.includes(selectedProjectId)).length > 0) ? '1.2fr 1fr' : '1fr', gap: '15px', flex: 1 }}>
                  {/* Column 1: Daily Focus & PM Alerts */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {/* Red Alerts for PM added/updated tasks */}
                      {notifications.filter(n => (n.message.includes('PM_ADD') || n.message.includes('added by the Project Manager')) && (activeView === 'dashboard' || n.message.includes(selectedProjectId))).map(n => (
                          <div key={n.id} style={{ background: '#fef2f2', padding: '12px 15px', borderRadius: '10px', border: '1px solid #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#b91c1c', background: '#fee2e2', padding: '2px 8px', borderRadius: '12px', border: '1px solid #f87171', textTransform: 'uppercase' }}>PM Update Required</span>
                                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#991b1b', fontWeight: 'bold' }}>{n.message.replace('PM_ADD: ', '')}</p>
                              </div>
                              <button onClick={clearNotifications} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginLeft: '10px' }}>Acknowledge</button>
                          </div>
                      ))}

                      {urgentTask ? (
                          <div style={{ ...urgentTaskBox, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                                 <div>
                                    <span style={priorityTagHi}>High Priority</span>
                                    <h4 style={{margin: '10px 0 5px 0', fontSize: '16px', color: '#0F172A'}}>{urgentTask.task_title}</h4>
                                    <p style={{margin: 0, fontSize: '12px', color: '#64748B'}}>Due: <b>{formatDate(urgentTask.due_date)}</b> • {urgentTask.project_name}</p>
                                 </div>
                                 <button onClick={() => startFocusForTask(urgentTask)} style={{ ...btnFocusStart, alignSelf: 'center' }}>
                                     Start Focus Mode
                                 </button>
                              </div>
                          </div>
                      ) : (
                          <div style={{ ...emptyStateBox, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px' }}> No urgent tasks! You are all caught up.</div>
                      )}
                  </div>

                  {/* Column 2: New Project / Task Assignments Panel (smart agenda side) */}
                  {((newProjectCount > 0 && activeView === 'dashboard') || notifications.filter(n => activeView === 'dashboard' || n.message.includes(selectedProjectId)).length > 0) && (
                      <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '10px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '100%', overflowY: 'auto' }}>
                          <h4 style={{ margin: 0, fontSize: '11px', color: '#1e3a8a', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inbox Assignments</h4>
                          
                          {newProjectCount > 0 && activeView === 'dashboard' && (
                              <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                                  <div style={{ fontSize: '9px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' }}>Project Assignment</div>
                                  <h5 style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#1e293b' }}>{newProjectCount} new project(s) assigned to you.</h5>
                              </div>
                          )}

                          {notifications.filter(n => (!n.message.includes('PM_ADD') && !n.message.includes('added by the Project Manager')) && (activeView === 'dashboard' || n.message.includes(selectedProjectId))).map(n => (
                              <div key={n.id} style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                                  <div style={{ fontSize: '9px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase' }}>Update</div>
                                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>{n.message}</p>
                              </div>
                          ))}

                          <button onClick={clearNotifications} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginTop: 'auto', alignSelf: 'flex-start' }}>
                              Clear All
                          </button>
                      </div>
                  )}
              </div>
           </div>

           {/* WELLNESS GAUGE */}
           <div style={{ ...premiumCard, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={sectionTitlePremium}> Wellness & Capacity</h3>
              <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginTop: '15px'}}>
                 <div style={{width: '100px', height: '100px', borderRadius: '50%', background: `conic-gradient(${wellnessColor} ${utilization * 100}%, #f1f5f9 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div style={{width: '75px', height: '75px', background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
                       <span style={{fontSize: '20px', fontWeight: 'bold', color: '#1e293b'}}>{effectiveHoursToday % 1 === 0 ? effectiveHoursToday : effectiveHoursToday.toFixed(1)}h</span>
                    </div>
                 </div>
                 <div>
                    <h4 style={{margin: '0 0 5px 0', color: wellnessColor, fontSize: '18px'}}>{wellnessStatus}</h4>
                    <p style={{margin: 0, fontSize: '13px', color: '#64748B'}}>{wellnessMsg}</p>
                    <p style={{margin: '5px 0 0 0', fontSize: '12px', color: '#94A3B8'}}>Daily Limit: {stats.daily_limit}h</p>
                    
                    {/* Embedded Assigned and Calculated FTE inside Wellness Gauges */}
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                        <div>
                           <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Assigned FTE</div>
                           <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10B981' }}>{stats.assigned_fte || '0.0'}</div>
                        </div>
                        <div>
                           <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Calculated FTE</div>
                           <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#F59E0B' }}>{stats.fte_score || '0.0'}</div>
                        </div>
                     </div>
                 </div>
              </div>
           </div>
        </div>

        {/* PROJECT FTE HIGHLIGHTS */}
        <div style={{ padding: '0 25px 0 25px', display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: '#fff', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3B82F6', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>Project Overall Assigned FTE</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1B3A6B' }}>{stats.project_total_fte !== undefined ? stats.project_total_fte : 'Loading...'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: '#fff', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10B981', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>My Assigned FTE</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10B981' }}>{stats.user_project_fte !== undefined ? stats.user_project_fte : 'Loading...'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: '#fff', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #F59E0B', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>My Utilized FTE</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#F59E0B' }}>{stats.fte_score !== undefined ? stats.fte_score : 'Loading...'}</div>
            </div>
        </div>

        {/* ANALYTICS & TIMELINES */}
        <div style={{ padding: '0 25px 25px 25px' }}>
            <h3 style={sectionTitlePremium}> Analytics & Execution Timelines</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
                <div style={premiumCard}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#1B3A6B' }}>Sprint Status Breakdown</h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={sprintStatusData} innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={5}>
                                {sprintStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
                        {sprintStatusData.map((entry, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 'bold', color: '#64748B' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color }}></div>
                                {entry.name} ({entry.value})
                            </div>
                        ))}
                    </div>
                </div>

                <div style={premiumCard}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#1B3A6B' }}>Task Priority Distribution</h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={priorityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{fontSize: 10}} />
                            <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={60} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={25}>
                                {priorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={premiumCard}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#1B3A6B' }}>Interactive Gantt Roadmap</h4>
                {ganttTasks.length > 0 ? (
                    <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                        <Gantt
                            tasks={ganttTasks}
                            viewMode={ViewMode.Day}
                            columnWidth={60}
                            listCellWidth="150px"
                            rowHeight={40}
                            barFill={70}
                        />
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>No timeline data available for this project.</div>
                )}
            </div>
        </div>

        {/* INTERACTIVE KANBAN */}
        <KanbanBoard
          tasksBySprint={tasksBySprint}
          updateStatus={updateStatus}
          startFocusForTask={startFocusForTask}
        />

        {/* MODERN EFFORT LOG WIDGET */}
        <div style={{ padding: '0 25px 50px 25px' }}>
            <div style={effortWidget}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                  <div>
                     <h3 style={{margin: '0 0 5px 0', color: '#1B3A6B', fontSize: '18px'}}>Daily Effort Log</h3>
                     <p style={{margin: 0, fontSize: '13px', color: '#64748b'}}>Log your hours against active tasks for today.</p>
                  </div>
                  <button onClick={saveDailyLog} style={btnSaveLog} disabled={loading}>
                      {loading ? 'Saving...' : ' Save Effort'}
                  </button>
               </div>
               
               <div style={effortGrid}>
                   {currentProjectTasks.filter(t => t.status !== 'Done').map(task => {
                       const taskHistory = focusHistory[task.id] || [];
                       const totalFocusMins = taskHistory.reduce((sum, h) => sum + h.mins, 0);
                       const isDanger = totalFocusMins > 25;
                       
                       return (
                       <div key={task.id} style={effortRow}>
                           <div style={{flex: 1}}>
                              <h4 style={{margin: '0 0 4px 0', fontSize: '14px', color: '#0F172A'}}>{task.task_title}</h4>
                              <span style={badgeStatusOutline(task.status)}>{task.status}</span>
                              {taskHistory.length > 0 && (
                                  <div style={{marginTop: '10px', fontSize: '12px', color: isDanger ? '#ef4444' : '#10B981', fontWeight: '600', padding: '8px', background: isDanger ? '#fef2f2' : '#ecfdf5', borderRadius: '6px', border: `1px solid ${isDanger ? '#fecaca' : '#a7f3d0'}`, display: 'inline-block'}}>
                                       Focused today: {taskHistory.map(h => `${h.mins}m (${h.type})`).join(' + ')} = {totalFocusMins}m total
                                  </div>
                              )}
                           </div>
                           <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                              <span style={{fontSize: '12px', color: '#64748B'}}>Total: {task.hours_logged || 0}h</span>
                              <div style={inputWrapper}>
                                  <input
                                      type="number"
                                      step="0.1"
                                      value={dailyInput[task.id] || ''}
                                      style={tableInputPremium}
                                      placeholder="0.0"
                                      onChange={(e) => handleDailyEffortChange(task.id, e.target.value)}
                                  />
                                  <span style={{fontSize: '12px', color: '#94a3b8', position: 'absolute', right: '10px', top: '10px'}}>hrs</span>
                              </div>
                           </div>
                       </div>
                   )})}
                   {currentProjectTasks.filter(t => t.status !== 'Done').length === 0 && (
                       <div style={{textAlign: 'center', padding: '30px', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px'}}>No active tasks to log effort against.</div>
                   )}
               </div>
            </div>
        </div>

            </>
        )}
      </div>
    </div>
  );
};

// --- STYLES ---
const layoutContainer = { display: 'flex', height: '100vh', backgroundColor: '#f8fafc', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' };
const sidebarStyle = { width: '260px', backgroundColor: '#1B3A6B', color: '#fff', padding: '25px', display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '4px 0 15px rgba(0,0,0,0.05)' };
const logoSection = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' };
const logoCircle = { width: '32px', height: '32px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' };
const logoText = { fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' };
const sidebarScrollArea = { flex: 1, overflowY: 'auto' };
const navGroup = { marginBottom: '35px' };
const navLabel = { fontSize: '11px', color: '#64748B', marginBottom: '15px', fontWeight: '800', letterSpacing: '1px' };
const navItem = { padding: '12px 18px', margin: '0 15px 5px 15px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', color: '#94a3b8' };
const navItemActive = { padding: '12px 15px', borderRadius: '8px', fontSize: '14px', backgroundColor: 'rgba(59,130,246,0.1)', borderLeft: '4px solid #3B82F6', color: '#60A5FA', fontWeight: '600' };
const projectItem = { padding: '10px 15px', cursor: 'pointer', borderRadius: '8px', marginBottom: '5px', color: '#94A3B8', fontSize: '14px', transition: 'all 0.2s' };
const projectItemActive = { ...projectItem, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: '600' };
const logoutBtnSide = { marginTop: '20px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', ':hover': {background: '#ef4444', color: '#fff'} };

const mainContent = { flex: 1, overflowY: 'auto', backgroundColor: '#F4F7FB' };
const topHeaderStyle = { padding: '30px 25px', background: 'linear-gradient(to right, #fff, #F4F7FB)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const topTitleStyle = { fontSize: '24px', fontWeight: '800', color: '#0F172A', margin: '0 0 5px 0' };
const userAvatarStyle = { width: '45px', height: '45px', background: 'linear-gradient(135deg, #10B981, #3B82F6)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' };

const premiumCard = { background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(226,232,240,0.8)' };
const sectionTitlePremium = { fontSize: '16px', color: '#1e293b', margin: '0 0 20px 0', fontWeight: '700' };

const urgentTaskBox = { background: 'linear-gradient(to right, #fff, #f8fafc)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #EF4444', border: '1px solid #e2e8f0', borderLeftWidth: '4px' };
const priorityTagHi = { background: '#FEF2F2', color: '#EF4444', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' };
const btnFocusStart = { background: '#0F172A', color: '#fff', padding: '10px 15px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(15,23,42,0.2)' };
const emptyStateBox = { padding: '30px', textAlign: 'center', color: '#10B981', background: '#ECFDF5', borderRadius: '12px', fontWeight: '600' };

const sprintHeader = { background: '#fff', padding: '15px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' };
const sprintBadge = (status) => ({ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', background: status === 'In Progress' ? '#DBEAFE' : '#F1F5F9', color: status === 'In Progress' ? '#1E40AF' : '#64748B' });
const btnStartSprint = { background: '#10B981', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' };

const kanbanGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' };
const columnStyle = { background: '#F8FAFC', borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column' };
const colTitleGroup = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' };
const colTitle = { fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' };
const colCount = { background: '#E2E8F0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' };
const cardListStyle = { display: 'flex', flexDirection: 'column', gap: '12px' };

const cardStylePremium = { background: '#fff', padding: '18px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', ':hover': {transform: 'translateY(-2px)', boxShadow: '0 8px 15px rgba(0,0,0,0.08)'} };
const tagStyle = (prio) => ({ background: prio?.toLowerCase() === 'high' ? '#FEF2F2' : '#F8FAFC', color: prio?.toLowerCase() === 'high' ? '#EF4444' : '#64748B', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' });
const cardTitleStyleMain = { fontSize: '14px', color: '#0F172A', marginTop: '5px', display: 'block', lineHeight: '1.4' };

const cardActions = { display: 'flex', gap: '8px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f1f5f9' };
const moveBtnPrimary = { flex: 1, padding: '8px', fontSize: '12px', cursor: 'pointer', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600' };
const finishBtn = { flex: 1, background: '#10B981', color: '#fff', border: 'none', padding: '8px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' };
const btnFocusSmall = { padding: '8px', fontSize: '12px', cursor: 'pointer', background: '#FFF7ED', color: '#EA580C', border: '1px solid #FFEDD5', borderRadius: '6px', fontWeight: '600', transition: 'background 0.2s', ':hover': {background: '#FFEDD5'} };
const moveBtnSecondary = { flex: 1, padding: '8px', fontSize: '11px', cursor: 'pointer', background: '#fff', color: '#64748B', border: '1px dashed #CBD5E1', borderRadius: '6px', fontWeight: '600' };

const effortWidget = { background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' };
const effortGrid = { display: 'flex', flexDirection: 'column', gap: '15px' };
const effortRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #f1f5f9' };
const badgeStatusOutline = (status) => ({ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', border: '1px solid #cbd5e1', color: '#64748b', display: 'inline-block', marginTop: '5px' });
const inputWrapper = { position: 'relative', width: '90px' };
const tableInputPremium = { width: '100%', padding: '10px 30px 10px 15px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#0F172A', outline: 'none', transition: 'border-color 0.2s' };
const btnSaveLog = { padding: '12px 24px', background: 'linear-gradient(135deg, #1B3A6B, #2563EB)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' };

const focusOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 };
const focusCardPro = { background: '#fff', padding: '40px', borderRadius: '24px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
const btnDuration = { padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '700', color: '#0F172A', cursor: 'pointer', transition: 'all 0.2s', ':hover': {background: '#f1f5f9'} };
const btnFocusCancelSetup = { width: '100%', marginTop: '20px', padding: '12px', background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer', fontWeight: '600' };
const btnFocusPrimary = { flex: 1, padding: '15px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' };
const btnFocusSecondary = { flex: 1, padding: '15px', background: '#f1f5f9', color: '#64748B', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' };

const headerCard = { flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', borderLeft: '5px solid #3B82F6' };
const headerCardTitle = { color: '#64748B', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', marginTop: 0 };

export default TMDashboard;