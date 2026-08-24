from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.schemas.screening import ScreeningRequest, ScreeningResponse
from backend.app.api.routes_screen import screen_document

router = APIRouter(prefix="/api/demo", tags=["Demo Scenarios"])

DUMMY_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

DEMO_CASES = [
    {
        "id": "CASE_GENUINE",
        "title": "Aditi Sharma (Valid Aadhaar / Passport Z8849102)",
        "type": "Passport",
        "docNumber": "Z8849102",
        "name": "Aditi Sharma",
        "dob": "1994-06-14",
        "gender": "F",
        "nationality": "Indian",
        "address": "Sector 4, Gandhinagar, Gujarat - 382004",
        "description": "CASE 1 — GENUINE: Valid passport, valid visa, authentic hologram, biometric face match, clean watchlist.",
        "expected_risk": "LOW",
        "expected_status": "VERIFIED",
    },
    {
        "id": "CASE_TAMPERED",
        "title": "Unknown / Fake ID (Tampered Hologram & Altered DOB)",
        "type": "Passport",
        "docNumber": "Z8921849",
        "name": "Priya Patel",
        "dob": "2001-04-12",  # Registry has 1991-08-19 -> Mismatch!
        "gender": "F",
        "nationality": "Indian",
        "address": "Navrangpura, Ahmedabad, Gujarat",
        "description": "CASE 2 — TAMPERED: Security foil missing, DOB altered, MRZ checksum discrepancy.",
        "expected_risk": "HIGH",
        "expected_status": "MISMATCH",
    },
    {
        "id": "CASE_IMPERSONATION",
        "title": "Identity Impersonation (Alex Morgan Passport + Wrong Face)",
        "type": "Passport",
        "docNumber": "P8742031",
        "name": "Alex Morgan",
        "dob": "1992-03-12",
        "gender": "M",
        "nationality": "United States",
        "address": "New York, United States",
        "description": "CASE 3 — IMPERSONATION: Valid passport credential presented by a different passenger.",
        "expected_risk": "HIGH",
        "expected_status": "MISMATCH",
    },
    {
        "id": "CASE_EXPIRED",
        "title": "Rohit Kumar (Expired Visa Permit)",
        "type": "Passport",
        "docNumber": "Z1904821",
        "name": "Rohit Kumar",
        "dob": "1990-04-11",
        "gender": "M",
        "nationality": "Indian",
        "address": "Model Town, Panipat, Haryana",
        "description": "CASE 4 — EXPIRED DOCUMENT: Valid registry identity with expired visa transit permit.",
        "expected_risk": "MEDIUM",
        "expected_status": "NEEDS_REVIEW",
    },
    {
        "id": "CASE_WATCHLIST",
        "title": "High Risk Watchlist Subject (LOC Issued)",
        "type": "Passport",
        "docNumber": "P9028114",
        "name": "Mohd. Tariq",
        "dob": "1982-01-05",
        "gender": "M",
        "nationality": "Indian",
        "address": "Civil Lines, Moradabad, UP",
        "description": "CASE 5 — WATCHLIST: Biometric and name query matches IB/NIA Central Look Out Circular #LOC-2026-904.",
        "expected_risk": "HIGH",
        "expected_status": "HIGH_RISK",
    },
]

@router.get("/cases")
def list_demo_cases():
    """Returns curated SIH26188 evaluation scenarios."""
    return DEMO_CASES

@router.get("/cases/{case_id}")
def get_demo_case(case_id: str):
    """Returns specific demo scenario configuration."""
    for c in DEMO_CASES:
        if c["id"] == case_id:
            return c
    raise HTTPException(status_code=404, detail="Demo scenario not found")

@router.post("/cases/{case_id}/run", response_model=ScreeningResponse)
def run_demo_case(case_id: str, db: Session = Depends(get_db)):
    """Executes the complete screening pipeline on the selected demo scenario assets."""
    target_case = None
    for c in DEMO_CASES:
        if c["id"] == case_id:
            target_case = c
            break

    if not target_case:
        raise HTTPException(status_code=404, detail="Demo scenario not found")

    # Build screening request for the demo case
    req = ScreeningRequest(
        passport_image=DUMMY_IMAGE,
        visa_image=DUMMY_IMAGE,
        face_image=DUMMY_IMAGE,
        checkpoint_id="CHK-00184",
        officer_id="SSB-OFC-8821",
        manual_fields={
            "fullName": target_case["name"],
            "name": target_case["name"],
            "docNumber": target_case["docNumber"],
            "passport_number": target_case["docNumber"],
            "nationality": target_case["nationality"],
            "dob": target_case["dob"],
            "gender": target_case["gender"],
        },
        demo_case_id=target_case["id"],
    )

    return screen_document(req, db=db)
