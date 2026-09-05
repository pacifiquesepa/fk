from __future__ import annotations

from typing import Any, Dict, List


class AnalyticsService:
    """Generates student capability analytics and support recommendations."""

    def summarize_student_results(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not records:
            return {"students": [], "summary": {"weak": 0, "good": 0, "excellent": 0}}

        students = []
        for record in records:
            student_id = record.get("student_id")
            percentage = float(record.get("percentage", 0))
            if percentage >= 80:
                level = "excellent"
            elif percentage >= 60:
                level = "good"
            else:
                level = "weak"
            students.append({
                "student_id": student_id,
                "percentage": percentage,
                "level": level,
                "needs_support": percentage < 60,
            })

        summary = {
            "weak": sum(1 for student in students if student["level"] == "weak"),
            "good": sum(1 for student in students if student["level"] == "good"),
            "excellent": sum(1 for student in students if student["level"] == "excellent"),
        }
        return {"students": students, "summary": summary}

    def student_support_recommendations(self, scores: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        recommendations = []
        for score in scores:
            if score.get("percentage", 0) < 60:
                recommendations.append({
                    "student_id": score.get("student_id"),
                    "needs_support": True,
                    "reason": "Below expected performance threshold.",
                    "recommended_actions": [
                        "Provide revision exercises",
                        "Assign targeted topic practice",
                        "Schedule a teacher check-in",
                    ],
                })
        return recommendations
