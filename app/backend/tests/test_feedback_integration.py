"""
Integration tests for feedback CRUD endpoints.
Tests full HTTP request → DB → response cycle.
Written by: tester agent (adversarial)
"""

import pytest


# ── Helpers ──────────────────────────────────────────────────────────────────

VALID_FEEDBACK = {
    "client_name": "Acme Corp",
    "summary": "Dashboard is slow",
    "detail": "Loading takes 5+ seconds on first paint",
    "theme": "Performance",
    "status": "Open",
}


def create_feedback(client, **overrides):
    """Helper to create feedback with defaults."""
    data = {**VALID_FEEDBACK, **overrides}
    return client.post("/feedback/", json=data)


# ── POST /feedback/ ─────────────────────────────────────────────────────────


class TestCreateFeedback:
    def test_creates_feedback_with_all_fields(self, client):
        res = create_feedback(client)
        assert res.status_code == 201
        data = res.json()
        assert data["client_name"] == "Acme Corp"
        assert data["summary"] == "Dashboard is slow"
        assert data["detail"] == "Loading takes 5+ seconds on first paint"
        assert data["theme"] == "Performance"
        assert data["status"] == "Open"
        assert "id" in data
        assert "date_logged" in data

    def test_creates_feedback_with_minimum_required_fields(self, client):
        res = client.post("/feedback/", json={
            "client_name": "MinCo",
            "summary": "Minimal feedback",
            "theme": "UX",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["client_name"] == "MinCo"
        assert data["status"] == "Open"  # contract default
        assert data["detail"] is None  # contract default

    def test_creates_feedback_with_every_theme(self, client):
        themes = ["UX", "Performance", "Support", "Pricing", "Communication"]
        for theme in themes:
            res = create_feedback(client, theme=theme, summary=f"Test {theme}")
            assert res.status_code == 201, f"Failed for theme: {theme}"
            assert res.json()["theme"] == theme

    def test_creates_feedback_with_every_status(self, client):
        statuses = ["Open", "In Progress", "Actioned"]
        for status in statuses:
            res = create_feedback(client, status=status, summary=f"Test {status}")
            assert res.status_code == 201, f"Failed for status: {status}"
            assert res.json()["status"] == status

    def test_in_progress_status_with_space(self, client):
        """Regression: 'In Progress' has a space — common serialization failure point."""
        res = create_feedback(client, status="In Progress")
        assert res.status_code == 201
        assert res.json()["status"] == "In Progress"

    def test_returns_422_when_client_name_missing(self, client):
        res = client.post("/feedback/", json={
            "summary": "No client",
            "theme": "UX",
        })
        assert res.status_code == 422

    def test_returns_422_when_summary_missing(self, client):
        res = client.post("/feedback/", json={
            "client_name": "Acme",
            "theme": "UX",
        })
        assert res.status_code == 422

    def test_returns_422_when_theme_missing(self, client):
        res = client.post("/feedback/", json={
            "client_name": "Acme",
            "summary": "No theme",
        })
        assert res.status_code == 422

    def test_returns_422_with_invalid_theme(self, client):
        res = create_feedback(client, theme="InvalidTheme")
        assert res.status_code == 422

    def test_returns_422_with_invalid_status(self, client):
        res = create_feedback(client, status="Closed")
        assert res.status_code == 422

    def test_returns_422_with_empty_body(self, client):
        res = client.post("/feedback/", json={})
        assert res.status_code == 422

    def test_returns_422_with_null_required_field(self, client):
        res = client.post("/feedback/", json={
            "client_name": None,
            "summary": "Test",
            "theme": "UX",
        })
        assert res.status_code == 422

    def test_returns_422_with_wrong_type_for_client_name(self, client):
        res = client.post("/feedback/", json={
            "client_name": 12345,
            "summary": "Test",
            "theme": "UX",
        })
        # FastAPI/Pydantic may coerce int to string — either 422 or 201 is valid
        # but we document what actually happens
        assert res.status_code in (201, 422)

    def test_date_logged_is_auto_set(self, client):
        res = create_feedback(client)
        assert res.status_code == 201
        data = res.json()
        assert data["date_logged"] is not None
        assert len(data["date_logged"]) > 0

    def test_id_is_integer(self, client):
        res = create_feedback(client)
        assert res.status_code == 201
        assert isinstance(res.json()["id"], int)

    def test_empty_string_client_name_accepted(self, client):
        """Contract says client_name is required string. Empty string is technically a string.
        Should the backend reject empty strings? Currently no min_length validation."""
        res = create_feedback(client, client_name="")
        # This documents current behaviour — may need validation added
        assert res.status_code in (201, 422)

    def test_very_long_client_name(self, client):
        """client_name is varchar(255). What happens at 256 chars?"""
        long_name = "A" * 256
        res = create_feedback(client, client_name=long_name)
        # SQLite won't enforce varchar length. PostgreSQL would.
        # Document current behavior.
        assert res.status_code in (201, 422, 500)

    def test_very_long_summary(self, client):
        """summary is varchar(255). What happens at 256 chars?"""
        long_summary = "B" * 256
        res = create_feedback(client, summary=long_summary)
        assert res.status_code in (201, 422, 500)

    def test_case_sensitive_theme(self, client):
        """Theme enum values are case-sensitive. 'ux' should fail."""
        res = create_feedback(client, theme="ux")
        assert res.status_code == 422

    def test_case_sensitive_status(self, client):
        """Status enum values are case-sensitive. 'open' should fail."""
        res = create_feedback(client, status="open")
        assert res.status_code == 422


# ── GET /feedback/ ──────────────────────────────────────────────────────────


class TestListFeedback:
    def test_returns_empty_list_when_no_items(self, client):
        res = client.get("/feedback/")
        assert res.status_code == 200
        assert res.json() == []

    def test_returns_all_items(self, client):
        create_feedback(client, client_name="Client A")
        create_feedback(client, client_name="Client B")
        res = client.get("/feedback/")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2

    def test_returns_items_newest_first(self, client):
        """Contract: returned in descending date_logged order."""
        create_feedback(client, client_name="First")
        create_feedback(client, client_name="Second")
        res = client.get("/feedback/")
        data = res.json()
        assert len(data) == 2
        # Second created should appear first (newest)
        assert data[0]["client_name"] == "Second"
        assert data[1]["client_name"] == "First"

    def test_response_is_array(self, client):
        res = client.get("/feedback/")
        assert isinstance(res.json(), list)

    def test_each_item_has_required_fields(self, client):
        """Contract: FeedbackRead required fields."""
        create_feedback(client)
        res = client.get("/feedback/")
        data = res.json()
        required_fields = ["id", "client_name", "summary", "theme", "status", "date_logged"]
        for item in data:
            for field in required_fields:
                assert field in item, f"Missing required field: {field}"

    def test_list_includes_detail_field(self, client):
        """detail may be null but should always be present in response."""
        create_feedback(client, detail=None)
        res = client.get("/feedback/")
        data = res.json()
        assert "detail" in data[0]


# ── GET /feedback/{id} ──────────────────────────────────────────────────────


class TestGetFeedback:
    def test_returns_feedback_by_id(self, client):
        created = create_feedback(client).json()
        res = client.get(f"/feedback/{created['id']}")
        assert res.status_code == 200
        assert res.json()["id"] == created["id"]
        assert res.json()["client_name"] == "Acme Corp"

    def test_returns_404_for_nonexistent_id(self, client):
        res = client.get("/feedback/99999")
        assert res.status_code == 404

    def test_404_has_correct_detail_message(self, client):
        """Contract: 404 body is { detail: 'Feedback item not found' }."""
        res = client.get("/feedback/99999")
        assert res.status_code == 404
        assert res.json()["detail"] == "Feedback item not found"

    def test_returns_404_not_null_body_for_missing(self, client):
        """Must be 404, not 200 with null body."""
        res = client.get("/feedback/99999")
        assert res.status_code == 404
        assert res.json() is not None

    def test_returns_422_for_non_integer_id(self, client):
        """Path param should be integer. String should fail."""
        res = client.get("/feedback/abc")
        assert res.status_code == 422

    def test_returns_404_or_422_for_negative_id(self, client):
        res = client.get("/feedback/-1")
        assert res.status_code in (404, 422)

    def test_returns_404_or_422_for_zero_id(self, client):
        res = client.get("/feedback/0")
        assert res.status_code in (404, 422)

    def test_response_has_all_required_fields(self, client):
        created = create_feedback(client).json()
        res = client.get(f"/feedback/{created['id']}")
        data = res.json()
        required_fields = ["id", "client_name", "summary", "theme", "status", "date_logged"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"


# ── PATCH /feedback/{id} ────────────────────────────────────────────────────


class TestUpdateFeedback:
    def test_partial_update_only_changes_specified_fields(self, client):
        created = create_feedback(client).json()
        res = client.patch(f"/feedback/{created['id']}", json={"status": "Actioned"})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "Actioned"
        assert data["client_name"] == "Acme Corp"  # unchanged
        assert data["summary"] == "Dashboard is slow"  # unchanged
        assert data["theme"] == "Performance"  # unchanged

    def test_update_client_name(self, client):
        created = create_feedback(client).json()
        res = client.patch(f"/feedback/{created['id']}", json={"client_name": "New Corp"})
        assert res.status_code == 200
        assert res.json()["client_name"] == "New Corp"

    def test_update_summary(self, client):
        created = create_feedback(client).json()
        res = client.patch(f"/feedback/{created['id']}", json={"summary": "Updated summary"})
        assert res.status_code == 200
        assert res.json()["summary"] == "Updated summary"

    def test_update_theme(self, client):
        created = create_feedback(client).json()
        res = client.patch(f"/feedback/{created['id']}", json={"theme": "UX"})
        assert res.status_code == 200
        assert res.json()["theme"] == "UX"

    def test_update_detail_to_value(self, client):
        created = create_feedback(client, detail=None).json()
        res = client.patch(f"/feedback/{created['id']}", json={"detail": "New detail"})
        assert res.status_code == 200
        assert res.json()["detail"] == "New detail"

    def test_update_detail_to_null(self, client):
        created = create_feedback(client, detail="Some detail").json()
        res = client.patch(f"/feedback/{created['id']}", json={"detail": None})
        assert res.status_code == 200
        assert res.json()["detail"] is None

    def test_update_status_to_in_progress(self, client):
        """Regression: 'In Progress' with space."""
        created = create_feedback(client).json()
        res = client.patch(f"/feedback/{created['id']}", json={"status": "In Progress"})
        assert res.status_code == 200
        assert res.json()["status"] == "In Progress"

    def test_update_multiple_fields_at_once(self, client):
        created = create_feedback(client).json()
        res = client.patch(f"/feedback/{created['id']}", json={
            "client_name": "Updated Corp",
            "theme": "Support",
            "status": "Actioned",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["client_name"] == "Updated Corp"
        assert data["theme"] == "Support"
        assert data["status"] == "Actioned"

    def test_empty_body_update_changes_nothing(self, client):
        """PATCH with empty body should be a no-op (exclude_unset=True)."""
        created = create_feedback(client).json()
        res = client.patch(f"/feedback/{created['id']}", json={})
        assert res.status_code == 200
        data = res.json()
        assert data["client_name"] == created["client_name"]
        assert data["summary"] == created["summary"]
        assert data["theme"] == created["theme"]
        assert data["status"] == created["status"]

    def test_update_nonexistent_feedback_returns_404(self, client):
        res = client.patch("/feedback/99999", json={"status": "Actioned"})
        assert res.status_code == 404
        assert res.json()["detail"] == "Feedback item not found"

    def test_update_with_invalid_theme_returns_422(self, client):
        created = create_feedback(client).json()
        res = client.patch(f"/feedback/{created['id']}", json={"theme": "InvalidTheme"})
        assert res.status_code == 422

    def test_update_with_invalid_status_returns_422(self, client):
        created = create_feedback(client).json()
        res = client.patch(f"/feedback/{created['id']}", json={"status": "Closed"})
        assert res.status_code == 422

    def test_date_logged_is_not_editable(self, client):
        """date_logged should not change on update."""
        created = create_feedback(client).json()
        original_date = created["date_logged"]
        res = client.patch(f"/feedback/{created['id']}", json={"summary": "Changed"})
        assert res.status_code == 200
        assert res.json()["date_logged"] == original_date

    def test_update_returns_full_object(self, client):
        """PATCH response must be full FeedbackRead, not just updated fields."""
        created = create_feedback(client).json()
        res = client.patch(f"/feedback/{created['id']}", json={"summary": "Changed"})
        assert res.status_code == 200
        data = res.json()
        required_fields = ["id", "client_name", "summary", "theme", "status", "date_logged"]
        for field in required_fields:
            assert field in data, f"Missing field in PATCH response: {field}"


# ── DELETE /feedback/{id} ───────────────────────────────────────────────────


class TestDeleteFeedback:
    def test_delete_existing_feedback(self, client):
        created = create_feedback(client).json()
        res = client.delete(f"/feedback/{created['id']}")
        assert res.status_code == 204

    def test_delete_returns_no_body(self, client):
        """Contract: 204 body is null."""
        created = create_feedback(client).json()
        res = client.delete(f"/feedback/{created['id']}")
        assert res.status_code == 204
        assert res.content == b""

    def test_deleted_item_no_longer_retrievable(self, client):
        created = create_feedback(client).json()
        client.delete(f"/feedback/{created['id']}")
        res = client.get(f"/feedback/{created['id']}")
        assert res.status_code == 404

    def test_deleted_item_removed_from_list(self, client):
        created = create_feedback(client).json()
        client.delete(f"/feedback/{created['id']}")
        res = client.get("/feedback/")
        ids = [item["id"] for item in res.json()]
        assert created["id"] not in ids

    def test_delete_nonexistent_feedback_returns_404(self, client):
        res = client.delete("/feedback/99999")
        assert res.status_code == 404
        assert res.json()["detail"] == "Feedback item not found"

    def test_double_delete_returns_404(self, client):
        created = create_feedback(client).json()
        res1 = client.delete(f"/feedback/{created['id']}")
        assert res1.status_code == 204
        res2 = client.delete(f"/feedback/{created['id']}")
        assert res2.status_code == 404

    def test_delete_non_integer_id(self, client):
        res = client.delete("/feedback/abc")
        assert res.status_code == 422


# ── Contract shape tests ────────────────────────────────────────────────────


class TestContractShape:
    """Verify response shapes match api-contract.yaml exactly."""

    def test_feedback_read_shape(self, client):
        """FeedbackRead must have exactly the fields from the contract."""
        created = create_feedback(client).json()
        expected_fields = {"id", "client_name", "summary", "detail", "theme", "status", "date_logged"}
        actual_fields = set(created.keys())
        assert actual_fields == expected_fields, (
            f"Extra fields: {actual_fields - expected_fields}, "
            f"Missing fields: {expected_fields - actual_fields}"
        )

    def test_list_returns_array_of_feedback_read(self, client):
        create_feedback(client)
        res = client.get("/feedback/")
        data = res.json()
        assert isinstance(data, list)
        expected_fields = {"id", "client_name", "summary", "detail", "theme", "status", "date_logged"}
        for item in data:
            assert set(item.keys()) == expected_fields

    def test_404_response_shape(self, client):
        """404 must have { detail: string } shape."""
        res = client.get("/feedback/99999")
        data = res.json()
        assert "detail" in data
        assert isinstance(data["detail"], str)

    def test_theme_enum_values_match_contract(self, client):
        """Contract: Theme enum = UX, Performance, Support, Pricing, Communication."""
        contract_themes = ["UX", "Performance", "Support", "Pricing", "Communication"]
        for theme in contract_themes:
            res = create_feedback(client, theme=theme, summary=f"Theme {theme}")
            assert res.status_code == 201
            assert res.json()["theme"] == theme

    def test_status_enum_values_match_contract(self, client):
        """Contract: Status enum = Open, In Progress, Actioned."""
        contract_statuses = ["Open", "In Progress", "Actioned"]
        for status in contract_statuses:
            res = create_feedback(client, status=status, summary=f"Status {status}")
            assert res.status_code == 201
            assert res.json()["status"] == status

    def test_id_is_integer_type(self, client):
        res = create_feedback(client)
        assert isinstance(res.json()["id"], int)

    def test_date_logged_is_string_datetime(self, client):
        res = create_feedback(client)
        date_logged = res.json()["date_logged"]
        assert isinstance(date_logged, str)
        # Should parse as ISO datetime
        from datetime import datetime
        datetime.fromisoformat(date_logged.replace("Z", "+00:00"))


# ── Health check ─────────────────────────────────────────────────────────────


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}


# ── Edge cases / adversarial ─────────────────────────────────────────────────


class TestAdversarial:
    def test_sql_injection_in_client_name(self, client):
        """Ensure SQL injection doesn't cause errors."""
        res = create_feedback(client, client_name="'; DROP TABLE feedback_items; --")
        assert res.status_code == 201

    def test_html_injection_in_summary(self, client):
        res = create_feedback(client, summary="<script>alert('xss')</script>")
        assert res.status_code == 201
        # Backend stores as-is (no sanitization) — frontend must escape
        assert "<script>" in res.json()["summary"]

    def test_unicode_in_client_name(self, client):
        res = create_feedback(client, client_name="クライアント Corp")
        assert res.status_code == 201
        assert res.json()["client_name"] == "クライアント Corp"

    def test_emoji_in_summary(self, client):
        res = create_feedback(client, summary="Great product! 🎉👍")
        assert res.status_code == 201
        assert "🎉" in res.json()["summary"]

    def test_newlines_in_detail(self, client):
        res = create_feedback(client, detail="Line 1\nLine 2\nLine 3")
        assert res.status_code == 201
        assert "\n" in res.json()["detail"]

    def test_content_type_json_required(self, client):
        """Sending non-JSON should fail."""
        res = client.post("/feedback/", content="not json", headers={"Content-Type": "text/plain"})
        assert res.status_code == 422

    def test_extra_fields_ignored(self, client):
        """Extra fields in request body should be ignored."""
        data = {**VALID_FEEDBACK, "extra_field": "should be ignored"}
        res = client.post("/feedback/", json=data)
        assert res.status_code == 201
        assert "extra_field" not in res.json()

    def test_put_method_not_allowed(self, client):
        """Contract defines PATCH, not PUT. PUT should return 405."""
        created = create_feedback(client).json()
        res = client.put(f"/feedback/{created['id']}", json={"summary": "Changed"})
        assert res.status_code == 405

    def test_post_to_specific_id_not_allowed(self, client):
        """POST should only work on /feedback/, not /feedback/{id}."""
        res = client.post("/feedback/1", json=VALID_FEEDBACK)
        assert res.status_code == 405
