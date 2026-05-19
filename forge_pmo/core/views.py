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
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Program, Project, Task, Sprint, TeamMember, DailyEffortLog, Profile, Notification
from .serializers import ProjectSerializer, ProgramSerializer, TaskSerializer
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
        # pyrefly: ignore [missing-attribute]
        programs = Program.objects.all().order_by('-id')
        serializer = ProgramSerializer(programs, many=True)
        return Response(serializer.data, status=200)
    except Exception as e:
        print(f"ERROR IN GET_ALL_PROGRAMS: {str(e)}")
        return Response([], status=200)


@api_view(['POST'])
def create_program(request):
    try:
        # Debugging prints
        print(f"FILES: {request.FILES}")
        print(f"DATA: {request.data}")
        
        program = Program.objects.create(
            name=request.data.get('name'),
            description=request.data.get('description'),
            start_date=request.data.get('start_date'),
            end_date=request.data.get('end_date'),
            document=request.FILES.get('document'),
            status='Pending'
        )
        return Response({
            "success": True, 
            "id": program.id, 
            "document": str(program.document)
        }, status=201)
    except Exception as e:
        print(f"CREATE PROGRAM ERROR: {str(e)}")
        return Response({"success": False, "error": str(e)}, status=400)


@api_view(['POST'])
def update_program_status(request):
    pgm_id = request.data.get('id')
    new_status = request.data.get('status')
    try:
        # pyrefly: ignore [missing-attribute]
        program = Program.objects.get(id=pgm_id)
        program.status = new_status
        program.save()
        return Response({'success': True})
    # pyrefly: ignore [missing-attribute]
    except Program.DoesNotExist:
        return Response({'success': False, 'message': 'Program not found'}, status=404)


@api_view(['POST'])
def assign_project_manager(request):
    program_id = request.data.get('program_id')
    pm_id = request.data.get('pm_id')
    pgm_name_from_react = request.data.get('manager_name')
    try:
        # pyrefly: ignore [missing-attribute]
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
    data = request.data
    try:
        # pyrefly: ignore [bad-context-manager]
        with transaction.atomic():
            # pyrefly: ignore [missing-attribute]
            program = Program.objects.get(id=data.get('program_id'))
            pm_user = User.objects.get(username=data.get('pm_username'))

            # pyrefly: ignore [missing-attribute]
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
                # pyrefly: ignore [missing-attribute]
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
                # pyrefly: ignore [missing-attribute]
                TeamMember.objects.create(
                    project=project,
                    user=user_obj,
                    role=member.get('role'),
                    fte_score=float(member.get('fte') or 1.0)
                )

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
        return Response({"success": True, "message": f"Project is now {project.status}"})
    # pyrefly: ignore [missing-attribute]
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)


