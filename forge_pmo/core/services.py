import os
import datetime
from datetime import datetime as dt, date as d_type, timedelta
import logging
import pandas as pd
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from core.models import Program, Project, Sprint, TeamMember, Task, DailyEffortLog, Profile, Notification

logger = logging.getLogger(__name__)

class ProgramService:
    @staticmethod
    def create_program(data, user, document=None):
        logger.info(f"ProgramService: Creating program '{data.get('name')}' requested by {user}")
        program = Program.objects.create(
            name=data.get('name'),
            description=data.get('description'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            document=document,
            status='Pending'
        )
        logger.info(f"ProgramService: Successfully created program {program.id}")
        return program

    @staticmethod
    def update_program_status(pgm_id, new_status):
        logger.info(f"ProgramService: Updating program {pgm_id} status to {new_status}")
        program = get_object_or_404(Program, id=pgm_id)
        program.status = new_status
        program.save()
        
        pgm_users = User.objects.filter(profile__role='PGM')
        for pgm_user in pgm_users:
            if new_status == 'Approved':
                Notification.objects.create(
                    user=pgm_user,
                    message=f"PROGRAM_APPROVED: The program request '{program.name}' has been APPROVED by the Business SPOC."
                )
            else:
                Notification.objects.create(
                    user=pgm_user,
                    message=f"PROGRAM_REJECTED: The program request '{program.name}' was marked as '{new_status}' by the Business SPOC."
                )
        logger.info(f"ProgramService: Notifications sent for program {pgm_id}")
        return program

    @staticmethod
    def assign_project_manager(program_id, pm_id, pgm_name_from_react):
        logger.info(f"ProgramService: Assigning PM {pm_id} to program {program_id} by {pgm_name_from_react}")
        program = get_object_or_404(Program, id=program_id)
        pm_user = get_object_or_404(User, id=pm_id)
        
        program.project_manager_assigned = pm_user
        program.manager_name = pgm_name_from_react
        program.history_log = f"PM {pm_user.username} assigned by {pgm_name_from_react}."
        program.save()
        
        Notification.objects.create(
            user=pm_user,
            message=f"NEW_ASSIGNMENT: You have been assigned as the Project Manager for program '{program.name}' by PGM {pgm_name_from_react}."
        )
        logger.info(f"ProgramService: Successfully assigned PM {pm_user.username} to program {program.id}")
        return program

    @staticmethod
    def parse_import(uploaded_file):
        if not uploaded_file:
            raise ValueError("No file uploaded")
        
        file_name = uploaded_file.name.lower()
        if file_name.endswith('.csv'):
            df = pd.read_csv(uploaded_file)
        elif file_name.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(uploaded_file)
        else:
            raise ValueError("Unsupported file format. Please upload CSV or Excel (.xlsx/.xls) file.")
        
        df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]
        
        col_mappings = {
            'name': ['program_name', 'name', 'title', 'program'],
            'description': ['description', 'desc', 'details', 'about'],
            'start_date': ['start_date', 'start', 'startdate'],
            'end_date': ['end_date', 'end', 'enddate']
        }
        
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
            
            raw_name = row.get(name_col) if name_col else None
            name = str(raw_name).strip() if pd.notna(raw_name) else ""
            
            if not name:
                errors.append("Program Name is required.")
            else:
                if name in existing_program_names:
                    errors.append(f"Program '{name}' already exists in database.")
                if name in seen_names_in_file:
                    errors.append(f"Program Name '{name}' is duplicated within this file.")
                seen_names_in_file.add(name)
            
            raw_desc = row.get(desc_col) if desc_col else None
            description = str(raw_desc).strip() if pd.notna(raw_desc) else ""
            
            raw_start = row.get(start_col) if start_col else None
            raw_end = row.get(end_col) if end_col else None
            
            start_date_str = None
            end_date_str = None
            
            def parse_date(val):
                if pd.isna(val):
                    return None, None
                if isinstance(val, (dt, d_type, pd.Timestamp)):
                    if hasattr(val, 'date'):
                        d = val.date()
                    else:
                        d = val
                    return d.strftime('%Y-%m-%d'), None
                
                val_str = str(val).strip()
                if not val_str or val_str.lower() in ('nat', 'none', 'null', 'nan'):
                    return None, None
                
                for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d', '%b %d, %Y', '%d %b %Y'):
                    try:
                        parsed_dt = dt.strptime(val_str, fmt).date()
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
                
            if start_date_str and end_date_str and not (start_err or end_err):
                try:
                    s_date = dt.strptime(start_date_str, '%Y-%m-%d').date()
                    e_date = dt.strptime(end_date_str, '%Y-%m-%d').date()
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
        
        return parsed_records, summary

    @staticmethod
    def commit_import(programs_data):
        if not programs_data:
            raise ValueError("No program data provided to import")
        
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
                
                if Program.objects.filter(name=name).exists():
                    errors.append(f"Row {idx+1}: Program '{name}' already exists in database.")
                    continue
                
                start_date = None
                end_date = None
                if start_date_str:
                    try:
                        start_date = dt.strptime(start_date_str, '%Y-%m-%d').date()
                    except ValueError:
                        pass
                
                if end_date_str:
                    try:
                        end_date = dt.strptime(end_date_str, '%Y-%m-%d').date()
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
                
        return created_programs, errors


