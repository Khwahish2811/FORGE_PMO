# pyrefly: ignore [untyped-import]
from django.db import models
# pyrefly: ignore [untyped-import]
from django.contrib.auth.models import User
from .project import Project

class TeamMember(models.Model):
    ROLE_CHOICES = [('Dev', 'Developer'), ('QA', 'Quality Analyst'), ('Lead', 'Project Lead'), ('Designer', 'Designer')]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='team_assignments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    fte_score = models.FloatField(default=0.0)
    role = models.CharField(max_length=100, choices=ROLE_CHOICES, default='Dev')

    def __str__(self):
        return f"{self.user.username} - {self.project.name}"