@api_view(['POST'])
def start_project_execution(request):
    project_id = request.data.get('project_id')
    try:
        project = Project.objects.get(id=project_id)
        project.status = 'In Progress'
        project.save()
        
        program = project.program
        if program and program.status != 'In Progress':
            program.status = 'In Progress'
            program.save()
            
        return Response({"success": True, "message": "Project execution started"})
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

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
    data = request.data
    try:
        # pyrefly: ignore [missing-attribute]
        project = Project.objects.get(id=int(data.get('project_id')))
        # pyrefly: ignore [missing-attribute]
        sprint = Sprint.objects.get(id=int(data.get('sprint_id')))
        assignee = User.objects.get(username=data.get('assigned_to'))

        # pyrefly: ignore [missing-attribute]
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
        # Create PM addition alert notification

        Notification.objects.create(

            user=assignee,

            message=f"PM_ADD: Task '{task.title}' was added by the Project Manager for project '{project.name}'."

        )


        return Response({"success": True, "task_id": task.id}, status=201)
    except Exception as e:
        logger.error(f"CREATE TASK ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)


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
        # pyrefly: ignore [missing-attribute]
        task = Task.objects.get(id=task_id)
        task.status = new_status
        task.save()
        return Response({"message": "Status updated successfully!"}, status=200)
    # pyrefly: ignore [missing-attribute]
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
        # pyrefly: ignore [bad-context-manager]
        with transaction.atomic():
            # select_for_update()
            # pyrefly: ignore [missing-attribute]
            task = Task.objects.select_for_update().get(id=task_id)
            user = User.objects.get(username=username)

            # pyrefly: ignore [missing-attribute]
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

            # pyrefly: ignore [missing-attribute]
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

    # pyrefly: ignore [missing-attribute]
    except Task.DoesNotExist:
        return Response({"success": False, "message": "Task not found"}, status=404)
    # pyrefly: ignore [missing-attribute]
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
        # pyrefly: ignore [missing-attribute]
        task = Task.objects.get(id=task_id)
        old_status = task.status
        task.status = new_status
        task.last_moved_date = timezone.now().date()

        if new_status == 'In Progress' and not getattr(task, 'start_date', None):
            task.start_date = timezone.now().date()

        task.save()

        # 2. Update Project and Program status to "In Progress" if first task begins
        project = task.project
        if new_status == 'In Progress' and project.status != 'In Progress':
            project.status = 'In Progress'
            project.save()
            
            program = project.program
            if program.status != 'In Progress':
                program.status = 'In Progress'
                program.save()

        # 3. Progress Calculation
        project_tasks = Task.objects.filter(project=project)
        total_count = project_tasks.count()
        done_count = project_tasks.filter(status='Done').count()
        progress_percent = (done_count / total_count * 100) if total_count > 0 else 0

        return Response({
            "success": True,
            "message": f"Task moved from {old_status} to {new_status}",
            "new_status": task.status,
            "project_progress": progress_percent,
            "project_status": project.status
        })

    # pyrefly: ignore [missing-attribute]
    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
    

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
        # pyrefly: ignore [missing-attribute]
        stats_data["total_programs"] = Program.objects.all().count()
        # pyrefly: ignore [missing-attribute]
        stats_data["pending_approvals"] = Program.objects.filter(status__iexact='Pending').count()

        if username:

            # pyrefly: ignore [missing-attribute]
            stats_data["active_tasks"] = Task.objects.filter(
                assigned_to__username=username
            ).exclude(status__iexact='Done').count()

            # 2. Due This Week
            week_end = today + timedelta(days=7)
            # pyrefly: ignore [missing-attribute]
            stats_data["due_this_week"] = Task.objects.filter(
                assigned_to__username=username,
                due_date__range=[today, week_end]
            ).exclude(status__iexact='Done').count()

            # --- HOURS LOGIC (DailyEffortLog table) ---
            # pyrefly: ignore [missing-attribute]
            base_effort_query = DailyEffortLog.objects.filter(user__username=username)
            effort_query = base_effort_query


            if project_name:
                effort_query = effort_query.filter(task__project__name=project_name)
                try:
                    project_obj = Project.objects.filter(name=project_name).order_by('-id').first()
                    if project_obj:
                        stats_data["latest_update_note"] = project_obj.latest_update_note or ""
                        
                        # Calculate Project Total FTE and User's Project FTE
                        project_team = TeamMember.objects.filter(project=project_obj)
                        stats_data["project_total_fte"] = round(float(project_team.aggregate(Sum('fte_score'))['fte_score__sum'] or 0.0), 2)
                        
                        user_tm = project_team.filter(user__username=username).first()
                        stats_data["user_project_fte"] = round(float(user_tm.fte_score if user_tm else 0.0), 2)
                    else:
                        stats_data["latest_update_note"] = ""
                        stats_data["project_total_fte"] = 0.0
                        stats_data["user_project_fte"] = 0.0

                except Exception as e:
                    stats_data["latest_update_note"] = ""
                    stats_data["project_total_fte"] = 0.0
                    stats_data["user_project_fte"] = 0.0
                    logger.error(f"Error fetching project specific stats: {e}")


            # Today's hours
            hours_today = effort_query.filter(log_date=today).aggregate(Sum('hours_added'))['hours_added__sum'] or 0
            # pyrefly: ignore [bad-typed-dict-key]
            stats_data["hours_today"] = round(float(hours_today), 1)

            # Monthly hours for FTE (160 standard base) - ALWAYS USE UNFILTERED BASE QUERY!
            total_month_hours = base_effort_query.filter(
                log_date__month=today.month,
                log_date__year=today.year
            ).aggregate(Sum('hours_added'))['hours_added__sum'] or 0

            # pyrefly: ignore [bad-typed-dict-key]
            stats_data["fte_score"] = round(float(total_month_hours) / 160, 2)

            # --- ASSIGNED FTE LOGIC (TeamMember table) ---
            # Sum of FTE scores across all active projects
            # pyrefly: ignore [missing-attribute]
            assigned_fte = TeamMember.objects.filter(
                user__username=username,
                project__status__in=['Approved', 'Active', 'In Progress']
            ).aggregate(Sum('fte_score'))['fte_score__sum'] or 0.0
            
            stats_data["assigned_fte"] = round(float(assigned_fte), 2)

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
        # pyrefly: ignore [missing-attribute]
        projects = Project.objects.filter(program=program)
        project_ids = list(projects.values_list('id', flat=True))
        # pyrefly: ignore [missing-attribute]
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
        # pyrefly: ignore [missing-attribute]
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

        # 6. Projects Breakdown (Real-time detailed breakdown)
        projects_breakdown = []
        for p in projects:
            p_tasks = all_tasks.filter(project=p)
            p_total = p_tasks.count()
            p_done = p_tasks.filter(status__icontains='Done').count()
            p_progress = round((p_done / p_total * 100), 1) if p_total > 0 else 0

            # Last team member and task name
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

            # Total hours logged on this project
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
            "overall_progress": progress_val,
            "total_tasks": total_tasks,
            "completed_tasks": done_tasks,
            "team_count": all_tasks.exclude(assigned_to__isnull=True).values('assigned_to').distinct().count(),
            "task_distribution": task_dist,
            "recent_logs": recent_logs,
            "gantt_data": gantt_data,
            "velocity_data": velocity_data,
            "projects_breakdown": projects_breakdown
        }, status=200)

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
        logger.error(f"WORKING PROGRAMS ERROR: {str(e)}")

        print(f"Error in get_working_programs: {e}")
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
    sprint_id = request.data.get('sprint_id')
    new_status = request.data.get('status')
    
    if not sprint_id or not new_status:
        return Response({"error": "Missing sprint_id or status"}, status=400)
    
    try:
        with transaction.atomic():
            sprint = Sprint.objects.get(id=sprint_id)
            sprint.status = new_status
            sprint.save()
            
            if new_status == 'In Progress':
                project = sprint.project
                if project.status != 'In Progress':
                    project.status = 'In Progress'
                    project.save()
                
                # Keep program status as is to avoid breaking PGM dashboard logic
                
                # Notify Project Manager
                pm_user = project.created_by
                if pm_user:
                    Notification.objects.create(
                        user=pm_user,
                        message=f"🚀 Sprint '{sprint.name}' has been started by a Team Member for project '{project.name}'."
                    )
                    
            return Response({"success": True, "message": f"Sprint status updated to {new_status}"})
    except Sprint.DoesNotExist:
        return Response({"error": "Sprint not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

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
    username = request.data.get('username')
    if not username:
        return Response({"success": False})
    try:
        Notification.objects.filter(user__username=username, is_read=False).update(is_read=True)
        return Response({"success": True})
    except Exception as e:
        return Response({"success": False, "error": str(e)})
@api_view(['GET'])
def get_team_performance(request):
    manager_username = request.query_params.get('username')
    if not manager_username:
        return Response({"error": "Manager username required"}, status=400)
    
    try:
        # Get all projects managed by this PM
        # pyrefly: ignore [missing-attribute]
        projects = Project.objects.filter(created_by__username=manager_username)
        project_ids = projects.values_list('id', flat=True)
        
        # Get all team members assigned to these projects
        # pyrefly: ignore [missing-attribute]
        team_assignments = TeamMember.objects.filter(project_id__in=project_ids).select_related('user', 'project')
        
        member_stats = {}
        
        for assign in team_assignments:
            u = assign.user
            if u.username not in member_stats:
                member_stats[u.username] = {
                    "username": u.username,
                    "full_name": f"{u.first_name} {u.last_name}" if u.first_name else u.username,
                    "total_projects": 0,
                    "total_fte": 0.0,
                    "total_tasks": 0,
                    "completed_tasks": 0,
                    "recent_tasks": []
                }
            
            stats = member_stats[u.username]
            stats["total_projects"] += 1
            stats["total_fte"] += assign.fte_score
            
            # Get tasks for this user in projects managed by this PM
            # pyrefly: ignore [missing-attribute]
            tasks = Task.objects.filter(assigned_to=u, project_id__in=project_ids)
            stats["total_tasks"] += tasks.count()
            stats["completed_tasks"] += tasks.filter(status__iexact='Done').count()
            
            # Get 3 most recent tasks
            recent = tasks.order_by('-due_date')[:3]
            for t in recent:
                stats["recent_tasks"].append({
                    "title": t.title,
                    "project": t.project.name,
                    "status": t.status,
                    "due_date": str(t.due_date)
                })

        # Calculate final metrics
        performance_data = []
        for username, data in member_stats.items():
            completion_rate = (data["completed_tasks"] / data["total_tasks"] * 100) if data["total_tasks"] > 0 else 0
            # Simple score logic: weighted average of completion rate and fte (normalized)
            # A good member has high completion rate and balanced FTE usage
            score = (completion_rate * 0.7) + (min(data["total_fte"], 2.0) * 15) # Cap FTE bonus at 30 points
            
            performance_data.append({
                **data,
                "completion_rate": round(completion_rate, 1),
                "performance_score": round(score, 1)
            })
            
        # Sort by performance score
        performance_data.sort(key=lambda x: x["performance_score"], reverse=True)
        
        return Response(performance_data)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
def get_all_resources(request):
    try:
        from django.contrib.auth.models import User
        from core.models import Profile, TeamMember, Task, Project, DailyEffortLog
        from django.db.models import Sum
        import datetime
        
        # Get all profiles filtered by allowed users
        profiles = Profile.objects.select_related('user').filter(user__username__in=['khwahish_pm', 'shailja_pgm', 'yash_tm', 'priya_tm'])
        
        resources_list = []
        today = datetime.date.today()
        
        for profile in profiles:
            u = profile.user
            role = profile.role
            role_display = dict(Profile.ROLES).get(role, role)
            
            # 1. Projects managed or assigned
            active_projects = []
            if role == 'PGM':
                # pyrefly: ignore [missing-attribute]
                projs = Project.objects.filter(program__project_manager_assigned=u, status__in=['Approved', 'Active', 'In Progress'])
                active_projects = list(projs.values_list('name', flat=True))
            elif role == 'PM':
                # pyrefly: ignore [missing-attribute]
                projs = Project.objects.filter(created_by=u, status__in=['Approved', 'Active', 'In Progress'])
                active_projects = list(projs.values_list('name', flat=True))
            else: # TM
                # pyrefly: ignore [missing-attribute]
                tms = TeamMember.objects.filter(user=u, project__status__in=['Approved', 'Active', 'In Progress']).select_related('project')
                active_projects = [tm.project.name for tm in tms]
            
            # 2. Total Assigned FTE
            extra_metrics = {}
            if role == 'PGM':
                # pyrefly: ignore [missing-attribute]
                projects_handled = Project.objects.filter(program__project_manager_assigned=u, status__in=['Approved', 'Active', 'In Progress']).count()
                # pyrefly: ignore [missing-attribute]
                employees_managed = TeamMember.objects.filter(
                    project__program__project_manager_assigned=u,
                    project__status__in=['Approved', 'Active', 'In Progress']
                ).values('user').distinct().count()
                pending_sprints = Sprint.objects.filter(status='Pending Approval').count()
                meetings_and_approvals = (projects_handled * 3) + pending_sprints
                
                assigned_fte = (projects_handled * 0.25) + (employees_managed * 0.05) + (meetings_and_approvals * 0.03)
                extra_metrics = {
                    "projects_handled": projects_handled,
                    "employees_managed": employees_managed,
                    "meetings_and_approvals": meetings_and_approvals
                }
            elif role == 'PM':
                # pyrefly: ignore [missing-attribute]
                active_tasks = Task.objects.filter(project__created_by=u, status__in=['In Progress', 'To Do']).count()
                # pyrefly: ignore [missing-attribute]
                team_coordination = TeamMember.objects.filter(project__created_by=u).values('user').distinct().count()
                # pyrefly: ignore [missing-attribute]
                active_sprints = Sprint.objects.filter(project__created_by=u, status='In Progress').count()
                # pyrefly: ignore [missing-attribute]
                overdue_tasks = Task.objects.filter(project__created_by=u, due_date__lt=today).exclude(status='Done').count()
                reporting_deadline_management = (active_sprints * 2) + overdue_tasks
                
                assigned_fte = (active_tasks * 0.05) + (team_coordination * 0.08) + (reporting_deadline_management * 0.10)
                extra_metrics = {
                    "active_tasks": active_tasks,
                    "team_coordination": team_coordination,
                    "reporting_deadline_management": reporting_deadline_management
                }
            else: # TM
                # pyrefly: ignore [missing-attribute]
                assigned_fte = TeamMember.objects.filter(
                    user=u,
                    project__status__in=['Approved', 'Active', 'In Progress']
                ).aggregate(total=Sum('fte_score'))['total'] or 0.0

            assigned_fte = round(float(assigned_fte), 2)
            
            # 3. Total Calculated FTE (Month hours / 160)
            # pyrefly: ignore [missing-attribute]
            month_hours = DailyEffortLog.objects.filter(
                user=u,
                log_date__month=today.month,
                log_date__year=today.year
            ).aggregate(total=Sum('hours_added'))['total'] or 0.0
            calculated_fte = round(float(month_hours) / 160, 2)
            
            # 4. Tasks and Completion status
            # pyrefly: ignore [missing-attribute]
            tasks = Task.objects.filter(assigned_to=u)
            total_tasks = tasks.count()
            completed_tasks = tasks.filter(status='Done').count()
            completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0
            
            # 5. Workload status mapping
            if assigned_fte > 1.0:
                workload_status = 'Overloaded'
                workload_color = 'Red'
                status = 'Overutilized'
            elif assigned_fte >= 0.5:
                workload_status = 'Busy'
                workload_color = 'Yellow'
                status = 'Optimal'
            else:
                workload_status = 'Free'
                workload_color = 'Green'
                status = 'Underutilized' if assigned_fte > 0.0 else 'Available'
                
            # 6. Performance Score
            score = (completion_rate * 0.7) + (min(float(assigned_fte), 2.0) * 15)
            performance_score = round(score, 1)
            
            resources_list.append({
                "username": u.username,
                "email": u.email,
                "role": role,
                "role_display": role_display,
                "active_projects": active_projects,
                "assigned_fte": assigned_fte,
                "calculated_fte": calculated_fte,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "completion_rate": completion_rate,
                "utilization_status": status,
                "workload_status": workload_status,
                "workload_color": workload_color,
                "extra_metrics": extra_metrics,
                "performance_score": performance_score,
                "phone": profile.phone or '',
                "bio": profile.bio or ''
            })
            
        return Response(resources_list)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# --- NEW ONGOING PROJECT FLOW APIS ---

@api_view(['POST'])
def post_project_update_note(request):
    project_id = request.data.get('project_id')
    note = request.data.get('note')
    try:
        project = Project.objects.get(id=project_id)
        project.latest_update_note = note
        project.save()
        
        # Notify all assigned team members
        team_members = TeamMember.objects.filter(project=project)
        for tm in team_members:
            Notification.objects.create(
                user=tm.user,
                message=f"PM_ADD: [Announcement] Project Manager updated: \"{note}\""
            )
            
        return Response({"success": True})
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
def request_additional_sprint(request):
    from datetime import datetime
    project_id = request.data.get('project_id')
    name = request.data.get('name')
    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')
    try:
        project = Project.objects.get(id=project_id)
        
        # Date Validation
        s_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        e_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        if s_date < project.start_date or e_date > project.end_date:
            return Response({"error": f"Sprint timeline must be within project timeline ({project.start_date} to {project.end_date})"}, status=400)
            
        sprint = Sprint.objects.create(
            project=project,
            name=name,
            start_date=start_date,
            end_date=end_date,
            status='Pending Approval'
        )
        
        # Notify Program Manager (PGM)
        from django.contrib.auth.models import User
        pgm_users = User.objects.filter(profile__role='PGM')
        for pgm_user in pgm_users:
            Notification.objects.create(
                user=pgm_user,
                message=f"NEW_SPRINT: Additional sprint '{name}' requested for active project '{project.name}' by PM."
            )
            
        return Response({"success": True, "message": "Sprint request submitted for PGM approval"})
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


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
    sprint_id = request.data.get('sprint_id')
    decision = request.data.get('decision') # 'Approved' or 'Returned'
    return_note = request.data.get('return_note', '')
    try:
        sprint = Sprint.objects.get(id=sprint_id)
        if decision == 'Approved':
            sprint.status = 'Approved'
            sprint.save()
            
            # Notify PM
            pm_user = sprint.project.created_by
            if pm_user:
                Notification.objects.create(
                    user=pm_user,
                    message=f"SPRINT_APPROVED: Additional sprint '{sprint.name}' for project '{sprint.project.name}' was approved by PGM."
                )
                
            # Notify Team Members
            team_members = TeamMember.objects.filter(project=sprint.project)
            for tm in team_members:
                Notification.objects.create(
                    user=tm.user,
                    message=f"SPRINT_ADDED: New sprint '{sprint.name}' has been added to project '{sprint.project.name}'."
                )
        else:
            sprint.status = 'Returned'
            sprint.save()
            
            # Notify PM
            pm_user = sprint.project.created_by
            if pm_user:
                Notification.objects.create(
                    user=pm_user,
                    message=f"SPRINT_RETURNED: Additional sprint '{sprint.name}' for project '{sprint.project.name}' was returned. Note: {return_note}"
                )
                
        return Response({"success": True})
    except Sprint.DoesNotExist:
        return Response({"error": "Sprint not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# --- AUTOMATED PROGRAM BULK IMPORT ENDPOINTS ---
# pyrefly: ignore [untyped-import]
import pandas as pd
from datetime import datetime, date

@api_view(['POST'])
def parse_program_import(request):
    try:
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({"success": False, "error": "No file uploaded"}, status=400)
        
        file_name = uploaded_file.name.lower()
        if file_name.endswith('.csv'):
            df = pd.read_csv(uploaded_file)
        elif file_name.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(uploaded_file)
        else:
            return Response({"success": False, "error": "Unsupported file format. Please upload CSV or Excel (.xlsx/.xls) file."}, status=400)
        
        # Standardize column names to lower case and strip whitespace
        df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]
        
        # Column mappings (to support flexible formats)
        col_mappings = {
            'name': ['program_name', 'name', 'title', 'program'],
            'description': ['description', 'desc', 'details', 'about'],
            'start_date': ['start_date', 'start', 'startdate'],
            'end_date': ['end_date', 'end', 'enddate']
        }
        
        # Helper to find column matching any alias
        def find_col(aliases):
            for alias in aliases:
                if alias in df.columns:
                    return alias
            return None
        
        name_col = find_col(col_mappings['name'])
        desc_col = find_col(col_mappings['description'])
        start_col = find_col(col_mappings['start_date'])
        end_col = find_col(col_mappings['end_date'])
        
        parsed_records = []
        existing_program_names = set(Program.objects.values_list('name', flat=True))
        seen_names_in_file = set()
        
        for idx, row in df.iterrows():
            errors = []
            
            # 1. Parse Name
            raw_name = row.get(name_col) if name_col else None
            name = str(raw_name).strip() if pd.notna(raw_name) else ""
            
            if not name:
                errors.append("Program Name is required.")
            else:
                # Check DB duplicate
                if name in existing_program_names:
                    errors.append(f"Program '{name}' already exists in database.")
                # Check file duplicate
                if name in seen_names_in_file:
                    errors.append(f"Program Name '{name}' is duplicated within this file.")
                seen_names_in_file.add(name)
            
            # 2. Parse Description
            raw_desc = row.get(desc_col) if desc_col else None
            description = str(raw_desc).strip() if pd.notna(raw_desc) else ""
            
            # 3. Parse Dates
            raw_start = row.get(start_col) if start_col else None
            raw_end = row.get(end_col) if end_col else None
            
            start_date_str = None
            end_date_str = None
            
            # Date format helper
            def parse_date(val):
                if pd.isna(val):
                    return None, None
                # If Excel parsed it as datetime
                if isinstance(val, (datetime, date, pd.Timestamp)):
                    # Convert to datetime date
                    if hasattr(val, 'date'):
                        d = val.date()
                    else:
                        d = val
                    return d.strftime('%Y-%m-%d'), None
                
                # If String representation
                val_str = str(val).strip()
                if not val_str or val_str.lower() in ('nat', 'none', 'null', 'nan'):
                    return None, None
                
                for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d', '%b %d, %Y', '%d %b %Y'):
                    try:
                        parsed_dt = datetime.strptime(val_str, fmt).date()
                        return parsed_dt.strftime('%Y-%m-%d'), None
                    except ValueError:
                        continue
                return None, f"Invalid date format '{val_str}'"
            
            start_date_str, start_err = parse_date(raw_start)
            if start_err:
                errors.append(f"Start Date: {start_err}")
                
            end_date_str, end_err = parse_date(raw_end)
            if end_err:
                errors.append(f"End Date: {end_err}")
                
            # Chronological check if dates are valid
            if start_date_str and end_date_str and not (start_err or end_err):
                try:
                    s_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    e_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    if s_date > e_date:
                        errors.append("End date must be on or after start date.")
                except Exception:
                    pass
            
            is_valid = len(errors) == 0
            
            parsed_records.append({
                "row_index": idx + 1,
                "name": name,
                "description": description,
                "start_date": start_date_str,
                "end_date": end_date_str,
                "is_valid": is_valid,
                "errors": errors
            })
            
        summary = {
            "total_records": len(parsed_records),
            "valid_records": sum(1 for r in parsed_records if r["is_valid"]),
            "invalid_records": sum(1 for r in parsed_records if not r["is_valid"])
        }
        
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
        programs_data = request.data.get('programs', [])
        if not programs_data:
            return Response({"success": False, "error": "No program data provided to import"}, status=400)
        
        created_programs = []
        errors = []
        
        with transaction.atomic():
            for idx, p in enumerate(programs_data):
                name = p.get('name', '').strip()
                description = p.get('description', '').strip()
                start_date_str = p.get('start_date')
                end_date_str = p.get('end_date')
                
                if not name:
                    errors.append(f"Row {idx+1}: Program Name is missing.")
                    continue
                
                # Check DB duplicate inside transaction (safety check)
                if Program.objects.filter(name=name).exists():
                    errors.append(f"Row {idx+1}: Program '{name}' already exists in database.")
                    continue
                
                start_date = None
                end_date = None
                if start_date_str:
                    try:
                        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    except ValueError:
                        pass
                
                if end_date_str:
                    try:
                        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    except ValueError:
                        pass
                
                program = Program.objects.create(
                    name=name,
                    description=description,
                    start_date=start_date,
                    end_date=end_date,
                    status='Pending'
                )
                
                created_programs.append({
                    "id": program.id,
                    "name": program.name
                })
        
        return Response({
            "success": True,
            "created_count": len(created_programs),
            "created": created_programs,
            "errors": errors
        })
        
    except Exception as e:
        logger.error(f"COMMIT PROGRAM IMPORT ERROR: {str(e)}")
        return Response({"success": False, "error": f"Failed to commit import: {str(e)}"}, status=400)
