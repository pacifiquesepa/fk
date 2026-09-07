from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List


class KnowledgeService:
    """Small dependency-free retrieval layer for approved curriculum material."""

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.store_path = data_dir / "knowledge_base.json"
        self.documents: List[Dict[str, Any]] = self._load()

    def _load(self) -> List[Dict[str, Any]]:
        if not self.store_path.exists():
            return []
        try:
            value = json.loads(self.store_path.read_text(encoding="utf-8"))
            return value if isinstance(value, list) else []
        except (OSError, json.JSONDecodeError):
            return []

    def _save(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.store_path.write_text(json.dumps(self.documents, indent=2, ensure_ascii=True), encoding="utf-8")

    def ingest(self, records: Iterable[Dict[str, Any]], source_type: str = "teacher") -> int:
        added = 0
        for record in records:
            text = str(record.get("text", "")).strip()
            if not text:
                continue
            self.documents.append({
                "id": str(record.get("id") or f"doc-{len(self.documents) + 1}"),
                "subject": record.get("subject"),
                "topic": record.get("topic"),
                "title": record.get("title") or "Untitled source",
                "text": text,
                "source_type": source_type,
                "verified": bool(record.get("verified", False)),
                **{key: value for key, value in record.items() if key not in {"id", "subject", "topic", "title", "text", "verified"}},
            })
            added += 1
        self._save()
        return added

    def search(self, query: str, subject: str | None = None, topic: str | None = None, limit: int = 5, unit: str | None = None, class_name: str | None = None) -> List[Dict[str, Any]]:
        terms = set(re.findall(r"[a-z0-9]+", query.lower()))
        scored = []
        for document in self.documents:
            if subject and str(document.get("subject", "")).lower() != subject.lower():
                continue
            if topic and str(document.get("topic", "")).lower() != topic.lower():
                continue
            if unit and str(document.get("unit", "")).lower() != unit.lower():
                continue
            if class_name and str(document.get("class_name", "")).lower() != class_name.lower():
                continue
            haystack = " ".join(str(document.get(key, "")) for key in ("title", "subject", "topic", "text")).lower()
            score = sum(1 for term in terms if term in haystack)
            if score:
                scored.append((score + (1 if document.get("verified") else 0), document))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [document for _, document in scored[:max(1, min(limit, 20))]]

    def stats(self) -> Dict[str, int]:
        return {
            "documents": len(self.documents),
            "verified_documents": sum(1 for document in self.documents if document.get("verified")),
        }
