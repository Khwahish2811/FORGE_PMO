# pyrefly: ignore [untyped-import]
from django.contrib import admin
# pyrefly: ignore [untyped-import]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
# pyrefly: ignore [missing-import]
from core import views
# pyrefly: ignore [untyped-import]
from django.conf import settings
# pyrefly: ignore [untyped-import]
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),

    # --- Sabhi API paths ko yahan organize kiya hai ---
    path('api/login/', views.login_api),
    path('api/create-task/', views.create_task, name='create_task'),
    path('api/create-project-plan/', views.create_project_plan, name='create_project_plan'),
    path('api/approve-project-plan/', views.approve_project_plan, name='approve_project_plan'),

    path('api/my-assigned-programs/', views.my_assigned_programs, name='my_assigned_programs'),
    path('api/get-active-projects/', views.get_active_projects, name='get_active_projects'),
    path('api/get-tm-projects/', views.get_tm_projects, name='get_tm_projects'),
    path('api/get-team-members/', views.get_team_members, name='get_team_members'),
    path('api/get-project-managers/', views.get_project_managers, name='get_project_managers'),
    path('api/assign-pm/', views.assign_project_manager, name='assign_pm'),
    path('api/get-all-programs/', views.get_all_programs, name='get_all_programs'),
    path('api/get-pending-projects/', views.get_pending_projects, name='get_pending_projects'),

    # --- Program Status Updates ---
    path('api/create-program/', views.create_program, name='create_program'),
    path('api/update-program-status/', views.update_program_status, name='update_status'),

    # Router logic (Projects ViewSet ke liye)
    path('api/', include('core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
