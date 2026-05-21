import React from 'react';
import { summCard } from '../common/DashboardStyles';

const SummaryCard = ({ num, label, isAmber }) => (
  <div style={summCard}>
    <div style={{ fontSize: '24px', fontWeight: '800', color: isAmber ? '#d97706' : '#1B3A6B' }}>{num}</div>
    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase' }}>{label}</div>
  </div>
);

export default function PGMOverview({
  programs,
  pendingProjects,
  resources,
  username
}) {
  const cardGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '20px',
    marginBottom: '30px',
    marginTop: '20px'
  };

  const myRes = resources.find(r => r.username === username);
  const myFteVal = myRes ? myRes.assigned_fte : 0;
  const myStatus = myRes ? myRes.workload_status : 'Free';
  const myColor = myRes ? myRes.workload_color : 'Green';

  return (
    <div style={cardGrid}>
      <SummaryCard num={programs.length} label="Total Programs" />
      <SummaryCard num={pendingProjects.length} label="Pending Approvals" isAmber={pendingProjects.length > 0} />
      <SummaryCard num={programs.filter(p => p.status === 'Approved').length} label="Active Programs" />
      <SummaryCard num="94%" label="Resource Health" />
      <SummaryCard 
        num={`${myFteVal.toFixed(2)} FTE`} 
        label={`Your FTE Load (${myStatus})`} 
        isAmber={myColor === 'Red' || myColor === 'Yellow'} 
      />
    </div>
  );
}
