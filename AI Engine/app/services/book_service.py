from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4

from pypdf import PdfReader


class BookService:
    """Archives books and creates page-level knowledge records for retrieval."""

    def __init__(self, data_dir: Path, knowledge_service):
        self.data_dir = data_dir
        self.books_dir = data_dir / "books"
        self.index_path = data_dir / "books_index.json"
        self.knowledge_service = knowledge_service
        self.books_dir.mkdir(parents=True, exist_ok=True)

    def ingest_file(self, filename: str, content: bytes, subject: str, topic: str, class_name: str, verified: bool) -> Dict[str, Any]:
        extension = Path(filename).suffix.lower()
        if extension not in {".pdf", ".txt", ".md", ".docx"}:
            raise ValueError("Supported book formats are PDF, DOCX, TXT, and MD.")
        book_id = uuid4().hex
        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(filename).name)
        book_path = self.books_dir / f"{book_id}_{safe_name}"
        book_path.write_bytes(content)
        pages = self._extract_pages(extension, content, book_id)
        if not pages:
            raise ValueError("No readable text was found in this book.")

        documents = []
        for page_number, page in enumerate(pages, 1):
            text = page["text"].strip()
            if not text:
                continue
            documents.append({
                "id": f"{book_id}-page-{page_number}",
                "subject": subject,
                "topic": topic,
                "class_name": class_name,
                "title": f"{filename} - page {page_number}",
                "text": text,
                "source_type": "book",
                "source_book_id": book_id,
                "source_file": filename,
                "page": page_number,
                "has_images": page.get("has_images", False),
                "image_refs": page.get("image_refs", []),
                "verified": verified,
            })
        self.knowledge_service.ingest(documents, "book")
        index = self._load_index()
        record = {"id": book_id, "filename": filename, "stored_file": str(book_path), "subject": subject, "topic": topic, "class_name": class_name, "pages": len(pages), "indexed_pages": len(documents), "has_images": any(page.get("has_images") for page in pages), "verified": verified}
        index.append(record)
        self.index_path.write_text(json.dumps(index, indent=2, ensure_ascii=True), encoding="utf-8")
        return record

    def list_books(self) -> List[Dict[str, Any]]:
        return self._load_index()

    def _load_index(self) -> List[Dict[str, Any]]:
        if not self.index_path.exists():
            return []
        try:
            value = json.loads(self.index_path.read_text(encoding="utf-8"))
            return value if isinstance(value, list) else []
        except (OSError, json.JSONDecodeError):
            return []

    @staticmethod
    def _extract_pages(extension: str, content: bytes, book_id: str) -> List[Dict[str, Any]]:
        if extension == ".pdf":
            reader = PdfReader(__import__("io").BytesIO(content))
            if reader.is_encrypted:
                try:
                    reader.decrypt("")
                except Exception as error:
                    raise ValueError("This PDF is password-protected and cannot be read without its password.") from error
            pages = []
            image_dir = Path(__file__).resolve().parents[2] / "data" / "books" / book_id
            image_dir.mkdir(parents=True, exist_ok=True)
            for page_number, page in enumerate(reader.pages, 1):
                image_refs = []
                try:
                    images = getattr(page, "images", [])
                    for image_number, image in enumerate(images, 1):
                        image_name = re.sub(r"[^A-Za-z0-9._-]+", "_", str(getattr(image, "name", f"image-{image_number}.bin")))
                        image_path = image_dir / f"page-{page_number}-image-{image_number}-{image_name}"
                        image_path.write_bytes(image.data)
                        image_refs.append(str(image_path))
                except Exception:
                    image_refs = []
                try:
                    text = page.extract_text() or ""
                except Exception:
                    text = ""
                pages.append({"text": text, "has_images": bool(image_refs), "image_refs": image_refs})
            return pages
        if extension == ".docx":
            with zipfile.ZipFile(__import__("io").BytesIO(content)) as archive:
                xml = archive.read("word/document.xml").decode("utf-8", errors="ignore")
                image_dir = Path(__file__).resolve().parents[2] / "data" / "books" / book_id
                image_dir.mkdir(parents=True, exist_ok=True)
                image_refs = []
                for name in archive.namelist():
                    if name.startswith("word/media/") and not name.endswith("/"):
                        image_path = image_dir / Path(name).name
                        image_path.write_bytes(archive.read(name))
                        image_refs.append(str(image_path))
            text = re.sub(r"</w:p>", "\n", xml)
            text = re.sub(r"<[^>]+>", "", text)
            return [{"text": text, "has_images": bool(image_refs), "image_refs": image_refs}]
        return [{"text": content.decode("utf-8", errors="ignore"), "has_images": False}]
