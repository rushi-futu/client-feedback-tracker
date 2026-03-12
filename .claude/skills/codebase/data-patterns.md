# Data Patterns
# SQLAlchemy + Alembic + PostgreSQL conventions

## Model Rules

- All models inherit from Base (imported from app.database)
- All tables use snake_case names, plural (briefs, reporters, assignments)
- Every model has: id, created_at, updated_at
- Use SAEnum for Python enums — keeps DB and Python in sync
- Relationships defined on the "many" side with back_populates

```python
# app/backend/app/models/assignment.py
from sqlalchemy import Column, Integer, Float, String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.database import Base

class AssignmentStatus(str):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    brief_id = Column(Integer, ForeignKey("briefs.id"), nullable=False)
    reporter_id = Column(Integer, ForeignKey("reporters.id"), nullable=False)
    confidence_score = Column(Float, nullable=False)  # 0.0 - 100.0
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    brief = relationship("Brief", back_populates="assignment")
    reporter = relationship("Reporter", back_populates="assignments")
```

## Migration Workflow

Never write migrations by hand. Always:

```bash
# After changing a model:
cd app/backend
alembic revision --autogenerate -m "add confidence_score to assignments"
alembic upgrade head

# Check current state:
alembic current

# Roll back one step:
alembic downgrade -1
```

## Initial alembic.ini setup

```ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql://postgres:postgres@localhost:5432/storyboard
```

## alembic/env.py — import all models so autogenerate sees them

```python
from app.database import Base
from app.models import brief, reporter, assignment  # noqa: F401 — must import all

target_metadata = Base.metadata
```

## Seed Data Pattern

```python
# app/backend/app/seeds.py
from app.database import SessionLocal
from app.models.reporter import Reporter

def seed_reporters():
    db = SessionLocal()
    reporters = [
        Reporter(name="Sarah Chen", beat="technology", current_workload=30, availability=True),
        Reporter(name="James Okafor", beat="politics", current_workload=70, availability=True),
        Reporter(name="Maya Patel", beat="climate", current_workload=50, availability=True),
        Reporter(name="Tom Bradley", beat="economics", current_workload=20, availability=True),
        Reporter(name="Aisha Williams", beat="culture", current_workload=60, availability=False),
    ]
    db.add_all(reporters)
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_reporters()
    print("Seeded reporters")
```

## Test Database Pattern

```python
# app/backend/tests/conftest.py
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
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)
```

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Table | snake_case plural | `story_briefs` |
| Column | snake_case | `confidence_score` |
| FK | `{table_singular}_id` | `reporter_id` |
| Index | auto on PK and FK | — |
| Enum column | String with validation | `status = Column(String(20))` |

## What NOT to do

- Never use `db.execute(text("raw SQL"))` — use ORM query API
- Never call `db.commit()` in a router — only in the router after all operations succeed
- Never lazy-load relationships in a loop — use `joinedload()` or `selectinload()`
- Never put `Base.metadata.create_all()` in production — use alembic only

---
## Pattern: Pydantic max_length matching DB varchar
<!-- Promoted: 2026-03-12 -->
<!-- Source: escalation/log/review-20260312-073943.yaml -->

Always add `max_length` to Pydantic `str` fields that correspond to `varchar(N)` DB columns. SQLite does not enforce column length limits, so tests will pass even when strings exceed the DB constraint. In production PostgreSQL, oversized strings cause `DataError` → 500 instead of the expected 422.

```python
# DB model
client_name = Column(String(255), nullable=False)
summary = Column(String(500), nullable=False)

# Pydantic schema — max_length MUST match DB column length
client_name: str = Field(min_length=1, max_length=255)
summary: str = Field(min_length=1, max_length=500)
```

---
## Pattern: Deterministic secondary sort on timestamp ordering
<!-- Promoted: 2026-03-12 -->
<!-- Source: escalation/log/review-20260312-073943.yaml -->

When ordering query results by a timestamp column, always add a secondary sort by `id DESC`. Items created within the same second (SQLite) or microsecond (PostgreSQL under load) will otherwise have arbitrary order, causing flaky tests and non-deterministic UI rendering.

```python
# Bad — non-deterministic for same-timestamp rows
db.query(Feedback).order_by(Feedback.date_logged.desc())

# Good — deterministic tiebreaker
db.query(Feedback).order_by(Feedback.date_logged.desc(), Feedback.id.desc())
```
