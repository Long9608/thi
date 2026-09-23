"""Use the existing Express JWT/RBAC authority; do not trust client identity fields."""
import json
import os
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from fastapi import Header, HTTPException


def require_permissions(*required):
    def authorize(authorization: str = Header(default='')):
        if not authorization.startswith('Bearer '):
            raise HTTPException(status_code=401, detail='Authentication required')
        endpoint = os.getenv('AUTH_API_URL', 'http://127.0.0.1:5000/api/permissions')
        try:
            with urlopen(Request(endpoint, headers={'Authorization': authorization}), timeout=10) as response:
                user = json.load(response)['data']
        except HTTPError as error:
            raise HTTPException(status_code=401 if error.code == 401 else 503, detail='Authentication failed') from error
        except (URLError, TimeoutError, ValueError, KeyError) as error:
            raise HTTPException(status_code=503, detail='Authentication service unavailable') from error
        permissions = set(user.get('permissions', []))
        # Current AI functions query whole modules. OWN identities cannot use those functions.
        if 'RESIDENT' in user.get('roleCodes', []) or not set(required).issubset(permissions):
            raise HTTPException(status_code=403, detail='Insufficient permissions for global AI data')
        return user
    return authorize
