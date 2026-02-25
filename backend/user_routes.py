"""API routes for user authentication, progress tracking, and dashboards."""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from timezone_utils import get_ist_now

from models import User, PracticeSession, Attempt, Reward, Leaderboard, PaperAttempt, Paper, StudentProfile, ProfileAuditLog, AttendanceRecord, ClassSession, VacantId, PointsLog, get_db
from auth import get_current_user, get_current_admin, verify_google_token, create_access_token
from user_schemas import (
    LoginRequest, LoginResponse, UserResponse, PracticeSessionCreate,
    PracticeSessionResponse, StudentStats, LeaderboardEntry, AdminStats,
    PracticeSessionDetailResponse, AttemptResponse,
    StudentProfileResponse, StudentProfileUpdate, ProfileAuditLogResponse,
    PaperAttemptResponse, PaperAttemptDetailResponse,
    StudentIDInfo, UpdateStudentIDRequest, UpdateStudentIDResponse,
    RewardSummaryResponse, BadgeResponse, GraceSkipResponse, SuperProgress, PointsLogResponse, PointsSummaryResponse
)
from student_profile_utils import (
    validate_level, validate_course, validate_branch, validate_status,
    validate_level_type, generate_public_id
)
from pydantic import BaseModel
from typing import Optional, List
import uuid as uuid_module

class UpdateDisplayNameRequest(BaseModel):
    display_name: Optional[str] = None


def process_practice_session_async(session_id: int, user_id: int, attempted_questions: int, 
                                   operation_type: str, difficulty_mode: str, total_questions: int,
                                   correct_answers: int, wrong_answers: int, accuracy: float,
                                   score: int, time_taken: float):
    """Background task to process practice session - updates stats, badges, leaderboards.
    Note: Points are already updated in main request, so we don't update them here."""
    from models import get_db, User, StudentProfile, PracticeSession
    from reward_system import update_user_question_count
    from gamification import update_streak, check_and_award_super_rewards, check_and_award_badges
    from leaderboard_service import update_leaderboard, update_weekly_leaderboard
    import time
    
    start_time = time.time()
    db = next(get_db())
    try:
        # Get fresh user and session from DB
        user = db.query(User).filter(User.id == user_id).first()
        session = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
        
        if not user or not session:
            print(f"⚠️ [BG_TASK] User or session not found for session_id={session_id}")
            return
        
        # Update question count (points already updated in main request)
        update_user_question_count(db, user, attempted_questions)
        
        # Update streak (only for mental math, based on course type)
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if profile and profile.course == "Abacus":
            # Abacus students: streaks depend on mental math
            update_streak(db, user, questions_practiced_today=attempted_questions)
        
        # Check for lifetime badges (new reward system)
        from reward_system import check_and_award_lifetime_badges
        check_and_award_lifetime_badges(db, user)
        
        # Check for SUPER badge rewards
        check_and_award_super_rewards(db, user)
        
        # Note: Monthly badges (accuracy_ace, perfect_precision, comeback_kid) are evaluated
        # at end of month via monthly_badge_evaluation.py, not per-session
        
        db.commit()
        db.refresh(user)
        
        # Update leaderboards (these have their own commits)
        try:
            update_leaderboard(db)
        except Exception as e:
            print(f"⚠️ [BG_TASK] Error updating leaderboard: {e}")
        
        try:
            update_weekly_leaderboard(db)
        except Exception as e:
            print(f"⚠️ [BG_TASK] Error updating weekly leaderboard: {e}")
        
        elapsed = time.time() - start_time
        print(f"✅ [BG_TASK] Processed practice session {session_id} in {elapsed:.2f}s")
    except Exception as e:
        db.rollback()
        import traceback
        print(f"❌ [BG_TASK] Error processing session {session_id}: {e}")
        print(traceback.format_exc())
    finally:
        db.close()

