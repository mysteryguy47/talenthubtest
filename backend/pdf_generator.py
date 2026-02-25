"""Professional PDF generation with compact, structured layout - table format."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from io import BytesIO
from typing import List
from schemas import PaperConfig, GeneratedBlock
from pdf_layout import (
    PAGE_WIDTH, PAGE_HEIGHT, MARGIN_TOP, MARGIN_BOTTOM, MARGIN_LEFT, MARGIN_RIGHT,
    USABLE_WIDTH, USABLE_HEIGHT, MIN_SPACE_BEFORE_BREAK,
    TYPO_PAPER_TITLE, TYPO_SECTION_TITLE, TYPO_INSTRUCTIONS, TYPO_QUESTION_NUMBER,
    TYPO_QUESTION_TEXT, TYPO_ANSWER, TYPO_OPERATOR,
    SPACE_AFTER_TITLE, SPACE_AFTER_SECTION, SPACE_BEFORE_SECTION,
    SPACE_BETWEEN_QUESTIONS, SPACE_BETWEEN_BLOCKS, SPACE_AFTER_INSTRUCTIONS,
    QUESTION_BOX_PADDING, QUESTION_BOX_MIN_HEIGHT,
    VERTICAL_QUESTION_LINE_SPACING, HORIZONTAL_QUESTION_SPACING,
    BLOCK_BORDER_WIDTH, BLOCK_PADDING, BLOCK_HEADER_HEIGHT,
    TABLE_ROW_HEIGHT, TABLE_CELL_PADDING, TABLE_COLUMNS,
    VERTICAL_QUESTIONS_PER_ROW, VERTICAL_QUESTION_WIDTH, VERTICAL_QUESTION_GAP,
    apply_typography, check_page_break, draw_page_header
)


class PageCursor:
    """Tracks current position on page and handles page breaks."""
    def __init__(self, canvas, initial_y: float, title: str = "", level: str = ""):
        self.canvas = canvas
        self.y = initial_y
        self.page_num = 1
        self.title = title
        self.level = level
    
    def move_down(self, distance: float) -> bool:
        """Move cursor down, return True if page break occurred."""
        if self.y - distance < MARGIN_BOTTOM + MIN_SPACE_BEFORE_BREAK:
            self.new_page()
            return True
        self.y -= distance
        return False
    
    def check_space(self, required: float) -> bool:
        """Check if enough space available, create page break if needed."""
        if self.y - required < MARGIN_BOTTOM + MIN_SPACE_BEFORE_BREAK:
            self.new_page()
            return True
        return False
    
    def new_page(self):
        """Create a new page and redraw header."""
        self.canvas.showPage()
        self.page_num += 1
        if self.title:
            self.y = draw_page_header(self.canvas, self.title, self.level)
        else:
            self.y = PAGE_HEIGHT - MARGIN_TOP


def draw_block_boundary(canvas, x: float, y: float, width: float, height: float):
    """Draw a bordered block/section boundary."""
    canvas.setLineWidth(BLOCK_BORDER_WIDTH)
    canvas.setStrokeColor(colors.HexColor('#000000'))
    canvas.setFillColor(colors.HexColor('#FFFFFF'))
    canvas.rect(x, y, width, height, fill=1, stroke=1)


def render_vertical_question_compact(canvas, question, x: float, y: float, width: float, question_num: int, with_answers: bool = False, block_type: str = None) -> float:
    """Render a compact vertical format question. Returns height used."""
    num_operands = len(question.operands)
    # Always reserve space for answer (add extra space below line)
    required_height = 6*mm + (num_operands * VERTICAL_QUESTION_LINE_SPACING) + 6*mm + 4*mm
    
    # Question number (left) - premium styling
    apply_typography(canvas, TYPO_QUESTION_NUMBER)
    canvas.drawString(x + 2*mm, y - 3*mm, f"{question_num}.")
    
    # Right-aligned operands
    text_y = y - 8*mm
    right_x = x + width - 2*mm
    
    # Check for mixed operations
    has_mixed_ops = hasattr(question, 'operators') and question.operators and len(question.operators) > 0
    
    # Check if this is decimal_add_sub
    # PRIMARY CHECK: block type (most reliable)
    is_decimal_add_sub = (block_type == "decimal_add_sub")
    
    # SECONDARY CHECK: text field contains decimal points (but only if not add_sub or integer_add_sub)
    if not is_decimal_add_sub and hasattr(question, 'text') and question.text:
        text_str = str(question.text)
        # Only treat as decimal if text contains '.' AND it's not add_sub or integer_add_sub
        # For add_sub and integer_add_sub, text should never contain decimals
        if '.' in text_str and block_type not in ("add_sub", "integer_add_sub"):
            is_decimal_add_sub = True
    
    # FALLBACK: Check operands format (decimal_add_sub operands are 10-9999, NOT all multiples of 10)
    if not is_decimal_add_sub and hasattr(question, 'operands') and question.operands:
        # For decimal_add_sub: operands are 10-9999, and at least one is NOT a multiple of 10
        # This distinguishes decimal_add_sub from integer_add_sub and add_sub
        if all(10 <= op <= 9999 for op in question.operands) and not all(op % 10 == 0 for op in question.operands):
            is_decimal_add_sub = True
    
    # Convert operands to decimal format if it's decimal_add_sub
    for i, operand in enumerate(question.operands):
        # Convert operand to decimal format if it's decimal_add_sub
        if is_decimal_add_sub:
            # Operands are stored as integers * 10, convert to decimal
            display_operand = f"{float(operand) / 10.0:.1f}"
        else:
            display_operand = str(operand)
        
        # Determine operator
        if has_mixed_ops:
            if i == 0:
                operator = None
            else:
                operator = question.operators[i - 1]
        else:
            if question.operator == "-" and i > 0:
                operator = question.operator
            elif i == len(question.operands) - 1:
                operator = question.operator
            else:
                operator = None
        
        # Draw operator (if present)
        if operator:
            apply_typography(canvas, TYPO_OPERATOR)
            canvas.drawRightString(right_x - 6*mm, text_y, operator)
        
        # Draw operand
        apply_typography(canvas, TYPO_QUESTION_TEXT)
        canvas.drawRightString(right_x, text_y, display_operand)
        text_y -= VERTICAL_QUESTION_LINE_SPACING
    
    # Draw horizontal line
    line_y = text_y - 1*mm
    canvas.setLineWidth(0.8)
    canvas.setStrokeColor(colors.HexColor('#000000'))
    line_start = right_x - 25*mm
    canvas.line(line_start, line_y, right_x, line_y)
    
    # Answer space - always show space, fill with answer if with_answers is True
    answer_y = line_y - 3*mm
    if with_answers and hasattr(question, 'answer') and question.answer is not None:
        apply_typography(canvas, TYPO_ANSWER)
        canvas.drawRightString(right_x, answer_y, str(question.answer))
    # If not showing answers, space is still reserved (blank space for student to write)
    
    return required_height


def render_horizontal_question_table_cell(canvas, question, x: float, y: float, width: float, question_num: int, with_answers: bool = False):
    """Render a horizontal question in a table cell with proper padding."""
    # Inner padding area
    inner_x = x + TABLE_CELL_PADDING
    inner_y = y - TABLE_CELL_PADDING
    inner_width = width - 2 * TABLE_CELL_PADDING
    inner_height = TABLE_ROW_HEIGHT - 2 * TABLE_CELL_PADDING
    
    # Question number and text (centered vertically in cell) - premium styling
    text_y = inner_y - (inner_height / 2) - 2*mm
    
    apply_typography(canvas, TYPO_QUESTION_NUMBER)
    canvas.drawString(inner_x, text_y, f"{question_num}.")
    
    # For square root, cube root, LCM, GCD, decimal multiplication, and decimal division, use the text field directly
    if question.operator in ("√", "∛", "LCM", "GCD", "÷") or (hasattr(question, 'text') and (question.text.count(".") > 0 and ("×" in question.text or "÷" in question.text))):
        question_text = question.text if hasattr(question, 'text') else f"{question.operands[0]} {question.operator} {question.operands[1]} ="
        # Handle multi-line text (for digits value columns)
        lines = question_text.split('\n')
        apply_typography(canvas, TYPO_QUESTION_TEXT)
        for i, line in enumerate(lines):
            canvas.drawString(inner_x + 8*mm, text_y - (i * 3*mm), line)
        text_y = text_y - (len(lines) - 1) * 3*mm
    else:
        question_text = f"{question.operands[0]} {question.operator} {question.operands[1]} ="
        apply_typography(canvas, TYPO_QUESTION_TEXT)
        canvas.drawString(inner_x + 8*mm, text_y, question_text)
    
    # Answer (if with answers) - below question
    if with_answers and hasattr(question, 'answer') and question.answer is not None:
        apply_typography(canvas, TYPO_ANSWER)
        answer_str = str(question.answer)
        # Format float answers nicely
        if isinstance(question.answer, float) and question.answer % 1 != 0:
            answer_str = f"{question.answer:.2f}".rstrip('0').rstrip('.')
        canvas.drawString(inner_x + 8*mm, text_y - 4*mm, f"Ans: {answer_str}")


def generate_pdf(
    config: PaperConfig,
    generated_blocks: List[GeneratedBlock],
    with_answers: bool = False,
    answers_only: bool = False
) -> BytesIO:
    """
    Generate professional exam-grade PDF with compact, structured layout.
    Blocks have clear boundaries, questions in table format.
    
    Returns:
        BytesIO object containing the PDF
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    
    # Skip question generation if answers_only is True
    if not answers_only:
        # Initialize cursor
        initial_y = draw_page_header(c, config.title, config.level)
        cursor = PageCursor(c, initial_y, config.title, config.level)
        
        # ========== STUDENT INFO SECTION ==========
        info_height = 12*mm
        cursor.check_space(info_height)
        
        apply_typography(c, TYPO_INSTRUCTIONS)
        info_y = cursor.y
        c.drawString(MARGIN_LEFT, info_y, "Name: _________________________")
        c.drawString(MARGIN_LEFT + USABLE_WIDTH / 3, info_y, "Date: _________________________")
        c.drawString(MARGIN_LEFT + 2 * USABLE_WIDTH / 3, info_y, "Marks: _________________________")
        
        # Underline
        underline_y = info_y - 2*mm
        c.setLineWidth(0.5)
        c.setStrokeColor(colors.HexColor('#000000'))
        c.line(MARGIN_LEFT, underline_y, MARGIN_LEFT + USABLE_WIDTH, underline_y)
        
        cursor.y = underline_y - 6*mm
        
        # ========== QUESTIONS BY BLOCK ==========
        question_counter = 1
        
        for block_index, block in enumerate(generated_blocks):
            # Determine if block has vertical or horizontal questions
            is_vertical_block = False
            if block.questions:
                first_q = block.questions[0]
                is_vertical_block = getattr(first_q, 'isVertical', getattr(first_q, 'is_vertical', False))
            
            # Section spacing
            if block_index > 0:
                cursor.move_down(SPACE_BETWEEN_BLOCKS)
            
            # Calculate block content dimensions
            if is_vertical_block:
                # Vertical questions: 2 per row, calculate total height needed
                total_questions = len(block.questions)
                rows = (total_questions + VERTICAL_QUESTIONS_PER_ROW - 1) // VERTICAL_QUESTIONS_PER_ROW
                # Estimate height per question: header + operands + line + answer space (always included)
                question_height = 6*mm + (3 * VERTICAL_QUESTION_LINE_SPACING) + 6*mm + 4*mm  # Estimate per question (includes answer space)
                estimated_height = BLOCK_HEADER_HEIGHT + BLOCK_PADDING * 2 + (rows * question_height) + ((rows - 1) * SPACE_BETWEEN_QUESTIONS)
            else:
                # Horizontal questions: table format
                total_questions = len(block.questions)
                rows = (total_questions + TABLE_COLUMNS - 1) // TABLE_COLUMNS
                estimated_height = BLOCK_HEADER_HEIGHT + BLOCK_PADDING * 2 + (rows * TABLE_ROW_HEIGHT)
            
            # Check space and draw block boundary
            cursor.check_space(estimated_height)
            
            block_y = cursor.y - estimated_height
            block_height = estimated_height
            block_x = MARGIN_LEFT
            
            # Draw block boundary
            draw_block_boundary(c, block_x, block_y, USABLE_WIDTH, block_height)
            
            # Block header (section title)
            if block.config.title:
                apply_typography(c, TYPO_SECTION_TITLE)
                header_y = block_y + block_height - BLOCK_HEADER_HEIGHT
                c.drawString(block_x + BLOCK_PADDING, header_y - 4*mm, block.config.title)
            
            # Content area
            content_y = block_y + block_height - BLOCK_HEADER_HEIGHT - BLOCK_PADDING
            content_x = block_x + BLOCK_PADDING
            content_width = USABLE_WIDTH - 2 * BLOCK_PADDING
            
            if is_vertical_block:
                # ========== VERTICAL QUESTIONS (Addition/Subtraction/Mix) ==========
                # Render questions in 2-column layout within the block
                current_y = content_y
                row_heights = []  # Track heights for each row
                
                # First pass: calculate all question heights and group by rows
                questions_by_row = []
                current_row = []
                max_row_height = 0
                
                for q_index, q in enumerate(block.questions):
                    num_operands = len(q.operands)
                    # Always include space for answer (extra 4mm below line)
                    q_height = 6*mm + (num_operands * VERTICAL_QUESTION_LINE_SPACING) + 6*mm + 4*mm
                    current_row.append((q, q_height, question_counter))
                    max_row_height = max(max_row_height, q_height)
                    question_counter += 1
                    
                    # End of row or last question
                    if len(current_row) == VERTICAL_QUESTIONS_PER_ROW or q_index == len(block.questions) - 1:
                        questions_by_row.append((current_row, max_row_height))
                        row_heights.append(max_row_height)
                        current_row = []
                        max_row_height = 0
                
                # Second pass: render questions
                for row_index, (row_questions, row_height) in enumerate(questions_by_row):
                    for col, (q, q_height, q_num) in enumerate(row_questions):
                        # Calculate question position (2 columns)
                        q_x = content_x + col * (VERTICAL_QUESTION_WIDTH + VERTICAL_QUESTION_GAP)
                        q_width = VERTICAL_QUESTION_WIDTH
                        
                        # Draw question border (table cell style)
                        c.setLineWidth(0.5)
                        c.setStrokeColor(colors.HexColor('#000000'))
                        c.rect(q_x, current_y - row_height, q_width, row_height, fill=0, stroke=1)
                        
                        # Render question content (centered vertically in row)
                        q_y_offset = (row_height - q_height) / 2
                        block_type = block.config.type if block.config else None
                        render_vertical_question_compact(c, q, q_x, current_y - q_y_offset, q_width, q_num, with_answers, block_type)
                    
                    # Move to next row
                    if row_index < len(questions_by_row) - 1:
                        current_y -= (row_height + SPACE_BETWEEN_QUESTIONS)
                    else:
                        current_y -= row_height
            else:
                # ========== HORIZONTAL QUESTIONS (Multiplication/Division) ==========
                # Table format: 3 columns
                table_col_width = (content_width - (TABLE_COLUMNS - 1) * 2*mm) / TABLE_COLUMNS
                current_y = content_y
                
                for q_index, q in enumerate(block.questions):
                    row = q_index // TABLE_COLUMNS
                    col = q_index % TABLE_COLUMNS
                    
                    # New row
                    if col == 0 and q_index > 0:
                        current_y -= TABLE_ROW_HEIGHT
                    
                    # Calculate cell position
                    cell_x = content_x + col * (table_col_width + 2*mm)
                    
                    # Draw cell border
                    c.setLineWidth(0.5)
                    c.setStrokeColor(colors.HexColor('#000000'))
                    c.rect(cell_x, current_y - TABLE_ROW_HEIGHT, table_col_width, TABLE_ROW_HEIGHT, fill=0, stroke=1)
                    
                    # Render question in cell
                    render_horizontal_question_table_cell(c, q, cell_x, current_y, table_col_width, question_counter, with_answers)
                    
                    question_counter += 1
                
                # Move cursor to end of table
                rows = (len(block.questions) + TABLE_COLUMNS - 1) // TABLE_COLUMNS
                current_y -= (rows * TABLE_ROW_HEIGHT)
            
            # Update cursor position
            cursor.y = block_y
    
    # ========== ANSWER KEY (if requested) ==========
    if with_answers or answers_only:
        c.showPage()
        answer_y = draw_page_header(c, f"{config.title} - Answer Key", config.level)
        cursor = PageCursor(c, answer_y, f"{config.title} - Answer Key", config.level)
        
        # Instructions
        apply_typography(c, TYPO_INSTRUCTIONS)
        cursor.move_down(apply_typography(c, TYPO_INSTRUCTIONS))
        c.drawString(MARGIN_LEFT, cursor.y, "Answer Key")
        cursor.move_down(SPACE_AFTER_INSTRUCTIONS + 3*mm)
        
        answer_counter = 1
        
        for block_index, block in enumerate(generated_blocks):
            if block_index > 0:
                cursor.move_down(SPACE_BETWEEN_BLOCKS)
            
            if block.config.title:
                section_height = TYPO_SECTION_TITLE.font_size * TYPO_SECTION_TITLE.leading + SPACE_AFTER_SECTION
                cursor.check_space(section_height)
                
                apply_typography(c, TYPO_SECTION_TITLE)
                c.drawString(MARGIN_LEFT, cursor.y, block.config.title)
                cursor.move_down(section_height)
            
            # Answers in clean list format with premium serial numbers
            for q in block.questions:
                answer_height = TYPO_ANSWER.font_size * TYPO_ANSWER.leading + 2*mm
                cursor.check_space(answer_height)
                
                # Premium serial number styling
                apply_typography(c, TYPO_QUESTION_NUMBER)
                c.drawString(MARGIN_LEFT, cursor.y, f"{answer_counter}.")
                
                # Answer text
                apply_typography(c, TYPO_ANSWER)
                c.drawString(MARGIN_LEFT + 8*mm, cursor.y, str(q.answer))
                answer_counter += 1
                cursor.move_down(answer_height)
    
    c.save()
    buffer.seek(0)
    return buffer
