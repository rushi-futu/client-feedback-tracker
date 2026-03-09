# Test Patterns
# pytest (backend) + Vitest (frontend) for Story Assignment Board

## What we test and why

| Layer | Tool | What it covers |
|-------|------|---------------|
| Backend unit | pytest | Service logic — scoring, gap detection — in isolation |
| Backend integration | pytest + httpx TestClient | Full HTTP request → DB → response, against real schema |
| Backend contract | pytest | Every endpoint response shape matches api-contract.yaml |
| Frontend unit | Vitest | Utility functions, type transforms |
| Frontend component | Vitest + Testing Library | Component render, interaction, loading/error states |
| Frontend contract | Vitest | lib/api.ts response types match backend schema types |

No e2e (Playwright/Cypress) until the feature is stable. Tester agent writes integration first.

---

## Backend: pytest

### conftest.py — the only place DB setup lives

```python
# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models.reporter import Reporter
from app.models.brief import Brief

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

# ── Factories ──────────────────────────────────────────────────────────────────
# Build model instances in tests — never hardcode IDs or assume DB state

@pytest.fixture
def reporter_factory(db):
    def make(name="Sarah Chen", beat="technology", workload=30, availability=True):
        r = Reporter(name=name, beat=beat, current_workload=workload, availability=availability)
        db.add(r)
        db.commit()
        db.refresh(r)
        return r
    return make

@pytest.fixture
def brief_factory(db):
    def make(headline="Test headline", description="Test description", priority="medium"):
        b = Brief(headline=headline, description=description, priority=priority)
        db.add(b)
        db.commit()
        db.refresh(b)
        return b
    return make
```

### Integration test pattern — every endpoint

```python
# backend/tests/test_briefs.py

class TestCreateBrief:
    def test_creates_brief_with_valid_data(self, client):
        res = client.post("/briefs/", json={
            "headline": "AI in newsrooms",
            "description": "How editors are using LLMs to assign stories",
            "priority": "high"
        })
        assert res.status_code == 201
        data = res.json()
        assert data["headline"] == "AI in newsrooms"
        assert data["status"] == "unassigned"
        assert "id" in data
        assert "created_at" in data

    def test_returns_422_when_headline_missing(self, client):
        res = client.post("/briefs/", json={
            "description": "Missing headline",
            "priority": "medium"
        })
        assert res.status_code == 422

    def test_returns_422_with_invalid_priority(self, client):
        res = client.post("/briefs/", json={
            "headline": "Valid",
            "description": "Valid",
            "priority": "urgent"   # not in enum
        })
        assert res.status_code == 422

    def test_returns_422_with_empty_headline(self, client):
        res = client.post("/briefs/", json={
            "headline": "",
            "description": "Valid",
            "priority": "medium"
        })
        assert res.status_code == 422


class TestGetBrief:
    def test_returns_brief_by_id(self, client, brief_factory):
        brief = brief_factory(headline="Climate story")
        res = client.get(f"/briefs/{brief.id}")
        assert res.status_code == 200
        assert res.json()["headline"] == "Climate story"

    def test_returns_404_for_missing_brief(self, client):
        res = client.get("/briefs/99999")
        assert res.status_code == 404
        assert res.json()["detail"] == "Brief not found"

    def test_returns_404_not_null_for_missing(self, client):
        # Must be 404, not 200 with null body
        res = client.get("/briefs/99999")
        assert res.status_code == 404


class TestUpdateBrief:
    def test_partial_update_only_changes_specified_fields(self, client, brief_factory):
        brief = brief_factory(headline="Original", priority="low")
        res = client.patch(f"/briefs/{brief.id}", json={"priority": "high"})
        assert res.status_code == 200
        data = res.json()
        assert data["headline"] == "Original"   # unchanged
        assert data["priority"] == "high"        # changed

    def test_update_nonexistent_brief_returns_404(self, client):
        res = client.patch("/briefs/99999", json={"priority": "high"})
        assert res.status_code == 404
```

