import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Styling
const inp = { width: '100%', padding: '12px', marginBottom: '18px', border: '1px solid #e2e8f0', borderRadius: '6px' };
const tableContainer = { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const theadStyle = { background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' };
const thStyle = { padding: '14px 20px', fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' };
const trStyle = { borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.2s' };
const tdStyle = { padding: '14px 20px', fontSize: '13px', color: '#334155', verticalAlign: 'middle' };

const ResourceAnalytics = ({ resources = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [expandedResource, setExpandedResource] = useState(null);

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || r.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ padding: '25px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ textAlign: 'left' }}>
          <h3 style={{ margin: 0, color: '#1B3A6B', fontSize: '20px', fontWeight: '800' }}>Resource Analytics & Performance Operations</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Real-time oversight of Program Managers, Project Managers, and Team Members.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder=" Search resources..." 
            style={{ ...inp, width: '220px', padding: '8px 12px', height: '36px', boxSizing: 'border-box', marginBottom: 0 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            style={{ ...inp, width: '150px', padding: '8px 12px', height: '36px', boxSizing: 'border-box', marginBottom: 0 }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="PGM">Program Managers</option>
            <option value="PM">Project Managers</option>
            <option value="TM">Team Members</option>
          </select>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left', borderLeft: '5px solid #2563EB', cursor: 'default' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Total Team Size</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#1B3A6B' }}>{resources.length}</div>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Registered workforce</span>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left', borderLeft: '5px solid #10B981', cursor: 'default' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Avg Utilization</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10B981' }}>
            {resources.filter(r => r.role === 'TM').length > 0 ? (resources.filter(r => r.role === 'TM').reduce((sum, r) => sum + r.assigned_fte, 0) / resources.filter(r => r.role === 'TM').length * 100).toFixed(1) : 0}%
          </div>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Active workload capacity</span>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left', borderLeft: '5px solid #F59E0B', cursor: 'default' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Underutilized staff</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#F59E0B' }}>
            {resources.filter(r => r.role === 'TM' && r.assigned_fte < 0.5).length}
          </div>
          <span style={{ fontSize: '10px', color: '#64748b' }}>FTE allocation under 0.5</span>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left', borderLeft: '5px solid #EF4444', cursor: 'default' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Hire Alerts</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#EF4444' }}>
            {resources.filter(r => r.assigned_fte > 1.0).length > 0 ? `${resources.filter(r => r.assigned_fte > 1.0).length} Overloaded` : '0 Gaps'}
          </div>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Resources exceeding 1.0 FTE</span>
        </div>
      </div>

      {/* SMART WORKLOAD BALANCING & CAPACITY SUGGESTIONS */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
        border: '1px solid #cbd5e1',
        borderLeft: '5px solid #3b82f6',
        padding: '15px 20px',
        borderRadius: '12px',
        marginBottom: '25px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
        textAlign: 'left'
      }}>
        <h5 style={{ margin: '0 0 10px 0', color: '#1e293b', fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Smart Suggestions & Workforce Balance
        </h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {resources.filter(r => r.assigned_fte > 1.0).map((r, idx) => {
            if (r.role === 'PM') {
              const idlePM = resources.find(oth => oth.role === 'PM' && oth.assigned_fte < 0.8 && oth.username !== r.username);
              return (
                <div key={`sugg-${idx}`} style={{ fontSize: '12px', color: '#991b1b', background: '#fee2e2', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fca5a5', fontWeight: '600' }}>
                  ⚠️ <b>Smart Suggestion:</b> Project Manager <b>{r.username}</b> is overloaded (FTE: <b>{r.assigned_fte.toFixed(2)}</b>). We recommend assigning new tasks or project coordination duties to another Project Manager with available bandwidth{idlePM ? <span> (e.g. <b>{idlePM.username}</b> who is currently underutilized at FTE {idlePM.assigned_fte.toFixed(2)})</span> : ''}.
                </div>
              );
            } else if (r.role === 'PGM') {
              return (
                <div key={`sugg-${idx}`} style={{ fontSize: '12px', color: '#991b1b', background: '#fee2e2', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fca5a5', fontWeight: '600' }}>
                  ⚠️ <b>Smart Suggestion:</b> Program Manager <b>{r.username}</b> is overloaded (FTE: <b>{r.assigned_fte.toFixed(2)}</b>). Consider reallocating some of their programs to balance PGM workloads.
                </div>
              );
            } else {
              const underUtilizedDev = resources.find(oth => oth.role === 'TM' && oth.assigned_fte < 0.5 && oth.username !== r.username);
              return (
                <div key={`sugg-${idx}`} style={{ fontSize: '12px', color: '#991b1b', background: '#fee2e2', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fca5a5', fontWeight: '600' }}>
                  ⚠️ <b>Smart Suggestion:</b> Team Member <b>{r.username}</b> is overloaded (FTE: <b>{r.assigned_fte.toFixed(2)}</b>). Consider shifting some active tasks to available team member <b>{underUtilizedDev ? underUtilizedDev.username : 'another developer'}</b> (FTE: <b>{underUtilizedDev ? underUtilizedDev.assigned_fte.toFixed(2) : '0.00'}</b>).
                </div>
              );
            }
          })}
          {resources.filter(r => r.assigned_fte > 1.0).length === 0 && (
            <div style={{ fontSize: '12px', color: '#166534', background: '#dcfce7', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', fontWeight: '600' }}>
              🎉 <b>All Good:</b> Workforce capacity is perfectly balanced. All Program Managers, Project Managers, and Team Members have stable workloads.
            </div>
          )}
        </div>
      </div>
      
      {/* Critical Alerts */}
      {resources.filter(r => r.assigned_fte > 1.0).length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          border: '1px solid #fca5a5',
          borderLeft: '5px solid #ef4444',
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '25px',
          boxShadow: '0 4px 6px rgba(239,68,68,0.05)',
          textAlign: 'left'
        }}>
          <h5 style={{ margin: '0 0 8px 0', color: '#991b1b', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Critical Capacity & Hiring Demand Alerts
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {resources.filter(r => r.assigned_fte > 1.0).map((r, idx) => (
              <div key={idx} style={{ fontSize: '12px', color: '#7f1d1d', fontWeight: '600' }}>
                • Overload Alert: <b>{r.username}</b> (FTE <b>{r.assigned_fte}</b>) is currently overloaded! We recommend immediate hiring or reallocation of a new <b>{r.role_display}</b> resource to optimize program health.
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capacity Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '25px' }}>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#1e293b', textAlign: 'left' }}>Planned vs Logged FTE Workload</h4>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resources.filter(r => r.role === 'TM')}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="username" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                <Bar dataKey="assigned_fte" name="Planned Assigned FTE" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="calculated_fte" name="Calculated Effort FTE" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#1e293b', textAlign: 'left' }}>Top Resource Performance Analytics</h4>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resources.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="username" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                <Bar dataKey="performance_score" name="Performance Score" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={tableContainer}>
        <table style={tableStyle}>
          <thead>
            <tr style={theadStyle}>
              <th style={thStyle}>Resource Name</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Assigned FTE</th>
              <th style={thStyle}>Calculated FTE</th>
              <th style={thStyle}>Task Progress</th>
              <th style={thStyle}>Utilization Status</th>
              <th style={thStyle}>Performance</th>
            </tr>
          </thead>
          <tbody>
            {filteredResources.map((r) => {
              const isExpanded = expandedResource === r.username;
              const completionRate = r.completion_rate;
              
              return (
                <React.Fragment key={r.username}>
                  <tr style={{ ...trStyle, cursor: 'pointer', backgroundColor: isExpanded ? '#f8fafc' : 'transparent' }} onClick={() => setExpandedResource(isExpanded ? null : r.username)}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                          {r.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontWeight: 'bold', color: '#1E293B', textDecoration: 'underline' }}>{r.username}</span>
                          <div style={{ fontSize: '10px', color: '#64748B' }}>{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                        {r.role_display}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 'bold', color: '#1E40AF' }}>{r.assigned_fte.toFixed(2)} FTE</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 'bold', color: (r.role === 'PGM' || r.role === 'PM') ? '#94A3B8' : '#10B981' }}>
                        {(r.role === 'PGM' || r.role === 'PM') ? '—' : `${r.calculated_fte.toFixed(2)} FTE`}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, width: '150px' }}>
                      {(r.role === 'PGM' || r.role === 'PM') ? (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', fontWeight: 'bold' }}>N/A (Manager)</span>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${completionRate}%`, height: '100%', background: '#8B5CF6' }}></div>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>{Math.round(completionRate)}%</span>
                          </div>
                          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', textAlign: 'left' }}>{r.completed_tasks}/{r.total_tasks} Tasks Completed</div>
                        </>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: r.workload_color === 'Red' ? '#fee2e2' : r.workload_color === 'Yellow' ? '#fef3c7' : '#dcfce7',
                        color: r.workload_color === 'Red' ? '#b91c1c' : r.workload_color === 'Yellow' ? '#b45309' : '#15803d',
                        border: `1px solid ${r.workload_color === 'Red' ? '#fca5a5' : r.workload_color === 'Yellow' ? '#fde68a' : '#bbf7d0'}`
                      }}>
                        {(r.workload_status || r.utilization_status).toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: '#F5F3FF', color: '#5B21B6', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                        {r.performance_score}
                      </span>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr style={{ textAlign: 'left' }}>
                      <td colSpan="7" style={{ padding: '15px 25px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                          <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#1B3A6B', fontWeight: 'bold' }}>Active Project Assignments</h5>
                            {r.active_projects.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {r.active_projects.map((projName, idx) => (
                                  <span key={idx} style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #BFDBFE' }}>
                                    {projName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No active project assignments. Ready for tasking!</span>
                            )}

                            {r.extra_metrics && Object.keys(r.extra_metrics).length > 0 && (
                              <div style={{ marginTop: '15px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <h6 style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#1E293B', fontWeight: '800', textTransform: 'uppercase' }}>📊 Real-Time FTE Capacity Factors</h6>
                                <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {r.role === 'PGM' ? (
                                    <>
                                      <div>• <b>Projects Handled:</b> {r.extra_metrics.projects_handled} (× 0.25 FTE = {(r.extra_metrics.projects_handled * 0.25).toFixed(2)})</div>
                                      <div>• <b>Employees Managed:</b> {r.extra_metrics.employees_managed} (× 0.05 FTE = {(r.extra_metrics.employees_managed * 0.05).toFixed(2)})</div>
                                      <div>• <b>Meetings & Approvals:</b> {r.extra_metrics.meetings_and_approvals} (× 0.03 FTE = {(r.extra_metrics.meetings_and_approvals * 0.03).toFixed(2)})</div>
                                    </     >
                                  ) : (
                                    <>
                                      <div>• <b>Active Tasks:</b> {r.extra_metrics.active_tasks} (× 0.05 FTE = {(r.extra_metrics.active_tasks * 0.05).toFixed(2)})</div>
                                      <div>• <b>Team Coordination:</b> {r.extra_metrics.team_coordination} (× 0.08 FTE = {(r.extra_metrics.team_coordination * 0.08).toFixed(2)})</div>
                                      <div>• <b>Reporting & Deadline Management:</b> {r.extra_metrics.reporting_deadline_management} (× 0.10 FTE = {(r.extra_metrics.reporting_deadline_management * 0.10).toFixed(2)})</div>
                                    </>
                                  )}
                                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '6px', marginTop: '4px', fontWeight: 'bold', color: '#1B3A6B' }}>
                                    Calculated Capacity Load: {r.assigned_fte.toFixed(2)} FTE
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#1B3A6B', fontWeight: 'bold' }}>💡 Live Guide & Action Steps</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', lineHeight: '1.4', color: '#475569' }}>
                              <div style={{ background: '#F0FDF4', borderLeft: '3px solid #10B981', padding: '8px 10px', borderRadius: '6px' }}>
                                <b style={{ color: '#166534' }}>🟢 How to make them "Free"?</b>
                                {r.role === 'PGM' ? (
                                  <div style={{ marginTop: '2px' }}>Move Programs to Completed, delegate to other managers, or approve pending project plans to reduce projects handled.</div>
                                ) : r.role === 'PM' ? (
                                  <div style={{ marginTop: '2px' }}>Move active tasks to 'Done' on your Kanban board, complete sprints, or resolve overdue tasks to free up PM bandwidth.</div>
                                ) : (
                                  <div style={{ marginTop: '2px' }}>A Project Manager can edit their assignment on the 'Project Execution' page to reduce their active project FTE allocation.</div>
                                )}
                              </div>
                              <div style={{ background: '#F8FAFC', borderLeft: '3px solid #64748B', padding: '8px 10px', borderRadius: '6px' }}>
                                <b>⚙️ Why is Calculated FTE {r.calculated_fte.toFixed(2)}?</b>
                                <div style={{ marginTop: '2px' }}>Calculated FTE represents physical hours logged by this user this month. Once developers log daily hours on tasks, this rises. Since managers oversee teams rather than logging direct task effort, their calculated FTE remains at 0.00.</div>
                              </div>
                              <div style={{ background: '#EEF2FF', borderLeft: '3px solid #4F46E5', padding: '8px 10px', borderRadius: '6px' }}>
                                <b>📈 Why is Task Progress {Math.round(completionRate)}%?</b>
                                <div style={{ marginTop: '2px' }}>Progress reflects tasks marked as <b>'Done'</b>. Move a task to 'Done' on the Kanban dashboard, and this progress rate will automatically rise!</div>
                              </div>
                              <div style={{ background: '#F5F3FF', borderLeft: '3px solid #8B5CF6', padding: '8px 10px', borderRadius: '6px' }}>
                                <b style={{ color: '#5B21B6' }}>🏆 Performance Score Calculation</b>
                                <div style={{ marginTop: '2px' }}>Weighted calculation: <b>70% weight</b> on Task Completion Rate + <b>30% weight</b> on active FTE Load (capped at 2.0). Formula: <code style={{ background: '#EDE9FE', padding: '2px 4px', borderRadius: '4px' }}>(Completion Rate × 0.7) + (FTE Load × 15)</code>.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResourceAnalytics;
