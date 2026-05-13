from django import forms
from core.models import Project

class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = ['name', 'description', 'start_date', 'status']
        widgets = {
            'start_date': forms.DateInput(attrs={'type': 'date'}),
        }