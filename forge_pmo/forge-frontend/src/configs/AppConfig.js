export const BASE_URL = "http://127.0.0.1:8000/api";

export const METHOD_GET = "GET";
export const METHOD_POST = "POST";
export const METHOD_PUT = "PUT";
export const METHOD_DELETE = "DELETE";

export const API_URLS = {
  LOGIN: `${BASE_URL}/login/`,
  PROJECTS: `${BASE_URL}/projects/`,
  GET_NOTIFICATIONS: `${BASE_URL}/get-notifications/`,
  GET_DASHBOARD_STATS: `${BASE_URL}/get-dashboard-stats/`,
  MARK_NOTIFICATIONS_READ: `${BASE_URL}/mark-notifications-read/`,
  GET_USER_PROFILE: `${BASE_URL}/get-user-profile/`,
  GET_KANBAN_TASKS: `${BASE_URL}/get-kanban-tasks/`,
  LOG_DAILY_EFFORT: `${BASE_URL}/log-daily-effort/`,
  UPDATE_SPRINT_STATUS: `${BASE_URL}/update-sprint-status/`,
  UPDATE_TASK_STATUS_WITH_TRACKER: `${BASE_URL}/update-task-status-with-tracker/`,
  GET_ALL_RESOURCES: `${BASE_URL}/get-all-resources/`,
  ALL_PROGRAMS: `${BASE_URL}/all-programs/`,
  UPDATE_PROGRAM_STATUS: `${BASE_URL}/update-program-status/`,
  PROGRAM_TRACKER: `${BASE_URL}/program-tracker/`,
  PROGRAMS: `${BASE_URL}/programs/`,
  MY_ASSIGNED_PROGRAMS: `${BASE_URL}/my-assigned-programs/`,
  GET_TEAM_MEMBERS: `${BASE_URL}/get-team-members/`,
  GET_ACTIVE_PROJECTS: `${BASE_URL}/get-active-projects/`,
  GET_WORKING_PROGRAMS: `${BASE_URL}/get-working-programs/`,
  PM_DASHBOARD_STATS: `${BASE_URL}/pm-dashboard-stats/`,
  GET_TEAM_PERFORMANCE: `${BASE_URL}/get-team-performance/`,
  POST_PROJECT_UPDATE_NOTE: `${BASE_URL}/post-project-update-note/`,
  REQUEST_ADDITIONAL_SPRINT: `${BASE_URL}/request-additional-sprint/`,
  CREATE_TASK: `${BASE_URL}/create-task/`,
  START_PROJECT_EXECUTION: `${BASE_URL}/start-project-execution/`,
  CREATE_PROJECT_PLAN: `${BASE_URL}/create-project-plan/`,
  GET_ALL_PROGRAMS: `${BASE_URL}/get-all-programs/`,
  GET_PROJECT_MANAGERS: `${BASE_URL}/get-project-managers/`,
  GET_PENDING_PROJECTS: `${BASE_URL}/get-pending-projects/`,
  GET_PENDING_ADDITIONAL_SPRINTS: `${BASE_URL}/get-pending-additional-sprints/`,
  REVIEW_ADDITIONAL_SPRINT: `${BASE_URL}/review-additional-sprint/`,
  ASSIGN_PM: `${BASE_URL}/assign-pm/`,
  APPROVE_PROJECT_PLAN: `${BASE_URL}/approve-project-plan/`,
  CREATE_PROGRAM: `${BASE_URL}/create-program/`,
  PARSE_PROGRAM_IMPORT: `${BASE_URL}/parse-program-import/`,
  COMMIT_PROGRAM_IMPORT: `${BASE_URL}/commit-program-import/`,
};
