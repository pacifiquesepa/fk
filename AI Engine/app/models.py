from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AssessmentRequest(BaseModel):
    teacher_id: Optional[int] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    unit: Optional[str] = None
    topic: Optional[str] = None
    class_name: Optional[str] = None
    materials: List[str] = Field(default_factory=list)
    difficulty: str = "medium"
    provider: str = "local"
    reference_limit: int = 5
    question_types: List[str] = Field(default_factory=lambda: [
        "multiple_choice",
        "match",
        "fill_in_gap",
        "rearrange",
        "drag_and_drop",
        "open_question",
    ])
    counts: Dict[str, int] = Field(default_factory=lambda: {
        "multiple_choice": 6,
        "match": 5,
        "rearrange": 5,
        "fill_in_gap": 5,
        "drag_and_drop": 3,
        "open_question": 5,
    })


class QuestionModel(BaseModel):
    id: Optional[str] = None
    type: str
    prompt: str
    options: Optional[List[str]] = None
    answer: Optional[Any] = None
    points: int = 1
    difficulty: str = "medium"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AssessmentGenerationResult(BaseModel):
    subject: str
    unit: Optional[str] = None
    topic: Optional[str] = None
    class_name: Optional[str] = None
    difficulty: str = "medium"
    book_evaluated: bool = False
    total_questions: int
    total_points: int
    questions: List[QuestionModel]


class StudentAnswer(BaseModel):
    student_id: int
    question_id: str
    answer: Any


class GradeRequest(BaseModel):
    student_id: int
    assessment_id: Optional[str] = None
    assessment: AssessmentGenerationResult
    answers: List[StudentAnswer]


class ScoreSummary(BaseModel):
    student_id: int
    total_score: float
    total_points: int
    percentage: float
    passed: bool
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
