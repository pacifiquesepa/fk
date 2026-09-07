# FKAMS AI Engine

This folder contains a Python-based AI assessment and analytics engine for the FKAMS school system.

## Goals

- Generate assessment questions automatically from subject content and uploaded materials
- Generate questions at `easy`, `medium`, or `strong` difficulty from curriculum outcomes
- Support multiple question types: multiple choice, matching, fill-in-the-gap, drag-and-drop, reorder, and open question
- Score responses and produce analytics per student
- Identify students needing support
- Generate student reports and finance-related insights
- Work as a separate AI service connected to the main FKAMS system

## Structure

- `app/` - FastAPI application
- `data/` - sample datasets and contextual school data
- `data/curriculum_dataset.json` - initial curriculum-grounded question bank and learning outcomes
- `data/advanced_question_bank.json` - type-specific questions by subject, topic, and difficulty
- `data/knowledge_base.json` - approved imported reference material (created after ingestion)
- `data/books/` - archived uploaded books (kept out of Git)
- `data/books_index.json` - uploaded-book metadata and page counts
- `requirements.txt` - Python dependencies

## Quick start (Windows)

Use these commands in Command Prompt or PowerShell:

```cmd
cd /d "C:\Users\SCOVIA\Desktop\FKAMS\AI Engine"
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

When the log shows `Application startup complete` followed by `KeyboardInterrupt` and `asyncio.exceptions.CancelledError`, the server did start successfully and was then stopped (usually with `CTRL+C` or by closing the terminal). This is a normal Uvicorn shutdown trace. Start it again and leave that terminal open while using the frontend or running book uploads.

If you are using PowerShell, the activation line can also be:

```powershell
cd "C:\Users\SCOVIA\Desktop\FKAMS\AI Engine"
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

> Important: on Windows, use `.venv\Scripts\activate` or `Activate.ps1`, not `source .venv/bin/activate`.

## Fix: old virtual environment points to Python 3.14

If you replaced Python 3.14 with Python 3.12 and see an error mentioning:

```text
did not find executable at ...Python314\python.exe
```

the existing `.venv` was created with Python 3.14. Delete that environment and recreate it with Python 3.12.

Run these commands in Command Prompt:

```cmd
cd /d "C:\Users\SCOVIA\Desktop\FKAMS\AI Engine"
deactivate
rmdir /s /q .venv
py -0p
py -3.12 -m venv .venv
.venv\Scripts\activate
python --version
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

The `python --version` command must show `Python 3.12.x` before installing packages.

If `py -3.12` is not recognized, locate the installed Python 3.12 executable first:

```cmd
where python
where py
```

Then create the environment using its full path, for example:

```cmd
"C:\Users\SCOVIA\AppData\Local\Programs\Python\Python312\python.exe" -m venv .venv
```

After installing Python, reopen Command Prompt so the updated PATH is loaded.

## Test the API

After the server starts, test it with:

```cmd
curl http://localhost:8001/health
```

Or in PowerShell:

```powershell
Invoke-RestMethod http://localhost:8001/health
```

### Windows CMD without curl

Some older Windows installations do not include `curl`. Use PowerShell commands from a new terminal instead:

```cmd
powershell -Command "Invoke-RestMethod http://localhost:8001/health"
```

To open the interactive API documentation, do not type the URL as a command. Open this address in your web browser:

```text
http://localhost:8001/docs
```

From Command Prompt, you can open it automatically with:

```cmd
start http://localhost:8001/docs
```

To generate a sample assessment from Command Prompt:

```cmd
powershell -Command "$body = @{ subject_name = 'Mathematics'; topic = 'Algebra'; class_name = 'Level 3'; counts = @{ multiple_choice = 6; match = 5; rearrange = 5; fill_in_gap = 5; drag_and_drop = 3; open_question = 5 } } | ConvertTo-Json; Invoke-RestMethod -Method Post -Uri http://localhost:8001/api/assessments/generate -ContentType 'application/json' -Body $body"
```

To print the same assessment as readable JSON:

```cmd
powershell -Command "$body = @{ subject_name = 'Mathematics'; topic = 'Algebra'; class_name = 'Level 3'; counts = @{ multiple_choice = 6; match = 5; rearrange = 5; fill_in_gap = 5; drag_and_drop = 3; open_question = 5 } } | ConvertTo-Json; (Invoke-RestMethod -Method Post -Uri http://localhost:8001/api/assessments/generate -ContentType 'application/json' -Body $body) | ConvertTo-Json -Depth 10"
```

### Test generation and correction together

Keep the Uvicorn terminal running and open a second Command Prompt:

```cmd
cd /d "C:\Users\SCOVIA\Desktop\FKAMS\AI Engine"
.venv\Scripts\activate
python test_engine.py
```

Expected result:

```text
PASS health: FKAMS AI Engine
PASS generation: 6 questions
PASS grading: 31/31 (100%)
```

The grading request must include both `assessment` (the generated questions and answer keys) and `answers` (the student's responses). Open questions are currently marked correct for this smoke test because their final evaluation will later use teacher/AI review.

If `python test_engine.py` reports that the service did not respond, the Uvicorn server is not running correctly. Stop the server with `CTRL+C`, start it again in the first terminal, wait for `Application startup complete.`, then run the test in a second terminal:

```cmd
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

