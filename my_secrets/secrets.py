import os
from pathlib import Path

# Resolve base workspace directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Dictionary to hold the dynamically parsed secrets
_secrets = {}

# Dynamic loader for .env dynamic settings
def load_secrets():
    env_path = BASE_DIR / '.env'
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    if '=' in line:
                        k, v = line.split('=', 1)
                        _secrets[k.strip()] = v.strip()
    
    # Apply standard environment fallback values for missing credentials
    if 'SECRET_KEY' not in _secrets:
        _secrets['SECRET_KEY'] = 'django-insecure-fallback-development-key'
    if 'DB_NAME' not in _secrets:
        _secrets['DB_NAME'] = 'forge_db'
    if 'DB_USER' not in _secrets:
        _secrets['DB_USER'] = 'postgres'
    if 'DB_PASSWORD' not in _secrets:
        _secrets['DB_PASSWORD'] = 'admin123'
    if 'DB_HOST' not in _secrets:
        _secrets['DB_HOST'] = 'localhost'
    if 'DB_PORT' not in _secrets:
        _secrets['DB_PORT'] = '5432'

# Trigger dynamic loading on boot
load_secrets()

def get_secret(key):
    """
    Retrieve value from loaded secrets with process environment overrides.
    """
    return os.environ.get(key, _secrets.get(key))
