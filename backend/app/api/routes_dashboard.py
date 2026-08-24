from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import ScreeningRecordModel
from backend.app.api.routes_records import model_to_ui_record

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Computes real-time dynamic statistics and recent activity feed
    from the screening database.
    """
    all_records = db.query(ScreeningRecordModel).order_by(ScreeningRecordModel.created_at.desc()).all()
    
    verified_count = sum(1 for r in all_records if r.status == "VERIFIED")
    mismatch_count = sum(1 for r in all_records if r.status in ["MISMATCH", "HIGH_RISK"])
    pending_count = sum(1 for r in all_records if r.status == "NEEDS_REVIEW")
    high_risk_count = sum(1 for r in all_records if r.status == "HIGH_RISK")
    total_count = len(all_records)

    tampering_count = sum(1 for r in all_records if (r.security_checks or {}).get("tamperingDetected", False))
    watchlist_count = sum(1 for r in all_records if (r.security_checks or {}).get("watchlistMatch", False))
    face_mismatch_count = sum(1 for r in all_records if not (r.security_checks or {}).get("biometricMatch", True))

    recent_activity = [model_to_ui_record(r) for r in all_records[:6]]

    return {
        "verified": verified_count,
        "mismatched": mismatch_count,
        "pending": pending_count,
        "high_risk": high_risk_count,
        "total": total_count,
        "tampering_detected": tampering_count,
        "watchlist_hits": watchlist_count,
        "face_mismatches": face_mismatch_count,
        "recent_activity": recent_activity,
    }
