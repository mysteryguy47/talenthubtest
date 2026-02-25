"""FastAPI main application."""
from fastapi import FastAPI, Depends, HTTPException, status, Request, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime
from timezone_utils import get_ist_now, IST_TIMEZONE
import json
import hashlib
import random
import time
from datetime import timedelta

from models import Paper, PaperAttempt, get_db, init_db, FeePlan, PointsLog, FeeAssignment, FeeTransaction, VacantId  # Import models to register them with Base.metadata
from schemas import (
    PaperCreate, PaperResponse, PaperConfig, PreviewResponse,
    GeneratedBlock, BlockConfig
)
from user_schemas import PaperAttemptCreate, PaperAttemptResponse, PaperAttemptDetailResponse, PaperAttemptSubmit
from auth import get_current_user
from models import User
from gamification import calculate_points, check_and_award_badges, update_streak, check_and_award_super_rewards
from leaderboard_service import update_leaderboard, update_weekly_leaderboard
from math_generator import generate_block
from pdf_generator import generate_pdf
from pdf_generator_v2 import generate_pdf_v2
from pdf_generator_playwright import generate_pdf_playwright
from presets import get_preset_blocks

# Lazy import of user_routes to prevent startup failures
user_router = None
try:
    from user_routes import router as user_router
    print("✅ [IMPORT] User router imported successfully")
except Exception as e:
    import traceback
    print(f"❌ [IMPORT] Failed to import user router: {str(e)}")
    print(traceback.format_exc())
    # Continue without user routes - other endpoints will still work

# Lazy import of attendance_routes
attendance_router = None
try:
    from attendance_routes import router as attendance_router
    print("✅ [IMPORT] Attendance router imported successfully")
except Exception as e:
    import traceback
    print(f"❌ [IMPORT] Failed to import attendance router: {str(e)}")
    print(traceback.format_exc())

# Lazy import of fee_routes
fee_router = None
try:
    from fee_routes import router as fee_router
    print("✅ [IMPORT] Fee router imported successfully")
except Exception as e:
    import traceback
    print(f"❌ [IMPORT] Failed to import fee router: {str(e)}")
    print(traceback.format_exc())

app = FastAPI(title="Abacus Paper Generator", version="3.0.0")

# Timeout for incomplete paper attempts (1 hour)
INCOMPLETE_ATTEMPT_TIMEOUT_SECONDS = 3600  # 1 hour

# CORS middleware
# When allow_credentials=True, cannot use allow_origins=["*"]
# Must specify explicit origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://talenthub.blackmonkey.in",
        "https://hi-test.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        # Add production origins here when deploying
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add request timing middleware
@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """Log request timing for diagnostics."""
    start_time = time.time()
    response = await call_next(request)
    elapsed = time.time() - start_time
    # Only log slow requests (>1s) or important endpoints
    if elapsed > 1.0 or request.url.path in ["/users/stats", "/users/leaderboard/overall", "/users/me", "/papers/attempt"]:
        print(f"⏱ [TIMING] {request.method} {request.url.path} took {elapsed:.2f}s")
    return response

