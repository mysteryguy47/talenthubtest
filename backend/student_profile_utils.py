"""Utility functions for student profile management."""
from typing import List, Optional, Tuple


# Level definitions based on course and level type
LEVEL_DEFINITIONS = {
    "Abacus": {
        "Regular": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        "Junior": ["1A", "1B", "2", "3", "4"]
    },
    "Vedic Maths": {
        "Regular": ["1", "2", "3", "4"],
        "Junior": ["1", "2", "3", "4"]
    },
    "Handwriting": {
        "Regular": ["English", "Hindi"],
        "Junior": ["English", "Hindi"]
    }
}

# Valid courses
VALID_COURSES = ["Abacus", "Vedic Maths", "Handwriting"]

# Valid branches
VALID_BRANCHES = ["Rohini-16", "Rohini-11", "Gurgaon", "Online"]

# Valid statuses
VALID_STATUSES = ["active", "inactive", "closed"]

# Valid level types
VALID_LEVEL_TYPES = ["Regular", "Junior"]


def get_valid_levels(course: Optional[str], level_type: Optional[str]) -> List[str]:
    """
    Get valid levels for a given course and level type.
    
    Args:
        course: The course name (Abacus, Vedic Maths, Handwriting)
        level_type: The level type (Regular or Junior)
    
    Returns:
        List of valid level strings
    """
    if not course or not level_type:
        return []
    
    course = course.strip()
    level_type = level_type.strip()
    
    if course not in LEVEL_DEFINITIONS:
        return []
    
    if level_type not in LEVEL_DEFINITIONS[course]:
        return []
    
    return LEVEL_DEFINITIONS[course][level_type]


def validate_level(course: Optional[str], level_type: Optional[str], level: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Validate if a level is valid for the given course and level type.
    
    Args:
        course: The course name
        level_type: The level type (Regular or Junior)
        level: The level to validate
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not course:
        return (True, None)  # Allow empty course
    
    if not level_type:
        return (True, None)  # Allow empty level_type
    
    if not level:
        return (True, None)  # Allow empty level
    
    valid_levels = get_valid_levels(course, level_type)
    
    if not valid_levels:
        return (False, f"Invalid course '{course}' or level type '{level_type}'")
    
    if level not in valid_levels:
        return (False, f"Level '{level}' is not valid for {course} {level_type}. Valid levels: {', '.join(valid_levels)}")
    
    return (True, None)


def validate_course(course: Optional[str]) -> Tuple[bool, Optional[str]]:
    """Validate course name."""
    if not course:
        return (True, None)
    
    if course not in VALID_COURSES:
        return (False, f"Invalid course '{course}'. Valid courses: {', '.join(VALID_COURSES)}")
    
    return (True, None)


def validate_branch(branch: Optional[str]) -> Tuple[bool, Optional[str]]:
    """Validate branch name."""
    if not branch:
        return (True, None)
    
    if branch not in VALID_BRANCHES:
        return (False, f"Invalid branch '{branch}'. Valid branches: {', '.join(VALID_BRANCHES)}")
    
    return (True, None)


def validate_status(status: str) -> Tuple[bool, Optional[str]]:
    """Validate status."""
    if status not in VALID_STATUSES:
        return (False, f"Invalid status '{status}'. Valid statuses: {', '.join(VALID_STATUSES)}")
    
    return (True, None)


def validate_level_type(level_type: Optional[str]) -> Tuple[bool, Optional[str]]:
    """Validate level type."""
    if not level_type:
        return (True, None)
    
    if level_type not in VALID_LEVEL_TYPES:
        return (False, f"Invalid level type '{level_type}'. Valid types: {', '.join(VALID_LEVEL_TYPES)}")
    
    return (True, None)


def generate_public_id(db, prefix: str = "TH") -> str:
    """
    Generate the next available TH-XXXX public ID.

    Always uses the "TH" prefix regardless of the prefix argument (branch-based
    prefixes are no longer supported).  Finds the lowest number >= 1 that is not
    already assigned to any StudentProfile, so the sequence has no gaps.

    Returns:
        Next available public ID string, e.g. "TH-0005"
    """
    from models import StudentProfile, VacantId

    # Collect all numbers already in use (any TH-xxxx profile)
    existing = db.query(StudentProfile.public_id).filter(
        StudentProfile.public_id.isnot(None),
        StudentProfile.public_id.like("TH-%"),
    ).all()
    used: set = set()
    for (pid,) in existing:
        try:
            used.add(int(pid.split("-")[1]))
        except (ValueError, IndexError):
            pass

    # Find the smallest unused number >= 1
    next_number = 1
    while next_number in used:
        next_number += 1

    return f"TH-{next_number:04d}"


def generate_branch_specific_id(db, branch: str = None, prefix: str = None) -> str:
    """Kept for backwards compatibility — always delegates to generate_public_id (TH prefix)."""
    return generate_public_id(db)



