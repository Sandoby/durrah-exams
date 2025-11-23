# Enhanced Backend Server with Improved Security and Error Handling
# This is an improved version of the existing server.py

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from contextlib import asynccontextmanager
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, RedirectResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import json
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import requests
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from io import BytesIO

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with error handling
try:
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        logger.warning("MONGO_URL not set, MongoDB features will be disabled")
        client = None
        db = None
    else:
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'durrah_exams')]
        logger.info("MongoDB connected successfully")
except Exception as e:
    logger.error(f"MongoDB connection failed: {e}")
    client = None
    db = None

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Application starting up...")
    yield
    # Shutdown
    if client:
        client.close()
    logger.info("Application shutting down...")

# Create the main app
app = FastAPI(
    lifespan=lifespan,
    title="Durrah Exams API",
    description="Secure online examination platform",
    version="2.0.0"
)

@app.get("/", include_in_schema=False)
async def root_redirect():
    return RedirectResponse(url="/docs")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "mongodb": "connected" if db else "disconnected",
        "supabase": "configured" if SUPABASE_URL and SUPABASE_SERVICE_ROLE else "not configured",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# ============ MODELS ============

class TutorRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class TutorLogin(BaseModel):
    email: EmailStr
    password: str

class Tutor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class QuestionCreate(BaseModel):
    type: str
    question_text: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str | List[str]] = None
    points: int = 1
    randomize_options: bool = True

class Question(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    question_text: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str | List[str]] = None
    points: int
    randomize_options: bool

class ExamSettings(BaseModel):
    require_fullscreen: bool = True
    detect_tab_switch: bool = True
    disable_copy_paste: bool = True
    disable_right_click: bool = True
    max_violations: int = 3
    randomize_questions: bool = True
    show_results_immediately: bool = False
    time_limit_minutes: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ExamCreate(BaseModel):
    title: str
    description: str
    required_fields: List[str]
    questions: List[QuestionCreate]
    settings: ExamSettings