# Add response headers middleware for COOP and security
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers including COOP for Google OAuth compatibility."""
    response = await call_next(request)
    
    # Cross-Origin-Opener-Policy: Allow Google OAuth to use postMessage
    # Using "unsafe-none" allows cross-origin window communication needed for OAuth
    response.headers["Cross-Origin-Opener-Policy"] = "unsafe-none"
    
    # Cross-Origin-Embedder-Policy: Not needed for OAuth, but set to allow embedding
    response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
    
    # Additional security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    
    return response

# Define health endpoint FIRST (before router inclusion)
# This ensures health check works even if other routes fail
@app.get("/health")
async def health_check():
    """Health check endpoint - should never fail."""
    try:
        # Check database connection
        db = next(get_db())
        db.execute(text("SELECT 1"))
        db.close()
        return {
            "status": "ok", 
            "message": "Server is running",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "degraded",
            "message": "Server is running but database connection failed",
            "database": "disconnected",
            "error": str(e)[:100]
        }

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Abacus Paper Generator API", "version": "2.0.0"}

# Include routers - only if import succeeded
if user_router:
    try:
        app.include_router(user_router)
        print("✅ [STARTUP] User router included")
    except Exception as e:
        import traceback
        print(f"❌ [STARTUP] Failed to include user router: {str(e)}")
        print(traceback.format_exc())
else:
    print("⚠️ [STARTUP] User router not available (import failed)")

if attendance_router:
    try:
        app.include_router(attendance_router)
        print("✅ [STARTUP] Attendance router included")
    except Exception as e:
        import traceback
        print(f"❌ [STARTUP] Failed to include attendance router: {str(e)}")
        print(traceback.format_exc())
else:
    print("⚠️ [STARTUP] Attendance router not available (import failed)")

if fee_router:
    try:
        app.include_router(fee_router)
        print("✅ [STARTUP] Fee router included")
    except Exception as e:
        import traceback
        print(f"❌ [STARTUP] Failed to include fee router: {str(e)}")
        print(traceback.format_exc())
else:
    print("⚠️ [STARTUP] Fee router not available (import failed)")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    try:
        print("🟢 [STARTUP] Initializing database...")
        init_db()
        print("✅ [STARTUP] Database initialized successfully")
        
        # Clean up stale incomplete attempts on startup
        try:
            db = next(get_db())
            cleaned_count = cleanup_stale_incomplete_attempts(db)
            if cleaned_count > 0:
                print(f"✅ [STARTUP] Cleaned up {cleaned_count} stale incomplete attempts")
            db.close()
        except Exception as cleanup_error:
            print(f"⚠️ [STARTUP] Failed to clean up stale attempts on startup: {cleanup_error}")
            # Don't fail startup if cleanup fails
    except Exception as e:
        import traceback
        print(f"❌ [STARTUP] Database initialization failed: {str(e)}")
        print(traceback.format_exc())
        # Don't crash the app, but log the error


# Handle validation errors (specific handler - must come before global handler)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log the validation error details for debugging
    error_details = exc.errors()
    print(f"❌ [VALIDATION] Validation error on {request.method} {request.url.path}")
    print(f"❌ [VALIDATION] Errors: {error_details}")
    
    # Try to log the request body if available
    try:
        body = await request.body()
        if body:
            body_str = body.decode('utf-8')[:500]  # Limit to first 500 chars
            print(f"❌ [VALIDATION] Request body: {body_str}")
        else:
            print(f"❌ [VALIDATION] Request body is empty")
    except Exception as e:
        print(f"❌ [VALIDATION] Could not read request body: {str(e)}")
    
    # Log headers that might affect parsing
    content_type = request.headers.get("content-type", "not set")
    print(f"❌ [VALIDATION] Content-Type: {content_type}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": error_details,
            "message": "Validation error: Please check your request format. Ensure 'credential' or 'token' field is provided with a valid Google OAuth token."
        }
    )

# Global exception handler - ensures ALL errors return JSON (must come last)
# This prevents hard socket drops and ERR_EMPTY_RESPONSE errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to ensure all errors return JSON and prevent socket drops."""
    import traceback
    
    # Handle HTTPException (already properly formatted by FastAPI)
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                "message": exc.detail if isinstance(exc.detail, str) else "An error occurred"
            }
        )
    
    # Handle validation errors (shouldn't reach here, but just in case)
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "detail": exc.errors(),
                "message": "Validation error: Please check your request format"
            }
        )
    
    # Handle all other exceptions
    error_msg = str(exc) if exc else "Internal server error"
    traceback_str = traceback.format_exc()
    
    # Enhanced error logging to help diagnose issues
    print("🔥 UNHANDLED ERROR:", exc)
    print(f"🔥 [GLOBAL_ERROR] Path: {request.url.path}")
    print(f"🔥 [GLOBAL_ERROR] Method: {request.method}")
    traceback.print_exc()
    
    # Return JSON error response - this prevents socket drops
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": "An internal server error occurred"
        }
    )


@app.get("/papers", response_model=List[PaperResponse])
async def list_papers(db: Session = Depends(get_db)):
    """Get all papers."""
    papers = db.query(Paper).order_by(Paper.created_at.desc()).all()
    return papers


