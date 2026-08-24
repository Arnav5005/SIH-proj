import unittest
import cv2
import numpy as np
from backend.app.services.face_service import face_service

def generate_synthetic_face_image(seed: int, eye_color: tuple, skin_tone: tuple) -> np.ndarray:
    """Generates a synthetic realistic facial structure image for biometric testing."""
    np.random.seed(seed)
    img = np.full((200, 200, 3), skin_tone, dtype=np.uint8)

    # Face Oval
    cv2.ellipse(img, (100, 100), (60, 80), 0, 0, 360, (skin_tone[0] - 20, skin_tone[1] - 20, skin_tone[2] - 20), -1)

    # Left Eye & Right Eye with distinct positions/colors
    cv2.circle(img, (75, 80), 12, (255, 255, 255), -1)
    cv2.circle(img, (75, 80), 6, eye_color, -1)

    cv2.circle(img, (125, 80), 12, (255, 255, 255), -1)
    cv2.circle(img, (125, 80), 6, eye_color, -1)

    # Nose
    cv2.line(img, (100, 85), (100, 115), (skin_tone[0] - 50, skin_tone[1] - 50, skin_tone[2] - 50), 3)

    # Mouth
    mouth_curve = np.random.randint(-10, 10)
    cv2.ellipse(img, (100, 140), (25, 12 + mouth_curve), 0, 0, 180, (50, 50, 160), -1)

    # Hair / Features
    cv2.ellipse(img, (100, 45), (65, 30), 0, 180, 360, (30 + seed * 10, 20, 20), -1)

    return img

class TestFaceVerification(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Generate 3 distinctly different synthetic persons
        cls.p1_face = generate_synthetic_face_image(seed=10, eye_color=(120, 80, 30), skin_tone=(180, 200, 225))
        cls.p1_live = np.clip(cls.p1_face.astype(np.int16) + np.random.randint(-5, 5, cls.p1_face.shape), 0, 255).astype(np.uint8)

        cls.p2_face = generate_synthetic_face_image(seed=45, eye_color=(30, 150, 50), skin_tone=(140, 170, 200))
        cls.p2_live = np.clip(cls.p2_face.astype(np.int16) + np.random.randint(-5, 5, cls.p2_face.shape), 0, 255).astype(np.uint8)

        cls.p3_face = generate_synthetic_face_image(seed=88, eye_color=(20, 20, 20), skin_tone=(200, 220, 245))
        cls.p3_live = np.clip(cls.p3_face.astype(np.int16) + np.random.randint(-5, 5, cls.p3_face.shape), 0, 255).astype(np.uint8)

        # Deterministic distinct 512D unit test vectors
        np.random.seed(10)
        v1 = np.random.randn(512).astype(np.float32)
        cls.emb1 = v1 / np.linalg.norm(v1)
        v1_live = cls.emb1 + np.random.randn(512).astype(np.float32) * 0.05
        cls.emb1_live = v1_live / np.linalg.norm(v1_live)

        np.random.seed(45)
        v2 = np.random.randn(512).astype(np.float32)
        cls.emb2 = v2 / np.linalg.norm(v2)
        v2_live = cls.emb2 + np.random.randn(512).astype(np.float32) * 0.05
        cls.emb2_live = v2_live / np.linalg.norm(v2_live)

        np.random.seed(88)
        v3 = np.random.randn(512).astype(np.float32)
        cls.emb3 = v3 / np.linalg.norm(v3)
        v3_live = cls.emb3 + np.random.randn(512).astype(np.float32) * 0.05
        cls.emb3_live = v3_live / np.linalg.norm(v3_live)

    def _mock_compute_embedding(self, face_bgr, precomputed_emb=None):
        mean_val = float(np.mean(face_bgr))
        if mean_val < 160.0:
            return self.emb2 if precomputed_emb is None else self.emb2_live
        elif 160.0 <= mean_val <= 184.0:
            return self.emb1 if precomputed_emb is None else self.emb1_live
        else:
            return self.emb3 if precomputed_emb is None else self.emb3_live

    def test_same_person_face_matches(self):
        """P001 vs P001 -> MATCH, P002 vs P002 -> MATCH, P003 vs P003 -> MATCH"""
        with unittest.mock.patch.object(face_service, 'compute_embedding', side_effect=self._mock_compute_embedding):
            res1 = face_service.verify_faces(self.p1_face, self.p1_live)
            self.assertTrue(res1["match"])
            self.assertEqual(res1["status"], "PASSED")
            self.assertGreaterEqual(res1["similarity_score"], 65.0)

            res2 = face_service.verify_faces(self.p2_face, self.p2_live)
            self.assertTrue(res2["match"])
            self.assertEqual(res2["status"], "PASSED")
            self.assertGreaterEqual(res2["similarity_score"], 65.0)

            res3 = face_service.verify_faces(self.p3_face, self.p3_live)
            self.assertTrue(res3["match"])
            self.assertEqual(res3["status"], "PASSED")
            self.assertGreaterEqual(res3["similarity_score"], 65.0)

    def test_different_person_face_mismatches(self):
        """P001 vs P002 -> MISMATCH, P001 vs P003 -> MISMATCH, P002 vs P003 -> MISMATCH"""
        with unittest.mock.patch.object(face_service, 'compute_embedding', side_effect=self._mock_compute_embedding):
            res_1_2 = face_service.verify_faces(self.p1_face, self.p2_face)
            self.assertFalse(res_1_2["match"])
            self.assertEqual(res_1_2["status"], "FAILED")
            self.assertLess(res_1_2["similarity_score"], 65.0)

            res_1_3 = face_service.verify_faces(self.p1_face, self.p3_face)
            self.assertFalse(res_1_3["match"])
            self.assertEqual(res_1_3["status"], "FAILED")
            self.assertLess(res_1_3["similarity_score"], 65.0)

            res_2_3 = face_service.verify_faces(self.p2_face, self.p3_face)
            self.assertFalse(res_2_3["match"])
            self.assertEqual(res_2_3["status"], "FAILED")
            self.assertLess(res_2_3["similarity_score"], 65.0)

if __name__ == "__main__":
    unittest.main()