class Exam(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tutor_id: str
    title: str
    description: str
    required_fields: List[str]
    questions: List[Question]
    settings: ExamSettings
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True

class ViolationLog(BaseModel):
    type: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    details: Optional[str] = None

class StudentAnswer(BaseModel):
    question_id: str
    answer: str | List[str]
    time_spent_seconds: int = 0

class ExamSubmission(BaseModel):
    exam_id: str
    student_data: Dict[str, str]
    answers: List[StudentAnswer]
    violations: List[ViolationLog] = []
    browser_info: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(tutor_id: str) -> str:
    payload = {
        'tutor_id': tutor_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_tutor(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        tutor_id = payload.get('tutor_id')
        if not tutor_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return tutor_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ GRADING HELPER ============

def grade_submission(exam: Dict, answers: List[StudentAnswer]) -> Dict[str, Any]:
    """
    Server-side grading function
    Returns: {score, max_score, percentage, graded_answers}
    """
    score = 0
    max_score = 0
    graded_answers = []

    for question in exam['questions']:
        # Skip short answer questions (manual grading required)
        if question['type'] == 'short_answer':
            continue

        max_score += question.get('points', 0)

        # Find student's answer
        student_answer = next((a for a in answers if a.question_id == question['id']), None)
        
        if not student_answer:
            graded_answers.append({
                'question_id': question['id'],
                'answer': None,
                'is_correct': False
            })
            continue

        is_correct = False
        answer_value = student_answer.answer

        # Handle multiple select (array answers)
        if isinstance(question.get('correct_answer'), list):
            student_arr = []
            
            if isinstance(answer_value, list):
                student_arr = answer_value
            elif isinstance(answer_value, str):
                try:
                    student_arr = json.loads(answer_value)
                except:
                    student_arr = answer_value.split('||')
            
            correct_sorted = sorted([str(x).strip().lower() for x in question['correct_answer']])
            student_sorted = sorted([str(x).strip().lower() for x in student_arr])
            
            is_correct = correct_sorted == student_sorted
        else:
            # Handle single answer questions
            correct_answer = str(question.get('correct_answer', '')).strip().lower()
            student_answer_str = str(answer_value).strip().lower()

            if question['type'] == 'numeric':
                try:
                    correct_num = float(question['correct_answer'])
                    student_num = float(answer_value)
                    is_correct = correct_num == student_num
                except:
                    is_correct = correct_answer == student_answer_str
            else:
                is_correct = correct_answer == student_answer_str

        if is_correct:
            score += question.get('points', 0)

        graded_answers.append({
            'question_id': question['id'],
            'answer': json.dumps(answer_value) if isinstance(answer_value, list) else str(answer_value),
            'is_correct': is_correct
        })

    percentage = (score / max_score * 100) if max_score > 0 else 0

    return {
        'score': score,
        'max_score': max_score,
        'percentage': percentage,
        'graded_answers': graded_answers
    }

# ============ EXAM SUBMISSION ROUTE (IMPROVED) ============

@api_router.post("/exams/{exam_id}/submit")
async def submit_exam(exam_id: str, submission: ExamSubmission, request: Request):
    """
    Improved exam submission endpoint with:
    - Server-side grading
    - Time validation
    - Supabase mirroring
    - Better error handling
    """
    try:
        # Get client IP
        client_ip = request.client.host if request.client else None

        # Fetch exam from Supabase
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
            raise HTTPException(status_code=500, detail="Supabase not configured")

        headers = {
            'apikey': SUPABASE_SERVICE_ROLE,
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE}',
            'Content-Type': 'application/json'
        }

        # Fetch exam
        exam_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/exams?id=eq.{exam_id}&select=*"
        exam_response = requests.get(exam_url, headers=headers, timeout=10)
        
        if exam_response.status_code != 200:
            raise HTTPException(status_code=404, detail="Exam not found")

        exams = exam_response.json()
        if not exams:
            raise HTTPException(status_code=404, detail="Exam not found")

        exam = exams[0]

        # Fetch questions
        questions_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/questions?exam_id=eq.{exam_id}&select=*"
        questions_response = requests.get(questions_url, headers=headers, timeout=10)
        
        if questions_response.status_code == 200:
            exam['questions'] = questions_response.json()
        else:
            exam['questions'] = []

        # Validate time-based access
        settings = exam.get('settings', {})
        now = datetime.now(timezone.utc)

        if settings.get('start_time'):
            try:
                start_time = datetime.fromisoformat(settings['start_time'].replace('Z', '+00:00'))
                if now < start_time:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Exam has not started yet. Starts at {start_time.isoformat()}"
                    )
            except ValueError:
                logger.warning(f"Invalid start_time format: {settings.get('start_time')}")

        if settings.get('end_time'):
            try:
                end_time = datetime.fromisoformat(settings['end_time'].replace('Z', '+00:00'))
                if now > end_time:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Exam has ended. Ended at {end_time.isoformat()}"
                    )
            except ValueError:
                logger.warning(f"Invalid end_time format: {settings.get('end_time')}")

        # Grade the submission
        grading_result = grade_submission(exam, submission.answers)

        # Prepare student info
        student_name = submission.student_data.get('name') or submission.student_data.get('student_id') or 'Anonymous'
        student_email = submission.student_data.get('email') or f"{submission.student_data.get('student_id', 'student')}@example.com"

        # Create submission in Supabase
        submission_payload = {
            'exam_id': exam_id,
            'student_name': student_name,
            'student_email': student_email,
            'score': int(grading_result['score']),
            'max_score': int(grading_result['max_score']),
            'percentage': float(grading_result['percentage']),
            'violations': [v.model_dump() for v in submission.violations],
            'browser_info': submission.browser_info or {}
        }

        submissions_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/submissions"
        headers['Prefer'] = 'return=representation'

        submission_response = requests.post(
            submissions_url,
            json=submission_payload,
            headers=headers,
            timeout=10
        )

        if submission_response.status_code not in (200, 201):
            logger.error(f"Supabase submission failed: {submission_response.status_code} {submission_response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save submission: {submission_response.text}"
            )

        submission_data = submission_response.json()
        if isinstance(submission_data, list) and len(submission_data) > 0:
            submission_id = submission_data[0]['id']
        else:
            submission_id = submission_data.get('id')

        # Save graded answers
        if submission_id and grading_result['graded_answers']:
            answers_payload = [
                {
                    'submission_id': submission_id,
                    **answer
                }
                for answer in grading_result['graded_answers']
            ]

            answers_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/submission_answers"
            answers_response = requests.post(
                answers_url,
                json=answers_payload,
                headers=headers,
                timeout=10
            )

            if answers_response.status_code not in (200, 201):
                logger.warning(f"Failed to save answers: {answers_response.status_code} {answers_response.text}")

        # Return success response
        return {
            "success": True,
            "submission_id": submission_id,
            "score": grading_result['score'],
            "max_score": grading_result['max_score'],
            "percentage": grading_result['percentage'],
            "violations_count": len(submission.violations)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Submission error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ============ ERROR HANDLERS ============

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
