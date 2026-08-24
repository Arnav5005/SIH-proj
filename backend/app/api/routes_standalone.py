from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.services.ocr_service import ocr_service
from backend.app.services.face_service import face_service
from backend.app.services.tampering_service import tampering_service
from backend.app.services.registry_service import registry_service

router = APIRouter(prefix="/api", tags=["Supporting Standalone APIs"])

@router.post("/ocr")
def run_standalone_ocr(image: str = Body(..., embed=True)):
    """Runs standalone OCR on a document image and returns extracted fields."""
    result = ocr_service.process_document(image)
    return result

@router.post("/face/quality")
def run_face_quality_check(image: str = Body(..., embed=True)):
    """Runs AI quality, centering, lighting, and glasses/mask obstruction checks on face image."""
    result = face_service.analyze_face_quality(image)
    return result

@router.post("/face/verify")
def run_standalone_face_verify(
    passport_image: Optional[str] = Body(None, embed=True),
    live_image: str = Body(..., embed=True),
    passport_face_image: Optional[str] = Body(None, embed=True)
):
    """Compares passport face (or officer-cropped passport face) with live face image and returns match confidence."""
    result = face_service.verify_faces(passport_image, live_image, passport_face_input=passport_face_image)
    return result

@router.post("/tampering/analyze")
def run_standalone_tampering(image: str = Body(..., embed=True)):
    """Runs standalone Error Level Analysis and forensic anomaly evaluation."""
    result = tampering_service.analyze_document(image)
    return result

@router.get("/passengers/{identifier}")
def get_passenger_by_id(identifier: str, db: Session = Depends(get_db)):
    """Retrieves passenger record from synthetic border registry by passport or ID."""
    passenger = registry_service.lookup_passenger(db, identifier)
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found in border registry")

    return {
        "id": passenger.id,
        "name": passenger.name,
        "passport_number": passenger.passport_number,
        "national_id": passenger.national_id,
        "dob": passenger.dob,
        "gender": passenger.gender,
        "nationality": passenger.nationality,
        "address": passenger.address,
        "status": passenger.status,
        "passport_expiry_date": passenger.passport_expiry_date,
    }

@router.get("/visas/{visa_number}")
def get_visa_by_number(visa_number: str, db: Session = Depends(get_db)):
    """Retrieves visa record by visa number."""
    visa = registry_service.lookup_visa_by_number(db, visa_number)
    if not visa:
        raise HTTPException(status_code=404, detail="Visa not found in registry")

    return {
        "visa_number": visa.visa_number,
        "passport_number": visa.passport_number,
        "name": visa.name,
        "visa_type": visa.visa_type,
        "entry_type": visa.entry_type,
        "valid_from": visa.valid_from,
        "valid_until": visa.valid_until,
        "stay_duration": visa.stay_duration,
        "status": visa.status,
    }
