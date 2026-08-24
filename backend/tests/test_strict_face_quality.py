import unittest
import numpy as np
import cv2
from backend.app.services.face_service import face_service
from backend.app.services.ocr_service import ocr_service

class TestStrictFaceQuality(unittest.TestCase):
    def test_no_face_detected(self):
        res = face_service.analyze_face_quality(None)
        self.assertFalse(res["face_detected"])
        self.assertFalse(res["overall_valid"])

    def test_sideways_head_pose_rejection(self):
        """Tests that a sideways turned head pose is rejected."""
        side_img = np.full((300, 300, 3), (40, 40, 40), dtype=np.uint8)
        cv2.ellipse(side_img, (150, 150), (90, 60), 0, 0, 360, (140, 160, 190), -1)

        res = face_service.analyze_face_quality(side_img)
        if res["face_detected"]:
            self.assertFalse(res["checks"]["face_centered"]["passed"])

    def test_frontal_uncovered_face_passes(self):
        """Tests that a clean frontal face passes strictly."""
        img = np.full((400, 400, 3), (40, 40, 40), dtype=np.uint8)
        cv2.ellipse(img, (200, 200), (80, 105), 0, 0, 360, (140, 160, 190), -1)
        cv2.circle(img, (165, 175), 10, (255, 255, 255), -1)
        cv2.circle(img, (235, 175), 10, (255, 255, 255), -1)

        res = face_service.analyze_face_quality(img)
        self.assertTrue(res["face_detected"])
        self.assertTrue(res["checks"]["face_centered"]["passed"])
        self.assertTrue(res["checks"]["good_lighting"]["passed"])
        self.assertTrue(res["overall_valid"])

if __name__ == "__main__":
    unittest.main()
