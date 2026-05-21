import ApiHelper from "../utils/ApiHelper";
import { API_URLS, METHOD_GET, METHOD_POST } from '../configs/AppConfig';

export class DataProvider {
    apiHelper = new ApiHelper();

    // === LOGIN ===
    login = async (values) =>
        await this.apiHelper.apiCall(API_URLS.LOGIN, METHOD_POST, values);

    // === COMMON / NOTIFICATIONS / USER ===
    fetchProfileDetails = async (username) =>
        await this.apiHelper.apiCall(`${API_URLS.GET_USER_PROFILE}?username=${username}`, METHOD_GET, null);

    getNotifications = async (username) =>
        await this.apiHelper.apiCall(`${API_URLS.GET_NOTIFICATIONS}?username=${username}`, METHOD_GET, null);

    markNotificationsRead = async (values) =>
        await this.apiHelper.apiCall(API_URLS.MARK_NOTIFICATIONS_READ, METHOD_POST, values);

    getAllResources = async () =>
        await this.apiHelper.apiCall(API_URLS.GET_ALL_RESOURCES, METHOD_GET, null);

    // === TEAM MEMBER (TM) ===
    getKanbanTasks = async (username) =>
        await this.apiHelper.apiCall(`${API_URLS.GET_KANBAN_TASKS}?username=${username}`, METHOD_GET, null);

    getDashboardStats = async (username, projectId) => {
        let url = `${API_URLS.GET_DASHBOARD_STATS}?username=${username}`;
        if (projectId) {
            url += `&project_id=${projectId}`;
        }
        return await this.apiHelper.apiCall(url, METHOD_GET, null);
    };

    logDailyEffort = async (values) =>
        await this.apiHelper.apiCall(API_URLS.LOG_DAILY_EFFORT, METHOD_POST, values);

    updateSprintStatus = async (values) =>
        await this.apiHelper.apiCall(API_URLS.UPDATE_SPRINT_STATUS, METHOD_POST, values);

    updateTaskStatusWithTracker = async (values) =>
        await this.apiHelper.apiCall(API_URLS.UPDATE_TASK_STATUS_WITH_TRACKER, METHOD_POST, values);

    // === SPOC ===
    allProgramsSPOC = async () =>
        await this.apiHelper.apiCall(API_URLS.ALL_PROGRAMS, METHOD_GET, null);

    updateProgramStatus = async (values) =>
        await this.apiHelper.apiCall(API_URLS.UPDATE_PROGRAM_STATUS, METHOD_POST, values);

    // === PROGRAM MANAGEMENT (RAW) ===
    programs = async () =>
        await this.apiHelper.apiCall(API_URLS.PROGRAMS, METHOD_GET, null);

    getProjects = async () =>
        await this.apiHelper.apiCall(API_URLS.PROJECTS, METHOD_GET, null);

    // === PROJECT MANAGER (PM) ===
    myAssignedPrograms = async (username) =>
        await this.apiHelper.apiCall(`${API_URLS.MY_ASSIGNED_PROGRAMS}?username=${username}`, METHOD_GET, null);

    getTeamMembers = async () =>
        await this.apiHelper.apiCall(API_URLS.GET_TEAM_MEMBERS, METHOD_GET, null);

    getActiveProjects = async (username) =>
        await this.apiHelper.apiCall(`${API_URLS.GET_ACTIVE_PROJECTS}?username=${username}`, METHOD_GET, null);

    getWorkingPrograms = async (username) =>
        await this.apiHelper.apiCall(`${API_URLS.GET_WORKING_PROGRAMS}?username=${username}`, METHOD_GET, null);

    pmDashboardStats = async (username) =>
        await this.apiHelper.apiCall(`${API_URLS.PM_DASHBOARD_STATS}?username=${username}`, METHOD_GET, null);

    getTeamPerformance = async (username) =>
        await this.apiHelper.apiCall(`${API_URLS.GET_TEAM_PERFORMANCE}?username=${username}`, METHOD_GET, null);

    postProjectUpdateNote = async (values) =>
        await this.apiHelper.apiCall(API_URLS.POST_PROJECT_UPDATE_NOTE, METHOD_POST, values);

    requestAdditionalSprint = async (values) =>
        await this.apiHelper.apiCall(API_URLS.REQUEST_ADDITIONAL_SPRINT, METHOD_POST, values);

    createTask = async (values) =>
        await this.apiHelper.apiCall(API_URLS.CREATE_TASK, METHOD_POST, values);

    startProjectExecution = async (values) =>
        await this.apiHelper.apiCall(API_URLS.START_PROJECT_EXECUTION, METHOD_POST, values);

    createProjectPlan = async (values) =>
        await this.apiHelper.apiCall(API_URLS.CREATE_PROJECT_PLAN, METHOD_POST, values);

    // === PROGRAM MANAGER (PGM) ===
    getAllPrograms = async () =>
        await this.apiHelper.apiCall(API_URLS.GET_ALL_PROGRAMS, METHOD_GET, null);

    getProjectManagers = async () =>
        await this.apiHelper.apiCall(API_URLS.GET_PROJECT_MANAGERS, METHOD_GET, null);

    getPendingProjects = async () =>
        await this.apiHelper.apiCall(API_URLS.GET_PENDING_PROJECTS, METHOD_GET, null);

    getPendingAdditionalSprints = async () =>
        await this.apiHelper.apiCall(API_URLS.GET_PENDING_ADDITIONAL_SPRINTS, METHOD_GET, null);

    reviewAdditionalSprint = async (values) =>
        await this.apiHelper.apiCall(API_URLS.REVIEW_ADDITIONAL_SPRINT, METHOD_POST, values);

    assignPm = async (values) =>
        await this.apiHelper.apiCall(API_URLS.ASSIGN_PM, METHOD_POST, values);

    assignPM = async (values) =>
        await this.assignPm(values);

    approveProjectPlan = async (values) =>
        await this.apiHelper.apiCall(API_URLS.APPROVE_PROJECT_PLAN, METHOD_POST, values);

    reviewProjectPlan = async (values) =>
        await this.approveProjectPlan(values);

    getAllProgramsPGM = async () =>
        await this.getAllPrograms();

    createProgram = async (formData) => {
        // Since FormData cannot be stringified, use apiCall with METHOD_POST
        // The APIHelper automatically handles FormData by not setting Content-Type to JSON
        return await this.apiHelper.apiCall(API_URLS.CREATE_PROGRAM, METHOD_POST, formData);
    };

    parseProgramImport = async (formData) =>
        await this.apiHelper.apiCall(API_URLS.PARSE_PROGRAM_IMPORT, METHOD_POST, formData);

    commitProgramImport = async (values) =>
        await this.apiHelper.apiCall(API_URLS.COMMIT_PROGRAM_IMPORT, METHOD_POST, values);

    // Shared Tracker
    programTracker = async (programId) =>
        await this.apiHelper.apiCall(`${API_URLS.PROGRAM_TRACKER}?program_id=${programId}`, METHOD_GET, null);
}
