import unittest
import numpy as np
import cv2
from backend.app.services.face_service import face_service
from backend.app.services.ocr_service import ocr_service

class TestAIValidationAndQuality(unittest.TestCase):
    def test_face_quality_analysis_no_image(self):
        """Tests quality analysis when no image is provided."""
        res = face_service.analyze_face_quality(None)
        self.assertFalse(res["face_detected"])
        self.assertFalse(res["overall_valid"])

    def test_face_quality_analysis_synthetic_centered_face(self):
        """Tests quality analysis on centered synthetic face."""
        img = np.full((300, 300, 3), (40, 40, 40), dtype=np.uint8)
        # Face Oval
        cv2.ellipse(img, (150, 150), (60, 80), 0, 0, 360, (140, 160, 190), -1)
        # Eyes
        cv2.circle(img, (120, 130), 10, (255, 255, 255), -1)
        cv2.circle(img, (180, 130), 10, (255, 255, 255), -1)

        res = face_service.analyze_face_quality(img)
        self.assertTrue(res["face_detected"])
        self.assertIn("checks", res)
        self.assertIn("face_centered", res["checks"])
        self.assertIn("good_lighting", res["checks"])

    def test_document_classification_selfie_rejection(self):
        """Tests that uploading a selfie image for Passport/ID returns INVALID_DOCUMENT_TYPE."""
        selfie_img = np.full((400, 400, 3), (40, 40, 40), dtype=np.uint8)
        cv2.ellipse(selfie_img, (200, 200), (160, 180), 0, 0, 360, (140, 160, 190), -1)

        res = ocr_service.verify_pre_ocr_document_structure(selfie_img, "Passport")
        self.assertFalse(res["is_valid_document"])
        self.assertEqual(res["error_code"], "SELFIE_NOT_DOCUMENT")
        self.assertIn("personal photo", res["error_message"])

    def test_document_classification_valid_doc(self):
        """Tests that a high text density document image passes document classification."""
        doc_img = np.full((400, 600, 3), (240, 240, 240), dtype=np.uint8)
        cv2.rectangle(doc_img, (20, 20), (580, 380), (50, 50, 50), 2)
        for y in range(50, 350, 25):
            cv2.line(doc_img, (40, y), (560, y), (20, 20, 20), 2)

        res = ocr_service.verify_pre_ocr_document_structure(doc_img, "Passport")
        self.assertTrue(res["is_valid_document"])

if __name__ == "__main__":
    unittest.main()