# IMPORTANT: This route must come BEFORE /papers/{paper_id} to avoid route conflicts
def cleanup_stale_incomplete_attempts(db: Session, user_id: int = None):
    """Clean up incomplete attempts that are older than the timeout."""
    try:
        ist_now = get_ist_now()
        timeout_threshold = ist_now - timedelta(seconds=INCOMPLETE_ATTEMPT_TIMEOUT_SECONDS)
        
        query = db.query(PaperAttempt).filter(
            PaperAttempt.completed_at.is_(None),  # Only incomplete attempts
            PaperAttempt.started_at < timeout_threshold.replace(tzinfo=None)  # Older than timeout
        )
        
        if user_id:
            query = query.filter(PaperAttempt.user_id == user_id)
        
        stale_attempts = query.all()
        
        if stale_attempts:
            print(f"🧹 [CLEANUP] Found {len(stale_attempts)} stale incomplete attempts to clean up")
            for attempt in stale_attempts:
                # Mark as completed with zero score (abandoned)
                attempt.completed_at = ist_now.replace(tzinfo=None)
                attempt.correct_answers = 0
                attempt.wrong_answers = 0
                attempt.accuracy = 0.0
                attempt.score = 0
                attempt.points_earned = 0
                print(f"🧹 [CLEANUP] Marked attempt {attempt.id} as abandoned")
            
            db.commit()
            print(f"✅ [CLEANUP] Cleaned up {len(stale_attempts)} stale attempts")
        
        return len(stale_attempts)
    except Exception as e:
        print(f"❌ [CLEANUP] Error cleaning up stale attempts: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return 0


@app.get("/papers/attempts", response_model=List[PaperAttemptResponse])
async def get_paper_attempts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100)
):
    """Get user's paper attempt history. Only latest 10 attempts are stored."""
    try:
        # Clean up stale incomplete attempts for this user
        cleanup_stale_incomplete_attempts(db, user_id=current_user.id)
        
        attempts = db.query(PaperAttempt).filter(
            PaperAttempt.user_id == current_user.id
        ).order_by(PaperAttempt.started_at.desc()).limit(limit).all()
        
        print(f"✅ [PAPER_ATTEMPTS] Found {len(attempts)} attempts for user {current_user.id}")
        
        # Validate and convert each attempt
        result = []
        for attempt in attempts:
            try:
                validated = PaperAttemptResponse.model_validate(attempt)
                result.append(validated)
            except Exception as e:
                print(f"❌ [PAPER_ATTEMPTS] Error validating attempt {attempt.id}: {e}")
                import traceback
                traceback.print_exc()
                # Skip invalid attempts but continue processing others
                continue
        
        print(f"✅ [PAPER_ATTEMPTS] Returning {len(result)} validated attempts")
        return result
    except Exception as e:
        print(f"❌ [PAPER_ATTEMPTS] Error in get_paper_attempts: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get paper attempts: {str(e)}")


