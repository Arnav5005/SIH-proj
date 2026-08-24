from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    JSON,
    ForeignKey,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Passenger(Base):
    __tablename__ = "passengers"

    id = Column(String(50), primary_key=True)  # e.g., PER-849201 or P10001
    name = Column(String(150), nullable=False, index=True)
    passport_number = Column(String(50), unique=True, index=True, nullable=False)
    national_id = Column(String(50), nullable=True)
    dob = Column(String(20), nullable=False)  # YYYY-MM-DD or DD-MM-YYYY
    gender = Column(String(10), nullable=False)  # M, F, Other
    nationality = Column(String(80), nullable=False)
    address = Column(Text, nullable=True)
    status = Column(String(30), default="ACTIVE")  # ACTIVE, REVOKED, FLAGGED, EXPIRED
    passport_issue_date = Column(String(20), nullable=True)
    passport_expiry_date = Column(String(20), nullable=True)
    photo_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    visas = relationship("Visa", back_populates="passenger", cascade="all, delete-orphan")


class Visa(Base):
    __tablename__ = "visas"

    visa_number = Column(String(50), primary_key=True)  # e.g., V10001
    passport_number = Column(String(50), ForeignKey("passengers.passport_number"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    visa_type = Column(String(50), default="Tourist")  # Tourist, Business, Transit, Official
    entry_type = Column(String(50), default="Multiple")  # Single, Double, Multiple
    valid_from = Column(String(20), nullable=False)
    valid_until = Column(String(20), nullable=False)
    stay_duration = Column(String(50), default="90 Days")
    status = Column(String(30), default="ACTIVE")  # ACTIVE, EXPIRED, REVOKED
    issuing_authority = Column(String(100), default="High Commission / Immigration Bureau")
    created_at = Column(DateTime, default=datetime.utcnow)

    passenger = relationship("Passenger", back_populates="visas")


class WatchlistEntry(Base):
    __tablename__ = "watchlist"

    id = Column(String(50), primary_key=True)  # e.g., WTL-001
    name = Column(String(150), nullable=False, index=True)
    passport_number = Column(String(50), nullable=True, index=True)
    national_id = Column(String(50), nullable=True)
    dob = Column(String(20), nullable=True)
    nationality = Column(String(80), nullable=True)
    circular_ref = Column(String(100), nullable=False)  # e.g., #LOC-2026-904
    agency = Column(String(100), default="IB / NIA / INTERPOL")
    severity = Column(String(30), default="CRITICAL")  # CRITICAL, WARNING
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScreeningRecordModel(Base):
    __tablename__ = "screening_records"

    id = Column(String(50), primary_key=True)  # e.g., VF-28491
    name = Column(String(150), nullable=False)
    doc_type = Column(String(50), nullable=False)  # Passport, Aadhaar Card, Border Pass, Voter ID, Driving License
    doc_number = Column(String(50), nullable=False, index=True)
    status = Column(String(30), nullable=False)  # VERIFIED, NEEDS_REVIEW, MISMATCH, HIGH_RISK
    timestamp = Column(String(30), nullable=False)
    checkpoint_id = Column(String(50), default="CHK-00184")
    officer_id = Column(String(50), default="SSB-OFC-8821")
    gender = Column(String(10), nullable=True)
    dob = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    nationality = Column(String(80), nullable=True)
    match_score = Column(Float, default=0.0)  # 0 - 100
    ocr_confidence = Column(Float, default=0.0)  # 0 - 100
    security_checks = Column(JSON, default=dict)  # {hologramDetected, tamperingDetected, watchlistMatch, biometricMatch}
    notes = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    raw_ocr = Column(JSON, nullable=True)
    validation_details = Column(JSON, nullable=True)
    tampering_details = Column(JSON, nullable=True)
    face_details = Column(JSON, nullable=True)
    risk_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SecurityAlertModel(Base):
    __tablename__ = "security_alerts"

    id = Column(String(50), primary_key=True)  # e.g., ALT-904
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)  # CRITICAL, WARNING, INFO
    timestamp = Column(String(50), nullable=False)
    location = Column(String(100), nullable=False)
    acknowledged = Column(Boolean, default=False)
    doc_ref = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
