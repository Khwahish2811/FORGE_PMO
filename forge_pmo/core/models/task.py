# pyrefly: ignore [untyped-import]
from django.db import models
# pyrefly: ignore [untyped-import]
from django.contrib.auth.models import User
# pyrefly: ignore [untyped-import]
from django.db.models import Sum
from .project import Project, Sprint

class Task(models.Model):
    KANBAN_STATUS = [('To Do', 'To Do'), ('In Progress', 'In Progress'), ('Done', 'Done')]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name='tasks')
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
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

class DailyEffortLog(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='daily_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    log_date = models.DateField(auto_now_add=True)
    hours_added = models.FloatField()

    def __str__(self):
        return f"{self.user.username} logged {self.hours_added} on {self.log_date}"
