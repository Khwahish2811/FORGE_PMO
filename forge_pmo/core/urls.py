# pyrefly: ignore [untyped-import]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet
from . import views
from .views import get_program_tracker_stats

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', views.login_api),
    path('all-programs/', views.get_all_programs, name='all-programs'),
    path('create-program/', views.create_program, name='create_program'),
    path('update-program-status/', views.update_program_status, name='update_status'),


    path('my-assigned-programs/', views.my_assigned_programs, name='my_assigned_programs'),
    path('get-team-members/', views.get_team_members, name='get_team_members'),
    path('approve-project-plan/', views.approve_project_plan, name='approve_project_plan'),
    path('get-active-projects/', views.get_active_projects, name='get_active_projects'),
    path('get-tm-projects/', views.get_tm_projects, name='get_tm_projects'),


    path('create-task/', views.create_task, name='create_task'),

path('get-kanban-tasks/', views.get_kanban_tasks, name='get_kanban_tasks'),
    # urls.py mein
    path('update-status-with-date/', views.update_task_status, name='update_task_status'),

path('log-daily-effort/', views.log_daily_effort, name='log_daily_effort'),
    path('update-status-with-date/', views.update_task_status_with_tracker, name='update_status_with_tracker'),
    path('get-manager-tasks/', views.get_manager_team_tasks, name='get_manager_tasks'),
path('get-dashboard-stats/', views.get_dashboard_stats, name='dashboard-stats'),

path('program-tracker/', get_program_tracker_stats, name='program-tracker'),

path('get-working-programs/', views.get_working_programs, name='get_working_programs'),
path('update-task-status-with-tracker/', views.update_task_status, name='update-task-status'),
path('pm-dashboard-stats/', views.get_pm_dashboard_stats, name='pm-stats'),
]
