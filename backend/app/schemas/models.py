"""
Pydantic schemas for API requests and responses.
NOTE: correct_answer is NEVER included in participant-facing response schemas.
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────────────────────────

class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    token: str


# ─── Participant ──────────────────────────────────────────────────────────────

class TeamResponse(BaseModel):
    id: str
    team_name: str
    team_lead_name: str
    team_lead_email: str
    registration_status: str
    members: list = []


class RoundStatusResponse(BaseModel):
    id: str
    name: str
    round_number: int
    status: Literal["NOT_STARTED", "ACTIVE", "COMPLETED"]


class AcknowledgeRequest(BaseModel):
    pass  # No body needed; identity comes from JWT


class AttemptResponse(BaseModel):
    id: str
    status: Literal["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"]
    score: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    started_at: Optional[datetime]
    submitted_at: Optional[datetime]
    completion_time_seconds: Optional[int]


# ─── Question (SAFE — no correct_answer) ─────────────────────────────────────

class QuestionSafe(BaseModel):
    """Sent to participants — does NOT include correct_answer."""
    id: str
    question_number: int
    category: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    deadline: datetime   # Server-set absolute UTC deadline
    total_questions: int = 25


class AnswerSubmit(BaseModel):
    question_id: str
    selected_answer: Literal["A", "B", "C", "D", "SKIP"]

    @field_validator("selected_answer")
    @classmethod
    def validate_answer(cls, v):
        if v not in ("A", "B", "C", "D", "SKIP"):
            raise ValueError("selected_answer must be A, B, C, D, or SKIP")
        return v


class AnswerResponse(BaseModel):
    result: Literal["CORRECT", "WRONG", "SKIPPED", "TIMEOUT"]
    points: int
    next_question: Optional[QuestionSafe] = None
    quiz_complete: bool = False


# ─── Admin ────────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_teams: int
    rules_acknowledged: int
    rules_not_acknowledged: int
    waiting: int
    in_progress: int
    completed: int


class TeamAttemptRow(BaseModel):
    team_id: str
    team_name: str
    team_lead_name: str
    status: str
    score: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    completion_time_seconds: Optional[int]
    submitted_at: Optional[datetime]
    rules_acknowledged: bool


class LeaderboardRow(BaseModel):
    rank: int
    team_id: str
    team_name: str
    team_lead_name: str
    score: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    completion_time_seconds: Optional[int]
    submitted_at: Optional[datetime]
    status: str


class StartRoundRequest(BaseModel):
    round_id: str = "round-1"


class ConfirmQualificationRequest(BaseModel):
    round_id: str = "round-1"
