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
  # Apne models ke hisaab se check karein
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
    username = request.query_params.get('username')

    # 1. Fetch programs assigned to the user with specific statuses

    # pyrefly: ignore [missing-attribute]
    programs = Program.objects.filter(
        project_manager_assigned__username=username
    ).filter(
        # pyrefly: ignore [unsupported-operation]
        Q(status__iexact='Approved') |
        Q(status__iexact='Active') |
        Q(status__iexact='In Progress')
    )

    data = []
    for p in programs:
        # 2. Check if a project exists for this program
        # pyrefly: ignore [missing-attribute]
        projects_query = Project.objects.filter(program_id=p.id).order_by('-id')
        project = projects_query.first()
        project_count = projects_query.count()

        status_label = project.status if project else "Build Plan"
        if status_label == 'Pending':
            if project_count > 1:
                status_label = "Updated Plan Sent"
            else:
                status_label = "Waiting"

        proj_id = project.id if project else None

        data.append({
            'id': p.id,
            'name': p.name,
            'description': p.description,
            'document': request.build_absolute_uri(p.document.url) if p.document else None,
            'manager_name': p.manager_name,
            'status': p.status,
            'status_label': status_label,
            'start_date': p.start_date,
            'end_date': p.end_date,
            'project_id': proj_id,
            'return_note': project.return_note if project else None
        })

    return Response(data)

@api_view(['GET'])
def get_active_projects(request):
    username = request.query_params.get('username')
    if not username:
        return Response([], status=200)
    try:
        # pyrefly: ignore [missing-attribute]
        projects = Project.objects.filter(created_by__username=username).select_related('program').order_by('-id')
        
        # Keep only the latest project per program
        seen_programs = set()
        latest_projects = []
        for proj in projects:
            if proj.program_id not in seen_programs:
                latest_projects.append(proj)
                seen_programs.add(proj.program_id)
                
        serializer = ProjectSerializer(latest_projects, many=True)
        return Response(serializer.data, status=200)
    except Exception as e:
        logger.error(f"ACTIVE PROJECT ERROR: {str(e)}")
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
        # pyrefly: ignore [missing-attribute]
        projects = Project.objects.filter(status='Pending').select_related('program', 'created_by').order_by('-id')
        data = []
        for p in projects:
            # pyrefly: ignore [missing-attribute]
            team_members = TeamMember.objects.filter(project=p)
            team_list = [{
                "username": t.user.username if t.user else "Unknown",
                "role": getattr(t, 'role', 'Member'),
                "fte": t.fte_score
            } for t in team_members]

            # pyrefly: ignore [missing-attribute]
            sprints = Sprint.objects.filter(project=p)
            sprint_list = [{
                "name": s.name,
                "start_date": str(s.start_date),
                "end_date": str(s.end_date)
            } for s in sprints]

            data.append({
                "id": p.id,
                "project_name": p.name,
                "program_name": p.program.name if p.program else "No Program",
                "pm_name": p.created_by.username if p.created_by else "System",
                "start_date": str(p.start_date),
                "end_date": str(p.end_date),
                "description": p.description or "No description provided",
                "team_members": team_list,
                "sprints": sprint_list
            })
        return Response(data, status=200)
    except Exception as e:
        logger.error(f"PENDING PROJECTS ERROR: {str(e)}")
        return Response([], status=200)


