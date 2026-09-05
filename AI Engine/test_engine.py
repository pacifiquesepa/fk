"""Smoke test for the running FKAMS AI Engine service.

Run the API first, then execute:
    python test_engine.py
"""

import json
from socket import timeout as SocketTimeout
from urllib.error import URLError
from urllib.request import Request, urlopen


BASE_URL = "http://localhost:8001"


def request(method, path, payload=None):
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request_data = Request(
        f"{BASE_URL}{path}",
        data=body,
        method=method,
        headers={"Content-Type": "application/json"} if body else {},
    )
    with urlopen(request_data, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    health = request("GET", "/health")
    assert health["status"] == "ok", health
    print("PASS health:", health["service"])

    generated = request("POST", "/api/assessments/generate", {
        "subject_name": "Mathematics",
        "topic": "Algebra",
        "class_name": "Level 3",
        "difficulty": "strong",
        "question_types": ["multiple_choice", "match", "fill_in_gap", "rearrange", "drag_and_drop", "open_question"],
        "counts": {"multiple_choice": 1, "match": 1, "fill_in_gap": 1, "rearrange": 1, "drag_and_drop": 1, "open_question": 1},
    })["assessment"]
    assert generated["total_questions"] == 6, generated
    assert all(question["difficulty"] == "strong" for question in generated["questions"]), generated
    assert generated["questions"][0]["metadata"]["source"] == "curriculum_dataset", generated
    print("PASS generation:", generated["total_questions"], "questions")

    answers = [
        {
            "student_id": 101,
            "question_id": question["id"],
            "answer": question["answer"],
        }
        for question in generated["questions"]
    ]
    graded = request("POST", "/api/assessments/grade", {
        "student_id": 101,
        "assessment": generated,
        "answers": answers,
    })["score"]
    assert graded["percentage"] == 100.0, graded
    print("PASS grading:", f'{graded["earned_points"]}/{graded["total_points"]}', "(100%)")


if __name__ == "__main__":
    try:
        main()
    except (URLError, SocketTimeout, TimeoutError) as error:
        raise SystemExit(
            "AI Engine did not respond on http://localhost:8001. "
            "Start or restart Uvicorn, then run this test again."
        ) from error