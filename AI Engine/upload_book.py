"""Upload a PDF, DOCX, TXT, or MD book to the FKAMS AI Engine.

Example:
    python upload_book.py "C:\\Users\\SCOVIA\\Downloads\\English-P1.pdf" English Greetings P1
"""

import json
import mimetypes
import sys
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = "http://localhost:8001"


def main():
    if len(sys.argv) < 5:
        raise SystemExit("Usage: python upload_book.py BOOK_PATH SUBJECT TOPIC CLASS_NAME")

    book_path = Path(sys.argv[1]).expanduser()
    if not book_path.is_file():
        raise SystemExit(f"Book file was not found: {book_path}")
    if book_path.suffix.lower() not in {".pdf", ".docx", ".txt", ".md"}:
        raise SystemExit("Supported formats: .pdf, .docx, .txt, .md")

    subject, topic, class_name = sys.argv[2:5]
    boundary = f"----FKAMS{uuid.uuid4().hex}"
    content_type = mimetypes.guess_type(book_path.name)[0] or "application/octet-stream"
    body = b"".join([
        field(boundary, "subject", subject),
        field(boundary, "topic", topic),
        field(boundary, "class_name", class_name),
        field(boundary, "verified", "true"),
        file_field(boundary, "file", book_path.name, content_type, book_path.read_bytes()),
        f"--{boundary}--\r\n".encode("utf-8"),
    ])

    request = Request(
        f"{BASE_URL}/api/books/upload",
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    try:
        with urlopen(request, timeout=120) as response:
            print(json.dumps(json.loads(response.read().decode("utf-8")), indent=2))
    except HTTPError as error:
        message = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Upload failed with HTTP {error.code}: {message}") from error
    except URLError as error:
        raise SystemExit(f"Could not connect to AI Engine at {BASE_URL}: {error.reason}") from error


def field(boundary, name, value):
    return (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n").encode("utf-8")


def file_field(boundary, name, filename, content_type, content):
    header = f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\nContent-Type: {content_type}\r\n\r\n"
    return header.encode("utf-8") + content + b"\r\n"


if __name__ == "__main__":
    main()
