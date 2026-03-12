"""
Contract tests — validate every endpoint response matches api-contract.yaml shapes.
If these fail, the implementation has drifted from the contract.
"""
import yaml
from pathlib import Path


def load_contract():
    path = Path(__file__).parent.parent.parent.parent / "api-contract.yaml"
    return yaml.safe_load(path.read_text())


class TestFeedbackReadContract:
    """FeedbackRead response must have all required fields from contract."""

    REQUIRED_FIELDS = [
        "id",
        "client_name",
        "summary",
        "theme",
        "status",
        "date_logged",
        "created_at",
        "updated_at",
    ]

    def test_create_response_has_all_required_fields(self, client):
        res = client.post(
            "/feedback/",
            json={
                "client_name": "Contract Corp",
                "summary": "Contract test",
                "theme": "UX",
                "status": "Open",
            },
        )
        assert res.status_code == 201
        data = res.json()
        for field in self.REQUIRED_FIELDS:
            assert field in data, f"Missing required field: {field}"

    def test_create_response_detail_field_nullable(self, client):
        """Contract: detail is string | null"""
        res = client.post(
            "/feedback/",
            json={
                "client_name": "Null Detail Corp",
                "summary": "No detail",
                "theme": "Support",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert "detail" in data
        assert data["detail"] is None

    def test_get_response_has_all_required_fields(self, client, feedback_factory):
        item = feedback_factory()
        res = client.get(f"/feedback/{item['id']}")
        assert res.status_code == 200
        data = res.json()
        for field in self.REQUIRED_FIELDS:
            assert field in data, f"Missing required field: {field}"

    def test_list_response_returns_array(self, client):
        res = client.get("/feedback/")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)

    def test_list_response_items_have_all_required_fields(self, client, feedback_factory):
        feedback_factory()
        res = client.get("/feedback/")
        data = res.json()
        assert len(data) > 0
        for field in self.REQUIRED_FIELDS:
            assert field in data[0], f"Missing required field in list item: {field}"

    def test_update_response_has_all_required_fields(self, client, feedback_factory):
        item = feedback_factory()
        res = client.patch(f"/feedback/{item['id']}", json={"summary": "Updated"})
        assert res.status_code == 200
        data = res.json()
        for field in self.REQUIRED_FIELDS:
            assert field in data, f"Missing required field: {field}"

    def test_delete_returns_204_no_content(self, client, feedback_factory):
        """Contract: DELETE returns 204 with null body"""
        item = feedback_factory()
        res = client.delete(f"/feedback/{item['id']}")
        assert res.status_code == 204

    def test_404_response_has_detail_field(self, client):
        """Contract: 404 body is { detail: "Feedback item not found" }"""
        res = client.get("/feedback/99999")
        assert res.status_code == 404
        data = res.json()
        assert "detail" in data
        assert data["detail"] == "Feedback item not found"


class TestEnumContractValues:
    """Verify enum values match contract exactly."""

    CONTRACT_THEMES = ["UX", "Performance", "Support", "Pricing", "Communication"]
    CONTRACT_STATUSES = ["Open", "In Progress", "Actioned"]

    def test_all_contract_themes_accepted(self, client):
        for theme in self.CONTRACT_THEMES:
            res = client.post(
                "/feedback/",
                json={
                    "client_name": f"Theme Test {theme}",
                    "summary": f"Testing {theme}",
                    "theme": theme,
                },
            )
            assert res.status_code == 201, f"Theme '{theme}' rejected: {res.text}"
            assert res.json()["theme"] == theme

    def test_all_contract_statuses_accepted(self, client):
        for status in self.CONTRACT_STATUSES:
            res = client.post(
                "/feedback/",
                json={
                    "client_name": "Status Test",
                    "summary": f"Testing {status}",
                    "theme": "UX",
                    "status": status,
                },
            )
            assert res.status_code == 201, f"Status '{status}' rejected: {res.text}"
            assert res.json()["status"] == status

    def test_invalid_theme_rejected(self, client):
        res = client.post(
            "/feedback/",
            json={
                "client_name": "Bad Theme",
                "summary": "Invalid",
                "theme": "NotATheme",
            },
        )
        assert res.status_code == 422

    def test_invalid_status_rejected(self, client):
        res = client.post(
            "/feedback/",
            json={
                "client_name": "Bad Status",
                "summary": "Invalid",
                "theme": "UX",
                "status": "Closed",
            },
        )
        assert res.status_code == 422


class TestStatusCodeContract:
    """Verify all documented status codes are returned correctly."""

    def test_list_returns_200(self, client):
        res = client.get("/feedback/")
        assert res.status_code == 200

    def test_get_returns_200(self, client, feedback_factory):
        item = feedback_factory()
        res = client.get(f"/feedback/{item['id']}")
        assert res.status_code == 200

    def test_get_returns_404_for_missing(self, client):
        res = client.get("/feedback/99999")
        assert res.status_code == 404

    def test_create_returns_201(self, client):
        res = client.post(
            "/feedback/",
            json={
                "client_name": "Test",
                "summary": "Test",
                "theme": "UX",
            },
        )
        assert res.status_code == 201

    def test_create_returns_422_on_validation_error(self, client):
        res = client.post("/feedback/", json={})
        assert res.status_code == 422

    def test_update_returns_200(self, client, feedback_factory):
        item = feedback_factory()
        res = client.patch(f"/feedback/{item['id']}", json={"summary": "Updated"})
        assert res.status_code == 200

    def test_update_returns_404_for_missing(self, client):
        res = client.patch("/feedback/99999", json={"summary": "Updated"})
        assert res.status_code == 404

    def test_delete_returns_204(self, client, feedback_factory):
        item = feedback_factory()
        res = client.delete(f"/feedback/{item['id']}")
        assert res.status_code == 204

    def test_delete_returns_404_for_missing(self, client):
        res = client.delete("/feedback/99999")
        assert res.status_code == 404
