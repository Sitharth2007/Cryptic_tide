"""
Auth and /api/me routes.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from app.auth.dependencies import get_current_user
from app.database.client import get_supabase

router = APIRouter(prefix="/api", tags=["auth"])


@router.get("/me")
async def get_me(auth=Depends(get_current_user)):
    """
    Returns the server-derived role based on:
    1. admins table → ADMIN
    2. teams table (team lead) → PARTICIPANT
    3. Otherwise → UNREGISTERED

    The frontend must NEVER derive role from email or localStorage.
    """
    supabase = get_supabase()
    user = auth["user"]
    email = user.email

    # Server-side admin check
    admin_check = (
        supabase.table("admins")
        .select("role")
        .eq("user_id", str(user.id))
        .eq("role", "ADMIN")
        .maybe_single()
        .execute()
    )
    if admin_check.data:
        return {
            "user_id": str(user.id),
            "email": email,
            "role": "ADMIN",
        }

    # Participant check
    team_check = (
        supabase.table("teams")
        .select("id, team_name, registration_status")
        .eq("team_lead_email", email)
        .maybe_single()
        .execute()
    )
    if team_check.data:
        return {
            "user_id": str(user.id),
            "email": email,
            "role": "PARTICIPANT",
            "team_id": team_check.data["id"],
            "team_name": team_check.data["team_name"],
        }

    return {
        "user_id": str(user.id),
        "email": email,
        "role": "UNREGISTERED",
    }
