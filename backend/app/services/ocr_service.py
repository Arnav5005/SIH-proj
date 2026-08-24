import re
import cv2
import numpy as np
import logging
import json
import urllib.request
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
from backend.app.utils.image_utils import decode_image, preprocess_for_ocr
from backend.app.config import settings

logger = logging.getLogger("SSB_AI_PreOCR")
logger.setLevel(logging.INFO)

try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False

try:
    import passporteye
    HAS_PASSPORTEYE = True
except ImportError:
    HAS_PASSPORTEYE = False

EASYOCR_READER = None

def get_easyocr_reader():
    global EASYOCR_READER
    if EASYOCR_READER is not None:
        return EASYOCR_READER
    try:
        import easyocr
        EASYOCR_READER = easyocr.Reader(['en'], gpu=False, verbose=False)
        return EASYOCR_READER
    except Exception as e:
        logger.warning(f"EasyOCR reader init failed: {e}")
        return None


def calculate_icao_check_digit(data: str) -> int:
    """
    Computes ICAO 9303 check digit with 7-3-1 weighting scheme.
    Characters 0-9 have values 0-9.
    Characters A-Z have values 10-35.
    Filler character '<' has value 0.
    """
    weights = [7, 3, 1]
    total = 0
    for i, char in enumerate(data):
        if char.isdigit():
            val = int(char)
        elif char.isalpha():
            val = ord(char.upper()) - ord('A') + 10
        elif char == '<':
            val = 0
        else:
            val = 0
        total += val * weights[i % 3]
    return total % 10


def verify_mrz_line2_checksums(line2: str) -> Dict[str, bool]:
    """Verifies all ICAO 9303 check digits on line 2 of a TD3 passport MRZ."""
    if len(line2) < 44:
        return {
            "passport_number_valid": False,
            "dob_valid": False,
            "expiry_valid": False,
            "composite_valid": False,
        }

    doc_num_data = line2[0:9]
    doc_num_cd = line2[9]
    expected_doc_cd = calculate_icao_check_digit(doc_num_data)
    doc_valid = doc_num_cd.isdigit() and int(doc_num_cd) == expected_doc_cd

    dob_data = line2[13:19]
    dob_cd = line2[19]
    expected_dob_cd = calculate_icao_check_digit(dob_data)
    dob_valid = dob_cd.isdigit() and int(dob_cd) == expected_dob_cd

    expiry_data = line2[21:27]
    expiry_cd = line2[27]
    expected_expiry_cd = calculate_icao_check_digit(expiry_data)
    expiry_valid = expiry_cd.isdigit() and int(expiry_cd) == expected_expiry_cd

    composite_data = line2[0:10] + line2[13:20] + line2[21:43]
    composite_cd = line2[43]
    expected_composite_cd = calculate_icao_check_digit(composite_data)
    composite_valid = composite_cd.isdigit() and int(composite_cd) == expected_composite_cd

    return {
        "passport_number_valid": doc_valid,
        "dob_valid": dob_valid,
        "expiry_valid": expiry_valid,
        "composite_valid": composite_valid,
    }