@api_view(['POST'])
def approve_project_plan(request):
    project_id = request.data.get('project_id')
    decision = request.data.get('decision')  # 'approve', 'reject', or 'return'
    return_note = request.data.get('return_note', '')

    try:
        # pyrefly: ignore [missing-attribute]
        project = Project.objects.get(id=project_id)

        # Syncing with PM Dashboard labels
        if decision == 'approve':
            project.status = 'Approved'
        elif decision == 'return':
            project.status = 'Returned'
            project.return_note = return_note
        else:
            project.status = 'Rejected'

        project.save()
        
        # Notify the Project Manager
        pm_user = project.program.project_manager_assigned or project.created_by
        if pm_user:
            if decision == 'approve':
                Notification.objects.create(
                    user=pm_user,
                    message=f"PLAN_APPROVED: The project plan for program '{project.program.name}' has been APPROVED by the Program Manager."
                )
            elif decision == 'return':
                Notification.objects.create(
                    user=pm_user,
                    message=f"PLAN_RETURNED: The project plan for program '{project.program.name}' was returned for updates. Note: {return_note}"
                )
            else:
                Notification.objects.create(
                    user=pm_user,
                    message=f"PLAN_REJECTED: The project plan for program '{project.program.name}' was REJECTED by the Program Manager."
                )

        return Response({"success": True, "message": f"Project is now {project.status}"})
    # pyrefly: ignore [missing-attribute]
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)


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
        # pyrefly: ignore [missing-attribute]
        my_assignments = TeamMember.objects.filter(user__username=username).select_related('project')
        assigned_projects = []
        for assign in my_assignments:
            if assign.project and assign.project.status == 'Active':
                assigned_projects.append({
                    "id": assign.project.id,
                    "project_name": assign.project.name,
                    "role": getattr(assign, 'role', 'Member'),
                    "fte": assign.fte_score,
                    "timeline": f"{assign.project.start_date} to {assign.project.end_date}"
                })
        return JsonResponse(assigned_projects, safe=False)
    except Exception as e:
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
        # pyrefly: ignore [missing-attribute]
        tasks = Task.objects.filter(project__created_by__username=manager_username).select_related('assigned_to',
                                                                                                   'project')
        manager_data = [{
            "task": t.title,
            "assigned_to": t.assigned_to.username if t.assigned_to else "Unassigned",
            "status": t.status,
            "total_effort": t.hours_logged,
            "due_date": str(t.due_date),
            "project": t.project.name if t.project else "No Project"
        } for t in tasks]
        return Response(manager_data)
    except Exception as e:
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

        # pyrefly: ignore [missing-attribute]
        programs = Program.objects.filter(
            project_manager_assigned__username=username
        ).filter(
            # pyrefly: ignore [unsupported-operation]
            Q(status__iexact='In Progress') |
            Q(status__iexact='Approved') |
            Q(status__iexact='Active')
        ).distinct()

        working_programs_data = []

        for prog in programs:

            # pyrefly: ignore [missing-attribute]
            project = Project.objects.filter(program=prog).first()


            pm_name = project.created_by.username if project else username

            # Completion calculation
            tasks = Task.objects.filter(project=project) if project else []
            total_tasks = tasks.count() if project else 0
            done_tasks = tasks.filter(status='Done').count() if project else 0
            completion = int((done_tasks / total_tasks) * 100) if total_tasks > 0 else 0

            working_programs_data.append({
                "id": prog.id,
                "name": prog.name,
                "start_date": str(prog.start_date) if prog.start_date else "",
                "end_date": str(prog.end_date) if prog.end_date else "",
                "pm_name": pm_name,
                "status": prog.status,
                "completion_percentage": completion
            })

        return Response(working_programs_data, status=200)
    except Exception as e:
        logger.error(f"Error in get_working_programs: {str(e)}")
        return Response([], status=200)

@api_view(['GET'])
def program_tracker(request):
    program_id = request.query_params.get('program_id')
    program = get_object_or_404(Program, id=program_id)
    
    # All tasks for this program
    tasks = Task.objects.filter(project__program_id=program_id).select_related('assigned_to', 'sprint')
    
    # 1. Recent Logs
    recent_logs = []
    for task in tasks.order_by('-id')[:10]:
        recent_logs.append({
            "user": task.assigned_to.username if task.assigned_to else "Unassigned",
            "sprint": task.sprint.name if task.sprint else "No Sprint",
            "task_name": task.title,
            "due_date": str(task.due_date) if task.due_date else "No Date",
            "status": task.status
        })

    # 2. Velocity Data (Sprint Progress)
    velocity_data = []
    unique_sprints = Sprint.objects.filter(project__program_id=program_id).order_by('start_date').distinct()
    for s in unique_sprints:
        s_tasks = tasks.filter(sprint=s)
        total = s_tasks.count()
        done = s_tasks.filter(status__icontains='Done').count()
        progress = round((done / total * 100), 1) if total > 0 else 0
        velocity_data.append({"name": s.name, "completion": progress})

    # 3. Task Distribution
    total_tasks = tasks.count()
    completed_tasks = tasks.filter(status__icontains='Done').count()
    pending_tasks = tasks.filter(status__icontains='In Progress').count()
    todo_tasks = total_tasks - completed_tasks - pending_tasks

    task_distribution = [
        {"name": "Done", "value": completed_tasks},
        {"name": "Doing", "value": pending_tasks},
        {"name": "Todo", "value": todo_tasks}
    ]

    # 4. Gantt Data
    gantt_data = []
    # Project-level bars or Task-level bars? Let's do Sprints as major milestones
    for s in unique_sprints:
        s_tasks = tasks.filter(sprint=s)
        s_total = s_tasks.count()
        s_done = s_tasks.filter(status__icontains='Done').count()
        s_prog = (s_done / s_total * 100) if s_total > 0 else 0
        
        gantt_data.append({
            "id": f"sprint_{s.id}",
            "name": s.name,
            "start": str(s.start_date) if s.start_date else str(program.start_date),
            "end": str(s.end_date) if s.end_date else str(program.end_date),
            "progress": s_prog,
            "dependencies": []
        })

    overall_progress = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

    # Projects Breakdown
    projects = Project.objects.filter(program=program)
    projects_breakdown = []
    for p in projects:
        p_tasks = tasks.filter(project=p)
        p_total = p_tasks.count()
        p_done = p_tasks.filter(status__icontains='Done').count()
        p_progress = round((p_done / p_total * 100), 1) if p_total > 0 else 0

        # Last active member and task
        last_log = DailyEffortLog.objects.filter(task__project=p).order_by('-id').first()
        last_member = "None"
        last_task = "No active task yet"

        if last_log:
            last_member = last_log.user.username
            last_task = last_log.task.title
        else:
            last_t = p_tasks.order_by('-id').first()
            if last_t:
                last_member = last_t.assigned_to.username if last_t.assigned_to else "Unassigned"
                last_task = last_t.title

        # Active sprint due date
        active_s = Sprint.objects.filter(project=p, status='In Progress').first()
        if not active_s:
            active_s = Sprint.objects.filter(project=p).order_by('-end_date').first()

        sprint_name = active_s.name if active_s else "No Active Sprint"
        sprint_due = str(active_s.end_date) if active_s and active_s.end_date else "N/A"

        # Total hours logged
        total_hours = p_tasks.aggregate(total=Sum('hours_logged'))['total'] or 0.0

        projects_breakdown.append({
            "id": p.id,
            "name": p.name,
            "status": p.status,
            "progress": p_progress,
            "total_tasks": p_total,
            "completed_tasks": p_done,
            "last_active_member": last_member,
            "last_active_task": last_task,
            "sprint_name": sprint_name,
            "sprint_due_date": sprint_due,
            "total_hours": round(float(total_hours), 1)
        })

    return Response({
        "program_name": program.name,
        "pm_name": getattr(program.project_manager_assigned, 'username', "Not Assigned"),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "overall_progress": overall_progress,
        "team_count": tasks.values('assigned_to').distinct().count(),
        "velocity_data": velocity_data,
        "task_distribution": task_distribution,
        "gantt_data": gantt_data,
        "recent_logs": recent_logs,
        "projects_breakdown": projects_breakdown
    })


