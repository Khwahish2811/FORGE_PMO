import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from 'recharts';

import ProgramTrackerModal from './common/ProgramTrackerModal';
import ResourceAnalytics from './common/ResourceAnalytics';
import NotificationPanel from './common/NotificationPanel';
import {
  layoutContainer, sidebarStyle, sidebarScrollArea, logoBox, sbItem, activeSbItem,
  topHeaderStyle, mainContentStyle, logoutBtnSide, cardGrid, summCard, sectionTitle,
  alertHeader, tableContainer, tableStyle, theadStyle, thStyle, tdStyle, trStyle,
  primBtn, reviewBtn, secBtn, assignBtn, miniSelect, modalOverlay, modalBox, lbl, inp,
  valText, reviewGrid, miniTableContainer, miniTh, logoutBtnStyle, statusBadge
} from './common/DashboardStyles';

import PGMOverview from './pgm/PGMOverview';
import PGMProgramForm from './pgm/PGMProgramForm';
import PGMProgramWorkspace from './pgm/PGMProgramWorkspace';
import PGMSprintApprovals from './pgm/PGMSprintApprovals';


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

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

const PGMDashboard = ({ username, onLogout }) => {
  // --- EXISTING STATES (Preserved) ---
  const [showModal, setShowModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [pmList, setPmList] = useState([]);
  const [pendingProjects, setPendingProjects] = useState([]);
  const [pendingSprints, setPendingSprints] = useState([]);
  const [showSprintReviewModal, setShowSprintReviewModal] = useState(false);
  const [selectedSprintReview, setSelectedSprintReview] = useState(null);
  const [sprintReturnNote, setSprintReturnNote] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedPMs, setSelectedPMs] = useState({});
  const [formData, setFormData] = useState({ name: '', description: '', start_date: '', end_date: '' });


  // --- NEW STATES FOR NAVIGATION & TRACKING ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [selectedProgramStats, setSelectedProgramStats] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ username: username, email: '', role: 'Program Manager', bio: '', phone: '' });

  const [returnNote, setReturnNote] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const prevNotificationsCount = useRef(0);

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // --- BULK IMPORT STATES ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [parseSummary, setParseSummary] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  // --- RESOURCE ANALYTICS STATES ---
  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [expandedResource, setExpandedResource] = useState(null);
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
      fetchPendingSprints();
    } catch (err) {
      console.error("Fetch fail:", err);
    }
  }, []);


  const fetchPendingSprints = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/get-pending-additional-sprints/');
      if (res.ok) setPendingSprints(await res.json());
    } catch (err) { console.error("Error fetching pending sprints:", err); }
  }, []);

  const handleReviewSprintSubmit = async (decision) => {
    if (decision === 'Returned' && !sprintReturnNote.trim()) {
      showToast('Please provide feedback notes when returning a sprint.', 'error');
      return;
    }
    try {
      const res = await fetch('http://127.0.0.1:8000/api/review-additional-sprint/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprint_id: selectedSprintReview.sprint_id,
          decision: decision,
          return_note: sprintReturnNote
        })
      });
      if (res.ok) {
        showToast(decision === 'Approved' ? 'Sprint approved successfully!' : 'Sprint returned to PM with notes.', 'success');
        setShowSprintReviewModal(false);
        setSprintReturnNote('');
        fetchData();
        fetchPendingSprints();
      } else {
        showToast('Failed to review sprint.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server connection failed.', 'error');
    }
  };

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

  const fetchUserProfile = useCallback(async () => {

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/get-user-profile/?username=${username}`);
      if (res.ok) setProfileData(await res.json());
    } catch (err) { console.error("Profile fetch error:", err); }
  }, [username]);

  useEffect(() => {
    fetchData();
    fetchUserProfile();
    fetchResources();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchData();
      fetchResources();
      fetchNotifications();
    }, 5000); // Auto refresh every 5 seconds
    const handleFocus = () => { fetchData(); fetchUserProfile(); fetchResources(); fetchNotifications(); };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData, fetchUserProfile, fetchResources, fetchNotifications]);


  // --- 2. Action Handlers (Original Functions Preserved) ---
  const handleAssignPM = async (programId) => {
    const pmId = selectedPMs[programId];
    if (!pmId) { showToast(' Please select a PM first!', 'warning'); return; }
    try {
      const res = await fetch('http://127.0.0.1:8000/api/assign-pm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: programId, pm_id: pmId, manager_name: username })
      });
      if (res.ok) {
        showToast(' Project Manager assigned successfully!', 'success');
        fetchData();
      }
    } catch (err) { showToast(' Connection error. Please try again.', 'error'); }
  };

  const handleReviewAction = async (projectId, decision) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/approve-project-plan/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, decision: decision })
      });
      if (response.ok) {
        showToast(` Project ${decision === 'approve' ? 'Approved' : 'Rejected'} successfully!`, decision === 'approve' ? 'success' : 'warning');
        setShowReviewModal(false);
        fetchData();
      } else {
        const errorData = await response.json();
        showToast(' Error: ' + (errorData.error || 'Action failed'), 'error');
      }
    } catch (err) { showToast(' Failed to connect to the server.', 'error'); }
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
        showToast(' Program created successfully!', 'success');
        setShowModal(false);
        setFormData({ name: '', description: '', start_date: '', end_date: '', document: null });
        fetchData();
      }
    } catch (err) { showToast(' Error connecting to server!', 'error'); }
  };

  // --- BULK IMPORT HANDLERS ---
  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Program Name,Description,Start Date,End Date\nForge Initiative 1,Description of the initiative,2026-06-01,2026-12-31\nForge Initiative 2,Another epic initiative,2026-07-01,2026-11-30\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "program_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const fData = new FormData();
    fData.append('file', file);
    
    setIsParsing(true);
    setParsedRecords([]);
    setParseSummary(null);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/parse-program-import/', {
        method: 'POST',
        body: fData
      });
      
      const data = await response.json();
      setIsParsing(false);
      if (data.success) {
        setParsedRecords(data.records);
        setParseSummary(data.summary);
        showToast(`Successfully parsed spreadsheet! ${data.summary.valid_records} valid rows found.`, 'success');
      } else {
        showToast(data.error || 'Failed to parse file.', 'error');
      }
    } catch (err) {
      setIsParsing(false);
      showToast('Server communication error during parsing.', 'error');
    }
  };

  const handleApproveImport = async () => {
    const validPrograms = parsedRecords.filter(r => r.is_valid);
    if (validPrograms.length === 0) return;
    
    setIsImporting(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/commit-program-import/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programs: validPrograms })
      });
      
      const data = await response.json();
      setIsImporting(false);
      if (data.success) {
        showToast(`Successfully imported ${data.created_count} programs!`, 'success');
        setShowImportModal(false);
        setParsedRecords([]);
        setParseSummary(null);
        fetchData();
      } else {
        showToast(data.error || 'Failed to commit import.', 'error');
      }
    } catch (err) {
      setIsImporting(false);
      showToast('Server communication error during import.', 'error');
    }
  };

  const handleDecision = async (projectId, decision) => {
    if (decision === 'return' && !returnNote.trim()) {
      showToast('Please provide a reason for returning the project.', 'warning');
      return;
    }
    try {
      const response = await fetch('http://127.0.0.1:8000/api/approve-project-plan/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, decision: decision, return_note: returnNote })
      });
      const data = await response.json();
      if (data.success) {
        showToast(`${data.message}`, decision === 'approve' ? 'success' : 'warning');
        setShowReviewModal(false);
        setReturnNote('');
        fetchData();
      }
    } catch (error) {
      console.error("Error:", error);
      showToast('Action failed! Please try again.', 'error');
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
        showToast(' Tracker data not available for this program.', 'warning');
      }
    } catch (err) {
      showToast(' Error fetching tracker data.', 'error');
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
    <div style={layoutContainer}>

      {/* PROFILE MODAL */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '450px', borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.3)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <h2 style={{ margin: 0, color: '#1B3A6B' }}>User Profile</h2>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
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
          position: 'fixed', top: '30px', right: '30px', zIndex: 9999,
          background: toastMessage.type === 'error' ? '#ef4444' : toastMessage.type === 'warning' ? '#f59e0b' : '#10b981',
          color: 'white', padding: '16px 24px', borderRadius: '10px', fontWeight: '600', fontSize: '14px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
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
            onClick={() => setActiveTab('dashboard')}
            style={activeTab === 'dashboard' ? activeSbItem : sbItem}
          >
            Dashboard
          </div>
          <div
            onClick={() => setActiveTab('working')}
            style={activeTab === 'working' ? activeSbItem : sbItem}
          >
            Working Programs
          </div>
          <div
            onClick={() => setActiveTab('resource_analytics')}
            style={activeTab === 'resource_analytics' ? activeSbItem : sbItem}
          >
            Resource Analytics
          </div>
        </div>

        <button onClick={onLogout} style={logoutBtnSide}>LOGOUT</button>
      </div>

      <div style={mainContentStyle}>
        {/* HEADER */}
        <div style={topHeaderStyle}>
          <span style={{ fontWeight: 700, color: '#1B3A6B' }}>
            {activeTab === 'dashboard' ? 'Program Manager Dashboard' : 
             activeTab === 'resource_analytics' ? 'Resource Analytics & Performance' :
             'Working Programs Control'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <NotificationPanel
              notifications={notifications}
              showNotifications={showNotifications}
              setShowNotifications={setShowNotifications}
              markRead={markRead}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setShowProfileModal(true)}>
              <span style={{ fontSize: '12px' }}>Welcome, <b>{username}</b></span>
              <div style={{ width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', fontWeight: 'bold' }}>{username?.charAt(0).toUpperCase() || 'U'}</div>
            </div>
          </div>
        </div>


        {/* --- DYNAMIC CONTENT --- */}
        {activeTab === 'dashboard' ? (
          <>
            <PGMOverview
              programs={programs}
              pendingProjects={pendingProjects}
              resources={resources}
              username={username}
            />

            {pendingSprints.length > 0 && (
              <div style={{ padding: '0 25px 25px' }}>
                <div style={{ ...alertHeader, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                  <h3 style={{ ...sectionTitle, color: '#fff', margin: 0 }}> Action Required: Additional Sprint Approvals</h3>
                  <span style={{ fontWeight: 'bold', color: '#fff' }}>{pendingSprints.length} Pending Sprint(s)</span>
                </div>
                <PGMSprintApprovals
                  pendingSprints={pendingSprints}
                  selectedSprintReview={selectedSprintReview}
                  onOpenSprintReview={(sprint) => {
                    setSelectedSprintReview(sprint);
                    setShowSprintReviewModal(true);
                  }}
                  onCloseSprintReview={() => setShowSprintReviewModal(false)}
                  sprintReturnNote={sprintReturnNote}
                  onSprintReturnNoteChange={setSprintReturnNote}
                  onSprintDecision={handleReviewSprintSubmit}
                />
              </div>
            )}

            <PGMProgramWorkspace
              pendingProjects={pendingProjects}
              onReviewProject={(proj) => {
                setSelectedReview(proj);
                setShowReviewModal(true);
              }}
              programs={programs}
              pmList={pmList}
              selectedPMs={selectedPMs}
              onPMSelectChange={(pgmId, pmId) => {
                setSelectedPMs({ ...selectedPMs, [pgmId]: pmId });
              }}
              onAssignPM={handleAssignPM}
              onOpenCreateModal={() => setShowModal(true)}
              onOpenImportModal={() => setShowImportModal(true)}
              formatDate={formatDate}
            />
          </>
        ) : activeTab === 'working' ? (
          /* WORKING PROGRAMS TAB */
          <div style={{ padding: '25px' }}>
            <h3 style={{ ...sectionTitle, marginBottom: '20px', fontSize: '18px' }}> Programs Currently in Execution</h3>
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
                  {programs.filter(p => (p.status === 'Approved' || p.status === 'In Progress') && p.project_manager_assigned_name).length > 0 ? (
                    programs
                      .filter(p => (p.status === 'Approved' || p.status === 'In Progress') && p.project_manager_assigned_name)
                      .map(pgm => (
                        <tr key={pgm.id} style={trStyle}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{pgm.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{formatDate(pgm.start_date)} to {formatDate(pgm.end_date)}</div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '25px', height: '25px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', color: '#fff', fontWeight: 'bold', fontSize: '10px' }}>{pgm.project_manager_assigned_name.charAt(0)}</div>
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
                              style={{ ...primBtn, padding: '8px 15px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                              {loadingStats ? 'Loading...' : 'Live Track '}
                            </button>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr><td colSpan="4" style={{ ...tdStyle, textAlign: 'center' }}>No active working programs to track.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}


      {/* RESOURCE PERFORMANCE & ANALYTICS OPERATION VIEW */}
      {activeTab === 'resource_analytics' && (
        <ResourceAnalytics resources={resources} />
      )}

      {/* NEW MODAL: Real-time Live Tracking Charts */}
      <ProgramTrackerModal
        isOpen={showTrackerModal}
        onClose={() => setShowTrackerModal(false)}
        selectedProgramStats={selectedProgramStats}
        onDownloadCSV={handleDownloadReport}
      />

      {showReviewModal && selectedReview && (
        <PGMPlanReview
          selectedReview={selectedReview}
          onCloseReview={() => setShowReviewModal(false)}
          returnNote={returnNote}
          onReturnNoteChange={setReturnNote}
          onDecision={(decision) => handleDecision(selectedReview.id, decision)}
        />
      )}




      {showModal && (
        <PGMProgramForm
          formData={formData}
          onFormChange={(key, val) => setFormData({ ...formData, [key]: val })}
          onSubmit={handleCreateProgram}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* BULK IMPORT MODAL */}
      {showImportModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: parsedRecords.length > 0 ? '900px' : '550px', maxHeight: '90vh', overflowY: 'auto', transition: 'width 0.3s ease-in-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1B3A6B' }}>Automated Spreadsheet Bulk Program Import</h3>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Upload Excel (.xlsx, .xls) or CSV files to quickly provision multiple programs.</p>
              </div>
              <button onClick={() => { setShowImportModal(false); setParsedRecords([]); setParseSummary(null); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Drag & Drop Standard File Upload Block */}
            <div style={{ padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '10px', background: '#f8fafc', textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Drag and drop your Excel or CSV file here, or click to upload</p>
              <p style={{ margin: '0 0 15px 0', fontSize: '11px', color: '#64748b' }}>Supports headers: <b>Program Name</b>, <b>Description</b>, <b>Start Date</b>, <b>End Date</b></p>
              
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
                id="bulk-excel-uploader" 
              />
              <label 
                htmlFor="bulk-excel-uploader" 
                style={{ ...primBtn, background: '#2563eb', padding: '8px 16px', fontSize: '12px', display: 'inline-block', cursor: 'pointer' }}
              >
                Choose File
              </label>

              <button 
                onClick={handleDownloadTemplate} 
                style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', fontSize: '12px', marginLeft: '15px', cursor: 'pointer', fontWeight: '600' }}
              >
                Download CSV Template
              </button>
            </div>

            {/* LOADING SPINNER */}
            {isParsing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ margin: '15px 0 0 0', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Parsing spreadsheet & running database duplicate validation checks...</p>
              </div>
            )}

            {/* PREVIEW CONTAINER */}
            {!isParsing && parsedRecords.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', padding: '12px 18px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#1e3a8a', fontWeight: 'bold' }}>
                    Spreadsheet Parsed: <b>{parseSummary?.total_records} Rows Total</b>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', fontSize: '12px' }}>
                    <span style={{ color: '#166534', fontWeight: 'bold' }}>✓ {parseSummary?.valid_records} Ready</span>
                    <span style={{ color: '#991b1b', fontWeight: 'bold' }}>✗ {parseSummary?.invalid_records} Errors</span>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#1e293b' }}>Import Preview Table</h4>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>ROW</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>PROGRAM NAME</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>TIMELINE</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>DESCRIPTION</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>VERIFICATION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRecords.map((r) => (
                        <tr 
                          key={r.row_index} 
                          style={{ 
                            borderBottom: '1px solid #e2e8f0', 
                            background: r.is_valid ? '#fefefe' : '#fff5f5',
                            transition: 'background 0.2s'
                          }}
                        >
                          <td style={{ padding: '10px', fontWeight: 'bold', color: '#64748b' }}>{r.row_index}</td>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: r.is_valid ? '#0f172a' : '#991b1b' }}>{r.name || '(Empty)'}</td>
                          <td style={{ padding: '10px', color: '#475569' }}>
                            {r.start_date || r.end_date ? `${formatDate(r.start_date)} to ${formatDate(r.end_date)}` : 'No Dates Specified'}
                          </td>
                          <td style={{ padding: '10px', color: '#64748b', maxLines: 1, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '200px' }}>
                            {r.description || '-'}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {r.is_valid ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '10px' }}>
                                ✓ Ready to Import
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '10px', width: 'fit-content' }}>
                                  ✗ Validation Failed
                                </span>
                                <ul style={{ margin: 0, paddingLeft: '12px', color: '#b91c1c', fontSize: '10px', lineHeight: '1.3' }}>
                                  {r.errors.map((err, errIdx) => (
                                    <li key={errIdx}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    onClick={() => { setParsedRecords([]); setParseSummary(null); }} 
                    style={{ ...secBtn, padding: '8px 16px', fontSize: '12px' }}
                  >
                    Clear Preview
                  </button>
                  <button 
                    disabled={isImporting || parseSummary?.valid_records === 0} 
                    onClick={handleApproveImport} 
                    style={{ 
                      ...primBtn, 
                      background: parseSummary?.valid_records === 0 ? '#cbd5e1' : '#10b981', 
                      cursor: parseSummary?.valid_records === 0 ? 'not-allowed' : 'pointer',
                      padding: '8px 18px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                  >
                    {isImporting ? 'Importing Valid Programs...' : `Approve & Import ${parseSummary?.valid_records} Programs`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
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
// All shared styles are cleanly imported from DashboardStyles.js above

const SummaryCard = ({ num, label, isAmber }) => (
  <div style={summCard}>
    <div style={{ fontSize: '24px', fontWeight: '800', color: isAmber ? '#d97706' : '#1B3A6B' }}>{num}</div>
    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase' }}>{label}</div>
  </div>
);

export default PGMDashboard;