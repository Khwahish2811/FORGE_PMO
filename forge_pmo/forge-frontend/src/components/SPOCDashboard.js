import React, { useState, useEffect, useCallback } from 'react';

const SPOCDashboard = ({ username, onLogout }) => {
  const [allPrograms, setAllPrograms] = useState([]);
  const [displayPrograms, setDisplayPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/all-programs/');
      if (response.ok) {
        const data = await response.json();
        setAllPrograms(data);

        const filtered = data.filter(p =>
          activeTab === 'pending'
            ? p.status?.toLowerCase() === 'pending'
            : (p.status?.toLowerCase() === 'approved' || p.status?.toLowerCase() === 'rejected')
        );
        setDisplayPrograms(filtered);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (programId, newStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/update-program-status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: programId, status: newStatus })
      });
      if (response.ok) {
        alert(`Program ${newStatus} successfully!`);
        fetchData();
      }
    } catch (err) {
      alert("Backend error!");
    }
  };

  const openDocument = (docPath) => {
    // 1. Handle null or undefined paths from DB
    if (!docPath || docPath === "null" || docPath === "undefined") {
      return alert("Error: not found!");
    }

    const backendBase = "http://127.0.0.1:8000";
    let cleanPath = docPath.trim();

    // 2. Fix the double /media/ issue
    // If the path already starts with /media/, remove it so we can add it cleanly
    if (cleanPath.startsWith('/media/')) {
      cleanPath = cleanPath.replace('/media/', '');
    } else if (cleanPath.startsWith('media/')) {
      cleanPath = cleanPath.replace('media/', '');
    }

    // Remove any leading slash left over
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }

    const finalUrl = `${backendBase}/media/${cleanPath}`;
    console.log("Opening Final URL:", finalUrl);
    window.open(finalUrl, '_blank');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0' }}>
      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={logoBox}>F FORGE</div>
        <div onClick={() => setActiveTab('pending')} style={activeTab === 'pending' ? activeSbItem : sbItem}>Pending Requests</div>
        <div onClick={() => setActiveTab('history')} style={activeTab === 'history' ? activeSbItem : sbItem}>Approval History</div>
        <div style={sbItem}>Reports</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* HEADER */}
        <div style={headerStyle}>
    <span style={{ fontWeight: 700 }}>Business SPOC Dashboard</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontSize: '12px' }}>Welcome, <b>{username || 'pranav_spoc'}</b></span>

        {/* Logout Button */}
        <button
            onClick={onLogout}
            style={{
                padding: '5px 12px',
                fontSize: '11px',
                cursor: 'pointer',
                background: '#EF4444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold'
            }}>
            LOGOUT
        </button>
    </div>
</div>
        {/* SUMMARY CARDS */}
        <div style={cardGrid}>
          <div onClick={() => setActiveTab('pending')} style={summCard(activeTab === 'pending')}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#D97706' }}>
              {allPrograms.filter(p => p.status?.toLowerCase() === 'pending').length}
            </div>
            <div style={cardLabel}>Pending Approvals</div>
          </div>
          <div onClick={() => setActiveTab('history')} style={summCard(activeTab === 'history')}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1B3A6B' }}>
              {allPrograms.filter(p => p.status?.toLowerCase() === 'approved').length}
            </div>
            <div style={cardLabel}>Active/Approved Programs</div>
          </div>
        </div>

        {/* DYNAMIC TABLE SECTION */}
        <div style={{ padding: '20px' }}>
          <h3 style={sectionTitle}>
            {activeTab === 'pending' ? '📥 New Program Requests' : '📋 Approval History (Logs)'}
          </h3>

          <div style={tableContainer}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Updating list...</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr style={theadStyle}>
                    <th style={thStyle}>PROGRAM NAME</th>
                    <th style={thStyle}>MANAGER</th>
                    <th style={thStyle}>TIMELINE</th>
                    <th style={thStyle}>STATUS</th>
                    {activeTab === 'pending' ? <th style={thStyle}>ACTIONS</th> : <th style={thStyle}>DOCS</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayPrograms.length > 0 ? displayPrograms.map((pgm) => (
                    <tr key={pgm.id} style={trStyle}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 'bold', color: '#1B3A6B' }}>{pgm.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{pgm.description}</div>
                      </td>
                      <td style={tdStyle}>{pgm.manager_name || 'shailja_pgm'}</td>
                      <td style={tdStyle}>
                       <div style={{ fontSize: '12px' }}>
    {pgm.start_date && pgm.end_date
      ? `${pgm.start_date} to ${pgm.end_date}`
      : 'Date N/A'}
  </div>
</td>
                      <td style={tdStyle}>
                        <span style={statusBadge(pgm.status)}>{pgm.status}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {activeTab === 'pending' ? (
                            <>
                              <button onClick={() => openDocument(pgm.document)} style={btnDoc}>📄 Doc</button>
                              <button onClick={() => handleAction(pgm.id, 'Approved')} style={btnApprove}>Approve</button>
                              <button onClick={() => handleAction(pgm.id, 'Rejected')} style={btnReject}>Reject</button>
                            </>
                          ) : (
                            <button
                              onClick={() => openDocument(pgm.document)}
                              style={btnHistoryDoc}
                            >
                              📄 View Document
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>No records found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Styles ---
const sidebarStyle = { width: '200px', backgroundColor: '#1B3A6B', color: '#fff' };
const logoBox = { padding: '20px', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #2a4f8a', marginBottom: '10px' };
const sbItem = { padding: '12px 20px', cursor: 'pointer', fontSize: '13px', borderLeft: '4px solid transparent' };
const activeSbItem = { ...sbItem, backgroundColor: '#2563EB', borderLeft: '4px solid #60a5fa', fontWeight: 'bold' };
const headerStyle = { height: '60px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #ddd' };
const cardGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', padding: '20px' };
const summCard = (active) => ({ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: active ? '2px solid #2563EB' : '1px solid #ddd', cursor: 'pointer', textAlign: 'center' });
const cardLabel = { fontSize: '12px', color: '#888', marginTop: '5px', fontWeight: 'bold' };
const sectionTitle = { color: '#1B3A6B', marginBottom: '15px', fontSize: '14px', textTransform: 'uppercase' };
const tableContainer = { backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const theadStyle = { backgroundColor: '#f8fafc', borderBottom: '2px solid #edf2f7' };
const thStyle = { padding: '12px 15px', textAlign: 'left', fontSize: '11px', color: '#64748B' };
const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' };
const trStyle = { transition: 'background 0.2s' };

const btnApprove = { backgroundColor: '#10B981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' };
const btnReject = { backgroundColor: '#EF4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' };
const btnDoc = { backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' };

// Fixed conflicting style properties
const btnHistoryDoc = {
  backgroundColor: '#E0F2FE',
  color: '#0369A1',
  border: '1px solid #7DD3FC',
  padding: '6px 12px',
  borderRadius: '4px',
  cursor: 'pointer'
};

const statusBadge = (s) => {
  const status = s?.toLowerCase();
  let colors = { backgroundColor: '#FEF3C7', color: '#92400E' };
  if (status === 'approved') colors = { backgroundColor: '#DCFCE7', color: '#166534' };
  if (status === 'rejected') colors = { backgroundColor: '#FEE2E2', color: '#991B1B' };
  return { padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', ...colors };
};

export default SPOCDashboard;