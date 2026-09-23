#!/usr/bin/env python3
"""
Automated Quiz Correction Engine
=================================
Processes quiz configurations and student responses to generate a
detailed grading and performance analysis report.

Grading is split by question type:
  - multiple_choice  → evaluated directly in Python (exact string match)
  - open_ended       → evaluated via the OpenAI API (GPT-4o-mini) using
                       Structured Outputs for a score and contextual feedback

Outputs are generated in both JSON and PDF formats:
  - JSON report written to quiz_report.json (or custom path)
  - PDF report card written to generated/student_report.pdf

Usage:
    python quiz_correction_engine.py [quiz_data.json] [student_answers.json] [output_report.json] [output_pdf.pdf]

If no arguments are provided, default file names are used:
    quiz_data.json, student_answers.json, quiz_report.json, generated/student_report.pdf

Environment:
    OPENAI_API_KEY  – must be set in the environment for open-ended grading.
"""

import json
import os
import sys
from datetime import datetime
from collections import defaultdict
from typing import Any

from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
)
from reportlab.lib.colors import (
    Color,
    HexColor,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
GENERATED_DIR = os.path.join(SCRIPT_DIR, "generated")
DEFAULT_QUIZ_DATA_PATH = os.path.join(DATA_DIR, "quiz_data.json")
DEFAULT_STUDENT_ANSWERS_PATH = os.path.join(DATA_DIR, "student_answers.json")
DEFAULT_REPORT_PATH = os.path.join(DATA_DIR, "quiz_report.json")
DEFAULT_PDF_PATH = os.path.join(GENERATED_DIR, "student_report.pdf")

OPENAI_MODEL = "gpt-4o-mini"
OPENAI_MAX_TOKENS = 500


# ---------------------------------------------------------------------------
# Data Loader
# ---------------------------------------------------------------------------
class DataLoader:
    """Handles loading and basic validation of JSON input files."""

    @staticmethod
    def load_json(file_path: str) -> dict[str, Any]:
        """Load a JSON file and return its contents as a dictionary."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(
                f"Required file not found: '{file_path}'. "
                f"Please ensure the file exists before running the engine."
            )
        try:
            with open(file_path, "r", encoding="utf-8") as file_handle:
                return json.load(file_handle)
        except json.JSONDecodeError as exc:
            raise json.JSONDecodeError(
                f"File '{file_path}' contains invalid JSON: {exc.msg}",
                exc.doc,
                exc.pos,
            )

    @staticmethod
    def load_quiz_config(file_path: str) -> dict[str, Any]:
        """Load and validate the quiz configuration file."""
        quiz_config = DataLoader.load_json(file_path)
        required_keys = {"questions"}
        missing = required_keys - set(quiz_config.keys())
        if missing:
            raise ValueError(
                f"Quiz data is missing required key(s): {missing}. "
                f"The 'questions' list must be present."
            )
        if not isinstance(quiz_config["questions"], list):
            raise ValueError("'questions' in quiz data must be a list.")
        return quiz_config

    @staticmethod
    def load_student_answers(file_path: str) -> dict[str, Any]:
        """Load and validate the student answers file."""
        student_data = DataLoader.load_json(file_path)
        required_keys = {"student_id", "responses"}
        missing = required_keys - set(student_data.keys())
        if missing:
            raise ValueError(
                f"Student answers file is missing required key(s): {missing}. "
                f"'student_id' and 'responses' are required."
            )
        if not isinstance(student_data["responses"], list):
            raise ValueError("'responses' in student answers must be a list.")
        return student_data

    @staticmethod
    def build_response_map(
        responses: list[dict[str, Any]]
    ) -> dict[str, str]:
        """Convert a list of response objects into a question_id -> answer dict."""
        response_map: dict[str, str] = {}
        for entry in responses:
            question_id = entry.get("question_id", "unknown")
            answer = entry.get("answer", "")
            response_map[question_id] = answer
        return response_map


# ---------------------------------------------------------------------------
# Python Grader (for multiple choice)
# ---------------------------------------------------------------------------
class PythonGrader:
    """Grades multiple-choice questions using direct string equality."""

    @staticmethod
    def grade_multiple_choice(
        student_answer: str, correct_answer: str
    ) -> tuple[int, str]:
        """
        Returns (points_earned, feedback).

        Uses direct equality comparison after normalising whitespace
        and casing so that trivial formatting differences are ignored.
        """
        normalised_student = str(student_answer).strip().lower()
        normalised_correct = str(correct_answer).strip().lower()

        if normalised_student == normalised_correct:
            return 1, f"Correct: '{correct_answer}'."
        else:
            return 0, (
                f"Expected '{correct_answer}' but received '{student_answer}'."
            )


# ---------------------------------------------------------------------------
# OpenAI Grader (for open-ended questions)
# ---------------------------------------------------------------------------
class OpenAIGrader:
    """Grades open-ended questions via the OpenAI API with structured output."""

    RESPONSE_SCHEMA: dict[str, Any] = {
        "type": "object",
        "name": "QuizScore",
        "properties": {
            "score": {
                "type": "integer",
                "description": "The score awarded to the student response, from 0 to the maximum possible points.",
            },
            "feedback": {
                "type": "string",
                "description": "A short, contextual feedback string (1-2 sentences) explaining the score.",
            },
        },
        "required": ["score", "feedback"],
        "additionalProperties": False,
    }

    def __init__(self, api_key: str | None = None) -> None:
        """Initialise the OpenAI client. Raises if no API key is available."""
        resolved_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not resolved_key:
            raise EnvironmentError(
                "OPENAI_API_KEY is not set in the environment. "
                "Open-ended questions cannot be graded without an API key."
            )
        self.client = OpenAI(api_key=resolved_key)

    def _build_prompt(
        self,
        question: dict[str, Any],
        student_answer: str,
    ) -> tuple[str, str]:
        """Build the system and user messages for the OpenAI API call."""
        max_points = question.get("points", 4)
        correct_keywords = question.get("correct_keywords", [])
        rubric = question.get("rubric", {})
        rubric_criteria = rubric.get("criteria", [])

        # Format rubric criteria for the prompt
        rubric_text = ""
        if rubric_criteria:
            rubric_lines = []
            for criterion in rubric_criteria:
                rubric_lines.append(
                    f"  - {criterion.get('name', 'unnamed')}: "
                    f"{criterion.get('points', 1)} point(s)"
                )
            rubric_text = "\nRubric criteria:\n" + "\n".join(rubric_lines)
        else:
            rubric_text = ""

        # Format correct keywords
        keyword_text = ""
        if correct_keywords:
            keyword_text = (
                f"\nReference keywords (the response should ideally "
                f"contain at least 2): {correct_keywords}"
            )

        system_prompt = (
            "You are an automated quiz grader for primary-level English "
            "students. Your task is to evaluate the student's written "
            "response to an open-ended question and assign a score along "
            "with concise feedback. Follow the rubric criteria precisely. "
            "Return your evaluation as a JSON object with two fields: "
            "'score' (an integer from 0 to the maximum points) and "
            "'feedback' (a short 1-2 sentence explanation). "
            "Do NOT include any other text outside the JSON object."
        )

        user_prompt = (
            f"Question:\n{question.get('prompt', '')}\n\n"
            f"Student's answer:\n{student_answer}\n\n"
            f"Maximum possible points: {max_points}.{rubric_text}"
            f"{keyword_text}\n\n"
            f"Evaluate and return JSON with 'score' and 'feedback'."
        )

        return system_prompt, user_prompt

    def grade_open_ended(
        self,
        question: dict[str, Any],
        student_answer: str,
    ) -> tuple[int, str]:
        """
        Send the question and student response to GPT-4o-mini using
        Structured Outputs and return (score, feedback).
        """
        system_prompt, user_prompt = self._build_prompt(
            question, student_answer
        )

        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = self.client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "QuizScore",
                    "schema": self.RESPONSE_SCHEMA,
                    "strict": True,
                },
            },
            max_tokens=OPENAI_MAX_TOKENS,
        )

        raw_output = response.choices[0].message.content
        if raw_output is None:
            raise ValueError("OpenAI API returned an empty response.")

        parsed: dict[str, Any] = json.loads(raw_output)
        score = int(parsed.get("score", 0))
        max_points = question.get("points", 4)

        # Clamp score to valid range
        score = max(0, min(score, max_points))

        feedback = str(parsed.get("feedback", ""))

        return score, feedback


# ---------------------------------------------------------------------------
# Combined Quiz Grader
# ---------------------------------------------------------------------------
class QuizGrader:
    """Routes questions to the correct grader based on type."""

    def __init__(self, openai_api_key: str | None = None) -> None:
        self.python_grader = PythonGrader()
        self.openai_grader: OpenAIGrader | None = None
        self._openai_available = True
        if openai_api_key or os.environ.get("OPENAI_API_KEY"):
            try:
                self.openai_grader = OpenAIGrader(openai_api_key)
            except EnvironmentError:
                self._openai_available = False

    def grade_question(
        self,
        question: dict[str, Any],
        student_response: str | None,
    ) -> dict[str, Any]:
        """
        Grade a single question and return a result dictionary.
        """
        question_id = question.get("question_id", "unknown")
        question_type = question.get("type", "unknown")
        max_points = question.get("points", 1)
        response_text = student_response or ""

        if question_type == "multiple_choice":
            correct_answer = question.get("correct_answer", "")
            earned_points, feedback = self.python_grader.grade_multiple_choice(
                response_text, correct_answer
            )
            earned_points = earned_points * max_points

        elif question_type == "open_ended":
            if self.openai_grader is not None:
                earned_points, feedback = self.openai_grader.grade_open_ended(
                    question, response_text
                )
            else:
                feedback = (
                    "OPENAI_API_KEY not set; open-ended question "
                    "could not be graded by OpenAI. Skipping."
                )
                earned_points = 0

        else:
            feedback = f"Unknown question type: '{question_type}'."
            earned_points = 0

        return {
            "question_id": question_id,
            "type": question_type,
            "points": max_points,
            "earned_points": earned_points,
            "is_correct": earned_points >= max_points,
            "feedback": feedback,
            "graded_by": (
                "python" if question_type == "multiple_choice" else "openai"
            ),
        }


# ---------------------------------------------------------------------------
# Performance Analyzer
# ---------------------------------------------------------------------------
class PerformanceAnalyzer:
    """Computes aggregate metrics and generates the final report."""

    def __init__(self) -> None:
        """Initialise per-type statistics accumulators."""
        self.type_stats: dict[str, dict[str, int]] = defaultdict(
            lambda: {
                "total_points": 0,
                "earned_points": 0,
                "count": 0,
                "correct_count": 0,
            }
        )

    def analyze(
        self,
        questions: list[dict[str, Any]],
        response_map: dict[str, str],
        grader: QuizGrader,
    ) -> list[dict[str, Any]]:
        """
        Grade every question and accumulate per-type statistics.

        Returns a list of per-question result dictionaries.
        """
        results: list[dict[str, Any]] = []

        for question in questions:
            question_id = question.get("question_id", "unknown")
            response = response_map.get(question_id)
            question_type = question.get("type", "unknown")
            max_points = question.get("points", 1)

            result = grader.grade_question(question, response)
            results.append(result)
            self._update_type_stats(
                question_type, max_points, result["earned_points"]
            )

        return results

    def _update_type_stats(
        self,
        question_type: str,
        max_points: int,
        earned_points: int,
    ) -> None:
        """Accumulate statistics for a given question type."""
        stats = self.type_stats[question_type]
        stats["total_points"] += max_points
        stats["earned_points"] += earned_points
        stats["count"] += 1
        if earned_points >= max_points:
            stats["correct_count"] += 1

    @staticmethod
    def _calculate_total_points(results: list[dict[str, Any]]) -> int:
        """Sum all maximum possible points across questions."""
        return sum(r["points"] for r in results)

    @staticmethod
    def _calculate_earned_points(results: list[dict[str, Any]]) -> int:
        """Sum all earned points across questions."""
        return sum(r["earned_points"] for r in results)

    def _build_type_breakdown(
        self, results: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Build a list of per-question-type performance summaries."""
        breakdown = []
        for question_type, stats in sorted(self.type_stats.items()):
            total = stats["total_points"] if stats["total_points"] > 0 else 1
            accuracy = round((stats["earned_points"] / total) * 100, 2)
            breakdown.append(
                {
                    "question_type": question_type,
                    "question_count": stats["count"],
                    "correct_count": stats["correct_count"],
                    "attempted_count": stats["count"],
                    "total_points": stats["total_points"],
                    "earned_points": stats["earned_points"],
                    "accuracy_percent": accuracy,
                }
            )
        return breakdown

    def _find_lowest_accuracy_type(
        self, breakdown: list[dict[str, Any]]
    ) -> str | None:
        """Identify the question type with the lowest accuracy."""
        if not breakdown:
            return None
        lowest = min(breakdown, key=lambda b: b["accuracy_percent"])
        return lowest["question_type"]

    def generate_report(
        self,
        results: list[dict[str, Any]],
        student_info: dict[str, Any],
        quiz_config: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Generate the final performance analysis report.
        """
        total_possible = self._calculate_total_points(results)
        total_earned = self._calculate_earned_points(results)
        percentage = (
            round((total_earned / total_possible) * 100, 2)
            if total_possible > 0
            else 0.0
        )

        breakdown = self._build_type_breakdown(results)
        lowest_type = self._find_lowest_accuracy_type(breakdown)

        report = {
            "student_id": student_info.get("student_id", "unknown"),
            "student_name": student_info.get("student_name", "unknown"),
            "quiz_title": quiz_config.get("quiz_title", "Untitled Quiz"),
            "subject": quiz_config.get("subject", "unknown"),
            "class_name": quiz_config.get("class_name", "unknown"),
            "summary": {
                "total_possible_points": total_possible,
                "total_earned_points": total_earned,
                "percentage_grade": percentage,
                "total_questions": len(results),
                "correct_questions": sum(
                    1 for r in results if r["is_correct"]
                ),
            },
            "performance_by_type": breakdown,
            "lowest_accuracy_type": lowest_type,
            "detailed_results": results,
        }

        return report


# ---------------------------------------------------------------------------
# PDF Report Generator
# ---------------------------------------------------------------------------
class PDFReportGenerator:
    """Generates a well-formatted PDF report card from a quiz report dict."""

    DARK_BLUE = HexColor("#1a3a5c")
    LIGHT_GREY = HexColor("#f5f5f5")
    GREEN = HexColor("#2e7d32")
    RED = HexColor("#c62828")
    ORANGE = HexColor("#ef6c00")

    def __init__(self, output_path: str) -> None:
        self.output_path = output_path
        self.styles = getSampleStyleSheet()
        self._define_styles()

    def _define_styles(self) -> None:
        """Define custom paragraph styles for the PDF."""
        self.styles.add(
            ParagraphStyle(
                name="ReportTitle",
                parent=self.styles["Heading1"],
                fontSize=20,
                leading=26,
                alignment=TA_CENTER,
                spaceAfter=14,
                textColor=self.DARK_BLUE,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="ReportSubtitle",
                parent=self.styles["Normal"],
                fontSize=11,
                leading=15,
                alignment=TA_CENTER,
                spaceAfter=6,
                textColor=HexColor("#555555"),
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="SectionHeader",
                parent=self.styles["Heading2"],
                fontSize=14,
                leading=18,
                spaceBefore=14,
                spaceAfter=8,
                textColor=self.DARK_BLUE,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="SummaryValue",
                parent=self.styles["Normal"],
                fontSize=11,
                leading=14,
                alignment=TA_LEFT,
            )
        )

    def _grade_letter(self, percentage: float) -> tuple[str, Color]:
        """Map a percentage to a letter grade and colour."""
        if percentage >= 80:
            return "A", self.GREEN
        elif percentage >= 60:
            return "B", self.GREEN
        elif percentage >= 40:
            return "C", self.ORANGE
        else:
            return "F", self.RED

    def _build_header(self, report: dict[str, Any]) -> list[Any]:
        """Build the styled header elements."""
        elements: list[Any] = []
        today = datetime.now().strftime("%B %d, %Y")

        grade_letter, _ = self._grade_letter(
            report["summary"]["percentage_grade"]
        )

        elements.append(Paragraph("Quiz Report Card", self.styles["ReportTitle"]))
        elements.append(
            Paragraph(
                f"{report['quiz_title']} — {report['subject']} "
                f"({report['class_name']})",
                self.styles["ReportSubtitle"],
            )
        )
        elements.append(
            Paragraph(
                f"Student: {report['student_name']}  |  "
                f"Date: {today}",
                self.styles["ReportSubtitle"],
            )
        )
        elements.append(
            Paragraph(
                f"Overall Grade: {grade_letter}  "
                f"({report['summary']['percentage_grade']}%)",
                self.styles["ReportSubtitle"],
            )
        )
        elements.append(Spacer(1, 0.2 * inch))
        return elements

    def _build_summary_table(self, report: dict[str, Any]) -> Table:
        """Build the summary table with final score, percentage, and feedback."""
        summary = report["summary"]
        lowest_type = report.get("lowest_accuracy_type", "N/A")

        # Gather per-type accuracy for the feedback section
        type_lines: list[str] = []
        for entry in report.get("performance_by_type", []):
            type_lines.append(
                f"{entry['question_type']}: "
                f"{entry['earned_points']}/{entry['total_points']} pts "
                f"({entry['accuracy_percent']}%)"
            )
        type_summary_text = "<br/>".join(type_lines) if type_lines else "N/A"
        feedback_text = (
            f"Strongest area: "
            f"{max(report.get('performance_by_type', []), key=lambda e: e['accuracy_percent'])['question_type'] if report.get('performance_by_type') else 'N/A'}. "
            f"Needs practice: {lowest_type}.<br/>"
            f"<font size=8>{type_summary_text}</font>"
        )

        data = [
            ["Summary", "Value"],
            [
                "Total Score",
                f"{summary['total_earned_points']} / {summary['total_possible_points']}",
            ],
            ["Percentage", f"{summary['percentage_grade']}%"],
            [
                "Questions Correct",
                f"{summary['correct_questions']} / {summary['total_questions']}",
            ],
            ["Lowest Accuracy Type", str(lowest_type)],
            ["Feedback", feedback_text],
        ]

        table = Table(data, colWidths=[2.2 * inch, 4.6 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (1, 0), self.DARK_BLUE),
                    ("TEXTCOLOR", (0, 0), (1, 0), colors.whitesmoke),
                    ("FONTSIZE", (0, 0), (1, 0), 13),
                    ("FONTNAME", (0, 0), (1, 0), "Helvetica-Bold"),
                    ("ALIGN", (0, 0), (1, 0), "CENTER"),
                    ("BACKGROUND", (0, 1), (0, -1), self.LIGHT_GREY),
                    ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 1), (0, -1), 10),
                    ("ALIGN", (0, 1), (0, -1), "LEFT"),
                    ("ALIGN", (1, 1), (1, -1), "LEFT"),
                    ("FONTSIZE", (1, 1), (1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, -1), (1, -1), 10),
                ]
            )
        )
        return table

    def _build_results_table(self, report: dict[str, Any]) -> Table:
        """Build the detailed results table per question."""
        results = report.get("detailed_results", [])
        if not results:
            return Table([])

        header = ["QID", "Type", "Score", "Feedback"]
        data: list[list[Any]] = [
            [Paragraph(h, self.styles["Normal"]) for h in header]
        ]

        for result in results:
            score_str = f"{result['earned_points']}/{result['points']}"
            qid_str = result.get("question_id", "?")
            type_str = result.get("type", "?")
            feedback_str = result.get("feedback", "")

            # Truncate very long feedback for the table cell
            if len(feedback_str) > 120:
                feedback_str = feedback_str[:117] + "..."

            data.append(
                [
                    Paragraph(qid_str, self.styles["Normal"]),
                    Paragraph(type_str, self.styles["Normal"]),
                    Paragraph(
                        score_str,
                        ParagraphStyle(
                            name="cell_score",
                            parent=self.styles["Normal"],
                            alignment=TA_CENTER,
                        ),
                    ),
                    Paragraph(feedback_str, self.styles["Normal"]),
                ]
            )

        table = Table(
            data,
            colWidths=[0.9 * inch, 1.2 * inch, 0.8 * inch, 4.1 * inch],
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), self.DARK_BLUE),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("ALIGN", (0, 0), (2, 0), "CENTER"),
                    ("ALIGN", (3, 0), (3, -1), "LEFT"),
                    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
                    ("BACKGROUND", (0, 1), (-1, -1), HexColor("#fafafa")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                ]
            )
        )
        return table

    def generate(self, report: dict[str, Any]) -> str:
        """Generate the full PDF report card and return the output path."""
        os.makedirs(os.path.dirname(self.output_path), exist_ok=True)

        doc = SimpleDocTemplate(
            self.output_path,
            pagesize=A4,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
            title=f"Quiz Report - {report.get('student_name', 'Student')}",
        )

        elements: list[Any] = []

        # --- Styled Header ---
        elements.extend(self._build_header(report))

        # --- Summary Table ---
        elements.append(Paragraph("Summary", self.styles["SectionHeader"]))
        elements.append(self._build_summary_table(report))
        elements.append(Spacer(1, 0.3 * inch))

        # --- Detailed Results Table ---
        elements.append(
            Paragraph("Detailed Results", self.styles["SectionHeader"])
        )
        elements.append(self._build_results_table(report))
        elements.append(Spacer(1, 0.2 * inch))

        # --- Footer note ---
        elements.append(
            Paragraph(
                "Report generated by the Automated Quiz Correction Engine.",
                ParagraphStyle(
                    name="FooterNote",
                    parent=self.styles["Normal"],
                    fontSize=7,
                    alignment=TA_CENTER,
                    textColor=HexColor("#999999"),
                ),
            )
        )

        doc.build(elements)
        return self.output_path


# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------
def main() -> None:
    """Main entry point: load data, grade, analyse, and write report."""
    quiz_data_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_QUIZ_DATA_PATH
    student_answers_path = (
        sys.argv[2] if len(sys.argv) > 2 else DEFAULT_STUDENT_ANSWERS_PATH
    )
    report_output_path = (
        sys.argv[3] if len(sys.argv) > 3 else DEFAULT_REPORT_PATH
    )
    pdf_output_path = (
        sys.argv[4] if len(sys.argv) > 4 else DEFAULT_PDF_PATH
    )

    # ---- Load data ----
    try:
        quiz_config = DataLoader.load_quiz_config(quiz_data_path)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as exc:
        print(f"[ERROR] Failed to load quiz data: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        student_data = DataLoader.load_student_answers(student_answers_path)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as exc:
        print(f"[ERROR] Failed to load student answers: {exc}", file=sys.stderr)
        sys.exit(1)

    questions = quiz_config.get("questions", [])
    response_map = DataLoader.build_response_map(
        student_data.get("responses", [])
    )

    # ---- Initialise grader and analyser ----
    grader = QuizGrader()
    analyser = PerformanceAnalyzer()

    # ---- Grade all questions ----
    results = analyser.analyze(questions, response_map, grader)

    # ---- Generate report ----
    report = analyser.generate_report(results, student_data, quiz_config)

    # ---- Write report ----
    with open(report_output_path, "w", encoding="utf-8") as output_file:
        json.dump(report, output_file, indent=2, ensure_ascii=False)

    # ---- Console summary ----
    summary = report["summary"]
    print(f"Quiz Report for: {report['student_name']} ({report['student_id']})")
    print(f"Quiz: {report['quiz_title']}")
    print(f"Score: {summary['total_earned_points']}/{summary['total_possible_points']}")
    print(f"Percentage: {summary['percentage_grade']}%")
    print(f"Correct: {summary['correct_questions']}/{summary['total_questions']}")
    print(f"Lowest accuracy type: {report['lowest_accuracy_type']}")
    print("\nPerformance by type:")
    for entry in report["performance_by_type"]:
        print(
            f"  {entry['question_type']}: "
            f"{entry['correct_count']}/{entry['question_count']} correct "
            f"({entry['accuracy_percent']}%)"
        )
    print(f"\nReport written to: {report_output_path}")

    # ---- Generate PDF report card ----
    try:
        pdf_generator = PDFReportGenerator(pdf_output_path)
        pdf_generator.generate(report)
        print(f"PDF report card written to: {pdf_output_path}")
    except Exception as exc:
        print(
            f"[WARNING] Failed to generate PDF report card: {exc}",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