class ProjectService:
    @staticmethod
    def create_project_plan(pm_username, data):
        with transaction.atomic():
            program = Program.objects.get(id=data.get('program_id'))
            pm_user = User.objects.get(username=pm_username)

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
                    fte_score=float(member.get('fte') or 1.0)
                )

            return project

    @staticmethod
    def approve_project_plan(project_id, decision, return_note=''):
        logger.info(f"ProjectService: approve_project_plan called for {project_id} with decision {decision}")
        project = get_object_or_404(Project, id=project_id)

        if decision == 'approve':
            project.status = 'Approved'
        elif decision == 'return':
            project.status = 'Returned'
            project.return_note = return_note
        else:
            project.status = 'Rejected'
        project.save()
        
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
        logger.info(f"ProjectService: approve_project_plan completed for {project_id}")
        return project

    @staticmethod
    def start_project_execution(project_id):
        logger.info(f"ProjectService: start_project_execution called for {project_id}")
        project = get_object_or_404(Project, id=project_id)
        project.status = 'In Progress'
        project.save()
        
        program = project.program
        if program and program.status != 'In Progress':
            program.status = 'In Progress'
            program.save()
        
        logger.info(f"ProjectService: Execution started for project {project_id}")
        return project

    @staticmethod
    def post_project_update_note(project_id, note):
        logger.info(f"ProjectService: post_project_update_note called for {project_id}")
        project = get_object_or_404(Project, id=project_id)
        project.latest_update_note = note
        project.save()
        
        team_members = TeamMember.objects.filter(project=project)
        for tm in team_members:
            Notification.objects.create(
                user=tm.user,
                message=f"PM_ADD: [Announcement] Project Manager updated: \"{note}\""
            )
            
        logger.info(f"ProjectService: Notifications sent for project update {project_id}")
        return project


class TaskService:
    @staticmethod
    def create_task(data):
        logger.info(f"TaskService: create_task called for project {data.get('project_id')} assignee {data.get('assigned_to')}")
        project = get_object_or_404(Project, id=int(data.get('project_id')))
        sprint = get_object_or_404(Sprint, id=int(data.get('sprint_id')))
        assignee = get_object_or_404(User, username=data.get('assigned_to'))
        
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
        
        Notification.objects.create(
            user=assignee,
            message=f"PM_ADD: Task '{task.title}' was added by the Project Manager for project '{project.name}'."
        )
        logger.info(f"TaskService: create_task completed for task {task.id}")
        return task

    @staticmethod
    def update_task_status(task_id, new_status):
        logger.info(f"TaskService: update_task_status called for task {task_id} -> {new_status}")
        task = get_object_or_404(Task, id=task_id)
        task.status = new_status
        task.save()
        logger.info(f"TaskService: update_task_status completed for task {task_id}")
        return task

    @staticmethod
    def log_daily_effort(task_id, hours_added, username, log_date):
        logger.info(f"TaskService: log_daily_effort called for task {task_id} by {username}")
        if hours_added <= 0:
            raise ValueError("Hours must be greater than 0")
            
        with transaction.atomic():
            task = Task.objects.select_for_update().get(id=task_id)
            user = get_object_or_404(User, username=username)
            
            total_today = DailyEffortLog.objects.filter(
                user=user,
                log_date=log_date
            ).aggregate(total=Sum('hours_added'))['total'] or 0
            
            if float(total_today) + hours_added > 24:
                raise ValueError(f"Daily limit exceed! You already logged {total_today}h today.")
                
            task.hours_logged = float(task.hours_logged or 0) + hours_added
            task.save()
            
            DailyEffortLog.objects.create(
                task=task,
                user=user,
                hours_added=hours_added,
                log_date=log_date
            )
            
            remaining = float(task.total_estimated_hours or 0) - float(task.hours_logged or 0)
            
        logger.info(f"TaskService: log_daily_effort completed for task {task_id}")
        return task, remaining

    @staticmethod
    def update_task_status_with_tracker(task_id, new_status):
        logger.info(f"TaskService: update_task_status_with_tracker called for task {task_id} -> {new_status}")
        task = get_object_or_404(Task, id=task_id)
        old_status = task.status
        task.status = new_status
        task.last_moved_date = timezone.now().date()
        
        if new_status == 'In Progress' and not getattr(task, 'start_date', None):
            task.start_date = timezone.now().date()
            
        task.save()
        
        project = task.project
        if new_status == 'In Progress' and project.status != 'In Progress':
            project.status = 'In Progress'
            project.save()
            
            program = project.program
            if program.status != 'In Progress':
                program.status = 'In Progress'
                program.save()
                
        project_tasks = Task.objects.filter(project=project)
        total_count = project_tasks.count()
        done_count = project_tasks.filter(status='Done').count()
        progress_percent = (done_count / total_count * 100) if total_count > 0 else 0
        
        logger.info(f"TaskService: update_task_status_with_tracker completed for task {task_id}")
        return {
            "task": task, 
            "old_status": old_status, 
            "progress_percent": progress_percent,
            "project_status": project.status
        }