### Service unit test pattern — pure logic, no HTTP

```python
# backend/tests/test_assignment_scorer.py
from app.services.assignment_scorer import score_assignment

class TestAssignmentScorer:
    def test_high_score_when_beat_matches_and_low_workload(self):
        score = score_assignment(
            brief_beat="technology",
            reporter_beat="technology",
            reporter_workload=20
        )
        assert score >= 80

    def test_low_score_when_beat_mismatches(self):
        score = score_assignment(
            brief_beat="technology",
            reporter_beat="politics",
            reporter_workload=20
        )
        assert score < 50

    def test_penalises_high_workload(self):
        low_workload = score_assignment("technology", "technology", reporter_workload=10)
        high_workload = score_assignment("technology", "technology", reporter_workload=90)
        assert low_workload > high_workload

    def test_unavailable_reporter_scores_zero(self):
        score = score_assignment(
            brief_beat="technology",
            reporter_beat="technology",
            reporter_workload=10,
            available=False
        )
        assert score == 0

    def test_score_is_between_0_and_100(self):
        score = score_assignment("technology", "technology", 50)
        assert 0 <= score <= 100
```

### Contract test pattern — response shape matches api-contract.yaml

```python
# backend/tests/test_contracts.py
# Validates that every endpoint's response matches the shape in api-contract.yaml.
# If this fails, the contract and implementation have drifted.

import yaml
from pathlib import Path

def load_contract():
    path = Path(__file__).parent.parent.parent / "api-contract.yaml"
    return yaml.safe_load(path.read_text())

class TestBriefContract:
    def test_create_brief_response_has_required_fields(self, client):
        contract = load_contract()
        required = contract["responses"]["BriefRead"]["required"]  # adjust to your contract shape
        res = client.post("/briefs/", json={
            "headline": "Contract test",
            "description": "Checking shape",
            "priority": "medium"
        })
        data = res.json()
        for field in required:
            assert field in data, f"Missing field: {field}"

    def test_list_briefs_returns_array(self, client, brief_factory):
        brief_factory()
        res = client.get("/briefs/")
        assert isinstance(res.json(), list)
```

### Adversarial test checklist

Tester agent runs this mentally for every endpoint before writing tests:

- Empty string where text expected?
- Missing required field?
- Wrong type (string where int expected)?
- Value outside enum?
- ID that doesn't exist?
- Negative number where positive expected?
- What happens at boundaries (workload=0, workload=100, workload=101)?
- Concurrent create — does it double-create?
- What if the dependency (DB) is unavailable?
- Does the error response match the contract shape?

---

## Frontend: Vitest + Testing Library

### vitest setup

```typescript
// frontend/vitest.config.ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
```

```typescript
// frontend/src/tests/setup.ts
import "@testing-library/jest-dom"
```

### Component test pattern

```typescript
// frontend/src/components/board/__tests__/BriefCard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { BriefCard } from "../BriefCard"
import { Brief } from "@/types"

const mockBrief: Brief = {
  id: 1,
  headline: "AI in newsrooms",
  description: "How editors use LLMs",
  priority: "high",
  status: "unassigned",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
}

describe("BriefCard", () => {
  it("renders headline and priority", () => {
    render(<BriefCard brief={mockBrief} onApprove={vi.fn()} onReassign={vi.fn()} />)
    expect(screen.getByText("AI in newsrooms")).toBeInTheDocument()
    expect(screen.getByText("high")).toBeInTheDocument()
  })

  it("calls onApprove with brief id when approve clicked", () => {
    const onApprove = vi.fn()
    render(<BriefCard brief={mockBrief} onApprove={onApprove} onReassign={vi.fn()} />)
    fireEvent.click(screen.getByText("Approve"))
    expect(onApprove).toHaveBeenCalledWith(1)
  })

  it("shows reporter name and confidence when assignment present", () => {
    const briefWithAssignment: Brief = {
      ...mockBrief,
      status: "assigned",
      assignment: {
        id: 1,
        brief_id: 1,
        reporter_id: 2,
        confidence_score: 87,
        status: "pending",
        reporter: { id: 2, name: "Sarah Chen", beat: "technology", current_workload: 30, availability: true },
        created_at: "2025-01-01T00:00:00Z",
      }
    }
    render(<BriefCard brief={briefWithAssignment} onApprove={vi.fn()} onReassign={vi.fn()} />)
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument()
    expect(screen.getByText("87")).toBeInTheDocument()
  })

  it("does not show approve/reassign when status is published", () => {
    render(<BriefCard brief={{ ...mockBrief, status: "published" }} onApprove={vi.fn()} onReassign={vi.fn()} />)
    expect(screen.queryByText("Approve")).not.toBeInTheDocument()
  })
})
```

