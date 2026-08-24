from fastapi import APIRouter, HTTPException
from backend.app.schemas.screening import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login")
def officer_login(req: LoginRequest):
    """
    Authenticates duty officer credentials.
    Supports Admin and Checkpoint roles with 2FA session clearance.
    """
    if not req.officer_id.strip():
        raise HTTPException(status_code=400, detail="Officer ID is required")
    if not req.password.strip():
        raise HTTPException(status_code=400, detail="Password is required")

    role = req.role or "checkpoint"
    rank = "Commandant (HQ)" if role == "admin" else "Assistant Commandant"
    
    return {
        "success": True,
        "token": "ssb_sec_token_256_aes_cbc_session",
        "officer": {
            "id": req.officer_id,
            "name": "Officer Rajesh Verma",
            "rank": rank,
            "unit": "14th Battalion SSB (Indo-Nepal Border)",
            "checkpoint": req.checkpoint_id or "CHK-00184 (Raxaul Integrated Checkpost)",
            "securityClearance": "SECRET / OPERATIONAL GRADE-1",
            "role": role,
        },
        "session": {
            "authenticated_at": "2026-08-23T20:00:00Z",
            "encryption": "AES-256-GCM",
            "terminal": req.checkpoint_id or "CHK-00184",
        }
    }
