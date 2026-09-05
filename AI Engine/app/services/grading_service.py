from __future__ import annotations

from typing import Any, Dict, List


class GradingService:
    """Scores answers according to the assessment structure."""

    def grade_assessment(self, assessment: Dict[str, Any], answers: List[Dict[str, Any]]) -> Dict[str, Any]:
        answer_map = {item["question_id"]: item["answer"] for item in answers}
        total_points = 0
        earned_points = 0
        per_question: List[Dict[str, Any]] = []

        for question in assessment.get("questions", []):
            question_id = question["id"]
            correct_answer = question.get("answer")
            student_answer = answer_map.get(question_id)
            points = int(question.get("points", 0))
            total_points += points

            is_correct = self._compare_answers(correct_answer, student_answer)
            if is_correct:
                earned_points += points

            per_question.append({
                "question_id": question_id,
                "type": question.get("type"),
                "points": points,
                "earned": points if is_correct else 0,
                "correct": is_correct,
            })

        percentage = (earned_points / total_points * 100) if total_points else 0
        return {
            "total_points": total_points,
            "earned_points": earned_points,
            "percentage": round(percentage, 2),
            "passed": percentage >= 50,
            "questions": per_question,
        }

    def _compare_answers(self, expected: Any, received: Any) -> bool:
        if expected is None:
            return True
        if isinstance(expected, list) and isinstance(received, list):
            return expected == received
        if isinstance(expected, dict) and isinstance(received, dict):
            return expected == received
        return str(expected).strip().lower() == str(received).strip().lower() if received is not None else False
