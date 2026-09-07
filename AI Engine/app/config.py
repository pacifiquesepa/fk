import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

APP_NAME = os.getenv("APP_NAME", "FKAMS AI Engine")
APP_ENV = os.getenv("APP_ENV", "development")
API_PORT = int(os.getenv("API_PORT", "8001"))
SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
SYSTEM_BASE_URL = os.getenv("SYSTEM_BASE_URL", "http://localhost:3000")

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "root")
MYSQL_DB = os.getenv("MYSQL_DB", "fkams")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
AI_PROVIDER_TIMEOUT_SECONDS = int(os.getenv("AI_PROVIDER_TIMEOUT_SECONDS", "45"))
AI_CONTEXT_MAX_CHARS = int(os.getenv("AI_CONTEXT_MAX_CHARS", "24000"))