from gamification import calculate_points, check_and_award_badges, update_streak, check_and_award_super_rewards
from leaderboard_service import (
    update_leaderboard, update_weekly_leaderboard,
    get_overall_leaderboard, get_weekly_leaderboard
)
# Lazy import reward_system to prevent startup failures
# Functions will be imported when needed

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    print("🧪 LOGIN RAW BODY:", login_data.dict())

    """Login with Google OAuth token."""
    try:
        # Get token from either credential or token field
        try:
            token = login_data.get_token()
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        print(f"🟢 [LOGIN] Login attempt received, token length: {len(token)}")
        print(f"🟢 [LOGIN] Token source: {'credential' if login_data.credential else 'token'}")
        
        # Verify Google token
        try:
            user_info = verify_google_token(token)
            print(f"✅ [LOGIN] Token verified, user info: {user_info.get('email', 'N/A')}")
        except HTTPException as e:
            # Re-raise HTTP exceptions from verify_google_token
            print(f"❌ [LOGIN] Token verification failed: {e.detail}")
            raise
        except Exception as e:
            print(f"❌ [LOGIN] Token verification error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}"
            )
        
        # Find or create user
        user = db.query(User).filter(User.google_id == user_info["google_id"]).first()
        
        # Check if admin email (you can set this in environment)
        import os
        admin_emails = [email.strip() for email in os.getenv("ADMIN_EMAILS", "").split(",") if email.strip()]
        is_admin_email = user_info["email"] in admin_emails
        
        if not user:
            # New user - assign role based on admin emails
            role = "admin" if is_admin_email else "student"
            
            user = User(
                google_id=user_info["google_id"],
                email=user_info["email"],
                name=user_info["name"],
                avatar_url=user_info.get("avatar_url"),
                role=role
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Create leaderboard entry
            from models import Leaderboard
            leaderboard = Leaderboard(user_id=user.id, total_points=0)
            db.add(leaderboard)

            # Create student profile WITHOUT public ID - admin must assign it manually
            if role == "student":
                import uuid as uuid_module
                profile = StudentProfile(
                    user_id=user.id,
                    internal_uuid=str(uuid_module.uuid4())
                    # public_id is NOT assigned - admin must assign it through Student ID Management page
                )
                db.add(profile)

            db.commit()
        else:
            # Existing user - update info and check if role needs updating
            user.name = user_info["name"]
            user.avatar_url = user_info.get("avatar_url")
            
            # Update role if email is in admin list (promote to admin)
            # Or demote if email is removed from admin list (but keep existing admins unless explicitly removed)
            if is_admin_email and user.role != "admin":
                print(f"🔄 [AUTH] Promoting user {user.email} to admin (found in ADMIN_EMAILS)")
                user.role = "admin"
            elif not is_admin_email and user.role == "admin":
                # Only demote if explicitly not in admin list (optional - comment out if you want to keep existing admins)
                # Uncomment the next line if you want to automatically demote admins removed from ADMIN_EMAILS
                # print(f"🔄 [AUTH] Demoting user {user.email} from admin (not in ADMIN_EMAILS)")
                # user.role = "student"
                pass
            
            db.commit()
        
        # Give daily login bonus (+10 points) if not already given today
        # Give daily login bonus (+10 points) if not already given today
        ist_now = get_ist_now()
        today = ist_now.date()

        last_bonus_date = user.last_daily_login_bonus_date

        if last_bonus_date != today:
            try:
                user.total_points += 10
                user.last_daily_login_bonus_date = today

                from points_logger import log_points
                log_points(
                    db=db,
                    user=user,
                    points=10,
                    source_type="daily_login",
                    description="Daily login bonus"
                )

                db.commit()
                print(f"🎁 [LOGIN] Daily login bonus: +10 points for {user.email}")

            except Exception as bonus_error:
                db.rollback()
                print(f"⚠️ [LOGIN] Daily bonus failed, login continues: {bonus_error}")

        
        # Create access token - sub must be a string for JWT
        access_token = create_access_token(data={"sub": str(user.id)})
        
        # Build user response with public_id
        user_dict = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "role": user.role,
            "total_points": user.total_points,
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
            "created_at": user.created_at,
            "public_id": None
        }
        
        # Get public_id from student profile if exists
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if profile:
            user_dict["public_id"] = profile.public_id
        
        print(f"✅ [LOGIN] Login successful for user: {user.email}")
        return LoginResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user_dict)
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Login error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user info."""
    import time
    request_start = time.time()
    # Build user dict with public_id from student profile
    user_dict = {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "display_name": current_user.display_name,
        "avatar_url": current_user.avatar_url,
        "role": current_user.role,
        "total_points": current_user.total_points,
        "current_streak": current_user.current_streak,
        "longest_streak": current_user.longest_streak,
        "created_at": current_user.created_at,
        "public_id": None
    }
    
    # Get public_id from student profile if exists
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if profile:
        user_dict["public_id"] = profile.public_id
    
    elapsed = time.time() - request_start
    if elapsed > 0.5:  # Only log if slow
        print(f"⏱ [ME] GET /users/me took {elapsed:.2f}s")
    
    return UserResponse.model_validate(user_dict)


@router.put("/me/display-name", response_model=UserResponse)
async def update_display_name(
    request: UpdateDisplayNameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's display name."""
    current_user.display_name = request.display_name
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/practice-session", response_model=PracticeSessionResponse)
async def save_practice_session(
    session_data: PracticeSessionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a practice session with all attempts."""
    import time
    request_start = time.time()
    try:
        # Calculate attempted questions (answered questions, right or wrong)
        attempted_questions = session_data.correct_answers + session_data.wrong_answers
        
        # Calculate points: +1 per attempted, +5 per correct
        points_earned = calculate_points(
            correct_answers=session_data.correct_answers,
            total_questions=session_data.total_questions,
            time_taken=session_data.time_taken,
            difficulty_mode=session_data.difficulty_mode,
            accuracy=session_data.accuracy,
            is_mental_math=True,  # Mental math practice
            attempted_questions=attempted_questions
        )
        
        # Create practice session
        session = PracticeSession(
            user_id=current_user.id,
            operation_type=session_data.operation_type,
            difficulty_mode=session_data.difficulty_mode,
            total_questions=session_data.total_questions,
            correct_answers=session_data.correct_answers,
            wrong_answers=session_data.wrong_answers,
            accuracy=session_data.accuracy,
            score=session_data.score,
            time_taken=session_data.time_taken,
            points_earned=points_earned,
            completed_at=get_ist_now().replace(tzinfo=None)  # Store IST time as naive (SQLAlchemy requirement)
        )
        db.add(session)
        db.flush()  # Get session ID
        
        # Save attempts
        for attempt_data in session_data.attempts:
            attempt = Attempt(
                session_id=session.id,
                question_data=attempt_data.get("question_data", {}),
                user_answer=attempt_data.get("user_answer"),
                correct_answer=attempt_data.get("correct_answer"),
                is_correct=attempt_data.get("is_correct", False),
                time_taken=attempt_data.get("time_taken", 0),
                question_number=attempt_data.get("question_number", 0)
            )
            db.add(attempt)
        
        # Update user points immediately (needed for response)
        current_user.total_points += points_earned
        
        # Log points transaction
        from points_logger import log_points
        log_points(
            db=db,
            user=current_user,
            points=points_earned,
            source_type="mental_math",
            description=f"Mental math practice: {session_data.operation_type} ({session_data.difficulty_mode})",
            source_id=session.id,
            extra_data={
                "operation_type": session_data.operation_type,
                "difficulty_mode": session_data.difficulty_mode,
                "correct_answers": session_data.correct_answers,
                "wrong_answers": session_data.wrong_answers,
                "attempted_questions": attempted_questions,
                "total_questions": session_data.total_questions,
                "accuracy": session_data.accuracy
            }
        )
        
        from reward_system import update_user_question_count
        update_user_question_count(db, current_user, attempted_questions)
        
        db.commit()
        db.refresh(session)
        db.refresh(current_user)
        
        # Schedule heavy operations in background (points already updated above)
        background_tasks.add_task(
            process_practice_session_async,
            session_id=session.id,
            user_id=current_user.id,
            attempted_questions=attempted_questions,
            operation_type=session_data.operation_type,
            difficulty_mode=session_data.difficulty_mode,
            total_questions=session_data.total_questions,
            correct_answers=session_data.correct_answers,
            wrong_answers=session_data.wrong_answers,
            accuracy=session_data.accuracy,
            score=session_data.score,
            time_taken=session_data.time_taken
        )
        
        # Ensure datetimes are treated as IST (SQLAlchemy returns naive datetimes)
        from timezone_utils import IST_TIMEZONE
        if session.started_at and session.started_at.tzinfo is None:
            session.started_at = session.started_at.replace(tzinfo=IST_TIMEZONE)
        if session.completed_at and session.completed_at.tzinfo is None:
            session.completed_at = session.completed_at.replace(tzinfo=IST_TIMEZONE)
        
        elapsed = time.time() - request_start
        print(f"⏱ [PRACTICE_SESSION] POST /users/practice-session took {elapsed:.2f}s (fast path)")
        
        return PracticeSessionResponse.model_validate(session)
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Rollback transaction on error
        db.rollback()
        import traceback
        error_msg = str(e)
        traceback_str = traceback.format_exc()
        print(f"❌ [PRACTICE SESSION] Error saving practice session: {error_msg}")
        print(traceback_str)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save practice session: {error_msg}"
        )


@router.get("/stats", response_model=StudentStats)
async def get_student_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student statistics and progress."""
    import time
    request_start = time.time()
    # Get session stats (mental math)
    sessions = db.query(PracticeSession).filter(
        PracticeSession.user_id == current_user.id
    ).all()

    total_mental_sessions = len(sessions)
    mental_questions = sum(s.total_questions for s in sessions)
    mental_correct = sum(s.correct_answers for s in sessions)
    mental_wrong = sum(s.wrong_answers for s in sessions)

    # Get paper attempt stats
    from models import PaperAttempt
    paper_attempts = db.query(PaperAttempt).filter(
        PaperAttempt.user_id == current_user.id
    ).all()

    total_paper_attempts_count = len(paper_attempts)
    paper_questions = sum(p.total_questions for p in paper_attempts)
    paper_correct = sum(p.correct_answers for p in paper_attempts)
    paper_wrong = sum(p.wrong_answers for p in paper_attempts)

    # Combined totals
    total_sessions = total_mental_sessions + total_paper_attempts_count
    total_questions = mental_questions + paper_questions
    total_correct = mental_correct + paper_correct
    total_wrong = mental_wrong + paper_wrong
    overall_accuracy = (total_correct / total_questions * 100) if total_questions > 0 else 0

    # Paper accuracy
    paper_overall_accuracy = (paper_correct / paper_questions * 100) if paper_questions > 0 else 0

    # Get badges - filter out old badge system (accuracy_king, perfect_score, speed_star)
    old_badge_types = ["accuracy_king", "perfect_score", "speed_star"]
    badges = db.query(Reward).filter(
        Reward.user_id == current_user.id,
        ~Reward.badge_type.in_(old_badge_types)
    ).all()
    badge_names = [badge.badge_name for badge in badges]

    # Get recent sessions (only latest 10 are stored)
    recent_sessions = db.query(PracticeSession).filter(
        PracticeSession.user_id == current_user.id
    ).order_by(desc(PracticeSession.started_at)).limit(10).all()

    # Get recent paper attempts (only latest 10 are stored)
    recent_paper_attempts = db.query(PaperAttempt).filter(
        PaperAttempt.user_id == current_user.id
    ).order_by(desc(PaperAttempt.started_at)).limit(10).all()
    
    # Ensure datetimes are treated as IST (SQLAlchemy returns naive datetimes)
    from timezone_utils import IST_TIMEZONE
    for s in recent_sessions:
        if s.started_at and s.started_at.tzinfo is None:
            s.started_at = s.started_at.replace(tzinfo=IST_TIMEZONE)
        if s.completed_at and s.completed_at.tzinfo is None:
            s.completed_at = s.completed_at.replace(tzinfo=IST_TIMEZONE)
    for a in recent_paper_attempts:
        if a.started_at and a.started_at.tzinfo is None:
            a.started_at = a.started_at.replace(tzinfo=IST_TIMEZONE)
        if a.completed_at and a.completed_at.tzinfo is None:
            a.completed_at = a.completed_at.replace(tzinfo=IST_TIMEZONE)
    
    return StudentStats(
        total_sessions=total_sessions,
        total_questions=total_questions,
        total_correct=total_correct,
        total_wrong=total_wrong,
        overall_accuracy=round(overall_accuracy, 2),
        total_points=current_user.total_points,
        current_streak=current_user.current_streak,
        longest_streak=current_user.longest_streak,
        badges=badge_names,
        recent_sessions=[PracticeSessionResponse.model_validate(s) for s in recent_sessions],
        recent_paper_attempts=[PaperAttemptResponse.model_validate(a) for a in recent_paper_attempts],
        # Practice paper metrics
        total_paper_attempts=total_paper_attempts_count,
        paper_total_questions=paper_questions,
        paper_total_correct=paper_correct,
        paper_total_wrong=paper_wrong,
        paper_overall_accuracy=round(paper_overall_accuracy, 2)
    )


@router.get("/practice-session/{session_id}", response_model=PracticeSessionDetailResponse)
async def get_practice_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed practice session with all attempts."""
    session = db.query(PracticeSession).filter(
        PracticeSession.id == session_id,
        PracticeSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all attempts for this session
    attempts = db.query(Attempt).filter(
        Attempt.session_id == session_id
    ).order_by(Attempt.question_number).all()
    
    # Ensure datetimes are treated as IST (SQLAlchemy returns naive datetimes)
    from timezone_utils import IST_TIMEZONE
    started_at = session.started_at
    completed_at = session.completed_at
    if started_at and started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=IST_TIMEZONE)
    if completed_at and completed_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=IST_TIMEZONE)
    
    return PracticeSessionDetailResponse(
        id=session.id,
        operation_type=session.operation_type,
        difficulty_mode=session.difficulty_mode,
        total_questions=session.total_questions,
        correct_answers=session.correct_answers,
        wrong_answers=session.wrong_answers,
        accuracy=session.accuracy,
        score=session.score,
        time_taken=session.time_taken,
        points_earned=session.points_earned,
        started_at=started_at,
        completed_at=completed_at,
        attempts=[AttemptResponse.model_validate(a) for a in attempts]
    )


@router.get("/admin/students/{student_id}/practice-session/{session_id}", response_model=PracticeSessionDetailResponse)
async def get_practice_session_detail_admin(
    student_id: int,
    session_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: Get detailed practice session for a specific student, with all attempts."""
    # Ensure the session belongs to the requested student
    session = db.query(PracticeSession).filter(
        PracticeSession.id == session_id,
        PracticeSession.user_id == student_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found for this student")

    # Get all attempts for this session
    attempts = db.query(Attempt).filter(
        Attempt.session_id == session_id
    ).order_by(Attempt.question_number).all()

    # Ensure datetimes are treated as IST (SQLAlchemy returns naive datetimes)
    from timezone_utils import IST_TIMEZONE
    started_at = session.started_at
    completed_at = session.completed_at
    if started_at and started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=IST_TIMEZONE)
    if completed_at and completed_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=IST_TIMEZONE)

    return PracticeSessionDetailResponse(
        id=session.id,
        operation_type=session.operation_type,
        difficulty_mode=session.difficulty_mode,
        total_questions=session.total_questions,
        correct_answers=session.correct_answers,
        wrong_answers=session.wrong_answers,
        accuracy=session.accuracy,
        score=session.score,
        time_taken=session.time_taken,
        points_earned=session.points_earned,
        started_at=started_at,
        completed_at=completed_at,
        attempts=[AttemptResponse.model_validate(a) for a in attempts]
    )


