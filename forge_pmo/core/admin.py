from django.contrib import admin
from .models import Profile, Program, Project, Sprint, TeamMember, Task, DailyEffortLog


admin.site.register(Profile)


admin.site.register(Program)
admin.site.register(Project)
admin.site.register(Task)
admin.site.register(Sprint)
admin.site.register(TeamMember)
admin.site.register(DailyEffortLog) # Isse FTE wala table dikhne lagega