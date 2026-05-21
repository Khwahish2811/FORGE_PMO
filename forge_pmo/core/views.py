import json
import logging
# pyrefly: ignore [untyped-import]
from django.contrib.auth import authenticate
# pyrefly: ignore [untyped-import]
from django.contrib.auth.models import User
# pyrefly: ignore [untyped-import]
from django.views.decorators.csrf import csrf_exempt
# pyrefly: ignore [untyped-import]
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from .models import Program, Project, Task, Sprint, TeamMember, DailyEffortLog, Profile, Notification
from .serializers import ProjectSerializer, ProgramSerializer, TaskSerializer
from .services import ProgramService, ProjectService, TaskService, SprintService, NotificationService, StatsService, TeamService

# pyrefly: ignore [untyped-import]
from django.http import JsonResponse
# pyrefly: ignore [untyped-import]
from django.db.models import Sum, Count, Q, Avg
# pyrefly: ignore [untyped-import]
from django.utils import timezone
from datetime import timedelta, datetime
# pyrefly: ignore [untyped-import]
from django.shortcuts import get_object_or_404
from datetime import date # Red line 1 fix
# pyrefly: ignore [untyped-import]
from django.db import models, transaction
  # Validate according to active project models
# pyrefly: ignore [untyped-import]
from django.db.models import Count, Q
# pyrefly: ignore [untyped-import]
from django.db.models import Avg



# Logger setup
logger = logging.getLogger(__name__)


# --- 1. AUTHENTICATION ---
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_api(request):
    try:
        data = request.data
        username = data.get('username')
        password = data.get('password')
        if not username or not password:
            logger.warning("Login attempt with missing username or password")
            return Response({'success': False, 'message': 'Username/Password missing'}, status=400)
        
        logger.info(f"Login attempt for user: {username}")
        user = authenticate(username=username, password=password)
        if user is not None:
            user_role = getattr(user.profile, 'role', 'TM')
            token, created = Token.objects.get_or_create(user=user)
            logger.info(f"Login successful for user: {username} (Role: {user_role})")
            return Response({
                'success': True,
                'token': token.key,
                'username': user.username,
                'role': user_role
            })
        logger.warning(f"Login failed for user: {username} - Invalid Credentials")
        return Response({'success': False, 'message': 'Invalid Credentials'}, status=401)
    except Exception as e:
        logger.error(f"LOGIN ERROR: {str(e)}")
        return Response({'success': False, 'message': str(e)}, status=500)


# --- 2. PROGRAM MANAGEMENT ---
@api_view(['GET'])
def get_all_programs(request):
    try:
        # pyrefly: ignore [missing-attribute]
        programs = Program.objects.all().order_by('-id')
        serializer = ProgramSerializer(programs, many=True)
        return Response(serializer.data, status=200)
    except Exception as e:
        logger.error(f"ERROR IN GET_ALL_PROGRAMS: {str(e)}")
        return Response([], status=200)


@api_view(['POST'])
def create_program(request):
    try:
        logger.info(f"views: create_program called by user {request.user}")
        program = ProgramService.create_program(
            data=request.data, 
            user=request.user, 
            document=request.FILES.get('document')
        )
        return Response({
            "success": True, 
            "id": program.id, 
            "document": str(program.document) if program.document else None
        }, status=201)
    except Exception as e:
        logger.error(f"views: CREATE PROGRAM ERROR: {str(e)}", exc_info=True)
        return Response({"success": False, "error": str(e)}, status=400)


@api_view(['POST'])
def update_program_status(request):
    try:
        pgm_id = request.data.get('id')
        new_status = request.data.get('status')
        logger.info(f"views: update_program_status called for {pgm_id} -> {new_status}")
        ProgramService.update_program_status(pgm_id, new_status)
        return Response({'success': True})
    except Exception as e:
        logger.error(f"views: UPDATE PROGRAM STATUS ERROR: {str(e)}", exc_info=True)
        return Response({'success': False, 'message': str(e)}, status=400)


@api_view(['POST'])
def assign_project_manager(request):
    try:
        program_id = request.data.get('program_id')
        pm_id = request.data.get('pm_id')
        pgm_name = request.data.get('manager_name')
        logger.info(f"views: assign_project_manager called for program {program_id} PM {pm_id}")
        ProgramService.assign_project_manager(program_id, pm_id, pgm_name)
        return Response({"success": True})
    except Exception as e:
        logger.error(f"views: ASSIGN PM ERROR: {str(e)}", exc_info=True)
        return Response({"success": False, "error": str(e)}, status=400)


