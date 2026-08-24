import unittest
from backend.app.database.session import SessionLocal, init_db
from backend.app.services.registry_service import registry_service
from backend.app.services.validation_service import validation_service

class TestDatabaseAndRegistry(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_valid_passenger_lookup(self):
        """Tests that a valid registered passenger is found correctly."""
        passenger = registry_service.lookup_passenger(self.db, "Z8849102")
        self.assertIsNotNone(passenger)
        self.assertEqual(passenger.name, "Aditi Sharma")
        self.assertEqual(passenger.status, "ACTIVE")
        self.assertEqual(passenger.nationality, "Indian")

    def test_unknown_passenger_lookup(self):
        """Tests that an unregistered passport returns None without raising an exception."""
        passenger = registry_service.lookup_passenger(self.db, "P_NON_EXISTENT_999")
        self.assertIsNone(passenger)

    def test_flagged_watchlist_passenger(self):
        """Tests that a passenger on the watchlist is flagged."""
        hits = registry_service.check_watchlist(self.db, name="Mohd. Tariq", passport_number="P9028114")
        self.assertGreater(len(hits), 0)
        self.assertEqual(hits[0].severity, "CRITICAL")
        self.assertIn("#LOC-2026-904", hits[0].circular_ref)

    def test_visa_lookup_and_expiry(self):
        """Tests lookup of valid and expired visa records."""
        # Valid visa
        visa_valid = registry_service.lookup_visa_by_passport(self.db, "P8742031")
        self.assertIsNotNone(visa_valid)
        self.assertEqual(visa_valid.status, "ACTIVE")

        # Expired visa
        visa_expired = registry_service.lookup_visa_by_passport(self.db, "Z1904821")
        self.assertIsNotNone(visa_expired)
        self.assertEqual(visa_expired.status, "EXPIRED")

    def test_field_validation_matching(self):
        """Tests field-by-field validation with matching data."""
        passenger = registry_service.lookup_passenger(self.db, "Z8849102")
        ocr_fields = {
            "name": "Aditi Sharma",
            "passport_number": "Z8849102",
            "date_of_birth": "1994-06-14",
            "gender": "F",
            "nationality": "Indian",
        }
        res = validation_service.validate_document(ocr_fields, passenger)
        self.assertEqual(res["overall_status"], "MATCH")
        self.assertEqual(res["field_results"]["name"]["status"], "MATCH")
        self.assertEqual(res["field_results"]["passport_number"]["status"], "MATCH")
        self.assertEqual(res["field_results"]["date_of_birth"]["status"], "MATCH")

    def test_field_validation_mismatch_dob(self):
        """Tests field-by-field validation with mismatched DOB."""
        passenger = registry_service.lookup_passenger(self.db, "Z8921849")
        ocr_fields = {
            "name": "Priya Patel",
            "passport_number": "Z8921849",
            "date_of_birth": "2001-04-12",  # Registry is 1991-08-19
            "gender": "F",
            "nationality": "Indian",
        }
        res = validation_service.validate_document(ocr_fields, passenger)
        self.assertEqual(res["overall_status"], "MISMATCH")
        self.assertEqual(res["field_results"]["date_of_birth"]["status"], "MISMATCH")
        self.assertIn("DOB mismatch", str(res["discrepancies"]))

if __name__ == "__main__":
    unittest.main()
