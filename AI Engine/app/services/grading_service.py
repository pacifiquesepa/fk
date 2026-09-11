from __future__ import annotations

from typing import Any, Dict, List


class GradingService:
    """Scores answers according to the assessment structure."""

    def grade_assessment(self, assessment: Dict[str, Any], answers: List[Dict[str, Any]]) -> Dict[str, Any]:
        answer_map = {item["question_id"]: item for item in answers}
        total_points = 0
        earned_points = 0
        per_question: List[Dict[str, Any]] = []

        for question in assessment.get("questions", []):
            question_id = question["id"]
            correct_answer = question.get("answer")
            submitted = answer_map.get(question_id, {})
            student_answer = submitted.get("answer")
            points = int(question.get("points", 0))
            total_points += points

            rubric = question.get("metadata", {}).get("marking_scheme") or question.get("metadata", {}).get("grading")
            is_manual_review = question.get("type") == "open_question" and rubric
            manual_score = submitted.get("score") if is_manual_review else None
            if manual_score is not None:
                earned = max(0.0, min(float(points), float(manual_score)))
                status = "correct" if earned == points else "partially_correct" if earned > 0 else "incorrect"
                is_correct = earned == points
            else:
                earned = 0 if is_manual_review else points if self._compare_answers(correct_answer, student_answer, question.get("metadata", {})) else 0
                is_correct = earned == points and not is_manual_review
                status = "teacher_review" if is_manual_review else "correct" if is_correct else "incorrect"
                partial_score = self._partial_structure_score(correct_answer, student_answer, question.get("metadata", {}), points)
                if partial_score is not None:
                    earned = partial_score
                    is_correct = earned == points
                    status = "correct" if is_correct else "partially_correct" if earned > 0 else "incorrect"
            earned_points += earned

            per_question.append({
                "question_id": question_id,
                "type": question.get("type"),
                "points": points,
                "earned": earned,
                "correct": is_correct,
                "status": status,
                "feedback": submitted.get("feedback") or question.get("metadata", {}).get("explanation"),
            })

        percentage = (earned_points / total_points * 100) if total_points else 0
        return {
            "total_points": total_points,
            "earned_points": earned_points,
            "percentage": round(percentage, 2),
            "passed": percentage >= 50,
            "questions": per_question,
        }

    def _partial_structure_score(self, expected: Any, received: Any, metadata: Dict[str, Any], points: int) -> float | None:
        marking_scheme = metadata.get("marking_scheme") or {}
        if not isinstance(expected, dict) or not isinstance(received, dict):
            return None
        per_item = marking_scheme.get("each_correct_match") or marking_scheme.get("each_correct_placement")
        if not per_item:
            return None
        correct_items = 0
        total_items = 0
        for group, expected_items in expected.items():
            expected_values = expected_items if isinstance(expected_items, list) else [expected_items]
            received_values = received.get(group, [])
            received_values = received_values if isinstance(received_values, list) else [received_values]
            expected_normalized = {str(item).strip().lower() for item in expected_values}
            received_normalized = {str(item).strip().lower() for item in received_values}
            correct_items += len(expected_normalized & received_normalized)
            total_items += len(expected_normalized)
        if not total_items:
            return 0
        return min(float(points), correct_items * float(per_item))

    def _compare_answers(self, expected: Any, received: Any, metadata: Dict[str, Any] | None = None) -> bool:
        if expected is None:
            return False
        accepted_answers = (metadata or {}).get("accepted_answers", [])
        if accepted_answers and any(str(received).strip().lower() == str(answer).strip().lower() for answer in accepted_answers):
            return True
        if isinstance(expected, list) and isinstance(received, list):
            return [str(item).strip().lower() for item in expected] == [str(item).strip().lower() for item in received]
        if isinstance(expected, dict) and isinstance(received, dict):
            return {str(key).lower(): value for key, value in expected.items()} == {str(key).lower(): value for key, value in received.items()}
        return str(expected).strip().lower() == str(received).strip().lower() if received is not None else False
