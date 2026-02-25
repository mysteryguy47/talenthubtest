"""Leaderboard calculation and management."""
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from models import User, Leaderboard, PracticeSession
from datetime import datetime, timedelta
from timezone_utils import get_ist_now
from typing import List, Optional


def update_leaderboard(db: Session) -> None:
    """Update overall leaderboard rankings."""
    # Get all users ordered by total points
    users = db.query(User).filter(User.role == "student").order_by(
        desc(User.total_points)
    ).all()
    
    # Update or create leaderboard entries
    for rank, user in enumerate(users, start=1):
        leaderboard = db.query(Leaderboard).filter(
            Leaderboard.user_id == user.id
        ).first()
        
        if leaderboard:
            leaderboard.total_points = user.total_points
            leaderboard.rank = rank
            leaderboard.last_updated = get_ist_now()
        else:
            leaderboard = Leaderboard(
                user_id=user.id,
                total_points=user.total_points,
                rank=rank
            )
            db.add(leaderboard)
    
    db.commit()


def update_weekly_leaderboard(db: Session) -> None:
    """Update weekly leaderboard rankings."""
    # Calculate start of week (Monday) in IST
    ist_now = get_ist_now()
    today = ist_now.date()
    days_since_monday = today.weekday()
    week_start = today - timedelta(days=days_since_monday)
    week_start_datetime = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=ist_now.tzinfo)
    
    # Get weekly points for each user
    weekly_points_query = db.query(
        PracticeSession.user_id,
        func.sum(PracticeSession.points_earned).label('weekly_points')
    ).filter(
        PracticeSession.started_at >= week_start_datetime
    ).group_by(PracticeSession.user_id).subquery()
    
    # Get all users with their weekly points
    users_with_points = db.query(
        User.id,
        User.name,
        User.avatar_url,
        func.coalesce(weekly_points_query.c.weekly_points, 0).label('weekly_points')
    ).outerjoin(
        weekly_points_query, User.id == weekly_points_query.c.user_id
    ).filter(
        User.role == "student"
    ).order_by(
        desc('weekly_points')
    ).all()
    
    # Update weekly leaderboard
    for rank, (user_id, name, avatar_url, weekly_points) in enumerate(users_with_points, start=1):
        leaderboard = db.query(Leaderboard).filter(
            Leaderboard.user_id == user_id
        ).first()
        
        if leaderboard:
            leaderboard.weekly_points = int(weekly_points or 0)
            leaderboard.weekly_rank = rank
        else:
            leaderboard = Leaderboard(
                user_id=user_id,
                weekly_points=int(weekly_points or 0),
                weekly_rank=rank
            )
            db.add(leaderboard)
    
    db.commit()


def get_overall_leaderboard(db: Session, limit: int = 100) -> List[dict]:
    """Get overall leaderboard."""
    leaderboard_entries = db.query(Leaderboard).join(User).filter(
        User.role == "student"
    ).order_by(
        desc(Leaderboard.total_points)
    ).limit(limit).all()
    
    result = []
    for entry in leaderboard_entries:
        user = db.query(User).filter(User.id == entry.user_id).first()
        if user:
            result.append({
                "rank": entry.rank or 0,
                "user_id": user.id,
                "name": user.display_name or user.name,  # Use display_name if set, otherwise use name
                "avatar_url": user.avatar_url,
                "total_points": entry.total_points or 0,
                "weekly_points": entry.weekly_points or 0  # Include weekly_points even for overall leaderboard
            })
    
    return result


def get_weekly_leaderboard(db: Session, limit: int = 100) -> List[dict]:
    """Get weekly leaderboard."""
    leaderboard_entries = db.query(Leaderboard).join(User).filter(
        User.role == "student"
    ).order_by(
        desc(Leaderboard.weekly_points)
    ).limit(limit).all()
    
    result = []
    for entry in leaderboard_entries:
        user = db.query(User).filter(User.id == entry.user_id).first()
        if user:
            result.append({
                "rank": entry.weekly_rank or 0,
                "user_id": user.id,
                "name": user.display_name or user.name,  # Use display_name if set, otherwise use name
                "avatar_url": user.avatar_url,
                "weekly_points": entry.weekly_points or 0,
                "total_points": entry.total_points or 0  # Include total_points even for weekly leaderboard
            })
    
    return result

