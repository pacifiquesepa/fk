"""Upload the educational books found in the user's Downloads folder.

The script skips unrelated PDFs and skips books already indexed by filename.
Run from the AI Engine folder while Uvicorn is running:
    python upload_school_books.py
"""

import json
import sys
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import upload_book

DOWNLOADS = Path.home() / "Downloads"
BOOKS = [
    ("P1-English-PB (1).pdf", "English", "General", "P1"),
    ("P1-English-PB.pdf", "English", "General", "P1"),
    ("P1-Kinyarwanda-PB.pdf", "Kinyarwanda", "General", "P1"),
    ("P1-SET-PB (6).pdf", "General Studies", "General", "P1"),
    ("P2-SET-PB (1).en.fr-1.pdf", "General Studies", "General", "P2"),
    ("P3 book revised copy.pdf", "General Studies", "General", "P3"),
    ("P4-Kinyarwanda-PB.pdf", "Kinyarwanda", "General", "P4"),
    ("P5-French-PB.pdf", "French", "General", "P5"),
    ("P5-French-PB (1).pdf", "French", "General", "P5"),
    ("P5-French-PB (2).pdf", "French", "General", "P5"),
    ("P5-French-PB (3).pdf", "French", "General", "P5"),
    ("P5-French-PB (4).pdf", "French", "General", "P5"),
    ("P5-French-PB (5).pdf", "French", "General", "P5"),
    ("P5-French-PB (6).pdf", "French", "General", "P5"),
    ("P5-Kinyarwanda-PB.pdf", "Kinyarwanda", "General", "P5"),
    ("P5-Kinyarwanda-PB (1).pdf", "Kinyarwanda", "General", "P5"),
    ("SRE P1.pdf", "English", "General", "P1"),
    ("SRE P1 (1).pdf", "English", "General", "P1"),
    ("SRE P1 (2).pdf", "English", "General", "P1"),
    ("TRANSLATED BOOK OF P1 MATHEMATICS-1.pdf", "Mathematics", "General", "P1"),
]

QUESTION_DOCUMENTS = [
    ("IBIBAZO BYISUZUMA P1.docx", "Kinyarwanda", "P1"),
    ("IBIBAZO BYISUZUMA P3.docx", "Kinyarwanda", "P3"),
    ("IBIBAZO BYISUZUMA P4.docx", "Kinyarwanda", "P4"),
    ("P1 Maths  Model Questions.doc", "Mathematics", "P1"),
    ("P2 Maths Model Questions.doc", "Mathematics", "P2"),
    ("P3 Maths Model  Questions.doc 18_04_2018.doc", "Mathematics", "P3"),
    ("P5 Maths MODEL QUESTIONS.doc 19_04_2018.doc", "Mathematics", "P5"),
    ("P1 SET MODEL QUESTIONS.docx", "General Studies", "P1"),
    ("P3 SET MODEL QUESTIONS.docx", "General Studies", "P3"),
    ("P4 SET MODEL QUESTIONS.docx", "General Studies", "P4"),
    ("P5 SET MODEL QUESTIONS.docx", "General Studies", "P5"),
    ("PRIMARY 4.1 SOCIAL STUDIES MDEL QUESTIONS.docx", "Social Studies", "P4"),
    ("PRIMARY 5.1 SOCIAL STUDIESMODEL QUESTIONS.docx", "Social Studies", "P5"),
]


def existing_books():
    request = Request(f"{upload_book.BASE_URL}/api/books", method="GET")
    with urlopen(request, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))
    return {book.get("filename") for book in data.get("books", [])}


def train_question_document(path, subject, class_name):
    boundary = f"----FKAMSTrain{uuid.uuid4().hex}"
    content_type = "application/msword" if path.suffix.lower() == ".doc" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    body = b"".join([
        upload_book.field(boundary, "subject", subject),
        upload_book.field(boundary, "unit", "All units"),
        upload_book.field(boundary, "class_name", class_name),
        upload_book.file_field(boundary, "file", path.name, content_type, path.read_bytes()),
        f"--{boundary}--\r\n".encode("utf-8"),
    ])
    request = Request(
        f"{upload_book.BASE_URL}/api/assessments/train-document",
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    try:
        uploaded_names = existing_books()
    except (HTTPError, URLError, TimeoutError) as error:
        raise SystemExit(f"AI Engine is not running at {upload_book.BASE_URL}. Start Uvicorn first.\n{error}") from error

    uploaded = 0
    skipped = 0
    missing = 0
    for filename, subject, topic, class_name in BOOKS:
        path = DOWNLOADS / filename
        if filename in uploaded_names:
            print(f"SKIP already indexed: {filename}")
            skipped += 1
            continue
        if not path.is_file():
            print(f"MISSING: {path}")
            missing += 1
            continue
        print(f"UPLOAD: {filename} -> {subject} / {class_name}")
        sys.argv = ["upload_book.py", str(path), subject, topic, class_name]
        upload_book.main()
        uploaded_names.add(filename)
        uploaded += 1

    for filename, subject, class_name in QUESTION_DOCUMENTS:
        path = DOWNLOADS / filename
        if not path.is_file():
            print(f"MISSING QUESTION DOCUMENT: {path}")
            missing += 1
            continue
        try:
            result = train_question_document(path, subject, class_name)
            print(f"TRAINED QUESTIONS: {filename} -> added={result.get('added', 0)}, skipped={result.get('skipped', 0)}")
        except HTTPError as error:
            message = error.read().decode("utf-8", errors="replace")
            print(f"QUESTION TRAINING FAILED: {filename}: HTTP {error.code}: {message}")
        except (URLError, TimeoutError) as error:
            print(f"QUESTION TRAINING FAILED: {filename}: {error}")

    print(f"DONE: uploaded={uploaded}, skipped={skipped}, missing={missing}")


if __name__ == "__main__":
    main()
