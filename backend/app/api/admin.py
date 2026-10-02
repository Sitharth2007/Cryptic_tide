"""
Admin API routes — all endpoints perform server-side admin authorization.
Frontend CANNOT access these endpoints without being in the admins table.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from app.auth.dependencies import require_admin
from app.database.client import get_supabase
from datetime import datetime, timezone
import csv
import io
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

ROUND_ID = "round-1"


def utc_now():
    return datetime.now(timezone.utc)


@router.get("/dashboard")
def get_dashboard(admin=Depends(require_admin)):
    """Dashboard stats — realtime counts."""
    supabase = get_supabase()

    teams_result = supabase.table("teams").select("id, rules_acknowledged", count="exact").execute()
    teams = teams_result.data or []
    total = teams_result.count or 0

    acknowledged = sum(1 for t in teams if t.get("rules_acknowledged"))
    not_acknowledged = total - acknowledged

    attempts = supabase.table("attempts").select("status", count="exact").eq("round_id", ROUND_ID).execute()
    attempt_data = attempts.data or []
    in_progress = sum(1 for a in attempt_data if a["status"] == "IN_PROGRESS")
    completed = sum(1 for a in attempt_data if a["status"] == "SUBMITTED")

    return {
        "total_teams": total,
        "rules_acknowledged": acknowledged,
        "rules_not_acknowledged": not_acknowledged,
        "waiting": acknowledged - in_progress - completed,
        "in_progress": in_progress,
        "completed": completed,
    }


@router.get("/teams")
def list_teams(admin=Depends(require_admin)):
    """All registered teams with their attempt status."""
    supabase = get_supabase()

    teams = supabase.table("teams").select("*").execute()
    attempts = supabase.table("attempts").select("*").eq("round_id", ROUND_ID).execute()

    attempt_map = {a["team_id"]: a for a in (attempts.data or [])}

    rows = []
    for team in (teams.data or []):
        atmp = attempt_map.get(team["id"], {})
        rows.append({
            "team_id": team["id"],
            "team_name": team["team_name"],
            "team_lead_name": team["team_lead_name"],
            "team_lead_email": team["team_lead_email"],
            "rules_acknowledged": team.get("rules_acknowledged", False),
            "rules_acknowledged_at": team.get("rules_acknowledged_at"),
            "status": atmp.get("status", "WAITING"),
            "score": atmp.get("score", 0),
            "correct_count": atmp.get("correct_count", 0),
            "wrong_count": atmp.get("wrong_count", 0),
            "skipped_count": atmp.get("skipped_count", 0),
            "completion_time_seconds": atmp.get("completion_time_seconds"),
            "submitted_at": atmp.get("submitted_at"),
        })

    return rows


@router.get("/round-status")
def get_round_status(admin=Depends(require_admin)):
    supabase = get_supabase()
    result = supabase.table("rounds").select("*").eq("id", ROUND_ID).execute()
    return result.data[0] if (result and result.data and len(result.data) > 0) else {}


@router.post("/rounds/start")
def start_round(admin=Depends(require_admin)):
    """
    Start Round 1. Idempotent — repeated calls return error if already started.
    Updates round status to ACTIVE, which triggers Supabase Realtime for participants.
    """
    supabase = get_supabase()
    now = utc_now()

    round_data = supabase.table("rounds").select("status").eq("id", ROUND_ID).execute()
    if not round_data or not round_data.data or len(round_data.data) == 0:
        raise HTTPException(status_code=404, detail="Round not found.")

    current_status = round_data.data[0]["status"]
    if current_status == "ACTIVE":
        raise HTTPException(status_code=409, detail="Round 1 is already active.")
    if current_status == "COMPLETED":
        raise HTTPException(status_code=409, detail="Round 1 has already completed.")

    supabase.table("rounds").update({
        "status": "ACTIVE",
        "started_at": now.isoformat(),
    }).eq("id", ROUND_ID).execute()

    return {"success": True, "started_at": now.isoformat()}


@router.post("/rounds/end")
def end_round(admin=Depends(require_admin)):
    """End Round 1."""
    supabase = get_supabase()
    now = utc_now()

    supabase.table("rounds").update({
        "status": "COMPLETED",
        "ended_at": now.isoformat(),
    }).eq("id", ROUND_ID).execute()

    return {"success": True, "ended_at": now.isoformat()}


@router.get("/leaderboard")
def get_leaderboard(admin=Depends(require_admin)):
    """
    Ranked leaderboard — ORDER BY score DESC, completion_time_seconds ASC.
    This is the EXACT ranking rule as specified.
    """
    supabase = get_supabase()

    attempts = (
        supabase.table("attempts")
        .select("team_id, status, score, correct_count, wrong_count, skipped_count, completion_time_seconds, submitted_at")
        .eq("round_id", ROUND_ID)
        .execute()
    )

    teams = supabase.table("teams").select("id, team_name, team_lead_name").execute()
    team_map = {t["id"]: t for t in (teams.data or [])}

    rows = []
    for a in (attempts.data or []):
        team = team_map.get(a["team_id"], {})
        rows.append({
            "team_id": a["team_id"],
            "team_name": team.get("team_name", "Unknown"),
            "team_lead_name": team.get("team_lead_name", "Unknown"),
            "status": a["status"],
            "score": a.get("score", 0),
            "correct_count": a.get("correct_count", 0),
            "wrong_count": a.get("wrong_count", 0),
            "skipped_count": a.get("skipped_count", 0),
            "completion_time_seconds": a.get("completion_time_seconds"),
            "submitted_at": a.get("submitted_at"),
        })

    # Server-side ranking: score DESC, completion_time ASC
    rows.sort(key=lambda x: (-x["score"], x["completion_time_seconds"] or 999999))

    for i, row in enumerate(rows):
        row["rank"] = i + 1

    return rows


@router.get("/qualified-teams/preview")
def preview_top15(admin=Depends(require_admin)):
    """Preview the Top 15 teams without committing to DB."""
    supabase = get_supabase()
    leaderboard = get_leaderboard(admin)
    return {
        "top_15": leaderboard[:15],
        "total_completed": sum(1 for r in leaderboard if r["status"] == "SUBMITTED"),
    }


@router.post("/qualified-teams/confirm")
def confirm_top15(admin=Depends(require_admin)):
    """
    Stores the Top 15 into qualified_teams table.
    Does NOT modify original attempt data.
    """
    supabase = get_supabase()
    now = utc_now()

    leaderboard = get_leaderboard(admin)
    top15 = [r for r in leaderboard if r["status"] == "SUBMITTED"][:15]

    if not top15:
        raise HTTPException(status_code=400, detail="No completed attempts to qualify.")

    # Clear existing qualification for idempotency
    supabase.table("qualified_teams").delete().eq("round_id", ROUND_ID).execute()

    records = []
    for row in top15:
        records.append({
            "team_id": row["team_id"],
            "round_id": ROUND_ID,
            "qualification_rank": row["rank"],
            "score": row["score"],
            "completion_time_seconds": row.get("completion_time_seconds"),
            "qualified_at": now.isoformat(),
        })

    supabase.table("qualified_teams").insert(records).execute()

    return {"success": True, "qualified": len(records)}


@router.get("/export/results")
def export_results_csv(admin=Depends(require_admin)):
    """Export full leaderboard as CSV."""
    leaderboard = get_leaderboard(admin)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "rank", "team_name", "team_lead_name", "score",
        "correct_count", "wrong_count", "skipped_count",
        "completion_time_seconds", "submitted_at", "status"
    ])
    writer.writeheader()
    for row in leaderboard:
        writer.writerow({k: row.get(k, "") for k in writer.fieldnames})

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cyberhub_results.csv"},
    )


@router.get("/export/top15")
def export_top15_csv(admin=Depends(require_admin)):
    """Export Top 15 as CSV."""
    preview = preview_top15(admin)
    top15 = preview["top_15"]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "rank", "team_name", "team_lead_name", "score",
        "correct_count", "wrong_count", "skipped_count",
        "completion_time_seconds", "submitted_at"
    ])
    writer.writeheader()
    for row in top15:
        writer.writerow({k: row.get(k, "") for k in writer.fieldnames})

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cyberhub_top15.csv"},
    )