### API client test pattern — mock fetch, test error handling

```typescript
// frontend/src/lib/__tests__/api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createBrief, getBrief } from "../api"

beforeEach(() => {
  vi.resetAllMocks()
})

describe("createBrief", () => {
  it("returns created brief on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, headline: "Test", status: "unassigned" }),
    } as Response)

    const result = await createBrief({ headline: "Test", description: "Desc", priority: "medium" })
    expect(result.id).toBe(1)
  })

  it("throws with detail message on 422", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ detail: "headline is required" }),
    } as Response)

    await expect(createBrief({ headline: "", description: "", priority: "medium" }))
      .rejects.toThrow("headline is required")
  })

  it("throws fallback message when response has no detail", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)

    await expect(createBrief({ headline: "Test", description: "Desc", priority: "medium" }))
      .rejects.toThrow("HTTP 500")
  })
})
```

### Form test pattern

```typescript
// frontend/src/components/forms/__tests__/CreateBriefForm.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CreateBriefForm } from "../CreateBriefForm"
import * as api from "@/lib/api"

vi.mock("@/lib/api")

describe("CreateBriefForm", () => {
  it("calls onSuccess after successful submit", async () => {
    vi.mocked(api.createBrief).mockResolvedValue({ id: 1, headline: "Test" } as any)
    const onSuccess = vi.fn()
    render(<CreateBriefForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "Test story" } })
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Test desc" } })
    fireEvent.submit(screen.getByRole("form"))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it("shows error message on API failure", async () => {
    vi.mocked(api.createBrief).mockRejectedValue(new Error("headline is required"))
    render(<CreateBriefForm onSuccess={vi.fn()} />)
    fireEvent.submit(screen.getByRole("form"))

    await waitFor(() => expect(screen.getByText("headline is required")).toBeInTheDocument())
  })

  it("disables submit button while loading", async () => {
    vi.mocked(api.createBrief).mockImplementation(() => new Promise(() => {})) // never resolves
    render(<CreateBriefForm onSuccess={vi.fn()} />)
    fireEvent.submit(screen.getByRole("form"))

    await waitFor(() => expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled())
  })
})
```

---

## Naming conventions

```
# Backend
tests/test_{resource}.py          — integration tests per resource
tests/test_{service_name}.py      — unit tests per service
tests/test_contracts.py           — contract shape tests

# Frontend
src/components/**/__tests__/*.test.tsx   — component tests
src/lib/__tests__/*.test.ts              — utility/api tests
```

## Test naming

```
# pytest — plain English, describes the scenario
def test_returns_404_for_missing_brief
def test_penalises_high_workload
def test_unavailable_reporter_scores_zero

# Vitest — describe block + it sentence
describe("BriefCard") > it("calls onApprove with brief id when approve clicked")
describe("createBrief") > it("throws with detail message on 422")
```

## What the tester agent must never do

- Fix bugs found during testing — raise an escalation instead
- Skip adversarial cases because the happy path passes
- Write tests that only test what is obviously working
- Assert on implementation detail (CSS class names, internal state)
- Leave `test.skip` or `test.todo` without a linked escalation
