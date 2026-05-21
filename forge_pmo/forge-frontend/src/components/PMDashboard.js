import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, AreaChart, Area, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import NotificationPanel from './common/NotificationPanel';
import ResourceAnalytics from './common/ResourceAnalytics';
import PerformanceDashboard from './common/PerformanceDashboard';
import ProgramTrackerModal from './common/ProgramTrackerModal';
import { Chart } from "react-google-charts";
import {
  layoutContainer, sidebarStyle, sidebarScrollArea, logoBox, sbItem, activeSbItem,
  topHeaderStyle, mainContentStyle, logoutBtnSide, cardGrid, summCard, sectionTitle,
  alertHeader, tableContainer, tableStyle, theadStyle, thStyle, tdStyle, trStyle,
  primBtn, reviewBtn, secBtn, assignBtn, miniSelect, modalOverlay, modalBox, lbl, inp,
  valText, reviewGrid, miniTableContainer, miniTh, logoutBtnStyle, statusBadge
} from './common/DashboardStyles';

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

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
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
  const prevNotificationsCount = useRef(0);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

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
  const [sprintName, setSprintName] = useState('');
  const [sprintStartDate, setSprintStartDate] = useState('');
  const [sprintEndDate, setSprintEndDate] = useState('');
  const [selectedProjectForSprint, setSelectedProjectForSprint] = useState(null);
  const [sprintIdToUpdate, setSprintIdToUpdate] = useState(null);

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
        // Sort data: 'Build Plan' and 'Returned' first
        const sortedData = data.sort((a, b) => {
          const priority = { 'Build Plan': 1, 'Returned': 2, 'Approved': 3, 'Waiting': 4, 'Updated Plan Sent': 5, 'In Progress': 6 };
          const valA = priority[a.status_label] || 99;
          const valB = priority[b.status_label] || 99;
          return valA - valB;
        });
        setAssignedPrograms(sortedData);
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
          if (res.ok) {
              const data = await res.json();
              if (data.length > prevNotificationsCount.current) {
                  const newCount = data.length - prevNotificationsCount.current;
                  for (let i = 0; i < newCount; i++) {
                      if (data[i]) {
                          showToast(`🔔 Notification: ${data[i].message}`, 'success');
                      }
                  }
              }
              setNotifications(data);
              prevNotificationsCount.current = data.length;
          }
      } catch (err) { console.error("Notification fetch error:", err); }
  }, [username, showToast]);


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
          end_date: sprintEndDate,
          sprint_id: sprintIdToUpdate
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Sprint request submitted for PGM approval!', 'success');
        setShowSprintModal(false);
        setSprintName('');
        setSprintStartDate('');
        setSprintEndDate('');
        setSprintIdToUpdate(null);
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
    <div style={layoutContainer}>
      
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
        <div style={logoBox}>
          <span style={{ fontSize: '11px', fontWeight: '500', color: '#93c5fd', letterSpacing: '2px', textTransform: 'uppercase' }}>AM/NS</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>FORGE</span>
        </div>
        
        <div style={sidebarScrollArea}>
          <div style={{ padding: '0 20px 8px 20px', fontSize: '11px', color: '#88a3d4', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Navigation
          </div>
          <div
            style={activeTab === 'assignments' ? activeSbItem : sbItem}
            onClick={() => { setActiveTab('assignments'); setShowProjectForm(false); }}
          >
            My Assignments
          </div>
          <div
            style={activeTab === 'execution' ? activeSbItem : sbItem}
            onClick={() => { setActiveTab('execution'); setShowProjectForm(false); }}
          >
            Project Execution
          </div>
          <div
            style={activeTab === 'working_programs' ? activeSbItem : sbItem}
            onClick={() => { setActiveTab('working_programs'); setShowProjectForm(false); }}
          >
            Working Programs
          </div>
          <div
            style={activeTab === 'performance' ? activeSbItem : sbItem}
            onClick={() => { setActiveTab('performance'); setShowProjectForm(false); }}
          >
            Team Performance
          </div>
          <div
            style={activeTab === 'resource_analytics' ? activeSbItem : sbItem}
            onClick={() => { setActiveTab('resource_analytics'); setShowProjectForm(false); }}
          >
            Resource Analytics
          </div>
        </div>

        <button onClick={onLogout} style={logoutBtnSide}>LOGOUT</button>
      </div>

      <div style={mainContentStyle}>
        {/* HEADER */}
        <div style={topHeaderStyle}>
          <span style={{ fontWeight: 700, color: '#1B3A6B' }}>Project Manager Dashboard</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            
            {/* NOTIFICATION BELL */}
            <NotificationPanel
              notifications={notifications}
              showNotifications={showNotifications}
              setShowNotifications={setShowNotifications}
              markRead={markRead}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setShowProfileModal(true)}>
                <span style={{ fontSize: '12px' }}>Welcome, <b>{username}</b></span>
                <div style={{ ...userCircleStyle, background: 'linear-gradient(135deg, #1B3A6B, #3B82F6)', color: '#fff', fontWeight: 'bold' }}>
                    {username?.charAt(0).toUpperCase() || 'U'}
                </div>
            </div>
          </div>
        </div>


        <div style={{ padding: '25px', overflowY: 'auto' }}>
            <>
              {activeTab === 'performance' && (
                <PerformanceDashboard
                  teamPerformance={teamPerformance}
                  setSelectedMemberDetail={setSelectedMemberDetail}
                />
              )}


        {/* RESOURCE PERFORMANCE & ANALYTICS OPERATION VIEW */}
        {activeTab === 'resource_analytics' && (
          <ResourceAnalytics resources={resources} />
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
                                        setSprintIdToUpdate(null);
                                        setSprintName('');
                                        setSprintStartDate('');
                                        setSprintEndDate('');
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
                                                <td style={miniTdStyle}>{formatDate(s.start_date)} to {formatDate(s.end_date)}</td>
                                                <td style={miniTdStyle}>
                                                  {statusBadge}
                                                  {s.status === 'Returned' && (
                                                    <div style={{ marginTop: '5px' }}>
                                                      {s.return_note && <div style={{ fontSize: '11px', color: '#b91c1c', marginBottom: '4px' }}><strong>Note:</strong> {s.return_note}</div>}
                                                      <button 
                                                        onClick={() => {
                                                          setSprintIdToUpdate(s.id);
                                                          setSprintName(s.name);
                                                          setSprintStartDate(s.start_date);
                                                          setSprintEndDate(s.end_date);
                                                          setSelectedProjectForSprint(project);
                                                          setShowSprintModal(true);
                                                        }}
                                                        style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                                                      >
                                                        Update Sprint
                                                      </button>
                                                    </div>
                                                  )}
                                                </td>
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

                      {/* Card 4 - Your FTE Load */}
                      {(() => {
                        const myRes = resources.find(r => r.username === username);
                        const myFteVal = myRes ? myRes.assigned_fte : 0;
                        const myStatus = myRes ? myRes.workload_status : 'Free';
                        const myColor = myRes ? myRes.workload_color : 'Green';
                        return (
                          <div style={{
                              flex: 1,
                              backgroundColor: '#fff',
                              padding: '20px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              borderLeft: `5px solid ${myColor === 'Red' ? '#EF4444' : myColor === 'Yellow' ? '#F59E0B' : '#10B981'}`
                          }}>
                              <h6 style={{ color: '#858796', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Your FTE Load</h6>
                              <h3 style={{ margin: 0, fontWeight: 'bold', color: myColor === 'Red' ? '#EF4444' : myColor === 'Yellow' ? '#D97706' : '#10B981' }}>
                                  {myFteVal.toFixed(2)} FTE <span style={{ fontSize: '11px', fontWeight: 'bold', marginLeft: '5px', color: '#64748B' }}>({myStatus.toUpperCase()})</span>
                              </h3>
                          </div>
                        );
                      })()}
                  </div>
                  {/* --- End of Section --- */}

                  <h3 style={sectionTitle}>Assigned Programs</h3>
                  <div style={tableContainer}>
                    <table style={tableStyle}>
                      <thead style={theadStyle}><tr><th style={thStyle}>PROGRAM NAME</th><th style={thStyle}>TIMELINE</th><th style={thStyle}>ASSIGNED BY</th><th style={thStyle}>ACTION</th></tr></thead>
                      <tbody>
                        {assignedPrograms.map((pgm) => {
                          const isNew = pgm.status_label === 'Build Plan';
                          const isReturned = pgm.status_label === 'Returned';
                          return (
                            <tr
                              key={pgm.id}
                              style={{
                                ...trStyle,
                                backgroundColor: isNew ? '#F0F9FF' : isReturned ? '#FEF2F2' : '#fff',
                                borderLeft: isNew ? '4px solid #3B82F6' : isReturned ? '4px solid #EF4444' : '4px solid transparent'
                              }}
                            >
                              <td style={tdStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <b style={{ color: '#1E293B' }}>{pgm.name}</b>
                                  {isNew && (
                                    <span style={{
                                      background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                                      color: '#fff',
                                      fontSize: '9px',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontWeight: '800',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      boxShadow: '0 2px 4px rgba(59,130,246,0.3)'
                                    }}>
                                      New Assignment
                                    </span>
                                  )}
                                  {isReturned && (
                                    <span style={{
                                      background: 'linear-gradient(135deg, #EF4444, #F87171)',
                                      color: '#fff',
                                      fontSize: '9px',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontWeight: '800',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      boxShadow: '0 2px 4px rgba(239,68,68,0.3)'
                                    }}>
                                      Returned Plan
                                    </span>
                                  )}
                                </div>
                                {pgm.description && <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', maxWidth: '350px', lineHeight: '1.4' }}>{pgm.description}</div>}
                                {pgm.document && (
                                    <div style={{ marginTop: '8px' }}>
                                        <a href={pgm.document} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#2563EB', textDecoration: 'none', background: '#EFF6FF', padding: '4px 10px', borderRadius: '6px', border: '1px solid #BFDBFE', fontWeight: 'bold' }}>
                                            📎 View Reference Document
                                        </a>
                                    </div>
                                )}
                              </td>
                              <td style={tdStyle}>{formatDate(pgm.start_date)} to {formatDate(pgm.end_date)}</td>
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
                                    disabled={pgm.status_label === 'Waiting' || pgm.status_label === 'In Progress' || pgm.status_label === 'Updated Plan Sent'}
                                >
                                    {pgm.status_label === 'Build Plan' ? '+ Build Plan' :
                                     pgm.status_label === 'Waiting' ? ' Waiting Approval' :
                                     pgm.status_label === 'Updated Plan Sent' ? ' Updated Plan Sent' :
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
                          );
                        })}
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
                            <td style={tdStyle}><b>{pgm.name}</b><div style={{ fontSize: '11px', color: '#64748b' }}>{formatDate(pgm.start_date)} to {formatDate(pgm.end_date)}</div></td>
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
      <ProgramTrackerModal
        isOpen={showTrackerModal}
        onClose={() => setShowTrackerModal(false)}
        selectedProgramStats={selectedProgramStats}
        onDownloadCSV={handleDownloadReport}
      />

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
                            Sprint: {formatDate(activeProjectForTask?.sprints?.find(s => String(s.id) === String(task.sprint_id))?.start_date)} to {formatDate(activeProjectForTask?.sprints?.find(s => String(s.id) === String(task.sprint_id))?.end_date)}
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
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{sprintIdToUpdate ? 'Update Returned Sprint' : 'Request Additional Sprint'}</h3>
              <button onClick={() => setShowSprintModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', opacity: 0.8 }}>✕</button>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ ...lbl, fontSize: '13px', color: '#0891b2' }}>Project Name</label>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginTop: '5px' }}>{selectedProjectForSprint?.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Project Timeline: <b>{formatDate(selectedProjectForSprint?.start_date)}</b> to <b>{formatDate(selectedProjectForSprint?.end_date)}</b></div>
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
                <button onClick={handleAddSprint} style={{ background: '#0891b2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>{sprintIdToUpdate ? 'Update Sprint' : 'Request Sprint'}</button>
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
// All shared styles are cleanly imported from DashboardStyles.js above
const userCircleStyle = { width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' };

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

export default PMDashboard;
