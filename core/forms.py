# pyrefly: ignore [untyped-import]
from django import forms
# pyrefly: ignore [missing-import]
from core.models import Project

class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = ['name', 'description', 'start_date', 'status']
        widgets = {
            'start_date': forms.DateInput(attrs={'type': 'date'}),
        }