@app.get("/papers/{paper_id}", response_model=PaperResponse)
async def get_paper(paper_id: int, db: Session = Depends(get_db)):
    """Get a single paper by ID."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@app.post("/papers", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def create_paper(paper_data: PaperCreate, db: Session = Depends(get_db)):
    """Create a new paper."""
    # If using preset level, ensure blocks are populated
    config = paper_data.config
    if paper_data.level != "Custom" and (not config.blocks or len(config.blocks) == 0):
        config.blocks = get_preset_blocks(paper_data.level)
    
    paper = Paper(
        title=paper_data.title,
        level=paper_data.level,
        config=config.model_dump()
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper


@app.get("/presets/{level}")
async def get_preset_blocks(level: str):
    """Get preset blocks for a given level."""
    try:
        from presets import get_preset_blocks
        blocks = get_preset_blocks(level)
        # Convert BlockConfig to dict for JSON serialization
        return [block.model_dump() for block in blocks]
    except Exception as e:
        import traceback
        error_msg = f"Failed to get preset blocks for {level}: {str(e)}"
        print(f"❌ [PRESETS] {error_msg}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_msg)


def get_level_display_name(level: str) -> str:
    """Convert level code to display name."""
    if level == "Custom":
        return ""
    if level.startswith("AB-"):
        try:
            level_num = int(level.split("-")[1])
            if 1 <= level_num <= 6:
                return f"Basic Level {level_num}"
            elif 7 <= level_num <= 10:
                return f"Advanced Level {level_num}"
        except (ValueError, IndexError):
            pass
    # Fallback: return level as-is if format is unexpected
    return level


@app.post("/papers/preview", response_model=PreviewResponse)
async def preview_paper(config: PaperConfig):
    """Generate preview of questions."""
    try:
        print(f"Received preview request: level={config.level}, title={config.title}, blocks={len(config.blocks)}")

        # Resolve blocks (Preset vs Custom)
        blocks = config.blocks
        if config.level != "Custom" and (not blocks or len(blocks) == 0):
            blocks = get_preset_blocks(config.level)
        
        # Update title to include level name if using presets (for preview display)
        if config.level != "Custom":
            level_display_name = get_level_display_name(config.level)
            if level_display_name and level_display_name not in config.title:
                config.title = f"{config.title} - {level_display_name}"

        if not blocks or len(blocks) == 0:
            raise HTTPException(status_code=400, detail="At least one question block is required")

        print(f"Using {len(blocks)} blocks")
        for i, block in enumerate(blocks):
            print(f"Block {i}: id={block.id}, type={block.type}, count={block.count}, constraints={block.constraints}")

        # Generate a random seed for preview to ensure different questions each time
        # The seed will be returned and can be used for PDF generation to get the same questions
        # Use timestamp + random to ensure uniqueness
        seed = int((time.time() * 1000) % (2**31)) + random.randint(1, 1000000)
        seed = seed % (2**31)  # Keep it within int32 range

        print(f"Using seed: {seed}")

        question_id_counter = 1
        generated_blocks = []

        for block in blocks:
            try:
                print(f"Generating block: {block.id}, type: {block.type}, count: {block.count}")
                gen_block = generate_block(block, question_id_counter, seed)
                print(f"Generated {len(gen_block.questions)} questions for block {block.id}")
                generated_blocks.append(gen_block)
                question_id_counter += block.count
            except Exception as e:
                import traceback
                error_detail = f"Failed to generate block '{block.id}': {str(e)}"
                print(f"ERROR: {error_detail}")
                print(traceback.format_exc())
                raise HTTPException(
                    status_code=500,
                    detail=error_detail
                )

        print(f"Successfully generated {len(generated_blocks)} blocks")
        return PreviewResponse(blocks=generated_blocks, seed=seed)
    except HTTPException:
        raise
    except ValueError as e:
        # Pydantic validation errors
        error_msg = f"Validation error: {str(e)}"
        print(f"Validation error: {error_msg}")
        raise HTTPException(
            status_code=422,
            detail=error_msg
        )
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback_str = traceback.format_exc()
        print(f"Preview error: {error_msg}\n{traceback_str}")  # Log to console
        # Write to file for debugging
        with open("/tmp/preview_error.log", "w") as f:
            f.write(f"Error: {error_msg}\n{traceback_str}")
        raise HTTPException(
            status_code=500,
            detail=f"Preview generation error: {error_msg}"
        )


@app.post("/papers/generate-pdf")
async def generate_pdf_endpoint(
    request_data: dict
):
    """Generate PDF from config.
    
    Parameters:
    - withAnswers: Include answers in questions
    - answersOnly: Generate only answer key
    - includeSeparateAnswerKey: Generate question paper + separate answer key page
    """
    config = PaperConfig(**request_data.get("config", {}))
    # Handle both camelCase and snake_case
    with_answers = request_data.get("with_answers") or request_data.get("withAnswers", False)
    answers_only = request_data.get("answers_only") or request_data.get("answersOnly", False)
    include_separate_answer_key = request_data.get("include_separate_answer_key") or request_data.get("includeSeparateAnswerKey", False)
    seed = request_data.get("seed")
    generated_blocks_data = request_data.get("generated_blocks")
    
    # Resolve blocks
    blocks = config.blocks
    if config.level != "Custom" and (not blocks or len(blocks) == 0):
        blocks = get_preset_blocks(config.level)
    
    # Update title to include level name if using presets
    if config.level != "Custom":
        level_display_name = get_level_display_name(config.level)
        if level_display_name and level_display_name not in config.title:
            config.title = f"{config.title} - {level_display_name}"
    
    # Use provided blocks or generate new ones
    if generated_blocks_data:
        final_blocks = [GeneratedBlock(**block) for block in generated_blocks_data]
    else:
        # Generate with seed
        if seed is None:
            config_json = json.dumps(config.model_dump(), sort_keys=True)
            config_hash = int(hashlib.md5(config_json.encode()).hexdigest(), 16)
            seed = abs(config_hash) % (2**31)
        
        question_id_counter = 1
        final_blocks = []
        for block in blocks:
            gen_block = generate_block(block, question_id_counter, seed)
            final_blocks.append(gen_block)
            question_id_counter += block.count
    
    # Generate PDF using Playwright (pixel-perfect). If Playwright fails (common on machines without browser deps),
    # fall back to ReportLab (generate_pdf_v2) so PDF download still works.
    try:
        pdf_buffer = await generate_pdf_playwright(config, final_blocks, with_answers, answers_only, include_separate_answer_key)
        if answers_only:
            filename = f"{config.title.replace(' ', '_')}_answers_only.pdf"
        elif with_answers:
            filename = f"{config.title.replace(' ', '_')}_answer_key.pdf"
        elif include_separate_answer_key:
            filename = f"{config.title.replace(' ', '_')}_with_answer_key.pdf"
        else:
            filename = f"{config.title.replace(' ', '_')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback_str = traceback.format_exc()
        print(f"PDF generation error (Playwright): {error_msg}\n{traceback_str}")
        try:
            # Fallback: ReportLab generator (no separate answer-key support in v2)
            if include_separate_answer_key:
                raise HTTPException(status_code=500, detail="Failed to generate PDF (Playwright). Separate answer key requires Playwright.")
            pdf_buffer = generate_pdf_v2(config, final_blocks, with_answers=with_answers, answers_only=answers_only)
            filename = (
                f"{config.title.replace(' ', '_')}_answers_only.pdf" if answers_only
                else f"{config.title.replace(' ', '_')}_answer_key.pdf" if with_answers
                else f"{config.title.replace(' ', '_')}.pdf"
            )
            return StreamingResponse(
                pdf_buffer,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        except HTTPException:
            raise
        except Exception as fallback_e:
            raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {error_msg} (fallback also failed: {fallback_e})")


@app.post("/papers/{paper_id}/download")
async def download_paper_pdf(
    paper_id: int,
    with_answers: bool = False,
    db: Session = Depends(get_db)
):
    """Download PDF for a saved paper."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    # Reconstruct config from stored data
    config = PaperConfig(**paper.config)
    
    # Generate questions (regenerate each time)
    config_json = json.dumps(paper.config, sort_keys=True)
    config_hash = int(hashlib.md5(config_json.encode()).hexdigest(), 16)
    seed = abs(config_hash) % (2**31)
    
    question_id_counter = 1
    generated_blocks = []
    for block_config_dict in config.blocks:
        block_config = BlockConfig(**block_config_dict)
        gen_block = generate_block(block_config, question_id_counter, seed)
        generated_blocks.append(gen_block)
        question_id_counter += block_config.count
    
    # Generate PDF using Playwright (industry standard - pixel perfect)
    try:
        pdf_buffer = await generate_pdf_playwright(config, generated_blocks, with_answers, False)
        filename = f"{paper.title.replace(' ', '_')}{'_answers' if with_answers else ''}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@app.get("/papers/attempt/count")
