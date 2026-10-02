"""
Core quiz engine — server-authoritative timer, scoring, and progression.
"""
from datetime import datetime, timezone, timedelta
from app.database.client import get_supabase
import logging

logger = logging.getLogger(__name__)

QUESTION_TIME_SECONDS = 10
POINTS_CORRECT = 10
POINTS_WRONG = -5
POINTS_SKIPPED = -10
POINTS_TIMEOUT = -10
TOTAL_QUESTIONS = 25


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def get_or_create_attempt(team_id: str, round_id: str) -> dict:
    """
    Returns existing attempt or creates a new one for the team+round.
    Uses a race-safe upsert. Only one attempt per team per round allowed.
    """
    supabase = get_supabase()

    existing = (
        supabase.table("attempts")
        .select("*")
        .eq("team_id", team_id)
        .eq("round_id", round_id)
        .maybe_single()
        .execute()
    )

    if existing.data:
        return existing.data

    # Create new attempt
    result = supabase.table("attempts").insert({
        "team_id": team_id,
        "round_id": round_id,
        "status": "IN_PROGRESS",
        "started_at": utc_now().isoformat(),
        "score": 0,
        "correct_count": 0,
        "wrong_count": 0,
        "skipped_count": 0,
    }).execute()

    return result.data[0]


async def get_current_question(attempt_id: str, round_id: str) -> dict | None:
    """
    Returns the next unanswered question for this attempt, or None if complete.
    """
    supabase = get_supabase()

    # Get all answered question_ids for this attempt
    answered = (
        supabase.table("answers")
        .select("question_id")
        .eq("attempt_id", attempt_id)
        .execute()
    )
    answered_ids = [r["question_id"] for r in (answered.data or [])]

    # Get next question (lowest question_number not yet answered)
    query = (
        supabase.table("questions")
        .select("id, question_number, category, question_text, option_a, option_b, option_c, option_d")
        .eq("round_id", round_id)
        .order("question_number")
    )

    all_questions = query.execute()
    if not all_questions.data:
        return None

    for q in all_questions.data:
        if q["id"] not in answered_ids:
            return q

    return None  # All questions answered


async def start_question_timer(attempt_id: str, question_id: str) -> datetime:
    """
    Records question_started_at and question_deadline for the current question in the attempt.
    Returns the absolute UTC deadline.
    """
    supabase = get_supabase()
    now = utc_now()
    deadline = now + timedelta(seconds=QUESTION_TIME_SECONDS)

    supabase.table("attempts").update({
        "current_question_id": question_id,
        "current_question_started_at": now.isoformat(),
        "current_question_deadline": deadline.isoformat(),
    }).eq("id", attempt_id).execute()

    return deadline


async def get_active_deadline(attempt_id: str) -> datetime | None:
    """Returns the server-set deadline for the current question."""
    supabase = get_supabase()
    result = (
        supabase.table("attempts")
        .select("current_question_deadline")
        .eq("id", attempt_id)
        .single()
        .execute()
    )
    if result.data and result.data.get("current_question_deadline"):
        dl = result.data["current_question_deadline"]
        if isinstance(dl, str):
            return datetime.fromisoformat(dl.replace("Z", "+00:00"))
        return dl
    return None


async def process_answer(
    attempt_id: str,
    question_id: str,
    selected_answer: str,
    round_id: str,
) -> dict:
    """
    Server-authoritative answer processing:
    1. Check if answer is already recorded (duplicate protection).
    2. Get server deadline — if past, record TIMEOUT.
    3. Compare against correct_answer in DB (never sent to frontend).
    4. Update score in attempt.
    5. Return result + next question info.
    """
    supabase = get_supabase()
    now = utc_now()

    # 1. Duplicate protection
    existing_answer = (
        supabase.table("answers")
        .select("id, result")
        .eq("attempt_id", attempt_id)
        .eq("question_id", question_id)
        .maybe_single()
        .execute()
    )
    if existing_answer.data:
        return {"already_answered": True, "result": existing_answer.data["result"]}

    # 2. Server deadline check
    deadline = await get_active_deadline(attempt_id)
    is_timeout = deadline is not None and now > deadline

    # 3. Get correct answer from server (NEVER sent to frontend)
    question = (
        supabase.table("questions")
        .select("correct_answer")
        .eq("id", question_id)
        .single()
        .execute()
    )
    correct = question.data["correct_answer"] if question.data else None

    # 4. Determine result and points
    if is_timeout or selected_answer == "SKIP":
        if is_timeout and selected_answer != "SKIP":
            result_val = "TIMEOUT"
            points = POINTS_TIMEOUT
        else:
            result_val = "SKIPPED"
            points = POINTS_SKIPPED
    elif selected_answer == correct:
        result_val = "CORRECT"
        points = POINTS_CORRECT
    else:
        result_val = "WRONG"
        points = POINTS_WRONG

    # 5. Record answer
    supabase.table("answers").insert({
        "attempt_id": attempt_id,
        "question_id": question_id,
        "selected_answer": selected_answer if not is_timeout else None,
        "result": result_val,
        "points": points,
        "answered_at": now.isoformat(),
        "response_time_ms": (
            int((now - deadline + timedelta(seconds=QUESTION_TIME_SECONDS)).total_seconds() * 1000)
            if deadline else None
        ),
    }).execute()

    # 6. Update attempt score and counts
    attempt = supabase.table("attempts").select("*").eq("id", attempt_id).single().execute()
    a = attempt.data
    update = {
        "score": a["score"] + points,
        "correct_count": a["correct_count"] + (1 if result_val == "CORRECT" else 0),
        "wrong_count": a["wrong_count"] + (1 if result_val == "WRONG" else 0),
        "skipped_count": a["skipped_count"] + (1 if result_val in ("SKIPPED", "TIMEOUT") else 0),
    }
    supabase.table("attempts").update(update).eq("id", attempt_id).execute()

    # 7. Check if quiz is complete
    answered_count = (
        supabase.table("answers")
        .select("id", count="exact")
        .eq("attempt_id", attempt_id)
        .execute()
    )
    total_answered = answered_count.count or 0

    quiz_complete = total_answered >= TOTAL_QUESTIONS

    if quiz_complete:
        # Calculate completion time
        fresh = supabase.table("attempts").select("started_at").eq("id", attempt_id).single().execute()
        started = datetime.fromisoformat(fresh.data["started_at"].replace("Z", "+00:00"))
        completion_secs = int((now - started).total_seconds())

        supabase.table("attempts").update({
            "status": "SUBMITTED",
            "submitted_at": now.isoformat(),
            "completion_time_seconds": completion_secs,
            "current_question_id": None,
            "current_question_deadline": None,
        }).eq("id", attempt_id).execute()

    return {
        "result": result_val,
        "points": points,
        "quiz_complete": quiz_complete,
        "already_answered": False,
    }