class SprintService:
    @staticmethod
    def update_sprint_status(sprint_id, new_status):
        logger.info(f"SprintService: update_sprint_status called for {sprint_id} -> {new_status}")
        with transaction.atomic():
            sprint = get_object_or_404(Sprint, id=sprint_id)
            sprint.status = new_status
            sprint.save()
            
            if new_status == 'In Progress':
                project = sprint.project
                if project.status != 'In Progress':
                    project.status = 'In Progress'
                    project.save()
                
                pm_user = project.created_by
                if pm_user:
                    Notification.objects.create(
                        user=pm_user,
                        message=f"🚀 Sprint '{sprint.name}' has been started by a Team Member for project '{project.name}'."
                    )
        logger.info(f"SprintService: update_sprint_status completed for sprint {sprint_id}")
        return sprint

    @staticmethod
    def request_additional_sprint(project_id, sprint_id, name, start_date, end_date):
        from datetime import datetime
        logger.info(f"SprintService: request_additional_sprint called for project {project_id}")
        project = get_object_or_404(Project, id=project_id)
        
        try:
            sd = datetime.strptime(start_date, '%Y-%m-%d').date()
            ed = datetime.strptime(end_date, '%Y-%m-%d').date()
            if sd < project.start_date or ed > project.end_date:
                raise ValueError(f"Sprint timeline must be within project timeline ({project.start_date} to {project.end_date})")
        except ValueError as ve:
            raise ValueError(str(ve))
            
        if sprint_id:
            sprint = get_object_or_404(Sprint, id=sprint_id)
            sprint.name = name
            sprint.start_date = start_date
            sprint.end_date = end_date
            sprint.status = 'Pending Approval'
            sprint.return_note = ''
            sprint.save()
            action_msg = "resubmitted"
        else:
            sprint = Sprint.objects.create(
                project=project,
                name=name,
                start_date=start_date,
                end_date=end_date,
                status='Pending Approval'
            )
            action_msg = "requested"
            
        pgm_users = User.objects.filter(profile__role='PGM')
        for pgm_user in pgm_users:
            Notification.objects.create(
                user=pgm_user,
                message=f"SPRINT_UPDATE: Sprint '{name}' was {action_msg} for active project '{project.name}' by PM."
            )
            
        return sprint, action_msg

    @staticmethod
    def review_additional_sprint(sprint_id, decision, return_note=''):
        logger.info(f"SprintService: review_additional_sprint called for {sprint_id} -> {decision}")
        sprint = get_object_or_404(Sprint, id=sprint_id)
        
        if decision == 'Approved':
            sprint.status = 'Approved'
            sprint.save()
            
            pm_user = sprint.project.created_by
            if pm_user:
                Notification.objects.create(
                    user=pm_user,
                    message=f"SPRINT_APPROVED: Additional sprint '{sprint.name}' for project '{sprint.project.name}' was approved by PGM."
                )
                
            team_members = TeamMember.objects.filter(project=sprint.project)
            for tm in team_members:
                Notification.objects.create(
                    user=tm.user,
                    message=f"SPRINT_ADDED: New sprint '{sprint.name}' has been added to project '{sprint.project.name}'."
                )
        else:
            sprint.status = 'Returned'
            sprint.return_note = return_note
            sprint.save()
            
            pm_user = sprint.project.created_by
            if pm_user:
                Notification.objects.create(
                    user=pm_user,
                    message=f"SPRINT_RETURNED: Additional sprint '{sprint.name}' for project '{sprint.project.name}' was returned. Note: {return_note}"
                )
                
        logger.info(f"SprintService: review_additional_sprint completed for {sprint_id}")
        return sprint


