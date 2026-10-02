"""
Custom JWT Authentication — replaces Supabase Auth email/OTP flow.
Teams and Admins authenticate via email + bcrypt password.
JWT contains identity and session_id for single-device enforcement.
"""
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.database.client import get_supabase

bearer = HTTPBearer(auto_error=False)


# ─── Password Utilities ───────────────────────────────────────────────────────

def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify plain password against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt with 12 rounds."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


# ─── JWT Utilities ────────────────────────────────────────────────────────────

def create_access_token(team_id: str, team_number: int, email: str, session_id: str) -> str:
    """
    Create a signed JWT token containing team identity and session_id.
    session_id is stored server-side; every request validates JWT.session_id == DB.current_session_id.
    """
    expiry = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    payload = {
        "sub": email,
        "team_id": team_id,
        "team_number": team_number,
        "email": email,
        "role": "PARTICIPANT",
        "session_id": session_id,
        "exp": expiry,
        "iat": datetime.now(timezone.utc),
        "type": "team_access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_admin_token(admin_id: str, email: str, role: str, session_id: str) -> str:
    """Create a signed JWT token for an admin."""
    expiry = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    payload = {
        "sub": email,
        "admin_id": admin_id,
        "email": email,
        "role": role,
        "session_id": session_id,
        "exp": expiry,
        "iat": datetime.now(timezone.utc),
        "type": "admin_access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT. Raises HTTPException on invalid/expired token."""
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again.",
        )


# ─── Auth Dependencies ────────────────────────────────────────────────────────

def get_current_team(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    """
    FastAPI dependency: validates JWT + session_id against DB.
    Enforces single-device login (JWT session_id must match DB current_session_id).
    Returns team dict from DB.
    """
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    payload = decode_token(credentials.credentials)
    if payload.get("type") != "team_access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    team_id = payload.get("team_id")
    session_id = payload.get("session_id")

    if not team_id or not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token.")

    supabase = get_supabase()
    result = (
        supabase.table("teams")
        .select("id, team_number, team_name, team_lead_name, team_lead_email, registration_status, is_active, current_session_id, rules_acknowledged")
        .eq("id", team_id)
        .execute()
    )

    if not result or not result.data or len(result.data) == 0:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Team account not found.")

    team = result.data[0]

    if not team.get("is_active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your team account has been deactivated.")

    # Single-device enforcement: session_id in JWT must match DB
    if team.get("current_session_id") != session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalidated. Another device may have logged in. Please log in again.",
        )

    return {"team": team, "payload": payload}


def get_verified_participant(auth: dict = Depends(get_current_team)) -> dict:
    """Ensures team is a valid participant (registered, active)."""
    team = auth["team"]
    if team.get("registration_status") == "DISQUALIFIED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your team has been disqualified.")
    return auth


def require_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    """
    Admin authentication: validates admin JWT against admin_accounts table.
    Accepts ADMIN or SUPER_ADMIN.
    """
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired admin session.")

    if payload.get("type") != "admin_access":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Admin credentials required.")

    admin_id = payload.get("admin_id")
    session_id = payload.get("session_id")

    supabase = get_supabase()
    result = (
        supabase.table("admin_accounts")
        .select("id, email, name, role, is_active, current_session_id")
        .eq("id", admin_id)
        .execute()
    )

    if not result or not result.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin account not found.")

    admin = result.data[0]
    if not admin.get("is_active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin account deactivated.")

    if admin.get("current_session_id") != session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session invalidated. Please log in again.")

    return {"admin": admin, "payload": payload}


def get_current_user_or_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    """
    Resolves the authenticated user regardless of whether they are an Admin or a Team Participant.
    Used for /api/me and general profile resolution.
    """
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    payload = decode_token(credentials.credentials)
    token_type = payload.get("type")
    session_id = payload.get("session_id")
    supabase = get_supabase()

    if token_type == "admin_access":
        admin_id = payload.get("admin_id")
        result = (
            supabase.table("admin_accounts")
            .select("id, email, name, role, is_active, current_session_id")
            .eq("id", admin_id)
            .execute()
        )
        if not result or not result.data:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account not found.")
        admin = result.data[0]
        if not admin.get("is_active"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin account deactivated.")
        if admin.get("current_session_id") != session_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session invalidated. Please log in again.")
        return {"role": admin["role"], "admin": admin, "is_admin": True, "payload": payload}

    elif token_type == "team_access":
        team_id = payload.get("team_id")
        result = (
            supabase.table("teams")
            .select("id, team_number, team_name, team_lead_name, team_lead_email, registration_status, is_active, current_session_id, rules_acknowledged")
            .eq("id", team_id)
            .execute()
        )
        if not result or not result.data:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Team account not found.")
        team = result.data[0]
        if not team.get("is_active"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your team account has been deactivated.")
        if team.get("current_session_id") != session_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session invalidated. Another device logged in.")
        return {"role": "PARTICIPANT", "team": team, "is_admin": False, "payload": payload}

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")
