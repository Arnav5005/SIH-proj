import unittest
from backend.app.services.ocr_service import (
    calculate_icao_check_digit,
    verify_mrz_line2_checksums,
    parse_mrz_td3,
    ocr_service,
)

class TestOCRAndMRZ(unittest.TestCase):
    def test_icao_check_digit_calculation(self):
        """Tests ICAO 9303 7-3-1 check digit algorithm with known official examples."""
        # Test document number: 'L898902C3' -> check digit '6'
        cd = calculate_icao_check_digit("L898902C3")
        self.assertEqual(cd, 6)

        # Test DOB: '740812' -> check digit '2'
        cd_dob = calculate_icao_check_digit("740812")
        self.assertEqual(cd_dob, 2)

        # Test expiry: '120415' -> check digit '9'
        cd_exp = calculate_icao_check_digit("120415")
        self.assertEqual(cd_exp, 9)

    def test_mrz_parsing_td3(self):
        """Tests full TD3 2-line MRZ parsing."""
        line1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
        line2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10"

        parsed = parse_mrz_td3(line1, line2)
        self.assertEqual(parsed["name"], "ERIKSSON ANNA MARIA")
        self.assertEqual(parsed["passport_number"], "L898902C3")
        self.assertEqual(parsed["gender"], "F")
        self.assertEqual(parsed["date_of_birth"], "1974-08-12")
        self.assertEqual(parsed["date_of_expiry"], "2012-04-15")
        self.assertTrue(parsed["mrz_valid"])

    def test_tampered_mrz_fails_check_digit(self):
        """Tests that an altered MRZ line2 fails checksum verification."""
        # Alter DOB from 740812 to 840812 without adjusting check digit (840812 has check digit 9 != 2)
        tampered_line2 = "L898902C36UTO8408122F1204159ZE184226B<<<<<10"
        checks = verify_mrz_line2_checksums(tampered_line2)
        self.assertFalse(checks["dob_valid"])
        self.assertFalse(checks["composite_valid"])

    def test_ocr_process_with_override(self):
        """Tests OCR processing with manual field inputs."""
        res = ocr_service.process_document(
            image_input=None,
            manual_override={
                "fullName": "Alex Morgan",
                "docNumber": "P8742031",
                "nationality": "United States",
                "dob": "1992-03-12",
            }
        )
        self.assertEqual(res["fields"]["name"], "Alex Morgan")
        self.assertEqual(res["fields"]["passport_number"], "P8742031")
        self.assertEqual(res["fields"]["nationality"], "United States")
        self.assertGreaterEqual(res["confidence"], 80.0)

if __name__ == "__main__":
    unittest.main()
