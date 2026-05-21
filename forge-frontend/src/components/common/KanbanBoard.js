import React from 'react';

// Helpers
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

// Styling
const sectionTitlePremium = { fontSize: '20px', fontWeight: '800', color: '#1B3A6B', marginBottom: '20px', textAlign: 'left' };
const sprintHeader = { background: '#fff', padding: '15px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' };
const sprintBadge = (status) => ({ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', background: status === 'In Progress' ? '#DBEAFE' : '#F1F5F9', color: status === 'In Progress' ? '#1E40AF' : '#64748B' });
const kanbanGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' };
const columnStyle = { background: '#F8FAFC', borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column' };
const colTitleGroup = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' };
const colTitle = { fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' };
const colCount = { background: '#E2E8F0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' };
const cardListStyle = { display: 'flex', flexDirection: 'column', gap: '12px' };
const cardStylePremium = { background: '#fff', padding: '18px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', textAlign: 'left' };
const tagStyle = (prio) => ({ background: prio?.toLowerCase() === 'high' ? '#FEF2F2' : '#F8FAFC', color: prio?.toLowerCase() === 'high' ? '#EF4444' : '#64748B', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' });
const cardTitleStyleMain = { fontSize: '14px', color: '#0F172A', marginTop: '5px', display: 'block', lineHeight: '1.4' };
const cardActions = { display: 'flex', gap: '8px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f1f5f9' };
const moveBtnPrimary = { flex: 1, padding: '8px', fontSize: '12px', cursor: 'pointer', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600' };
const finishBtn = { flex: 1, background: '#10B981', color: '#fff', border: 'none', padding: '8px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' };
const btnFocusSmall = { padding: '8px', fontSize: '12px', cursor: 'pointer', background: '#FFF7ED', color: '#EA580C', border: '1px solid #FFEDD5', borderRadius: '6px', fontWeight: '600', transition: 'background 0.2s' };
const moveBtnSecondary = { flex: 1, padding: '8px', fontSize: '11px', cursor: 'pointer', background: '#fff', color: '#64748B', border: '1px dashed #CBD5E1', borderRadius: '6px', fontWeight: '600' };

const KanbanBoard = ({ tasksBySprint = {}, updateStatus, startFocusForTask }) => {
  return (
    <div style={{ padding: '0 25px 25px 25px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={sectionTitlePremium}>Sprint Execution</h3>
      </div>

      {Object.keys(tasksBySprint).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#fff', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
          No sprints or tasks created for this project yet.
        </div>
      ) : (
        Object.keys(tasksBySprint).sort().map(sprintName => {
          const firstTask = tasksBySprint[sprintName][0];
          const sprintStatus = firstTask?.sprint_status || 'Planned';

          return (
            <div key={sprintName} style={{ marginBottom: '40px' }}>
              <div style={sprintHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1B3A6B' }}>{sprintName}</span>
                  <span style={sprintBadge(sprintStatus)}>{sprintStatus}</span>
                </div>
              </div>

              <div style={kanbanGrid}>
                {['To Do', 'In Progress', 'Done'].map(col => (
                  <div key={col} style={columnStyle}>
                    <div style={colTitleGroup}>
                      <span style={colTitle}>{col}</span>
                      <span style={colCount}>{tasksBySprint[sprintName].filter(t => t.status === col).length}</span>
                    </div>
                    <div style={cardListStyle}>
                      {tasksBySprint[sprintName].filter(t => t.status === col).map(task => (
                        <div key={task.id} style={cardStylePremium}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                            <span style={tagStyle(task.priority)}>{task.priority}</span>
                            <small style={{ color: '#94a3b8', fontSize: '10px' }}>#{task.id}</small>
                          </div>
                          <strong style={cardTitleStyleMain}>{task.task_title}</strong>
                          
                          {/* Premium Hierarchy Context block */}
                          <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: '#f8fafc',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            fontSize: '11px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748B', fontWeight: 'bold' }}>Program:</span>
                              <span style={{ color: '#1B3A6B', fontWeight: 'bold', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.program_name}>{task.program_name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748B', fontWeight: 'bold' }}>Project:</span>
                              <span style={{ color: '#334155', fontWeight: '700', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.project_name}>{task.project_name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748B', fontWeight: 'bold' }}>PM:</span>
                              <span style={{ color: '#2563EB', fontWeight: 'bold' }}>{task.project_manager}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                              <span style={{ color: '#64748B', fontWeight: 'bold' }}>Sprint End:</span>
                              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{task.sprint_deadline}</span>
                            </div>
                          </div>

                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Task Due: {formatDate(task.due_date)}</span>
                            <span>{task.hours_logged || 0}h logged</span>
                          </div>

                          <div style={cardActions}>
                            {task.status === 'To Do' && (
                              <button onClick={() => updateStatus(task.id, 'In Progress')} style={moveBtnPrimary}>Start Work</button>
                            )}
                            {task.status === 'In Progress' && (
                              <>
                                {startFocusForTask && (
                                  <button onClick={() => startFocusForTask(task)} style={btnFocusSmall}>⚡ Focus</button>
                                )}
                                <button onClick={() => updateStatus(task.id, 'Done')} style={finishBtn}>Mark Done</button>
                              </>
                            )}
                            {task.status === 'Done' && (
                              <button onClick={() => updateStatus(task.id, 'In Progress')} style={moveBtnSecondary}>Re-open</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default KanbanBoard;
