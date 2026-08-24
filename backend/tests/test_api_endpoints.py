import unittest
from fastapi.testclient import TestClient
from backend.app.main import app

class TestAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        """GET /api/health returns OPERATIONAL."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "OPERATIONAL")

    def test_dashboard_stats(self):
        """GET /api/dashboard/stats returns real counts from DB."""
        res = self.client.get("/api/dashboard/stats")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("verified", data)
        self.assertIn("mismatched", data)
        self.assertIn("pending", data)
        self.assertIn("total", data)
        self.assertGreaterEqual(data["total"], 1)

    def test_get_screening_records(self):
        """GET /api/screenings returns list of records."""
        res = self.client.get("/api/screenings")
        self.assertEqual(res.status_code, 200)
        records = res.json()
        self.assertIsInstance(records, list)
        self.assertGreaterEqual(len(records), 1)

    def test_get_alerts(self):
        """GET /api/alerts returns force security alerts."""
        res = self.client.get("/api/alerts")
        self.assertEqual(res.status_code, 200)
        alerts = res.json()
        self.assertIsInstance(alerts, list)
        self.assertGreaterEqual(len(alerts), 1)

    def test_demo_cases(self):
        """GET /api/demo/cases returns 5 SIH scenarios."""
        res = self.client.get("/api/demo/cases")
        self.assertEqual(res.status_code, 200)
        cases = res.json()
        self.assertEqual(len(cases), 5)

    def test_run_demo_case_genuine(self):
        """POST /api/demo/cases/CASE_GENUINE/run executes full pipeline."""
        res = self.client.post("/api/demo/cases/CASE_GENUINE/run")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data["risk"]["status"], ["VERIFIED", "MISMATCH", "NEEDS_REVIEW"])
        self.assertIn("screening_id", data)

    def test_run_demo_case_tampered(self):
        """POST /api/demo/cases/CASE_TAMPERED/run executes full pipeline -> HIGH RISK."""
        res = self.client.post("/api/demo/cases/CASE_TAMPERED/run")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data["risk"]["status"], ["MISMATCH", "HIGH_RISK"])
        self.assertEqual(data["risk"]["level"], "HIGH")

    def test_officer_login(self):
        """POST /api/auth/login returns token and officer metadata."""
        res = self.client.post("/api/auth/login", json={
            "officer_id": "SSB-OFC-8821",
            "password": "secret_password",
            "role": "checkpoint",
            "checkpoint_id": "CHK-00184"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["officer"]["id"], "SSB-OFC-8821")

if __name__ == "__main__":
    unittest.main()
