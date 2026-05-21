import React from 'react';
import {
  lbl, inp, primBtn, secBtn
} from '../common/DashboardStyles';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function PMCreateTaskModal({
  showTaskModal,
  activeProjectForTask,
  tasksList,
  onTasksListChange,
  isStartWorkingWorkflow,
  onAddTaskRow,
  onRemoveTaskRow,
  onSubmit,
  onClose
}) {
  if (!showTaskModal) return null;

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(8px)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const modalContentStyle = {
    background: '#fff',
    padding: '30px',
    borderRadius: '15px',
    position: 'relative'
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, width: '650px', padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        {/* Modal Header */}
        <div style={{ background: '#1B3A6B', padding: '20px 30px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Create Tasks</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', opacity: 0.8 }}>✕</button>
        </div>
        
        <form onSubmit={onSubmit} style={{ padding: '25px 30px' }}>
          <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '5px', marginBottom: '15px' }}>
            {tasksList.map((task, index) => (
              <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px', background: '#f8fafc', position: 'relative' }}>
                {tasksList.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => onRemoveTaskRow(index)}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Remove
                  </button>
                )}
                <h4 style={{ margin: '0 0 15px 0', color: '#1B3A6B', fontWeight: 'bold', fontSize: '14px' }}>Task #{index + 1}</h4>
                
                {/* Task Title */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Task Title</label>
                  <input 
                    style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                    required 
                    placeholder="What needs to be done?" 
                    value={task.title} 
                    onChange={(e) => {
                      const updated = [...tasksList];
                      updated[index].title = e.target.value;
                      onTasksListChange(updated);
                    }} 
                  />
                </div>

                {/* Assignments & Sprint */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Assign To</label>
                    <select 
                      style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                      required 
                      value={task.assigned_to} 
                      onChange={(e) => {
                        const updated = [...tasksList];
                        updated[index].assigned_to = e.target.value;
                        onTasksListChange(updated);
                      }}
                    >
                      <option value="">Select Member</option>
                      {activeProjectForTask?.team_members?.map(m => ( <option key={m.username} value={m.username}>{m.username}</option> ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Sprint</label>
                    <select 
                      style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                      required 
                      value={task.sprint_id} 
                      onChange={(e) => {
                        const updated = [...tasksList];
                        updated[index].sprint_id = e.target.value;
                        updated[index].due_date = '';
                        onTasksListChange(updated);
                      }}
                    >
                      <option value="">Select Sprint</option>
                      {activeProjectForTask?.sprints?.filter(s => s.status !== 'Pending Approval' && s.status !== 'Returned')?.map(s => ( <option key={s.id} value={s.id}>{s.name}</option> ))}
                    </select>
                  </div>
                </div>

                {/* Priority & Due Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Priority</label>
                    <select 
                      style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                      value={task.priority} 
                      onChange={(e) => {
                        const updated = [...tasksList];
                        updated[index].priority = e.target.value;
                        onTasksListChange(updated);
                      }}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Due Date</label>
                    <input 
                      type="date" 
                      style={{ ...inp, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                      required 
                      min={activeProjectForTask?.sprints?.find(s => String(s.id) === String(task.sprint_id))?.start_date}
                      max={activeProjectForTask?.sprints?.find(s => String(s.id) === String(task.sprint_id))?.end_date}
                      value={task.due_date} 
                      onChange={(e) => {
                        const updated = [...tasksList];
                        updated[index].due_date = e.target.value;
                        onTasksListChange(updated);
                      }} 
                    />
                    {task.sprint_id && (
                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                        Sprint: {formatDate(activeProjectForTask?.sprints?.find(s => String(s.id) === String(task.sprint_id))?.start_date)} to {formatDate(activeProjectForTask?.sprints?.find(s => String(s.id) === String(task.sprint_id))?.end_date)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ ...lbl, fontSize: '12px', color: '#1B3A6B' }}>Description</label>
                  <textarea 
                    style={{ ...inp, height: '70px', resize: 'none', padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                    placeholder="Provide more details about this task..." 
                    value={task.description} 
                    onChange={(e) => {
                      const updated = [...tasksList];
                      updated[index].description = e.target.value;
                      onTasksListChange(updated);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <button 
            type="button" 
            onClick={onAddTaskRow}
            style={{ ...secBtn, width: '100%', marginBottom: '20px', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}
          >
            + Add Another Task
          </button>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <button type="button" onClick={onClose} style={{ ...secBtn, padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}>Cancel</button>
            <button type="submit" style={{ ...primBtn, padding: '10px 25px', borderRadius: '8px', background: '#10B981', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
              {isStartWorkingWorkflow ? 'Save & Start Project' : 'Save Tasks'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
