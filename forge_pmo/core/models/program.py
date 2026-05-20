# pyrefly: ignore [untyped-import]
from django.db import models
# pyrefly: ignore [untyped-import]
from django.contrib.auth.models import User

class Program(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    manager_name = models.CharField(max_length=100, null=True, blank=True) # SPOC Name
    project_manager_assigned = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_programs')
    status = models.CharField(max_length=50, default='Pending')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    document = models.FileField(upload_to='program_docs/', null=True, blank=True)

    # pyrefly: ignore [bad-override]
    def __str__(self):
        return self.name