@router.get("/admin/students/{student_id}/paper-attempt/{attempt_id}", response_model=PaperAttemptDetailResponse)
async def get_paper_attempt_detail_admin(
    student_id: int,
    attempt_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: Get detailed practice paper attempt for a specific student."""
    paper_attempt = db.query(PaperAttempt).filter(
        PaperAttempt.id == attempt_id,
        PaperAttempt.user_id == student_id
    ).first()
    if not paper_attempt:
        raise HTTPException(status_code=404, detail="Paper attempt not found for this student")
    return PaperAttemptDetailResponse.model_validate(paper_attempt)


@router.get("/leaderboard/overall", response_model=List[LeaderboardEntry])
async def get_overall_leaderboard_endpoint(db: Session = Depends(get_db)):
    """Get overall leaderboard."""
    import time
    request_start = time.time()
    entries = get_overall_leaderboard(db)
    elapsed = time.time() - request_start
    print(f"⏱ [LEADERBOARD] GET /users/leaderboard/overall took {elapsed:.2f}s")
    return [LeaderboardEntry(**entry) for entry in entries]


@router.get("/leaderboard/weekly", response_model=List[LeaderboardEntry])
async def get_weekly_leaderboard_endpoint(db: Session = Depends(get_db)):
    """Get weekly leaderboard."""
    entries = get_weekly_leaderboard(db)
    return [LeaderboardEntry(**entry) for entry in entries]


# Admin routes
@router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics."""
    # Total students
    total_students = db.query(User).filter(User.role == "student").count()
    
    # Total sessions (mental math + practice paper attempts)
    total_mental_math_sessions = db.query(PracticeSession).count()
    total_paper_attempts = db.query(PaperAttempt).count()
    total_sessions = total_mental_math_sessions + total_paper_attempts
    
    # Total questions
    total_questions = db.query(func.sum(PracticeSession.total_questions)).scalar() or 0
    
    # Average accuracy
    avg_accuracy = db.query(func.avg(PracticeSession.accuracy)).scalar() or 0
    
    # Active students today (IST)
    ist_now = get_ist_now()
    today_start = ist_now.replace(hour=0, minute=0, second=0, microsecond=0)
    active_today = db.query(func.count(func.distinct(PracticeSession.user_id))).filter(
        PracticeSession.started_at >= today_start
    ).scalar() or 0
    
    # Top students
    top_students = get_overall_leaderboard(db, limit=10)
    
    return AdminStats(
        total_students=total_students,
        total_sessions=total_sessions,
        total_questions=int(total_questions),
        average_accuracy=round(float(avg_accuracy), 2),
        active_students_today=active_today,
        top_students=[LeaderboardEntry(**entry) for entry in top_students]
    )


@router.get("/admin/students", response_model=List[UserResponse])
async def get_all_students(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all students."""
    try:
        students = db.query(User).filter(User.role == "student").order_by(
            User.id.asc()
        ).all()

        # Add public_id from student profiles
        result = []
        for student in students:
            student_dict = {
                "id": student.id,
                "email": student.email,
                "name": student.name,
                "display_name": student.display_name,
                "avatar_url": student.avatar_url,
                "role": student.role,
                "total_points": student.total_points,
                "current_streak": student.current_streak,
                "longest_streak": student.longest_streak,
                "created_at": student.created_at,
                "public_id": None
            }

            # Get public_id from student profile
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
            if profile:
                student_dict["public_id"] = profile.public_id

            result.append(UserResponse.model_validate(student_dict))

        return result
    except Exception as e:
        # Ensure we never drop the connection without a response.
        raise HTTPException(status_code=500, detail=f"Failed to load students: {str(e)}")


@router.get("/admin/students/{student_id}/stats", response_model=StudentStats)
async def get_student_stats_admin(
    student_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get stats for a specific student (admin view)."""
    student = db.query(User).filter(
        User.id == student_id,
        User.role == "student"
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Reuse the stats logic
    sessions = db.query(PracticeSession).filter(
        PracticeSession.user_id == student.id
    ).all()
    
    total_sessions = len(sessions)
    total_questions = sum(s.total_questions for s in sessions)
    total_correct = sum(s.correct_answers for s in sessions)
    total_wrong = sum(s.wrong_answers for s in sessions)
    overall_accuracy = (total_correct / total_questions * 100) if total_questions > 0 else 0
    
    # Filter out old badge system (accuracy_king, perfect_score, speed_star)
    old_badge_types = ["accuracy_king", "perfect_score", "speed_star"]
    badges = db.query(Reward).filter(
        Reward.user_id == student.id,
        ~Reward.badge_type.in_(old_badge_types)
    ).all()
    badge_names = [badge.badge_name for badge in badges]
    
    recent_sessions = db.query(PracticeSession).filter(
        PracticeSession.user_id == student.id
    ).order_by(desc(PracticeSession.started_at)).limit(10).all()
    
    # Get recent paper attempts (practice paper sessions)
    recent_paper_attempts = db.query(PaperAttempt).filter(
        PaperAttempt.user_id == student.id
    ).order_by(desc(PaperAttempt.started_at)).limit(10).all()
    
    # Calculate practice paper metrics
    all_paper_attempts = db.query(PaperAttempt).filter(
        PaperAttempt.user_id == student.id
    ).all()
    
    total_paper_attempts = len(all_paper_attempts)
    paper_total_questions = sum(a.total_questions for a in all_paper_attempts)
    paper_total_correct = sum(a.correct_answers for a in all_paper_attempts)
    paper_total_wrong = sum(a.wrong_answers for a in all_paper_attempts)
    paper_overall_accuracy = (paper_total_correct / paper_total_questions * 100) if paper_total_questions > 0 else 0.0
    
    return StudentStats(
        total_sessions=total_sessions,
        total_questions=total_questions,
        total_correct=total_correct,
        total_wrong=total_wrong,
        overall_accuracy=round(overall_accuracy, 2),
        total_points=student.total_points,
        current_streak=student.current_streak,
        longest_streak=student.longest_streak,
        badges=badge_names,
        recent_sessions=[PracticeSessionResponse.model_validate(s) for s in recent_sessions],
        recent_paper_attempts=[PaperAttemptResponse.model_validate(a) for a in recent_paper_attempts],
        total_paper_attempts=total_paper_attempts,
        paper_total_questions=paper_total_questions,
        paper_total_correct=paper_total_correct,
        paper_total_wrong=paper_total_wrong,
        paper_overall_accuracy=round(paper_overall_accuracy, 2)
    )


class UpdatePointsRequest(BaseModel):
    points: int
    reason: str | None = None

class DatabaseStatsResponse(BaseModel):
    total_users: int
    total_students: int
    total_admins: int
    total_sessions: int
    total_paper_attempts: int
    total_rewards: int
    total_papers: int
    database_size_mb: float


@router.delete("/admin/students/{student_id}")
async def delete_student(
    student_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a student account and all associated data. If student has a public_id, save it to vacant_ids."""
    from models import VacantId
    
    student = db.query(User).filter(
        User.id == student_id,
        User.role == "student"
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get student profile to check for public_id
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    
    # If student has a public_id, save it to vacant_ids before deletion
    if profile and profile.public_id:
        # Check if this ID is already in vacant_ids (shouldn't happen, but be safe)
        existing_vacant = db.query(VacantId).filter(VacantId.public_id == profile.public_id).first()
        if not existing_vacant:
            vacant_id = VacantId(
                public_id=profile.public_id,
                original_student_name=student.name,
                deleted_at=get_ist_now(),
                deleted_by_user_id=admin.id
            )
            db.add(vacant_id)
            db.flush()  # Flush to ensure vacant_id is saved before deletion
    
    # Delete associated data (cascade should handle most, but we'll be explicit)
    # Delete leaderboard entry
    leaderboard = db.query(Leaderboard).filter(Leaderboard.user_id == student_id).first()
    if leaderboard:
        db.delete(leaderboard)
    
    # Delete user (cascade will handle sessions, attempts, rewards, paper_attempts, and student_profile)
    db.delete(student)
    db.commit()
    
    # Refresh leaderboard after deletion
    update_leaderboard(db)
    update_weekly_leaderboard(db)
    
    return {"message": f"Student {student.name} deleted successfully"}


@router.put("/admin/students/{student_id}/points")
async def update_student_points(
    student_id: int,
    request: UpdatePointsRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a student's total points."""
    student = db.query(User).filter(
        User.id == student_id,
        User.role == "student"
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    old_points = student.total_points
    points_change = request.points - old_points
    student.total_points = max(0, request.points)  # Ensure non-negative
    db.flush()  # REQUIRED
    
    # Log points transaction if there's a change
    if points_change != 0:
        from points_logger import log_points
        log_points(
            db=db,
            user=student,
            points=points_change,
            source_type="admin_adjustment",
            description=f"Admin points adjustment by {admin.name} ({admin.email})",
            extra_data={
                "old_points": old_points,
                "new_points": request.points,
                "adjusted_by": admin.id,
                "reason": getattr(request, "reason", None)
            }
        )
    
    db.commit()
    
    # Update leaderboard entry
    leaderboard = db.query(Leaderboard).filter(Leaderboard.user_id == student_id).first()
    if leaderboard:
        leaderboard.total_points = student.total_points
        db.commit()
    
    # Refresh leaderboard rankings
    update_leaderboard(db)
    
    return {
        "message": f"Points updated for {student.name}",
        "old_points": old_points,
        "new_points": student.total_points
    }


@router.post("/admin/leaderboard/refresh")
async def refresh_leaderboard(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Manually refresh both overall and weekly leaderboards."""
    update_leaderboard(db)
    update_weekly_leaderboard(db)
    return {"message": "Leaderboard refreshed successfully"}


@router.get("/admin/database/stats", response_model=DatabaseStatsResponse)
async def get_database_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get database statistics."""
    try:
        total_users = db.query(User).count()
        total_students = db.query(User).filter(User.role == "student").count()
        total_admins = db.query(User).filter(User.role == "admin").count()
        total_sessions = db.query(PracticeSession).count()
        total_paper_attempts = db.query(PaperAttempt).count()
        total_rewards = db.query(Reward).count()
        total_papers = db.query(Paper).count()

        # Calculate database size (SQLite or PostgreSQL)
        import os
        from sqlalchemy import text
        db_path = os.getenv("DATABASE_URL", "sqlite:///./abacus_replitt.db")

        if db_path.startswith("sqlite:///"):
            # SQLite: get file size
            db_file = db_path.replace("sqlite:///", "")
            # If it's a relative path, make it absolute from the project root
            if not os.path.isabs(db_file):
                # Assume we're running from backend directory, go up one level
                project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                db_file = os.path.join(project_root, db_file)
            
            print(f"🔍 [DB STATS] Checking database file: {db_file}")
            if os.path.exists(db_file):
                db_size_mb = os.path.getsize(db_file) / (1024 * 1024)
                print(f"✅ [DB STATS] Database size: {db_size_mb:.2f} MB")
            else:
                print(f"⚠️ [DB STATS] Database file not found: {db_file}")
                db_size_mb = 0.0
        else:
            # PostgreSQL: use pg_database_size query
            try:
                if "postgresql" in db_path or "postgres" in db_path:
                    result = db.execute(text("SELECT pg_database_size(current_database()) as size_bytes"))
                    size_bytes = result.scalar()
                    if size_bytes:
                        db_size_mb = size_bytes / (1024 * 1024)
                    else:
                        db_size_mb = 0.0
                else:
                    db_size_mb = 0.0
            except Exception as e:
                print(f"⚠️ [DB STATS] Failed to get PostgreSQL size: {e}")
                db_size_mb = 0.0

        return DatabaseStatsResponse(
            total_users=total_users,
            total_students=total_students,
            total_admins=total_admins,
            total_sessions=total_sessions,
            total_paper_attempts=total_paper_attempts,
            total_rewards=total_rewards,
            total_papers=total_papers,
            database_size_mb=round(db_size_mb, 2)
        )
    except Exception as e:
        # Ensure we never drop the connection without a response.
        raise HTTPException(status_code=500, detail=f"Failed to load database stats: {str(e)}")


@router.post("/admin/promote-self")
async def promote_self_to_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allow users to promote themselves to admin if their email is in ADMIN_EMAILS.
    This is useful for fixing existing users who should be admins.
    """
    import os
    admin_emails = [email.strip() for email in os.getenv("ADMIN_EMAILS", "").split(",") if email.strip()]
    
    if current_user.email not in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email is not in the ADMIN_EMAILS list. Contact system administrator."
        )
    
    if current_user.role == "admin":
        return {
            "message": "You are already an admin",
            "email": current_user.email,
            "role": current_user.role
        }
    
    # Promote to admin
    current_user.role = "admin"
    db.commit()
    
    return {
        "message": f"Successfully promoted {current_user.email} to admin",
        "email": current_user.email,
        "role": current_user.role
    }


@router.post("/admin/reset-progress")
async def reset_all_progress_data(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    ADMIN ONLY: Reset all user progress data.
    
    This will:
    - Delete all practice sessions and attempts
    - Delete all paper attempts
    - Delete all badges/rewards
    - Reset all user points, streaks, and stats to 0
    - Reset leaderboard entries
    
    This will NOT delete:
    - User accounts
    - Student profiles
    - Attendance records
    - Class sessions
    - Fee data
    - Certificates
    """
    try:
        # 1. Delete all attempts first (child table)
        deleted_attempts = db.query(Attempt).delete()
        
        # 2. Delete all practice sessions (parent table)
        deleted_sessions = db.query(PracticeSession).delete()
        
        # 3. Delete all paper attempts
        deleted_papers = db.query(PaperAttempt).delete()
        
        # 4. Delete all rewards/badges
        deleted_rewards = db.query(Reward).delete()
        
        # 5. Reset all user stats
        users_updated = db.query(User).update({
            User.total_points: 0,
            User.current_streak: 0,
            User.longest_streak: 0,
            User.last_practice_date: None,
            User.total_questions_attempted: 0,
            User.last_grace_skip_date: None,
            User.grace_skip_week_start: None,
            User.last_daily_login_bonus_date: None,
        })
        
        # 6. Reset leaderboard
        leaderboard_updated = db.query(Leaderboard).update({
            Leaderboard.total_points: 0,
            Leaderboard.weekly_points: 0,
            Leaderboard.rank: None,
            Leaderboard.weekly_rank: None,
        })
        
        # Commit all changes
        db.commit()
        
        return {
            "message": "All progress data reset successfully",
            "summary": {
                "attempts_deleted": deleted_attempts,
                "practice_sessions_deleted": deleted_sessions,
                "paper_attempts_deleted": deleted_papers,
                "rewards_deleted": deleted_rewards,
                "users_reset": users_updated,
                "leaderboard_entries_reset": leaderboard_updated
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset progress data: {str(e)}"
        )


# Student Profile Routes
@router.get("/valid-levels")
async def get_valid_levels(
    course: Optional[str] = Query(None),
    level_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get valid levels for a course and level type combination."""
    from student_profile_utils import get_valid_levels
    
    if not course or not level_type:
        return {"levels": []}
    
    # Trim whitespace from inputs
    course = course.strip() if course else None
    level_type = level_type.strip() if level_type else None
    
    if not course or not level_type:
        return {"levels": []}
    
    levels = get_valid_levels(course, level_type)
    return {"levels": levels}


@router.get("/profile", response_model=StudentProfileResponse)
async def get_student_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's student profile. Students and parents can view their own profile."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if not profile:
        # Auto-create profile if it doesn't exist
        profile = StudentProfile(
            user_id=current_user.id,
            internal_uuid=str(uuid_module.uuid4())
        )
        # Auto-generate public_id if user is a student
        if current_user.role == "student":
            from student_profile_utils import generate_branch_specific_id
            # Use TH prefix for now, can be updated when branch is set
            profile.public_id = generate_public_id(db, "TH")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return StudentProfileResponse.model_validate(profile)


@router.get("/profile/{user_id}", response_model=StudentProfileResponse)
async def get_student_profile_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a student profile by user ID. Students can only view their own, admins can view any."""
    # Check permissions: students can only view their own profile
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )
    
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    return StudentProfileResponse.model_validate(profile)


@router.put("/profile", response_model=StudentProfileResponse)
async def update_student_profile(
    profile_data: StudentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update student profile. Students can edit basic info (display_name, class_name, parent_contact_number), admins can edit everything."""
    # Get or create profile for current user
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if not profile:
        profile = StudentProfile(
            user_id=current_user.id,
            internal_uuid=str(uuid_module.uuid4())
        )
        if current_user.role == "student":
            profile.public_id = generate_public_id(db)
        db.add(profile)
        db.flush()
    
    # Students can only edit basic info fields
    is_admin = current_user.role == "admin"
    student_editable_fields = {"display_name", "class_name", "parent_contact_number"}
    admin_only_fields = {"course", "level_type", "level", "branch", "status", "join_date", "finish_date", "full_name"}
    
    # Check if student is trying to edit admin-only fields
    # Use model_dump(exclude_unset=True) to only check fields that were actually provided in the request
    if not is_admin:
        provided_fields = profile_data.model_dump(exclude_unset=True)
        for field in admin_only_fields:
            if field in provided_fields:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Only admins can edit {field}"
                )
    
    # Validate inputs (only for admin-only fields if they're being updated)
    if profile_data.course:
        is_valid, error = validate_course(profile_data.course)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.level_type:
        is_valid, error = validate_level_type(profile_data.level_type)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.level:
        is_valid, error = validate_level(profile_data.course, profile_data.level_type, profile_data.level)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.branch:
        is_valid, error = validate_branch(profile_data.branch)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.status:
        is_valid, error = validate_status(profile_data.status)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    # Track changes for audit log
    changes = []
    field_mapping = {
        "full_name": "full_name",
        "display_name": "display_name",
        "class_name": "class_name",
        "course": "course",
        "level_type": "level_type",
        "level": "level",
        "branch": "branch",
        "status": "status",
        "join_date": "join_date",
        "finish_date": "finish_date",
        "parent_contact_number": "parent_contact_number"
    }
    
    for field_key, model_field in field_mapping.items():
        new_value = getattr(profile_data, field_key, None)
        if new_value is not None:
            old_value = getattr(profile, model_field, None)
            # Convert datetime to string for comparison
            if isinstance(old_value, datetime):
                old_value = old_value.isoformat() if old_value else None
            if isinstance(new_value, datetime):
                new_value = new_value.isoformat() if new_value else None
            else:
                new_value = str(new_value) if new_value is not None else None
            
            # Only log if value actually changed
            if str(old_value) != str(new_value):
                changes.append({
                    "field": model_field,
                    "old": str(old_value) if old_value is not None else None,
                    "new": new_value
                })
                setattr(profile, model_field, getattr(profile_data, field_key))
    
    # Update profile
    profile.updated_at = get_ist_now()
    db.flush()
    
    # Create audit log entries
    for change in changes:
        audit_log = ProfileAuditLog(
            profile_id=profile.id,
            changed_by_user_id=current_user.id,
            field_name=change["field"],
            old_value=change["old"],
            new_value=change["new"]
        )
        db.add(audit_log)
    
    db.commit()
    db.refresh(profile)
    
    return StudentProfileResponse.model_validate(profile)


@router.put("/profile/{user_id}", response_model=StudentProfileResponse)
async def update_student_profile_by_id(
    user_id: int,
    profile_data: StudentProfileUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a student profile by user ID. Only admins can use this endpoint."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    
    if not profile:
        # Create profile if it doesn't exist
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        profile = StudentProfile(
            user_id=user_id,
            internal_uuid=str(uuid_module.uuid4())
        )
        if user.role == "student":
            from student_profile_utils import generate_branch_specific_id
            profile.public_id = generate_public_id(db, "TH")
        db.add(profile)
        db.flush()
    
    # Validate inputs
    if profile_data.course:
        is_valid, error = validate_course(profile_data.course)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.level_type:
        is_valid, error = validate_level_type(profile_data.level_type)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.level:
        is_valid, error = validate_level(profile_data.course, profile_data.level_type, profile_data.level)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.branch:
        is_valid, error = validate_branch(profile_data.branch)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    if profile_data.status:
        is_valid, error = validate_status(profile_data.status)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
    
    # Track changes for audit log
    changes = []
    field_mapping = {
        "full_name": "full_name",
        "display_name": "display_name",
        "class_name": "class_name",
        "course": "course",
        "level_type": "level_type",
        "level": "level",
        "branch": "branch",
        "status": "status",
        "join_date": "join_date",
        "finish_date": "finish_date",
        "parent_contact_number": "parent_contact_number"
    }
    
    for field_key, model_field in field_mapping.items():
        new_value = getattr(profile_data, field_key, None)
        if new_value is not None:
            old_value = getattr(profile, model_field, None)
            # Convert datetime to string for comparison
            if isinstance(old_value, datetime):
                old_value = old_value.isoformat() if old_value else None
            if isinstance(new_value, datetime):
                new_value = new_value.isoformat() if new_value else None
            else:
                new_value = str(new_value) if new_value is not None else None
            
            # Only log if value actually changed
            if str(old_value) != str(new_value):
                changes.append({
                    "field": model_field,
                    "old": str(old_value) if old_value is not None else None,
                    "new": new_value
                })
                setattr(profile, model_field, getattr(profile_data, field_key))
    
    # Update profile
    profile.updated_at = get_ist_now()
    db.flush()
    
    # Create audit log entries
    for change in changes:
        audit_log = ProfileAuditLog(
            profile_id=profile.id,
            changed_by_user_id=admin.id,
            field_name=change["field"],
            old_value=change["old"],
            new_value=change["new"]
        )
        db.add(audit_log)
    
    db.commit()
    db.refresh(profile)
    
    return StudentProfileResponse.model_validate(profile)


@router.get("/profile/{user_id}/audit-logs", response_model=List[ProfileAuditLogResponse])
async def get_profile_audit_logs(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs for a student profile. Only admins can access."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    logs = db.query(ProfileAuditLog).filter(
        ProfileAuditLog.profile_id == profile.id
    ).order_by(desc(ProfileAuditLog.created_at)).all()
    
    # Get user names for changed_by
    result = []
    for log in logs:
        changed_by_user = db.query(User).filter(User.id == log.changed_by_user_id).first()
        log_dict = ProfileAuditLogResponse.model_validate(log).model_dump()
        log_dict["changed_by_name"] = changed_by_user.name if changed_by_user else None
        result.append(ProfileAuditLogResponse(**log_dict))

    return result


# Student ID Management Endpoints (Admin Only)

@router.get("/admin/students/{student_id}/id-info", response_model=StudentIDInfo)
async def get_student_id_info(
    student_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get a student's current public ID information."""
    # Get user
    user = db.query(User).filter(
        User.id == student_id,
        User.role == "student"
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get student profile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()

    return StudentIDInfo(
        user_id=user.id,
        current_public_id=profile.public_id if profile else None,
        student_name=user.name,
        email=user.email
    )


@router.put("/admin/students/{student_id}/public-id", response_model=UpdateStudentIDResponse)
async def update_student_public_id(
    student_id: int,
    request: UpdateStudentIDRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a student's public ID (admin only). Simple rule: just check for duplicates."""
    from models import VacantId
    
    # Validate the new public ID is not empty
    if not request.new_public_id or not request.new_public_id.strip():
        raise HTTPException(status_code=400, detail="Public ID cannot be empty")

    new_id = request.new_public_id.strip().upper()
    
    # Validate ID format: must be TH-XXXX where XXXX is 0001-9999
    import re
    if not re.match(r'^TH-\d{4}$', new_id):
        raise HTTPException(
            status_code=400,
            detail="Public ID must be in format TH-XXXX where XXXX is a number between 0001 and 9999"
        )
    
    # Extract and validate the number part
    try:
        id_number = int(new_id.split('-')[1])
        if id_number < 1 or id_number > 9999:
            raise HTTPException(
                status_code=400,
                detail="Public ID number must be between 1 and 9999"
            )
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=400,
            detail="Invalid public ID format. Must be TH-XXXX where XXXX is a number"
        )

    # Check if the new ID already exists for another student
    existing_profile = db.query(StudentProfile).filter(
        StudentProfile.public_id == new_id,
        StudentProfile.user_id != student_id
    ).first()

    if existing_profile:
        raise HTTPException(
            status_code=409,
            detail=f"Public ID '{new_id}' is already assigned to another student"
        )
    
    # If assigning a vacant ID, remove it from vacant_ids
    vacant_id_entry = db.query(VacantId).filter(VacantId.public_id == new_id).first()
    if vacant_id_entry:
        db.delete(vacant_id_entry)

    # Get the student
    user = db.query(User).filter(
        User.id == student_id,
        User.role == "student"
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get or create student profile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()

    old_public_id = profile.public_id if profile else None

    if not profile:
        # Create profile if it doesn't exist
        import uuid as uuid_module
        profile = StudentProfile(
            user_id=student_id,
            internal_uuid=str(uuid_module.uuid4())
        )
        db.add(profile)
        db.flush()

    # If old_public_id exists and is different from new_id, add it to vacant_ids
    if old_public_id and old_public_id != new_id:
        # Check if old ID is already in vacant_ids
        existing_vacant = db.query(VacantId).filter(VacantId.public_id == old_public_id).first()
        if not existing_vacant:
            vacant_id = VacantId(
                public_id=old_public_id,
                original_student_name=user.name,
                deleted_at=get_ist_now(),
                deleted_by_user_id=admin.id
            )
            db.add(vacant_id)

    # Update the public ID
    profile.public_id = new_id
    profile.updated_at = get_ist_now()

    # Create audit log entry
    audit_log = ProfileAuditLog(
        profile_id=profile.id,
        changed_by_user_id=admin.id,
        field_name="public_id",   # ✅ CORRECT COLUMN NAME
        old_value=str(old_public_id) if old_public_id is not None else None,
        new_value=str(new_id),
        change_reason="Admin manually updated student public ID"
    )
    db.add(audit_log)

    db.commit()

    return UpdateStudentIDResponse(
        success=True,
        message=f"Public ID updated successfully for student {user.name}",
        old_public_id=old_public_id,
        new_public_id=new_id,
        student_name=user.name
    )


@router.get("/admin/vacant-ids")
async def get_vacant_ids(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all vacant IDs available for assignment (admin only)."""
    vacant_ids = db.query(VacantId).order_by(VacantId.deleted_at.desc()).all()
    
    return {
        "vacant_ids": [
            {
                "id": v.id,
                "public_id": v.public_id,
                "original_student_name": v.original_student_name,
                "deleted_at": v.deleted_at.isoformat() if v.deleted_at else None
            }
            for v in vacant_ids
        ]
    }


@router.post("/admin/generate-student-id")
async def generate_next_student_id(
    branch: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Generate the next available student ID for a specific branch or general."""
    prefix = "TH"  # Default prefix

    if branch:
        # Use branch-specific prefix
        branch_prefixes = {
            "rohini-16": "R16",
            "rohini-11": "R11",
            "gurgaon": "GGN",
            "online": "ONL"
        }
        prefix = branch_prefixes.get(branch.lower(), "TH")

    next_id = generate_public_id(db, prefix)

    return {
        "suggested_id": next_id,
        "prefix": prefix,
        "branch": branch
    }


# ============================================================================
# REWARD SYSTEM ENDPOINTS
# ============================================================================

@router.get("/rewards/summary", response_model=RewardSummaryResponse)
async def get_reward_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive reward summary for student."""
    ist_now = get_ist_now()
    current_month = ist_now.month
    current_year = ist_now.year
    month_str = f"{current_year}-{current_month:02d}"
    
    # Calculate attendance percentage for current month
    attendance_percentage = 0.0
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if profile:
        month_start = datetime(current_year, current_month, 1).replace(tzinfo=None)
        if current_month == 12:
            month_end = datetime(current_year + 1, 1, 1).replace(tzinfo=None)
        else:
            month_end = datetime(current_year, current_month + 1, 1).replace(tzinfo=None)
        
        # Get sessions for this month
        sessions = db.query(ClassSession).filter(
            ClassSession.branch == profile.branch,
            ClassSession.session_date >= month_start,
            ClassSession.session_date < month_end
        ).all()
        
        if sessions:
            session_ids = [s.id for s in sessions]
            attendance_records = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_profile_id == profile.id,
                AttendanceRecord.session_id.in_(session_ids),
                AttendanceRecord.status == "present"
            ).all()
            attendance_percentage = (len(attendance_records) / len(sessions) * 100) if sessions else 0.0
    
    # Get all badges - filter out old badge system (accuracy_king, perfect_score, speed_star)
    old_badge_types = ["accuracy_king", "perfect_score", "speed_star"]
    all_badges = db.query(Reward).filter(
        Reward.user_id == current_user.id,
        ~Reward.badge_type.in_(old_badge_types)
    ).all()
    
    # Separate badges by category
    lifetime_badges = [BadgeResponse.model_validate(b) for b in all_badges if b.is_lifetime]
    monthly_badges = [BadgeResponse.model_validate(b) for b in all_badges 
                      if not b.is_lifetime and b.month_earned == month_str]
    current_badges = lifetime_badges + monthly_badges
    
    # Calculate SUPER progress
    total_points = current_user.total_points
    chocolate_milestones = [1500, 4500, 7500, 10500, 13500, 16500, 19500]
    super_letter_milestones = [
        (3000, "S"), (6000, "U"), (9000, "P"), (12000, "E"), (15000, "R")
    ]
    special_milestones = [(18000, "mystery_gift"), (21000, "party")]
    
    # Find current letter
    current_letter = None
    for threshold, letter in reversed(super_letter_milestones):
        if total_points >= threshold:
            current_letter = letter
            break
    
    # Find next milestone
    all_milestones = []
    for milestone in chocolate_milestones:
        all_milestones.append((milestone, "chocolate"))
    for threshold, letter in super_letter_milestones:
        all_milestones.append((threshold, f"letter_{letter}"))
    for threshold, reward_type in special_milestones:
        all_milestones.append((threshold, reward_type))
    
    all_milestones.sort()
    next_milestone = None
    next_milestone_type = None
    for threshold, m_type in all_milestones:
        if total_points < threshold:
            next_milestone = threshold
            next_milestone_type = m_type
            break
    
    if not next_milestone:
        next_milestone = 21000
        next_milestone_type = "party"
    
    progress_percentage = (total_points / next_milestone * 100) if next_milestone > 0 else 0
    progress_percentage = min(100, max(0, progress_percentage))
    
    # Get unlocked rewards
    unlocked_rewards = []
    for milestone in chocolate_milestones:
        if total_points >= milestone:
            unlocked_rewards.append(f"Chocolate 🍫 ({milestone} pts)")
    for threshold, letter in super_letter_milestones:
        if total_points >= threshold:
            unlocked_rewards.append(f"SUPER Badge - {letter}")
    if total_points >= 18000:
        unlocked_rewards.append("Mystery Gift 🎁")
    if total_points >= 21000:
        unlocked_rewards.append("Party 🎉")
    
    super_progress = SuperProgress(
        current_letter=current_letter,
        current_points=total_points,
        next_milestone=next_milestone,
        next_milestone_type=next_milestone_type,
        progress_percentage=round(progress_percentage, 2),
        unlocked_rewards=unlocked_rewards
    )
    
    # Check grace skip availability
    from reward_system import can_use_grace_skip
    can_use, reason = can_use_grace_skip(db, current_user)
    
    return RewardSummaryResponse(
        total_points=total_points,
        current_streak=current_user.current_streak,
        longest_streak=current_user.longest_streak,
        attendance_percentage=round(attendance_percentage, 2),
        total_questions_attempted=current_user.total_questions_attempted or 0,
        super_progress=super_progress,
        current_badges=current_badges,
        lifetime_badges=lifetime_badges,
        monthly_badges=monthly_badges,
        can_use_grace_skip=can_use,
        grace_skip_reason=reason if not can_use else None
    )


@router.get("/rewards/badges", response_model=List[BadgeResponse])
async def get_student_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all badges (current and historical) for student."""
    # Filter out old badge system (accuracy_king, perfect_score, speed_star)
    old_badge_types = ["accuracy_king", "perfect_score", "speed_star"]
    badges = db.query(Reward).filter(
        Reward.user_id == current_user.id,
        ~Reward.badge_type.in_(old_badge_types)
    ).order_by(Reward.earned_at.desc()).all()
    return [BadgeResponse.model_validate(badge) for badge in badges]


@router.post("/rewards/grace-skip", response_model=GraceSkipResponse)
async def redeem_grace_skip(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Redeem grace skip to preserve streak."""
    from reward_system import can_use_grace_skip, use_grace_skip
    can_use, reason = can_use_grace_skip(db, current_user)
    
    if not can_use:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason
        )
    
    # Use grace skip
    success = use_grace_skip(db, current_user)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to redeem grace skip"
        )
    
    db.commit()
    
    return GraceSkipResponse(
        success=True,
        message="Grace skip redeemed successfully. Your streak has been preserved!",
        points_remaining=current_user.total_points,
        streak_preserved=True
    )


@router.get("/points/logs", response_model=PointsSummaryResponse)
async def get_points_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: Optional[int] = Query(100, ge=1, le=1000),
    offset: Optional[int] = Query(0, ge=0)
):
    """Get points transaction log with checksum verification."""
    from points_logger import get_points_summary
    
    # Get points logs
    logs = db.query(PointsLog).filter(
        PointsLog.user_id == current_user.id
    ).order_by(PointsLog.created_at.desc()).offset(offset).limit(limit).all()
    
    # Get summary with checksum
    summary = get_points_summary(db, current_user.id)
    
    return PointsSummaryResponse(
        total_points_from_logs=summary["total_points_from_logs"],
        total_points_from_user=summary["total_points_from_user"],
        match=summary["match"],
        logs=[PointsLogResponse.model_validate(log) for log in logs],
        total_entries=db.query(PointsLog).filter(PointsLog.user_id == current_user.id).count()
    )


@router.post("/admin/rewards/evaluate-monthly")
async def evaluate_monthly_badges_admin(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to manually trigger monthly badge evaluation."""
    # Lazy import to prevent startup failures
    from reward_system import (
        evaluate_attendance_badges, evaluate_tshirt_star_badges, award_leaderboard_badges
    )
    
    ist_now = get_ist_now()
    
    # If not provided, evaluate previous month
    if year is None or month is None:
        if ist_now.month == 1:
            eval_year = ist_now.year - 1
            eval_month = 12
        else:
            eval_year = ist_now.year
            eval_month = ist_now.month - 1
    else:
        eval_year = year
        eval_month = month
        if eval_month < 1 or eval_month > 12:
            raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    
    try:
        # Evaluate all monthly badges
        evaluate_attendance_badges(db, eval_year, eval_month)
        evaluate_tshirt_star_badges(db, eval_year, eval_month)
        award_leaderboard_badges(db, eval_year, eval_month)
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Monthly badges evaluated for {eval_year}-{eval_month:02d}",
            "year": eval_year,
            "month": eval_month
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate monthly badges: {str(e)}"
        )

