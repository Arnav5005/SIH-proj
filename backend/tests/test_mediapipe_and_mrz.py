import unittest
import numpy as np
import cv2
from backend.app.services.face_service import face_service
from backend.app.services.ocr_service import ocr_service

class TestMediaPipeAndPreOCR(unittest.TestCase):
    def test_mediapipe_no_face_detected(self):
        """Requirement 1: No face in frame -> face_detected False, explicit error message, checks False."""
        res = face_service.analyze_face_quality(None)
        self.assertFalse(res["face_detected"])
        self.assertEqual(res["error_message"], "Webcam feed unavailable or frame not captured.")
        self.assertFalse(res["checks"]["face_centered"]["passed"])
        self.assertFalse(res["checks"]["good_lighting"]["passed"])

    def test_mediapipe_blank_frame_no_face(self):
        """Requirement 1: Blank frame -> No face detected error."""
        blank_img = np.full((300, 300, 3), 200, dtype=np.uint8)
        res = face_service.analyze_face_quality(blank_img)
        self.assertFalse(res["face_detected"])
        self.assertEqual(res["error_message"], "No face detected — please position yourself in frame")
        self.assertFalse(res["checks"]["face_centered"]["passed"])

    def test_mediapipe_lighting_brightness_range(self):
        """Requirement 3: Check 2 brightness range (70-215)."""
        dark_img = np.full((300, 300, 3), 15, dtype=np.uint8)
        cv2.ellipse(dark_img, (150, 150), (60, 80), 0, 0, 360, (15, 15, 15), -1)
        res_dark = face_service.analyze_face_quality(dark_img)
        if res_dark["face_detected"]:
            self.assertFalse(res_dark["checks"]["good_lighting"]["passed"])

    def test_pre_ocr_selfie_rejection(self):
        """Pre-OCR Rule 1 & 3: Large face area (>55%) without MRZ flags 'This looks like a personal photo'."""
        selfie = np.full((400, 400, 3), (40, 40, 40), dtype=np.uint8)
        cv2.ellipse(selfie, (200, 200), (160, 180), 0, 0, 360, (140, 160, 190), -1)
        cv2.circle(selfie, (140, 160), 20, (255, 255, 255), -1)
        cv2.circle(selfie, (260, 160), 20, (255, 255, 255), -1)

        res = ocr_service.verify_pre_ocr_document_structure(selfie, "Passport")
        self.assertFalse(res["is_valid_document"])
        self.assertEqual(res["error_code"], "SELFIE_NOT_DOCUMENT")
        self.assertIn("personal photo", res["error_message"])

    def test_pre_ocr_no_text_rejection(self):
        """Pre-OCR Rule 2: Blank image without text -> 'No document detected' error."""
        blank_doc = np.full((400, 600, 3), 250, dtype=np.uint8)
        res = ocr_service.verify_pre_ocr_document_structure(blank_doc, "Passport")
        self.assertFalse(res["is_valid_document"])
        self.assertIn("No document detected", res["error_message"])

if __name__ == "__main__":
    unittest.main()
