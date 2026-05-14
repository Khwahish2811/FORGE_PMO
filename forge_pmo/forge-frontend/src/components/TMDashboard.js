import React, { useState, useEffect, useCallback, useRef } from 'react';

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

  // Focus Mode State - Pro Version
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusPhase, setFocusPhase] = useState('setup'); // 'setup', 'active', 'completed', 'break'
  const [focusTask, setFocusTask] = useState(null);
  const [totalTime, setTotalTime] = useState(25 * 60); // Total selected duration
  const [timerLeft, setTimerLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [focusHistory, setFocusHistory] = useState({});
  const timerRef = useRef(null);

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
              sprint: item.sprint_name
            };
          }
        });
        const uniqueProjects = Object.values(projMap);
        setProjects(uniqueProjects);
      }
    } catch (err) { console.error("Fetch error:", err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projects[0].name);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (user) {
        fetchTasks();
        const interval = setInterval(() => { fetchTasks(); }, 30000);
        return () => clearInterval(interval);
    }
  }, [user, fetchTasks]);

  useEffect(() => {
    if (user && selectedProjectId) {
        fetchDashboardStats();
        const interval = setInterval(() => { fetchDashboardStats(); }, 30000);
        return () => clearInterval(interval);
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
          setFocusHistory({});
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
        showToast(`✅ Sprint is now ${newStatus}`, 'success');
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

  const utilization = stats.hours_today / (stats.daily_limit || 9);
  let wellnessStatus = 'Optimal';
  let wellnessColor = '#10B981';
  let wellnessMsg = "You're pacing perfectly for today.";
  if (utilization < 0.3 && stats.hours_today !== 0) { wellnessStatus = 'Under-utilized'; wellnessColor = '#3B82F6'; wellnessMsg = "Capacity available for more tasks."; }
  else if (utilization > 0.8) { wellnessStatus = 'At Risk of Burnout'; wellnessColor = '#EF4444'; wellnessMsg = "Approaching daily limit. Time to wrap up!"; }
  if (stats.hours_today === 0) { wellnessStatus = 'Fresh Start'; wellnessColor = '#8B5CF6'; wellnessMsg = "Ready to tackle the day!"; }

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

  return (
    <div style={layoutContainer}>
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
      {isFocusMode && focusTask && (
        <div style={focusOverlay}>
            <div style={focusCardPro}>
               {focusPhase === 'setup' && (
                   <>
                       <h2 style={{margin: '0 0 10px 0', color: '#1B3A6B'}}>🎯 Focus Session</h2>
                       <p style={{fontSize: '14px', color: '#64748b', marginBottom: '25px'}}>Select your focus duration for:<br/><b>{focusTask.task_title}</b></p>
                       <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                           <button onClick={() => startSession(15)} style={btnDuration}>⚡ Quick Fix <br/> <span style={{fontSize: '12px', fontWeight: 'normal'}}>15 min</span></button>
                           <button onClick={() => startSession(25)} style={{...btnDuration, background: '#EFF6FF', borderColor: '#3B82F6'}}>🧠 Deep Work <br/> <span style={{fontSize: '12px', fontWeight: 'normal'}}>25 min</span></button>
                           <button onClick={() => startSession(45)} style={btnDuration}>🔥 Hyper Focus <br/> <span style={{fontSize: '12px', fontWeight: 'normal'}}>45 min</span></button>
                           <button onClick={() => startSession(60)} style={btnDuration}>🌊 Flow State <br/> <span style={{fontSize: '12px', fontWeight: 'normal'}}>60 min</span></button>
                       </div>
                       <button onClick={() => setIsFocusMode(false)} style={btnFocusCancelSetup}>Cancel</button>
                   </>
               )}

               {(focusPhase === 'active' || focusPhase === 'break') && (
                   <>
                       <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                           <span style={{background: focusPhase === 'break' ? '#ECFDF5' : '#EFF6FF', color: focusPhase === 'break' ? '#10B981' : '#3B82F6', padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold'}}>
                               {focusPhase === 'break' ? '☕ Break Time' : '🧠 Focusing'}
                           </span>
                           {focusPhase === 'active' && <span style={{fontSize: '12px', color: '#64748B'}}>Priority: <b>{focusTask.priority}</b></span>}
                       </div>

                       {focusPhase === 'active' && <h3 style={{fontSize: '16px', margin: '0 0 20px 0', color: '#0F172A'}}>{focusTask.task_title}</h3>}

                       <div style={{position: 'relative', width: '220px', height: '220px', margin: '0 auto'}}>
                           <svg height="220" width="220" style={{transform: 'rotate(-90deg)'}}>
                              <circle stroke="#F1F5F9" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius+10} cy={radius+10} />
                              <circle
                                 stroke={focusPhase === 'break' ? '#10B981' : '#3B82F6'}
                                 fill="transparent"
                                 strokeWidth={stroke}
                                 strokeDasharray={circumference + ' ' + circumference}
                                 style={{strokeDashoffset, transition: 'stroke-dashoffset 1s linear'}}
                                 strokeLinecap="round"
                                 r={normalizedRadius} cx={radius+10} cy={radius+10}
                              />
                           </svg>
                           <div style={{position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
                               <span style={{fontSize: '48px', fontWeight: '800', color: '#0F172A', fontFamily: 'monospace', letterSpacing: '-2px'}}>{formatTime(timerLeft)}</span>
                           </div>
                       </div>

                       <div style={{display: 'flex', gap: '15px', marginTop: '30px'}}>
                          <button onClick={toggleTimer} style={btnFocusPrimary}>
                             {isTimerRunning ? '⏸ Pause' : '▶ Resume'}
                          </button>
                          {focusPhase === 'active' && (
                              <button onClick={logPartialTimeAndClose} style={btnFocusSecondary}>Stop & Log Time</button>
                          )}
                          {focusPhase === 'break' && (
                              <button onClick={() => setIsFocusMode(false)} style={btnFocusSecondary}>Skip Break</button>
                          )}
                       </div>
                   </>
               )}

               {focusPhase === 'completed' && (
                   <div style={{textAlign: 'center'}}>
                       <div style={{fontSize: '60px', margin: '0 0 10px 0'}}>🎉</div>
                       <h2 style={{color: '#10B981', margin: '0 0 10px 0'}}>Session Complete!</h2>
                       <p style={{color: '#64748B', fontSize: '14px', marginBottom: '30px'}}>Great job! You stayed focused for {Math.round(totalTime/60)} minutes.</p>
                       <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                           <button onClick={logPartialTimeAndClose} style={{...btnFocusPrimary, width: '100%'}}>💾 Log Time & Close</button>
                           <button onClick={() => { logPartialTimeAndClose(); startBreak(); setIsFocusMode(true); }} style={{...btnFocusSecondary, width: '100%', background: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0'}}>☕ Take a 5 min Break</button>
                       </div>
                   </div>
               )}
            </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={logoSection}><div style={logoCircle}>F</div><span style={logoText}>FORGE Workspace</span></div>

        <div style={sidebarScrollArea}>
            <div style={navGroup}>
                <p style={navLabel}>NAVIGATION</p>
                <div style={navItemActive}>⚡ My Dashboard</div>
            </div>
            <div style={navGroup}>
                <p style={navLabel}>MY PROJECTS</p>
                {projects.map(proj => (
                    <div key={proj.name} onClick={() => setSelectedProjectId(proj.name)} style={selectedProjectId === proj.name ? projectItemActive : projectItem}>
                        <span style={{marginRight: '8px', color: selectedProjectId === proj.name ? '#60A5FA' : '#cbd5e1'}}>●</span> 
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
               <h2 style={topTitleStyle}>Hello, {user} 👋</h2>
               <p style={{margin: 0, fontSize: '13px', color: '#64748B'}}>Here is your personalized workspace.</p>
            </div>
            <div style={userAvatarStyle}>{user?.charAt(0).toUpperCase()}</div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '25px', padding: '25px'}}>
           {/* SMART AGENDA */}
           <div style={premiumCard}>
              <h3 style={sectionTitlePremium}>🌟 Smart Agenda</h3>
              {urgentTask ? (
                  <div style={urgentTaskBox}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                         <div>
                            <span style={priorityTagHi}>High Priority</span>
                            <h4 style={{margin: '10px 0 5px 0', fontSize: '16px', color: '#0F172A'}}>{urgentTask.task_title}</h4>
                            <p style={{margin: 0, fontSize: '12px', color: '#64748B'}}>Due: <b>{urgentTask.due_date}</b> • {urgentTask.project_name}</p>
                         </div>
                         <button onClick={() => startFocusForTask(urgentTask)} style={btnFocusStart}>
                            🎯 Start Focus Mode
                         </button>
                      </div>
                  </div>
              ) : (
                  <div style={emptyStateBox}>🎉 No urgent tasks! You are all caught up.</div>
              )}
           </div>

           {/* WELLNESS GAUGE */}
           <div style={premiumCard}>
              <h3 style={sectionTitlePremium}>🔋 Wellness & Capacity</h3>
              <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginTop: '15px'}}>
                 <div style={{width: '100px', height: '100px', borderRadius: '50%', background: `conic-gradient(${wellnessColor} ${utilization * 100}%, #f1f5f9 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div style={{width: '75px', height: '75px', background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
                       <span style={{fontSize: '20px', fontWeight: 'bold', color: '#1e293b'}}>{stats.hours_today}h</span>
                    </div>
                 </div>
                 <div>
                    <h4 style={{margin: '0 0 5px 0', color: wellnessColor, fontSize: '18px'}}>{wellnessStatus}</h4>
                    <p style={{margin: 0, fontSize: '13px', color: '#64748B'}}>{wellnessMsg}</p>
                    <p style={{margin: '5px 0 0 0', fontSize: '12px', color: '#94A3B8'}}>Daily Limit: {stats.daily_limit}h</p>
                 </div>
              </div>
           </div>
        </div>

        {/* INTERACTIVE KANBAN */}
        <div style={{ padding: '0 25px 25px 25px' }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
             <h3 style={sectionTitlePremium}>🚀 Sprint Execution</h3>
          </div>

          {Object.keys(tasksBySprint).sort().map(sprintName => {
            const firstTask = tasksBySprint[sprintName][0];
            const sprintId = firstTask?.sprint_id;
            const sprintStatus = firstTask?.sprint_status || 'Planned';

            return (
              <div key={sprintName} style={{marginBottom: '40px'}}>
                <div style={sprintHeader}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                     <span style={{fontSize: '16px', fontWeight: 'bold', color: '#1B3A6B'}}>{sprintName}</span>
                     <span style={sprintBadge(sprintStatus)}>{sprintStatus}</span>
                  </div>
                  {sprintStatus === 'Planned' && (
                     <button onClick={() => updateSprintStatus(sprintId, 'In Progress')} style={btnStartSprint}>▶ Start Sprint</button>
                  )}
                </div>

              <div style={kanbanGrid}>
                {['To Do', 'In Progress', 'Done'].map(col => (
                  <div key={col} style={columnStyle}>
                    <div style={colTitleGroup}>
                        <span style={colTitle}>{col}</span>
                        <span style={colCount}>{tasksBySprint[sprintName].filter(t => t.status === col).length}</span>
                    </div>
                    <div style={cardListStyle}>
                    {tasksBySprint[sprintName].filter(t => t.status === col).map(task => (
                      <div key={task.id} style={cardStylePremium}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom: '8px', alignItems: 'center'}}>
                           <span style={tagStyle(task.priority)}>{task.priority}</span>
                           <small style={{color: '#94a3b8', fontSize: '10px'}}>#{task.id}</small>
                        </div>
                        <strong style={cardTitleStyleMain}>{task.task_title}</strong>
                        <div style={{fontSize: '11px', color: '#64748B', marginTop: '10px', display: 'flex', justifyContent: 'space-between'}}>
                           <span>📅 {task.due_date}</span>
                           <span>⏱ {task.hours_logged || 0}h logged</span>
                        </div>

                        <div style={cardActions}>
                            {task.status === 'To Do' && (
                                <button onClick={() => updateStatus(task.id, 'In Progress')} style={moveBtnPrimary}>Start Work</button>
                            )}
                            {task.status === 'In Progress' && (
                                <>
                                  <button onClick={() => startFocusForTask(task)} style={btnFocusSmall}>🎯 Focus</button>
                                  <button onClick={() => updateStatus(task.id, 'Done')} style={finishBtn}>Mark Done</button>
                                </>
                            )}
                            {task.status === 'Done' && (
                                <button onClick={() => updateStatus(task.id, 'In Progress')} style={moveBtnSecondary}>Re-open</button>
                            )}
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        </div>

        {/* MODERN EFFORT LOG WIDGET */}
        <div style={{ padding: '0 25px 50px 25px' }}>
            <div style={effortWidget}>
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                  <div>
                     <h3 style={{margin: '0 0 5px 0', color: '#1B3A6B', fontSize: '18px'}}>⏱ Daily Effort Log</h3>
                     <p style={{margin: 0, fontSize: '13px', color: '#64748b'}}>Log your hours against active tasks for today.</p>
                  </div>
                  <button onClick={saveDailyLog} style={btnSaveLog} disabled={loading}>
                      {loading ? 'Saving...' : '💾 Save Effort'}
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
                                      ⚡ Focused today: {taskHistory.map(h => `${h.mins}m (${h.type})`).join(' + ')} = {totalFocusMins}m total
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

export default TMDashboard;