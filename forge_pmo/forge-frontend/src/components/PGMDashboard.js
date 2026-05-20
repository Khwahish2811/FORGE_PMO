import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from 'recharts';

import ProgramTrackerModal from './common/ProgramTrackerModal';
import ResourceAnalytics from './common/ResourceAnalytics';


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
  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
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
    const interval = setInterval(() => {
      fetchData();
      fetchResources();
    }, 5000); // Auto refresh every 5 seconds
    const handleFocus = () => { fetchData(); fetchUserProfile(); fetchResources(); };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData, fetchUserProfile, fetchResources]);


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
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => setShowProfileModal(true)}>
            <span style={{ fontSize: '12px' }}>Welcome, <b>{username}</b></span>
            <div style={{ width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', fontWeight: 'bold' }}>{username?.charAt(0).toUpperCase() || 'U'}</div>
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
              {(() => {
                const myRes = resources.find(r => r.username === username);
                const myFteVal = myRes ? myRes.assigned_fte : 0;
                const myStatus = myRes ? myRes.workload_status : 'Free';
                const myColor = myRes ? myRes.workload_color : 'Green';
                return (
                  <SummaryCard 
                    num={`${myFteVal.toFixed(2)} FTE`} 
                    label={`Your FTE Load (${myStatus})`} 
                    isAmber={myColor === 'Red' || myColor === 'Yellow'} 
                  />
                );
              })()}
            </div>

            <div style={{ padding: '0 25px 25px' }}>
              {/* 1. ACTION REQUIRED */}
              <div style={{ marginBottom: '35px' }}>
                <div style={alertHeader}>
                  <h3 style={{ ...sectionTitle, color: '#92400e' }}> Action Required: Project Approvals</h3>
                  <span style={{ fontWeight: 'bold' }}>{pendingProjects.length} Pending</span>
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
                              <span style={{ fontWeight: 700, color: '#1B3A6B' }}>{proj.name}</span><br />
                              <small style={{ color: '#666' }}>Program: {proj.program_name}</small>
                            </td>
                            <td style={tdStyle}>{proj.created_by_name || proj.pm_name}</td>
                            <td style={tdStyle}>{formatDate(proj.start_date)} to {formatDate(proj.end_date)}</td>
                            <td style={tdStyle}>
                              <button onClick={() => { setSelectedReview(proj); setShowReviewModal(true); }} style={reviewBtn}>
                                Review Plan
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" style={{ ...tdStyle, textAlign: 'center' }}>No pending approvals found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 1b. ADDITIONAL SPRINT APPROVALS - NEW FLOW */}
              {pendingSprints.length > 0 && (
                <div style={{ marginBottom: '35px' }}>
                  <div style={{ ...alertHeader, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                    <h3 style={{ ...sectionTitle, color: '#fff' }}> Action Required: Additional Sprint Approvals</h3>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{pendingSprints.length} Pending Sprint(s)</span>
                  </div>
                  <div style={{ ...tableContainer, border: '1px solid #fef3c7' }}>
                    <table style={tableStyle}>
                      <thead style={{ ...theadStyle, background: '#fef3c7' }}>
                        <tr>
                          <th style={{ ...thStyle, color: '#92400e' }}>SPRINT DETAILS</th>
                          <th style={{ ...thStyle, color: '#92400e' }}>PROJECT INFO</th>
                          <th style={{ ...thStyle, color: '#92400e' }}>TIMELINE</th>
                          <th style={{ ...thStyle, color: '#92400e' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingSprints.map(s => (
                          <tr key={s.sprint_id} style={trStyle}>
                            <td style={tdStyle}>
                              <span style={{ fontWeight: 700, color: '#b45309' }}>{s.sprint_name}</span><br />
                              <small style={{ color: '#666' }}>Requested by: PM (<b>{s.pm_username}</b>)</small>
                            </td>
                            <td style={tdStyle}>
                              <span style={{ fontWeight: 700, color: '#1E293B' }}>{s.project_name}</span><br />
                              <small style={{ color: '#64748B' }}>Program: {s.program_name}</small>
                            </td>
                            <td style={tdStyle}>{formatDate(s.start_date)} to {formatDate(s.end_date)}</td>
                            <td style={tdStyle}>
                              <button onClick={() => { setSelectedSprintReview(s); setShowSprintReviewModal(true); }} style={{ ...reviewBtn, backgroundColor: '#ea580c' }}>
                                Review Sprint
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. ACTIVE PROGRAMS LIST */}
              <div style={{ marginBottom: '35px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={sectionTitle}>All Programs Overview</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowModal(true)} style={primBtn}>+ Create New Program</button>
                    <button onClick={() => setShowImportModal(true)} style={{ ...primBtn, background: '#10b981' }}>+ Bulk Import Programs</button>
                  </div>
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
                            {(pgm.status === 'Approved' || pgm.status === 'In Progress') ? (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <select style={miniSelect} onChange={(e) => setSelectedPMs({ ...selectedPMs, [pgm.id]: e.target.value })}>
                                  <option value="">Select PM</option>
                                  {pmList.map(pm => <option key={pm.id} value={pm.id}>{pm.username}</option>)}
                                </select>
                                <button onClick={() => handleAssignPM(pgm.id)} style={assignBtn}>Update</button>
                              </div>
                            ) : <span style={{ fontSize: '11px', fontStyle: 'italic' }}>Waiting Approval</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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

      {/* MODAL: Review Plan (Original Code - Preserved) */}
      {showReviewModal && selectedReview && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#1B3A6B', borderBottom: '2px solid #2563EB', paddingBottom: '10px' }}>Project Plan Review</h2>
            <div style={reviewGrid}>
              <div><label style={lbl}>Project Name</label><div style={valText}>{selectedReview.project_name || selectedReview.name}</div></div>
              <div><label style={lbl}>Submitted By</label><div style={valText}>{selectedReview.pm_name || selectedReview.created_by_name}</div></div>
            </div>
            <label style={lbl}>Description</label>
            <div style={valText}>{selectedReview.description || 'No description provided'}</div>
            <h4 style={{ marginTop: '20px' }}> Team & Resource Allocation</h4>
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
                  ) : (<tr><td colSpan="3" style={{ ...tdStyle, textAlign: 'center' }}>No members found</td></tr>)}
                </tbody>
              </table>
            </div>
            <h4 style={{ marginTop: '20px' }}> Proposed Sprints</h4>
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
                        <td style={tdStyle}>{s.name}</td><td style={tdStyle}>{formatDate(s.start_date)} to {formatDate(s.end_date)}</td>
                        <td style={tdStyle}>
                          <span style={{ height: '10px', width: '10px', borderRadius: '50%', backgroundColor: getStatusColor(s.end_date), display: 'inline-block', marginRight: '5px' }}></span>
                          <span style={{ fontSize: '11px', color: getStatusColor(s.end_date) }}>{new Date(s.end_date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0) ? 'Overdue' : 'On Track'}</span>
                        </td>
                      </tr>
                    ))
                  ) : (<tr><td colSpan="3" style={{ ...tdStyle, textAlign: 'center' }}>No sprints found</td></tr>)}
                </tbody>
              </table>
            </div>

            <h4 style={{ marginTop: '20px' }}>Return Note (Required for Return)</h4>
            <textarea
              style={{ ...inp, height: '60px', marginBottom: '0' }}
              placeholder="Please specify why this project is being returned..."
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
            ></textarea>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowReviewModal(false)} style={secBtn}>Back</button>
              <button
                onClick={() => handleDecision(selectedReview.id, 'approve')}
                style={{ ...primBtn, backgroundColor: '#10b981' }}
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(selectedReview.id, 'return')}
                style={{ ...primBtn, backgroundColor: '#f59e0b' }}
              >
                Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REVIEW ADDITIONAL SPRINT MODAL --- */}
      {showSprintReviewModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: '500px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Review Additional Sprint</h3>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px', marginTop: '4px', display: 'inline-block', fontWeight: 'bold' }}>Active Project Request</span>
              </div>
              <button onClick={() => setShowSprintReviewModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', opacity: 0.8 }}>✕</button>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309' }}>Project Status: IN PROGRESS</span>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#92400e', lineHeight: '1.4' }}>This project has already started. This is a request from the Project Manager (<b>{selectedSprintReview?.pm_username}</b>) to add a new sprint to the timeline.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ ...lbl, fontSize: '12px', color: '#78350f' }}>Project Name</label>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{selectedSprintReview?.project_name}</div>
                </div>
                <div>
                  <label style={{ ...lbl, fontSize: '12px', color: '#78350f' }}>Program Name</label>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{selectedSprintReview?.program_name}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ ...lbl, fontSize: '12px', color: '#78350f' }}>Requested Sprint</label>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{selectedSprintReview?.sprint_name}</div>
                </div>
                <div>
                  <label style={{ ...lbl, fontSize: '12px', color: '#78350f' }}>Sprint Timeline</label>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>{formatDate(selectedSprintReview?.start_date)} to {formatDate(selectedSprintReview?.end_date)}</div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ ...lbl, fontSize: '12px', color: '#78350f' }}>Feedback Notes (Required only for Return)</label>
                <textarea
                  style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #e2e8f0', height: '80px', resize: 'vertical' }}
                  placeholder="Enter return notes or feedback..."
                  value={sprintReturnNote}
                  onChange={(e) => setSprintReturnNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setShowSprintReviewModal(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => handleReviewSprintSubmit('Returned')} style={{ background: '#ea580c', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Return to PM</button>
                <button onClick={() => handleReviewSprintSubmit('Approved')} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Approve Sprint</button>
              </div>
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
              <input style={inp} required onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label style={lbl}>Start Date</label><input style={inp} type="date" required onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
                <div><label style={lbl}>End Date</label><input style={inp} type="date" required onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
              </div>
              <label style={lbl}>Description</label>
              <textarea style={{ ...inp, height: '80px' }} placeholder="Program details..." onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
              <label style={lbl}>Reference Document</label>
              <input type="file" style={inp} onChange={(e) => setFormData({ ...formData, document: e.target.files[0] })} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={secBtn}>Cancel</button>
                <button type="submit" style={primBtn}>Create Program</button>
              </div>
            </form>
          </div>
        </div>
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
const layoutContainer = { 
  display: 'flex', 
  minHeight: '100vh', 
  backgroundColor: '#f8fafc', 
  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  overflow: 'hidden'
};
const sidebarStyle = { 
  width: '240px', 
  backgroundColor: '#1B3A6B', 
  color: '#fff', 
  display: 'flex', 
  flexDirection: 'column', 
  flexShrink: 0, 
  position: 'fixed', 
  height: '100vh', 
  left: 0, 
  top: 0, 
  zIndex: 100, 
  borderRight: '1px solid #1e293b' 
};
const sidebarScrollArea = { 
  flex: 1, 
  overflowY: 'auto',
  padding: '20px 0'
};
const logoBox = { 
  display: 'flex', 
  flexDirection: 'column', 
  gap: '2px', 
  padding: '25px 20px', 
  borderBottom: '1px solid rgba(255,255,255,0.1)' 
};
const sbItem = {
  padding: '12px 20px',
  marginLeft: '10px',
  marginRight: '10px',
  marginBottom: '4px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '500',
  color: '#cbd5e1',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.2s',
  borderLeft: '4px solid transparent',
  fontFamily: "'Inter', 'Segoe UI', sans-serif"
};
const activeSbItem = {
  ...sbItem,
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  color: '#fff',
  fontWeight: '600',
  borderLeft: '4px solid #60A5FA',
  borderRadius: '0 8px 8px 0',
  marginLeft: '0',
  paddingLeft: '16px'
};
const topHeaderStyle = { 
  padding: '20px 25px', 
  background: '#fff', 
  borderBottom: '1px solid #e2e8f0', 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center' 
};
const mainContentStyle = { 
  flex: 1, 
  marginLeft: '240px', 
  overflowY: 'auto', 
  backgroundColor: '#F4F7FB', 
  minHeight: '100vh' 
};
const logoutBtnSide = { 
  margin: '20px 15px', 
  background: 'transparent', 
  border: '1px solid #ef4444', 
  color: '#ef4444', 
  padding: '12px', 
  borderRadius: '8px', 
  cursor: 'pointer', 
  fontWeight: 'bold', 
  transition: 'all 0.2s',
  textAlign: 'center'
};
const cardGrid = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', padding: '25px' };
const summCard = { background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' };
const sectionTitle = { margin: 0, color: '#1B3A6B', fontSize: '14px', fontWeight: '800' };
const alertHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', padding: '12px 20px', borderRadius: '8px 8px 0 0', border: '1px solid #fef3c7' };
const tableContainer = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0 0 8px 8px', overflow: 'hidden' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const theadStyle = { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' };
const thStyle = { padding: '15px', textAlign: 'left', color: '#64748B', fontSize: '11px', fontWeight: '700' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' };
const trStyle = { transition: '0.2s hover' };
const primBtn = { background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' };
const reviewBtn = { background: '#1B3A6B', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const secBtn = { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer' };
const assignBtn = { background: '#10B981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' };
const miniSelect = { padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalBox = { background: '#fff', padding: '35px', borderRadius: '15px', width: '500px' };
const lbl = { display: 'block', fontSize: '11px', fontWeight: '800', marginBottom: '6px', color: '#64748B' };
const inp = { width: '100%', padding: '12px', marginBottom: '18px', border: '1px solid #e2e8f0', borderRadius: '6px' };
const valText = { background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #eff6ff', marginBottom: '15px', fontSize: '14px' };
const reviewGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };
const miniTableContainer = { border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginTop: '10px' };
const miniTh = { padding: '10px', textAlign: 'left', fontSize: '10px', color: '#64748B' };
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