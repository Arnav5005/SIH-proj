import unittest
import numpy as np
import cv2
from backend.app.services.tampering_service import tampering_service
from backend.app.services.risk_engine import risk_engine
from backend.app.database.models import WatchlistEntry

class TestTamperingAndRiskEngine(unittest.TestCase):
    def test_ela_computation(self):
        """Tests Error Level Analysis on genuine vs spliced image."""
        genuine = np.full((150, 150, 3), 200, dtype=np.uint8)
        score_gen, _ = tampering_service.compute_error_level_analysis(genuine)
        self.assertLess(score_gen, 40.0)

        # Create tampered image by pasting highly saturated block with edge discontinuity
        spliced = genuine.copy()
        spliced[40:90, 40:90] = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
        score_spliced, _ = tampering_service.compute_error_level_analysis(spliced)
        self.assertGreater(score_spliced, score_gen)

    def test_risk_engine_genuine_case(self):
        """CASE 1 Genuine: Valid doc, matching face, clean watchlist -> LOW RISK."""
        res = risk_engine.evaluate(
            watchlist_matches=[],
            validation_results={"overall_status": "MATCH", "is_registered": True, "discrepancies": []},
            tampering_results={"tampering_detected": False, "tampering_score": 10.0, "hologram_detected": True},
            face_results={"match": True, "similarity_score": 98.5, "status": "PASSED"}
        )
        self.assertEqual(res["level"], "LOW")
        self.assertEqual(res["status"], "VERIFIED")
        self.assertLess(res["score"], 40)

    def test_risk_engine_tampered_case(self):
        """CASE 2 Tampered: High tampering score, ELA anomaly -> HIGH RISK / MISMATCH."""
        res = risk_engine.evaluate(
            watchlist_matches=[],
            validation_results={"overall_status": "MISMATCH", "is_registered": True, "discrepancies": ["DOB mismatch"]},
            tampering_results={"tampering_detected": True, "tampering_score": 85.0, "hologram_detected": False, "anomalies": ["ELA anomaly"]},
            face_results={"match": True, "similarity_score": 90.0, "status": "PASSED"}
        )
        self.assertEqual(res["level"], "HIGH")
        self.assertIn(res["status"], ["MISMATCH", "HIGH_RISK"])
        self.assertGreaterEqual(res["score"], 65)

    def test_risk_engine_impersonation_case(self):
        """CASE 3 Impersonation: Face mismatch -> HIGH RISK / MISMATCH."""
        res = risk_engine.evaluate(
            watchlist_matches=[],
            validation_results={"overall_status": "MATCH", "is_registered": True, "discrepancies": []},
            tampering_results={"tampering_detected": False, "tampering_score": 12.0, "hologram_detected": True},
            face_results={"match": False, "similarity_score": 32.0, "status": "FAILED"}
        )
        self.assertEqual(res["level"], "HIGH")
        self.assertEqual(res["status"], "MISMATCH")
        self.assertGreaterEqual(res["score"], 65)

    def test_risk_engine_expired_document(self):
        """CASE 4 Expired Document: Valid identity but expired permit -> MEDIUM RISK / NEEDS_REVIEW."""
        res = risk_engine.evaluate(
            watchlist_matches=[],
            validation_results={"overall_status": "EXPIRED", "is_registered": True, "discrepancies": ["Document expired on 2023-01-01"]},
            tampering_results={"tampering_detected": False, "tampering_score": 15.0, "hologram_detected": True},
            face_results={"match": True, "similarity_score": 95.0, "status": "PASSED"}
        )
        self.assertIn(res["level"], ["MEDIUM", "HIGH"])
        self.assertEqual(res["status"], "NEEDS_REVIEW")

    def test_risk_engine_watchlist_hit(self):
        """CASE 5 Watchlist Hit: LOC Circular -> HIGH RISK / HIGH_RISK."""
        mock_hit = WatchlistEntry(
            id="WTL-904",
            name="Mohd. Tariq",
            circular_ref="#LOC-2026-904",
            severity="CRITICAL",
            description="Wanted subject"
        )
        res = risk_engine.evaluate(
            watchlist_matches=[mock_hit],
            validation_results={"overall_status": "MATCH", "is_registered": True, "discrepancies": []},
            tampering_results={"tampering_detected": False, "tampering_score": 10.0, "hologram_detected": True},
            face_results={"match": True, "similarity_score": 98.0, "status": "PASSED"}
        )
        self.assertEqual(res["level"], "HIGH")
        self.assertEqual(res["status"], "HIGH_RISK")
        self.assertGreaterEqual(res["score"], 75)

if __name__ == "__main__":
    unittest.main()
