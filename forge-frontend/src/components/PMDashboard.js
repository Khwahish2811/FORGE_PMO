import React, { useState, useEffect, useCallback, useRef } from 'react';
import { layoutContainer, mainContentStyle } from './common/DashboardStyles';
import { DataProvider } from '../services/DataProvider';
import { openNotification } from '../utils/NotificationMessageMapping';

import PMOverview from './pm/PMOverview';
import PMOngoingWorkspace from './pm/PMOngoingWorkspace';
import PMWorkingPrograms from './pm/PMWorkingPrograms';
import ResourceAnalytics from './common/ResourceAnalytics';
import PerformanceDashboard from './common/PerformanceDashboard';

import ToastNotification from './common/ToastNotification';
import PMSidebar from './pm/PMSidebar';
import PMHeader from './pm/PMHeader';
import PMModals from './pm/PMModals';

const dataProvider = new DataProvider();

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
  const fetchData = useCallback((isSilent = false) => {
    if (!isSilent) setLoading(true);
    Promise.all([
      dataProvider.myAssignedPrograms(username || 'rahul_pm'),
      dataProvider.getTeamMembers(),
      dataProvider.getActiveProjects(username),
      dataProvider.getWorkingPrograms(username)
    ])
    .then(([progRes, empRes, projRes, workingRes]) => {
      // 1. myAssignedPrograms
      if (progRes.ok) {
        progRes.json().then(data => {
          const sortedData = data.sort((a, b) => {
            const priority = { 'Build Plan': 1, 'Returned': 2, 'Approved': 3, 'Waiting': 4, 'Updated Plan Sent': 5, 'In Progress': 6 };
            const valA = priority[a.status_label] || 99;
            const valB = priority[b.status_label] || 99;
            return valA - valB;
          });
          setAssignedPrograms(sortedData);
        });
      } else {
        openNotification('error', 'Failed to fetch assigned programs');
      }

      // 2. getTeamMembers
      if (empRes.ok) {
        empRes.json().then(data => setEmployees(data));
      } else {
        openNotification('error', 'Failed to fetch team members');
      }

      // 3. getActiveProjects
      if (projRes.ok) {
        projRes.json().then(data => setMyProjects(data));
      } else {
        openNotification('error', 'Failed to fetch active projects');
      }

      // 4. getWorkingPrograms
      if (workingRes.ok) {
        workingRes.json().then(data => setWorkingPrograms(data));
      } else {
        openNotification('error', 'Failed to fetch working programs');
      }
    })
    .catch(error => console.error("Fetch error:", error))
    .finally(() => setLoading(false));
  }, [username]);

  const fetchDashboardStats = useCallback(() => {
    dataProvider.pmDashboardStats(username)
      .then(response => {
        if (response.ok) {
          return response.json().then(data => setStats(data));
        } else {
          return response.json().then(errorData => {
            openNotification('error', errorData['message'] || 'Failed to fetch dashboard stats');
          });
        }
      })
      .catch(err => console.error("Stats fetch error:", err));
  }, [username]);

  const fetchUserProfile = useCallback(() => {
    dataProvider.fetchProfileDetails(username)
      .then(res => {
        if (res.ok) {
          return res.json().then(data => setProfileData(data));
        } else {
          return res.json().then(errorData => {
            openNotification('error', errorData['message'] || 'Failed to fetch user profile');
          });
        }
      })
      .catch(err => console.error("Profile fetch error:", err));
  }, [username]);

  const fetchNotifications = useCallback(() => {
    dataProvider.getNotifications(username)
      .then(res => {
        if (res.ok) {
          return res.json().then(data => {
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
          });
        } else {
          return res.json().then(errorData => {
            openNotification('error', errorData['message'] || 'Failed to fetch notifications');
          });
        }
      })
      .catch(err => console.error("Notification fetch error:", err));
  }, [username, showToast]);


  const fetchTeamPerformance = useCallback(() => {
    dataProvider.getTeamPerformance(username)
      .then(res => {
        if (res.ok) {
          return res.json().then(data => setTeamPerformance(data));
        } else {
          return res.json().then(errorData => {
            openNotification('error', errorData['message'] || 'Failed to fetch team performance');
          });
        }
      })
      .catch(err => console.error("Performance fetch error:", err));
  }, [username]);

  const fetchResources = useCallback(() => {
    dataProvider.getAllResources()
      .then(res => {
        if (res.ok) {
          return res.json().then(data => setResources(data));
        } else {
          return res.json().then(errorData => {
            openNotification('error', errorData['message'] || 'Failed to fetch resources');
          });
        }
      })
      .catch(err => console.error("Resources fetch error:", err));
  }, []);


  const markRead = () => {
    dataProvider.markNotificationsRead({ username })
      .then(res => {
        if (res.ok) {
          setNotifications([]);
        } else {
          return res.json().then(errorData => {
            openNotification('error', errorData['message'] || 'Failed to mark notifications read');
          });
        }
      })
      .catch(err => console.error("Mark read error:", err));
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

  const handlePostNote = () => {
    if (!updateNoteText.trim()) return;
    dataProvider.postProjectUpdateNote({ project_id: selectedProjectForNote.id, note: updateNoteText })
      .then(res => {
        if (res.ok) {
          showToast('Announcement note posted successfully!', 'success');
          setShowNoteModal(false);
          setUpdateNoteText('');
          fetchData(true);
        } else {
          return res.json().then(errorData => {
            openNotification('error', errorData['message'] || 'Failed to post announcement.');
          });
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Server connection failed.', 'error');
      });
  };

  const handleAddSprint = (sprintData) => {
    if (!sprintData.name || !sprintData.start_date || !sprintData.end_date) {
      showToast('Please fill all sprint fields.', 'error');
      return;
    }

    // Verify timeline matches selected project's bounds
    if (selectedProjectForSprint) {
      const pStart = new Date(selectedProjectForSprint.start_date);
      const pEnd = new Date(selectedProjectForSprint.end_date);
      const sStart = new Date(sprintData.start_date);
      const sEnd = new Date(sprintData.end_date);

      if (sStart < pStart || sEnd > pEnd) {
        showToast(`Sprint dates must be within project timeline (${selectedProjectForSprint.start_date} to ${selectedProjectForSprint.end_date})`, 'error');
        return;
      }
      if (sStart > sEnd) {
        showToast('Sprint start date must be before end date.', 'error');
        return;
      }
    }

    dataProvider.requestAdditionalSprint({
      project_id: selectedProjectForSprint.id,
      name: sprintData.name,
      start_date: sprintData.start_date,
      end_date: sprintData.end_date,
      sprint_id: sprintData.sprint_id
    })
      .then(res => {
        if (res.ok) {
          return res.json().then(data => {
            showToast(data.message || 'Sprint request submitted for PGM approval!', 'success');
            setShowSprintModal(false);
            setSprintName('');
            setSprintStartDate('');
            setSprintEndDate('');
            setSprintIdToUpdate(null);
            fetchData(true);
          });
        } else {
          return res.json().then(data => {
            showToast(data.error || 'Failed to submit sprint request.', 'error');
          });
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Server connection failed.', 'error');
      });
  };

  const toggleRow = (id) => {
    setExpandedProjectId(expandedProjectId === id ? null : id);
  };

  const handleBuildPlan = (pgm) => {
    setSelectedProgram(pgm);
    setShowProjectForm(true);
  };

  const handleStartWorking = (pgm) => {
    setIsStartWorkingWorkflow(true);
    dataProvider.getActiveProjects(username)
      .then(projRes => {
        if (projRes.ok) {
          return projRes.json().then(projectsData => {
            setMyProjects(projectsData);
            const projObj = projectsData.find(p => p.id === pgm.project_id);
            if (projObj) {
              setActiveProjectForTask(projObj);
              setShowTaskModal(true);
            } else {
              setActiveProjectForTask({ id: pgm.project_id, name: pgm.name });
              setShowTaskModal(true);
            }
          });
        } else {
          setActiveProjectForTask({ id: pgm.project_id, name: pgm.name });
          setShowTaskModal(true);
        }
      })
      .catch(error => {
        console.error("Error setting up start working:", error);
        setActiveProjectForTask({ id: pgm.project_id, name: pgm.name });
        setShowTaskModal(true);
      });
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setTasksList([{ title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' }]);
    setIsStartWorkingWorkflow(false);
  };

  const handleCreateTasks = (e) => {
    if (e) e.preventDefault();
    
    // Check fields for all tasks in tasksList
    for (let i = 0; i < tasksList.length; i++) {
      const task = tasksList[i];
      if (!task.title || !task.assigned_to || !task.sprint_id) {
        showToast(`Please fill all required fields for Task #${i + 1}!`, 'warning');
        return;
      }
    }
    
    // Create all tasks sequentially or concurrently using standard DataProvider and Promise.all
    const createPromises = tasksList.map(task =>
      dataProvider.createTask({
        title: task.title,
        assigned_to: task.assigned_to,
        sprint_id: task.sprint_id,
        due_date: task.due_date,
        project_id: activeProjectForTask?.id,
        priority: task.priority || 'Medium',
        description: task.description || ''
      })
    );
    
    Promise.all(createPromises)
      .then(responses => {
        const allOk = responses.every(res => res.ok);
        if (allOk) {
          if (isStartWorkingWorkflow) {
            dataProvider.startProjectExecution({ project_id: activeProjectForTask?.id })
              .then(startRes => {
                if (startRes.ok) {
                  return startRes.json().then(startData => {
                    if (startData.success) {
                      showToast('Project execution started with tasks created!', 'success');
                    } else {
                      showToast('Tasks created, but failed to start execution: ' + startData.error, 'warning');
                    }
                  });
                } else {
                  showToast('Tasks created, but failed to start execution.', 'warning');
                }
              })
              .catch(err => console.error("Error starting execution:", err))
              .finally(() => {
                setShowTaskModal(false);
                setTasksList([{ title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' }]);
                setIsStartWorkingWorkflow(false);
                fetchData(true);
              });
          } else {
            showToast(`${tasksList.length} task(s) created successfully!`, 'success');
            setShowTaskModal(false);
            setTasksList([{ title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' }]);
            setIsStartWorkingWorkflow(false);
            fetchData(true);
          }
        } else {
          showToast('Failed to create one or more tasks.', 'error');
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Connection failed. Check your server.', 'error');
      });
  };

  const handleLiveTrack = (pgmId) => {
    setLoadingStats(true);
    dataProvider.programTracker(pgmId)
      .then(res => {
        if (res.ok) {
          return res.json().then(data => {
            setSelectedProgramStats(data);
            setShowTrackerModal(true);
          });
        } else {
          return res.json().then(errorData => {
            openNotification('error', errorData['message'] || 'Failed to fetch tracker stats');
          });
        }
      })
      .catch(err => console.error("Tracker error:", err))
      .finally(() => {
        setLoadingStats(false);
      });
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

  const handleSubmitPlan = (formData) => {
    const formattedTeam = formData.team.map(m => ({ userId: Number(m.userId), role: m.role, fte: m.fte }));
    const payload = { ...formData, team: formattedTeam, program_id: selectedProgram?.id, pm_username: username };
    dataProvider.createProjectPlan(payload)
      .then(response => {
        if (response.ok) {
          showToast('Project plan submitted successfully!', 'success');
          setShowProjectForm(false);
          fetchData(true);
        } else {
          return response.json().then(errorData => {
            openNotification('error', errorData['message'] || 'Failed to submit project plan.');
          });
        }
      })
      .catch(err => {
        showToast('Connection failed. Check your server.', 'error');
      });
  };
  return (
    <div style={layoutContainer}>
      <ToastNotification message={toastMessage?.msg} type={toastMessage?.type} />

      <PMSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setShowProjectForm={setShowProjectForm}
        onLogout={onLogout}
      />

      <div style={mainContentStyle}>
        <PMHeader
          username={username}
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          markRead={markRead}
          setShowProfileModal={setShowProfileModal}
        />

        <div style={{ padding: '25px', overflowY: 'auto' }}>
          {activeTab === 'performance' && (
            <PerformanceDashboard
              teamPerformance={teamPerformance}
              setSelectedMemberDetail={setSelectedMemberDetail}
            />
          )}

          {activeTab === 'resource_analytics' && (
            <ResourceAnalytics resources={resources} />
          )}

          {activeTab === 'execution' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1B3A6B' }}>Project Execution & Task Management</h3>
              </div>
              <PMOngoingWorkspace
                myProjects={myProjects}
                expandedProjectId={expandedProjectId}
                onToggleExpand={toggleRow}
                onCreateTask={(project) => {
                  setIsStartWorkingWorkflow(false);
                  setTasksList([{ title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' }]);
                  setActiveProjectForTask(project);
                  setShowTaskModal(true);
                }}
                onUpdateNote={(project) => {
                  setSelectedProjectForNote(project);
                  setShowNoteModal(true);
                }}
                onAddSprint={(project) => {
                  setSprintIdToUpdate(null);
                  setSprintName('');
                  setSprintStartDate('');
                  setSprintEndDate('');
                  setSelectedProjectForSprint(project);
                  setShowSprintModal(true);
                }}
                onTriggerUpdateSprint={(sprint, project) => {
                  setSprintIdToUpdate(sprint.id);
                  setSprintName(sprint.name);
                  setSprintStartDate(sprint.start_date);
                  setSprintEndDate(sprint.end_date);
                  setSelectedProjectForSprint(project);
                  setShowSprintModal(true);
                }}
              />
            </>
          )}

          {activeTab === 'assignments' && (
            <PMOverview
              assignedPrograms={assignedPrograms}
              stats={stats}
              resources={resources}
              username={username}
              onBuildPlan={(pgm) => {
                if (pgm.status_label === 'Approved') {
                  handleStartWorking(pgm);
                } else {
                  handleBuildPlan(pgm);
                }
              }}
              onLiveTrack={handleLiveTrack}
            />
          )}

          {activeTab === 'working_programs' && (
            <PMWorkingPrograms
              workingPrograms={workingPrograms}
              onLiveTrack={handleLiveTrack}
            />
          )}
        </div>
      </div>

      <PMModals
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
        profileData={profileData}
        showProjectForm={showProjectForm}
        setShowProjectForm={setShowProjectForm}
        selectedProgram={selectedProgram}
        employees={employees}
        handleSubmitPlan={handleSubmitPlan}
        showToast={showToast}
        showTrackerModal={showTrackerModal}
        setShowTrackerModal={setShowTrackerModal}
        selectedProgramStats={selectedProgramStats}
        handleDownloadReport={handleDownloadReport}
        showTaskModal={showTaskModal}
        handleCloseTaskModal={handleCloseTaskModal}
        activeProjectForTask={activeProjectForTask}
        tasksList={tasksList}
        setTasksList={setTasksList}
        isStartWorkingWorkflow={isStartWorkingWorkflow}
        handleCreateTasks={handleCreateTasks}
        showNoteModal={showNoteModal}
        setShowNoteModal={setShowNoteModal}
        selectedProjectForNote={selectedProjectForNote}
        updateNoteText={updateNoteText}
        setUpdateNoteText={setUpdateNoteText}
        handlePostNote={handlePostNote}
        showSprintModal={showSprintModal}
        setShowSprintModal={setShowSprintModal}
        sprintIdToUpdate={sprintIdToUpdate}
        sprintName={sprintName}
        sprintStartDate={sprintStartDate}
        sprintEndDate={sprintEndDate}
        selectedProjectForSprint={selectedProjectForSprint}
        handleAddSprint={handleAddSprint}
        selectedMemberDetail={selectedMemberDetail}
        setSelectedMemberDetail={setSelectedMemberDetail}
      />

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
    </div>
  );
};

export default PMDashboard;
