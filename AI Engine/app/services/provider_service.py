from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any, Dict, List

from app.config import AI_CONTEXT_MAX_CHARS, AI_PROVIDER_TIMEOUT_SECONDS


class ProviderService:
    """Optional external AI references; local curriculum remains the fallback."""

    def __init__(self, openai_key: str = "", gemini_key: str = "", openai_model: str = "gpt-4o-mini", gemini_model: str = "gemini-3.6-flash"):
        self.openai_key = openai_key
        self.gemini_key = gemini_key
        self.openai_model = openai_model
        self.gemini_model = gemini_model

    def available(self) -> Dict[str, bool]:
        return {"openai": bool(self.openai_key), "gemini": bool(self.gemini_key)}

    def reference(self, provider: str, prompt: str, context: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not context:
            return {
                "provider": "local",
                "answer": "No approved school source matched this request. Add or verify curriculum material before asking an external provider.",
                "sources": [],
                "verified": False,
                "confidence": "low",
            }
        if provider == "openai" and self.openai_key:
            return self._openai(prompt, context)
        if provider == "gemini" and self.gemini_key:
            return self._gemini(prompt, context)
        if provider in {"openai", "gemini"}:
            return {
                "provider": provider,
                "answer": f"{provider} is not configured. Add its API key to the AI Engine .env file and restart the service.",
                "sources": context,
                "verified": False,
                "confidence": "unavailable",
            }
        return {
            "provider": "local",
            "answer": "No external provider is configured. Use the approved local curriculum sources.",
            "sources": context,
            "verified": False,
            "confidence": "low",
        }

    def generate_questions(self, provider: str, request: Dict[str, Any], context: List[Dict[str, Any]]) -> Dict[str, Any]:
        if provider not in {"openai", "gemini"}:
            raise ValueError("provider must be openai or gemini for external generation")
        if not context:
            raise ValueError("Approved local context is required before external question generation")
        prompt = self._question_prompt(request, context)
        if provider == "openai" and self.openai_key:
            result = self._openai_json(prompt, context)
        elif provider == "gemini" and self.gemini_key:
            result = self._gemini_json(prompt, context)
        else:
            raise ValueError(f"{provider} is not configured")
        questions = result.get("questions", []) if isinstance(result, dict) else []
        unique = []
        seen = set()
        for question in questions:
            prompt_text = str(question.get("prompt", "")).strip()
            if not prompt_text or prompt_text.lower() in seen:
                continue
            seen.add(prompt_text.lower())
            metadata = dict(question.get("metadata") or {})
            if question.get("type") == "open_question" and question.get("answer") in (None, ""):
                for answer_key in ("reference_answer", "expected_answer", "sample_answer", "model_answer"):
                    if metadata.get(answer_key):
                        question["answer"] = metadata[answer_key]
                        break
            question["metadata"] = {**metadata, "source": provider, "requires_teacher_review": True}
            unique.append(question)
        return {"questions": unique, "provider": provider, "requires_teacher_review": True, "sources": context}

    def _openai(self, prompt: str, context: List[Dict[str, Any]]) -> Dict[str, Any]:
        body = {"model": self.openai_model, "messages": [{"role": "system", "content": "Answer only from the supplied school sources. Say when evidence is insufficient."}, {"role": "user", "content": self._compose(prompt, context)}], "temperature": 0.2}
        result = self._post("https://api.openai.com/v1/chat/completions", body, {"Authorization": f"Bearer {self.openai_key}"})
        return {"provider": "openai", "answer": result["choices"][0]["message"]["content"], "sources": context, "verified": False, "confidence": "requires_teacher_review"}

    def _openai_json(self, prompt: str, context: List[Dict[str, Any]]) -> Dict[str, Any]:
        body = {"model": self.openai_model, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": "Return valid JSON only. Use only the supplied approved sources. Do not repeat questions."}, {"role": "user", "content": self._compose(prompt, context)}], "temperature": 0.7}
        result = self._post("https://api.openai.com/v1/chat/completions", body, {"Authorization": f"Bearer {self.openai_key}"})
        return json.loads(result["choices"][0]["message"]["content"])

    def _gemini(self, prompt: str, context: List[Dict[str, Any]]) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_key}"
        result = self._post(url, {"contents": [{"parts": [{"text": self._compose(prompt, context)}]}]}, {})
        answer = result["candidates"][0]["content"]["parts"][0]["text"]
        return {"provider": "gemini", "answer": answer, "sources": context, "verified": False, "confidence": "requires_teacher_review"}

    def _gemini_json(self, prompt: str, context: List[Dict[str, Any]]) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_key}"
        body = {"contents": [{"parts": [{"text": self._compose(prompt, context)}]}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0.7}}
        result = self._post(url, body, {})
        return json.loads(result["candidates"][0]["content"]["parts"][0]["text"])

    @staticmethod
    def _question_prompt(request: Dict[str, Any], context: List[Dict[str, Any]]) -> str:
        counts = json.dumps(request.get("counts", {}), ensure_ascii=True)
        types = ", ".join(request.get("question_types", []))
        return (f"Create a {request.get('difficulty', 'medium')} assessment for {request.get('subject_name')} unit {request.get('unit')} topic {request.get('topic')} "
            f"class {request.get('class_name')}. Required types: {types}. Required counts: {counts}. "
            "Return JSON with a questions array. Each item must have id, type, prompt, options when needed, answer, points, difficulty, "
            "and metadata containing learning_outcome. Make every prompt materially different, age-appropriate, and curriculum-grounded. "
            "For every open_question, provide a concise curriculum-grounded model answer in answer (or metadata.reference_answer), "
            "plus metadata.marking_scheme or metadata.grading for partial marking. Never leave an open_question answer null when the approved context supports an answer. "
            "Mark every external question as requiring teacher review because the model answer is a reference answer, not automatic final grading.")

    @staticmethod
    def _compose(prompt: str, context: List[Dict[str, Any]]) -> str:
        remaining = AI_CONTEXT_MAX_CHARS
        source_parts = []
        for item in context:
            if remaining <= 0:
                break
            text = str(item.get("text", ""))[:remaining]
            source_parts.append(f"SOURCE: {item.get('title')}\n{text}")
            remaining -= len(text)
        sources = "\n\n".join(source_parts)
        return f"Question: {prompt}\n\nApproved context:\n{sources}\n\nRules: use only the approved context; cite source titles; distinguish facts from inference; say 'insufficient evidence' when the context does not answer the question; never invent curriculum facts; provide a concise answer followed by a short evidence explanation."

    @staticmethod
    def _post(url: str, body: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
        request = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers={"Content-Type": "application/json", **headers}, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=AI_PROVIDER_TIMEOUT_SECONDS) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            try:
                error_body = json.loads(error.read().decode("utf-8"))
                provider_message = error_body.get("error", {}).get("message") or error_body.get("message") or "Provider rejected the request."
            except (json.JSONDecodeError, UnicodeDecodeError):
                provider_message = "Provider rejected the request."
            raise RuntimeError(f"External AI provider returned HTTP {error.code}: {provider_message}") from error
        except urllib.error.URLError as error:
            if isinstance(error.reason, TimeoutError):
                raise RuntimeError(f"The external AI provider timed out after {AI_PROVIDER_TIMEOUT_SECONDS} seconds. Reduce the number of questions or use the local dataset.") from error
            raise RuntimeError(f"Could not connect to the external AI provider: {error.reason}") from error
        except TimeoutError as error:
            raise RuntimeError(f"The external AI provider timed out after {AI_PROVIDER_TIMEOUT_SECONDS} seconds. Reduce the number of questions or use the local dataset.") from error
