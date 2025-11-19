import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_tutor(client: AsyncClient, test_tutor_data):
    response = await client.post("/api/tutors/register", json=test_tutor_data)
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["tutor"]["email"] == test_tutor_data["email"]
    assert "password" not in data["tutor"]

@pytest.mark.asyncio
async def test_register_existing_tutor(client: AsyncClient, test_tutor_data):
    # Register first
    await client.post("/api/tutors/register", json=test_tutor_data)
    
    # Try registering again
    response = await client.post("/api/tutors/register", json=test_tutor_data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"

@pytest.mark.asyncio
async def test_login_tutor(client: AsyncClient, test_tutor_data):
    # Register first
    await client.post("/api/tutors/register", json=test_tutor_data)
    
    # Login
    login_data = {
        "email": test_tutor_data["email"],
        "password": test_tutor_data["password"]
    }
    response = await client.post("/api/tutors/login", json=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["tutor"]["email"] == test_tutor_data["email"]

@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, test_tutor_data):
    # Register first
    await client.post("/api/tutors/register", json=test_tutor_data)
    
    # Login with wrong password
    login_data = {
        "email": test_tutor_data["email"],
        "password": "wrongpassword"
    }
    response = await client.post("/api/tutors/login", json=login_data)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_current_tutor(client: AsyncClient, test_tutor_data):
    # Register
    reg_response = await client.post("/api/tutors/register", json=test_tutor_data)
    token = reg_response.json()["token"]
    
    # Get Me
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/tutors/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == test_tutor_data["email"]
