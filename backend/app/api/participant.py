"""
Participant API routes.
All endpoints require authentication + team verification.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_current_team, get_verified_participant
from app.database.client import get_supabase
from app.services import quiz_engine
from app.schemas.models import (
    AcknowledgeRequest, AnswerSubmit, QuestionSafe
)
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/participant", tags=["participant"])

QUESTION_TIME_SECONDS = 10
ROUND_ID = "round-1"


def utc_now():
    return datetime.now(timezone.utc)


@router.get("/team")
def get_my_team(auth=Depends(get_verified_participant)):
    """Returns the authenticated team's info + members."""
    supabase = get_supabase()
    team = auth["team"]

    members = (
        supabase.table("team_members")
        .select("name, email")
        .eq("team_id", team["id"])
        .execute()
    )

    return {
        "team": team,
        "members": members.data or [],
    }


@router.get("/round-status")
def get_round_status(auth=Depends(get_verified_participant)):
    """Returns the current round state (NOT_STARTED / ACTIVE / COMPLETED)."""
    supabase = get_supabase()
    result = (
        supabase.table("rounds")
        .select("id, name, round_number, status, started_at")
        .eq("id", ROUND_ID)
        .execute()
    )
    if not result or not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Round not found.")
    return result.data[0]


@router.post("/rules-acknowledge")
def acknowledge_rules(auth=Depends(get_verified_participant)):
    """Records that the team lead has acknowledged the rules."""
    supabase = get_supabase()
    team_id = auth["team"]["id"]
    now = utc_now()

    supabase.table("teams").update({
        "rules_acknowledged": True,
        "rules_acknowledged_at": now.isoformat(),
    }).eq("id", team_id).execute()

    return {"success": True, "acknowledged_at": now.isoformat()}


@router.get("/attempt")
def get_my_attempt(auth=Depends(get_verified_participant)):
    """Returns the team's current attempt state (used for refresh/resume)."""
    supabase = get_supabase()
    team_id = auth["team"]["id"]

    result = (
        supabase.table("attempts")
        .select("id, status, score, correct_count, wrong_count, skipped_count, started_at, submitted_at, completion_time_seconds")
        .eq("team_id", team_id)
        .eq("round_id", ROUND_ID)
        .execute()
    )

    return (result.data[0] if (result and result.data and len(result.data) > 0) else {"status": "NOT_STARTED"})


@router.post("/start")
def start_quiz(auth=Depends(get_verified_participant)):
    """
    Starts or resumes the participant's quiz attempt.
    Idempotent — safe to call if attempt already exists.
    """
    supabase = get_supabase()
    team = auth["team"]

    # Verify round is ACTIVE
    round_data = supabase.table("rounds").select("status").eq("id", ROUND_ID).execute()
    if not round_data or not round_data.data or round_data.data[0]["status"] != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Round 1 has not started yet. Please wait in the waiting room.",
        )

    attempt = quiz_engine.get_or_create_attempt(team["id"], ROUND_ID)

    if attempt["status"] == "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your team has already completed Round 1.",
        )

    return {"attempt_id": attempt["id"], "status": attempt["status"]}


