import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def feedback_factory(client):
    """Create feedback items via the API. Returns the created item dict."""

    def make(
        client_name="Acme Corp",
        summary="Test feedback summary",
        detail=None,
        theme="UX",
        status="Open",
    ):
        payload = {
            "client_name": client_name,
            "summary": summary,
            "theme": theme,
            "status": status,
        }
        if detail is not None:
            payload["detail"] = detail
        res = client.post("/feedback/", json=payload)
        assert res.status_code == 201, f"Factory create failed: {res.text}"
        return res.json()

    return make