class NotificationService:
    @staticmethod
    def mark_notifications_read(username):
        logger.info(f"NotificationService: mark_notifications_read called for {username}")
        updated_count = Notification.objects.filter(user__username=username, is_read=False).update(is_read=True)
        logger.info(f"NotificationService: Marked {updated_count} notifications as read for {username}")
        return updated_count


class StatsService:
    @staticmethod
    def get_dashboard_stats(username, project_name=None):
        today = timezone.now().date()
        stats_data = {
            "total_programs": Program.objects.all().count(),
            "pending_approvals": Program.objects.filter(status__iexact='Pending').count(),
            "active_tasks": 0,
            "due_this_week": 0,
            "hours_today": 0,
            "fte_score": 0,
            "daily_limit": 9
        }

        if username:
            stats_data["active_tasks"] = Task.objects.filter(
                assigned_to__username=username
            ).exclude(status__iexact='Done').count()

            week_end = today + timedelta(days=7)
            stats_data["due_this_week"] = Task.objects.filter(
                assigned_to__username=username,
                due_date__range=[today, week_end]
            ).exclude(status__iexact='Done').count()

            base_effort_query = DailyEffortLog.objects.filter(user__username=username)
            effort_query = base_effort_query

            if project_name:
                effort_query = effort_query.filter(task__project__name=project_name)
                project_obj = Project.objects.filter(name=project_name).order_by('-id').first()
                if project_obj:
                    stats_data["latest_update_note"] = project_obj.latest_update_note or ""
                    project_team = TeamMember.objects.filter(project=project_obj)
                    stats_data["project_total_fte"] = round(float(project_team.aggregate(Sum('fte_score'))['fte_score__sum'] or 0.0), 2)
                    user_tm = project_team.filter(user__username=username).first()
                    stats_data["user_project_fte"] = round(float(user_tm.fte_score if user_tm else 0.0), 2)
                else:
                    stats_data["latest_update_note"] = ""
                    stats_data["project_total_fte"] = 0.0
                    stats_data["user_project_fte"] = 0.0

            hours_today = effort_query.filter(log_date=today).aggregate(Sum('hours_added'))['hours_added__sum'] or 0
            stats_data["hours_today"] = round(float(hours_today), 1)

            total_month_hours = base_effort_query.filter(
                log_date__month=today.month,
                log_date__year=today.year
            ).aggregate(Sum('hours_added'))['hours_added__sum'] or 0
            stats_data["fte_score"] = round(float(total_month_hours) / 160, 2)

            assigned_fte = TeamMember.objects.filter(
                user__username=username,
                project__status__in=['Approved', 'Active', 'In Progress']
            ).aggregate(Sum('fte_score'))['fte_score__sum'] or 0.0
            stats_data["assigned_fte"] = round(float(assigned_fte), 2)

        return stats_data

    @staticmethod
    def get_program_tracker_stats(program_id):
        program = get_object_or_404(Program, id=program_id)
        projects = Project.objects.filter(program=program)
        project_ids = list(projects.values_list('id', flat=True))
        all_tasks = Task.objects.filter(project_id__in=project_ids).select_related('assigned_to', 'sprint')

        total_tasks = all_tasks.count()
        done_tasks = all_tasks.filter(status__icontains='Done').count()
        progress_val = round((done_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

        recent_logs = []
        for task in all_tasks.order_by('-id')[:5]:
            recent_logs.append({
                "user": task.assigned_to.username if task.assigned_to else "Unassigned",
                "task_name": task.title or "Unnamed",
                "status": task.status or "In Progress",
                "due_date": task.due_date.strftime('%d %b') if task.due_date else "No Date"
            })

        task_dist = [
            {"name": "Done", "value": done_tasks},
            {"name": "Doing", "value": all_tasks.filter(status__icontains='Progress').count()},
            {"name": "Todo", "value": all_tasks.filter(status__icontains='To Do').count()},
        ]

        gantt_data = []
        for task in all_tasks:
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

        projects_breakdown = []
        for p in projects:
            p_tasks = all_tasks.filter(project=p)
            p_total = p_tasks.count()
            p_done = p_tasks.filter(status__icontains='Done').count()
            p_progress = round((p_done / p_total * 100), 1) if p_total > 0 else 0

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

            active_s = Sprint.objects.filter(project=p, status='In Progress').first()
            if not active_s:
                active_s = Sprint.objects.filter(project=p).order_by('-end_date').first()

            sprint_name = active_s.name if active_s else "No Active Sprint"
            sprint_due = str(active_s.end_date) if active_s and active_s.end_date else "N/A"

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

        return {
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
        }


class TeamService:
    @staticmethod
    def get_team_performance(manager_username):
        projects = Project.objects.filter(created_by__username=manager_username)
        project_ids = projects.values_list('id', flat=True)
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
            
            tasks = Task.objects.filter(assigned_to=u, project_id__in=project_ids)
            stats["total_tasks"] += tasks.count()
            stats["completed_tasks"] += tasks.filter(status__iexact='Done').count()
            
            recent = tasks.order_by('-due_date')[:3]
            for t in recent:
                stats["recent_tasks"].append({
                    "title": t.title,
                    "project": t.project.name,
                    "status": t.status,
                    "due_date": str(t.due_date)
                })

        performance_data = []
        for username, data in member_stats.items():
            completion_rate = (data["completed_tasks"] / data["total_tasks"] * 100) if data["total_tasks"] > 0 else 0
            score = (completion_rate * 0.7) + (min(data["total_fte"], 2.0) * 15)
            
            performance_data.append({
                **data,
                "completion_rate": round(completion_rate, 1),
                "performance_score": round(score, 1)
            })
            
        performance_data.sort(key=lambda x: x["performance_score"], reverse=True)
        return performance_data

    @staticmethod
    def get_all_resources():
        profiles = Profile.objects.select_related('user').filter(user__username__in=['khwahish_pm', 'shailja_pgm', 'yash_tm', 'priya_tm'])
        resources_list = []
        today = timezone.now().date()
        
        for profile in profiles:
            u = profile.user
            role = profile.role
            role_display = dict(Profile.ROLES).get(role, role)
            
            active_projects = []
            if role == 'PGM':
                projs = Project.objects.filter(program__project_manager_assigned=u, status__in=['Approved', 'Active', 'In Progress'])
                active_projects = list(projs.values_list('name', flat=True))
            elif role == 'PM':
                projs = Project.objects.filter(created_by=u, status__in=['Approved', 'Active', 'In Progress'])
                active_projects = list(projs.values_list('name', flat=True))
            else:
                tms = TeamMember.objects.filter(user=u, project__status__in=['Approved', 'Active', 'In Progress']).select_related('project')
                active_projects = [tm.project.name for tm in tms]
            
            extra_metrics = {}
            if role == 'PGM':
                projects_handled = Project.objects.filter(program__project_manager_assigned=u, status__in=['Approved', 'Active', 'In Progress']).count()
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
                active_tasks = Task.objects.filter(project__created_by=u, status__in=['In Progress', 'To Do']).count()
                team_coordination = TeamMember.objects.filter(project__created_by=u).values('user').distinct().count()
                active_sprints = Sprint.objects.filter(project__created_by=u, status='In Progress').count()
                overdue_tasks = Task.objects.filter(project__created_by=u, due_date__lt=today).exclude(status='Done').count()
                reporting_deadline_management = (active_sprints * 2) + overdue_tasks
                
                assigned_fte = (active_tasks * 0.05) + (team_coordination * 0.08) + (reporting_deadline_management * 0.10)
                extra_metrics = {
                    "active_tasks": active_tasks,
                    "team_coordination": team_coordination,
                    "reporting_deadline_management": reporting_deadline_management
                }
            else:
                assigned_fte = TeamMember.objects.filter(
                    user=u,
                    project__status__in=['Approved', 'Active', 'In Progress']
                ).aggregate(total=Sum('fte_score'))['total'] or 0.0

            assigned_fte = round(float(assigned_fte), 2)
            
            month_hours = DailyEffortLog.objects.filter(
                user=u,
                log_date__month=today.month,
                log_date__year=today.year
            ).aggregate(total=Sum('hours_added'))['total'] or 0.0
            calculated_fte = round(float(month_hours) / 160, 2)
            
            tasks = Task.objects.filter(assigned_to=u)
            total_tasks = tasks.count()
            completed_tasks = tasks.filter(status='Done').count()
            completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0
            
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
            
        return resources_list
