import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";

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

// Styling
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalBox = { background: '#fff', padding: '35px', borderRadius: '15px', width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' };
const primBtn = { background: '#2563EB', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' };
const liveStatCard = (color) => ({ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', borderTop: `4px solid ${color}` });
const liveStatLabel = { fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '5px' };
const liveStatValue = { fontSize: '24px', fontWeight: '800', color: '#1B3A6B' };
const chartContainer = { background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' };
const chartHeader = { margin: '0 0 15px 0', fontSize: '13px', color: '#1e293b' };
const legendContainer = { display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '11px', marginTop: '10px' };

const ProgramTrackerModal = ({ isOpen, selectedProgramStats, onClose }) => {
  if (!isOpen || !selectedProgramStats) return null;

  const handleDownloadReport = () => {
    let csv = "Program Name,Project Manager,Overall Progress,Total Tasks,Completed Tasks,Team Members\n";
    csv += `"${selectedProgramStats.program_name}","${selectedProgramStats.pm_name}",${selectedProgramStats.overall_progress}%,${selectedProgramStats.total_tasks},${selectedProgramStats.completed_tasks},${selectedProgramStats.team_count}\n\n`;
    
    csv += "Sprint Name,Completion %\n";
    (selectedProgramStats.velocity_data || []).forEach(s => {
      csv += `"${s.name}",${s.completion}%\n`;
    });
    
    csv += "\nRecent Activity Log\n";
    csv += "User,Sprint,Task,Due Date,Status\n";
    (selectedProgramStats.recent_logs || []).forEach(log => {
      csv += `"${log.user}","${log.sprint || ''}","${log.task_name || ''}","${log.due_date || ''}","${log.status || ''}"\n`;
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

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1B3A6B' }}>Live Tracker: {selectedProgramStats.program_name}</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Tracking real-time execution for Manager: <b>{selectedProgramStats.pm_name}</b></p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleDownloadReport}
              style={{ ...primBtn, background: '#10b981', border: 'none', padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}
            >
              Download Report
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
          </div>
        </div>

        {/* Real-time Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
          <div style={liveStatCard('#2563EB')}>
            <div style={liveStatLabel}>OVERALL COMPLETION</div>
            <div style={liveStatValue}>{selectedProgramStats.overall_progress}%</div>
          </div>
          <div style={liveStatCard('#10B981')}>
            <div style={liveStatLabel}>TOTAL TASKS</div>
            <div style={liveStatValue}>{selectedProgramStats.total_tasks}</div>
          </div>
          <div style={liveStatCard('#f59e0b')}>
            <div style={liveStatLabel}>COMPLETED</div>
            <div style={liveStatValue}>{selectedProgramStats.completed_tasks}</div>
          </div>
          <div style={liveStatCard('#6366f1')}>
            <div style={liveStatLabel}>TEAM MEMBERS</div>
            <div style={liveStatValue}>{selectedProgramStats.team_count}</div>
          </div>
        </div>

        {/* Data Visualization Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
          <div style={chartContainer}>
            <h4 style={chartHeader}>Sprint Progress Velocity</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={selectedProgramStats.velocity_data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="completion" stroke="#2563EB" strokeWidth={3} dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={chartContainer}>
            <h4 style={chartHeader}>Task Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={selectedProgramStats.task_distribution}
                  innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                >
                  <Cell fill="#10B981" /> {/* Done */}
                  <Cell fill="#f59e0b" /> {/* Doing */}
                  <Cell fill="#ef4444" /> {/* Todo */}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={legendContainer}>
              <span><i style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', marginRight: '5px' }}></i> Done</span>
              <span><i style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', marginRight: '5px' }}></i> Doing</span>
              <span><i style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', marginRight: '5px' }}></i> Todo</span>
            </div>
          </div>
        </div>

        {/* Gantt Timeline */}
        <div style={{ width: '100%', marginTop: '25px', padding: '20px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h5 style={{ marginBottom: '15px', fontWeight: 'bold', color: '#1e293b' }}>Program Gran Tracker</h5>
          {selectedProgramStats.gantt_data && selectedProgramStats.gantt_data.length > 0 ? (
            <div style={{ width: '100%', overflowX: 'auto', background: '#fff' }}>
              <Gantt
                tasks={selectedProgramStats.gantt_data.map(t => ({
                  id: String(t.id),
                  name: t.name || "Task",
                  start: new Date(t.start || new Date()),
                  end: new Date(t.end || new Date(new Date().getTime() + 86400000)),
                  progress: t.progress || 0,
                  type: 'task',
                  styles: { progressColor: '#1e293b', progressSelectedColor: '#3b82f6' },
                }))}
                viewMode={ViewMode.Day}
                listCellWidth="150px"
                columnWidth={60}
              />
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              <p>No timeline data available for this program.</p>
            </div>
          )}
        </div>

        {/* Real-time Project Breakdown */}
        <div style={{ marginTop: '25px', padding: '20px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h5 style={{ marginBottom: '15px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Real-Time Project Execution Status
            <span className="pulse-dot" style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
          </h5>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Project Name</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Current Sprint & Due Date</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Last Task Worked On</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Last Active Developer</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Effort</th>
                </tr>
              </thead>
              <tbody>
                {selectedProgramStats.projects_breakdown && selectedProgramStats.projects_breakdown.length > 0 ? (
                  selectedProgramStats.projects_breakdown.map((proj, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s hover' }}>
                      <td style={{ padding: '15px 10px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 'bold', color: '#1B3A6B' }}>{proj.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <div style={{ flex: 1, minWidth: '80px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${proj.progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: '3px' }}></div>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#475569' }}>{proj.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '15px 10px', fontSize: '13px', color: '#334155' }}>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{proj.sprint_name}</div>
                        <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Due: {formatDate(proj.sprint_due_date)}
                        </div>
                      </td>
                      <td style={{ padding: '15px 10px', fontSize: '13px', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={proj.last_active_task}>
                        <div style={{ fontWeight: '600' }}>{proj.last_active_task}</div>
                        <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '9px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                          Active Task
                        </span>
                      </td>
                      <td style={{ padding: '15px 10px', fontSize: '13px' }}>
                        {proj.last_active_member !== 'None' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                              {proj.last_active_member.substring(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{proj.last_active_member}</span>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No activity yet</span>
                        )}
                      </td>
                      <td style={{ padding: '15px 10px', fontSize: '13px', textAlign: 'center' }}>
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block' }}>
                          {proj.total_hours} hrs
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      No projects currently set up for execution under this program.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div style={{ marginTop: '25px', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ marginTop: 0, fontSize: '13px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Recent Team Activity Log</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {selectedProgramStats.recent_logs && selectedProgramStats.recent_logs.length > 0 ? (
              selectedProgramStats.recent_logs.map((log, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '12px', textAlign: 'left' }}>
                    <strong style={{ color: '#2563EB' }}>{log.user}</strong>
                    <span style={{ color: '#64748b' }}> in </span>
                    <strong style={{ color: '#1e293b' }}>{log.sprint || 'N/A'}</strong>
                    <div style={{ marginTop: '4px', color: '#475569' }}>
                      <b>Task:</b> {log.task_name || 'Unnamed Task'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ef4444' }}>
                      Due: {log.due_date ? formatDate(log.due_date) : 'No Date'}
                    </div>
                    <div style={{ fontSize: '10px', marginTop: '4px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', display: 'inline-block' }}>
                      {log.status || 'In Progress'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94a3b8' }}>
                No activity logs available for this program.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProgramTrackerModal;