async def get_paper_attempt_count(
    seed: int = Query(..., description="Paper seed"),
    paper_title: str = Query(..., description="Paper title"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the number of attempts for a specific paper. Returns count and whether re-attempt is allowed."""
    count = db.query(PaperAttempt).filter(
        PaperAttempt.user_id == current_user.id,
        PaperAttempt.seed == seed,
        PaperAttempt.paper_title == paper_title
    ).count()
    
    return {
        "count": count,
        "can_reattempt": count < 2,
        "max_attempts": 2
    }


@app.post("/papers/attempt", response_model=PaperAttemptResponse)
async def start_paper_attempt(
    attempt_data: PaperAttemptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new paper attempt. Maximum 2 attempts per paper (1 fresh + 1 re-attempt)."""
    # Check how many attempts this user has for this paper (same seed = same paper)
    existing_attempts = db.query(PaperAttempt).filter(
        PaperAttempt.user_id == current_user.id,
        PaperAttempt.seed == attempt_data.seed,
        PaperAttempt.paper_title == attempt_data.paper_title
    ).count()
    
    if existing_attempts >= 2:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum attempts reached. You can only attempt this paper twice (1 fresh attempt + 1 re-attempt)."
        )
    
    # Calculate total questions
    total_questions = sum(len(block.get("questions", [])) for block in attempt_data.generated_blocks)
    
    # Create paper attempt
    paper_attempt = PaperAttempt(
        user_id=current_user.id,
        paper_title=attempt_data.paper_title,
        paper_level=attempt_data.paper_level,
        paper_config=attempt_data.paper_config,
        generated_blocks=attempt_data.generated_blocks,
        seed=attempt_data.seed,
        total_questions=total_questions,
        answers=attempt_data.answers or {}
    )
    db.add(paper_attempt)
    db.commit()
    db.refresh(paper_attempt)
    
    return PaperAttemptResponse.model_validate(paper_attempt)


def process_paper_attempt_async(attempt_id: int, user_id: int, correct_count: int, wrong_count: int, 
                                total: int, accuracy: float, score: int, time_taken: float, 
                                attempted_questions: int):
    """Background task to process paper attempt - updates stats, badges, leaderboards.
    Note: Points are already updated in main request, so we don't update them here."""
    from models import get_db, User, StudentProfile, PracticeSession
    from reward_system import update_user_question_count
    from gamification import update_streak, check_and_award_super_rewards, check_and_award_badges
    from leaderboard_service import update_leaderboard, update_weekly_leaderboard
    
    start_time = time.time()
    db = next(get_db())
    try:
        # Get fresh user from DB
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            print(f"⚠️ [BG_TASK] User not found for user_id={user_id}")
            return
        
        # Update question count (points already updated in main request)
        update_user_question_count(db, user, attempted_questions)
        
        # Update streak for Vedic Maths students (only papers count)
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if profile and profile.course == "Vedic Maths":
            update_streak(db, user, questions_practiced_today=attempted_questions)
        
        # Check for SUPER badge rewards
        check_and_award_super_rewards(db, user)
        
        # Check for lifetime badges (new reward system)
        from reward_system import check_and_award_lifetime_badges
        check_and_award_lifetime_badges(db, user)
        
        # Note: Monthly badges (accuracy_ace, perfect_precision, comeback_kid) are evaluated
        # at end of month via monthly_badge_evaluation.py, not per-attempt
        
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
        print(f"✅ [BG_TASK] Processed attempt {attempt_id} in {elapsed:.2f}s")
    except Exception as e:
        db.rollback()
        import traceback
        print(f"❌ [BG_TASK] Error processing attempt {attempt_id}: {e}")
        print(traceback.format_exc())
    finally:
        db.close()


@app.put("/papers/attempt/{attempt_id}", response_model=PaperAttemptResponse)
async def submit_paper_attempt(
    attempt_id: int,
    submit_data: PaperAttemptSubmit,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    answers = submit_data.answers
    time_taken = submit_data.time_taken
    """Submit answers for a paper attempt and calculate results."""
    request_start = time.time()
    try:
        paper_attempt = db.query(PaperAttempt).filter(
            PaperAttempt.id == attempt_id,
            PaperAttempt.user_id == current_user.id
        ).first()
        
        if not paper_attempt:
            raise HTTPException(status_code=404, detail="Paper attempt not found")
        
        print(f"🟡 [SUBMIT] Attempt {attempt_id} found: completed_at = {paper_attempt.completed_at}, user_id = {paper_attempt.user_id}")
        
        # Check if attempt is already completed - but allow if it was just created (within last second)
        # This handles race conditions where the same attempt might be submitted twice
        if paper_attempt.completed_at:
            # Check if it was completed very recently (within 2 seconds) - might be a duplicate submission
            time_since_completion = (get_ist_now() - paper_attempt.completed_at).total_seconds()
            print(f"🟡 [SUBMIT] Attempt {attempt_id} was completed {time_since_completion:.2f}s ago")
            if time_since_completion > 2:
                print(f"❌ [SUBMIT] Attempt {attempt_id} was completed too long ago, rejecting submission")
                raise HTTPException(status_code=400, detail="Attempt already completed")
            else:
                # Very recent completion - return the existing result instead of error
                print(f"⚠️ [SUBMIT] Attempt {attempt_id} was completed {time_since_completion:.2f}s ago, returning existing result")
                return PaperAttemptResponse.model_validate(paper_attempt)
        
        # Calculate results
        generated_blocks = paper_attempt.generated_blocks
        correct_count = 0
        wrong_count = 0
        
        # Flatten all questions from all blocks
        all_questions = []
        for block in generated_blocks:
            for question in block.get("questions", []):
                all_questions.append(question)
        
        # Check answers - count all questions, including unanswered ones
        for question in all_questions:
            try:
                question_id = question.get("id")
                user_answer = answers.get(str(question_id)) or answers.get(question_id)
                correct_answer = question.get("answer")
                
                if user_answer is not None and correct_answer is not None:
                    # Compare answers - handle large integers as strings to avoid precision loss
                    try:
                        user_answer_str = str(user_answer).strip()
                        correct_answer_str = str(correct_answer)
                        user_has_decimal = '.' in user_answer_str or 'e' in user_answer_str.lower()
                        correct_has_decimal = '.' in correct_answer_str or 'e' in correct_answer_str.lower()
                        
                        if not user_has_decimal and not correct_has_decimal:
                            # Both are integers - compare as strings to preserve precision
                            if user_answer_str == correct_answer_str:
                                correct_count += 1
                            else:
                                wrong_count += 1
                        else:
                            # At least one has decimals - use float comparison with tolerance
                            if abs(float(user_answer) - float(correct_answer)) < 0.01:
                                correct_count += 1
                            else:
                                wrong_count += 1
                    except (ValueError, TypeError) as e:
                        print(f"⚠️ [SUBMIT] Error comparing answers for question {question_id}: {e}")
                        wrong_count += 1
                # Unattempted questions are not counted as wrong - they are separate
            except Exception as e:
                print(f"⚠️ [SUBMIT] Error processing question: {e}")
                # Count as wrong if we can't process it
                wrong_count += 1
                continue
        
        # Calculate accuracy and score
        total = paper_attempt.total_questions
        accuracy = (correct_count / total * 100) if total > 0 else 0
        score = correct_count
        
        # Calculate attempted questions (answered questions, right or wrong)
        attempted_questions = correct_count + wrong_count
        
        # Calculate points: +1 per attempted, +5 per correct
        points_earned = calculate_points(
            correct_answers=correct_count,
            total_questions=total,
            time_taken=time_taken,
            difficulty_mode="custom",  # Papers are custom
            accuracy=accuracy,
            is_mental_math=False,  # Paper attempt
            attempted_questions=attempted_questions
        )
        
        # Update attempt
        paper_attempt.answers = answers
        paper_attempt.correct_answers = correct_count
        paper_attempt.wrong_answers = wrong_count
        paper_attempt.accuracy = accuracy
        paper_attempt.score = score
        paper_attempt.time_taken = time_taken
        paper_attempt.points_earned = points_earned
        # Store completed_at as naive datetime (database requirement) - it's IST time
        paper_attempt.completed_at = get_ist_now().replace(tzinfo=None)
        
        # Update user points immediately (needed for response)
        current_user.total_points += points_earned
        
        # Log points transaction
        from points_logger import log_points
        log_points(
            db=db,
            user=current_user,
            points=points_earned,
            source_type="paper_attempt",
            description=f"Practice paper: {paper_attempt.paper_title} ({paper_attempt.paper_level})",
            source_id=paper_attempt.id,
            extra_data={
                "paper_title": paper_attempt.paper_title,
                "paper_level": paper_attempt.paper_level,
                "correct_answers": correct_count,
                "wrong_answers": wrong_count,
                "attempted_questions": attempted_questions,
                "total_questions": total,
                "accuracy": accuracy
            }
        )
        
        from reward_system import update_user_question_count
        update_user_question_count(db, current_user, attempted_questions)
        
        db.commit()
        db.refresh(paper_attempt)
        db.refresh(current_user)
        
        # Schedule heavy operations in background (points already updated above)
        background_tasks.add_task(
            process_paper_attempt_async,
            attempt_id=attempt_id,
            user_id=current_user.id,
            correct_count=correct_count,
            wrong_count=wrong_count,
            total=total,
            accuracy=accuracy,
            score=score,
            time_taken=time_taken,
            attempted_questions=attempted_questions
        )
        
        elapsed = time.time() - request_start
        print(f"⏱ [SUBMIT] PUT /papers/attempt/{attempt_id} took {elapsed:.2f}s (fast path)")
        
        return PaperAttemptResponse.model_validate(paper_attempt)
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Rollback transaction on error
        db.rollback()
        import traceback
        error_msg = str(e)
        traceback_str = traceback.format_exc()
        print(f"❌ [PAPER ATTEMPT] Error submitting paper attempt: {error_msg}")
        print(traceback_str)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit paper attempt: {error_msg}"
        )


@app.get("/papers/attempt/{attempt_id}", response_model=PaperAttemptDetailResponse)
async def get_paper_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a paper attempt."""
    paper_attempt = db.query(PaperAttempt).filter(
        PaperAttempt.id == attempt_id,
        PaperAttempt.user_id == current_user.id
    ).first()
    
    if not paper_attempt:
        raise HTTPException(status_code=404, detail="Paper attempt not found")
    
    # If attempt is incomplete and stale, mark it as abandoned
    if not paper_attempt.completed_at:
        ist_now = get_ist_now()
        started_at = paper_attempt.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=IST_TIMEZONE)
        
        time_elapsed = (ist_now - started_at).total_seconds()
        if time_elapsed > INCOMPLETE_ATTEMPT_TIMEOUT_SECONDS:
            # Mark as abandoned
            paper_attempt.completed_at = ist_now.replace(tzinfo=None)
            paper_attempt.correct_answers = 0
            paper_attempt.wrong_answers = 0
            paper_attempt.accuracy = 0.0
            paper_attempt.score = 0
            paper_attempt.points_earned = 0
            db.commit()
            db.refresh(paper_attempt)
            print(f"🧹 [CLEANUP] Marked stale attempt {attempt_id} as abandoned when accessed")
    
    return PaperAttemptDetailResponse.model_validate(paper_attempt)


@app.get("/papers/attempt/{attempt_id}/validate")
async def validate_paper_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate if a paper attempt is still valid for continuation.
    
    Returns:
    - valid: bool - Whether the attempt is valid to continue
    - reason: str - Reason if invalid (e.g., "completed", "expired", "not_found")
    - expires_at: Optional[datetime] - When the attempt will expire (if incomplete)
    """
    paper_attempt = db.query(PaperAttempt).filter(
        PaperAttempt.id == attempt_id,
        PaperAttempt.user_id == current_user.id
    ).first()
    
    if not paper_attempt:
        return {
            "valid": False,
            "reason": "not_found",
            "expires_at": None
        }
    
    # If already completed, cannot continue
    if paper_attempt.completed_at:
        return {
            "valid": False,
            "reason": "completed",
            "expires_at": None
        }
    
    # Check if attempt is stale (older than timeout)
    ist_now = get_ist_now()
    # Convert started_at to timezone-aware if it's naive
    started_at = paper_attempt.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=IST_TIMEZONE)
    
    time_elapsed = (ist_now - started_at).total_seconds()
    
    if time_elapsed > INCOMPLETE_ATTEMPT_TIMEOUT_SECONDS:
        return {
            "valid": False,
            "reason": "expired",
            "expires_at": None
        }
    
    # Calculate when it will expire
    expires_at = started_at + timedelta(seconds=INCOMPLETE_ATTEMPT_TIMEOUT_SECONDS)
    
    return {
        "valid": True,
        "reason": None,
        "expires_at": expires_at.replace(tzinfo=None).isoformat() if expires_at else None
    }

