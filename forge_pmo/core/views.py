import json
import logging
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Program, Project, Task, Sprint, TeamMember, DailyEffortLog
from .serializers import ProjectSerializer, ProgramSerializer, TaskSerializer
from django.http import JsonResponse
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from datetime import timedelta, datetime
from django.shortcuts import get_object_or_404
from datetime import date # Red line 1 fix
from django.db import models, transaction
  # Apne models ke hisaab se check karein
from django.db.models import Count, Q
from django.db.models import Avg



# Logger setup
logger = logging.getLogger(__name__)


# --- 1. AUTHENTICATION ---
@csrf_exempt
@api_view(['POST'])
def login_api(request):
    try:
        data = request.data
        username = data.get('username')
        password = data.get('password')
        if not username or not password:
            return Response({'success': False, 'message': 'Username/Password missing'}, status=400)
        user = authenticate(username=username, password=password)
        if user is not None:
            user_role = getattr(user.profile, 'role', 'TM')
            return Response({
                'success': True,
                'username': user.username,
                'role': user_role
            })
        return Response({'success': False, 'message': 'Invalid Credentials'}, status=401)
    except Exception as e:
        logger.error(f"LOGIN ERROR: {str(e)}")
        return Response({'success': False, 'message': str(e)}, status=500)


# --- 2. PROGRAM MANAGEMENT ---
@api_view(['GET'])
def get_all_programs(request):
    try:
        programs = Program.objects.all().order_by('-id')
        serializer = ProgramSerializer(programs, many=True)
        return Response(serializer.data, status=200)
    except Exception as e:
        print(f"ERROR IN GET_ALL_PROGRAMS: {str(e)}")
        return Response([], status=200)


@api_view(['POST'])
def create_program(request):
    try:
        data = request.data
        program = Program.objects.create(
            name=data.get('name'),
            description=data.get('description'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            status='Pending'
        )
        return Response({"success": True, "id": program.id}, status=201)
    except Exception as e:
        return Response({"success": False, "error": str(e)}, status=400)


@api_view(['POST'])
def update_program_status(request):
    pgm_id = request.data.get('id')
    new_status = request.data.get('status')
    try:
        program = Program.objects.get(id=pgm_id)
        program.status = new_status
        program.save()
        return Response({'success': True})
    except Program.DoesNotExist:
        return Response({'success': False, 'message': 'Program not found'}, status=404)


@api_view(['POST'])
def assign_project_manager(request):
    program_id = request.data.get('program_id')
    pm_id = request.data.get('pm_id')
    pgm_name_from_react = request.data.get('manager_name')
    try:
        program = Program.objects.get(id=program_id)
        pm_user = User.objects.get(id=pm_id)
        program.project_manager_assigned = pm_user
        program.manager_name = pgm_name_from_react
        program.history_log = f"PM {pm_user.username} assigned by {pgm_name_from_react}."
        program.save()
        return Response({"success": True})
    except Exception as e:
        return Response({"success": False, "error": str(e)}, status=404)


# --- 3. PM & TM DASHBOARD DATA ---
@api_view(['GET'])
def my_assigned_programs(request):
    username = request.query_params.get('username')

    # 1. Fetch programs assigned to the user with specific statuses

    programs = Program.objects.filter(
        project_manager_assigned__username=username
    ).filter(
        Q(status__iexact='Approved') |
        Q(status__iexact='Active') |
        Q(status__iexact='In Progress')
    )

    data = []
    for p in programs:
        # 2. Check if a project exists for this program
        project = Project.objects.filter(program_id=p.id).first()

        status_label = project.status if project else "Build Plan"
        proj_id = project.id if project else None

        data.append({
            'id': p.id,
            'name': p.name,
            'manager_name': p.manager_name,
            'status': p.status,
            'status_label': status_label,
            'start_date': p.start_date,
            'end_date': p.end_date,
            'project_id': proj_id
        })

    return Response(data)

@api_view(['GET'])
def get_active_projects(request):
    username = request.query_params.get('username')
    if not username:
        return Response([], status=200)
    try:
        projects = Project.objects.filter(created_by__username=username).select_related('program')
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data, status=200)
    except Exception as e:
        logger.error(f"ACTIVE PROJECT ERROR: {str(e)}")
        return Response([], status=200)


