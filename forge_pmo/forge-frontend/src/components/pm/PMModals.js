import React from 'react';
import ProgramTrackerModal from '../common/ProgramTrackerModal';
import PMCreateTaskModal from './PMCreateTaskModal';
import PMUpdateNoteModal from './PMUpdateNoteModal';
import PMSprintRequestModal from './PMSprintRequestModal';
import PMMemberPerformanceModal from './PMMemberPerformanceModal';
import PMProjectPlanForm from './PMProjectPlanForm';
import UserProfileModal from '../common/UserProfileModal';
import { modalOverlay, modalContentStyle } from '../common/DashboardStyles';

const PMModals = ({
  // User Profile
  showProfileModal,
  setShowProfileModal,
  profileData,

  // Project Plan Form
  showProjectForm,
  setShowProjectForm,
  selectedProgram,
  employees,
  handleSubmitPlan,
  showToast,

  // Tracker
  showTrackerModal,
  setShowTrackerModal,
  selectedProgramStats,
  handleDownloadReport,

  // Create Task
  showTaskModal,
  handleCloseTaskModal,
  activeProjectForTask,
  tasksList,
  setTasksList,
  isStartWorkingWorkflow,
  handleCreateTasks,

  // Note Modal
  showNoteModal,
  setShowNoteModal,
  selectedProjectForNote,
  updateNoteText,
  setUpdateNoteText,
  handlePostNote,

  // Sprint Request
  showSprintModal,
  setShowSprintModal,
  sprintIdToUpdate,
  sprintName,
  sprintStartDate,
  sprintEndDate,
  selectedProjectForSprint,
  handleAddSprint,

  // Member Performance
  selectedMemberDetail,
  setSelectedMemberDetail
}) => {
  return (
    <>
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profileData={profileData}
      />

      {showProjectForm && (
        <PMProjectPlanForm
          selectedProgram={selectedProgram}
          employees={employees}
          onSubmitPlan={handleSubmitPlan}
          onClose={() => setShowProjectForm(false)}
          showToast={showToast}
        />
      )}

      <ProgramTrackerModal
        isOpen={showTrackerModal}
        onClose={() => setShowTrackerModal(false)}
        selectedProgramStats={selectedProgramStats}
        onDownloadCSV={handleDownloadReport}
      />

      <PMCreateTaskModal
        showTaskModal={showTaskModal}
        activeProjectForTask={activeProjectForTask}
        tasksList={tasksList}
        onTasksListChange={setTasksList}
        isStartWorkingWorkflow={isStartWorkingWorkflow}
        onAddTaskRow={() => setTasksList(prev => [...prev, { title: '', description: '', assigned_to: '', sprint_id: '', priority: 'Medium', due_date: '' }])}
        onRemoveTaskRow={(idx) => setTasksList(prev => prev.filter((_, i) => i !== idx))}
        onSubmit={handleCreateTasks}
        onClose={handleCloseTaskModal}
      />

      <PMUpdateNoteModal
        showNoteModal={showNoteModal}
        selectedProjectForNote={selectedProjectForNote}
        updateNoteText={updateNoteText}
        onUpdateNoteTextChange={setUpdateNoteText}
        onSubmit={handlePostNote}
        onClose={() => setShowNoteModal(false)}
        modalOverlayStyle={modalOverlay}
        modalContentStyle={modalContentStyle}
      />

      <PMSprintRequestModal
        isOpen={showSprintModal}
        sprintIdToUpdate={sprintIdToUpdate}
        initialSprintName={sprintName}
        initialStartDate={sprintStartDate}
        initialEndDate={sprintEndDate}
        selectedProjectForSprint={selectedProjectForSprint}
        onSubmit={handleAddSprint}
        onClose={() => setShowSprintModal(false)}
      />

      <PMMemberPerformanceModal
        selectedMemberDetail={selectedMemberDetail}
        onClose={() => setSelectedMemberDetail(null)}
      />
    </>
  );
};

export default PMModals;
