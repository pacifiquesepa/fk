#!/usr/bin/env python3
"""
AI Grading Engine
==================
Evaluates open-ended student responses using the Groq API (llama3-8b-8192)
with Structured Outputs (JSON mode).

The engine loads quiz questions with detailed rubrics
(full_credit_criteria, partial_credit_criteria, zero_credit_criteria)
and student answers from separate JSON files, then produces a grading
report with scores and personalised feedback in Kinyarwanda.

Usage:
    python ai_grading_engine.py [quiz_data.json] [student_answers.json] [output_report.json]

Defaults:
    quiz_data.json           → data/grading_quiz_data.json
    student_answers.json     → data/student_answers_for_grading.json
    output_report.json       → data/grading_report.json
"""

import json
import os
import sys
from datetime import datetime
from typing import Any

from groq import Groq

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
DEFAULT_QUIZ_DATA_PATH = os.path.join(DATA_DIR, "grading_quiz_data.json")
DEFAULT_STUDENT_ANSWERS_PATH = os.path.join(DATA_DIR, "student_answers_for_grading.json")
DEFAULT_REPORT_PATH = os.path.join(DATA_DIR, "grading_report.json")

GROQ_MODEL = "llama3-8b-8192"
GROQ_MAX_TOKENS = 1000
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "YOUR_GROQ_API_KEY")

# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """
You are an expert, empathetic educator who specialises in evaluating
primary-level English and Kinyarwanda-speaking students. Your role is to
evaluate open-ended student responses with fairness, nuance, and
encouragement.

INSTRUCTIONS:

1. SEMANTIC EVALUATION (not keyword matching):
   Read the student's response carefully and understand the meaning.
   If the student demonstrates the concept correctly using their own
   words or synonyms, grant FULL credit.  For example, if the criteria
   asks for 'pointing to the window' and the student writes
   'I am showing the window with my finger', that still earns full credit.
   NEVER penalise creative wording as long as the meaning is correct.

2. RUBRIC-BASED SCORING:
   Use the three criteria provided for each question:
   - full_credit_criteria   → response must meet ALL requirements.
   - partial_credit_criteria → response partially meets the bar but
                                misses one or two elements.
   - zero_credit_criteria   → response fails to address the question
                                or is clearly incorrect.

