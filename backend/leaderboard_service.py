"""Leaderboard calculation and management.

NOTE: The old Leaderboard model has been removed.
Live leaderboard is now computed from User.total_points in reward_routes.py.
Monthly snapshots are handled by reward_scheduler.py.
This file is retained for backward compatibility — functions are stubs.
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from models import User, PracticeSession
from datetime import datetime, timedelta
from timezone_utils import get_ist_now
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


def update_leaderboard(db: Session = None) -> None:
    """DEPRECATED — leaderboard is now live from User.total_points."""
    logger.debug("[LEADERBOARD] update_leaderboard is deprecated (no-op)")


def update_weekly_leaderboard(db: Session = None) -> None:
    """DEPRECATED — weekly points are now in reward_events."""
    logger.debug("[LEADERBOARD] update_weekly_leaderboard is deprecated (no-op)")


def update_leaderboard_background() -> None:
    """DEPRECATED — no-op stub."""
    logger.debug("[LEADERBOARD] update_leaderboard_background is deprecated (no-op)")


def update_weekly_leaderboard_background() -> None:
    """DEPRECATED — no-op stub."""
    logger.debug("[LEADERBOARD] update_weekly_leaderboard_background is deprecated (no-op)")


def get_overall_leaderboard(db: Session, limit: int = 100) -> List[dict]:
    """DEPRECATED — use GET /rewards/leaderboard instead."""
    students = (
        db.query(User.id, User.name, User.display_name, User.avatar_url, User.total_points)
        .filter(User.role == "student", User.total_points > 0)
        .order_by(desc(User.total_points))
        .limit(limit)
        .all()
    )
    return [
        {
            "rank": i + 1,
            "user_id": s.id,
            "name": s.display_name or s.name,
            "avatar_url": s.avatar_url,
            "total_points": s.total_points or 0,
            "weekly_points": 0,
        }
        for i, s in enumerate(students)
    ]


def get_weekly_leaderboard(db: Session, limit: int = 100) -> List[dict]:
    """DEPRECATED — use GET /rewards/leaderboard instead."""
    return get_overall_leaderboard(db, limit)

