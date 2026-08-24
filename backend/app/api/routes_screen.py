import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import ScreeningRecordModel
from backend.app.schemas.screening import ScreeningRequest, ScreeningResponse, RiskResult, UIRecord, SecurityChecks
from backend.app.services.ocr_service import ocr_service
from backend.app.services.registry_service import registry_service
from backend.app.services.validation_service import validation_service
from backend.app.services.tampering_service import tampering_service
from backend.app.services.face_service import face_service
from backend.app.services.risk_engine import risk_engine
import numpy as np

def sanitize_json_obj(obj):
    if isinstance(obj, dict):
        return {str(k): sanitize_json_obj(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [sanitize_json_obj(x) for x in obj]
    elif isinstance(obj, (np.bool_, bool)) or (hasattr(obj, 'dtype') and obj.dtype == bool):
        return bool(obj)
    elif isinstance(obj, (np.floating, np.float32, np.float64, float)):
        return float(obj)
    elif isinstance(obj, (np.integer, np.int32, np.int64, int)):
        return int(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif type(obj).__module__ == 'numpy' or type(obj).__name__.startswith('bool'):
        if 'bool' in type(obj).__name__.lower():
            return bool(obj)
        if 'int' in type(obj).__name__.lower():
            return int(obj)
        if 'float' in type(obj).__name__.lower():
            return float(obj)
    return obj

router = APIRouter(prefix="/api", tags=["Screening"])

@router.post("/screen", response_model=ScreeningResponse)
def screen_document(request: ScreeningRequest, db: Session = Depends(get_db)):
    """
    Main Orchestration Endpoint for Border Document & Biometric Identity Screening.
    Executes:
    1. OCR extraction (MRZ & Visual Inspection Zone)
    2. Registry Lookup in synthetic border database
    3. Document validation (field-by-field verification & expiration)
    4. Tampering & forgery forensic analysis (ELA, frequency noise, hologram)
    5. Biometric face verification (deep facial embeddings & cosine similarity)
    6. Explainable risk engine scoring & reasons synthesis
    7. Persistent audit logging in SQLite database
    """
    start_time = time.time()
    screening_id = f"VF-{int(time.time() * 1000) % 90000 + 10000}"
    timestamp_str = datetime.now().strftime("%I:%M %p")

    # Step 0: Mandatory Document & Live Face Enforcement
    if not request.passport_image:
        raise HTTPException(
            status_code=400,
            detail="Passport Document Required: You must upload or scan a valid Passport document before proceeding."
        )

    if not request.face_image:
        raise HTTPException(
            status_code=400,
            detail="Live Subject Photo Required: You must capture or upload a live face photo to compare against the passport photo."
        )

    # Step 1: OCR Extraction & Pre-OCR Structure Validation
    ocr_result = ocr_service.process_document(
        image_input=request.passport_image,
        manual_override=request.manual_fields
    )

    if not request.demo_case_id and (ocr_result.get("document_type") == "INVALID_DOCUMENT" or ocr_result.get("structure_error")):
        err_msg = ocr_result.get("structure_error") or "Invalid Document Upload: Not a valid passport credential."
        raise HTTPException(status_code=400, detail=err_msg)

    extracted_fields = ocr_result.get("fields", {})
    manual = request.manual_fields or {}
    for k, v in manual.items():
        if v and not extracted_fields.get(k):
            extracted_fields[k] = v
    if manual.get("docNumber") and not extracted_fields.get("passport_number"):
        extracted_fields["passport_number"] = manual.get("docNumber")
    if manual.get("fullName") and not extracted_fields.get("name"):
        extracted_fields["name"] = manual.get("fullName")

    passport_number = extracted_fields.get("passport_number") or ""
    person_name = extracted_fields.get("name") or ""

    # Step 1.5: Mandatory Excel Database Lookup (dummy_database.xlsx)
    excel_lookup = registry_service.lookup_excel_database(passport_number, person_name)
    if not excel_lookup.get("is_found", False):
        unregistered_identifier = passport_number or person_name or "Unknown Subject"
        raise HTTPException(
            status_code=400,
            detail=f"Excel Database Verification Failed: Passport/Identity '{unregistered_identifier}' is NOT registered in the official Excel database (dummy_database.xlsx). Screening rejected!"
        )

    # Step 2: Registry & Watchlist Lookup
    registry_passenger = registry_service.lookup_passenger(db, passport_number)
    registry_visa = registry_service.lookup_visa_by_passport(db, passport_number) if passport_number else None
    watchlist_matches = registry_service.check_watchlist(
        db,
        name=person_name,
        passport_number=passport_number,
        national_id=registry_passenger.national_id if registry_passenger else None
    )

    registry_data = {
        "excel_registry": excel_lookup,
        "found": bool(registry_passenger),
        "passenger": {
            "id": registry_passenger.id,
            "name": registry_passenger.name,
            "passport_number": registry_passenger.passport_number,
            "dob": registry_passenger.dob,
            "gender": registry_passenger.gender,
            "nationality": registry_passenger.nationality,
            "status": registry_passenger.status,
            "expiry_date": registry_passenger.passport_expiry_date,
        } if registry_passenger else None,
        "visa": {
            "visa_number": registry_visa.visa_number,
            "visa_type": registry_visa.visa_type,
            "valid_until": registry_visa.valid_until,
            "status": registry_visa.status,
        } if registry_visa else None,
        "watchlist_hits": [
            {
                "id": w.id,
                "name": w.name,
                "circular_ref": w.circular_ref,
                "severity": w.severity,
                "description": w.description,
            } for w in watchlist_matches
        ],
    }

    # Step 3: Document Validation
    validation_result = validation_service.validate_document(
        ocr_fields=extracted_fields,
        registry_passenger=registry_passenger,
        registry_visa=registry_visa,
        visa_input_number=request.manual_fields.get("visaNumber") if request.manual_fields else None
    )

    # Step 4: Tampering & Forgery Analysis
    is_preset_tampered = request.demo_case_id in ["CASE_TAMPERED", "CASE_FAKE_ID"]
    tampering_result = tampering_service.analyze_document(
        image_input=request.passport_image,
        mrz_details=ocr_result.get("mrz_details"),
        is_preset_tampered=is_preset_tampered
    )

    # Step 5: Biometric Face Verification
    face_result = face_service.verify_faces(
        passport_image_input=request.passport_image,
        live_face_input=request.face_image,
        passport_face_input=request.passport_face_image
    )

    # Step 6: Explainable Risk Engine
    risk_assessment = risk_engine.evaluate(
        watchlist_matches=watchlist_matches,
        validation_results=validation_result,
        tampering_results=tampering_result,
        face_results=face_result
    )

    processing_time = round((time.time() - start_time) * 1000, 1)

    # Build UI-compatible ScreeningRecord format
    security_checks_data = SecurityChecks(
        hologramDetected=tampering_result.get("hologram_detected", True),
        tamperingDetected=tampering_result.get("tampering_detected", False),
        watchlistMatch=bool(watchlist_matches),
        biometricMatch=face_result.get("match", False),
    )

    display_name = person_name or (registry_passenger.name if registry_passenger else "Unknown Subject")
    display_doc_num = passport_number or (registry_passenger.passport_number if registry_passenger else "UNREGISTERED")
    display_dob = extracted_fields.get("date_of_birth") or (registry_passenger.dob if registry_passenger else "N/A")
    display_nationality = extracted_fields.get("nationality") or (registry_passenger.nationality if registry_passenger else "N/A")
    display_address = registry_passenger.address if registry_passenger else "Transit / Checkpoint Terminal"

    # Match score
    raw_sim = face_result.get("similarity_score")
    if raw_sim is not None:
        match_score = round(max(0.0, min(100.0, float(raw_sim))), 1)
    else:
        match_score = 0.0

    notes_text = ". ".join(risk_assessment["reasons"][:2]) if risk_assessment["reasons"] else "Identity processed through SSB screening engine."

    ui_record = UIRecord(
        id=screening_id,
        name=display_name,
        docType="Passport",
        docNumber=display_doc_num,
        status=risk_assessment["status"],
        timestamp=timestamp_str,
        checkpointId=request.checkpoint_id or "CHK-00184",
        officerId=request.officer_id or "SSB-OFC-8821",
        gender=extracted_fields.get("gender") or (registry_passenger.gender if registry_passenger else "M"),
        dob=display_dob,
        address=display_address,
        nationality=display_nationality,
        matchScore=match_score,
        ocrConfidence=float(ocr_result.get("confidence", 95.0)),
        securityChecks=security_checks_data,
        notes=notes_text,
        photoUrl=request.passport_face_image or face_result.get("passport_crop_b64") or request.passport_image,
        livePhotoUri=face_result.get("live_crop_b64") or request.face_image,
    )

    # Step 7: Persist Screening in Database
    db_record = ScreeningRecordModel(
        id=screening_id,
        name=display_name,
        doc_type="Passport",
        doc_number=display_doc_num,
        status=risk_assessment["status"],
        timestamp=timestamp_str,
        checkpoint_id=request.checkpoint_id or "CHK-00184",
        officer_id=request.officer_id or "SSB-OFC-8821",
        gender=ui_record.gender,
        dob=ui_record.dob,
        address=ui_record.address,
        nationality=ui_record.nationality,
        match_score=match_score,
        ocr_confidence=ui_record.ocrConfidence,
        security_checks=sanitize_json_obj(security_checks_data.model_dump()),
        notes=notes_text,
        photo_url=ui_record.photoUrl,
        raw_ocr=sanitize_json_obj(ocr_result),
        validation_details=sanitize_json_obj(validation_result),
        tampering_details=sanitize_json_obj(tampering_result),
        face_details=sanitize_json_obj(face_result),
        risk_details=sanitize_json_obj(risk_assessment),
    )
    db.add(db_record)
    db.commit()

    return ScreeningResponse(
        screening_id=screening_id,
        timestamp=timestamp_str,
        checkpoint_id=request.checkpoint_id or "CHK-00184",
        officer_id=request.officer_id or "SSB-OFC-8821",
        ocr=sanitize_json_obj(ocr_result),
        registry=sanitize_json_obj(registry_data),
        validation=sanitize_json_obj(validation_result),
        tampering=sanitize_json_obj(tampering_result),
        face_verification=sanitize_json_obj(face_result),
        risk=RiskResult(
            score=int(risk_assessment["score"]),
            level=str(risk_assessment["level"]),
            status=str(risk_assessment["status"]),
            reasons=[str(r) for r in risk_assessment["reasons"]],
            label=str(risk_assessment["label"]),
        ),
        ui_record=ui_record,
        processing_time_ms=processing_time,
    )