# --- 3. PM & TM DASHBOARD DATA ---
@api_view(['GET'])
def my_assigned_programs(request):
    try:
        username = request.query_params.get('username')
        logger.info(f"views: my_assigned_programs called for user {username}")
        from core.services import ProgramServiceExtensions
        data = ProgramServiceExtensions.get_assigned_programs_for_pm(username, request)
        return Response(data)
    except Exception as e:
        logger.error(f"views: ASSIGNED PROGRAMS ERROR: {str(e)}", exc_info=True)
        return Response([], status=200)

@api_view(['GET'])
def get_active_projects(request):
    username = request.query_params.get('username')
    if not username:
        return Response([], status=200)
    try:
        logger.info(f"views: get_active_projects called for user {username}")
        from core.services import ProjectServiceExtensions
        latest_projects = ProjectServiceExtensions.get_active_projects_by_user(username)
        serializer = ProjectSerializer(latest_projects, many=True)
        return Response(serializer.data, status=200)
    except Exception as e:
        logger.error(f"views: ACTIVE PROJECT ERROR: {str(e)}", exc_info=True)
        return Response([], status=200)


@api_view(['GET'])
def get_project_managers(request):
    try:
        users = User.objects.filter(profile__role='PM', username__in=['khwahish_pm', 'shailja_pgm', 'pranav_spoc', 'yash_tm', 'priya_tm']).select_related('profile')
        data = [{"id": user.id, "username": user.username} for user in users]
        return Response(data, status=200)
    except Exception as e:
        return Response([], status=200)


