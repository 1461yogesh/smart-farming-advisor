"""
test_api.py
===========
Basic API tests using pytest + FastAPI TestClient.

Run from backend/ directory:
    pytest tests/ -v
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Fixture: valid prediction payload
# ---------------------------------------------------------------------------
@pytest.fixture
def valid_payload():
    return {
        "N": 90.0,
        "P": 42.0,
        "K": 43.0,
        "temperature": 20.879744,
        "humidity": 82.002744,
        "ph": 6.502985,
        "rainfall": 202.935536,
        "area": 2.5,
        "fertilizer": 100.0,
        "pesticide": 10.0,
    }


# ---------------------------------------------------------------------------
# Health / root tests
# ---------------------------------------------------------------------------
class TestHealthEndpoints:
    def test_root_returns_200(self):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_root_contains_service_key(self):
        resp = client.get("/")
        body = resp.json()
        assert "service" in body
        assert body["service"] == "Smart Farming Advisor API"

    def test_health_returns_200(self):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_has_status_ok(self):
        resp = client.get("/health")
        body = resp.json()
        assert body["status"] == "ok"

    def test_health_has_models_loaded_key(self):
        resp = client.get("/health")
        body = resp.json()
        assert "models_loaded" in body


# ---------------------------------------------------------------------------
# Validation tests (no trained models required)
# ---------------------------------------------------------------------------
class TestValidation:
    def test_missing_field_returns_422(self):
        # Remove required field 'area'
        payload = {
            "N": 90.0, "P": 42.0, "K": 43.0,
            "temperature": 20.0, "humidity": 80.0,
            "ph": 6.5, "rainfall": 200.0,
            # area intentionally omitted
            "fertilizer": 100.0, "pesticide": 10.0,
        }
        resp = client.post("/predict", json=payload)
        assert resp.status_code == 422

    def test_area_zero_returns_422(self, valid_payload):
        valid_payload["area"] = 0.0
        resp = client.post("/predict", json=valid_payload)
        assert resp.status_code == 422

    def test_area_negative_returns_422(self, valid_payload):
        valid_payload["area"] = -5.0
        resp = client.post("/predict", json=valid_payload)
        assert resp.status_code == 422

    def test_ph_out_of_range_returns_422(self, valid_payload):
        valid_payload["ph"] = 15.0
        resp = client.post("/predict", json=valid_payload)
        assert resp.status_code == 422

    def test_humidity_out_of_range_returns_422(self, valid_payload):
        valid_payload["humidity"] = 105.0
        resp = client.post("/predict", json=valid_payload)
        assert resp.status_code == 422

    def test_string_instead_of_number_returns_422(self, valid_payload):
        valid_payload["N"] = "high"
        resp = client.post("/predict", json=valid_payload)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Prediction tests (require trained models — skipped if not available)
# ---------------------------------------------------------------------------
class TestPrediction:
    def _models_available(self):
        """Return True only if models are loaded."""
        resp = client.get("/health")
        return resp.json().get("crop_model", False)

    def test_predict_returns_200_or_503(self, valid_payload):
        """Either 200 (models present) or 503 (models missing) is acceptable."""
        resp = client.post("/predict", json=valid_payload)
        assert resp.status_code in (200, 503)

    def test_predict_response_shape_when_models_loaded(self, valid_payload):
        resp = client.post("/predict", json=valid_payload)
        if resp.status_code == 503:
            pytest.skip("Models not trained yet — run python train_models.py first")

        assert resp.status_code == 200
        body = resp.json()

        # Required top-level keys
        for key in ["crop", "yield_per_acre", "total_yield",
                    "price_per_quintal", "total_cost", "estimated_profit", "units"]:
            assert key in body, f"Missing key: {key}"

        # crop must be a non-empty string
        assert isinstance(body["crop"], str) and len(body["crop"]) > 0

        # Numeric fields must be non-negative
        for key in ["yield_per_acre", "total_yield", "price_per_quintal", "total_cost"]:
            assert body[key] >= 0, f"{key} should be >= 0"

        # Units sub-object
        units = body["units"]
        assert units["yield_per_acre"] == "quintal/acre"
        assert units["total_yield"] == "quintal"
        assert units["price_per_quintal"] == "₹/quintal"
        assert units["total_cost"] == "₹"
        assert units["estimated_profit"] == "₹"

    def test_predict_total_yield_equals_yield_times_area(self, valid_payload):
        resp = client.post("/predict", json=valid_payload)
        if resp.status_code == 503:
            pytest.skip("Models not trained yet")

        body = resp.json()
        area = valid_payload["area"]
        expected_total = round(body["yield_per_acre"] * area, 2)
        # Allow small floating-point tolerance
        assert abs(body["total_yield"] - expected_total) < 0.05
