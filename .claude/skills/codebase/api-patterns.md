# API Patterns
# FastAPI backend conventions for Story Assignment Board

## Router Structure

Every router follows this pattern exactly:

```python
# app/backend/app/routers/briefs.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.brief import Brief
from app.schemas.brief import BriefCreate, BriefRead, BriefUpdate

router = APIRouter(prefix="/briefs", tags=["briefs"])

@router.get("/", response_model=list[BriefRead])
def list_briefs(db: Session = Depends(get_db)):
    return db.query(Brief).all()

@router.get("/{brief_id}", response_model=BriefRead)
def get_brief(brief_id: int, db: Session = Depends(get_db)):
    brief = db.query(Brief).filter(Brief.id == brief_id).first()
    if not brief:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brief not found")
    return brief

@router.post("/", response_model=BriefRead, status_code=status.HTTP_201_CREATED)
def create_brief(body: BriefCreate, db: Session = Depends(get_db)):
    brief = Brief(**body.model_dump())
    db.add(brief)
    db.commit()
    db.refresh(brief)
    return brief

@router.patch("/{brief_id}", response_model=BriefRead)
def update_brief(brief_id: int, body: BriefUpdate, db: Session = Depends(get_db)):
    brief = db.query(Brief).filter(Brief.id == brief_id).first()
    if not brief:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brief not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(brief, key, value)
    db.commit()
    db.refresh(brief)
    return brief

@router.delete("/{brief_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brief(brief_id: int, db: Session = Depends(get_db)):
    brief = db.query(Brief).filter(Brief.id == brief_id).first()
    if not brief:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brief not found")
    db.delete(brief)
    db.commit()
```

## Schema Pattern

Three schema classes per resource — Create, Update, Read:

```python
# app/backend/app/schemas/brief.py
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    breaking = "breaking"

class BriefStatus(str, Enum):
    unassigned = "unassigned"
    assigned = "assigned"
    in_progress = "in_progress"
    published = "published"

class BriefCreate(BaseModel):
    headline: str
    description: str
    priority: Priority

class BriefUpdate(BaseModel):
    headline: str | None = None
    description: str | None = None
    priority: Priority | None = None
    status: BriefStatus | None = None

class BriefRead(BaseModel):
    id: int
    headline: str
    description: str
    priority: Priority
    status: BriefStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

## Model Pattern

```python
# app/backend/app/models/brief.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from app.database import Base
from app.schemas.brief import Priority, BriefStatus

class Brief(Base):
    __tablename__ = "briefs"

    id = Column(Integer, primary_key=True, index=True)
    headline = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(SAEnum(Priority), nullable=False, default=Priority.medium)
    status = Column(SAEnum(BriefStatus), nullable=False, default=BriefStatus.unassigned)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

## Database Setup

```python
# app/backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## App Entry Point

```python
# app/backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import briefs, reporters, assignments

app = FastAPI(title="Story Assignment Board API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(briefs.router)
app.include_router(reporters.router)
app.include_router(assignments.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

## Config Pattern

```python
# app/backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/feedback_tracker"
    environment: str = "development"

    model_config = {"env_file": ".env"}

settings = Settings()
```

## Error Handling Rules

- 404 for missing resources — always, never 200 with null
- 422 is automatic from Pydantic — don't duplicate validation
- 409 for conflicts (duplicate, state violation)
- Never return 500 intentionally — let FastAPI handle unexpected errors
- Error detail must be a human-readable string, not a code

## pyproject.toml

```toml
[project]
name = "story-assignment-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy>=2.0.0",
    "alembic>=1.13.0",
    "psycopg2-binary>=2.9.0",
    "pydantic-settings>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.27.0",
]
```
