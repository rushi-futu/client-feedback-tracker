"""
Contract tests: validate every endpoint's response shape matches api-contract.yaml.
If these fail, the contract and implementation have drifted.
"""

import yaml
from pathlib import Path


def load_contract():
    path = Path(__file__).parent.parent.parent.parent / "api-contract.yaml"
    return yaml.safe_load(path.read_text())


class TestFeedbackReadContract:
    """Every response returning FeedbackRead must have all required fields."""

    REQUIRED_FIELDS = ["id", "client_name", "summary", "theme", "status", "date_logged", "updated_at"]
    ALL_FIELDS = ["id", "client_name", "summary", "detail", "theme", "status", "date_logged", "updated_at"]

    def _assert_feedback_read_shape(self, data: dict):
        for field in self.REQUIRED_FIELDS:
            assert field in data, f"Missing required field '{field}' in FeedbackRead"
        # detail should be present (nullable)
        assert "detail" in data, "Field 'detail' missing from FeedbackRead"
        # No extra fields
        for key in data:
            assert key in self.ALL_FIELDS, f"Unexpected field '{key}' in FeedbackRead"

    def _assert_field_types(self, data: dict):
        assert isinstance(data["id"], int), f"id should be int, got {type(data['id'])}"
        assert isinstance(data["client_name"], str), f"client_name should be str"
        assert isinstance(data["summary"], str), f"summary should be str"
        assert data["detail"] is None or isinstance(data["detail"], str), "detail should be str|null"
        assert isinstance(data["theme"], str), f"theme should be str"
        assert isinstance(data["status"], str), f"status should be str"
        assert isinstance(data["date_logged"], str), f"date_logged should be str"
        assert isinstance(data["updated_at"], str), f"updated_at should be str"

    def test_create_response_shape(self, client):
        res = client.post("/feedback/", json={
            "client_name": "Contract Test",
            "summary": "Shape check",
            "theme": "UX",
        })
        assert res.status_code == 201
        data = res.json()
        self._assert_feedback_read_shape(data)
        self._assert_field_types(data)

    def test_get_response_shape(self, client, feedback_factory):
        item = feedback_factory()
        res = client.get(f"/feedback/{item['id']}")
        assert res.status_code == 200
        self._assert_feedback_read_shape(res.json())
        self._assert_field_types(res.json())

    def test_list_response_shape(self, client, feedback_factory):
        feedback_factory()
        feedback_factory()
        res = client.get("/feedback/")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        for item in data:
            self._assert_feedback_read_shape(item)
            self._assert_field_types(item)

    def test_update_response_shape(self, client, feedback_factory):
        item = feedback_factory()
        res = client.patch(f"/feedback/{item['id']}", json={"summary": "Updated"})
        assert res.status_code == 200
        self._assert_feedback_read_shape(res.json())
        self._assert_field_types(res.json())

    def test_empty_list_returns_array(self, client):
        """Contract: always returns 200, even if list is empty."""
        res = client.get("/feedback/")
        assert res.status_code == 200
        assert isinstance(res.json(), list)
        assert len(res.json()) == 0


class TestContractEnumValues:
    """Validate enum values match the contract exactly."""

    def test_theme_values_match_contract(self):
        contract = load_contract()
        contract_themes = contract["schemas"]["Theme"]["values"]
        expected = ["UX", "Performance", "Support", "Pricing", "Communication"]
        assert contract_themes == expected

    def test_status_values_match_contract(self):
        contract = load_contract()
        contract_statuses = contract["schemas"]["Status"]["values"]
        expected = ["Open", "In Progress", "Actioned"]
        assert contract_statuses == expected

    def test_theme_response_value_is_from_contract(self, client):
        """Each theme in a response must be one of the contract values."""
        valid_themes = {"UX", "Performance", "Support", "Pricing", "Communication"}
        for theme in valid_themes:
            res = client.post("/feedback/", json={
                "client_name": "Test",
                "summary": "Test",
                "theme": theme,
            })
            assert res.json()["theme"] in valid_themes

    def test_status_response_value_is_from_contract(self, client):
        valid_statuses = {"Open", "In Progress", "Actioned"}
        for status in valid_statuses:
            res = client.post("/feedback/", json={
                "client_name": "Test",
                "summary": "Test",
                "theme": "UX",
                "status": status,
            })
            assert res.json()["status"] in valid_statuses


class TestContractErrorShapes:
    """Validate error responses match contract shapes."""

    def test_404_has_detail_field(self, client):
        res = client.get("/feedback/99999")
        assert res.status_code == 404
        data = res.json()
        assert "detail" in data
        assert data["detail"] == "Feedback item not found"

    def test_delete_404_has_detail_field(self, client):
        res = client.delete("/feedback/99999")
        assert res.status_code == 404
        data = res.json()
        assert "detail" in data
        assert data["detail"] == "Feedback item not found"

    def test_patch_404_has_detail_field(self, client):
        res = client.patch("/feedback/99999", json={"summary": "test"})
        assert res.status_code == 404
        data = res.json()
        assert "detail" in data
        assert data["detail"] == "Feedback item not found"

    def test_422_is_valid_json(self, client):
        """422 responses must be valid JSON (Pydantic validation error format)."""
        res = client.post("/feedback/", json={})
        assert res.status_code == 422
        data = res.json()
        assert "detail" in data  # FastAPI/Pydantic validation error format


class TestContractEndpointStatus:
    """Validate each endpoint returns the correct status code per contract."""

    def test_list_returns_200(self, client):
        assert client.get("/feedback/").status_code == 200

    def test_create_returns_201(self, client):
        res = client.post("/feedback/", json={
            "client_name": "Test",
            "summary": "Test",
            "theme": "UX",
        })
        assert res.status_code == 201

    def test_get_returns_200(self, client, feedback_factory):
        item = feedback_factory()
        assert client.get(f"/feedback/{item['id']}").status_code == 200

    def test_update_returns_200(self, client, feedback_factory):
        item = feedback_factory()
        res = client.patch(f"/feedback/{item['id']}", json={"summary": "Updated"})
        assert res.status_code == 200

    def test_delete_returns_204(self, client, feedback_factory):
        item = feedback_factory()
        assert client.delete(f"/feedback/{item['id']}").status_code == 204
