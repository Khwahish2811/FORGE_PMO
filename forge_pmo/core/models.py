# pyrefly: ignore [untyped-import]
from django.db import models
# pyrefly: ignore [untyped-import]
from django.contrib.auth.models import User
# pyrefly: ignore [untyped-import]
from django.db.models.signals import post_save
# pyrefly: ignore [untyped-import]
from django.dispatch import receiver
# pyrefly: ignore [untyped-import]
from django.db.models import Sum

# --- USER PROFILE ---
class Profile(models.Model):
    ROLES = (
        ('SPOC', 'Business SPOC'),
        ('PGM', 'Program Manager'),
        ('PM', 'Project Manager'),
        ('TM', 'Team Member'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLES, default='TM')
    bio = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"To {self.user.username}: {self.message[:20]}..."

# --- PROGRAM SECTION ---
class Program(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    manager_name = models.CharField(max_length=100, null=True, blank=True) # SPOC Name
    project_manager_assigned = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_programs')
    status = models.CharField(max_length=50, default='Pending')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    document = models.FileField(upload_to='program_docs/', null=True, blank=True) # Serializer

    # pyrefly: ignore [bad-override]
    def __str__(self):
        return self.name

# --- PROJECT SECTION ---
class Project(models.Model):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True) # MISSING  - ADDED
    priority = models.CharField(max_length=10, default='Medium')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='managed_projects')
    status = models.CharField(max_length=50, default='Pending')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # pyrefly: ignore [bad-override]
    def __str__(self):
        return self.name

# --- SPRINT SECTION ---
class Sprint(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='sprints')
    name = models.CharField(max_length=100)
    start_date = models.DateField(null=True, blank=True) # ADDED
    end_date = models.DateField(null=True, blank=True)   # ADDED
    status = models.CharField(max_length=50, default='Planned')

    def __str__(self):
        return f"{self.name} - {self.project.name}"

# --- TEAM MEMBER ---
class TeamMember(models.Model):
    ROLE_CHOICES = [('Dev', 'Developer'), ('QA', 'Quality Analyst'), ('Lead', 'Project Lead'), ('Designer', 'Designer')]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='team_assignments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    fte_score = models.FloatField(default=0.0)
    role = models.CharField(max_length=100, choices=ROLE_CHOICES, default='Dev')

    def __str__(self):
        return f"{self.user.username} - {self.project.name}"

# --- TASK SECTION ---
class Task(models.Model):
    KANBAN_STATUS = [('To Do', 'To Do'), ('In Progress', 'In Progress'), ('Done', 'Done')]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name='tasks')
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True) # ADDED
    priority = models.CharField(max_length=10, default='Medium')
    status = models.CharField(max_length=20, choices=KANBAN_STATUS, default='To Do')

    due_date = models.DateField(null=True, blank=True)
    last_moved_date = models.DateField(null=True, blank=True)
    total_estimated_hours = models.FloatField(default=0)
    hours_logged = models.FloatField(default=0)

    def __str__(self):
        return f"{self.title} - {self.assigned_to.username}"

    @property
    def remaining_hours(self):
        # pyrefly: ignore [unsupported-operation]
        return max(0, self.total_estimated_hours - self.hours_logged)

    @property
    def total_consumed_hours(self):
        # pyrefly: ignore [missing-attribute]
        return self.daily_logs.aggregate(total=Sum('hours_added'))['total'] or 0.0

# Daily Effort Log (Same as yours)
class DailyEffortLog(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='daily_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    log_date = models.DateField(auto_now_add=True)
    hours_added = models.FloatField()

    def __str__(self):
        return f"{self.user.username} logged {self.hours_added} on {self.log_date}"