3. POINT ASSIGNMENT:
   - Full credit   → award the full max_points.
   - Partial credit → award a proportional score (e.g., half or two-thirds
                      of max_points, at the grader's discretion).
   - Zero credit   → award 0 points.

4. FEEDBACK IN KINYARWANDA:
   Generate detailed, personalised feedback in KINYARWANDA.
   Your feedback MUST:
   - Explain WHY the student received that score.
   - Mention what they did perfectly or well.
   - Identify exactly what they missed, referencing the rubric.
   - Use encouraging and empathetic tone ("Reba neza!", "Emeza neza!").

5. CREDIT LEVEL:
   Set 'credit_level' to 'full', 'partial', or 'zero'.

6. RATIONALE:
   Provide 'rationale_english' as a brief teacher-facing note explaining
   your evaluation reasoning in English.

Return your evaluation as a JSON object with exactly these fields:
  - "score": integer from 0 to max_points
  - "feedback_kinyarwanda": string (minimum 2 sentences, in Kinyarwanda)
  - "credit_level": one of "full", "partial", "zero"
  - "rationale_english": string (brief English explanation for the teacher)
"""

# Structured Output schema
RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "name": "GradingResult",
    "strict": True,
    "properties": {
        "score": {
            "type": "integer",
            "description": "The points awarded to the student response, from 0 to the maximum possible.",
        },
        "feedback_kinyarwanda": {
            "type": "string",
            "description": "Detailed personalised feedback in Kinyarwanda explaining the score, what was done well, and what was missed.",
        },
        "credit_level": {
            "type": "string",
            "enum": ["full", "partial", "zero"],
            "description": "The credit level awarded: full, partial, or zero.",
        },
        "rationale_english": {
            "type": "string",
            "description": "Brief explanation in English for the teacher describing the evaluation reasoning.",
        },
    },
    "required": ["score", "feedback_kinyarwanda", "credit_level", "rationale_english"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------------------
# Data Loader
# ---------------------------------------------------------------------------
class GradingDataLoader:
    """Loads and validates quiz data and student answer files."""

    @staticmethod
    def load_json(file_path: str) -> Any:
        """Load a JSON file with error handling for missing or invalid files."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(
                f"File not found: '{file_path}'. "
                f"Please provide a valid path to the data file."
            )
        try:
            with open(file_path, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except json.JSONDecodeError as exc:
            raise json.JSONDecodeError(
                f"Invalid JSON in '{file_path}': {exc.msg}",
                exc.doc,
                exc.pos,
            )

    @staticmethod
    def load_quiz_data(file_path: str) -> list[dict[str, Any]]:
        """
        Load quiz data and extract the questions list.

        Accepts either:
          - A dict with a 'questions' key, or
          - A bare list of question objects.
        """
        data = GradingDataLoader.load_json(file_path)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "questions" in data:
            return data["questions"]
        raise ValueError(
            "Quiz data must be a list of questions or a dict with a 'questions' key."
        )

    @staticmethod
    def load_student_answers(
        file_path: str,
    ) -> list[dict[str, Any]]:
        """
        Load student answers. Accepts either:
          - A list of student objects, or
          - A dict with a 'students' key containing a list.
        """
        data = GradingDataLoader.load_json(file_path)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "students" in data:
            return data["students"]
        if isinstance(data, dict) and "answers" in data:
            return [data]
        raise ValueError(
            "Student answers must be a list of student objects, "
            "or a dict with a 'students' key."
        )


# ---------------------------------------------------------------------------
# AI Grader
# ---------------------------------------------------------------------------
class AiGrader:
    """Grades open-ended questions via the Groq API with structured output."""

    def __init__(self, api_key: str | None = None) -> None:
        resolved_key = api_key or GROQ_API_KEY
        self.client = Groq(api_key=resolved_key)

    def _build_user_prompt(
        self,
        question: dict[str, Any],
        student_response: str,
    ) -> str:
        """Build the user message for the Groq API call."""
        max_points = question.get("max_points", 5)
        prompt_text = question.get("prompt", "")
        rubric = question.get("rubric", {})

        full_criteria = rubric.get("full_credit_criteria", "N/A")
        partial_criteria = rubric.get("partial_credit_criteria", "N/A")
        zero_criteria = rubric.get("zero_credit_criteria", "N/A")

        return (
            f"QUESTION:\n{prompt_text}\n\n"
            f"Student's response:\n{student_response}\n\n"
            f"Maximum possible points: {max_points}\n\n"
            f"RUBRIC:\n"
            f"  FULL CREDIT — {full_criteria}\n"
            f"  PARTIAL CREDIT — {partial_criteria}\n"
            f"  ZERO CREDIT — {zero_criteria}\n\n"
            f"Evaluate the student's response using the rubric above. "
            f"Perform SEMANTIC evaluation — do not rely on exact keyword "
            f"matching. If the student conveys the same meaning using "
            f"different words or synonyms, award full credit.\n\n"
            f"Return a JSON object with: score (integer), "
            f"feedback_kinyarwanda (string), credit_level "
            f"('full'|'partial'|'zero'), and rationale_english (string)."
        )

    def grade_open_ended(
        self,
        question: dict[str, Any],
        student_response: str,
    ) -> dict[str, Any]:
        """
        Send the question, student response, and rubric to Llama 3
        and return the structured result.

        Returns a dict with keys: score, feedback_kinyarwanda,
        credit_level, rationale_english.
        """
        user_prompt = self._build_user_prompt(question, student_response)
        max_points = question.get("max_points", 5)

        try:
            response = self.client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "GradingResult",
                        "schema": RESPONSE_SCHEMA,
                    },
                },
                max_tokens=GROQ_MAX_TOKENS,
            )

            raw_output = response.choices[0].message.content
            if raw_output is None:
                raise ValueError("Received an empty response from the API.")

            parsed = json.loads(raw_output)
            score = int(parsed.get("score", 0))
            score = max(0, min(score, max_points))

            return {
                "score": score,
                "feedback_kinyarwanda": parsed.get("feedback_kinyarwanda", ""),
                "credit_level": parsed.get("credit_level", "zero"),
                "rationale_english": parsed.get(
                    "rationale_english", ""
                ),
                "graded_by": "llama3-8b-8192",
            }

        except Exception as exc:
            return {
                "score": 0,
                "feedback_kinyarwanda": (
                    f"Ikosa mu bumenyi: {exc}. "
                    f"Nta muntu yashobora kubaho kugirango yifashishe rubrique."
                ),
                "credit_level": "zero",
                "rationale_english": (
                    f"API error during grading: {exc}"
                ),
                "graded_by": "error",
            }


