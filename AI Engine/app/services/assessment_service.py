from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List

from app.models import AssessmentGenerationResult, QuestionModel


class AssessmentService:
    """Generates structured assessment questions from curriculum context."""

    def __init__(self):
        dataset_path = Path(__file__).resolve().parents[2] / "data" / "curriculum_dataset.json"
        advanced_path = Path(__file__).resolve().parents[2] / "data" / "advanced_question_bank.json"
        trained_path = Path(__file__).resolve().parents[2] / "data" / "trained_question_bank.json"
        self.curriculum = json.loads(dataset_path.read_text(encoding="utf-8"))
        self.advanced = json.loads(advanced_path.read_text(encoding="utf-8")) if advanced_path.exists() else {}
        self.trained_path = trained_path
        self.trained = json.loads(trained_path.read_text(encoding="utf-8")) if trained_path.exists() else []
        self.type_templates = {
            "multiple_choice": self._generate_multiple_choice,
            "match": self._generate_match,
            "fill_in_gap": self._generate_fill_in_gap,
            "rearrange": self._generate_rearrange,
            "drag_and_drop": self._generate_drag_and_drop,
            "open_question": self._generate_open_question,
        }

    def generate_assessment(self, request: Dict[str, Any]) -> AssessmentGenerationResult:
        subject = request.get("subject_name") or "General Subject"
        unit = request.get("unit") or ""
        class_name = request.get("class_name")
        topic = request.get("topic") or f"{unit or 'selected unit'} activities"
        book_context = request.get("book_context") or []
        book_sources = self._evaluate_book(book_context, subject, unit, class_name)
        question_types = request.get("question_types", [])
        counts = request.get("counts", {})
        difficulty = request.get("difficulty", "medium")
        if difficulty not in {"easy", "medium", "strong"}:
            difficulty = "medium"
        questions: List[QuestionModel] = []
        seen_prompts = set()
        for question_type in question_types:
            generator = self.type_templates.get(question_type)
            if not generator:
                continue
            for index in range(int(counts.get(question_type, 0))):
                question = generator(subject, topic, unit, class_name, index, difficulty, book_sources or self._bank_for(subject, unit, topic, difficulty, question_type))
                if question.prompt.lower() in seen_prompts:
                    question.prompt = f"{question.prompt} Use a different example from {unit or topic} (variant {index + 1})."
                seen_prompts.add(question.prompt.lower())
                question.id = f"{question_type}-{len(questions) + 1}"
                question.metadata = {**question.metadata, "subject": subject, "unit": unit, "topic": topic, "source": "uploaded_book" if book_sources else question.metadata.get("source", "curriculum_dataset"), "book_evaluated": bool(book_sources)}
                questions.append(question)

        total_points = sum(question.points for question in questions)
        return AssessmentGenerationResult(
            subject=subject,
            unit=unit,
            topic=topic,
            class_name=class_name,
            difficulty=difficulty,
            book_evaluated=bool(book_sources),
            total_questions=len(questions),
            total_points=total_points,
            questions=questions,
        )

    @staticmethod
    def _evaluate_book(documents: List[Dict[str, Any]], subject: str, unit: str, class_name: str | None) -> List[Dict[str, Any]]:
        """Turn matched textbook pages into safe, reviewable question sources."""
        sources = []
        unit_terms = {term for term in re.findall(r"[a-z0-9]+", unit.lower()) if term != "unit"}
        for document in documents:
            text = str(document.get("text", ""))
            lower_text = text.lower()
            if unit_terms and not any(term in lower_text for term in unit_terms):
                continue
            lines = [re.sub(r"\s+", " ", line).strip(" -") for line in text.splitlines()]
            candidates = [line for line in lines if len(line) >= 18 and ("activity" in line.lower() or "question" in line.lower() or "exercise" in line.lower() or "?" in line or re.match(r"^\d+[.)]", line))]
            for line in candidates[:20]:
                sources.append({
                    "prompt": line,
                    "answer": None,
                    "points": 2,
                    "metadata": {"source": "uploaded_book", "subject": subject, "unit": unit, "class_name": class_name, "book_title": document.get("title"), "page": document.get("page")},
                })
        return sources

    def train(self, questions: List[Dict[str, Any]]) -> int:
        existing = {str(item.get("prompt", "")).strip().lower() for item in self.trained}
        added = 0
        for question in questions:
            prompt = str(question.get("prompt", "")).strip()
            if not prompt or prompt.lower() in existing:
                continue
            self.trained.append({**question, "trained": True})
            existing.add(prompt.lower())
            added += 1
        self.trained_path.write_text(json.dumps(self.trained, indent=2, ensure_ascii=True), encoding="utf-8")
        return added

    def _bank_for(self, subject: str, unit: str, topic: str, difficulty: str, question_type: str) -> List[Dict[str, Any]]:
        trained = [item for item in self.trained if item.get("type") == question_type and item.get("difficulty", difficulty) == difficulty and str(item.get("metadata", {}).get("subject", subject)).lower() == subject.lower() and (not unit or str(item.get("metadata", {}).get("unit", "")).lower() == unit.lower()) and (not topic or str(item.get("metadata", {}).get("topic", topic)).lower() == topic.lower())]
        if trained:
            return trained
        unit_bank = self.advanced.get(subject, {}).get(topic, {}).get("units", {}).get(unit, {}).get(difficulty, {}).get(question_type, [])
        if unit_bank:
            return unit_bank
        advanced_bank = self.advanced.get(subject, {}).get(topic, {}).get(difficulty, {}).get(question_type, [])
        if advanced_bank:
            return advanced_bank
        level_bank = self.curriculum.get(subject, {}).get(topic, {}).get("levels", {}).get(difficulty, [])
        return level_bank if isinstance(level_bank, list) and question_type == "multiple_choice" else []

    @staticmethod
    def _source(bank: List[Dict[str, Any]], index: int) -> Dict[str, Any]:
        return bank[index % len(bank)] if bank else {}

    def _generate_multiple_choice(self, subject: str, topic: str, unit: str, class_name: str | None, index: int, difficulty: str, bank: List[Dict[str, Any]]) -> QuestionModel:
        source = self._source(bank, index)
        prompt = source.get("prompt", f"{subject}, {unit or 'selected unit'}: Which statement best explains {topic}?")
        return QuestionModel(
            id=f"mc-{index + 1}",
            type="multiple_choice",
            prompt=prompt,
            options=source.get("options", ["Correct explanation", "Common misconception", "Unrelated idea", "Incomplete idea"]),
            answer=source.get("answer", 0),
            points=source.get("points", 2),
            difficulty=difficulty,
            metadata={"source": "curriculum_dataset", "learning_outcome": self._outcome(subject, topic, index)},
        )

    def _generate_match(self, subject: str, topic: str, unit: str, class_name: str | None, index: int, difficulty: str, bank: List[Dict[str, Any]]) -> QuestionModel:
        source = self._source(bank, index)
        return QuestionModel(
            id=f"match-{index + 1}",
            type="match",
            prompt=source.get("prompt", f"Match the correct terms related to {topic} in {unit or 'the selected unit'} of {subject}."),
            options=source.get("options", ["Term A", "Term B", "Term C", "Term D"]),
            answer=source.get("answer", {"left": ["Concept", "Definition"], "right": ["Definition", "Concept"]}),
            points=source.get("points", 2),
            difficulty=difficulty,
            metadata={"source": "curriculum_dataset", "learning_outcome": self._outcome(subject, topic, index)},
        )

    def _generate_fill_in_gap(self, subject: str, topic: str, unit: str, class_name: str | None, index: int, difficulty: str, bank: List[Dict[str, Any]]) -> QuestionModel:
        source = self._source(bank, index)
        return QuestionModel(
            id=f"fill-{index + 1}",
            type="fill_in_gap",
            prompt=source.get("prompt", f"Complete the sentence about {topic} in {unit or 'the selected unit'}: ________."),
            answer=source.get("answer", "key concept"),
            points=2,
            difficulty=difficulty,
            metadata={"blank_count": 1, "source": "curriculum_dataset", "learning_outcome": self._outcome(subject, topic, index)},
        )

    def _generate_rearrange(self, subject: str, topic: str, unit: str, class_name: str | None, index: int, difficulty: str, bank: List[Dict[str, Any]]) -> QuestionModel:
        source = self._source(bank, index)
        return QuestionModel(
            id=f"rearrange-{index + 1}",
            type="rearrange",
            prompt=source.get("prompt", f"Arrange the steps in the correct order for {topic} in {unit or 'the selected unit'}."),
            options=source.get("options", ["Step 1", "Step 2", "Step 3", "Step 4"]),
            answer=source.get("answer", ["Step 1", "Step 2", "Step 3", "Step 4"]),
            points=source.get("points", 3),
            difficulty=difficulty,
        )

    def _generate_drag_and_drop(self, subject: str, topic: str, unit: str, class_name: str | None, index: int, difficulty: str, bank: List[Dict[str, Any]]) -> QuestionModel:
        source = self._source(bank, index)
        return QuestionModel(
            id=f"drag-{index + 1}",
            type="drag_and_drop",
            prompt=source.get("prompt", f"Drag the correct item to the matching concept for {topic} in {unit or 'the selected unit'}."),
            options=source.get("options", ["Item A", "Item B", "Item C"]),
            answer=source.get("answer", {"target": "Item A", "items": ["Item A", "Item B", "Item C"]}),
            points=source.get("points", 3),
            difficulty=difficulty,
        )

    def _generate_open_question(self, subject: str, topic: str, unit: str, class_name: str | None, index: int, difficulty: str, bank: List[Dict[str, Any]]) -> QuestionModel:
        source = self._source(bank, index)
        return QuestionModel(
            id=f"open-{index + 1}",
            type="open_question",
            prompt=source.get("prompt", f"Explain how {topic} applies in {unit or 'the selected unit'} of {subject}. Provide examples and justify your answer."),
            answer=None,
            points=source.get("points", 5),
            difficulty=difficulty,
            metadata={"rubric": ["accuracy", "reasoning", "use of examples"], "source": "curriculum_dataset"},
        )

    def _outcome(self, subject: str, topic: str, index: int) -> str | None:
        outcomes = self.curriculum.get(subject, {}).get(topic, {}).get("learning_outcomes", [])
        return outcomes[index % len(outcomes)] if outcomes else None
