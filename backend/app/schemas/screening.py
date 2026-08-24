from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class ScreeningRequest(BaseModel):
    passport_image: Optional[str] = None
    passport_face_image: Optional[str] = None
    face_image: Optional[str] = None
    visa_image: Optional[str] = None
    national_id_image: Optional[str] = None
    checkpoint_id: Optional[str] = "CHK-00184"
    officer_id: Optional[str] = "SSB-OFC-8821"
    manual_fields: Optional[Dict[str, str]] = None
    demo_case_id: Optional[str] = None

class SecurityChecks(BaseModel):
    hologramDetected: bool = True
    tamperingDetected: bool = False
    watchlistMatch: bool = False
    biometricMatch: bool = True

class UIRecord(BaseModel):
    id: str
    name: str
    docType: str
    docNumber: str
    status: str
    timestamp: str
    checkpointId: str
    officerId: str
    gender: Optional[str] = "M"
    dob: Optional[str] = "1992-03-12"
    address: Optional[str] = "New York, United States"
    nationality: Optional[str] = "United States"
    matchScore: float = 0.0
    ocrConfidence: float = 99.4
    securityChecks: SecurityChecks
    notes: Optional[str] = ""
    photoUrl: Optional[str] = None
    livePhotoUri: Optional[str] = None

class RiskResult(BaseModel):
    score: int
    level: str
    status: str
    reasons: List[str]
    label: str = "Prototype Risk Score — Decision Support"

class ScreeningResponse(BaseModel):
    screening_id: str
    timestamp: str
    checkpoint_id: str
    officer_id: str
    ocr: Dict[str, Any]
    registry: Dict[str, Any]
    validation: Dict[str, Any]
    tampering: Dict[str, Any]
    face_verification: Dict[str, Any]
    risk: RiskResult
    ui_record: UIRecord
    processing_time_ms: float = 0.0

class StatusUpdateRequest(BaseModel):
    status: str  # VERIFIED, NEEDS_REVIEW, MISMATCH, HIGH_RISK
    notes: Optional[str] = None

class LoginRequest(BaseModel):
    officer_id: str
    password: str
    role: Optional[str] = "checkpoint"
    checkpoint_id: Optional[str] = "CHK-00184"
    otp_code: Optional[str] = None