# ---------------------------------------------------------------------------
# Report Generator
# ---------------------------------------------------------------------------
class GradingReportGenerator:
    """Orchestrates the grading of all students and builds the final report."""

    def __init__(self, ai_grader: AiGrader) -> None:
        self.ai_grader = ai_grader

    def _index_questions(
        self, questions: list[dict[str, Any]]
    ) -> dict[str, dict[str, Any]]:
        """Build a lookup dict from question_id to question object."""
        question_map = {}
        for question in questions:
            qid = question.get("question_id", "unknown")
            question_map[qid] = question
        return question_map

    @staticmethod
    def _index_student_answers(
        student_record: dict[str, Any]
    ) -> dict[str, str]:
        """Build a lookup dict from question_id to student response."""
        answer_map = {}
        for entry in student_record.get("answers", []):
            qid = entry.get("question_id", "unknown")
            answer_map[qid] = entry.get("response", "")
        return answer_map

    def grade_student(
        self,
        student: dict[str, Any],
        questions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Grade all questions for a single student."""
        question_map = self._index_questions(questions)
        answer_map = self._index_student_answers(student)

        graded_results: list[dict[str, Any]] = []
        total_earned = 0
        total_possible = 0

        for question in questions:
            qid = question.get("question_id", "unknown")
            max_points = question.get("max_points", 5)
            total_possible += max_points

            student_response = answer_map.get(qid, "")
            ai_result = self.ai_grader.grade_open_ended(
                question, student_response
            )

            earned = ai_result.get("score", 0)
            total_earned += earned

            graded_results.append(
                {
                    "question_id": qid,
                    "question_prompt": question.get("prompt", ""),
                    "max_points": max_points,
                    "earned_points": earned,
                    "credit_level": ai_result.get("credit_level", "zero"),
                    "feedback_kinyarwanda": ai_result.get(
                        "feedback_kinyarwanda", ""
                    ),
                    "rationale_english": ai_result.get("rationale_english", ""),
                    "graded_by": ai_result.get("graded_by", "llama3-8b-8192"),
                }
            )

        percentage = (
            round((total_earned / total_possible) * 100, 2)
            if total_possible > 0
            else 0.0
        )

        return {
            "student_id": student.get("student_id", "unknown"),
            "student_name": student.get("student_name", "unknown"),
            "class": student.get("class", "unknown"),
            "summary": {
                "total_earned_points": total_earned,
                "total_possible_points": total_possible,
                "percentage_grade": percentage,
                "questions_answered": len(graded_results),
            },
            "graded_results": graded_results,
        }

    def generate_report(
        self,
        questions: list[dict[str, Any]],
        students: list[dict[str, Any]],
        quiz_metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """Grade all students and return the full report."""
        student_reports = []
        for student in students:
            student_report = self.grade_student(student, questions)
            student_reports.append(student_report)

        return {
            "report_generated_at": datetime.now().isoformat(
                timespec="seconds"
            ),
            "quiz_metadata": {
                "quiz_id": quiz_metadata.get("quiz_id", "unknown"),
                "title": quiz_metadata.get("title", "Untitled Quiz"),
                "subject": quiz_metadata.get("subject", "unknown"),
                "class_name": quiz_metadata.get("class_name", "unknown"),
            },
            "total_students": len(student_reports),
            "students": student_reports,
        }


# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------
def main() -> None:
    """Main entry point: load data, grade, and write report."""
    sys.stdout.reconfigure(encoding="utf-8")
    quiz_data_path = (
        sys.argv[1] if len(sys.argv) > 1 else DEFAULT_QUIZ_DATA_PATH
    )
    student_answers_path = (
        sys.argv[2] if len(sys.argv) > 2 else DEFAULT_STUDENT_ANSWERS_PATH
    )
    report_output_path = (
        sys.argv[3] if len(sys.argv) > 3 else DEFAULT_REPORT_PATH
    )

    # ---- Load quiz data ----
    try:
        raw_quiz_data = GradingDataLoader.load_json(quiz_data_path)
        questions = GradingDataLoader.load_quiz_data(quiz_data_path)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as exc:
        print(f"[ERROR] Failed to load quiz data: {exc}", file=sys.stderr)
        sys.exit(1)

    quiz_metadata = (
        raw_quiz_data
        if isinstance(raw_quiz_data, dict)
        else {"questions": raw_quiz_data}
    )

    # ---- Load student answers ----
    try:
        students = GradingDataLoader.load_student_answers(student_answers_path)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as exc:
        print(f"[ERROR] Failed to load student answers: {exc}", file=sys.stderr)
        sys.exit(1)

    # ---- Validate at least one question has a rubric ----
    rubric_questions = [
        q for q in questions if q.get("rubric")
    ]
    if not rubric_questions:
        print(
            "[WARNING] No questions with rubrics found. "
            "AI grading requires rubric criteria.",
            file=sys.stderr,
        )

    ai_grader = AiGrader()

    # ---- Grade all students ----
    report_generator = GradingReportGenerator(ai_grader)
    report = report_generator.generate_report(
        questions, students, quiz_metadata
    )

    # ---- Write report ----
    with open(report_output_path, "w", encoding="utf-8") as output_file:
        json.dump(report, output_file, indent=2, ensure_ascii=False)

    # ---- Console summary ----
    print(
        f"AI Grading Report — {report['quiz_metadata']['title']}"
    )
    print(f"Total students graded: {report['total_students']}")
    print("-" * 60)
    for student_report in report["students"]:
        summary = student_report["summary"]
        print(
            f"  {student_report['student_name']} "
            f"({student_report['student_id']}): "
            f"{summary['total_earned_points']}/{summary['total_possible_points']} "
            f"→ {summary['percentage_grade']}%"
        )
    print("-" * 60)
    print(f"Report written to: {report_output_path}")


if __name__ == "__main__":
    main()