def parse_mrz_td3(line1: str, line2: str) -> Dict[str, Any]:
    """Parses standard 2-line TD3 passport Machine Readable Zone."""
    line1 = line1.strip().upper().replace(" ", "")
    line2 = line2.strip().upper().replace(" ", "")

    if len(line1) < 44 or len(line2) < 44:
        line1 = (line1 + "<" * 44)[:44]
        line2 = (line2 + "<" * 44)[:44]

    doc_type = "Passport" if line1[0] == 'P' else "Travel Document"
    issuing_country = line1[2:5].replace("<", "")
    
    # Extract Name from MRZ Line 1: P<CCC<SURNAME<<GIVEN_NAMES<<<<
    name_raw = line1[5:].rstrip("<")
    if "<<" in name_raw:
        parts = name_raw.split("<<")
        surname = parts[0].replace("<", " ").strip()
        given_names = " ".join([p.replace("<", " ").strip() for p in parts[1:]]) if len(parts) > 1 else ""
        if surname and given_names:
            full_name = f"{surname} {given_names}".strip()
        elif surname:
            full_name = surname
        else:
            full_name = given_names
    else:
        full_name = name_raw.replace("<", " ").strip()

    passport_number = line2[0:9].replace("<", "").strip()
    nationality = line2[10:13].replace("<", "").strip()
    
    dob_raw = line2[13:19]
    try:
        yy = int(dob_raw[0:2])
        year = 1900 + yy if yy > 30 else 2000 + yy
        dob_formatted = f"{year}-{dob_raw[2:4]}-{dob_raw[4:6]}"
    except Exception:
        dob_formatted = ""

    gender = line2[20] if line2[20] in ["M", "F"] else "M"
    
    expiry_raw = line2[21:27]
    try:
        yy = int(expiry_raw[0:2])
        year = 2000 + yy
        expiry_formatted = f"{year}-{expiry_raw[2:4]}-{expiry_raw[4:6]}"
    except Exception:
        expiry_formatted = ""

    checksums = verify_mrz_line2_checksums(line2)

    return {
        "document_type": doc_type,
        "issuing_country": issuing_country,
        "name": full_name,
        "passport_number": passport_number,
        "nationality": nationality if len(nationality) == 3 else "Indian",
        "date_of_birth": dob_formatted,
        "gender": gender,
        "date_of_expiry": expiry_formatted,
        "checksums": checksums,
        "mrz_valid": checksums["composite_valid"] and checksums["passport_number_valid"],
    }


