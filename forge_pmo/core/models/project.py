# pyrefly: ignore [untyped-import]
from django.db import models
# pyrefly: ignore [untyped-import]
from django.contrib.auth.models import User
from .program import Program

class Project(models.Model):
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    priority = models.CharField(max_length=10, default='Medium')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='managed_projects')
    status = models.CharField(max_length=50, default='Pending')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    return_note = models.TextField(null=True, blank=True)
    latest_update_note = models.TextField(null=True, blank=True)

    # pyrefly: ignore [bad-override]
    def __str__(self):
        return self.name

class Sprint(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='sprints')
    name = models.CharField(max_length=100)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, default='Planned')

    def __str__(self):
        return f"{self.name} - {self.project.name}"
