from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import ScreeningRecordModel
from backend.app.schemas.screening import UIRecord, StatusUpdateRequest

router = APIRouter(prefix="/api/screenings", tags=["Screening Records"])

def model_to_ui_record(r: ScreeningRecordModel) -> dict:
    sec = r.security_checks or {}
    return {
        "id": r.id,
        "name": r.name,
        "docType": r.doc_type,
        "docNumber": r.doc_number,
        "status": r.status,
        "timestamp": r.timestamp,
        "checkpointId": r.checkpoint_id,
        "officerId": r.officer_id,
        "gender": r.gender or "M",
        "dob": r.dob or "N/A",
        "address": r.address or "N/A",
        "nationality": r.nationality or "Indian",
        "matchScore": r.match_score,
        "ocrConfidence": r.ocr_confidence,
        "securityChecks": {
            "hologramDetected": sec.get("hologramDetected", True),
            "tamperingDetected": sec.get("tamperingDetected", False),
            "watchlistMatch": sec.get("watchlistMatch", False),
            "biometricMatch": sec.get("biometricMatch", True),
        },
        "notes": r.notes or "",
        "photoUrl": r.photo_url,
    }

@router.get("", response_model=List[dict])
def get_screening_records(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieves list of screening records with optional search and status filters."""
    query = db.query(ScreeningRecordModel).order_by(ScreeningRecordModel.created_at.desc())

    if status and status.upper() != "ALL":
        query = query.filter(ScreeningRecordModel.status == status.upper())

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (ScreeningRecordModel.name.ilike(s)) |
            (ScreeningRecordModel.id.ilike(s)) |
            (ScreeningRecordModel.doc_number.ilike(s))
        )

    records = query.limit(limit).all()
    return [model_to_ui_record(r) for r in records]

@router.get("/{record_id}", response_model=dict)
def get_screening_record_detail(record_id: str, db: Session = Depends(get_db)):
    """Retrieves full audit inspection detail for a single screening record."""
    record = db.query(ScreeningRecordModel).filter(ScreeningRecordModel.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Screening record not found")

    ui_data = model_to_ui_record(record)
    return {
        **ui_data,
        "raw_ocr": record.raw_ocr,
        "validation_details": record.validation_details,
        "tampering_details": record.tampering_details,
        "face_details": record.face_details,
        "risk_details": record.risk_details,
    }

@router.post("/{record_id}/status")
def update_screening_status(
    record_id: str,
    update: StatusUpdateRequest,
    db: Session = Depends(get_db)
):
    """Updates the officer decision status of a screening record."""
    record = db.query(ScreeningRecordModel).filter(ScreeningRecordModel.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Screening record not found")

    record.status = update.status
    if update.notes:
        record.notes = update.notes
    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "id": record.id,
        "status": record.status,
        "notes": record.notes,
        "message": f"Screening {record.id} status updated to {record.status}.",
    }
