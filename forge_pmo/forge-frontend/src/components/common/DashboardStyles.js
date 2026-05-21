// Shared styling tokens and utility styles for FORGE PMO Dashboards

export const layoutContainer = { 
  display: 'flex', 
  minHeight: '100vh', 
  backgroundColor: '#f8fafc', 
  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  overflow: 'hidden'
};

export const sidebarStyle = { 
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

export const sidebarScrollArea = { 
  flex: 1, 
  overflowY: 'auto',
  padding: '20px 0'
};

export const logoBox = { 
  display: 'flex', 
  flexDirection: 'column', 
  gap: '2px', 
  padding: '25px 20px', 
  borderBottom: '1px solid rgba(255,255,255,0.1)' 
};

export const sbItem = {
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

export const activeSbItem = {
  ...sbItem,
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  color: '#fff',
  fontWeight: '600',
  borderLeft: '4px solid #60A5FA',
  borderRadius: '0 8px 8px 0',
  marginLeft: '0',
  paddingLeft: '16px'
};

export const topHeaderStyle = { 
  padding: '20px 25px', 
  background: '#fff', 
  borderBottom: '1px solid #e2e8f0', 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center' 
};

export const mainContentStyle = { 
  flex: 1, 
  marginLeft: '240px', 
  overflowY: 'auto', 
  backgroundColor: '#F4F7FB', 
  minHeight: '100vh' 
};

export const logoutBtnSide = { 
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

export const cardGrid = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', padding: '25px' };

export const summCard = { background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' };

export const sectionTitle = { margin: 0, color: '#1B3A6B', fontSize: '14px', fontWeight: '800' };

export const alertHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', padding: '12px 20px', borderRadius: '8px 8px 0 0', border: '1px solid #fef3c7' };

export const tableContainer = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' };

export const tableStyle = { width: '100%', borderCollapse: 'collapse' };

export const theadStyle = { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' };

export const thStyle = { padding: '15px', textAlign: 'left', color: '#64748B', fontSize: '11px', fontWeight: '700' };

export const tdStyle = { padding: '15px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' };

export const trStyle = { transition: '0.2s hover' };

export const primBtn = { background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' };

export const secBtn = { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer' };

export const reviewBtn = { background: '#1B3A6B', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };

export const assignBtn = { background: '#10B981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' };

export const miniSelect = { padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' };

export const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };

export const modalBox = { background: '#fff', padding: '35px', borderRadius: '15px', width: '500px' };

export const lbl = { display: 'block', fontSize: '11px', fontWeight: '800', marginBottom: '6px', color: '#64748B' };

export const inp = { width: '100%', padding: '12px', marginBottom: '18px', border: '1px solid #e2e8f0', borderRadius: '6px' };

export const valText = { background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #eff6ff', marginBottom: '15px', fontSize: '14px' };

export const reviewGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };

export const miniTableContainer = { border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginTop: '10px' };

export const miniTh = { padding: '10px', textAlign: 'left', fontSize: '10px', color: '#64748B' };

export const logoutBtnStyle = { padding: '5px 10px', fontSize: '11px', cursor: 'pointer', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px' };

export const statusBadge = (s) => ({
  fontSize: '10px', padding: '4px 12px', borderRadius: '20px', fontWeight: '800',
  background: s === 'Approved' ? '#dcfce7' : s === 'Rejected' ? '#fee2e2' : '#fef3c7',
  color: s === 'Approved' ? '#166534' : s === 'Rejected' ? '#991b1b' : '#92400e',
});
