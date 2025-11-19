import pytest
from httpx import AsyncClient

import pytest_asyncio

@pytest_asyncio.fixture
async def auth_token(client: AsyncClient, test_tutor_data):
    await client.post("/api/tutors/register", json=test_tutor_data)
    response = await client.post("/api/tutors/login", json=test_tutor_data)
    return response.json()["token"]

@pytest.fixture
def exam_data():
    return {
        "title": "Test Exam",
        "description": "This is a test exam",
        "required_fields": ["name", "email"],
        "questions": [
            {
                "type": "multiple_choice",
                "question_text": "What is 2+2?",
                "options": ["3", "4", "5"],
                "correct_answer": "4",
                "points": 5,
                "randomize_options": True
            }
        ],
        "settings": {
            "require_fullscreen": True,
            "detect_tab_switch": True,
            "disable_copy_paste": True,
            "disable_right_click": True,
            "max_violations": 3,
            "randomize_questions": True,
            "show_results_immediately": True
        }
    }

@pytest.mark.asyncio
async def test_create_exam(client: AsyncClient, auth_token, exam_data):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.post("/api/exams", json=exam_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == exam_data["title"]
    assert len(data["questions"]) == 1
    assert "id" in data

@pytest.mark.asyncio
async def test_get_exams(client: AsyncClient, auth_token, exam_data):
    headers = {"Authorization": f"Bearer {auth_token}"}
    # Create an exam first
    await client.post("/api/exams", json=exam_data, headers=headers)
    
    response = await client.get("/api/exams", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["title"] == exam_data["title"]

@pytest.mark.asyncio
async def test_submit_exam(client: AsyncClient, auth_token, exam_data):
    headers = {"Authorization": f"Bearer {auth_token}"}
    # Create exam
    create_res = await client.post("/api/exams", json=exam_data, headers=headers)
    exam_id = create_res.json()["id"]
    
    # Get public exam (no auth)
    public_res = await client.get(f"/api/exams/{exam_id}/public")
    assert public_res.status_code == 200
    public_exam = public_res.json()
    assert "correct_answer" not in public_exam["questions"][0]
    
    # Submit attempt
    submission_data = {
        "exam_id": exam_id,
        "student_data": {"name": "Student 1", "email": "student@test.com"},
        "answers": [
            {
                "question_id": public_exam["questions"][0]["id"],
                "answer": "4",
                "time_spent_seconds": 10
            }
        ],
        "violations": [],
        "browser_info": {"user_agent": "TestBot"}
    }
    
    submit_res = await client.post(f"/api/exams/{exam_id}/submit", json=submission_data)
    assert submit_res.status_code == 200
    result = submit_res.json()
    assert result["score"] == 5
    assert result["percentage"] == 100.0
