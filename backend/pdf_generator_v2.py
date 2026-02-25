"""
Redesigned PDF Generator - Matches Preview Layout Exactly
=========================================================

This PDF generator is designed to match the preview layout exactly:
- Vertical questions: 10-column table layout (matching preview)
- Horizontal questions: Single column with proper spacing
- Exact spacing, margins, padding, and typography
- Professional, clean, exam-ready format

Design Philosophy:
------------------
1. Match Preview Structure: The PDF should look identical to what users see in preview
2. Table-Based Layout: Use ReportLab tables for precise control
3. Consistent Spacing: Match CSS padding/margins (p-1 = 2.83mm, p-1.5 = 4.25mm)
4. Professional Typography: Clean fonts, proper sizing, readable
5. Excel-Compatible: Table structure allows easy import to Excel

Layout Specifications:
----------------------
- Page: A4 (210mm x 297mm)
- Margins: 15mm all sides (professional exam format)
- Vertical Questions: 10 columns, each 10% width
- Horizontal Questions: Full width, single column
- Cell Padding: 2.83mm (matching p-1) or 4.25mm (matching p-1.5)
- Border: 0.5pt gray (#E5E7EB = border-gray-200)
- Question Numbers: Blue (#1E40AF = text-blue-700), Bold, 12pt
- Question Text: Gray (#1F2937 = text-gray-800), Monospace, 12pt
- Answer Text: Gray (#4B5563 = text-gray-600), Monospace, 11pt, Bold
- Operator: Blue (#2563EB = text-blue-600), Bold, 12pt
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.platypus.flowables import HRFlowable, Flowable
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.platypus.frames import Frame
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from io import BytesIO
from typing import List, Optional
from schemas import PaperConfig, GeneratedBlock

# ========== DESIGN CONSTANTS (Matching Preview) ==========

# Page Setup
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 12 * mm  # Reduced for more content space
USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN
USABLE_HEIGHT = PAGE_HEIGHT - 2 * MARGIN

# Colors (matching Tailwind CSS)
COLOR_BLUE_700 = colors.HexColor('#1E40AF')  # Question numbers
COLOR_BLUE_600 = colors.HexColor('#2563EB')  # Operators
COLOR_GRAY_800 = colors.HexColor('#1F2937')  # Question text
COLOR_GRAY_600 = colors.HexColor('#4B5563')  # Answer text
COLOR_GRAY_400 = colors.HexColor('#9CA3AF')  # Borders (line)
COLOR_GRAY_200 = colors.HexColor('#E5E7EB')  # Cell borders
COLOR_WHITE = colors.white

# Typography
FONT_NAME = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_MONO = "Courier"  # Monospace for numbers

# Font Sizes (optimized for compact layout)
FONT_SIZE_TITLE = 16  # Reduced from 18
FONT_SIZE_SECTION = 12  # Reduced from 14
FONT_SIZE_QUESTION_NUM = 11  # Reduced from 12
FONT_SIZE_QUESTION_TEXT = 10  # Reduced from 12
FONT_SIZE_ANSWER = 10  # Reduced from 11
FONT_SIZE_INSTRUCTIONS = 9  # Reduced from 10

# Spacing (reduced for compact layout)
CELL_PADDING_SMALL = 1.5 * mm  # Reduced from 2.83mm
CELL_PADDING_MEDIUM = 2 * mm  # Reduced from 4.25mm
GAP_BETWEEN_QUESTIONS = 2 * mm  # Reduced from 4mm
SPACE_AFTER_TITLE = 4 * mm  # Reduced from 8mm
SPACE_AFTER_SECTION = 3 * mm  # Reduced from 6mm
SPACE_BETWEEN_BLOCKS = 4 * mm  # Reduced from 8mm

# Table Layout
VERTICAL_COLUMNS = 10  # 10 questions per row for vertical format
VERTICAL_COLUMN_WIDTH = USABLE_WIDTH / VERTICAL_COLUMNS
BORDER_WIDTH = 0.5  # Thin borders for cells
BLOCK_BORDER_WIDTH = 2.0  # Thick border for blocks (differentiating factor)
SERIAL_COLUMN_WIDTH = 12 * mm  # Increased from 8mm to prevent wrapping

# Line Height
LINE_HEIGHT_TIGHT = 1.1  # Reduced for compact layout
LINE_HEIGHT_NORMAL = 1.3  # Reduced


def format_number(num: float) -> str:
    """Format number without scientific notation (matching frontend formatNumber)."""
    if isinstance(num, float) and num % 1 == 0:
        return str(int(num))
    
    # Format decimals nicely
    if isinstance(num, float) and num % 1 != 0:
        # For 1 decimal place
        if abs(num * 10 - round(num * 10)) < 0.001:
            return f"{num:.1f}"
        # For 2 decimal places
        return f"{num:.2f}".rstrip('0').rstrip('.')
    
    return str(num)


def create_paragraph_style(name: str, font_name: str, font_size: float, 
                          text_color: colors.Color, alignment: int = TA_LEFT,
                          leading: float = None) -> ParagraphStyle:
    """Create a paragraph style matching preview typography."""
    styles = getSampleStyleSheet()
    leading = leading or (font_size * LINE_HEIGHT_NORMAL)
    
    style = ParagraphStyle(
        name=name,
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=font_size,
        textColor=text_color,
        alignment=alignment,
        leading=leading,
        spaceAfter=0,
        spaceBefore=0,
    )
    return style


def render_vertical_questions_table(block: GeneratedBlock, 
                                   question_counter: int,
                                   with_answers: bool = False) -> Table:
    """
    Render vertical questions in 10-column table format (matching preview).
    
    Preview structure:
    - Row 1: Serial numbers (10 columns)
    - Rows 2-N: Operands (one row per operand)
    - Line row: Horizontal line
    - Answer row: Answers (if with_answers)
    
    Args:
        block: Single block containing vertical questions
        question_counter: Starting question number
        with_answers: Whether to show answers
    """
    # Collect all vertical questions from the block
    # Note: This function is called with chunks of 10 questions, so we use all questions passed
    all_questions = []
    for q in block.questions:
        if getattr(q, 'isVertical', getattr(q, 'is_vertical', False)):
            all_questions.append(q)
    
    if not all_questions:
        return None
    
    # Use all questions (chunks are already limited to 10 outside this function)
    questions_to_render = all_questions
    
    if not questions_to_render:
        return None
    
    # Calculate max operands across questions to render
    max_operands = max(len(q.operands) for q in questions_to_render) if questions_to_render else 0
    
    if max_operands == 0:
        return None
    
    # Build table data
    table_data = []
    
    # Row 1: Serial numbers
    serial_row = []
    for i in range(VERTICAL_COLUMNS):
        if i < len(questions_to_render):
            q = questions_to_render[i]
            serial_style = create_paragraph_style(
                "serial", FONT_BOLD, FONT_SIZE_QUESTION_NUM, COLOR_BLUE_700
            )
            serial_row.append(Paragraph(f"{q.id}.", serial_style))
        else:
            serial_row.append("")  # Empty cell
    table_data.append(serial_row)
    
    # Pre-check which questions are decimal (do this once per question, not per operand)
    question_is_decimal = {}
    # Check block type first (most reliable for decimal_add_sub)
    block_type = None
    if hasattr(block, 'config') and block.config:
        block_type = getattr(block.config, 'type', None)
    is_block_decimal = (block_type == "decimal_add_sub")
    
    for idx, q in enumerate(questions_to_render):
        is_decimal = False
        # PRIMARY CHECK: block type (most reliable for decimal_add_sub)
        if is_block_decimal:
            is_decimal = True
        # SECONDARY CHECK: text field contains decimal points (but only if not add_sub or integer_add_sub)
        elif hasattr(q, 'text') and q.text:
            text_val = str(q.text)
            # Only treat as decimal if text contains '.' AND it's not add_sub or integer_add_sub
            if '.' in text_val and block_type not in ("add_sub", "integer_add_sub"):
                is_decimal = True
        # FALLBACK: Check operands format (more reliable than operator check since integer_add_sub also uses "±")
        if not is_decimal and hasattr(q, 'operands') and q.operands:
            # For decimal_add_sub: operands are 10-9999, NOT all multiples of 10
            # This distinguishes decimal_add_sub from integer_add_sub and add_sub (which also use "±" operator)
            if all(op >= 10 and op <= 9999 for op in q.operands) and not all(op % 10 == 0 for op in q.operands):
                is_decimal = True
        question_is_decimal[idx] = is_decimal
    
    # Rows 2 to (max_operands + 1): Operands
    for operand_idx in range(max_operands):
        operand_row = []
        for i in range(VERTICAL_COLUMNS):
            if i < len(questions_to_render):
                q = questions_to_render[i]
                if operand_idx < len(q.operands):
                    operand = q.operands[operand_idx]
                    is_decimal = question_is_decimal.get(i, False)
                    
                    # Determine operator
                    operator = None
                    if hasattr(q, 'operators') and q.operators and len(q.operators) > 0:
                        if operand_idx > 0:
                            operator = q.operators[operand_idx - 1]
                    elif hasattr(q, 'operator') and q.operator:
                        if q.operator == "-" and operand_idx > 0:
                            operator = q.operator
                        elif q.operator != "-" and operand_idx == len(q.operands) - 1:
                            operator = q.operator
                    
                    # Format operand
                    if is_decimal:
                        display_value = f"{float(operand) / 10.0:.1f}"
                    else:
                        display_value = format_number(operand)
                    
                    # Build cell with operator (left-aligned) and number (center-aligned)
                    # Use a nested table structure: [operator (left) | number (center)]
                    if operator:
                        # Create operator paragraph (left-aligned, blue color)
                        operator_style = create_paragraph_style(
                            "operator", FONT_BOLD, FONT_SIZE_QUESTION_TEXT, COLOR_BLUE_600,
                            TA_LEFT, LINE_HEIGHT_TIGHT * FONT_SIZE_QUESTION_TEXT
                        )
                        operator_para = Paragraph(str(operator), operator_style)
                        
                        # Create number paragraph (center-aligned, gray color)
                        number_style = create_paragraph_style(
                            "operand", FONT_BOLD, FONT_SIZE_QUESTION_TEXT, COLOR_GRAY_800,
                            TA_CENTER, LINE_HEIGHT_TIGHT * FONT_SIZE_QUESTION_TEXT
                        )
                        number_para = Paragraph(display_value, number_style)
                        
                        # Create nested table: operator (left, ~15% width) | number (center, ~85% width)
                        nested_table_data = [[operator_para, number_para]]
                        # Operator column: enough space for + or - symbol (about 8-10mm)
                        op_width = max(10 * mm, VERTICAL_COLUMN_WIDTH * 0.15)
                        # Number column: remaining space
                        num_width = max(VERTICAL_COLUMN_WIDTH - op_width, VERTICAL_COLUMN_WIDTH * 0.7)
                        nested_col_widths = [op_width, num_width]
                        
                        nested_table = Table(
                            nested_table_data,
                            colWidths=nested_col_widths,
                            style=TableStyle([
                                ('ALIGN', (0, 0), (0, 0), 'LEFT'),  # Operator left-aligned
                                ('ALIGN', (1, 0), (1, 0), 'CENTER'),  # Number center-aligned
                                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                ('LEFTPADDING', (0, 0), (0, 0), 0),  # No padding for operator
                                ('RIGHTPADDING', (0, 0), (0, 0), 2*mm),  # Small gap after operator
                                ('LEFTPADDING', (1, 0), (1, 0), 0),  # No padding for number
                                ('RIGHTPADDING', (1, 0), (1, 0), 0),
                                ('TOPPADDING', (0, 0), (-1, -1), 0),
                                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                            ])
                        )
                        operand_row.append(nested_table)
                    else:
                        # No operator, just center-aligned number
                        number_style = create_paragraph_style(
                            "operand", FONT_BOLD, FONT_SIZE_QUESTION_TEXT, COLOR_GRAY_800,
                            TA_CENTER, LINE_HEIGHT_TIGHT * FONT_SIZE_QUESTION_TEXT
                        )
                        operand_row.append(Paragraph(display_value, number_style))
                else:
                    operand_row.append("")  # Empty cell
            else:
                operand_row.append("")  # Empty cell
        table_data.append(operand_row)
    
    # Line row: Horizontal line (empty cells, border will be drawn)
    line_row = [""] * VERTICAL_COLUMNS
    table_data.append(line_row)
    
    # Answer row
    answer_row = []
    for i in range(VERTICAL_COLUMNS):
        if i < len(questions_to_render):
            q = questions_to_render[i]
            if with_answers and hasattr(q, 'answer') and q.answer is not None:
                answer_style = create_paragraph_style(
                    "answer", FONT_MONO, FONT_SIZE_ANSWER, COLOR_GRAY_600,
                    TA_RIGHT, LINE_HEIGHT_TIGHT * FONT_SIZE_ANSWER
                )
                answer_text = format_number(q.answer)
                answer_row.append(Paragraph(answer_text, answer_style))
            else:
                answer_row.append("")  # Empty space for student to write
        else:
            answer_row.append("")
    table_data.append(answer_row)
    
    # Validate table data before creating
    if not table_data or len(table_data) == 0:
        return None
    
    # Ensure all rows have the correct number of columns
    for row in table_data:
        while len(row) < VERTICAL_COLUMNS:
            row.append("")
        # Trim if too many
        if len(row) > VERTICAL_COLUMNS:
            row[:] = row[:VERTICAL_COLUMNS]
    
    # Create table
    # Ensure column widths are valid and don't exceed available width
    # ReportLab handles padding internally, so column widths should sum to USABLE_WIDTH
    col_widths = [VERTICAL_COLUMN_WIDTH] * VERTICAL_COLUMNS
    total_width = sum(col_widths)
    
    # Validate and adjust if needed - ensure total width fits
    if total_width > USABLE_WIDTH:
        # Scale down proportionally
        scale = (USABLE_WIDTH * 0.98) / total_width  # Use 98% to be safe
        col_widths = [w * scale for w in col_widths]
    
    # Ensure no None or invalid values
    col_widths = [max(w, 1 * mm) if w and w > 0 else 1 * mm for w in col_widths]
    
    # Final validation: ensure total fits (ReportLab adds padding internally)
    final_total = sum(col_widths)
    if final_total > USABLE_WIDTH:
        # Emergency scale down
        emergency_scale = (USABLE_WIDTH * 0.98) / final_total  # Use 98% to be safe
        col_widths = [w * emergency_scale for w in col_widths]
    
    try:
        table = Table(
            table_data,
            colWidths=col_widths,
            repeatRows=0,
            style=TableStyle([
            # Borders
            ('GRID', (0, 0), (-1, -1), BORDER_WIDTH, COLOR_GRAY_200),
            # Cell padding
            ('LEFTPADDING', (0, 0), (-1, -1), CELL_PADDING_SMALL),
            ('RIGHTPADDING', (0, 0), (-1, -1), CELL_PADDING_SMALL),
            ('TOPPADDING', (0, 0), (-1, -1), CELL_PADDING_SMALL),
            ('BOTTOMPADDING', (0, 0), (-1, -1), CELL_PADDING_SMALL),
            # Alignment
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            # Serial number row: left align
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            # Operand rows: center align (numbers are center-aligned, operators are in nested table)
            ('ALIGN', (0, 1), (-1, -3), 'CENTER'),
            # Answer row: center align
            ('ALIGN', (0, -1), (-1, -1), 'CENTER'),
            # Background
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_WHITE),
            # Line row: special styling (thicker bottom border)
            ('LINEBELOW', (0, -2), (-1, -2), 1, COLOR_GRAY_400),
        ])
        )
        return table
    except Exception as e:
        # Log error and return None to skip this table
        print(f"Error creating vertical table: {e}")
        import traceback
        traceback.print_exc()
        return None


def render_horizontal_questions_pair(question1, question_num1: int,
                                    question2, question_num2: int,
                                    with_answers: bool = False) -> Table:
    """
    Render two horizontal questions side by side in a 2-column layout.
    
    Structure:
    - Row 1: [Q1 Serial | Q1 Text | Q1 Answer] | [Q2 Serial | Q2 Text | Q2 Answer]
    """
    # Calculate column widths for 2 questions side by side
    # Each question gets: serial + text + (optional answer)
    # Total: 2 questions = 2*(serial + text) + 2*(optional answer) = 4 or 6 columns
    question_width = (USABLE_WIDTH - (1 * mm)) / 2  # Split width, minus gap between questions
    
    # Question 1
    serial_style1 = create_paragraph_style(
        "serial", FONT_BOLD, FONT_SIZE_QUESTION_NUM, COLOR_BLUE_700
    )
    serial_cell1 = Paragraph(f"{question_num1}.", serial_style1)
    
    question_text1 = ""
    if hasattr(question1, 'text') and question1.text:
        question_text1 = question1.text
    elif hasattr(question1, 'operands') and len(question1.operands) >= 2:
        op1 = format_number(question1.operands[0])
        op2 = format_number(question1.operands[1])
        # Determine operator from question.operator or infer from text field
        if hasattr(question1, 'operator') and question1.operator:
            operator = question1.operator
        elif hasattr(question1, 'text') and question1.text and "÷" in question1.text:
            operator = "÷"
        elif hasattr(question1, 'text') and question1.text and "×" in question1.text:
            operator = "×"
        else:
            operator = "×"  # Default fallback
        question_text1 = f"{op1} {operator} {op2} ="
    
    text_style1 = create_paragraph_style(
        "question", FONT_BOLD, FONT_SIZE_QUESTION_TEXT, COLOR_GRAY_800,
        TA_LEFT, LINE_HEIGHT_NORMAL * FONT_SIZE_QUESTION_TEXT
    )
    question_cell1 = Paragraph(question_text1, text_style1)
    
    # Question 2
    serial_style2 = create_paragraph_style(
        "serial", FONT_BOLD, FONT_SIZE_QUESTION_NUM, COLOR_BLUE_700
    )
    serial_cell2 = Paragraph(f"{question_num2}.", serial_style2)
    
    question_text2 = ""
    if hasattr(question2, 'text') and question2.text:
        question_text2 = question2.text
    elif hasattr(question2, 'operands') and len(question2.operands) >= 2:
        op1 = format_number(question2.operands[0])
        op2 = format_number(question2.operands[1])
        # Determine operator from question.operator or infer from text field
        if hasattr(question2, 'operator') and question2.operator:
            operator = question2.operator
        elif hasattr(question2, 'text') and question2.text and "÷" in question2.text:
            operator = "÷"
        elif hasattr(question2, 'text') and question2.text and "×" in question2.text:
            operator = "×"
        else:
            operator = "×"  # Default fallback
        question_text2 = f"{op1} {operator} {op2} ="
    
    text_style2 = create_paragraph_style(
        "question", FONT_BOLD, FONT_SIZE_QUESTION_TEXT, COLOR_GRAY_800,
        TA_LEFT, LINE_HEIGHT_NORMAL * FONT_SIZE_QUESTION_TEXT
    )
    question_cell2 = Paragraph(question_text2, text_style2)
    
    # Build table data - single row with both questions
    row = [serial_cell1, question_cell1]
    
    # Add answer for question 1 (always include column if with_answers is True for consistent layout)
    if with_answers:
        if hasattr(question1, 'answer') and question1.answer is not None:
            answer_style1 = create_paragraph_style(
                "answer", FONT_MONO, FONT_SIZE_ANSWER, COLOR_GRAY_600,
                TA_RIGHT, LINE_HEIGHT_NORMAL * FONT_SIZE_ANSWER
            )
            answer_text1 = format_number(question1.answer)
            answer_cell1 = Paragraph(answer_text1, answer_style1)
            row.append(answer_cell1)
        else:
            row.append("")  # Empty cell if no answer
    
    # Add separator column (small gap between questions)
    row.append("")  # Empty cell for gap
    
    # Question 2 columns
    row.append(serial_cell2)
    row.append(question_cell2)
    
    # Add answer for question 2 (always include column if with_answers is True)
    if with_answers:
        if hasattr(question2, 'answer') and question2.answer is not None:
            answer_style2 = create_paragraph_style(
                "answer", FONT_MONO, FONT_SIZE_ANSWER, COLOR_GRAY_600,
                TA_RIGHT, LINE_HEIGHT_NORMAL * FONT_SIZE_ANSWER
            )
            answer_text2 = format_number(question2.answer)
            answer_cell2 = Paragraph(answer_text2, answer_style2)
            row.append(answer_cell2)
        else:
            row.append("")  # Empty cell if no answer
    
    table_data = [row]
    
    # Calculate column widths
    # Structure: [Q1 Serial | Q1 Text | Q1 Answer? | Gap | Q2 Serial | Q2 Text | Q2 Answer?]
    has_answers_col = with_answers
    
    if has_answers_col:
        # 7 columns: Q1 serial, Q1 text, Q1 answer, gap, Q2 serial, Q2 text, Q2 answer
        # Question text column ends at 80% of question width (separator at 80%)
        # Answer column is 20% of question width
        q1_width = question_width
        q2_width = question_width
        gap_width = 1 * mm
        serial_width = SERIAL_COLUMN_WIDTH
        # Answer width is 20% of each question's width (ensures separator at 80% of question width)
        answer_width = question_width * 0.20
        # Question text width: 80% of question width minus serial width
        q1_text_width = (q1_width * 0.80) - serial_width
        q2_text_width = (q2_width * 0.80) - serial_width
        col_widths = [serial_width, max(q1_text_width, 30*mm), answer_width, gap_width, serial_width, max(q2_text_width, 30*mm), answer_width]
    else:
        # 5 columns: Q1 serial, Q1 text, gap, Q2 serial, Q2 text
        q1_width = question_width
        q2_width = question_width
        gap_width = 1 * mm
        serial_width = SERIAL_COLUMN_WIDTH
        q1_text_width = q1_width - serial_width
        q2_text_width = q2_width - serial_width
        col_widths = [serial_width, q1_text_width, gap_width, serial_width, q2_text_width]
    
    # Ensure widths fit
    total_width = sum(col_widths)
    if total_width > USABLE_WIDTH:
        scale = (USABLE_WIDTH * 0.98) / total_width
        col_widths = [w * scale for w in col_widths]
    
    col_widths = [max(w, 5*mm) for w in col_widths]
    
    # Build table style
    table_style = [
        ('GRID', (0, 0), (-1, -1), BORDER_WIDTH, COLOR_GRAY_200),
        ('LEFTPADDING', (0, 0), (-1, -1), CELL_PADDING_SMALL),
        ('RIGHTPADDING', (0, 0), (-1, -1), CELL_PADDING_SMALL),
        ('TOPPADDING', (0, 0), (-1, -1), CELL_PADDING_SMALL),
        ('BOTTOMPADDING', (0, 0), (-1, -1), CELL_PADDING_SMALL),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),  # Q1 Serial
        ('ALIGN', (1, 0), (1, 0), 'LEFT'),  # Q1 Text
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_WHITE),
        ('LINEAFTER', (0, 0), (0, 0), BORDER_WIDTH, COLOR_GRAY_200),  # After Q1 serial
    ]
    
    # Add Q1 answer column styling if present
    if has_answers_col:
        table_style.extend([
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),  # Q1 Answer
            ('LINEAFTER', (2, 0), (2, 0), BORDER_WIDTH, COLOR_GRAY_200),  # After Q1 answer
        ])
        # Gap column (no border, invisible)
        gap_col_idx = 3
        table_style.extend([
            ('BACKGROUND', (gap_col_idx, 0), (gap_col_idx, 0), COLOR_WHITE),
            ('GRID', (gap_col_idx, 0), (gap_col_idx, 0), 0, COLOR_WHITE),
            ('LEFTPADDING', (gap_col_idx, 0), (gap_col_idx, 0), 0),
            ('RIGHTPADDING', (gap_col_idx, 0), (gap_col_idx, 0), 0),
        ])
        # Q2 columns
        q2_serial_idx = 4
        q2_text_idx = 5
        q2_answer_idx = 6
        table_style.extend([
            ('ALIGN', (q2_serial_idx, 0), (q2_serial_idx, 0), 'LEFT'),  # Q2 Serial
            ('ALIGN', (q2_text_idx, 0), (q2_text_idx, 0), 'LEFT'),  # Q2 Text
            ('ALIGN', (q2_answer_idx, 0), (q2_answer_idx, 0), 'RIGHT'),  # Q2 Answer
            ('LINEAFTER', (q2_serial_idx, 0), (q2_serial_idx, 0), BORDER_WIDTH, COLOR_GRAY_200),
            ('LINEAFTER', (q2_answer_idx - 1, 0), (q2_answer_idx - 1, 0), BORDER_WIDTH, COLOR_GRAY_200),
        ])
    else:
        # No answers - gap is at index 2
        gap_col_idx = 2
        table_style.extend([
            ('BACKGROUND', (gap_col_idx, 0), (gap_col_idx, 0), COLOR_WHITE),
            ('GRID', (gap_col_idx, 0), (gap_col_idx, 0), 0, COLOR_WHITE),
            ('LEFTPADDING', (gap_col_idx, 0), (gap_col_idx, 0), 0),
            ('RIGHTPADDING', (gap_col_idx, 0), (gap_col_idx, 0), 0),
        ])
        # Q2 columns
        q2_serial_idx = 3
        q2_text_idx = 4
        table_style.extend([
            ('ALIGN', (q2_serial_idx, 0), (q2_serial_idx, 0), 'LEFT'),  # Q2 Serial
            ('ALIGN', (q2_text_idx, 0), (q2_text_idx, 0), 'LEFT'),  # Q2 Text
            ('LINEAFTER', (q2_serial_idx, 0), (q2_serial_idx, 0), BORDER_WIDTH, COLOR_GRAY_200),
        ])
    
    try:
        table = Table(
            table_data,
            colWidths=col_widths,
            style=TableStyle(table_style)
        )
        return table
    except Exception as e:
        print(f"Error creating horizontal questions pair table: {e}")
        import traceback
        traceback.print_exc()
        return None


def render_horizontal_question_table(question, question_num: int, 
                                    with_answers: bool = False) -> Table:
    """
    Render a single horizontal question in table format (matching MathQuestion component).
    
    Preview structure:
    - Column 1: Serial number (w-8, blue, bold)
    - Column 2: Question text (monospace, gray-800)
    - Column 3 (optional): Answer (if with_answers, gray-600, bold)
    """
    # Serial number
    serial_style = create_paragraph_style(
        "serial", FONT_BOLD, FONT_SIZE_QUESTION_NUM, COLOR_BLUE_700
    )
    serial_cell = Paragraph(f"{question_num}.", serial_style)
    
    # Question text
    question_text = ""
    if hasattr(question, 'text') and question.text:
        # Use text field directly for special types
        question_text = question.text
    elif hasattr(question, 'operands') and len(question.operands) >= 2:
        # Format: operand1 operator operand2 =
        op1 = format_number(question.operands[0])
        op2 = format_number(question.operands[1])
        # Determine operator from question.operator or infer from text field
        if hasattr(question, 'operator') and question.operator:
            operator = question.operator
        elif hasattr(question, 'text') and question.text and "÷" in question.text:
            operator = "÷"
        elif hasattr(question, 'text') and question.text and "×" in question.text:
            operator = "×"
        else:
            operator = "×"  # Default fallback
        question_text = f"{op1} {operator} {op2} ="
    
    text_style = create_paragraph_style(
        "question", FONT_BOLD, FONT_SIZE_QUESTION_TEXT, COLOR_GRAY_800,
        TA_LEFT, LINE_HEIGHT_NORMAL * FONT_SIZE_QUESTION_TEXT
    )
    question_cell = Paragraph(question_text, text_style)
    
    # Build table data
    table_data = [[serial_cell, question_cell]]
    
    # Add answer column if needed
    if with_answers and hasattr(question, 'answer') and question.answer is not None:
        answer_style = create_paragraph_style(
            "answer", FONT_MONO, FONT_SIZE_ANSWER, COLOR_GRAY_600,
            TA_RIGHT, LINE_HEIGHT_NORMAL * FONT_SIZE_ANSWER
        )
        answer_text = format_number(question.answer)
        answer_cell = Paragraph(answer_text, answer_style)
        table_data[0].append(answer_cell)
        # Column widths: Question text column ends at 80% of total width (separator at 80%)
        # Answer column is 20% of total width
        # This ensures consistent separator position regardless of answer length
        total_width = USABLE_WIDTH
        answer_col_width = total_width * 0.20  # 20% from right
        question_text_width = total_width * 0.80 - SERIAL_COLUMN_WIDTH  # 80% total minus serial
        col_widths = [SERIAL_COLUMN_WIDTH, max(question_text_width, 50*mm), answer_col_width]
    else:
        # Column widths: ReportLab handles padding internally, so just ensure widths sum to USABLE_WIDTH
        available_for_question = USABLE_WIDTH - SERIAL_COLUMN_WIDTH
        col_widths = [SERIAL_COLUMN_WIDTH, max(available_for_question, 50*mm)]
    
    # Final validation: ensure total width fits (ReportLab adds padding internally)
    total_table_width = sum(col_widths)
    if total_table_width > USABLE_WIDTH:
        # Scale down proportionally to fit
        scale = (USABLE_WIDTH * 0.98) / total_table_width  # Use 98% to be safe
        col_widths = [w * scale for w in col_widths]
    
    # Ensure no column is too small
    col_widths = [max(w, 10*mm) for w in col_widths]
    
    # Build table style
    table_style = [
        # Borders
        ('GRID', (0, 0), (-1, -1), BORDER_WIDTH, COLOR_GRAY_200),
        # Cell padding (matching p-1.5)
        ('LEFTPADDING', (0, 0), (-1, -1), CELL_PADDING_MEDIUM),
        ('RIGHTPADDING', (0, 0), (-1, -1), CELL_PADDING_MEDIUM),
        ('TOPPADDING', (0, 0), (-1, -1), CELL_PADDING_MEDIUM),
        ('BOTTOMPADDING', (0, 0), (-1, -1), CELL_PADDING_MEDIUM),
        # Alignment
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),  # Serial number
        ('ALIGN', (1, 0), (1, 0), 'LEFT'),  # Question text
        # Background
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_WHITE),
        # Border between serial and question
        ('LINEAFTER', (0, 0), (0, 0), BORDER_WIDTH, COLOR_GRAY_200),
    ]
    
    # Add answer column styling if present
    if len(col_widths) > 2:
        table_style.extend([
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),  # Answer
            ('LINEAFTER', (1, 0), (1, 0), BORDER_WIDTH, COLOR_GRAY_200),
        ])
    
    # Create table with error handling
    try:
        table = Table(
            table_data,
            colWidths=col_widths,
            style=TableStyle(table_style)
        )
        return table
    except Exception as e:
        # Log error and return a simple fallback table
        print(f"Error creating horizontal table: {e}")
        import traceback
        traceback.print_exc()
        # Return a minimal valid table
        try:
            # Use simpler widths as fallback - ensure they fit
            simple_padding = len(col_widths) * 2 * CELL_PADDING_MEDIUM
            available_width = USABLE_WIDTH - simple_padding
            if len(table_data[0]) > 2:
                # 3 columns: serial, question, answer
                simple_col_widths = [
                    SERIAL_COLUMN_WIDTH,
                    (available_width - SERIAL_COLUMN_WIDTH - 80*mm) * 0.9,
                    80*mm
                ]
            else:
                # 2 columns: serial, question
                simple_col_widths = [
                    SERIAL_COLUMN_WIDTH,
                    available_width - SERIAL_COLUMN_WIDTH
                ]
            return Table(
                table_data,
                colWidths=simple_col_widths,
                style=TableStyle(table_style)
            )
        except:
            # Ultimate fallback - return None to skip this question
            print("Failed to create fallback horizontal table")
            return None


def create_block_border_table(inner_content, border_width=BLOCK_BORDER_WIDTH):
    """Create a table with thick border around block content"""
    # Create a wrapper table with thick borders
    border_table_data = [[inner_content]]
    border_table = Table(border_table_data, colWidths=[USABLE_WIDTH])
    border_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), border_width, colors.HexColor('#000000')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return border_table


def generate_pdf_v2(
    config: PaperConfig,
    generated_blocks: List[GeneratedBlock],
    with_answers: bool = False,
    answers_only: bool = False
) -> BytesIO:
    """
    Generate PDF matching preview layout exactly.
    
    Design:
    - Uses ReportLab's Table for precise layout control
    - Matches preview spacing, padding, borders exactly
    - Professional typography and colors
    - Clean, exam-ready format
    """
    buffer = BytesIO()
    
    def on_first_page(canvas, doc):
        """Draw watermark and page number on first page"""
        draw_watermark(canvas)
        draw_page_number(canvas, doc)
    
    def on_later_pages(canvas, doc):
        """Draw watermark and page number on subsequent pages"""
        draw_watermark(canvas)
        draw_page_number(canvas, doc)
    
    def draw_watermark(canvas):
        """Draw 'Talent Hub' watermark in background"""
        canvas.saveState()
        canvas.setFont("Helvetica-Bold", 80)  # Larger font
        canvas.setFillColor(colors.HexColor('#F3F4F6'))  # Very light gray
        canvas.setFillAlpha(0.15)  # More subtle but visible
        text = "Talent Hub"
        text_width = canvas.stringWidth(text, "Helvetica-Bold", 80)
        text_height = 80
        # Center on page, rotated 45 degrees
        canvas.translate(PAGE_WIDTH / 2, PAGE_HEIGHT / 2)
        canvas.rotate(45)
        canvas.drawString(-text_width / 2, -text_height / 2, text)
        canvas.restoreState()
    
    def draw_page_number(canvas, doc):
        """Draw page number in footer"""
        canvas.saveState()
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.HexColor('#666666'))
        # Get page number from canvas
        page_num = canvas.getPageNumber()
        # Center bottom of page
        text = f"Page {page_num}"
        text_width = canvas.stringWidth(text, "Helvetica", 9)
        canvas.drawString((PAGE_WIDTH - text_width) / 2, 10 * mm, text)
        canvas.restoreState()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        onFirstPage=on_first_page,
        onLaterPages=on_later_pages
    )
    
    # Build story (content)
    story = []
    
    # Skip question generation if answers_only is True
    if not answers_only:
        # Title
        title_style = create_paragraph_style(
            "title", FONT_BOLD, FONT_SIZE_TITLE, colors.black
        )
        story.append(Paragraph(config.title, title_style))
        story.append(Spacer(1, SPACE_AFTER_TITLE))
        
        # Calculate total questions
        total_questions = sum(len(block.questions) for block in generated_blocks)
        
        # Student info section - two column layout
        info_style = create_paragraph_style(
            "info", FONT_NAME, FONT_SIZE_INSTRUCTIONS, COLOR_GRAY_800
        )
        # Left column: Name, Time Start
        # Right column: Date, Time Stop, MM
        info_table_data = [
            [
                Paragraph("Name: ", info_style),
                Paragraph("Date: ", info_style)
            ],
            [
                Paragraph("Time Start: ", info_style),
                Paragraph("Time Stop: ", info_style)
            ],
            [
                Paragraph("", info_style),  # Empty left cell
                Paragraph(f"MM: {total_questions}", info_style)
            ]
        ]
        info_table = Table(info_table_data, colWidths=[USABLE_WIDTH / 2, USABLE_WIDTH / 2])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 2 * mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2 * mm),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 3 * mm))  # Reduced spacing
        
        # Process blocks
        question_counter = 1
        
        for block_index, block in enumerate(generated_blocks):
            # Collect all content for this block
            block_content = []
            
            # Section title
            if block.config.title:
                section_style = create_paragraph_style(
                    "section", FONT_BOLD, FONT_SIZE_SECTION, colors.black
                )
                block_content.append(Spacer(1, SPACE_BETWEEN_BLOCKS if block_index > 0 else 0))
                block_content.append(Paragraph(block.config.title, section_style))
                block_content.append(Spacer(1, SPACE_AFTER_SECTION))
            
            # Check if block has vertical questions
            has_vertical = any(
                getattr(q, 'isVertical', getattr(q, 'is_vertical', False))
                for q in block.questions
            ) if block.questions else False
            
            if has_vertical:
                # Render vertical questions in 10-column tables (10 questions per table)
                vertical_questions = [q for q in block.questions 
                                     if getattr(q, 'isVertical', getattr(q, 'is_vertical', False))]
                
                # Process in chunks of 10
                for chunk_start in range(0, len(vertical_questions), 10):
                    chunk = vertical_questions[chunk_start:chunk_start + 10]
                    # Create a temporary block with just this chunk
                    chunk_block = GeneratedBlock(
                        config=block.config,
                        questions=chunk
                    )
                    vertical_table = render_vertical_questions_table(
                        chunk_block, question_counter, with_answers
                    )
                    if vertical_table:
                        block_content.append(vertical_table)
                        question_counter += len(chunk)
                        block_content.append(Spacer(1, GAP_BETWEEN_QUESTIONS))
            else:
                # Render horizontal questions in pairs (2 columns)
                horizontal_questions = [q for q in block.questions 
                                      if not getattr(q, 'isVertical', getattr(q, 'is_vertical', False))]
                
                # Process in pairs of 2
                for pair_start in range(0, len(horizontal_questions), 2):
                    if pair_start + 1 < len(horizontal_questions):
                        # Two questions - render side by side
                        q1 = horizontal_questions[pair_start]
                        q2 = horizontal_questions[pair_start + 1]
                        pair_table = render_horizontal_questions_pair(
                            q1, question_counter,
                            q2, question_counter + 1,
                            with_answers
                        )
                        if pair_table:
                            block_content.append(pair_table)
                            block_content.append(Spacer(1, GAP_BETWEEN_QUESTIONS))
                        question_counter += 2
                    else:
                        # Single question left - render alone (full width)
                        q = horizontal_questions[pair_start]
                        h_table = render_horizontal_question_table(q, question_counter, with_answers)
                        if h_table:
                            block_content.append(h_table)
                            block_content.append(Spacer(1, GAP_BETWEEN_QUESTIONS))
                        question_counter += 1
            
            # Wrap block content in KeepTogether to prevent splitting across pages
            if block_content:
                # Wrap all content in KeepTogether to prevent splitting
                kept_block = KeepTogether(block_content)
                story.append(kept_block)
        
        # Add ending line before answer key
        story.append(Spacer(1, 5 * mm))
        ending_style = create_paragraph_style(
            "ending", FONT_BOLD, FONT_SIZE_SECTION, colors.black, alignment=TA_CENTER
        )
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#000000')))
        story.append(Spacer(1, 2 * mm))
        ending_text = Paragraph("ALL THE BEST", ending_style)
        story.append(ending_text)
    
    # Answer key page (if requested)
    if with_answers or answers_only:
        # If answers_only, we haven't added any content yet, so no need for PageBreak
        if not answers_only:
            story.append(PageBreak())
        story.append(PageBreak())
        
        # Answer key title
        answer_title_style = create_paragraph_style(
            "answer_title", FONT_BOLD, FONT_SIZE_TITLE, colors.black
        )
        story.append(Paragraph(f"{config.title} - Answer Key", answer_title_style))
        story.append(Spacer(1, SPACE_AFTER_TITLE))
        
        # List answers
        answer_counter = 1
        for block in generated_blocks:
            if block.config.title:
                section_style = create_paragraph_style(
                    "section", FONT_BOLD, FONT_SIZE_SECTION, colors.black
                )
                story.append(Paragraph(block.config.title, section_style))
                story.append(Spacer(1, SPACE_AFTER_SECTION))
            
            for q in block.questions:
                if hasattr(q, 'answer') and q.answer is not None:
                    answer_text = f"{answer_counter}. {format_number(q.answer)}"
                    answer_style = create_paragraph_style(
                        "answer_item", FONT_MONO, FONT_SIZE_ANSWER, COLOR_GRAY_600
                    )
                    story.append(Paragraph(answer_text, answer_style))
                    story.append(Spacer(1, 1 * mm))  # Reduced spacing
                    answer_counter += 1
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer

