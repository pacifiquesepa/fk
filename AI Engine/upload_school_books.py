"""Upload the educational books found in the user's Downloads folder.

The script skips unrelated PDFs and skips books already indexed by filename.
Run from the AI Engine folder while Uvicorn is running:
    python upload_school_books.py
"""

import json
import sys
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


def existing_books():
    request = Request(f"{upload_book.BASE_URL}/api/books", method="GET")
    with urlopen(request, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))
    return {book.get("filename") for book in data.get("books", [])}


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

    print(f"DONE: uploaded={uploaded}, skipped={skipped}, missing={missing}")


if __name__ == "__main__":
    main()
