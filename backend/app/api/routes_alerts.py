from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import SecurityAlertModel

router = APIRouter(prefix="/api/alerts", tags=["Security Alerts"])

def model_to_alert_dict(a: SecurityAlertModel) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "description": a.description,
        "severity": a.severity,
        "timestamp": a.timestamp,
        "location": a.location,
        "acknowledged": a.acknowledged,
        "docRef": a.doc_ref,
    }

@router.get("", response_model=List[dict])
def get_alerts(db: Session = Depends(get_db)):
    """Retrieves all force threat intelligence and security alerts."""
    alerts = db.query(SecurityAlertModel).order_by(SecurityAlertModel.created_at.desc()).all()
    return [model_to_alert_dict(a) for a in alerts]

@router.post("/{alert_id}/ack")
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    """Marks a security alert as acknowledged by the duty officer."""
    alert = db.query(SecurityAlertModel).filter(SecurityAlertModel.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged = True
    db.commit()
    db.refresh(alert)
    return {"success": True, "id": alert.id, "acknowledged": True}

@router.post("/broadcast")
def broadcast_alert(
    title: str = Body("BROADCAST: Checkpoint Scrutiny Directive", embed=True),
    description: str = Body("Enhanced biometric screening active across all terminal gates.", embed=True),
    severity: str = Body("WARNING", embed=True),
    location: str = Body("Raxaul Sector Checkpoint", embed=True),
    db: Session = Depends(get_db)
):
    """Issues a high-priority sector alarm or advisory broadcast."""
    alert_id = f"ALT-{datetime.now().strftime('%H%M%S')}"
    new_alert = SecurityAlertModel(
        id=alert_id,
        title=title,
        description=description,
        severity=severity,
        timestamp="Just now",
        location=location,
        acknowledged=False,
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return {"success": True, "alert": model_to_alert_dict(new_alert)}