In the second terminal:

```cmd
python test_engine.py
```

### Difficulty and curriculum training data

The generator accepts:

```json
{
	"subject_name": "Mathematics",
	"topic": "Algebra",
	"difficulty": "strong"
}
```

Supported difficulty values are `easy`, `medium`, and `strong`. The current seed dataset is in `data/curriculum_dataset.json`; add verified curriculum questions there as training/reference data. Each generated question records its source and learning outcome in `metadata`.

### Building a stronger dataset

Use verified curriculum sources only: official syllabi, teacher-approved notes, textbooks that the school is licensed to use, marking schemes, and reviewed past papers. Kaggle datasets can be imported only after checking their licence, subject alignment, accuracy, and duplicate/unsafe content. Kaggle is a source of data, not automatic training truth.

You can import approved documents through the API:

```cmd
powershell -Command "$body = @{ source_type = 'teacher'; documents = @(@{ id = 'algebra-notes-01'; subject = 'Mathematics'; topic = 'Algebra'; title = 'Teacher approved algebra notes'; text = 'Add the verified lesson content here.'; verified = $true }) } | ConvertTo-Json -Depth 10; Invoke-RestMethod -Method Post -Uri http://localhost:8001/api/knowledge/ingest -ContentType 'application/json' -Body $body"
```

### Upload a complete book

The book uploader archives the original PDF/DOCX/TXT/MD file, extracts readable text page by page, and indexes each page with class, subject, topic, source book, and image metadata. This lets retrieval use the relevant pages instead of treating the whole book as one undifferentiated paragraph.

From PowerShell 7:

```cmd
powershell -Command "$form = @{ subject = 'English'; topic = 'Greetings'; class_name = 'P1'; verified = 'true'; file = Get-Item 'C:\path\to\english-p1.pdf' }; Invoke-RestMethod -Method Post -Uri http://localhost:8001/api/books/upload -Form $form | ConvertTo-Json -Depth 10"
```

If your prompt starts with `C:\...>` you are in Command Prompt. In that terminal, use the one-line command above exactly as written. Do not type `Invoke-RestMethod`, `-Method`, or PowerShell backticks as separate CMD commands.

The `-Form` option is not available in the older Windows PowerShell 5.1. For your Windows CMD, use the Python uploader instead. First find the real file path:

```cmd
dir "%USERPROFILE%\Downloads\*.pdf" /s /b
dir "%USERPROFILE%\Desktop\*.pdf" /s /b
```

Then upload using the path returned by `dir`:

```cmd
cd /d "C:\Users\SCOVIA\Desktop\FKAMS\AI Engine"
.venv\Scripts\activate
python upload_book.py "C:\Users\SCOVIA\Downloads\English-P1.pdf" English Greetings P1
```

Replace the PDF path with the real path. Do not type the path by itself as a command; it must be inside `python upload_book.py "..."`.

### Upload all school books automatically

The folder also includes `upload_school_books.cmd`. Keep Uvicorn running, then double-click that `.cmd` file. It uploads the educational books found in Downloads, assigns class and subject metadata, skips unrelated files, and skips filenames already indexed. No repeated CMD commands are required.

You can also run it from Command Prompt:

```cmd
cd /d "C:\Users\SCOVIA\Desktop\FKAMS\AI Engine"
upload_school_books.cmd
```

The script intentionally does not upload legal documents, IDs, CVs, contracts, or unrelated PDFs from Downloads.

List uploaded books:

```cmd
powershell -Command "Invoke-RestMethod http://localhost:8001/api/books | ConvertTo-Json -Depth 10"
```

