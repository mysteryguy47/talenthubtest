"""Gamification logic for points calculation."""
from typing import Optional




def calculate_points(
    correct_answers: int,
    total_questions: int,
    time_taken: float,
    difficulty_mode: str,
    accuracy: float,
    is_mental_math: bool = True,  # True for mental math, False for paper attempts
    attempted_questions: Optional[int] = None  # Number of questions actually attempted
) -> int:
    """
    Calculate points earned according to new reward system:
    - +1 point for each attempted question (answered, right or wrong)
    - +5 points for each correct answer
    - Total = (attempted * 1) + (correct * 5)
    
    If attempted_questions is not provided, uses total_questions as fallback.
    """
    # Use attempted_questions if provided, otherwise use total_questions
    attempted = attempted_questions if attempted_questions is not None else total_questions
    
    # Points for attempted questions
    attempted_points = attempted * 1
    
    # Points for correct answers
    correct_points = correct_answers * 5
    
    # Total points
    total_points = attempted_points + correct_points
    
    return max(0, total_points)  # Ensure no negative points