@api_view(['GET'])
def get_pm_dashboard_stats(request):
    username = request.query_params.get('username')
    stats_data = {'total_assigned': 0, 'pending_plans': 0, 'avg_completion': 0}

    if not username:
        return Response(stats_data)

    try:
        pm_user = User.objects.get(username=username)
        # 1. Total assigned programs
        # pyrefly: ignore [missing-attribute]
        assigned_programs = Program.objects.filter(project_manager_assigned=pm_user)
        stats_data['total_assigned'] = assigned_programs.count()

        # 2. PENDING PLANS logic

        assigned_pgm_ids = assigned_programs.values_list('id', flat=True)
        # pyrefly: ignore [missing-attribute]
        programs_with_projects = Project.objects.filter(program_id__in=assigned_pgm_ids).values_list('program_id',
                                                                                                     flat=True)


        stats_data['pending_plans'] = assigned_programs.exclude(id__in=programs_with_projects).count()

        # 3. AVG COMPLETION logic
        # pyrefly: ignore [missing-attribute]
        pm_tasks = Task.objects.filter(project__created_by=pm_user)
        total_t = pm_tasks.count()
        if total_t > 0:
            done_t = pm_tasks.filter(status__icontains='Done').count()
            stats_data['avg_completion'] = round((done_t / total_t) * 100, 1)

        return Response(stats_data)
    except Exception as e:
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
        user = User.objects.get(username=username)
        profile, created = Profile.objects.get_or_create(user=user)
        return Response({
            "username": user.username,
            "email": user.email,
            "role": profile.get_role_display(),
            "bio": profile.bio or "No bio available.",
            "phone": profile.phone or "Not provided"
        })
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

@api_view(['GET'])
def get_notifications(request):
    username = request.query_params.get('username')
    if not username:
        return Response([], status=200)
    try:
        notifications = Notification.objects.filter(user__username=username, is_read=False).order_by('-created_at')
        data = [{
            "id": n.id,
            "message": n.message,
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M")
        } for n in notifications]
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
        sprints = Sprint.objects.filter(status='Pending Approval').select_related('project', 'project__program', 'project__created_by')
        sprint_list = []
        for s in sprints:
            sprint_list.append({
                "sprint_id": s.id,
                "sprint_name": s.name,
                "start_date": s.start_date.strftime('%Y-%m-%d') if s.start_date else "",
                "end_date": s.end_date.strftime('%Y-%m-%d') if s.end_date else "",
                "project_id": s.project.id,
                "project_name": s.project.name,
                "project_status": s.project.status,
                "program_name": s.project.program.name if s.project.program else "No Program",
                "pm_username": s.project.created_by.username if s.project.created_by else "PM"
            })
        return Response(sprint_list)
    except Exception as e:
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