@router.get("/current-question")
def get_current_question(auth=Depends(get_verified_participant)):
    """
    Returns the current question (no correct_answer) + server deadline.
    If the previous question timed out, auto-records TIMEOUT answer first.
    """
    supabase = get_supabase()
    team_id = auth["team"]["id"]

    attempt = (
        supabase.table("attempts")
        .select("*")
        .eq("team_id", team_id)
        .eq("round_id", ROUND_ID)
        .execute()
    )

    if not attempt or not attempt.data or len(attempt.data) == 0:
        raise HTTPException(status_code=400, detail="Quiz not started.")

    a = attempt.data[0]
    if a["status"] == "SUBMITTED":
        raise HTTPException(status_code=400, detail="Quiz already completed.")

    # Handle timeout for current question in-flight
    now = utc_now()
    if a.get("current_question_deadline") and a.get("current_question_id"):
        dl_raw = a["current_question_deadline"]
        dl = datetime.fromisoformat(dl_raw.replace("Z", "+00:00")) if isinstance(dl_raw, str) else dl_raw
        if now > dl:
            # Auto-record timeout
            existing = (
                supabase.table("answers")
                .select("id")
                .eq("attempt_id", a["id"])
                .eq("question_id", a["current_question_id"])
                .execute()
            )
            if not existing or not existing.data:
                quiz_engine.process_answer(
                    a["id"], a["current_question_id"], "TIMEOUT_AUTO", ROUND_ID
                )
            # Refresh attempt
            attempt = (
                supabase.table("attempts")
                .select("*")
                .eq("id", a["id"])
                .execute()
            )
            a = attempt.data[0] if (attempt and attempt.data) else a

    if a["status"] == "SUBMITTED":
        return {"quiz_complete": True}

    # Get next question
    question = quiz_engine.get_current_question(a["id"], ROUND_ID)
    if not question:
        return {"quiz_complete": True}

    # Set timer if not already set or if it's a new question
    if a.get("current_question_id") != question["id"]:
        deadline = quiz_engine.start_question_timer(a["id"], question["id"])
    else:
        raw_dl = a.get("current_question_deadline")
        deadline = datetime.fromisoformat(raw_dl.replace("Z", "+00:00")) if isinstance(raw_dl, str) else raw_dl

    # Count answers for question number display
    answered_count = (
        supabase.table("answers")
        .select("id", count="exact")
        .eq("attempt_id", a["id"])
        .execute()
    )
    questions_done = answered_count.count or 0

    return {
        "quiz_complete": False,
        "question": {
            "id": question["id"],
            "question_number": question["question_number"],
            "question_displayed_number": questions_done + 1,
            "category": question["category"],
            "question_text": question["question_text"],
            "option_a": question["option_a"],
            "option_b": question["option_b"],
            "option_c": question["option_c"],
            "option_d": question["option_d"],
            "deadline": deadline.isoformat(),
            "total_questions": quiz_engine.TOTAL_QUESTIONS,
        },
    }


@router.post("/answer")
def submit_answer(body: AnswerSubmit, auth=Depends(get_verified_participant)):
    """
    Submit answer for the current question.
    Backend validates timing, correctness, and prevents duplicates.
    """
    supabase = get_supabase()
    team_id = auth["team"]["id"]

    attempt = (
        supabase.table("attempts")
        .select("id, status")
        .eq("team_id", team_id)
        .eq("round_id", ROUND_ID)
        .execute()
    )

    if not attempt or not attempt.data or len(attempt.data) == 0:
        raise HTTPException(status_code=400, detail="Quiz not started.")
    if attempt.data[0]["status"] == "SUBMITTED":
        raise HTTPException(status_code=400, detail="Quiz already completed.")

    result = quiz_engine.process_answer(
        attempt.data[0]["id"],
        body.question_id,
        body.selected_answer,
        ROUND_ID,
    )

    if result.get("already_answered"):
        raise HTTPException(status_code=409, detail="Answer already recorded for this question.")

    # Get next question if not complete
    next_q = None
    if not result["quiz_complete"]:
        next_q_data = quiz_engine.get_current_question(attempt.data[0]["id"], ROUND_ID)
        if next_q_data:
            deadline = quiz_engine.start_question_timer(attempt.data[0]["id"], next_q_data["id"])
            answered_count = (
                supabase.table("answers")
                .select("id", count="exact")
                .eq("attempt_id", attempt.data[0]["id"])
                .execute()
            )
            questions_done = answered_count.count or 0
            next_q = {
                "id": next_q_data["id"],
                "question_number": next_q_data["question_number"],
                "question_displayed_number": questions_done,
                "category": next_q_data["category"],
                "question_text": next_q_data["question_text"],
                "option_a": next_q_data["option_a"],
                "option_b": next_q_data["option_b"],
                "option_c": next_q_data["option_c"],
                "option_d": next_q_data["option_d"],
                "deadline": deadline.isoformat(),
                "total_questions": quiz_engine.TOTAL_QUESTIONS,
            }

    return {
        "result": result["result"],
        "points": result["points"],
        "quiz_complete": result["quiz_complete"],
        "next_question": next_q,
    }


@router.get("/completion")
def get_completion(auth=Depends(get_verified_participant)):
    """Returns completion status without exposing score (admin controls reveal timing)."""
    supabase = get_supabase()
    team_id = auth["team"]["id"]

    attempt = (
        supabase.table("attempts")
        .select("status, submitted_at, correct_count, wrong_count, skipped_count")
        .eq("team_id", team_id)
        .eq("round_id", ROUND_ID)
        .execute()
    )

    if not attempt or not attempt.data or attempt.data[0]["status"] != "SUBMITTED":
        raise HTTPException(status_code=400, detail="Round not completed yet.")

    return {
        "completed": True,
        "submitted_at": attempt.data[0].get("submitted_at"),
        "message": "Round 1 complete. Results will be announced by the organizers.",
    }