@api_view(['GET'])
def get_project_managers(request):
    try:
        users = User.objects.filter(profile__role='PM').select_related('profile')
        data = [{"id": user.id, "username": user.username} for user in users]
        return Response(data, status=200)
    except Exception as e:
        return Response([], status=200)


@api_view(['GET'])
def get_team_members(request):
    try:
        users = User.objects.filter(profile__role='TM').select_related('profile')
        data = [{"id": user.id, "username": user.username} for user in users]
        return Response(data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# --- 4. PROJECT PLAN CREATION ---
@api_view(['POST'])
def create_project_plan(request):
    data = request.data
    try:
        with transaction.atomic():
            program = Program.objects.get(id=data.get('program_id'))
            pm_user = User.objects.get(username=data.get('pm_username'))

            project = Project.objects.create(
                program=program,
                name=data.get('name'),
                description=data.get('description', ''),
                start_date=data.get('start_date'),
                end_date=data.get('end_date'),
                priority=data.get('priority', 'Medium'),
                created_by=pm_user,
                status='Pending'
            )

            sprints_data = data.get('sprints', [])
            for idx, s_data in enumerate(sprints_data, start=1):
                Sprint.objects.create(
                    project=project,
                    name=s_data.get('name', f"Sprint {idx}"),
                    start_date=s_data['start_date'],
                    end_date=s_data['end_date'],
                    status='Planned'
                )

            team_data = data.get('team', [])
            for member in team_data:
                user_obj = User.objects.get(id=member.get('userId'))
                TeamMember.objects.create(
                    project=project,
                    user=user_obj,
                    role=member.get('role'),
                    fte_score=member.get('fte', 1)
                )

            return Response({"success": True, "project_id": project.id}, status=201)
    except Exception as e:
        logger.error(f"CREATE PLAN ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)


# --- 5. PGM DASHBOARD (REVIEW) ---
@api_view(['GET'])
def get_pending_projects(request):
    try:
        projects = Project.objects.filter(status='Pending').select_related('program', 'created_by').order_by('-id')
        data = []
        for p in projects:
            team_members = TeamMember.objects.filter(project=p)
            team_list = [{
                "username": t.user.username if t.user else "Unknown",
                "role": getattr(t, 'role', 'Member'),
                "fte": t.fte_score
            } for t in team_members]

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
    decision = request.data.get('decision')  # 'approve' or 'reject'

    try:
        project = Project.objects.get(id=project_id)

        # Syncing with PM Dashboard labels
        if decision == 'approve':
            project.status = 'Approved'
        else:
            project.status = 'Rejected'

        project.save()
        return Response({"success": True, "message": f"Project is now {project.status}"})
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)

# --- TM PROJECTS FIX ---
@api_view(['GET'])
def get_tm_projects(request):
    username = request.GET.get('username')
    if not username: return JsonResponse([], safe=False)
    try:
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
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer


# --- 6. TASK & KANBAN MANAGEMENT ---

@api_view(['POST'])
def create_task(request):
    data = request.data
    try:
        project = Project.objects.get(id=int(data.get('project_id')))
        sprint = Sprint.objects.get(id=int(data.get('sprint_id')))
        assignee = User.objects.get(username=data.get('assigned_to'))

        task = Task.objects.create(
            project=project,
            sprint=sprint,
            assigned_to=assignee,
            title=data.get('title'),
            description=data.get('description', ''),
            priority=data.get('priority', 'Medium'),
            due_date=data.get('due_date'),
            status='To Do'
        )
        return Response({"success": True, "task_id": task.id}, status=201)
    except Exception as e:
        logger.error(f"CREATE TASK ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def get_kanban_tasks(request):
    username = request.query_params.get('username')
    try:
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
                "program_name": prog.name if proj else "Standard",
                "project_manager": pm.username if pm else "Not Assigned",
                "sprint_name": spr.name if spr else "Unassigned",
                "priority": t.priority or "Medium",
                "hours_logged": str(t.hours_logged or 0.00),
                "due_date": t.due_date.strftime('%Y-%m-%d') if t.due_date else "No Date"
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
        task = Task.objects.get(id=task_id)
        task.status = new_status
        task.save()
        return Response({"message": "Status updated successfully!"}, status=200)
    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
@api_view(['POST'])
def log_daily_effort(request):
    task_id = request.data.get('task_id')
    hours_added = float(request.data.get('hours_added', 0))
    username = request.data.get('username')
    log_date = request.data.get('log_date', date.today())

    # Basic Validation
    if hours_added <= 0:
        return Response({"success": False, "message": "Hours must be greater than 0"}, status=400)

    try:
        with transaction.atomic():
            # select_for_update()
            task = Task.objects.select_for_update().get(id=task_id)
            user = User.objects.get(username=username)

            total_today = DailyEffortLog.objects.filter(
                user=user,
                log_date=log_date
            ).aggregate(total=models.Sum('hours_added'))['total'] or 0

            # 2. Daily Limit Check (9 hours limit)
            if float(total_today) + hours_added >24:
                return Response({
                    "success": False,
                    "message": f"Daily limit exceed! You already logged {total_today}h today."
                }, status=400)

            task.hours_logged = float(task.hours_logged or 0) + hours_added
            task.save()

            DailyEffortLog.objects.create(
                task=task,
                user=user,
                hours_added=hours_added,
                log_date=log_date
            )

            # Calculation for response
            remaining = float(task.total_estimated_hours or 0) - float(task.hours_logged or 0)

            return Response({
                "success": True,
                "message": "Effort logged successfully!",
                "total_logged": task.hours_logged,
                "remaining": max(0, remaining)
            }, status=200)

    except Task.DoesNotExist:
        return Response({"success": False, "message": "Task not found"}, status=404)
    except User.DoesNotExist:
        return Response({"success": False, "message": "User not found"}, status=404)
    except Exception as e:
        # Error logging for debugging
        print(f"Log Effort Error: {str(e)}")
        return Response({"success": False, "message": str(e)}, status=500)


@api_view(['POST'])
def update_task_status_with_tracker(request):
    task_id = request.data.get('task_id')
    new_status = request.data.get('status')

    if not task_id or not new_status:
        return Response({"error": "Missing task_id or status"}, status=400)

    try:
        # 1. Task Fetch aur Update
        task = Task.objects.get(id=task_id)
        old_status = task.status
        task.status = new_status
        task.last_moved_date = timezone.now().date()

        if new_status == 'In Progress' and not getattr(task, 'start_date', None):
            task.start_date = timezone.now().date()

        task.save()

        project_tasks = Task.objects.filter(project_name=task.project_name)
        total_count = project_tasks.count()
        done_count = project_tasks.filter(status='Done').count()

        progress_percent = (done_count / total_count * 100) if total_count > 0 else 0

        Project.objects.filter(name=task.project.name).update(

            status=task.project.status
        )

        return Response({
            "success": True,
            "message": f"Task moved from {old_status} to {new_status}",
            "new_status": task.status,
            "project_progress": progress_percent
        })

    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
def get_manager_team_tasks(request):
    manager_username = request.query_params.get('username')
    try:
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
    project_name = request.query_params.get('project_id')  # Frontend se project name aa raha hai
    today = timezone.now().date()

    # Initial Response structure
    stats_data = {
        "total_programs": 0,
        "pending_approvals": 0,
        "active_tasks": 0,
        "due_this_week": 0,
        "hours_today": 0,
        "fte_score": 0,
        "daily_limit": 9
    }

    try:
        # --- GLOBAL STATS (Using your Program model) ---
        stats_data["total_programs"] = Program.objects.all().count()
        stats_data["pending_approvals"] = Program.objects.filter(status__iexact='Pending').count()

        if username:

            stats_data["active_tasks"] = Task.objects.filter(
                assigned_to__username=username
            ).exclude(status__iexact='Done').count()

            # 2. Due This Week
            week_end = today + timedelta(days=7)
            stats_data["due_this_week"] = Task.objects.filter(
                assigned_to__username=username,
                due_date__range=[today, week_end]
            ).exclude(status__iexact='Done').count()

            # --- HOURS LOGIC (DailyEffortLog table) ---
            effort_query = DailyEffortLog.objects.filter(user__username=username)


            if project_name:
                effort_query = effort_query.filter(task__project__name=project_name)

            # Today's hours
            hours_today = effort_query.filter(log_date=today).aggregate(Sum('hours_added'))['hours_added__sum'] or 0
            stats_data["hours_today"] = round(float(hours_today), 1)

            # Monthly hours for FTE (160 standard base)
            total_month_hours = effort_query.filter(
                log_date__month=today.month,
                log_date__year=today.year
            ).aggregate(Sum('hours_added'))['hours_added__sum'] or 0

            stats_data["fte_score"] = round(float(total_month_hours) / 160, 2)

        return Response(stats_data, status=200)

    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        return Response(stats_data, status=200)

# --- FIXED PGM DASHBOARD STATS WITH GANTT & VELOCITY ---
@api_view(['GET'])
def get_program_tracker_stats(request):
    program_id = request.query_params.get('program_id')
    if not program_id:
        return Response({"error": "Program ID is required"}, status=400)

    try:
        program = get_object_or_404(Program, id=program_id)
        projects = Project.objects.filter(program=program)
        project_ids = list(projects.values_list('id', flat=True))
        all_tasks = Task.objects.filter(project_id__in=project_ids).select_related('assigned_to', 'sprint')

        # 1. Overall Progress
        total_tasks = all_tasks.count()
        done_tasks = all_tasks.filter(status__icontains='Done').count()
        progress_val = round((done_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

        # 2. Activity Logs
        recent_logs = []
        for task in all_tasks.order_by('-id')[:5]:
            recent_logs.append({
                "user": task.assigned_to.username if task.assigned_to else "Unassigned",
                "task_name": task.title or "Unnamed",
                "status": task.status or "In Progress",
                "due_date": task.due_date.strftime('%d %b') if task.due_date else "No Date"
            })

        # 3. Task Distribution (Pie Chart)
        task_dist = [
            {"name": "Done", "value": done_tasks},
            {"name": "Doing", "value": all_tasks.filter(status__icontains='Progress').count()},
            {"name": "Todo", "value": all_tasks.filter(status__icontains='To Do').count()},
        ]

        # 4. Gantt Data (FIXED: Populating with Task Timelines)
        gantt_data = []
        for task in all_tasks:
            # Gantt requires a start and end. If no date exists, we use program start/end as fallback
            start_date = task.project.start_date if task.project.start_date else timezone.now().date()
            end_date = task.due_date if task.due_date else (start_date + timedelta(days=7))

            gantt_data.append({
                "id": task.id,
                "name": task.title,
                "start": start_date.strftime('%Y-%m-%d'),
                "end": end_date.strftime('%Y-%m-%d'),
                "progress": 100 if "Done" in task.status else 0,
                "dependencies": []
            })

        # 5. Velocity Data (Bar Chart)
        velocity_data = []
        sprints = Sprint.objects.filter(project_id__in=project_ids)
        for s in sprints:
            s_tasks = all_tasks.filter(sprint=s)
            s_total = s_tasks.count()
            s_done = s_tasks.filter(status__icontains='Done').count()
            comp_rate = round((s_done / s_total * 100), 1) if s_total > 0 else 0
            velocity_data.append({
                "name": s.name,
                "completion": comp_rate
            })

        return Response({
            "program_name": program.name,
            "overall_progress": progress_val,
            "total_tasks": total_tasks,
            "completed_tasks": done_tasks,
            "team_count": all_tasks.exclude(assigned_to__isnull=True).values('assigned_to').distinct().count(),
            "task_distribution": task_dist,
            "recent_logs": recent_logs,
            "gantt_data": gantt_data,
            "velocity_data": velocity_data
        }, status=200)

    except Exception as e:
        logger.error(f"TRACKER STATS ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)


# --- 7. WORKING PROGRAMS API ---
@api_view(['GET'])
def get_working_programs(request):
    username = request.query_params.get('username')
    try:

        programs = Program.objects.filter(
            project_manager_assigned__username=username
        ).filter(
            Q(status__iexact='In Progress') |
            Q(status__iexact='Approved') |
            Q(status__iexact='Active')
        ).distinct()

        working_programs_data = []

        for prog in programs:

            project = Project.objects.filter(program=prog).first()


            pm_name = project.created_by.username if project else username

            working_programs_data.append({
                "id": prog.id,
                "name": prog.name,
                "start_date": str(prog.start_date) if prog.start_date else "",
                "end_date": str(prog.end_date) if prog.end_date else "",
                "pm_name": pm_name,
                "status": prog.status
            })

        return Response(working_programs_data, status=200)
    except Exception as e:
        logger.error(f"WORKING PROGRAMS ERROR: {str(e)}")

        print(f"Error in get_working_programs: {e}")
        return Response([], status=200)

@api_view(['GET'])
def program_tracker(request):
    program_id = request.query_params.get('program_id')
    program = get_object_or_404(Program, id=program_id)
    tasks = Task.objects.filter(project__program_id=program_id).select_related('assigned_to', 'sprint')
    recent_activity = []
    for task in tasks.order_by('-id')[:5]:
        recent_activity.append({
            "user": task.assigned_to.username if task.assigned_to else "Unassigned",
            "sprint": task.sprint.name if task.sprint else "No Sprint",
            "task_name": task.title,
            "due_date": str(task.due_date) if task.due_date else "No Date",
            "status": task.status
        })
    sprint_data = []
    unique_sprints = Sprint.objects.filter(project__program_id=program_id).distinct()
    for s in unique_sprints:
        s_tasks = tasks.filter(sprint=s)
        total = s_tasks.count()
        done = s_tasks.filter(status__icontains='Done').count()
        progress = round((done / total * 100), 1) if total > 0 else 0
        sprint_data.append({"name": s.name, "completion": progress})
    total_tasks = tasks.count()
    completed_tasks = tasks.filter(status__icontains='Done').count()
    completion_percentage = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0
    return Response({
        "program_name": program.name,
        "pm_name": getattr(program.project_manager_assigned, 'username', "Not Assigned"),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": total_tasks - completed_tasks,
        "completion_percentage": completion_percentage,
        "team_count": tasks.values('assigned_to').distinct().count(),
        "sprint_data": sprint_data,
        "recent_activity": recent_activity,
        "priority_counts": {
            "High": tasks.filter(priority='High').count(),
            "Medium": tasks.filter(priority='Medium').count(),
            "Low": tasks.filter(priority='Low').count(),
        }
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
        assigned_programs = Program.objects.filter(project_manager_assigned=pm_user)
        stats_data['total_assigned'] = assigned_programs.count()

        # 2. PENDING PLANS logic

        assigned_pgm_ids = assigned_programs.values_list('id', flat=True)
        programs_with_projects = Project.objects.filter(program_id__in=assigned_pgm_ids).values_list('program_id',
                                                                                                     flat=True)


        stats_data['pending_plans'] = assigned_programs.exclude(id__in=programs_with_projects).count()

        # 3. AVG COMPLETION logic
        pm_tasks = Task.objects.filter(project__created_by=pm_user)
        total_t = pm_tasks.count()
        if total_t > 0:
            done_t = pm_tasks.filter(status__icontains='Done').count()
            stats_data['avg_completion'] = round((done_t / total_t) * 100, 1)

        return Response(stats_data)
    except Exception as e:
        return Response(stats_data)