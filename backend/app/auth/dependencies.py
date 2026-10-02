"""
Auth dependencies.

All role decisions are made by querying the server-side `admins` table.
The frontend CANNOT promote itself to admin by any means.
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database.client import get_supabase
import logging

logger = logging.getLogger(__name__)
bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    """
    Verify Supabase JWT via the Supabase `auth.getUser()` call.
    Returns the authenticated user dict or raises 401.
    """
    token = None
    # Accept token from Authorization header OR from sb-access-token cookie
    if credentials:
        token = credentials.credentials
    else:
        token = request.cookies.get("sb-access-token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
        )

    supabase = get_supabase()
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session.",
            )
        return {"user": response.user, "token": token}
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )


async def get_verified_participant(auth=Depends(get_current_user)):
    """
    Ensures the authenticated user is a registered participant (team lead).
    """
    supabase = get_supabase()
    user = auth["user"]
    email = user.email

    # Check teams table
    result = (
        supabase.table("teams")
        .select("id, team_name, team_lead_name, team_lead_email, registration_status")
        .eq("team_lead_email", email)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email is not registered as a team lead for this event.",
        )

    return {"user": user, "team": result.data, "token": auth["token"]}


async def require_admin(auth=Depends(get_current_user)):
    """
    Server-side admin check via the `admins` table.
    The frontend CANNOT grant admin access. This check is always server-authoritative.
    """
    supabase = get_supabase()
    user = auth["user"]

    result = (
        supabase.table("admins")
        .select("id, role")
        .eq("user_id", str(user.id))
        .eq("role", "ADMIN")
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You are not an authorized administrator.",
        )

    return {"user": user, "admin": result.data, "token": auth["token"]}
