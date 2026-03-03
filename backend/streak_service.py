"""
Streak Service — daily streak tracking and milestone detection.

Streak increments once per calendar day (IST) when a student completes
≥15 qualifying questions.  Qualifying questions include:
  • Mental Math/Burst Mode: rows in `attempts` table
        (session.difficulty_mode != 'custom')
  • Practice Paper: all submitted questions
        (paper_attempts.correct_answers + paper_attempts.wrong_answers)

Streak milestones (3, 7, 14, 30, 60, 100 days) award bonus points and
may unlock badges via the BadgeEvaluator.
"""

import logging
from datetime import datetime, time, timedelta
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func, update as sa_update

from models import User, Attempt, PracticeSession, PaperAttempt
from timezone_utils import (
    get_ist_now,
    IST_TIMEZONE,
    ist_to_utc,
)

logger = logging.getLogger(__name__)

STREAK_THRESHOLD = 15  # Minimum qualifying questions per day

STREAK_MILESTONES = frozenset({3, 7, 14, 30, 60, 100})

_MILESTONE_RULE_MAP = {
    3:   "streak_3_day",
    7:   "streak_7_day",
    14:  "streak_14_day",
    30:  "streak_30_day",
    60:  "streak_60_day",
    100: "streak_100_day",
}


def _ist_day_boundaries(ist_date=None) -> Tuple[datetime, datetime]:
    """
    Return (utc_start, utc_end) for a given calendar day in IST.
    Both are timezone-aware UTC datetimes.
    """
    if ist_date is None:
        ist_date = get_ist_now().date()
    ist_start = datetime.combine(ist_date, time.min).replace(tzinfo=IST_TIMEZONE)
    ist_end = datetime.combine(ist_date + timedelta(days=1), time.min).replace(tzinfo=IST_TIMEZONE)
    return ist_to_utc(ist_start), ist_to_utc(ist_end)


class StreakService:
    """Manages daily streak logic."""

    def count_qualifying_today(self, db: Session, student_id: int) -> int:
        """
        Count qualifying questions attempted today (IST).
        Combines Mental Math / Burst Mode individual attempts + Practice Paper aggregate counts.
        """
        utc_start, utc_end = _ist_day_boundaries()

        # Mental Math + Burst Mode: individual rows in `attempts` table,
        # where session.difficulty_mode != 'custom'.
        mental_burst_count = (
            db.query(func.count(Attempt.id))
            .join(PracticeSession, Attempt.session_id == PracticeSession.id)
            .filter(
                PracticeSession.user_id == student_id,
                PracticeSession.difficulty_mode != "custom",
                Attempt.created_at >= utc_start,
                Attempt.created_at < utc_end,
            )
            .scalar()
        ) or 0

        # Practice Paper: aggregate (correct_answers + wrong_answers)
        paper_counts = (
            db.query(
                func.coalesce(
                    func.sum(PaperAttempt.correct_answers + PaperAttempt.wrong_answers),
                    0,
                )
            )
            .filter(
                PaperAttempt.user_id == student_id,
                PaperAttempt.completed_at.isnot(None),
                PaperAttempt.completed_at >= utc_start,
                PaperAttempt.completed_at < utc_end,
            )
            .scalar()
        ) or 0

        return mental_burst_count + paper_counts

    def check_and_update(self, db: Session, student_id: int) -> bool:
        """
        Check if the student has crossed the daily threshold and update streak.

        Called after every qualifying correct answer.

        Returns True if streak was just incremented on this call.
        """
        user = db.query(User).filter(User.id == student_id).first()
        if not user:
            return False

        today_ist = get_ist_now().date()

        # If already incremented today, skip
        if user.last_practice_date is not None:
            last_date = user.last_practice_date
            if hasattr(last_date, "date"):
                last_date = last_date.date()
            if last_date == today_ist:
                return False

        # Count qualifying questions today
        count = self.count_qualifying_today(db, student_id)
        if count < STREAK_THRESHOLD:
            return False

        # Determine if streak should continue or reset
        yesterday = today_ist - timedelta(days=1)
        last_date = user.last_practice_date
        if last_date is not None:
            if hasattr(last_date, "date"):
                last_date = last_date.date()

        if last_date == yesterday:
            # Consecutive day → increment
            new_streak = user.current_streak + 1
        elif last_date == today_ist:
            # Already counted — shouldn't reach here but safety
            return False
        else:
            # Gap → restart from 1
            new_streak = 1

        new_longest = max(user.longest_streak, new_streak)

        db.execute(
            sa_update(User)
            .where(User.id == student_id)
            .values(
                current_streak=new_streak,
                longest_streak=new_longest,
                last_practice_date=get_ist_now(),
            )
        )
        db.flush()

        logger.info(
            "[STREAK] student_id=%s streak=%s longest=%s today_count=%s",
            student_id, new_streak, new_longest, count,
        )

        # Record streak event + check milestones
        self._record_streak_event(db, student_id, new_streak)

        if new_streak in STREAK_MILESTONES:
            self._award_milestone(db, student_id, new_streak)

        return True

    def handle_day_end_reset(self, db: Session) -> dict:
        """
        Nightly job: reset streaks for students who did NOT meet the threshold
        today. Called once per day near IST midnight.

        Returns { reset_count, skipped_count }.
        """
        today_ist = get_ist_now().date()
        reset_count = 0
        skipped_count = 0

        # Find all active-streak students (current_streak > 0)
        active_users = (
            db.query(User)
            .filter(User.current_streak > 0, User.is_archived == False)
            .all()
        )

        for user in active_users:
            last_date = user.last_practice_date
            if last_date is not None and hasattr(last_date, "date"):
                last_date = last_date.date()

            if last_date == today_ist:
                # Student DID practice today — streak is safe
                skipped_count += 1
                continue

            # Student did NOT practice today → reset streak
            old_streak = user.current_streak
            db.execute(
                sa_update(User)
                .where(User.id == user.id)
                .values(current_streak=0)
            )

            # Optionally record a streak_reset event
            from reward_models import RewardEvent
            event = RewardEvent(
                student_id=user.id,
                event_type="streak_reset",
                source_tool="system",
                rule_key=None,
                points_delta=0,
                event_metadata={
                    "old_streak": old_streak,
                    "reason": "daily_threshold_not_met",
                    "date": str(today_ist),
                },
            )
            db.add(event)
            reset_count += 1

            logger.info(
                "[STREAK_RESET] student_id=%s old_streak=%s",
                user.id, old_streak,
            )

        db.flush()
        return {"reset_count": reset_count, "skipped_count": skipped_count}

    # ───────── Internals ─────────

    def _record_streak_event(self, db, student_id: int, new_streak: int):
        """Write a streak_incremented event (0 points, just for history)."""
        from reward_models import RewardEvent
        event = RewardEvent(
            student_id=student_id,
            event_type="streak_incremented",
            source_tool="system",
            rule_key=None,
            points_delta=0,
            event_metadata={"streak": new_streak},
        )
        db.add(event)

    def _award_milestone(self, db, student_id: int, streak: int):
        """Award streak milestone bonus points via the RewardEngine."""
        rule_key = _MILESTONE_RULE_MAP.get(streak)
        if not rule_key:
            return

        from reward_engine import reward_engine
        reward_engine.record_event(
            db=db,
            student_id=student_id,
            event_type="streak_milestone_reached",
            source_tool="system",
            rule_key=rule_key,
            metadata={"milestone": streak},
        )
        logger.info(
            "[STREAK_MILESTONE] student_id=%s milestone=%s rule_key=%s",
            student_id, streak, rule_key,
        )


# Singleton
streak_service = StreakService()
