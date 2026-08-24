from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.app.database.models import Passenger, Visa

def normalize_date(date_str: Optional[str]) -> Optional[str]:
    """Normalizes dates from various formats (YYYY-MM-DD, DD-MM-YYYY, DD Mon YYYY) into YYYY-MM-DD."""
    if not date_str:
        return None
    cleaned = date_str.strip()
    
    formats = [
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%d %b %Y",
        "%d %B %Y",
        "%b %d, %Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(cleaned, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return cleaned


def normalize_text(text: Optional[str]) -> str:
    """Removes extra whitespace and punctuation for comparison."""
    if not text:
        return ""
    import re
    return re.sub(r"[^A-Z0-9]", "", text.upper())


class ValidationService:
    """
    Validates extracted document OCR fields against the synthetic border registry.
    Performs field-by-field verification and checks document expiration and visa status.
    """

    def validate_document(
        self,
        ocr_fields: Dict[str, Any],
        registry_passenger: Optional[Passenger],
        registry_visa: Optional[Visa] = None,
        visa_input_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compares OCR extracted fields with authorized registry data.
        Returns field-by-field validation results and an overall validation summary.
        """
        now = datetime.now()
        field_results: Dict[str, Dict[str, Any]] = {}
        mismatches: List[str] = []
        is_valid = True

        if not registry_passenger:
            return {
                "overall_status": "NOT_FOUND",
                "is_registered": False,
                "field_results": {
                    "passport_number": {
                        "document": ocr_fields.get("passport_number", ""),
                        "registry": "NOT_FOUND",
                        "status": "NOT_FOUND",
                        "note": "Identity document number not found in authorized border registry (Manual Review Required).",
                    }
                },
                "discrepancies": ["Document not found in central registry"],
                "summary": "UNREGISTERED_SUBJECT",
            }

        # 1. Name Check
        doc_name = ocr_fields.get("name", "")
        reg_name = registry_passenger.name
        name_match = normalize_text(doc_name) == normalize_text(reg_name)
        if not name_match and doc_name and reg_name:
            # Check subset (e.g. given name + surname order)
            doc_words = set(doc_name.upper().split())
            reg_words = set(reg_name.upper().split())
            if doc_words == reg_words or (len(doc_words.intersection(reg_words)) >= 2):
                name_match = True

        field_results["name"] = {
            "document": doc_name,
            "registry": reg_name,
            "status": "MATCH" if name_match else "MISMATCH",
            "note": "Name matches registry record." if name_match else f"Name mismatch: Document='{doc_name}', Registry='{reg_name}'",
        }
        if not name_match:
            mismatches.append(f"Name mismatch (Doc: {doc_name} != Reg: {reg_name})")
            is_valid = False

        # 2. Passport Number Check
        doc_pnum = ocr_fields.get("passport_number", "")
        reg_pnum = registry_passenger.passport_number
        pnum_match = normalize_text(doc_pnum) == normalize_text(reg_pnum)
        field_results["passport_number"] = {
            "document": doc_pnum,
            "registry": reg_pnum,
            "status": "MATCH" if pnum_match else "MISMATCH",
            "note": "Passport number verified in registry." if pnum_match else "Passport number does not match record.",
        }
        if not pnum_match:
            mismatches.append(f"Passport number mismatch ({doc_pnum} != {reg_pnum})")
            is_valid = False

        # 3. Date of Birth Check
        doc_dob = normalize_date(ocr_fields.get("date_of_birth", ""))
        reg_dob = normalize_date(registry_passenger.dob)
        dob_match = doc_dob == reg_dob if (doc_dob and reg_dob) else True
        field_results["date_of_birth"] = {
            "document": doc_dob or ocr_fields.get("date_of_birth", ""),
            "registry": reg_dob or registry_passenger.dob,
            "status": "MATCH" if dob_match else "MISMATCH",
            "note": "Date of birth matches registry." if dob_match else f"DOB mismatch: Document='{doc_dob}', Registry='{reg_dob}'",
        }
        if not dob_match:
            mismatches.append(f"DOB mismatch (Doc: {doc_dob} != Reg: {reg_dob})")
            is_valid = False

        # 4. Nationality Check
        doc_nat = ocr_fields.get("nationality", "")
        reg_nat = registry_passenger.nationality
        nat_match = normalize_text(doc_nat) == normalize_text(reg_nat) if (doc_nat and reg_nat) else True
        field_results["nationality"] = {
            "document": doc_nat,
            "registry": reg_nat,
            "status": "MATCH" if nat_match else "MISMATCH",
            "note": "Nationality confirmed." if nat_match else f"Nationality mismatch: Document='{doc_nat}', Registry='{reg_nat}'",
        }
        if not nat_match:
            mismatches.append(f"Nationality mismatch ({doc_nat} != {reg_nat})")
            is_valid = False

        # 5. Gender Check
        doc_gen = ocr_fields.get("gender", "")
        reg_gen = registry_passenger.gender
        gen_match = doc_gen.upper()[0] == reg_gen.upper()[0] if (doc_gen and reg_gen) else True
        field_results["gender"] = {
            "document": doc_gen,
            "registry": reg_gen,
            "status": "MATCH" if gen_match else "MISMATCH",
            "note": "Gender verified." if gen_match else "Gender code mismatch.",
        }
        if not gen_match:
            mismatches.append(f"Gender mismatch ({doc_gen} != {reg_gen})")
            is_valid = False

        # 6. Passport Expiry Check
        doc_expiry = normalize_date(ocr_fields.get("date_of_expiry", "")) or normalize_date(registry_passenger.passport_expiry_date)
        is_expired = False
        if doc_expiry:
            try:
                exp_dt = datetime.strptime(doc_expiry, "%Y-%m-%d")
                if exp_dt < now:
                    is_expired = True
            except Exception:
                pass

        field_results["document_expiry"] = {
            "expiry_date": doc_expiry,
            "status": "EXPIRED" if is_expired else "VALID",
            "note": "Document has expired!" if is_expired else "Document is within validity period.",
        }
        if is_expired:
            mismatches.append(f"Document expired on {doc_expiry}")
            is_valid = False

        # 7. Passport Status Check
        reg_status = registry_passenger.status
        is_status_active = reg_status == "ACTIVE"
        field_results["passport_status"] = {
            "status": reg_status,
            "is_active": is_status_active,
            "note": "Registry status is ACTIVE." if is_status_active else f"Passport registry status is {reg_status}!",
        }
        if not is_status_active:
            mismatches.append(f"Passport status is {reg_status}")
            is_valid = False

        # 8. Visa Validation (if international transit / visa provided)
        if registry_visa or visa_input_number:
            visa_to_check = registry_visa
            visa_status = "MATCH"
            visa_note = "Valid visa found and verified."
            
            if not visa_to_check and visa_input_number:
                visa_status = "NOT_FOUND"
                visa_note = f"Visa number {visa_input_number} not found in database."
                mismatches.append(visa_note)
                is_valid = False
            elif visa_to_check:
                # Check relationship
                if normalize_text(visa_to_check.passport_number) != normalize_text(registry_passenger.passport_number):
                    visa_status = "MISMATCH"
                    visa_note = f"Visa belongs to passport '{visa_to_check.passport_number}', not '{registry_passenger.passport_number}'!"
                    mismatches.append(visa_note)
                    is_valid = False
                
                # Check visa expiry
                visa_until = normalize_date(visa_to_check.valid_until)
                if visa_until:
                    try:
                        v_exp = datetime.strptime(visa_until, "%Y-%m-%d")
                        if v_exp < now:
                            visa_status = "EXPIRED"
                            visa_note = f"Visa expired on {visa_until}."
                            mismatches.append(visa_note)
                            is_valid = False
                    except Exception:
                        pass

                if visa_to_check.status != "ACTIVE":
                    visa_status = visa_to_check.status
                    visa_note = f"Visa status is {visa_to_check.status}."
                    mismatches.append(visa_note)
                    is_valid = False

            field_results["visa_validation"] = {
                "visa_number": visa_to_check.visa_number if visa_to_check else visa_input_number,
                "visa_type": visa_to_check.visa_type if visa_to_check else "N/A",
                "valid_until": visa_to_check.valid_until if visa_to_check else "N/A",
                "status": visa_status,
                "note": visa_note,
            }

        overall_status = "MATCH" if is_valid else ("EXPIRED" if is_expired and len(mismatches) == 1 else "MISMATCH")

        return {
            "overall_status": overall_status,
            "is_registered": True,
            "field_results": field_results,
            "discrepancies": mismatches,
            "passenger_id": registry_passenger.id,
            "summary": "ALL_FIELDS_MATCH" if is_valid else "FIELD_DISCREPANCY_DETECTED",
        }

validation_service = ValidationService()
