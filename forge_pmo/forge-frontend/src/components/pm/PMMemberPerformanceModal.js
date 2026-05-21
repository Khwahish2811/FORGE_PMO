import React from 'react';

export default function PMMemberPerformanceModal({ selectedMemberDetail, onClose }) {
  if (!selectedMemberDetail) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: '600px', borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#1B3A6B' }}>Member Performance: {selectedMemberDetail.username}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
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
  );
}
