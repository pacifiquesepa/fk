from __future__ import annotations

from typing import Any, Dict, List


class ReportService:
    """Creates student report summaries and analytics snapshots."""

    def build_student_report(self, student_id: int, score_data: Dict[str, Any]) -> Dict[str, Any]:
        percentage = float(score_data.get("percentage", 0))
        if percentage >= 80:
            performance = "Excellent"
        elif percentage >= 60:
            performance = "Good"
        else:
            performance = "Needs support"

        return {
            "student_id": student_id,
            "performance": performance,
            "percentage": round(percentage, 2),
            "total_score": score_data.get("earned_points", 0),
            "total_points": score_data.get("total_points", 0),
            "teacher_comment": "Continue reinforcing understanding and targeted practice.",
            "recommendations": [
                "Complete revision exercises for weak areas.",
                "Participate in guided practice sessions.",
                "Review topic summaries and examples.",
            ],
        }

    def build_class_summary(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not results:
            return {"average": 0, "count": 0}
        average = sum(float(item.get("percentage", 0)) for item in results) / len(results)
        return {
            "average": round(average, 2),
            "count": len(results),
            "passed": sum(1 for item in results if float(item.get("percentage", 0)) >= 50),
        }
