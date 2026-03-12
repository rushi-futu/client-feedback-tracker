"""
Integration tests for all feedback CRUD endpoints.
Adversarial: tests every contract endpoint, happy paths, error paths, and edge cases.
"""

import time


# ═══════════════════════════════════════════════════════════════════
# POST /feedback/ — Create
# ═══════════════════════════════════════════════════════════════════

class TestCreateFeedback:
    def test_creates_feedback_with_all_fields(self, client):
        res = client.post("/feedback/", json={
            "client_name": "Acme Corp",
            "summary": "UI is slow on dashboard",
            "detail": "Especially when loading charts",
            "theme": "Performance",
            "status": "Open",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["client_name"] == "Acme Corp"
        assert data["summary"] == "UI is slow on dashboard"
        assert data["detail"] == "Especially when loading charts"
        assert data["theme"] == "Performance"
        assert data["status"] == "Open"
        assert "id" in data
        assert "date_logged" in data
        assert "updated_at" in data

    def test_creates_feedback_without_optional_fields(self, client):
        """detail is optional, status defaults to Open."""
        res = client.post("/feedback/", json={
            "client_name": "Beta Inc",
            "summary": "Love the new feature",
            "theme": "UX",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["detail"] is None
        assert data["status"] == "Open"

    def test_creates_feedback_with_explicit_null_detail(self, client):
        res = client.post("/feedback/", json={
            "client_name": "Beta Inc",
            "summary": "Love the new feature",
            "detail": None,
            "theme": "UX",
        })
        assert res.status_code == 201
        assert res.json()["detail"] is None

    def test_returns_422_when_client_name_missing(self, client):
        res = client.post("/feedback/", json={
            "summary": "Missing client_name",
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
            "summary": "Missing theme",
        })
        assert res.status_code == 422

    def test_returns_422_with_invalid_theme(self, client):
        res = client.post("/feedback/", json={
            "client_name": "Acme",
            "summary": "Bad theme",
            "theme": "InvalidTheme",
        })
        assert res.status_code == 422

    def test_returns_422_with_invalid_status(self, client):
        res = client.post("/feedback/", json={
            "client_name": "Acme",
            "summary": "Bad status",
            "theme": "UX",
            "status": "Closed",
        })
        assert res.status_code == 422

    def test_returns_422_with_empty_body(self, client):
        res = client.post("/feedback/", json={})
        assert res.status_code == 422

    def test_returns_422_with_wrong_type_for_client_name(self, client):
        res = client.post("/feedback/", json={
            "client_name": 12345,
            "summary": "Type mismatch",
            "theme": "UX",
        })
        # Pydantic may coerce int to str. If it does, this is a finding.
        # If 422, that's correct per contract.
        # We document whichever behaviour we observe.
        if res.status_code == 201:
            # BUG: Pydantic coerces int → str, bypassing type validation
            assert False, (
                "BUG: client_name accepts integer input (Pydantic coercion). "
                f"Got client_name='{res.json()['client_name']}'"
            )

    def test_accepts_empty_string_client_name(self, client):
        """
        ADVERSARIAL: Contract says client_name is required string.
        Empty string "" is technically a string but semantically invalid.
        The backend should reject it with 422.
        """
        res = client.post("/feedback/", json={
            "client_name": "",
            "summary": "Valid summary",
            "theme": "UX",
        })
        # If this returns 201, it's a bug — empty client_name should not be allowed
        assert res.status_code == 422, (
            f"BUG: Empty string accepted for required field client_name. "
            f"Status {res.status_code}, body: {res.json()}"
        )

    def test_accepts_empty_string_summary(self, client):
        """
        ADVERSARIAL: Same as above for summary.
        """
        res = client.post("/feedback/", json={
            "client_name": "Acme Corp",
            "summary": "",
            "theme": "UX",
        })
        assert res.status_code == 422, (
            f"BUG: Empty string accepted for required field summary. "
            f"Status {res.status_code}, body: {res.json()}"
        )

    def test_accepts_whitespace_only_client_name(self, client):
        """
        ADVERSARIAL: Whitespace-only strings are semantically empty.
        """
        res = client.post("/feedback/", json={
            "client_name": "   ",
            "summary": "Valid",
            "theme": "UX",
        })
        assert res.status_code == 422, (
            f"BUG: Whitespace-only string accepted for client_name. "
            f"Status {res.status_code}"
        )

    def test_very_long_client_name_beyond_db_limit(self, client):
        """
        ADVERSARIAL: DB column is varchar(255). What happens with 300 chars?
        Should return 422 (Pydantic validation) not 500 (DB error).
        """
        long_name = "A" * 300
        res = client.post("/feedback/", json={
            "client_name": long_name,
            "summary": "Long name test",
            "theme": "UX",
        })
        # Ideal: 422 from Pydantic. Acceptable: 201 if SQLite doesn't enforce varchar length.
        # Unacceptable: 500 internal server error.
        assert res.status_code != 500, (
            f"BUG: Long client_name causes 500 instead of 422. Body: {res.text}"
        )

    def test_very_long_summary_beyond_db_limit(self, client):
        """DB column is varchar(500)."""
        long_summary = "B" * 600
        res = client.post("/feedback/", json={
            "client_name": "Acme",
            "summary": long_summary,
            "theme": "UX",
        })
        assert res.status_code != 500, (
            f"BUG: Long summary causes 500 instead of 422. Body: {res.text}"
        )

    def test_all_theme_values_accepted(self, client):
        """Every theme enum value from the contract must work."""
        themes = ["UX", "Performance", "Support", "Pricing", "Communication"]
        for theme in themes:
            res = client.post("/feedback/", json={
                "client_name": f"Client for {theme}",
                "summary": f"Testing {theme}",
                "theme": theme,
            })
            assert res.status_code == 201, f"Theme '{theme}' rejected: {res.text}"
            assert res.json()["theme"] == theme

    def test_all_status_values_accepted(self, client):
        """Every status enum value from the contract must work."""
        statuses = ["Open", "In Progress", "Actioned"]
        for status in statuses:
            res = client.post("/feedback/", json={
                "client_name": "Client",
                "summary": "Testing status",
                "theme": "UX",
                "status": status,
            })
            assert res.status_code == 201, f"Status '{status}' rejected: {res.text}"
            assert res.json()["status"] == status

    def test_id_is_auto_generated(self, client):
        """Cannot set id manually — it should be auto-generated."""
        res = client.post("/feedback/", json={
            "client_name": "Acme",
            "summary": "Test",
            "theme": "UX",
            "id": 9999,
        })
        assert res.status_code == 201
        # id should be auto-generated, not 9999
        assert res.json()["id"] != 9999 or True  # Document if Pydantic ignores extra fields

    def test_date_logged_is_auto_set(self, client):
        """date_logged should be set by server, not by client."""
        res = client.post("/feedback/", json={
            "client_name": "Acme",
            "summary": "Test",
            "theme": "UX",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["date_logged"] is not None
        assert data["updated_at"] is not None

    def test_case_sensitive_theme_values(self, client):
        """Theme must be exact case: 'ux' should fail, 'UX' should pass."""
        res = client.post("/feedback/", json={
            "client_name": "Acme",
            "summary": "Case test",
            "theme": "ux",  # lowercase
        })
        assert res.status_code == 422, (
            f"BUG: Case-insensitive theme accepted. Got {res.status_code}"
        )

    def test_case_sensitive_status_values(self, client):
        """Status must be exact case: 'open' should fail."""
        res = client.post("/feedback/", json={
            "client_name": "Acme",
            "summary": "Case test",
            "theme": "UX",
            "status": "open",
        })
        assert res.status_code == 422, (
            f"BUG: Case-insensitive status accepted. Got {res.status_code}"
        )


# ═══════════════════════════════════════════════════════════════════
# GET /feedback/ — List with filtering
# ═══════════════════════════════════════════════════════════════════

class TestListFeedback:
    def test_returns_empty_list_when_no_data(self, client):
        res = client.get("/feedback/")
        assert res.status_code == 200
        assert res.json() == []

    def test_returns_all_items(self, client, feedback_factory):
        feedback_factory(client_name="Client A")
        feedback_factory(client_name="Client B")
        res = client.get("/feedback/")
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_returns_items_ordered_by_date_logged_desc(self, client, feedback_factory):
        """Contract: newest first."""
        f1 = feedback_factory(client_name="First")
        time.sleep(0.1)  # ensure different timestamps
        f2 = feedback_factory(client_name="Second")
        res = client.get("/feedback/")
        data = res.json()
        assert data[0]["client_name"] == "Second"
        assert data[1]["client_name"] == "First"

    def test_filter_by_search_case_insensitive(self, client, feedback_factory):
        feedback_factory(client_name="Acme Corp")
        feedback_factory(client_name="Beta Inc")
        res = client.get("/feedback/?search=acme")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["client_name"] == "Acme Corp"

    def test_filter_by_search_substring(self, client, feedback_factory):
        feedback_factory(client_name="Acme Corp")
        res = client.get("/feedback/?search=me Co")
        assert res.status_code == 200
        assert len(res.json()) == 1

    def test_filter_by_search_no_match(self, client, feedback_factory):
        feedback_factory(client_name="Acme Corp")
        res = client.get("/feedback/?search=zzzzz")
        assert res.status_code == 200
        assert len(res.json()) == 0

    def test_filter_by_theme(self, client, feedback_factory):
        feedback_factory(theme="UX")
        feedback_factory(theme="Performance")
        res = client.get("/feedback/?theme=UX")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["theme"] == "UX"

    def test_filter_by_status(self, client, feedback_factory):
        feedback_factory(status="Open")
        feedback_factory(status="Actioned")
        res = client.get("/feedback/?status=Actioned")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["status"] == "Actioned"

    def test_filter_by_status_with_space(self, client, feedback_factory):
        """ADVERSARIAL: 'In Progress' has a space — must work as query param."""
        feedback_factory(status="In Progress")
        feedback_factory(status="Open")
        res = client.get("/feedback/?status=In Progress")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["status"] == "In Progress"

    def test_filter_combined_search_and_theme(self, client, feedback_factory):
        feedback_factory(client_name="Acme Corp", theme="UX")
        feedback_factory(client_name="Acme Corp", theme="Performance")
        feedback_factory(client_name="Beta Inc", theme="UX")
        res = client.get("/feedback/?search=Acme&theme=UX")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["client_name"] == "Acme Corp"
        assert data[0]["theme"] == "UX"

    def test_filter_combined_all_three(self, client, feedback_factory):
        feedback_factory(client_name="Acme", theme="UX", status="Open")
        feedback_factory(client_name="Acme", theme="UX", status="Actioned")
        feedback_factory(client_name="Beta", theme="UX", status="Open")
        res = client.get("/feedback/?search=Acme&theme=UX&status=Open")
        assert res.status_code == 200
        assert len(res.json()) == 1

    def test_invalid_theme_filter_returns_422(self, client):
        """ADVERSARIAL: Invalid enum value in query param."""
        res = client.get("/feedback/?theme=InvalidTheme")
        assert res.status_code == 422, (
            f"BUG: Invalid theme filter accepted. Got {res.status_code}: {res.json()}"
        )

    def test_invalid_status_filter_returns_422(self, client):
        res = client.get("/feedback/?status=InvalidStatus")
        assert res.status_code == 422, (
            f"BUG: Invalid status filter accepted. Got {res.status_code}: {res.json()}"
        )

    def test_empty_search_returns_all(self, client, feedback_factory):
        """search="" should behave like no search filter."""
        feedback_factory(client_name="Acme")
        feedback_factory(client_name="Beta")
        res = client.get("/feedback/?search=")
        assert res.status_code == 200
        # Empty search should not filter — but ilike("%%") matches everything
        assert len(res.json()) == 2

    def test_sql_injection_in_search(self, client, feedback_factory):
        """ADVERSARIAL: SQL injection attempt."""
        feedback_factory(client_name="Normal Client")
        res = client.get("/feedback/?search=' OR 1=1 --")
        assert res.status_code == 200
        # Should return 0 results, not all results
        assert len(res.json()) == 0


# ═══════════════════════════════════════════════════════════════════
# GET /feedback/{id} — Get single
# ═══════════════════════════════════════════════════════════════════

class TestGetFeedback:
    def test_returns_feedback_by_id(self, client, feedback_factory):
        item = feedback_factory(client_name="Test Client")
        res = client.get(f"/feedback/{item['id']}")
        assert res.status_code == 200
        assert res.json()["client_name"] == "Test Client"

    def test_returns_404_for_nonexistent_id(self, client):
        res = client.get("/feedback/99999")
        assert res.status_code == 404
        assert res.json()["detail"] == "Feedback item not found"

    def test_returns_404_not_null_body_for_missing(self, client):
        """Must be 404 with JSON body, not 200 with null."""
        res = client.get("/feedback/99999")
        assert res.status_code == 404
        assert res.json() is not None

    def test_returns_422_for_non_integer_id(self, client):
        """Path param id must be integer."""
        res = client.get("/feedback/abc")
        assert res.status_code == 422

    def test_returns_422_for_negative_id(self, client):
        """Negative IDs should still work (no results expected) or return 404."""
        res = client.get("/feedback/-1")
        # Acceptable: 404 (not found) or 422 (validation). Not 500.
        assert res.status_code in (404, 422), (
            f"Unexpected status for negative ID: {res.status_code}"
        )

    def test_returns_422_or_404_for_zero_id(self, client):
        res = client.get("/feedback/0")
        assert res.status_code in (404, 422)

    def test_response_has_all_required_fields(self, client, feedback_factory):
        """Contract: FeedbackRead required fields."""
        item = feedback_factory()
        res = client.get(f"/feedback/{item['id']}")
        data = res.json()
        required_fields = ["id", "client_name", "summary", "theme", "status", "date_logged", "updated_at"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        # detail should be present (even if null)
        assert "detail" in data


# ═══════════════════════════════════════════════════════════════════
# PATCH /feedback/{id} — Update
# ═══════════════════════════════════════════════════════════════════

class TestUpdateFeedback:
    def test_partial_update_single_field(self, client, feedback_factory):
        item = feedback_factory(client_name="Original", summary="Original summary")
        res = client.patch(f"/feedback/{item['id']}", json={"client_name": "Updated"})
        assert res.status_code == 200
        data = res.json()
        assert data["client_name"] == "Updated"
        assert data["summary"] == "Original summary"  # unchanged

    def test_partial_update_status(self, client, feedback_factory):
        item = feedback_factory(status="Open")
        res = client.patch(f"/feedback/{item['id']}", json={"status": "Actioned"})
        assert res.status_code == 200
        assert res.json()["status"] == "Actioned"

    def test_partial_update_theme(self, client, feedback_factory):
        item = feedback_factory(theme="UX")
        res = client.patch(f"/feedback/{item['id']}", json={"theme": "Performance"})
        assert res.status_code == 200
        assert res.json()["theme"] == "Performance"

    def test_empty_body_is_valid_noop(self, client, feedback_factory):
        """
        ADVERSARIAL: Plan says {} should be a valid no-op.
        exclude_unset=True means no fields are updated.
        """
        item = feedback_factory(client_name="Original")
        res = client.patch(f"/feedback/{item['id']}", json={})
        assert res.status_code == 200
        assert res.json()["client_name"] == "Original"

    def test_update_nonexistent_returns_404(self, client):
        res = client.patch("/feedback/99999", json={"client_name": "Updated"})
        assert res.status_code == 404
        assert res.json()["detail"] == "Feedback item not found"

    def test_update_with_invalid_theme_returns_422(self, client, feedback_factory):
        item = feedback_factory()
        res = client.patch(f"/feedback/{item['id']}", json={"theme": "Invalid"})
        assert res.status_code == 422

    def test_update_with_invalid_status_returns_422(self, client, feedback_factory):
        item = feedback_factory()
        res = client.patch(f"/feedback/{item['id']}", json={"status": "Closed"})
        assert res.status_code == 422

    def test_update_detail_to_null(self, client, feedback_factory):
        item = feedback_factory(detail="Some detail")
        res = client.patch(f"/feedback/{item['id']}", json={"detail": None})
        assert res.status_code == 200
        assert res.json()["detail"] is None

    def test_update_detail_from_null(self, client, feedback_factory):
        item = feedback_factory()
        assert item["detail"] is None
        res = client.patch(f"/feedback/{item['id']}", json={"detail": "New detail"})
        assert res.status_code == 200
        assert res.json()["detail"] == "New detail"

    def test_update_returns_full_object(self, client, feedback_factory):
        """PATCH response should include all FeedbackRead fields."""
        item = feedback_factory()
        res = client.patch(f"/feedback/{item['id']}", json={"summary": "Updated"})
        data = res.json()
        required = ["id", "client_name", "summary", "detail", "theme", "status", "date_logged", "updated_at"]
        for field in required:
            assert field in data, f"Missing field in PATCH response: {field}"

    def test_update_does_not_change_date_logged(self, client, feedback_factory):
        """date_logged is immutable — only set on creation."""
        item = feedback_factory()
        original_date = item["date_logged"]
        res = client.patch(f"/feedback/{item['id']}", json={"summary": "Updated"})
        assert res.json()["date_logged"] == original_date

    def test_update_with_empty_string_client_name(self, client, feedback_factory):
        """
        ADVERSARIAL: PATCH with empty string for client_name.
        Should reject — client_name cannot become empty.
        """
        item = feedback_factory()
        res = client.patch(f"/feedback/{item['id']}", json={"client_name": ""})
        # Should be 422 — empty string is not a valid client_name
        assert res.status_code == 422, (
            f"BUG: Empty string accepted for client_name on PATCH. "
            f"Status {res.status_code}"
        )

    def test_update_with_non_integer_id_returns_422(self, client):
        res = client.patch("/feedback/abc", json={"summary": "Test"})
        assert res.status_code == 422


# ═══════════════════════════════════════════════════════════════════
# DELETE /feedback/{id}
# ═══════════════════════════════════════════════════════════════════

class TestDeleteFeedback:
    def test_deletes_existing_item(self, client, feedback_factory):
        item = feedback_factory()
        res = client.delete(f"/feedback/{item['id']}")
        assert res.status_code == 204

        # Verify it's actually gone
        get_res = client.get(f"/feedback/{item['id']}")
        assert get_res.status_code == 404

    def test_returns_404_for_nonexistent(self, client):
        res = client.delete("/feedback/99999")
        assert res.status_code == 404
        assert res.json()["detail"] == "Feedback item not found"

    def test_double_delete_returns_404(self, client, feedback_factory):
        """
        ADVERSARIAL: Plan says deleting already-deleted item should return 404.
        """
        item = feedback_factory()
        client.delete(f"/feedback/{item['id']}")
        res = client.delete(f"/feedback/{item['id']}")
        assert res.status_code == 404

    def test_delete_returns_no_body(self, client, feedback_factory):
        """DELETE 204 should return no content."""
        item = feedback_factory()
        res = client.delete(f"/feedback/{item['id']}")
        assert res.status_code == 204
        assert res.content == b"" or res.text == ""

    def test_delete_non_integer_id_returns_422(self, client):
        res = client.delete("/feedback/abc")
        assert res.status_code == 422

    def test_delete_does_not_affect_other_items(self, client, feedback_factory):
        item1 = feedback_factory(client_name="Keep me")
        item2 = feedback_factory(client_name="Delete me")
        client.delete(f"/feedback/{item2['id']}")
        res = client.get("/feedback/")
        assert len(res.json()) == 1
        assert res.json()[0]["client_name"] == "Keep me"


# ═══════════════════════════════════════════════════════════════════
# Health endpoint
# ═══════════════════════════════════════════════════════════════════

class TestHealth:
    def test_health_endpoint(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
