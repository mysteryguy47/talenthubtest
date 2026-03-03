"""
Pydantic schemas for the Reward System API.
Strict types — zero `Any`.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict
from datetime import datetime, date


# ─── Shared helpers ──────────────────────────────────────────────────────────

class _TimestampMixin(BaseModel):
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════════
# BADGE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class BadgeDefinitionOut(_TimestampMixin):
    id: int
    badge_key: str
    name: str
    description: str
    tier: str
    category: str
    icon_emoji: Optional[str] = None
    evaluation_rule: Dict[str, object] = {}
    is_active: bool = True
    is_secret: bool = False
    display_order: int = 0


class StudentBadgeAwardOut(_TimestampMixin):
    id: int
    student_id: int
    badge: BadgeDefinitionOut
    awarded_at: datetime
    awarded_by: str
    award_reason: Optional[str] = None
    is_active: bool = True


class BadgeStatusOut(BaseModel):
    """Badge with earned/locked status for the current user."""
    badge: BadgeDefinitionOut
    is_earned: bool = False
    awarded_at: Optional[datetime] = None


class StudentBadgesResponse(BaseModel):
    earned: List[StudentBadgeAwardOut] = []
    locked: List[BadgeDefinitionOut] = []


# ═══════════════════════════════════════════════════════════════════════════════
# REWARD EVENT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class RewardEventOut(_TimestampMixin):
    id: int
    student_id: int
    event_type: str
    source_tool: str
    rule_key: Optional[str] = None
    points_delta: int
    event_metadata: Dict[str, object] = {}
    event_timestamp: datetime
    is_voided: bool = False
    void_reason: Optional[str] = None


class PointsHistoryResponse(BaseModel):
    events: List[RewardEventOut] = []
    total: int = 0
    page: int = 1
    limit: int = 20


# ═══════════════════════════════════════════════════════════════════════════════
# REWARD SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

class RewardsSummaryOut(BaseModel):
    total_points: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    badges_earned_count: int = 0
    monthly_points: int = 0
    global_rank: int = 0
    branch_rank: Optional[int] = None
    last_streak_date: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# STREAK SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class NextMilestoneOut(BaseModel):
    days: int
    bonus_points: int
    badge_name: str


class StreakResponse(BaseModel):
    current_streak: int = 0
    longest_streak: int = 0
    last_streak_date: Optional[str] = None
    next_milestone: Optional[NextMilestoneOut] = None
    days_to_next_milestone: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# WEEKLY SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

class WeeklySummaryOut(BaseModel):
    week_start: str
    week_end: str
    points_this_week: int = 0
    questions_attempted: int = 0
    questions_correct: int = 0
    accuracy_pct: float = 0.0
    streak_days_this_week: int = 0
    badges_earned_this_week: List[BadgeDefinitionOut] = []
    vs_last_week: Dict[str, float] = {}


# ═══════════════════════════════════════════════════════════════════════════════
# LEADERBOARD SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class LeaderboardEntryOut(BaseModel):
    rank: int
    student_id: int
    student_name: str
    branch_name: str = ""
    monthly_points: int = 0
    badges_count: int = 0
    is_current_user: bool = False
    rank_change: Optional[int] = None


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntryOut] = []
    my_entry: Optional[LeaderboardEntryOut] = None
    scope: str = "global"
    month: int = 0
    year: int = 0


class MonthlySnapshotOut(_TimestampMixin):
    id: int
    snapshot_month: int
    snapshot_year: int
    monthly_points: int
    global_rank: int
    branch_rank: Optional[int] = None
    snapshotted_at: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class AdminPointsAdjustmentIn(BaseModel):
    adjustment: int
    reason: str = Field(..., min_length=10)


class AdminBadgeGrantIn(BaseModel):
    badge_id: int
    reason: str = Field(..., min_length=10)


class AdminBadgeRevokeIn(BaseModel):
    reason: str = Field(..., min_length=10)


class AdminVoidEventIn(BaseModel):
    reason: str = Field(..., min_length=10)


class AdminSimulateMonthEndIn(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)
    dry_run: bool = True


class AdminCacheRebuildOut(BaseModel):
    old_total: int
    new_total: int
    events_processed: int


class AdminBadgeCreateIn(BaseModel):
    badge_key: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5)
    tier: str
    category: str
    icon_emoji: Optional[str] = None
    evaluation_rule: Dict[str, object] = {}
    is_secret: bool = False
    display_order: int = 0

    @field_validator("tier")
    @classmethod
    def validate_tier(cls, v: str) -> str:
        allowed = {"bronze", "silver", "gold", "platinum", "special"}
        if v not in allowed:
            raise ValueError(f"tier must be one of {allowed}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = {"practice", "streak", "attendance", "special"}
        if v not in allowed:
            raise ValueError(f"category must be one of {allowed}")
        return v


class AdminBadgeUpdateIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tier: Optional[str] = None
    category: Optional[str] = None
    icon_emoji: Optional[str] = None
    evaluation_rule: Optional[Dict[str, object]] = None
    is_active: Optional[bool] = None
    is_secret: Optional[bool] = None
    display_order: Optional[int] = None

    @field_validator("tier")
    @classmethod
    def validate_tier(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"bronze", "silver", "gold", "platinum", "special"}
            if v not in allowed:
                raise ValueError(f"tier must be one of {allowed}")
        return v


class AuditLogEntryOut(_TimestampMixin):
    id: int
    admin_id: int
    action: str
    target_student_id: Optional[int] = None
    target_entity_type: Optional[str] = None
    target_entity_id: Optional[int] = None
    old_values: Optional[Dict[str, object]] = None
    new_values: Optional[Dict[str, object]] = None
    reason: str
    performed_at: datetime


class SimulationResultEntry(BaseModel):
    student_id: int
    student_name: str
    branch: str = ""
    monthly_points: int
    global_rank: int
    branch_rank: Optional[int] = None
    bonus_points: int = 0


class SimulationResponse(BaseModel):
    dry_run: bool
    month: int
    year: int
    entries: List[SimulationResultEntry] = []
    top3_bonuses: Dict[str, int] = {}