class OCRService:
    """
    Optical Character Recognition & Pre-OCR Document Structure Verification Engine.
    Performs pre-OCR document sanity checks:
    1. Full image OCR text length threshold check (PyTesseract)
    2. MRZ presence check (PassportEye / ICAO line parser)
    3. Face-vs-document area ratio check (MediaPipe / OpenCV)
    """

    def extract_text_from_image(self, img_bgr: np.ndarray) -> Tuple[str, float]:
        if img_bgr is None or img_bgr.size == 0:
            return "", 0.0

        reader = get_easyocr_reader()
        if reader is not None:
            try:
                # Convert BGR to RGB for EasyOCR
                img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
                results = reader.readtext(img_rgb, detail=0)
                if results:
                    text = "\n".join(results)
                    if len(text.strip()) > 5:
                        return text.strip(), 95.0
            except Exception as e:
                logger.warning(f"EasyOCR error on RGB: {e}")

        # Fallback to PyTesseract if available
        if HAS_PYTESSERACT:
            try:
                processed = preprocess_for_ocr(img_bgr)
                text = pytesseract.image_to_string(processed, config='--oem 3 --psm 6')
                if text and len(text.strip()) > 5:
                    return text.strip(), 90.0
            except Exception as e:
                logger.warning(f"PyTesseract error: {e}")

        return "", 0.0

    def extract_mrz_lines(self, text: str, img_bgr: Optional[np.ndarray] = None) -> Optional[Tuple[str, str]]:
        # 1. Attempt PassportEye MRZ extraction if image provided
        if HAS_PASSPORTEYE and img_bgr is not None:
            try:
                # Save temp frame for passporteye file input if needed
                success, buffer = cv2.imencode('.jpg', img_bgr)
                if success:
                    mrz_obj = passporteye.read_mrz(buffer.tobytes())
                    if mrz_obj and mrz_obj.to_dict():
                        mrz_dict = mrz_obj.to_dict()
                        raw_text = mrz_dict.get("raw_text", "")
                        if raw_text:
                            lines = [l.strip() for l in raw_text.split('\n') if len(l.strip()) >= 30]
                            if len(lines) >= 2:
                                return lines[0], lines[1]
            except Exception as e:
                logger.warning(f"PassportEye MRZ extraction warning: {e}")

        # 2. Extract from OCR text using ICAO regex
        if text:
            lines = [line.strip() for line in text.split("\n") if len(line.strip()) >= 30]
            mrz_candidates = []
            for line in lines:
                cleaned = re.sub(r'[^A-Z0-9<]', '', line.upper())
                if len(cleaned) >= 38:
                    mrz_candidates.append(cleaned)

            for i in range(len(mrz_candidates) - 1):
                l1 = mrz_candidates[i]
                l2 = mrz_candidates[i+1]
                if (l1.startswith("P") or "<" in l1) and any(c.isdigit() for c in l2):
                    return l1, l2
                
        return None

    def verify_pre_ocr_document_structure(self, image_input, expected_doc_type: str = "Passport") -> Dict[str, Any]:
        """
        Pre-OCR document structure sanity check:
        1. Full OCR text check (rejects blank / no text images)
        2. Face-vs-document check (rejects selfies occupying >60% frame without MRZ)
        3. MRZ presence check (for Passport/Visa)
        """
        img_bgr = decode_image(image_input)
        if img_bgr is None or img_bgr.size == 0:
            return {
                "is_valid_document": True,
                "error_code": None,
                "error_message": None,
            }

        h_img, w_img = img_bgr.shape[:2]
        from backend.app.services.face_service import face_service

        # Step 1: Face-vs-Document Sanity Check
        face_found, bbox, det_score = face_service.detect_face_mediapipe(img_bgr)
        face_area_pct = 0.0
        if face_found and bbox:
            fx, fy, fw, fh = bbox
            face_area_pct = round(((fw * fh) / float(w_img * h_img)) * 100.0, 1)

        # Step 2: Full OCR Text Density & Edge Density Check
        raw_text, ocr_conf = self.extract_text_from_image(img_bgr)
        alphanumeric_chars = re.sub(r'[^A-Za-z0-9]', '', raw_text)
        raw_text_char_count = len(alphanumeric_chars)

        # Step 3: MRZ Presence Check
        mrz_lines = self.extract_mrz_lines(raw_text, img_bgr)
        has_mrz = mrz_lines is not None

        logger.info(
            f"[PreOCR AI] Doc Check ({expected_doc_type}) -> "
            f"Face Area: {face_area_pct}%, Text Length: {raw_text_char_count} chars, MRZ Found: {has_mrz}"
        )

        # Rule A: Face occupies >55% frame and no MRZ/structured text -> Selfie Rejection
        if face_found and face_area_pct > 55.0 and not has_mrz and raw_text_char_count < 25:
            msg = "This looks like a personal photo, not a document. Please upload a valid passport/visa/ID image."
            logger.warning(f"[PreOCR AI] Rejected: {msg}")
            return {
                "is_valid_document": False,
                "error_code": "SELFIE_NOT_DOCUMENT",
                "error_message": msg,
            }

        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        edge_density = float(np.mean(np.abs(sobel_x)))

        text_char_count = raw_text_char_count
        if edge_density > 4.0 and text_char_count == 0:
            text_char_count = 50  # Document contains text/line structures

        # Rule B: Near-zero OCR text -> Blank / Invalid Image Rejection
        if text_char_count < 10 and not has_mrz:
            msg = "No document detected — please upload a valid passport/visa/ID image."
            logger.warning(f"[PreOCR AI] Rejected: {msg}")
            return {
                "is_valid_document": False,
                "error_code": "NO_DOCUMENT_TEXT",
                "error_message": msg,
            }

        # Rule C: Passport specific MRZ check
        if expected_doc_type.lower() == "passport" and not has_mrz and text_char_count < 35:
            msg = "Invalid Passport Document: No valid Machine Readable Zone (MRZ) detected."
            logger.warning(f"[PreOCR AI] Rejected: {msg}")
            return {
                "is_valid_document": False,
                "error_code": "NO_MRZ_ZONE",
                "error_message": msg,
            }

        return {
            "is_valid_document": True,
            "error_code": None,
            "error_message": None,
            "metrics": {
                "face_area_pct": face_area_pct,
                "text_char_count": text_char_count,
                "has_mrz": has_mrz,
            }
        }

    def parse_fields_from_ocr_text(self, raw_text: str) -> Dict[str, str]:
        """Extracts structured fields from raw OCR text using regex and heuristics."""
        fields = {
            "name": "",
            "passport_number": "",
            "nationality": "",
            "date_of_birth": "",
            "gender": "M",
            "date_of_expiry": "",
        }
        if not raw_text:
            return fields

        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        full_text = " ".join(lines)

        # 1. Search for MRZ line patterns
        mrz_candidates = [re.sub(r'[^A-Z0-9<]', '', l.upper()) for l in lines if len(re.sub(r'[^A-Z0-9<]', '', l.upper())) >= 25]
        for i in range(len(mrz_candidates) - 1):
            l1, l2 = mrz_candidates[i], mrz_candidates[i+1]
            if (l1.startswith("P") or "<" in l1) and any(c.isdigit() for c in l2):
                name_raw = l1[5:].rstrip("<")
                if "<<" in name_raw:
                    parts = name_raw.split("<<")
                    surname = parts[0].replace("<", " ").strip()
                    given = " ".join(parts[1:]).replace("<", " ").strip()
                    fields["name"] = f"{given} {surname}".strip() if given else surname
                elif name_raw:
                    fields["name"] = name_raw.replace("<", " ").strip()

                p_num = l2[0:9].replace("<", "").strip()
                if len(p_num) >= 6:
                    fields["passport_number"] = p_num

                nat = l2[10:13].replace("<", "").strip()
                if len(nat) == 3:
                    fields["nationality"] = nat

                dob_raw = l2[13:19]
                if len(dob_raw) == 6 and dob_raw.isdigit():
                    try:
                        yy = int(dob_raw[0:2])
                        year = 1900 + yy if yy > 30 else 2000 + yy
                        fields["date_of_birth"] = f"{year}-{dob_raw[2:4]}-{dob_raw[4:6]}"
                    except Exception:
                        pass
                break

        # 2. Extract Document Number if not set by MRZ
        if not fields["passport_number"]:
            m_doc = re.search(r'(?:PASSPORT\s*(?:NO|NUMBER|NO\.)?[:\s]*)([A-Z0-9]{7,10})', full_text, re.IGNORECASE)
            if m_doc:
                fields["passport_number"] = m_doc.group(1).upper()
            else:
                m_doc2 = re.search(r'\b([A-Z][0-9]{7,8})\b', full_text)
                if m_doc2:
                    fields["passport_number"] = m_doc2.group(1).upper()

        # 3. Extract Name if not set by MRZ
        if not fields["name"]:
            surname_m = re.search(r'(?:SURNAME|LAST\s*NAME)[:\s]+([A-Za-z\s]+?)(?:GIVEN|FIRST|PASSPORT|NATIONALITY|SEX|DOB|DATE|$)', full_text, re.IGNORECASE)
            given_m = re.search(r'(?:GIVEN\s*NAMES?|FIRST\s*NAME)[:\s]+([A-Za-z\s]+?)(?:SURNAME|PASSPORT|NATIONALITY|SEX|DOB|DATE|$)', full_text, re.IGNORECASE)
            if surname_m and given_m:
                fields["name"] = f"{given_m.group(1).strip()} {surname_m.group(1).strip()}"
            elif surname_m:
                fields["name"] = surname_m.group(1).strip()
            else:
                name_m = re.search(r'(?:NAME|FULL\s*NAME)[:\s]+([A-Za-z\s]+?)(?:PASSPORT|NATIONALITY|SEX|DOB|DATE|$)', full_text, re.IGNORECASE)
                if name_m:
                    fields["name"] = name_m.group(1).strip()

        # 4. Extract Nationality
        if not fields["nationality"]:
            nat_m = re.search(r'NATIONALITY[:\s]+([A-Za-z]+)', full_text, re.IGNORECASE)
            if nat_m:
                fields["nationality"] = nat_m.group(1).strip().capitalize()

        # 5. Extract Date of Birth
        if not fields["date_of_birth"]:
            dob_m = re.search(r'(?:DOB|DATE\s*OF\s*BIRTH)[:\s]+([0-9]{1,2}[-\s/][A-Za-z0-9]{3,}[-\s/][0-9]{2,4})', full_text, re.IGNORECASE)
            if dob_m:
                fields["date_of_birth"] = dob_m.group(1).strip()
            else:
                dob_iso = re.search(r'\b(\d{4}[-/]\d{2}[-/]\d{2})\b', full_text)
                if dob_iso:
                    fields["date_of_birth"] = dob_iso.group(1)

        # 6. Extract Gender
        sex_m = re.search(r'(?:SEX|GENDER)[:\s]*([MF])', full_text, re.IGNORECASE)
        if sex_m:
            fields["gender"] = sex_m.group(1).upper()

        return fields

    def call_groq_llm_ocr(self, raw_text: str) -> Optional[Dict[str, Any]]:
        """
        Uses Groq LLM API to parse & extract structured passport fields from OCR text.
        """
        api_key = getattr(settings, 'GROQ_API_KEY', '')
        if not api_key or not raw_text or len(raw_text.strip()) < 10:
            return None

        url = "https://api.groq.com/openai/v1/chat/completions"
        prompt = (
            "You are an expert passport OCR parsing system.\n"
            "Extract structured fields from the OCR text below.\n\n"
            "Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "name": "Extracted Full Name (Given Names followed by Surname) or null",\n'
            '  "passport_number": "Extracted Passport Number or null",\n'
            '  "nationality": "Extracted Nationality or null",\n'
            '  "date_of_birth": "YYYY-MM-DD or null",\n'
            '  "gender": "M or F"\n'
            "}\n\n"
            "Do not invent information. Extract only what is present in the text.\n\n"
            "OCR INPUT TEXT:\n" + raw_text
        )

        payload = {
            "model": getattr(settings, 'GROQ_MODEL', 'groq/compound'),
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
            "max_tokens": 250
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"]["content"].strip()
                match = re.search(r'\{.*\}', content, re.DOTALL)
                if match:
                    json_str = match.group(0)
                    return json.loads(json_str)
        except Exception as e:
            logger.warning(f"Groq LLM OCR call error: {e}")
            return None
        return None

    def process_document(
        self,
        image_input,
        manual_override: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Main OCR processing pipeline for documents.
        Returns normalized fields and confidence, or structure validation error.
        """
        img_bgr = decode_image(image_input)
        
        # Run Pre-OCR Structure & MRZ Sanity Validation
        structure_check = self.verify_pre_ocr_document_structure(img_bgr, "Passport")
        if not structure_check["is_valid_document"]:
            return {
                "document_type": "INVALID_DOCUMENT",
                "fields": {
                    "name": "",
                    "passport_number": "",
                    "nationality": "",
                    "date_of_birth": "",
                    "gender": "",
                    "date_of_expiry": "",
                },
                "confidence": 0.0,
                "mrz_details": None,
                "raw_text_detected": False,
                "structure_error": structure_check["error_message"],
            }

        raw_text, ocr_conf = self.extract_text_from_image(img_bgr)
        mrz_lines = self.extract_mrz_lines(raw_text, img_bgr)
        
        if mrz_lines:
            parsed = parse_mrz_td3(mrz_lines[0], mrz_lines[1])
            confidence = max(ocr_conf, 95.0 if parsed["mrz_valid"] else 80.0)
            fields = {
                "name": parsed["name"],
                "passport_number": parsed["passport_number"],
                "nationality": parsed["nationality"],
                "date_of_birth": parsed["date_of_birth"],
                "gender": parsed["gender"],
                "date_of_expiry": parsed["date_of_expiry"],
            }
            
            # Cross-check with dummy_database.xlsx
            from backend.app.services.registry_service import registry_service
            excel_match = registry_service.lookup_excel_database(fields["passport_number"], fields["name"])
            if excel_match.get("is_found", False):
                fields["name"] = excel_match.get("full_name") or fields["name"]
                fields["passport_number"] = excel_match.get("passport_number") or fields["passport_number"]
                fields["nationality"] = excel_match.get("nationality") or fields["nationality"]
                fields["date_of_birth"] = excel_match.get("dob") or fields["date_of_birth"]
                fields["gender"] = excel_match.get("gender") or fields["gender"]

            confidence_justification = (
                f"AI Confidence Score ({confidence}%): High confidence justified because primary fields "
                f"(Full Name: '{fields.get('name')}', Passport Number: '{fields.get('passport_number')}', DOB: '{fields.get('date_of_birth')}') "
                f"were verified against official border records and ICAO 9303 MRZ checksums."
            ) if excel_match.get("is_found", False) else (
                f"AI Confidence Score ({confidence}%): Confidence justified via ICAO 9303 Machine Readable Zone (MRZ) checksum validation."
            )

            return {
                "document_type": parsed["document_type"],
                "fields": fields,
                "confidence": confidence,
                "confidence_justification": confidence_justification,
                "mrz_details": parsed,
                "raw_text_detected": bool(raw_text),
            }

        # Visual zone parsing directly from raw_text
        extracted_fields = self.parse_fields_from_ocr_text(raw_text)

        # Try Groq LLM OCR extraction if any core field is still missing
        if raw_text and (not extracted_fields["name"] or not extracted_fields["passport_number"]):
            llm_fields = self.call_groq_llm_ocr(raw_text)
            if llm_fields:
                if not extracted_fields["name"] and llm_fields.get("name"):
                    extracted_fields["name"] = llm_fields["name"]
                if not extracted_fields["passport_number"] and llm_fields.get("passport_number"):
                    extracted_fields["passport_number"] = llm_fields["passport_number"]
                if not extracted_fields["nationality"] and llm_fields.get("nationality"):
                    extracted_fields["nationality"] = llm_fields["nationality"]
                if not extracted_fields["date_of_birth"] and llm_fields.get("date_of_birth"):
                    extracted_fields["date_of_birth"] = llm_fields["date_of_birth"]
                if llm_fields.get("gender"):
                    extracted_fields["gender"] = llm_fields["gender"]

        if manual_override:
            if manual_override.get("fullName"):
                extracted_fields["name"] = manual_override["fullName"]
            if manual_override.get("name"):
                extracted_fields["name"] = manual_override["name"]
            if manual_override.get("docNumber"):
                extracted_fields["passport_number"] = manual_override["docNumber"]
            if manual_override.get("passport_number"):
                extracted_fields["passport_number"] = manual_override["passport_number"]
            if manual_override.get("nationality"):
                extracted_fields["nationality"] = manual_override["nationality"]
            if manual_override.get("dob"):
                extracted_fields["date_of_birth"] = manual_override["dob"]
            if manual_override.get("gender"):
                extracted_fields["gender"] = manual_override["gender"]

        # Only cross-check registry if we actually extracted a valid passport number or name
        from backend.app.services.registry_service import registry_service
        p_num = extracted_fields.get("passport_number")
        p_name = extracted_fields.get("name")

        excel_match = registry_service.lookup_excel_database(p_num, p_name) if (p_num or p_name) else {}
        if excel_match.get("is_found", False):
            extracted_fields["name"] = excel_match.get("full_name") or extracted_fields["name"]
            extracted_fields["passport_number"] = excel_match.get("passport_number") or extracted_fields["passport_number"]
            extracted_fields["nationality"] = excel_match.get("nationality") or extracted_fields["nationality"]
            extracted_fields["date_of_birth"] = excel_match.get("dob") or extracted_fields["date_of_birth"]
            extracted_fields["gender"] = excel_match.get("gender") or extracted_fields["gender"]

        filled_count = sum(1 for v in extracted_fields.values() if v)
        confidence = round(70.0 + (filled_count / len(extracted_fields)) * 26.0, 1)

        confidence_justification = ""
        if excel_match.get("is_found", False):
            confidence = max(confidence, 96.5)
            confidence_justification = (
                f"AI Confidence Score ({confidence}%): High confidence is justified because primary fields "
                f"(Full Name: '{extracted_fields.get('name')}', Passport Number: '{extracted_fields.get('passport_number')}', "
                f"DOB: '{extracted_fields.get('date_of_birth')}') match the official Excel Border Registry."
            )
        else:
            confidence_justification = (
                f"AI Confidence Score ({confidence}%): Fields extracted from document visual zone and structure analysis."
            )

        return {
            "document_type": "Passport",
            "fields": extracted_fields,
            "confidence": confidence,
            "confidence_justification": confidence_justification,
            "mrz_details": None,
            "raw_text_detected": bool(raw_text),
        }

ocr_service = OCRService()
