import React from 'react';
import {
  tableContainer, tableStyle, theadStyle, thStyle, tdStyle, trStyle,
  primBtn, statusBadge
} from '../common/DashboardStyles';

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

const innerCardStyle = { background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' };
const innerTitleStyle = { margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#1B3A6B' };
const miniTableStyle = { width: '100%', borderCollapse: 'collapse' };
const miniTheadStyle = { borderBottom: '2px solid #f1f5f9' };
const miniThStyle = { padding: '10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' };
const miniTrStyle = { borderBottom: '1px solid #f1f5f9' };
const miniTdStyle = { padding: '10px', fontSize: '13px', color: '#475569' };

export default function PMOngoingWorkspace({
  myProjects,
  expandedProjectId,
  onToggleExpand,
  onCreateTask,
  onUpdateNote,
  onAddSprint,
  onTriggerUpdateSprint
}) {
  const getSmartInsights = () => {
    const overloaded = [];
    const available = [];
    const atRiskProjects = [];

    myProjects.forEach(project => {
      const activeTasksCount = project.sprints?.reduce((total, sprint) => {
        return total + (sprint.tasks?.filter(t => t.status !== 'Done').length || 0);
      }, 0) || 0;

      if (activeTasksCount === 0) {
        atRiskProjects.push(project.name);
      }

      if (project.team_members) {
        const userTaskCounts = {};
        project.team_members.forEach(m => {
          if (!userTaskCounts[m.username]) userTaskCounts[m.username] = 0;
          userTaskCounts[m.username] += (m.task_count || 0);
        });
        Object.entries(userTaskCounts).forEach(([username, count]) => {
          if (count === 0) {
            if (!available.includes(username)) available.push(username);
          }
          if (count > 5) {
            if (!overloaded.includes(username)) overloaded.push(username);
          }
        });
      }
    });

    return { overloaded, available, atRiskProjects };
  };

  const insights = getSmartInsights();

  return (
    <div>
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
          <tr>
            <th style={thStyle}>PROJECT NAME</th>
            <th style={thStyle}>PROGRAM</th>
            <th style={thStyle}>TEAM STACK</th>
            <th style={thStyle}>STATUS</th>
            <th style={thStyle}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {myProjects.length > 0 ? (
            myProjects.map((project) => (
              <React.Fragment key={project.id}>
                <tr style={trStyle}>
                  <td style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => onToggleExpand(project.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {expandedProjectId === project.id ? '▼' : '►'}
                      </span>
                      <b style={{ color: '#1e293b' }}>{project.name}</b>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Timeline: {formatDate(project.start_date)} to {formatDate(project.end_date)}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                      {project.program_name || 'Unlinked Program'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                          );
                        })
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
                    {(project.status === 'Active' || project.status === 'Approved' || project.status === 'In Progress') ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => onCreateTask(project)}
                          style={{ ...primBtn, padding: '6px 12px', fontSize: '11px' }}
                        >
                          + Create Task
                        </button>
                        <button
                          onClick={() => onUpdateNote(project)}
                          style={{ ...primBtn, backgroundColor: '#4f46e5', padding: '6px 12px', fontSize: '11px' }}
                        >
                          Update Note
                        </button>
                        <button
                          onClick={() => onAddSprint(project)}
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
                            <thead>
                              <tr style={miniTheadStyle}>
                                <th style={miniThStyle}>Member</th>
                                <th style={miniThStyle}>Role</th>
                                <th style={miniThStyle}>FTE</th>
                                <th style={miniThStyle}>Tasks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {project.team_members?.map((m, idx) => (
                                <tr key={idx} style={miniTrStyle}>
                                  <td style={miniTdStyle}>{m.username}</td>
                                  <td style={miniTdStyle}>{m.role}</td>
                                  <td style={miniTdStyle}>{m.fte}</td>
                                  <td style={miniTdStyle}>
                                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                                      {m.task_count || 0}
                                    </span>
                                  </td>
                                </tr>
                              )) || <tr><td colSpan="4">No members</td></tr>}
                            </tbody>
                          </table>
                        </div>
                        <div style={innerCardStyle}>
                          <h5 style={innerTitleStyle}> Sprint Timeline</h5>
                          <table style={miniTableStyle}>
                            <thead>
                              <tr style={miniTheadStyle}>
                                <th style={miniThStyle}>Sprint</th>
                                <th style={miniThStyle}>Duration</th>
                                <th style={miniThStyle}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {project.sprints?.map((s, idx) => {
                                const sColor = getStatusColor(s.end_date);
                                let sBadge = null;
                                if (s.status === 'Pending Approval') {
                                  sBadge = <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Pending Approval</span>;
                                } else if (s.status === 'Returned') {
                                  sBadge = <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Returned</span>;
                                } else {
                                  sBadge = <span style={{ backgroundColor: sColor === '#ef4444' ? '#fee2e2' : '#DCFCE7', color: sColor, padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{sColor === '#ef4444' ? 'Overdue' : 'On Track'}</span>;
                                }
                                return (
                                  <tr key={idx} style={miniTrStyle}>
                                    <td style={miniTdStyle}>{s.name}</td>
                                    <td style={miniTdStyle}>{formatDate(s.start_date)} to {formatDate(s.end_date)}</td>
                                    <td style={miniTdStyle}>
                                      {sBadge}
                                      {s.status === 'Returned' && (
                                        <div style={{ marginTop: '5px' }}>
                                          {s.return_note && <div style={{ fontSize: '11px', color: '#b91c1c', marginBottom: '4px' }}><strong>Note:</strong> {s.return_note}</div>}
                                          <button 
                                            onClick={() => onTriggerUpdateSprint(s, project)}
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
            ))
          ) : (
            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No active projects under management.</td></tr>
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
}
