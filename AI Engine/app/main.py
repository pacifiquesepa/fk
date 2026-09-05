import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from typing import Any, Dict

from app.config import APP_NAME, API_PORT, BASE_DIR, GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL
from app.models import AssessmentRequest, GradeRequest, QuestionModel
from app.services.analytics_service import AnalyticsService
from app.services.assessment_service import AssessmentService
from app.services.grading_service import GradingService
from app.services.report_service import ReportService
from app.services.knowledge_service import KnowledgeService
from app.services.provider_service import ProviderService

app = FastAPI(title=APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

assessment_service = AssessmentService()
grading_service = GradingService()
analytics_service = AnalyticsService()
report_service = ReportService()
knowledge_service = KnowledgeService(BASE_DIR / "data")
provider_service = ProviderService(OPENAI_API_KEY, GEMINI_API_KEY, OPENAI_MODEL, GEMINI_MODEL)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": APP_NAME, "port": API_PORT, "knowledge": knowledge_service.stats(), "providers": provider_service.available()}


@app.post("/api/knowledge/ingest")
def ingest_knowledge(payload: Dict[str, Any]):
    records = payload.get("documents", [])
    if not isinstance(records, list):
        raise HTTPException(status_code=400, detail="documents must be a list")
    added = knowledge_service.ingest(records, str(payload.get("source_type", "teacher")))
    return {"added": added, "knowledge": knowledge_service.stats()}


@app.get("/api/knowledge/search")
def search_knowledge(q: str, subject: str | None = None, topic: str | None = None, limit: int = 5):
    return {"results": knowledge_service.search(q, subject, topic, limit)}


@app.post("/api/ai/reference")
def external_reference(payload: Dict[str, Any]):
    prompt = str(payload.get("prompt", "")).strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")
    context = knowledge_service.search(prompt, payload.get("subject"), payload.get("topic"), int(payload.get("limit", 5)))
    try:
        return provider_service.reference(str(payload.get("provider", "local")), prompt, context)
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.post("/api/assessments/generate")
def generate_assessment(payload: AssessmentRequest):
    if payload.provider in {"openai", "gemini"}:
        context = knowledge_service.search(payload.topic or payload.subject_name or "curriculum", payload.subject_name, payload.topic, payload.reference_limit)
        try:
            external = provider_service.generate_questions(payload.provider, payload.model_dump(), context)
        except (RuntimeError, ValueError, KeyError, json.JSONDecodeError, ValidationError, TypeError) as error:
            raise HTTPException(status_code=502, detail=str(error)) from error
        questions = [QuestionModel(**question) for question in external["questions"]]
        return {"assessment": {"subject": payload.subject_name or "General Subject", "topic": payload.topic, "class_name": payload.class_name, "difficulty": payload.difficulty, "total_questions": len(questions), "total_points": sum(question.points for question in questions), "questions": [question.model_dump() for question in questions], "provider": external["provider"], "requires_teacher_review": True, "sources": external["sources"]}}
    result = assessment_service.generate_assessment(payload.model_dump())
    return {"assessment": result.model_dump()}


@app.post("/api/assessments/grade")
def grade_assessment(payload: GradeRequest):
    score = grading_service.grade_assessment(
        payload.assessment.model_dump(),
        [answer.model_dump() for answer in payload.answers],
    )
    return {"score": score}


@app.get("/api/analytics/student-performance")
def student_performance():
    mock_scores = [
        {"student_id": 101, "percentage": 88},
        {"student_id": 102, "percentage": 52},
        {"student_id": 103, "percentage": 92},
    ]
    return analytics_service.summarize_student_results(mock_scores)


@app.get("/api/analytics/students-needing-support")
def students_needing_support():
    mock_scores = [
        {"student_id": 101, "percentage": 88},
        {"student_id": 102, "percentage": 52},
        {"student_id": 103, "percentage": 92},
    ]
    return {"students": analytics_service.student_support_recommendations(mock_scores)}


@app.get("/api/reports/student/{student_id}")
def student_report(student_id: int):
    mock_score = {"percentage": 72, "earned_points": 28, "total_points": 40}
    return report_service.build_student_report(student_id, mock_score)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=API_PORT, reload=True)