@api_view(['GET'])
def get_team_members(request):
    try:
        users = User.objects.filter(profile__role='TM', username__in=['khwahish_pm', 'shailja_pgm', 'pranav_spoc', 'yash_tm', 'priya_tm']).select_related('profile')
        data = [{"id": user.id, "username": user.username} for user in users]
        return Response(data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# --- 4. PROJECT PLAN CREATION ---
@api_view(['POST'])
def create_project_plan(request):
    try:
        from core.services import ProjectService
        pm_username = request.data.get('pm_username')
        project = ProjectService.create_project_plan(pm_username, request.data)
        return Response({"success": True, "project_id": project.id}, status=201)
    except Exception as e:
        logger.error(f"CREATE PLAN ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)


# --- 5. PGM DASHBOARD (REVIEW) ---
@api_view(['GET'])
def get_pending_projects(request):
    try:
        logger.info("views: get_pending_projects called")
        from core.services import ProjectServiceExtensions
        data = ProjectServiceExtensions.get_pending_projects()
        return Response(data, status=200)
    except Exception as e:
        logger.error(f"views: PENDING PROJECTS ERROR: {str(e)}", exc_info=True)
        return Response([], status=200)


@api_view(['POST'])
def approve_project_plan(request):
    project_id = request.data.get('project_id')
    decision = request.data.get('decision')  # 'approve', 'reject', or 'return'
    return_note = request.data.get('return_note', '')

    try:
        logger.info(f"views: approve_project_plan called for {project_id} decision {decision}")
        from core.services import ProjectServiceExtensions
        project = ProjectServiceExtensions.approve_project_plan(project_id, decision, return_note)
        return Response({"success": True, "message": f"Project is now {project.status}"})
    except Project.DoesNotExist:
        logger.error(f"views: Project {project_id} not found during review", exc_info=True)
        return Response({"error": "Project not found"}, status=404)
    except Exception as e:
        logger.error(f"views: APPROVE PLAN ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
def start_project_execution(request):
    try:
        project_id = request.data.get('project_id')
        logger.info(f"views: start_project_execution called for {project_id}")
        
        ProjectService.start_project_execution(project_id)
        return Response({"success": True, "message": "Project execution started"})
    except Exception as e:
        logger.error(f"views: START PROJECT EXECUTION ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=400)

# --- TM PROJECTS FIX ---
@api_view(['GET'])
def get_tm_projects(request):
    username = request.GET.get('username')
    if not username: return JsonResponse([], safe=False)
    try:
        logger.info(f"views: get_tm_projects called for user {username}")
        from core.services import TeamServiceExtensions
        assigned_projects = TeamServiceExtensions.get_tm_projects(username)
        return JsonResponse(assigned_projects, safe=False)
    except Exception as e:
        logger.error(f"views: TM PROJECTS ERROR: {str(e)}", exc_info=True)
        return JsonResponse([], safe=False)


class ProjectViewSet(viewsets.ModelViewSet):
    # pyrefly: ignore [missing-attribute]
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer


# --- 6. TASK & KANBAN MANAGEMENT ---

@api_view(['POST'])
def create_task(request):
    try:
        logger.info(f"views: create_task called for project {request.data.get('project_id')}")
        task = TaskService.create_task(request.data)
        return Response({"success": True, "task_id": task.id}, status=201)
    except Exception as e:
        logger.error(f"views: CREATE TASK ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=400)


@api_view(['GET'])
def get_kanban_tasks(request):
    username = request.query_params.get('username')
    try:
        # pyrefly: ignore [missing-attribute]
        tasks = Task.objects.filter(assigned_to__username=username)
        task_data = []
        for t in tasks:
            proj = getattr(t, 'project', None)
            prog = getattr(proj, 'program', None) if proj else None
            pm = getattr(proj, 'created_by', None) if proj else None
            spr = getattr(t, 'sprint', None)

            task_data.append({
                "id": t.id,
                "task_title": t.title or "Untitled",
                "status": t.status or "To Do",
                "project_name": proj.name if proj else "No Project",
                # pyrefly: ignore [missing-attribute]
                "program_name": prog.name if prog else "Standard",
                "project_manager": pm.username if pm else "Not Assigned",
                "sprint_name": spr.name if spr else "Unassigned",
                "sprint_id": spr.id if spr else None,
                "sprint_status": spr.status if spr else "Planned",
                "sprint_deadline": spr.end_date.strftime('%Y-%m-%d') if (spr and spr.end_date) else "No Date",
                "priority": t.priority or "Medium",
                "hours_logged": str(t.hours_logged or 0.00),
                "due_date": t.due_date.strftime('%Y-%m-%d') if t.due_date else "No Date",
                "program_document": prog.document.url if (prog and prog.document) else None
            })
        return Response(task_data, status=200)
    except Exception as e:
        logger.error(f"KANBAN ERROR: {str(e)}")
        return Response([], status=200)


@api_view(['POST'])
def update_task_status(request):
    try:
        task_id = request.data.get('task_id')
        new_status = request.data.get('status')
        logger.info(f"views: update_task_status called for task {task_id} -> {new_status}")
        TaskService.update_task_status(task_id, new_status)
        return Response({"message": "Status updated successfully!"}, status=200)
    except Exception as e:
        logger.error(f"views: UPDATE TASK STATUS ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=400)
@api_view(['POST'])
def log_daily_effort(request):
    try:
        task_id = request.data.get('task_id')
        hours_added = float(request.data.get('hours_added', 0))
        username = request.data.get('username')
        log_date = request.data.get('log_date', date.today())
        
        logger.info(f"views: log_daily_effort called for task {task_id} by {username}")
        task, remaining = TaskService.log_daily_effort(task_id, hours_added, username, log_date)
        return Response({
            "success": True,
            "message": "Effort logged successfully!",
            "total_logged": task.hours_logged,
            "remaining": max(0, remaining)
        }, status=200)
    except Exception as e:
        logger.error(f"views: LOG EFFORT ERROR: {str(e)}", exc_info=True)
        return Response({"success": False, "message": str(e)}, status=400)


@api_view(['POST'])
def update_task_status_with_tracker(request):
    try:
        task_id = request.data.get('task_id')
        new_status = request.data.get('status')
        if not task_id or not new_status:
            return Response({"error": "Missing task_id or status"}, status=400)
            
        logger.info(f"views: update_task_status_with_tracker called for task {task_id} -> {new_status}")
        res = TaskService.update_task_status_with_tracker(task_id, new_status)
        return Response({
            "success": True,
            "message": f"Task moved from {res['old_status']} to {res['task'].status}",
            "new_status": res['task'].status,
            "project_progress": res['progress_percent'],
            "project_status": res['project_status']
        })
    except Exception as e:
        logger.error(f"views: UPDATE TASK TRACKER ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=400)
    
    

@api_view(['GET'])
def get_manager_team_tasks(request):
    manager_username = request.query_params.get('username')
    try:
        logger.info(f"views: get_manager_team_tasks called for PM {manager_username}")
        from core.services import TaskServiceExtensions
        manager_data = TaskServiceExtensions.get_manager_team_tasks(manager_username)
        return Response(manager_data)
    except Exception as e:
        logger.error(f"views: GET MANAGER TEAM TASKS ERROR: {str(e)}", exc_info=True)
        return Response([], status=200)


@api_view(['GET'])
def get_dashboard_stats(request):
    username = request.query_params.get('username')
    project_name = request.query_params.get('project_id')
    try:
        from core.services import StatsService
        stats_data = StatsService.get_dashboard_stats(username, project_name)
        return Response(stats_data, status=200)
    except Exception as e:
        logger.error(f"DEBUG ERROR in get_dashboard_stats: {str(e)}")
        fallback = {
            "total_programs": 0,
            "pending_approvals": 0,
            "active_tasks": 0,
            "due_this_week": 0,
            "hours_today": 0,
            "fte_score": 0,
            "daily_limit": 9
        }
        return Response(fallback, status=200)

# --- FIXED PGM DASHBOARD STATS WITH GANTT & VELOCITY ---
@api_view(['GET'])
def get_program_tracker_stats(request):
    program_id = request.query_params.get('program_id')
    if not program_id:
        return Response({"error": "Program ID is required"}, status=400)
    try:
        from core.services import StatsService
        stats_data = StatsService.get_program_tracker_stats(program_id)
        return Response(stats_data, status=200)
    except Exception as e:
        logger.error(f"TRACKER STATS ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)


# --- 7. WORKING PROGRAMS API ---
@api_view(['GET'])
def get_working_programs(request):
    username = request.query_params.get('username')
    try:
        logger.info(f"views: get_working_programs called for user {username}")
        from core.services import ProgramServiceExtensions
        working_programs_data = ProgramServiceExtensions.get_working_programs_for_pm(username)
        return Response(working_programs_data, status=200)
    except Exception as e:
        logger.error(f"views: Error in get_working_programs: {str(e)}", exc_info=True)
        return Response([], status=200)

@api_view(['GET'])
def program_tracker(request):
    program_id = request.query_params.get('program_id')
    try:
        logger.info(f"views: program_tracker called for program {program_id}")
        from core.services import ProgramServiceExtensions
        data = ProgramServiceExtensions.get_tracker_data(program_id)
        return Response(data)
    except Exception as e:
        logger.error(f"views: PROGRAM TRACKER ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def get_pm_dashboard_stats(request):
    username = request.query_params.get('username')
    stats_data = {'total_assigned': 0, 'pending_plans': 0, 'avg_completion': 0}
    if not username:
        return Response(stats_data)
    try:
        logger.info(f"views: get_pm_dashboard_stats called for PM {username}")
        from core.services import StatsServiceExtensions
        stats_data = StatsServiceExtensions.get_pm_dashboard_stats(username)
        return Response(stats_data)
    except Exception as e:
        logger.error(f"views: GET PM DASHBOARD STATS ERROR: {str(e)}", exc_info=True)
        return Response(stats_data)

@api_view(['POST'])
def update_sprint_status(request):
    try:
        sprint_id = request.data.get('sprint_id')
        new_status = request.data.get('status')
        if not sprint_id or not new_status:
            return Response({"error": "Missing sprint_id or status"}, status=400)
            
        logger.info(f"views: update_sprint_status called for {sprint_id} -> {new_status}")
        SprintService.update_sprint_status(sprint_id, new_status)
        return Response({"success": True, "message": f"Sprint status updated to {new_status}"})
    except Exception as e:
        logger.error(f"views: UPDATE SPRINT STATUS ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
def get_user_profile(request):
    username = request.query_params.get('username')
    if not username:
        return Response({"error": "Username required"}, status=400)
    try:
        logger.info(f"views: get_user_profile called for user {username}")
        from core.services import ProfileService
        p_data = ProfileService.get_user_profile(username)
        return Response(p_data)
    except User.DoesNotExist:
        logger.error(f"views: User {username} not found for profile view", exc_info=True)
        return Response({"error": "User not found"}, status=404)
    except Exception as e:
        logger.error(f"views: GET PROFILE ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
def get_notifications(request):
    username = request.query_params.get('username')
    if not username:
        return Response([], status=200)
    try:
        logger.info(f"views: get_notifications called for recipient {username}")
        from core.services import NotificationServiceExtensions
        data = NotificationServiceExtensions.get_notifications(username)
        return Response(data)
    except Exception as e:
        return Response([], status=200)

@api_view(['POST'])
def mark_notifications_read(request):
    try:
        username = request.data.get('username')
        if not username:
            return Response({"success": False})
            
        logger.info(f"views: mark_notifications_read called for {username}")
        NotificationService.mark_notifications_read(username)
        return Response({"success": True})
    except Exception as e:
        logger.error(f"views: MARK NOTIFICATIONS READ ERROR: {str(e)}", exc_info=True)
        return Response({"success": False, "error": str(e)}, status=400)
@api_view(['GET'])
def get_team_performance(request):
    manager_username = request.query_params.get('username')
    if not manager_username:
        return Response({"error": "Manager username required"}, status=400)
    try:
        from core.services import TeamService
        performance_data = TeamService.get_team_performance(manager_username)
        return Response(performance_data)
    except Exception as e:
        logger.error(f"TEAM PERFORMANCE ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
def get_all_resources(request):
    try:
        from core.services import TeamService
        resources_list = TeamService.get_all_resources()
        return Response(resources_list)
    except Exception as e:
        logger.error(f"GET ALL RESOURCES ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)

# --- NEW ONGOING PROJECT FLOW APIS ---

@api_view(['POST'])
def post_project_update_note(request):
    try:
        project_id = request.data.get('project_id')
        note = request.data.get('note')
        logger.info(f"views: post_project_update_note called for {project_id}")
        
        ProjectService.post_project_update_note(project_id, note)
        return Response({"success": True})
    except Exception as e:
        logger.error(f"views: POST UPDATE NOTE ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=400)


@api_view(['POST'])
def request_additional_sprint(request):
    try:
        project_id = request.data.get('project_id')
        sprint_id = request.data.get('sprint_id')
        name = request.data.get('name')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        logger.info(f"views: request_additional_sprint called for project {project_id}")
        sprint, action_msg = SprintService.request_additional_sprint(project_id, sprint_id, name, start_date, end_date)
        return Response({"success": True, "message": f"Sprint successfully {action_msg} for PGM approval"})
    except Exception as e:
        logger.error(f"views: REQUEST ADDITIONAL SPRINT ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=400)


@api_view(['GET'])
def get_pending_additional_sprints(request):
    try:
        logger.info("views: get_pending_additional_sprints called")
        from core.services import SprintServiceExtensions
        sprint_list = SprintServiceExtensions.get_pending_additional_sprints()
        return Response(sprint_list)
    except Exception as e:
        logger.error(f"views: GET PENDING ADDITIONAL SPRINTS ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
def review_additional_sprint(request):
    try:
        sprint_id = request.data.get('sprint_id')
        decision = request.data.get('decision')
        return_note = request.data.get('return_note', '')
        
        logger.info(f"views: review_additional_sprint called for sprint {sprint_id} decision {decision}")
        SprintService.review_additional_sprint(sprint_id, decision, return_note)
        return Response({"success": True})
    except Exception as e:
        logger.error(f"views: REVIEW ADDITIONAL SPRINT ERROR: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=400)


# --- AUTOMATED PROGRAM BULK IMPORT ENDPOINTS ---
# pyrefly: ignore [untyped-import]
import pandas as pd
from datetime import datetime, date

@api_view(['POST'])
def parse_program_import(request):
    try:
        from core.services import ProgramService
        uploaded_file = request.FILES.get('file')
        parsed_records, summary = ProgramService.parse_import(uploaded_file)
        return Response({
            "success": True,
            "records": parsed_records,
            "summary": summary
        })
    except Exception as e:
        logger.error(f"PARSE PROGRAM IMPORT ERROR: {str(e)}")
        return Response({"success": False, "error": f"Failed to parse file: {str(e)}"}, status=400)


@api_view(['POST'])
def commit_program_import(request):
    try:
        from core.services import ProgramService
        programs_data = request.data.get('programs', [])
        created_programs, errors = ProgramService.commit_import(programs_data)
        return Response({
            "success": True,
            "created_count": len(created_programs),
            "created": created_programs,
            "errors": errors
        })
    except Exception as e:
        logger.error(f"COMMIT PROGRAM IMPORT ERROR: {str(e)}")
        return Response({"success": False, "error": f"Failed to commit import: {str(e)}"}, status=400)
