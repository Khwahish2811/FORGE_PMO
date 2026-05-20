from ldap3 import Server, Connection, ALL, SIMPLE
import logging
from django.conf import settings
from django.contrib.auth.models import User
from core.models import Profile

logger = logging.getLogger(__name__)

class LDAPBackend:
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None

        # 1. Mock Authentication check for local development
        mock_auth = getattr(settings, 'LDAP_MOCK_AUTHENTICATION', False)
        if mock_auth:
            # Simulate LDAP auth: we accept password "company123" or standard credentials
            # This enables demonstrating company LDAP auth without a real LDAP server.
            is_mock_valid = (password == "company123" or password == "ldap123")
            if is_mock_valid:
                logger.info(f"[LDAP Mock] Authentication succeeded for username: {username}")
                try:
                    user, created = User.objects.get_or_create(username=username)
                    if created:
                        user.set_unusable_password()
                        user.is_active = True
                        user.save()
                        # Deduce role from username suffix
                        role = 'TM'
                        if '_pm' in username:
                            role = 'PM'
                        elif '_pgm' in username:
                            role = 'PGM'
                        elif '_spoc' in username:
                            role = 'SPOC'
                        
                        Profile.objects.create(user=user, role=role)
                        logger.info(f"[LDAP Mock] Created new LDAP user: {username} with role {role}")
                    return user
                except Exception as e:
                    logger.error(f"[LDAP Mock] Error creating/fetching user {username}: {e}")
                    return None

        # 2. Real LDAP Authentication check using ldap3
        ldap_server = getattr(settings, 'LDAP_SERVER_URI', None)
        ldap_dn_template = getattr(settings, 'LDAP_USER_DN_TEMPLATE', None)

        if not ldap_server or not ldap_dn_template:
            logger.debug("LDAP backend skipped: server URI or DN template not configured.")
            return None

        user_dn = ldap_dn_template.format(username=username)
        try:
            # Establish connection to the LDAP server
            server = Server(ldap_server, get_info=ALL)
            conn = Connection(server, user=user_dn, password=password, authentication=SIMPLE)
            
            logger.info(f"Attempting LDAP bind for: {user_dn}")
            if conn.bind():
                logger.info(f"LDAP bind succeeded for user: {username}")
                
                # Fetch or create the Django User
                user, created = User.objects.get_or_create(username=username)
                if created:
                    user.set_unusable_password()
                    user.is_active = True
                    user.save()
                    
                    # Deduce role
                    role = 'TM'
                    if '_pm' in username:
                        role = 'PM'
                    elif '_pgm' in username:
                        role = 'PGM'
                    elif '_spoc' in username:
                        role = 'SPOC'
                    
                    Profile.objects.create(user=user, role=role)
                    logger.info(f"Created new database record for LDAP authenticated user: {username}")
                return user
            else:
                logger.warning(f"LDAP bind failed for user: {username} (Invalid credentials)")
        except Exception as e:
            logger.error(f"LDAP connection error during auth for {username}: {e}")
            
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
