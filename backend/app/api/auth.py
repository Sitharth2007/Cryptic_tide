"""
Custom Auth API routes — Login, Logout, Me
Unified authentication for Teams and Admins using bcrypt + JWT.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.auth.dependencies import (
    get_current_team,
    get_current_user_or_admin,
    require_admin,
    verify_password,
    create_access_token,
    create_admin_token,
)
from app.database.client import get_supabase
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["auth"])


# ─── Request Schemas ──────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class AdminLoginRequest(BaseModel):
    email: str
    password: str


# ─── Unified Login (Admins & Teams) ───────────────────────────────────────────

@router.post("/auth/login")
def login(body: LoginRequest):
    """
    Unified login endpoint for both Admins and Participant Teams.
    - If email exists in admin_accounts, authenticates as ADMIN.
    - If email exists in teams, authenticates as PARTICIPANT.
    - Validates bcrypt hash and enforces single-device session.
    """
    supabase = get_supabase()
    email = body.email.strip().lower()

    # 1. Check if email is an Admin
    admin_result = (
        supabase.table("admin_accounts")
        .select("id, email, name, password_hash, role, is_active")
        .eq("email", email)
        .execute()
    )

    if admin_result and admin_result.data and len(admin_result.data) > 0:
        admin = admin_result.data[0]

        if not admin.get("is_active"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This admin account has been deactivated.",
            )

        if not verify_password(body.password, admin["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        # Generate new session
        session_id = str(uuid.uuid4())
        supabase.table("admin_accounts").update({
            "current_session_id": session_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", admin["id"]).execute()

        token = create_admin_token(
            admin_id=admin["id"],
            email=admin["email"],
            role=admin["role"],
            session_id=session_id,
        )

        logger.info(f"Admin {email} ({admin['role']}) logged in.")
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": admin["role"],
            "admin": {
                "admin_id": admin["id"],
                "email": admin["email"],
                "name": admin["name"],
                "role": admin["role"],
            },
        }

    # 2. Check if email is a Team Lead
    team_result = (
        supabase.table("teams")
        .select("id, team_number, team_name, team_lead_name, team_lead_email, password_hash, registration_status, is_active")
        .eq("team_lead_email", email)
        .execute()
    )

    if team_result and team_result.data and len(team_result.data) > 0:
        team = team_result.data[0]

        if not team.get("is_active"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This team account has been deactivated.",
            )

        if not team.get("password_hash"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Team account not fully set up. Contact the event organizers.",
            )

        if not verify_password(body.password, team["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        # Generate new session (single-device enforcement)
        session_id = str(uuid.uuid4())
        supabase.table("teams").update({
            "current_session_id": session_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", team["id"]).execute()

        token = create_access_token(
            team_id=team["id"],
            team_number=team["team_number"],
            email=team["team_lead_email"],
            session_id=session_id,
        )

        logger.info(f"Team {team['team_number']} ({email}) logged in.")
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": "PARTICIPANT",
            "team": {
                "team_id": team["id"],
                "team_number": team["team_number"],
                "team_name": team["team_name"],
                "team_lead_name": team["team_lead_name"],
                "email": team["team_lead_email"],
            },
        }

    # If neither
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
    )


# ─── Logout ───────────────────────────────────────────────────────────────────

@router.post("/auth/logout")
def logout(auth: dict = Depends(get_current_user_or_admin)):
    """
    Invalidates the current session for either Admin or Team.
    """
    supabase = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()

    if auth.get("is_admin"):
        admin = auth["admin"]
        supabase.table("admin_accounts").update({
            "current_session_id": None,
            "updated_at": now_iso,
        }).eq("id", admin["id"]).execute()
        logger.info(f"Admin {admin.get('email')} logged out.")
    else:
        team = auth["team"]
        supabase.table("teams").update({
            "current_session_id": None,
            "updated_at": now_iso,
        }).eq("id", team["id"]).execute()
        logger.info(f"Team {team.get('team_number')} logged out.")

    return {"success": True, "message": "Logged out successfully."}


# ─── Me ───────────────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(auth: dict = Depends(get_current_user_or_admin)):
    """
    Returns the authenticated user's role and info.
    Server-authoritative for both Admins and Participants.
    """
    if auth.get("is_admin"):
        admin = auth["admin"]
        return {
            "user_id": admin["id"],
            "email": admin["email"],
            "name": admin["name"],
            "role": admin["role"],
        }
    else:
        team = auth["team"]
        return {
            "user_id": team["id"],
            "email": team["team_lead_email"],
            "role": "PARTICIPANT",
            "team_id": team["id"],
            "team_name": team["team_name"],
            "team_number": team["team_number"],
        }


# ─── Explicit Admin Login ─────────────────────────────────────────────────────

@router.post("/auth/admin/login")
def admin_login(body: AdminLoginRequest):
    """Explicit admin login route."""
    return login(LoginRequest(email=body.email, password=body.password))


@router.post("/auth/admin/logout")
def admin_logout(admin_auth: dict = Depends(require_admin)):
    """Explicit admin logout route."""
    supabase = get_supabase()
    admin = admin_auth["admin"]
    supabase.table("admin_accounts").update({
        "current_session_id": None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", admin["id"]).execute()
    return {"success": True}
