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
import UserProfileModal from './common/UserProfileModal';
import PGMProgramImportModal from './pgm/PGMProgramImportModal';
import PGMWorkingPrograms from './pgm/PGMWorkingPrograms';
import PGMPlanReview from './pgm/PGMPlanReview';


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

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profileData={profileData}
      />


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
          <PGMWorkingPrograms
            programs={programs}
            formatDate={formatDate}
            handleLiveTrack={handleLiveTrack}
            loadingStats={loadingStats}
          />
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

      <PGMProgramImportModal
        showImportModal={showImportModal}
        onClose={() => { setShowImportModal(false); setParsedRecords([]); setParseSummary(null); }}
        isParsing={isParsing}
        parsedRecords={parsedRecords}
        parseSummary={parseSummary}
        isImporting={isImporting}
        onFileChange={handleFileChange}
        onDownloadTemplate={handleDownloadTemplate}
        onApproveImport={handleApproveImport}
        formatDate={formatDate}
      />
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