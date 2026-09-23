#!/usr/bin/env python3
"""
Social Studies Analysis & Grading Report Generator
===================================================
Analyzes the P1 Études Sociales Unité 1 (Membres de la famille) question bank
and generates a structured grading report.

Handles corrupted data by stripping injected 'Use code with caution.' text
that may appear between JSON tokens, then parses the cleaned content.

Usage:
    python analyze_social_studies.py [data_file.json] [output_report.json]

Defaults:
    data_file.json    -> data/social_studies_p1_u1.json
    output_report.json -> data/social_studies_u1_analysis.json
"""

import json
import os
import sys
from datetime import datetime
from typing import Any
from collections import Counter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
DEFAULT_DATA_PATH = os.path.join(DATA_DIR, "social_studies_p1_u1.json")
DEFAULT_REPORT_PATH = os.path.join(DATA_DIR, "social_studies_u1_analysis.json")

CORRUPTION_PATTERNS = [
    "Use code with caution.",
    "Use code with caution.\n",
    "\nUse code with caution.",
]


def clean_corruption(text: str) -> str:
    """Remove injected corruption strings from raw JSON text."""
    cleaned = text
    for pattern in CORRUPTION_PATTERNS:
        cleaned = cleaned.replace(pattern, "")
    return cleaned


def load_question_bank(file_path: str) -> dict[str, Any]:
    """Load and validate the question bank JSON, cleaning corruption if needed."""
    with open(file_path, "r", encoding="utf-8") as fh:
        raw = fh.read()

    cleaned = clean_corruption(raw)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        fixed = clean_corruption(raw)
        try:
            data = json.loads(fixed)
        except json.JSONDecodeError:
            raise ValueError(f"Failed to parse JSON after cleaning: {exc}")

    return data


def flatten_questions(data: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Flatten the nested assessment_matrix into a flat list of questions.
    Each question gets additional context fields: difficulty, question_type.
    """
    questions: list[dict[str, Any]] = []

    assessment = data.get("assessment_matrix", {})
    for difficulty, type_groups in assessment.items():
        for qtype, q_list in type_groups.items():
            if isinstance(q_list, list):
                for q in q_list:
                    flat = {
                        "prompt": q.get("prompt", ""),
                        "question_type": qtype,
                        "difficulty": difficulty,
                        "points": q.get("points", 0),
                        "options": q.get("options"),
                        "answer": q.get("answer"),
                        "metadata": q.get("metadata", {}),
                    }
                    questions.append(flat)

    return questions


class SocialStudiesAnalyzer:
    """Analyzes the question bank and generates summary statistics."""

    def __init__(self, questions: list[dict[str, Any]]) -> None:
        self.questions = questions

    def total_questions(self) -> int:
        return len(self.questions)

    def total_points(self) -> int:
        return sum(q["points"] for q in self.questions)

    def _count_by(self, key: str) -> Counter:
        return Counter(q.get(key, "unknown") for q in self.questions)

    def questions_by_difficulty(self) -> dict[str, int]:
        counts = self._count_by("difficulty")
        return dict(counts)

    def questions_by_type(self) -> dict[str, int]:
        counts = self._count_by("question_type")
        return dict(counts)

    def points_by_difficulty(self) -> dict[str, int]:
        result: dict[str, int] = {}
        for q in self.questions:
            diff = q.get("difficulty", "unknown")
            result[diff] = result.get(diff, 0) + q["points"]
        return dict(result)

    def subtopics(self) -> list[str]:
        subs = set()
        for q in self.questions:
            sub = q.get("metadata", {}).get("subtopic", "")
            if sub:
                subs.add(sub)
        return sorted(subs)

    def open_ended_questions(self) -> list[dict[str, Any]]:
        """Extract open_ended questions that require AI grading."""
        return [q for q in self.questions if q["question_type"] == "open_question"]

    def grading_criteria(self) -> list[dict[str, Any]]:
        """Extract grading criteria from open-ended questions for the AI grader."""
        results = []
        for q in self.open_ended_questions():
            metadata = q.get("metadata", {})
            grading = metadata.get("grading", {})
            criteria = grading.get("criteria", [])
            rubric = {
                "question_prompt": q["prompt"],
                "max_points": q["points"],
                "full_credit_criteria": "; ".join(
                    f"{c['criterion']} (+{c['points']})" for c in criteria
                ) if criteria else "Student response addresses all key points.",
                "partial_credit_criteria": "Response addresses some but not all key points.",
                "zero_credit_criteria": "Response fails to address the question.",
            }
            results.append(rubric)
        return results

    def to_report(self) -> dict[str, Any]:
        """Generate a complete analysis and grading report."""
        by_diff = self.questions_by_difficulty()
        by_type = self.questions_by_type()
        by_diff_points = self.points_by_difficulty()
        grading_rubrics = self.grading_criteria()
        open_ended = self.open_ended_questions()

        return {
            "report_generated_at": datetime.now().isoformat(timespec="seconds"),
            "subject": "Études Sociales",
            "class": "P1",
            "unit": "Unité 1: Membres de la famille",
            "summary": {
                "total_questions": self.total_questions(),
                "total_points": self.total_points(),
                "questions_by_difficulty": by_diff,
                "questions_by_type": by_type,
                "points_by_difficulty": by_diff_points,
            },
            "subtopics": self.subtopics(),
            "open_ended_questions": {
                "count": len(open_ended),
                "total_points": sum(q["points"] for q in open_ended),
            },
            "grading_rubrics": grading_rubrics,
        }


def print_summary(analyzer: SocialStudiesAnalyzer) -> None:
    """Print a human-readable summary to the console."""
    print(f"  Subject:        Études Sociales — Unité 1")
    print(f"  Total Questions: {analyzer.total_questions()}")
    print(f"  Total Points:    {analyzer.total_points()}")
    print(f"  Subtopics:       {', '.join(analyzer.subtopics())}")
    print()
    print("  Questions by Difficulty:")
    for level, count in analyzer.questions_by_difficulty().items():
        pts = analyzer.points_by_difficulty().get(level, 0)
        print(f"    {level:10s}: {count} questions ({pts} points)")
    print()
    print("  Questions by Type:")
    for qtype, count in analyzer.questions_by_type().items():
        print(f"    {qtype:20s}: {count}")
    print()
    oe = analyzer.open_ended_questions()
    print(f"  Open-ended questions (for AI grading): {len(oe)}")
    for q in oe:
        print(f"    [{q['points']} pts] {q['prompt'][:70]}...")


def main() -> None:
    data_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DATA_PATH
    report_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_REPORT_PATH

    sys.stdout.reconfigure(encoding="utf-8")

    print("=" * 65)
    print("  Social Studies Analysis & Grading Report Generator")
    print("=" * 65)
    print()

    data = load_question_bank(data_path)
    questions = flatten_questions(data)
    analyzer = SocialStudiesAnalyzer(questions)

    print_summary(analyzer)
    print()

    report = analyzer.to_report()

    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, ensure_ascii=False)

    print(f"  Analysis report written to: {report_path}")
    print(f"  Grading rubrics ready for ai_grading_engine.py: {len(report['grading_rubrics'])}")
    print("=" * 65)


if __name__ == "__main__":
    main()
