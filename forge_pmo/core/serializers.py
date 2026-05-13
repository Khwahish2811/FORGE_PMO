from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Project, Program, Task, Sprint, TeamMember


class ProgramSerializer(serializers.ModelSerializer):
    program_manager_name = serializers.ReadOnlyField(source='manager_name', default="N/A")
    project_manager_assigned_name = serializers.ReadOnlyField(
        source='project_manager_assigned.username',
        default="Not Assigned"
    )

    class Meta:
        model = Program
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date',
            'status', 'program_manager_name', 'project_manager_assigned_name', 'document'
        ]

class SprintSerializer(serializers.ModelSerializer):
    todo_count = serializers.SerializerMethodField()
    progress_count = serializers.SerializerMethodField()
    done_count = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = ['id', 'name', 'start_date', 'end_date', 'status', 'todo_count', 'progress_count', 'done_count']

    def get_todo_count(self, obj):
        return obj.tasks.filter(status='To Do').count()

    def get_progress_count(self, obj):
        return obj.tasks.filter(status='In Progress').count()

    def get_done_count(self, obj):
        return obj.tasks.filter(status='Done').count()


class ProjectSerializer(serializers.ModelSerializer):
    program_name = serializers.ReadOnlyField(source='program.name', default="N/A")
    pm_name = serializers.ReadOnlyField(source='created_by.username', default="Unknown")


    team_members = serializers.SerializerMethodField()
    sprints = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'program', 'program_name', 'name', 'description',
            'start_date', 'end_date', 'priority', 'status', 'created_by', 'pm_name',
            'team_members', 'sprints'
        ]

    def get_team_members(self, obj):
        try:

            members = obj.team_assignments.all()
            return [{
                "username": m.user.username if m.user else "Unknown",
                "role": m.role if hasattr(m, 'role') else "Dev",
                "fte": float(m.fte_score) if m.fte_score else 0.0
            } for m in members]
        except:
            return []

    def get_sprints(self, obj):
        try:

            sprints = obj.sprints.all()
            return SprintSerializer(sprints, many=True).data
        except:
            return []


class TaskSerializer(serializers.ModelSerializer):
    task_title = serializers.ReadOnlyField(source='title')
    project_name = serializers.ReadOnlyField(source='project.name', default="No Project")
    sprint_name = serializers.ReadOnlyField(source='sprint.name', default="Backlog")
    project_manager = serializers.ReadOnlyField(source='project.created_by.username', default="N/A")
    program_name = serializers.ReadOnlyField(source='project.program.name', default="N/A")
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'project_name', 'sprint', 'sprint_name',
            'task_title', 'title', 'description', 'status', 'priority',
            'due_date', 'assigned_to', 'assigned_to_name', 'hours_logged',
            'project_manager', 'program_name'
        ]