PowerShell users may run the commands directly. Command Prompt users must prefix them with `powershell -Command` as shown above.

PDF text is indexed automatically. Pages containing images are marked with `has_images`; understanding diagrams and pictures requires a vision-capable provider and teacher review, so the engine does not invent descriptions for images it cannot read.

PDF image extraction requires Pillow. Install all upload dependencies before starting the server:

```cmd
python -m pip install -r requirements.txt
```

Search imported sources before generating or reviewing a question:

```cmd
powershell -Command "Invoke-RestMethod 'http://localhost:8001/api/knowledge/search?q=quadratic%20equations&subject=Mathematics&topic=Algebra' | ConvertTo-Json -Depth 10"
```

### Optional ChatGPT/Gemini reference

The engine supports optional OpenAI and Gemini references. Copy `.env.example` to `.env`, add the key for the provider you are authorised to use, and restart the service. Never commit `.env` or expose API keys in frontend code.

```cmd
copy .env.example .env
```

For OpenAI or Gemini, first revoke any key that was accidentally shared and create a new key in the provider dashboard. Put replacement keys only in `.env`:

```env
OPENAI_API_KEY=put-your-new-key-here
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=put-your-new-key-here
GEMINI_MODEL=gemini-3.6-flash
AI_PROVIDER_TIMEOUT_SECONDS=45
AI_CONTEXT_MAX_CHARS=24000
```

External question generation stops waiting after 45 seconds by default, and uploaded-book context is capped at 24,000 characters. If a provider is still slow, generate fewer questions at once or use the approved local dataset, then restart Uvicorn after changing these settings.

The engine retrieves matching approved local sources before calling Gemini. If no approved source matches, it will not claim a high-confidence answer. Gemini responses remain marked `requires_teacher_review`; external AI output must be reviewed before becoming curriculum training data.

Ask a provider using retrieved local context:

```cmd
powershell -Command "$body = @{ provider = 'local'; prompt = 'Explain the discriminant in quadratic equations'; subject = 'Mathematics'; topic = 'Algebra' } | ConvertTo-Json; Invoke-RestMethod -Method Post -Uri http://localhost:8001/api/ai/reference -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 10"
```

Use `provider = 'openai'` or `provider = 'gemini'` only after configuring the corresponding key. External responses are labelled unverified and must be reviewed by a teacher before entering the curriculum dataset.

### Provider-backed question generation

The assessment generation endpoint accepts `provider`:

```json
{
	"subject_name": "Mathematics",
	"topic": "Algebra",
	"difficulty": "strong",
	"provider": "gemini",
	"question_types": ["multiple_choice", "open_question"],
	"counts": {"multiple_choice": 3, "open_question": 2}
}
```

Use `provider: "local"` for the approved deterministic dataset, or `openai`/`gemini` for varied questions generated from matching approved knowledge-base documents. External generation rejects requests with no approved context, removes duplicate prompts, and marks every result `requires_teacher_review`. This is retrieval-augmented generation, not automatic model training: teacher-approved questions must be reviewed before being added to the dataset.

The larger type-specific bank is in `data/advanced_question_bank.json`. Add verified questions under this shape:

```json
{
	"Subject": {
		"Topic": {
			"strong": {
				"multiple_choice": [
					{
						"prompt": "A curriculum-verified question",
						"options": ["Option A", "Option B", "Option C", "Option D"],
						"answer": 1,
						"points": 5
					}
				],
				"open_question": [
					{"prompt": "A question requiring reasoning", "answer": null, "points": 8}
				]
			}
		}
	}
}
```

Use verified textbook content, learning outcomes, marking schemes, and teacher-approved answer keys. Do not treat unverified generated questions as training truth. The engine cycles through the bank for repeated requests and records `source`, `difficulty`, and learning outcome metadata for review.

Keep the terminal running Uvicorn open. Its message `Application startup complete.` is a server log, not a command to type into another terminal.
Do not copy the displayed response rows such as `status`, `ok`, or `assessment` back into Command Prompt; they are results, not commands.

## Sample endpoints

- `GET /health`
- `POST /api/assessments/generate`
- `POST /api/assessments/grade`
- `GET /api/analytics/student-performance`
- `GET /api/analytics/students-needing-support`
- `GET /api/reports/student/{student_id}`

## Notes

This is the initial architecture and can be linked to the Node/Express backend through REST calls or database query integration later.
