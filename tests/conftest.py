import pytest
import pytest_asyncio
from httpx import AsyncClient
from mongomock_motor import AsyncMongoMockClient
from backend.server import app, get_current_tutor
import os

# Set environment variables for testing
os.environ['MONGO_URL'] = 'mongodb://test'
os.environ['DB_NAME'] = 'test_db'
os.environ['JWT_SECRET'] = 'test_secret'

@pytest_asyncio.fixture
async def mock_db():
    """Mock MongoDB client."""
    client = AsyncMongoMockClient()
    db = client.test_db
    
    # Patch the app's db and client
    from backend import server
    old_client = server.client
    old_db = server.db
    
    server.client = client
    server.db = db
    
    yield db
    
    # Restore original
    server.client = old_client
    server.db = old_db

@pytest_asyncio.fixture
async def client(mock_db):
    """Async Test Client."""
    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def test_tutor_data():
    return {
        "email": "test@example.com",
        "password": "password123",
        "name": "Test Tutor"
    }
