# pyrefly: ignore [untyped-import]
from django.db import models
# pyrefly: ignore [untyped-import]
from django.contrib.auth.models import User

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
