import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, AreaChart, Area, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
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
  const [toastMessage, setToastMessage] = useState(null);
  const [isStartWorkingWorkflow, setIsStartWorkingWorkflow] = useState(false);
  const [tasksList, setTasksList] = useState([
    { title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' }
  ]);

  
  // --- NEW FEATURES STATES ---
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
      username: username, email: '', role: 'Project Manager', bio: '', phone: ''
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState(null);

  // --- RESOURCE ANALYTICS STATES ---
  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [expandedResource, setExpandedResource] = useState(null);

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

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedProjectForNote, setSelectedProjectForNote] = useState(null);
  const [updateNoteText, setUpdateNoteText] = useState('');

  const [showSprintModal, setShowSprintModal] = useState(false);
  const [selectedProjectForSprint, setSelectedProjectForSprint] = useState(null);
  const [sprintName, setSprintName] = useState('');
  const [sprintStartDate, setSprintStartDate] = useState('');
  const [sprintEndDate, setSprintEndDate] = useState('');

  const [stats, setStats] = useState({
    active_tasks: 0,
    due_this_week: 0,
    hours_today: 0,
    fte_score: 0,
    total_assigned: 0,
    pending_plans: 0,
    avg_completion: 0
  });

  // --- ALL FETCH FUNCTIONS MOVED TO TOP ---
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
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

  const fetchUserProfile = useCallback(async () => {
      try {
          const res = await fetch(`http://127.0.0.1:8000/api/get-user-profile/?username=${username}`);
          if (res.ok) setProfileData(await res.json());
      } catch (err) { console.error("Profile fetch error:", err); }
  }, [username]);

  const fetchNotifications = useCallback(async () => {
      try {
          const res = await fetch(`http://127.0.0.1:8000/api/get-notifications/?username=${username}`);
          if (res.ok) setNotifications(await res.json());
      } catch (err) { console.error("Notification fetch error:", err); }
  }, [username]);


  const fetchTeamPerformance = useCallback(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/get-team-performance/?username=${username}`);
      if (res.ok) setTeamPerformance(await res.json());
    } catch (err) { console.error("Performance fetch error:", err); }
  }, [username]);

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/get-all-resources/');
      if (res.ok) {
        const data = await res.json();
        setResources(data);
      }
    } catch (err) {
      console.error("Resources fetch error:", err);
    }
  }, []);


  const markRead = async () => {
      try {
          await fetch('http://127.0.0.1:8000/api/mark-notifications-read/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username })
          });
          setNotifications([]);
      } catch (err) { console.error("Mark read error:", err); }
  };

  const industryHeader = {
    display: 'flex',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '20px 0',
    marginBottom: '20px',
    width: '100%',
    justifyContent: 'space-around'
};

const industryStatItem = {
    flex: 1,
    padding: '0 40px',
    borderRight: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
};

const lastStatItem = {
    ...industryStatItem,
    borderRight: 'none'
};



  useEffect(() => {
    fetchData();
    fetchDashboardStats();
    fetchNotifications();
    fetchUserProfile();
    fetchTeamPerformance();
    fetchResources();
    const interval = setInterval(() => {
        fetchData(true);
        fetchDashboardStats();
        fetchNotifications();
        fetchTeamPerformance();
        fetchResources();
    }, 5000); // Auto refresh every 5 seconds
    const handleFocus = () => {
        fetchData(true);
        fetchDashboardStats();
        fetchNotifications();
        fetchUserProfile();
        fetchTeamPerformance();
        fetchResources();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData, fetchDashboardStats, fetchNotifications, fetchUserProfile, fetchTeamPerformance, fetchResources]);



  const handlePostNote = async () => {
    if (!updateNoteText.trim()) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/post-project-update-note/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedProjectForNote.id, note: updateNoteText })
      });
      if (res.ok) {
        showToast('Announcement note posted successfully!', 'success');
        setShowNoteModal(false);
        setUpdateNoteText('');
        fetchData(true);
      } else {
        showToast('Failed to post announcement.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server connection failed.', 'error');
    }
  };

  const handleAddSprint = async () => {
    if (!sprintName || !sprintStartDate || !sprintEndDate) {
      showToast('Please fill all sprint fields.', 'error');
      return;
    }

    // Verify timeline matches selected project's bounds
    if (selectedProjectForSprint) {
      const pStart = new Date(selectedProjectForSprint.start_date);
      const pEnd = new Date(selectedProjectForSprint.end_date);
      const sStart = new Date(sprintStartDate);
      const sEnd = new Date(sprintEndDate);

      if (sStart < pStart || sEnd > pEnd) {
        showToast(`Sprint dates must be within project timeline (${selectedProjectForSprint.start_date} to ${selectedProjectForSprint.end_date})`, 'error');
        return;
      }
      if (sStart > sEnd) {
        showToast('Sprint start date must be before end date.', 'error');
        return;
      }
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/api/request-additional-sprint/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectForSprint.id,
          name: sprintName,
          start_date: sprintStartDate,
          end_date: sprintEndDate
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Sprint request submitted for PGM approval!', 'success');
        setShowSprintModal(false);
        setSprintName('');
        setSprintStartDate('');
        setSprintEndDate('');
        fetchData(true);
      } else {
        showToast(data.error || 'Failed to submit sprint request.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server connection failed.', 'error');
    }
  };

  const toggleRow = (id) => {
    setExpandedProjectId(expandedProjectId === id ? null : id);
  };

  const handleBuildPlan = (pgm) => {
    setSelectedProgram(pgm);
    setShowProjectForm(true);
  };

  const handleStartWorking = async (pgm) => {
    setIsStartWorkingWorkflow(true);
    try {
      // Fetch active projects to get latest sprint and team data for the project
      const projRes = await fetch(`http://127.0.0.1:8000/api/get-active-projects/?username=${username}`);
      if (projRes.ok) {
        const projectsData = await projRes.json();
        setMyProjects(projectsData);
        
        const projObj = projectsData.find(p => p.id === pgm.project_id);
        if (projObj) {
          setActiveProjectForTask(projObj);
          setShowTaskModal(true);
        } else {
          setActiveProjectForTask({ id: pgm.project_id, name: pgm.name });
          setShowTaskModal(true);
        }
      } else {
        setActiveProjectForTask({ id: pgm.project_id, name: pgm.name });
        setShowTaskModal(true);
      }
    } catch (error) {
      console.error("Error setting up start working:", error);
      setActiveProjectForTask({ id: pgm.project_id, name: pgm.name });
      setShowTaskModal(true);
    }
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setTasksList([{ title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' }]);
    setIsStartWorkingWorkflow(false);
  };

  const handleCreateTasks = async (e) => {
    if (e) e.preventDefault();
    
    // Check fields for all tasks in tasksList
    for (let i = 0; i < tasksList.length; i++) {
      const task = tasksList[i];
      if (!task.title || !task.assigned_to || !task.sprint_id) {
        showToast(`Please fill all required fields for Task #${i + 1}!`, 'warning');
        return;
      }
    }
    
    try {
      // Create all tasks sequentially or concurrently
      const createPromises = tasksList.map(task =>
        fetch('http://127.0.0.1:8000/api/create-task/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            assigned_to: task.assigned_to,
            sprint_id: task.sprint_id,
            due_date: task.due_date,
            project_id: activeProjectForTask?.id,
            priority: task.priority || 'Medium',
            description: task.description || ''
          })
        })
      );
      
      const responses = await Promise.all(createPromises);
      const allOk = responses.every(res => res.ok);
      
      if (allOk) {
        if (isStartWorkingWorkflow) {
          // Send request to transition project status to In Progress
          const startRes = await fetch('http://127.0.0.1:8000/api/start-project-execution/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: activeProjectForTask?.id })
          });
          const startData = await startRes.json();
          if (startData.success) {
            showToast('Project execution started with tasks created!', 'success');
          } else {
            showToast('Tasks created, but failed to start execution: ' + startData.error, 'warning');
          }
        } else {
          showToast(`${tasksList.length} task(s) created successfully!`, 'success');
        }
        
        setShowTaskModal(false);
        setTasksList([{ title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' }]);
        setIsStartWorkingWorkflow(false);
        fetchData(true);
      } else {
        showToast('Failed to create one or more tasks.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection failed. Check your server.', 'error');
    }
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
      console.error("Tracker error:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDownloadReport = () => {
    if (!selectedProgramStats) return;
    
    // Create CSV content
    let csv = "Program Name,Project Manager,Overall Progress,Total Tasks,Completed Tasks,Team Members\n";
    csv += `"${selectedProgramStats.program_name}","${selectedProgramStats.pm_name}",${selectedProgramStats.overall_progress}%,${selectedProgramStats.total_tasks},${selectedProgramStats.completed_tasks},${selectedProgramStats.team_count}\n\n`;
    
    csv += "Sprint Name,Completion %\n";
    selectedProgramStats.velocity_data.forEach(s => {
      csv += `"${s.name}",${s.completion}%\n`;
    });
    
    csv += "\nRecent Activity Log\n";
    csv += "User,Sprint,Task,Due Date,Status\n";
    selectedProgramStats.recent_logs.forEach(log => {
      csv += `"${log.user}","${log.sprint}","${log.task_name}","${log.due_date}","${log.status}"\n`;
    });

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

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };








  const addMemberRow = () => setProjectData({ ...projectData, team: [...projectData.team, { userId: '', fte: 1.0, role: 'Dev' }] });
  const removeMemberRow = (index) => setProjectData({ ...projectData, team: projectData.team.filter((_, i) => i !== index) });
  const addSprintRow = () => {
    const nextSprintNum = projectData.sprints.length + 1;
    setProjectData({ ...projectData, sprints: [...projectData.sprints, { name: `Sprint ${nextSprintNum}`, start_date: '', end_date: '' }] });
  };
  const removeSprintRow = (index) => setProjectData({ ...projectData, sprints: projectData.sprints.filter((_, i) => i !== index) });
  const handleInputChange = (field, value) => setProjectData({ ...projectData, [field]: value });
  const handleMemberChange = (index, field, value) => {
    const newTeam = [...projectData.team];
    newTeam[index][field] = field === 'userId' ? (value ? Number(value) : '') : field === 'fte' ? (value ? parseFloat(value) : 0.0) : value;
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
        showToast(' Project plan submitted successfully!', 'success');
        setShowProjectForm(false);
        setProjectData({ name: '', description: '', start_date: '', end_date: '', priority: 'Medium', team: [{ userId: '', fte: 1.0, role: 'Dev' }], sprints: [{ name: 'Sprint 1', start_date: '', end_date: '' }] });
        fetchData();
      }
    } catch (err) { showToast(' Connection failed. Check your server.', 'error'); }
  };

  const getSmartInsights = () => {
    let overloaded = [];
    let available = [];
    let atRiskProjects = [];
    const userTaskCounts = {};

    myProjects.forEach(project => {
      if (project.total_tasks === 0 && (project.status === 'Active' || project.status === 'In Progress' || project.status === 'Approved')) {
        atRiskProjects.push(project.name);
      }
      if (project.team_members) {
        project.team_members.forEach(m => {
          if (!userTaskCounts[m.username]) userTaskCounts[m.username] = 0;
          userTaskCounts[m.username] += (m.task_count || 0);
        });
      }
    });

    Object.entries(userTaskCounts).forEach(([username, count]) => {
      if (count === 0) available.push(username);
      if (count > 5) overloaded.push(username);
    });

    return { overloaded, available, atRiskProjects };
  };
  const insights = getSmartInsights();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7fa', fontFamily: 'Segoe UI, sans-serif' }}>
      
      {/* PROFILE MODAL */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', width: '450px', borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.3)', position: 'relative', animation: 'modalSlideUp 0.4s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
                    <h2 style={{ margin: 0, color: '#1B3A6B' }}>User Profile</h2>
                    <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}>✕</button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #1B3A6B, #3B82F6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(27,58,107,0.4)' }}>
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

      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '30px',
          right: '30px',
          background: toastMessage.type === 'error' ? '#ef4444' : toastMessage.type === 'warning' ? '#f59e0b' : '#10b981',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '10px',
          boxShadow: toastMessage.type === 'error' ? '0 10px 25px -5px rgba(239,68,68,0.4)' : toastMessage.type === 'warning' ? '0 10px 25px -5px rgba(245,158,11,0.4)' : '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
          zIndex: 9999,
          fontWeight: '600',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {toastMessage.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={logoBox}>F FORGE</div>
        <div style={sbSecTitle}>Navigation</div>
        <div style={{ ...sbItem, backgroundColor: activeTab === 'assignments' ? '#2563EB' : 'transparent', color: '#fff' }} onClick={() => { setActiveTab('assignments'); setShowProjectForm(false); }}>My Assignments</div>
        <div style={{ ...sbItem, backgroundColor: activeTab === 'execution' ? '#2563EB' : 'transparent', color: '#fff' }} onClick={() => { setActiveTab('execution'); setShowProjectForm(false); }}>Project Execution</div>
        <div style={{ ...sbItem, backgroundColor: activeTab === 'working_programs' ? '#2563EB' : 'transparent', color: '#fff' }} onClick={() => { setActiveTab('working_programs'); setShowProjectForm(false); }}>Working Programs</div>
        <div style={{ ...sbItem, backgroundColor: activeTab === 'performance' ? '#2563EB' : 'transparent', color: '#fff' }} onClick={() => { setActiveTab('performance'); setShowProjectForm(false); }}>Team Performance</div>
        <div style={{ ...sbItem, backgroundColor: activeTab === 'resource_analytics' ? '#2563EB' : 'transparent', color: '#fff' }} onClick={() => { setActiveTab('resource_analytics'); setShowProjectForm(false); }}>Resource Analytics</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '220px' }}>
        {/* HEADER */}
        <div style={headerStyle}>
          <span style={{ fontWeight: 700, color: '#1B3A6B' }}>Project Manager Dashboard</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            
            {/* NOTIFICATION BELL */}
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markRead(); }}>
                <span style={{ fontSize: '22px' }}></span>
                {notifications.length > 0 && (
                    <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', fontSize: '10px', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid #fff' }}>
                        {notifications.length}
                    </span>
                )}
                
                {/* NOTIFICATION DROPDOWN */}
                {showNotifications && (
                    <div style={{ position: 'absolute', top: '40px', right: '0', width: '300px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden' }}>
                        <div style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#1B3A6B', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Notifications</span>
                            <span onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} style={{ cursor: 'pointer' }}>✕</span>
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {notifications.length > 0 ? notifications.map(n => (
                                <div key={n.id} style={{ padding: '12px 15px', borderBottom: '1px solid #f8fafc', fontSize: '12px', color: '#475569' }}>
                                    <div>{n.message}</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>{n.created_at}</div>
                                </div>
                            )) : <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No new notifications</div>}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setShowProfileModal(true)}>
                <span style={{ fontSize: '12px' }}>Welcome, <b>{username}</b></span>
                <div style={{ ...userCircleStyle, background: 'linear-gradient(135deg, #1B3A6B, #3B82F6)', color: '#fff', fontWeight: 'bold' }}>
                    {username?.charAt(0).toUpperCase() || 'U'}
                </div>
            </div>
            <button onClick={onLogout} style={logoutBtnStyle}>LOGOUT</button>
          </div>
        </div>


        <div style={{ padding: '25px', overflowY: 'auto' }}>
            <>
              {activeTab === 'performance' && (
                <div style={{ padding: '20px' }}>
                  <h3 style={sectionTitle}> Team Performance Leaderboard</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                    {teamPerformance.slice(0, 3).map((member, idx) => (
                      <div key={idx} style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', padding: '20px', borderRadius: '15px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: '0.1' }}>{idx === 0 ? '' : idx === 1 ? '' : ''}</div>
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
                                    <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#F1F5F9', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{member.username.charAt(0).toUpperCase()}</div>
                                    <div>
                                       <div style={{ fontWeight: 'bold', color: '#1B3A6B' }}>{member.username}</div>
                                       <div style={{ fontSize: '11px', color: '#64748B' }}>{member.full_name}</div>
                                    </div>
                                 </div>
                              </td>
                              <td style={tdStyle}>{member.total_projects}</td>
                              <td style={tdStyle}>
                                 <span style={{ color: member.total_fte > 1.5 ? '#EF4444' : '#10B981', fontWeight: 'bold' }}>{member.total_fte.toFixed(1)}</span>
                              </td>
                              <td style={tdStyle}>
                                 <div style={{ fontSize: '12px' }}>{member.completed_tasks}/{member.total_tasks} Tasks</div>
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
                                 <button onClick={() => setSelectedMemberDetail(member)} style={{ ...primBtn, padding: '6px 12px', fontSize: '11px' }}>View Details</button>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}


        {/* RESOURCE PERFORMANCE & ANALYTICS OPERATION VIEW */}
        {activeTab === 'resource_analytics' && (
          <div style={{ padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1B3A6B', fontSize: '20px', fontWeight: '800' }}> Resource Analytics & Performance Operations</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Real-time oversight of Program Managers, Project Managers, and Team Members.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder=" Search resources..." 
                  style={{ ...inp, width: '220px', padding: '8px 12px', height: '36px', boxSizing: 'border-box' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select 
                  style={{ ...inp, width: '150px', padding: '8px 12px', height: '36px', boxSizing: 'border-box' }}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="PGM">Program Managers</option>
                  <option value="PM">Project Managers</option>
                  <option value="TM">Team Members</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left', borderLeft: '5px solid #2563EB', cursor: 'default' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Total Team Size</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#1B3A6B' }}>{resources.length}</div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Registered workforce</span>
              </div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left', borderLeft: '5px solid #10B981', cursor: 'default' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Avg Utilization</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#10B981' }}>
                  {resources.filter(r => r.role === 'TM').length > 0 ? (resources.filter(r => r.role === 'TM').reduce((sum, r) => sum + r.assigned_fte, 0) / resources.filter(r => r.role === 'TM').length * 100).toFixed(1) : 0}%
                </div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Active workload capacity</span>
              </div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left', borderLeft: '5px solid #F59E0B', cursor: 'default' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Underutilized staff</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#F59E0B' }}>
                  {resources.filter(r => r.role === 'TM' && r.assigned_fte < 0.5).length}
                </div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>FTE allocation under 0.5</span>
              </div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left', borderLeft: '5px solid #EF4444', cursor: 'default' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Hire Alerts</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#EF4444' }}>
                  {resources.filter(r => r.assigned_fte > 1.0).length > 0 ? `${resources.filter(r => r.assigned_fte > 1.0).length} Overloaded` : '0 Gaps'}
                </div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Resources exceeding 1.0 FTE</span>
              </div>
            </div>

            {resources.filter(r => r.assigned_fte > 1.0).length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                border: '1px solid #fca5a5',
                borderLeft: '5px solid #ef4444',
                padding: '15px 20px',
                borderRadius: '12px',
                marginBottom: '25px',
                boxShadow: '0 4px 6px rgba(239,68,68,0.05)'
              }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#991b1b', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   Critical Capacity & Hiring Demand Alerts
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {resources.filter(r => r.assigned_fte > 1.0).map((r, idx) => (
                    <div key={idx} style={{ fontSize: '12px', color: '#7f1d1d', fontWeight: '600' }}>
                      • Overload Alert: <b>{r.username}</b> (FTE <b>{r.assigned_fte}</b>) is currently overloaded! We recommend immediate hiring or reallocation of a new <b>{r.role_display}</b> resource to optimize program health.
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#1e293b' }}> Planned vs Logged FTE Workload</h4>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resources.filter(r => r.role === 'TM')}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="username" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                      <Bar dataKey="assigned_fte" name="Planned Assigned FTE" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="calculated_fte" name="Calculated Effort FTE" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#1e293b' }}> Top Resource Performance Analytics</h4>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resources.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="username" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                      <Bar dataKey="performance_score" name="Performance Score" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={tableContainer}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadStyle}>
                    <th style={thStyle}>Resource Name</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Assigned FTE</th>
                    <th style={thStyle}>Calculated FTE</th>
                    <th style={thStyle}>Task Progress</th>
                    <th style={thStyle}>Utilization Status</th>
                    <th style={thStyle}>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.filter(r => {
                    const matchesSearch = r.username.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesRole = roleFilter === 'All' || r.role === roleFilter;
                    return matchesSearch && matchesRole;
                  }).map((r) => {
                    const isExpanded = expandedResource === r.username;
                    const completionRate = r.completion_rate;
                    
                    return (
                      <React.Fragment key={r.username}>
                        <tr style={{ ...trStyle, cursor: 'pointer', backgroundColor: isExpanded ? '#f8fafc' : 'transparent' }} onClick={() => setExpandedResource(isExpanded ? null : r.username)}>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                {r.username.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span style={{ fontWeight: 'bold', color: '#1E293B', textDecoration: 'underline' }}>{r.username}</span>
                                <div style={{ fontSize: '10px', color: '#64748B' }}>{r.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                              {r.role_display}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 'bold', color: '#1E40AF' }}>{r.assigned_fte.toFixed(2)} FTE</span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 'bold', color: '#10B981' }}>{r.calculated_fte.toFixed(2)} FTE</span>
                          </td>
                          <td style={{ ...tdStyle, width: '150px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${completionRate}%`, height: '100%', background: '#8B5CF6' }}></div>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>{Math.round(completionRate)}%</span>
                            </div>
                            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{r.completed_tasks}/{r.total_tasks} Tasks Completed</div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                              backgroundColor: r.utilization_status === 'Overutilized' ? '#FEE2E2' : r.utilization_status === 'Optimal' ? '#DCFCE7' : r.utilization_status === 'Underutilized' ? '#FEF3C7' : '#E0F2FE',
                              color: r.utilization_status === 'Overutilized' ? '#991B1B' : r.utilization_status === 'Optimal' ? '#166534' : r.utilization_status === 'Underutilized' ? '#92400E' : '#0369A1'
                            }}>
                              {r.utilization_status.toUpperCase()}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ background: '#F5F3FF', color: '#5B21B6', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                               {r.performance_score}
                            </span>
                          </td>
                        </tr>
                        
                        {isExpanded && (
                          <tr>
                            <td colSpan="7" style={{ padding: '15px 25px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                                <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                  <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#1B3A6B', fontWeight: 'bold' }}> Active Project Assignments</h5>
                                  {r.active_projects.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                      {r.active_projects.map((projName, idx) => (
                                        <span key={idx} style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #BFDBFE' }}>
                                           {projName}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No active project assignments. Ready for tasking!</span>
                                  )}
                                </div>
                                <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                  <h5 style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#1B3A6B', fontWeight: 'bold' }}> Bio & Profile Notes</h5>
                                  <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>{r.bio || "No biography provided. Contact staff directly for portfolio or capability details."}</p>
                                  {r.phone && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}> Phone: <b>{r.phone}</b></div>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

              {activeTab === 'execution' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1B3A6B' }}>Project Execution & Task Management</h3>
                  </div>

                  {/* SMART INSIGHTS PANEL */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '15px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}> Available Bandwidth</h4>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1B3A6B' }}>
                        {insights.available.length > 0 ? (
                          <span>Ready for tasks: <span style={{ color: '#10b981' }}>{insights.available.join(', ')}</span></span>
                        ) : <span style={{ color: '#64748b' }}>Everyone is currently assigned tasks.</span>}
                      </div>
                    </div>
                    
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '15px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}> Overload Warning</h4>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1B3A6B' }}>
                        {insights.overloaded.length > 0 ? (
                          <span>High workload detected: <span style={{ color: '#ef4444' }}>{insights.overloaded.join(', ')}</span></span>
                        ) : <span style={{ color: '#64748b' }}>Team workload is perfectly balanced.</span>}
                      </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: '12px', padding: '15px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}> Project Health</h4>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1B3A6B' }}>
                        {insights.atRiskProjects.length > 0 ? (
                          <span>0 Tasks in: <span style={{ color: '#f59e0b' }}>{insights.atRiskProjects.join(', ')}</span></span>
                        ) : <span style={{ color: '#64748b' }}>All active projects have executing tasks.</span>}
                      </div>
                    </div>
                  </div>

                  <div style={tableContainer}>
                    <table style={tableStyle}>
                      <thead style={theadStyle}>
                        <tr><th style={thStyle}>PROJECT NAME</th><th style={thStyle}>PROJECT FTE</th><th style={thStyle}>TEAM WORKLOAD</th><th style={thStyle}>STATUS</th><th style={thStyle}>TASK ACTION</th></tr>
                      </thead>
                      <tbody>
                        {myProjects.map((project) => (
                          <React.Fragment key={project.id}>
                            <tr style={trStyle}>
                              <td style={tdStyle}><span onClick={() => toggleRow(project.id)} style={{ cursor: 'pointer', color: '#2563EB', textDecoration: 'underline' }}><b>{project.name}</b> {expandedProjectId === project.id ? '' : ''}</span></td>
                              <td style={tdStyle}>
                                <span style={{
                                  background: '#EFF6FF',
                                  color: '#1E40AF',
                                  padding: '5px 12px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  border: '1px solid #BFDBFE',
                                  display: 'inline-block'
                                }}>
                                  {(project.team_members || []).reduce((sum, m) => sum + parseFloat(m.fte || 0), 0).toFixed(2)} FTE
                                </span>
                              </td>
                              <td style={tdStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                  {project.team_members && project.team_members.length > 0 ? (
                                    project.team_members.map((m, idx) => {
                                      const isOverloaded = (m.task_count || 0) > 5;
                                      const nameParts = m.username.split('_');
                                      const initials = nameParts.length > 1
                                        ? (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase()
                                        : m.username.substring(0, 2).toUpperCase();
                                      const shortLabel = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1, 5) + '-' + (idx + 1);
                                      return (
                                      <div key={idx} title={`${m.username}: ${m.task_count || 0} Task(s)`} style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px'
                                      }}>
                                        <div style={{
                                          position: 'relative', width: '34px', height: '34px', borderRadius: '50%',
                                          background: isOverloaded ? 'linear-gradient(135deg,#fee2e2,#fca5a5)' : 'linear-gradient(135deg,#e0e7ff,#c7d2fe)',
                                          border: isOverloaded ? '2px solid #ef4444' : '2px solid #6366f1',
                                          display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '10px', fontWeight: '800',
                                          color: isOverloaded ? '#991b1b' : '#3730a3', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                        }}>
                                          {initials}
                                          <div style={{
                                            position: 'absolute', top: '-5px', right: '-5px',
                                            background: isOverloaded ? '#ef4444' : '#2563EB', color: '#fff',
                                            fontSize: '9px', width: '16px', height: '16px', borderRadius: '50%',
                                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                                            border: '1.5px solid #fff', fontWeight: 'bold'
                                          }}>
                                            {m.task_count || 0}
                                          </div>
                                        </div>
                                        <span style={{ fontSize: '9px', color: isOverloaded ? '#ef4444' : '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                          {shortLabel}
                                        </span>
                                      </div>
                                    )})
                                  ) : (
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>No Team</span>
                                  )}
                                </div>
                              </td>
                             <td style={tdStyle}>
  <span style={{
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: (project.status === 'Active' || project.status === 'Approved' || project.status === 'In Progress') ? '#dcfce7' : '#fef3c7',
    color: (project.status === 'Active' || project.status === 'Approved' || project.status === 'In Progress') ? '#15803d' : '#92400e',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  }}>
    {project.status === 'In Progress' ? <><span className="pulse-dot"></span> IN PROGRESS</> : project.status.toUpperCase()}
  </span>
</td>
                              <td style={tdStyle}>
                                {/* Active or Approved or In Progress */}
                                {(project.status === 'Active' || project.status === 'Approved' || project.status === 'In Progress') ? (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => {
                                        setIsStartWorkingWorkflow(false);
                                        setTasksList([{ title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' }]);
                                        setActiveProjectForTask(project);
                                        setShowTaskModal(true);
                                      }}
                                      style={{ ...primBtn, padding: '6px 12px', fontSize: '11px' }}
                                    >
                                      + Create Task
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedProjectForNote(project);
                                        setShowNoteModal(true);
                                      }}
                                      style={{ ...primBtn, backgroundColor: '#4f46e5', padding: '6px 12px', fontSize: '11px' }}
                                    >
                                      Update Note
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedProjectForSprint(project);
                                        setShowSprintModal(true);
                                      }}
                                      style={{ ...primBtn, backgroundColor: '#0891b2', padding: '6px 12px', fontSize: '11px' }}
                                    >
                                      Add Sprint
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>Waiting Approval</span>
                                )}
                              </td>
                            </tr>
                            {expandedProjectId === project.id && (
                              <tr>
                                <td colSpan="5" style={{ padding: '20px', backgroundColor: '#f8fafc' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div style={innerCardStyle}>
                                      <h5 style={innerTitleStyle}> Project Team</h5>
                                      <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'linear-gradient(135deg, #1B3A6B, #2563EB)',
                                        color: '#fff',
                                        padding: '12px 18px',
                                        borderRadius: '10px',
                                        marginBottom: '15px',
                                        boxShadow: '0 4px 12px rgba(37,99,235,0.15)'
                                      }}>
                                        <div>
                                          <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.8, fontWeight: '800', letterSpacing: '0.5px' }}>Project FTE</div>
                                          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px' }}>
                                            {(project.team_members || []).reduce((sum, m) => sum + parseFloat(m.fte || 0), 0).toFixed(2)} FTE
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.8, fontWeight: '800', letterSpacing: '0.5px' }}>Team Capacity</div>
                                          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '2px' }}>
                                            {project.team_members?.length || 0} Members Allocated
                                          </div>
                                        </div>
                                      </div>
                                      <table style={miniTableStyle}>
                                        <thead><tr style={miniTheadStyle}><th style={miniThStyle}>Member</th><th style={miniThStyle}>Role</th><th style={miniThStyle}>FTE</th><th style={miniThStyle}>Tasks</th></tr></thead>
                                        <tbody>
                                          {project.team_members?.map((m, idx) => (
                                            <tr key={idx} style={miniTrStyle}><td style={miniTdStyle}>{m.username}</td><td style={miniTdStyle}>{m.role}</td><td style={miniTdStyle}>{m.fte}</td><td style={miniTdStyle}><span style={{background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold'}}>{m.task_count || 0}</span></td></tr>
                                          )) || <tr><td colSpan="4">No members</td></tr>}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div style={innerCardStyle}>
                                      <h5 style={innerTitleStyle}> Sprint Timeline</h5>
                                      <table style={miniTableStyle}>
                                        <thead><tr style={miniTheadStyle}><th style={miniThStyle}>Sprint</th><th style={miniThStyle}>Duration</th><th style={miniThStyle}>Status</th></tr></thead>
                                        <tbody>
                                          {project.sprints?.map((s, idx) => {
                                            const sColor = getStatusColor(s.end_date);
                                            let statusBadge = null;
                                            if (s.status === 'Pending Approval') {
                                              statusBadge = <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Pending Approval</span>;
                                            } else if (s.status === 'Returned') {
                                              statusBadge = <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Returned</span>;
                                            } else {
                                              statusBadge = <span style={{ backgroundColor: sColor === '#ef4444' ? '#fee2e2' : '#DCFCE7', color: sColor, padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{sColor === '#ef4444' ? 'Overdue' : 'On Track'}</span>;
                                            }
                                            return (
                                              <tr key={idx} style={miniTrStyle}>
                                                <td style={miniTdStyle}>{s.name}</td>
                                                <td style={miniTdStyle}>{s.start_date} to {s.end_date}</td>
                                                <td style={miniTdStyle}>{statusBadge}</td>
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
                            <td style={tdStyle}>{pgm.manager_name || 'System Assigned'}</td>
                                                       <td style={tdStyle}>
    <button
        onClick={() => {
            if (pgm.status_label === 'Approved') {
                handleStartWorking(pgm);
            } else {
                handleBuildPlan(pgm);
            }
        }}
        style={{
            ...primBtn,
            backgroundColor: pgm.status_label === 'Approved' ? '#10b981' : '#2563eb',
            opacity: pgm.status_label === 'Build Plan' || pgm.status_label === 'Rejected' || pgm.status_label === 'Returned' || pgm.status_label === 'Approved' ? 1 : 0.7,
            cursor: pgm.status_label === 'Build Plan' || pgm.status_label === 'Rejected' || pgm.status_label === 'Returned' || pgm.status_label === 'Approved' ? 'pointer' : 'not-allowed'
        }}
        disabled={pgm.status_label === 'Waiting' || pgm.status_label === 'In Progress'}
    >
        {/* ... */}
        {pgm.status_label === 'Build Plan' ? '+ Build Plan' :
         pgm.status_label === 'Waiting' ? ' Waiting' :
         pgm.status_label === 'Approved' ? ' Start Working' :
         pgm.status_label === 'In Progress' ? ' In Progress' :
         pgm.status_label === 'Rejected' ? ' Rejected (Re-build)' :
         pgm.status_label === 'Returned' ? ' Returned (Update Plan)' : pgm.status_label}
    </button>
    {pgm.status_label === 'Returned' && pgm.return_note && (
        <div style={{ marginTop: '5px', fontSize: '11px', color: '#991b1b', background: '#fee2e2', padding: '6px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
            <strong>Note from Manager:</strong> {pgm.return_note}
        </div>
    )}
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
                  <h3 style={sectionTitle}> Programs Currently in Execution</h3>
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
                                  <span style={{ backgroundColor: bg, color: color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                                    {label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td style={tdStyle}><button onClick={() => handleLiveTrack(pgm.id)} style={{ ...primBtn, padding: '6px 12px', fontSize: '12px', backgroundColor: '#8b5cf6' }}>Live Track </button></td>
                          </tr>
                        )) : (<tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No programs in execution.</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
      {/* REDESIGNED PROJECT SETUP (BUILD PLAN) MODAL */}
      {showProjectForm && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '800px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            {/* Header */}
            <div style={{ background: '#1B3A6B', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Setup Project: {selectedProgram?.name}</h3>
              <button onClick={() => setShowProjectForm(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={handleSubmitPlan} style={{ padding: '30px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}> Project Name</label>
                  <input style={{...inp, padding: '12px', borderRadius: '8px'}} required value={projectData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="e.g., Marketing Campaign Q3" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}> Description</label>
                  <textarea style={{ ...inp, minHeight: '80px', padding: '12px', borderRadius: '8px', resize: 'none' }} value={projectData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Briefly describe the project objectives..." />
                </div>
                <div>
                    <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}> Start Date</label>
                    <input type="date" style={{...inp, padding: '12px', borderRadius: '8px'}} required 
                        min={selectedProgram?.start_date} max={selectedProgram?.end_date}
                        value={projectData.start_date} onChange={(e) => handleInputChange('start_date', e.target.value)} 
                    />
                    <small style={{color: '#64748b', fontSize: '10px'}}>Program Start: {selectedProgram?.start_date}</small>
                </div>
                <div>
                    <label style={{ ...lbl, fontSize: '13px', color: '#1B3A6B' }}> End Date</label>
                    <input type="date" style={{...inp, padding: '12px', borderRadius: '8px'}} required 
                        min={selectedProgram?.start_date} max={selectedProgram?.end_date}
                        value={projectData.end_date} onChange={(e) => handleInputChange('end_date', e.target.value)} 
                    />
                    <small style={{color: '#64748b', fontSize: '10px'}}>Program End: {selectedProgram?.end_date}</small>
                </div>
              </div>

              {/* Resource Allocation Section */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                <h4 style={{ color: '#1B3A6B', marginTop: 0, fontSize: '15px', marginBottom: '15px' }}> Resource Allocation</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{...miniThStyle, padding: '10px', textAlign: 'left'}}>Member</th>
                        <th style={{...miniThStyle, padding: '10px', textAlign: 'left'}}>Role</th>
                        <th style={{...miniThStyle, padding: '10px', textAlign: 'left'}}>FTE</th>
                        <th style={{width: '40px'}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectData.team.map((m, idx) => (
                        <tr key={idx}>
                          <td style={{padding: '5px'}}>
                            <select style={{...inp, margin: 0, padding: '8px'}} value={m.userId} onChange={(e) => handleMemberChange(idx, 'userId', e.target.value)}>
                              <option value="">Select Member</option>
                              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.username}</option>)}
                            </select>
                          </td>
                          <td style={{padding: '5px'}}><input style={{...inp, margin: 0, padding: '8px'}} value={m.role} onChange={(e) => handleMemberChange(idx, 'role', e.target.value)} placeholder="e.g. Lead" /></td>
                          <td style={{padding: '5px'}}><input type="number" step="0.1" style={{...inp, margin: 0, padding: '8px'}} value={m.fte} onChange={(e) => handleMemberChange(idx, 'fte', e.target.value)} /></td>
                          <td style={{padding: '5px', textAlign: 'center'}}><button type="button" onClick={() => removeMemberRow(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={addMemberRow} style={{ ...secBtn, marginTop: '12px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', fontSize: '12px' }}>+ Add Team Member</button>
              </div>

              {/* Sprints Section */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                <h4 style={{ color: '#1B3A6B', marginTop: 0, fontSize: '15px', marginBottom: '15px' }}> Sprints</h4>
                {projectData.sprints.map((s, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 40px', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                    <input style={{...inp, margin: 0, padding: '8px'}} value={s.name} onChange={(e) => handleSprintChange(idx, 'name', e.target.value)} placeholder="Sprint Name" />
                    <input type="date" style={{...inp, margin: 0, padding: '8px'}} 
                        min={projectData.start_date} max={projectData.end_date}
                        value={s.start_date} onChange={(e) => handleSprintChange(idx, 'start_date', e.target.value)} 
                    />
                    <input type="date" style={{...inp, margin: 0, padding: '8px'}} 
                        min={projectData.start_date} max={projectData.end_date}
                        value={s.end_date} onChange={(e) => handleSprintChange(idx, 'end_date', e.target.value)} 
                    />
                    <button type="button" onClick={() => removeSprintRow(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={addSprintRow} style={{ ...secBtn, marginTop: '12px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', fontSize: '12px' }}>+ Add Sprint</button>
              </div>

              {/* Submit Actions */}
              <div style={{ borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '20px' }}>
                <button type="button" onClick={() => setShowProjectForm(false)} style={{ ...secBtn, padding: '10px 20px', fontWeight: '600', borderRadius: '8px' }}>Cancel</button>
                <button type="submit" style={{ ...primBtn, padding: '10px 30px', background: '#10B981', fontWeight: '600', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>Submit Project Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* LIVE TRACKER MODAL - MATCHING PGM DESIGN */}
      {showTrackerModal && selectedProgramStats && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '900px', maxHeight: '90vh', overflowY: 'auto', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1B3A6B' }}>Live Tracker: {selectedProgramStats.program_name}</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Tracking real-time execution for Manager: <b>{selectedProgramStats.pm_name}</b></p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  onClick={handleDownloadReport} 
                  style={{ ...secBtn, background: '#10b981', color: '#fff', border: 'none', padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                   Download Report
                </button>
                <button onClick={() => setShowTrackerModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
            </div>

            {/* Real-time Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
              <div style={chartContainer}>
                <h4 style={chartHeader}>Sprint Progress Velocity</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={selectedProgramStats.velocity_data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="completion" stroke="#2563EB" strokeWidth={3} dot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={chartContainer}>
                <h4 style={chartHeader}>Task Distribution</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={selectedProgramStats.task_distribution || []}
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
                  <span><i style={{ display: 'inline-block', width: '10px', height: '10px', background: '#10B981', marginRight: '5px', borderRadius: '50%' }}></i> Done</span>
                  <span><i style={{ display: 'inline-block', width: '10px', height: '10px', background: '#f59e0b', marginRight: '5px', borderRadius: '50%' }}></i> Doing</span>
                  <span><i style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', marginRight: '5px', borderRadius: '50%' }}></i> Todo</span>
                </div>
              </div>
            </div>

            {/* Program Gran Tracker */}
            <div style={{ width: '100%', marginTop: '25px', padding: '20px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h5 style={{ marginBottom: '15px', fontWeight: 'bold', color: '#1e293b' }}> Program Gran Tracker</h5>
              {selectedProgramStats?.gantt_data?.length > 0 ? (
                <div style={{ width: '100%', overflowX: 'auto', background: '#fff' }}>
                  <Gantt
                    tasks={selectedProgramStats.gantt_data.map(t => {
                      let sDate = new Date(t.start);
                      if (isNaN(sDate)) sDate = new Date();
                      let eDate = new Date(t.end);
                      if (isNaN(eDate)) eDate = new Date(new Date().getTime() + 86400000);
                      return {
                        id: String(t.id),
                        name: t.name || "Task",
                        start: sDate,
                        end: eDate,
                        progress: t.progress || 0,
                        type: 'task',
                        styles: { progressColor: '#1B3A6B', progressSelectedColor: '#2563EB' },
                      };
                    })}
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
            </div>

            {/* --- Real-time Project Breakdown Section (NEW addition for all dashboards) --- */}
            <div style={{ marginTop: '25px', padding: '20px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <h5 style={{ marginBottom: '15px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     Real-Time Project Execution Status
                    <span className="pulse-dot" style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                </h5>
                
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Project Name</th>
                                <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Current Sprint & Due Date</th>
                                <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Last Task Worked On</th>
                                <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Last Active Developer</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Effort</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedProgramStats.projects_breakdown && selectedProgramStats.projects_breakdown.length > 0 ? (
                                selectedProgramStats.projects_breakdown.map((proj, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s hover' }} className="activity-card">
                                        {/* Project Name & Status */}
                                        <td style={{ padding: '15px 10px', fontSize: '13px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#1B3A6B' }}>{proj.name}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                                <div style={{ flex: 1, minWidth: '80px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${proj.progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: '3px' }}></div>
                                                </div>
                                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#475569' }}>{proj.progress}%</span>
                                            </div>
                                        </td>
                                        {/* Sprint Due Date */}
                                        <td style={{ padding: '15px 10px', fontSize: '13px', color: '#334155' }}>
                                            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{proj.sprint_name}</div>
                                            <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                 Due: {proj.sprint_due_date}
                                            </div>
                                        </td>
                                        {/* Last Task Worked On */}
                                        <td style={{ padding: '15px 10px', fontSize: '13px', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={proj.last_active_task}>
                                            <div style={{ fontWeight: '600' }}>{proj.last_active_task}</div>
                                            <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '9px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                                Active Task
                                            </span>
                                        </td>
                                        {/* Last Active Team Member */}
                                        <td style={{ padding: '15px 10px', fontSize: '13px' }}>
                                            {proj.last_active_member !== 'None' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                                        {proj.last_active_member.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{proj.last_active_member}</span>
                                                </div>
                                            ) : (
                                                <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No activity yet</span>
                                            )}
                                        </td>
                                        {/* Total Effort Hours */}
                                        <td style={{ padding: '15px 10px', fontSize: '13px', textAlign: 'center' }}>
                                            <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block' }}>
                                                {proj.total_hours} hrs
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                        No projects currently set up for execution under this program.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Activity Log */}
            <div style={{ marginTop: '25px', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ marginTop: 0, fontSize: '13px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Recent Team Activity Log</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {selectedProgramStats.recent_logs && selectedProgramStats.recent_logs.length > 0 ? (
                  selectedProgramStats.recent_logs.map((log, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '12px' }}>
                        <strong style={{ color: '#2563EB' }}>{log.user}</strong>
                        <span style={{ color: '#64748b' }}> in </span>
                        <strong style={{ color: '#1e293b' }}>{log.sprint || 'N/A'}</strong>
                        <div style={{ marginTop: '4px', color: '#475569' }}><b>Task:</b> {log.task_name || 'Unnamed Task'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ef4444' }}>Due: {log.due_date || 'No Date'}</div>
                        <div style={{ fontSize: '10px', marginTop: '4px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', display: 'inline-block' }}>{log.status || 'In Progress'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94a3b8' }}>No activity logs available for this program.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL - Redesigned for premium look */}
      {showTaskModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '650px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            {/* Modal Header */}
            <div style={{ background: '#1B3A6B', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Create Tasks</h3>
              <button onClick={handleCloseTaskModal} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', opacity: 0.8 }}>✕</button>
            </div>
            
            <form onSubmit={handleCreateTasks} style={{ padding: '25px 30px' }}>
              <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '5px', marginBottom: '15px' }}>
                {tasksList.map((task, index) => (
                  <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px', background: '#f8fafc', position: 'relative' }}>
                    {tasksList.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => setTasksList(prev => prev.filter((_, idx) => idx !== index))}
                        style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Remove
                      </button>
                    )}
                    <h4 style={{ margin: '0 0 15px 0', color: '#1B3A6B', fontWeight: 'bold', fontSize: '14px' }}>Task #{index + 1}</h4>
                    
                    {/* Task Title */}
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Task Title</label>
                      <input 
                        style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                        required 
                        placeholder="What needs to be done?" 
                        value={task.title} 
                        onChange={(e) => {
                          const updated = [...tasksList];
                          updated[index].title = e.target.value;
                          setTasksList(updated);
                        }} 
                      />
                    </div>

                    {/* Assignments & Sprint */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                      <div>
                        <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Assign To</label>
                        <select 
                          style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                          required 
                          value={task.assigned_to} 
                          onChange={(e) => {
                            const updated = [...tasksList];
                            updated[index].assigned_to = e.target.value;
                            setTasksList(updated);
                          }}
                        >
                          <option value="">Select Member</option>
                          {activeProjectForTask?.team_members?.map(m => ( <option key={m.username} value={m.username}>{m.username}</option> ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Sprint</label>
                        <select 
                          style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                          required 
                          value={task.sprint_id} 
                          onChange={(e) => {
                            const updated = [...tasksList];
                            updated[index].sprint_id = e.target.value;
                            updated[index].due_date = '';
                            setTasksList(updated);
                          }}
                        >
                          <option value="">Select Sprint</option>
                          {activeProjectForTask?.sprints?.filter(s => s.status !== 'Pending Approval' && s.status !== 'Returned')?.map(s => ( <option key={s.id} value={s.id}>{s.name}</option> ))}
                        </select>
                      </div>
                    </div>

                    {/* Priority & Due Date */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                      <div>
                        <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Priority</label>
                        <select 
                          style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                          value={task.priority} 
                          onChange={(e) => {
                            const updated = [...tasksList];
                            updated[index].priority = e.target.value;
                            setTasksList(updated);
                          }}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Due Date</label>
                        <input 
                          type="date" 
                          style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                          required 
                          min={activeProjectForTask?.sprints?.find(s => String(s.id) === String(task.sprint_id))?.start_date}
                          max={activeProjectForTask?.sprints?.find(s => String(s.id) === String(task.sprint_id))?.end_date}
                          value={task.due_date} 
                          onChange={(e) => {
                            const updated = [...tasksList];
                            updated[index].due_date = e.target.value;
                            setTasksList(updated);
                          }} 
                        />
                        {task.sprint_id && (
                          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                            Sprint: {activeProjectForTask?.sprints?.find(s => String(s.id) === String(task.sprint_id))?.start_date} to {activeProjectForTask?.sprints?.find(s => String(s.id) === String(task.sprint_id))?.end_date}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Description</label>
                      <textarea 
                        style={{ ...inp, height: '70px', resize: 'none', padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                        placeholder="Provide more details about this task..." 
                        value={task.description} 
                        onChange={(e) => {
                          const updated = [...tasksList];
                          updated[index].description = e.target.value;
                          setTasksList(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                type="button" 
                onClick={() => setTasksList(prev => [...prev, { title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' }])}
                style={{ ...secBtn, width: '100%', marginBottom: '20px', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}
              >
                + Add Another Task
              </button>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <button type="button" onClick={handleCloseTaskModal} style={{ ...secBtn, padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ ...primBtn, padding: '10px 25px', borderRadius: '8px', background: '#10B981', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
                  {isStartWorkingWorkflow ? 'Save & Start Project' : 'Save Tasks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NEW UPDATE NOTE MODAL --- */}
      {showNoteModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '500px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ background: '#4f46e5', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Post Project Update / Announcement</h3>
              <button onClick={() => setShowNoteModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', opacity: 0.8 }}>✕</button>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ ...lbl, fontSize: '13px', color: '#4f46e5' }}>Project Name</label>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginTop: '5px' }}>{selectedProjectForNote?.name}</div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ ...lbl, fontSize: '13px', color: '#4f46e5' }}>Announcement Note</label>
                <textarea 
                  style={{ ...inp, padding: '12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', height: '100px', resize: 'vertical' }} 
                  required 
                  placeholder="Enter latest project update, notes, or warning for team members..." 
                  value={updateNoteText} 
                  onChange={(e) => setUpdateNoteText(e.target.value)} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setShowNoteModal(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handlePostNote} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Post Update</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- REQUEST ADDITIONAL SPRINT MODAL --- */}
      {showSprintModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, width: '500px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ background: '#0891b2', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Request Additional Sprint</h3>
              <button onClick={() => setShowSprintModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', opacity: 0.8 }}>✕</button>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ ...lbl, fontSize: '13px', color: '#0891b2' }}>Project Name</label>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginTop: '5px' }}>{selectedProjectForSprint?.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Project Timeline: <b>{selectedProjectForSprint?.start_date}</b> to <b>{selectedProjectForSprint?.end_date}</b></div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ ...lbl, fontSize: '13px', color: '#0891b2' }}>Sprint Name</label>
                <input 
                  style={{ ...inp, padding: '12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                  required 
                  placeholder="e.g. Sprint 3" 
                  value={sprintName} 
                  onChange={(e) => setSprintName(e.target.value)} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ ...lbl, fontSize: '13px', color: '#0891b2' }}>Start Date</label>
                  <input 
                    type="date"
                    style={{ ...inp, padding: '12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    required 
                    min={selectedProjectForSprint?.start_date}
                    max={selectedProjectForSprint?.end_date}
                    value={sprintStartDate} 
                    onChange={(e) => setSprintStartDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ ...lbl, fontSize: '13px', color: '#0891b2' }}>End Date</label>
                  <input 
                    type="date"
                    style={{ ...inp, padding: '12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    required 
                    min={selectedProjectForSprint?.start_date}
                    max={selectedProjectForSprint?.end_date}
                    value={sprintEndDate} 
                    onChange={(e) => setSprintEndDate(e.target.value)} 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setShowSprintModal(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleAddSprint} style={{ background: '#0891b2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Request Sprint</button>
              </div>
            </div>
          </div>
        </div>
      )}


      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        
        .fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .pulse-dot { width: 8px; height: 8px; background: #10b981; borderRadius: 50%; animation: pulse 2s infinite; }
        .hover-lift { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1); }
        .progress-shimmer { background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%); background-size: 200% 100%; animation: shimmer 2.5s infinite linear; }
        .activity-card { transition: all 0.2s ease; border: 1px solid transparent; }
        .activity-card:hover { border-color: #e0e7ff; background: #fff !important; transform: scale(1.01); }
      `}</style>
      {/* MEMBER DETAIL MODAL */}
      {selectedMemberDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', width: '600px', borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: '#1B3A6B' }}>Member Performance: {selectedMemberDetail.username}</h2>
                    <button onClick={() => setSelectedMemberDetail(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                   <div style={{ background: '#F8FAF6', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>Efficiency</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10B981' }}>{selectedMemberDetail.completion_rate}%</div>
                   </div>
                   <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>Projects</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3B82F6' }}>{selectedMemberDetail.total_projects}</div>
                   </div>
                   <div style={{ background: '#FFF7ED', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>Workload (FTE)</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#F59E0B' }}>{selectedMemberDetail.total_fte.toFixed(1)}</div>
                   </div>
                </div>

                <h4 style={{ fontSize: '14px', color: '#1B3A6B', marginBottom: '15px' }}>Recent Task Execution</h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #F1F5F9', borderRadius: '12px' }}>
                   {selectedMemberDetail.recent_tasks.length > 0 ? (
                     selectedMemberDetail.recent_tasks.map((t, idx) => (
                       <div key={idx} style={{ padding: '15px', borderBottom: idx !== selectedMemberDetail.recent_tasks.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
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

// --- PREMIUM STYLES (MATCHING PGM DESIGN) ---
const sidebarStyle = { width: '220px', backgroundColor: '#1B3A6B', color: '#fff', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 };
const logoBox = { padding: '25px', color: '#fff', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #2a4f8a', marginBottom: '20px' };
const sbSecTitle = { fontSize: '10px', color: '#8ab0d8', textTransform: 'uppercase', padding: '10px 20px 8px' };
const sbItem = { padding: '12px 20px', color: '#ccdaee', cursor: 'pointer', fontSize: '13px', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '10px' };

const headerStyle = { height: '65px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 25px', marginLeft: '220px', position: 'sticky', top: 0, zIndex: 90 };
const logoutBtnStyle = { padding: '5px 10px', fontSize: '11px', cursor: 'pointer', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px' };
const userCircleStyle = { width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' };

const sectionTitle = { fontSize: '16px', fontWeight: '800', color: '#1B3A6B', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' };
const tableContainer = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const theadStyle = { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' };
const thStyle = { padding: '15px', textAlign: 'left', color: '#64748B', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' };
const trStyle = { borderBottom: '1px solid #f1f5f9', transition: '0.2s' };
const tdStyle = { padding: '15px', fontSize: '13px', color: '#475569' };

const primBtn = { background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' };
const secBtn = { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: '#fff', padding: '30px', borderRadius: '15px', position: 'relative' };

const liveStatCard = (color) => ({ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderTop: `4px solid ${color}` });
const liveStatLabel = { fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '5px' };
const liveStatValue = { fontSize: '24px', fontWeight: '800', color: '#1B3A6B' };
const chartContainer = { background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' };
const chartHeader = { margin: '0 0 15px 0', fontSize: '13px', color: '#1e293b' };
const legendContainer = { display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '11px', marginTop: '10px' };

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{payload[0].payload.name}</p>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1B3A6B' }}>{payload[0].value}% Complete</p>
      </div>
    );
  }
  return null;
};

const LegendItem = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}></div>
    <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>{label}</span>
  </div>
);

const innerCardStyle = { background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' };
const innerTitleStyle = { margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#1B3A6B' };
const miniTableStyle = { width: '100%', borderCollapse: 'collapse' };
const miniTheadStyle = { borderBottom: '2px solid #f1f5f9' };
const miniThStyle = { padding: '10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' };
const miniTrStyle = { borderBottom: '1px solid #f1f5f9' };
const miniTdStyle = { padding: '10px', fontSize: '13px', color: '#475569' };
const lbl = { display: 'block', fontSize: '11px', fontWeight: '800', marginBottom: '6px', color: '#64748B' };
const inp = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' };

export default PMDashboard;
