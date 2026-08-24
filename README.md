# MHA | SSB — AI Document Screening (React Native Frontend)

Front-end implementation of the **Sashastra Seema Bal (SSB)** AI Document Screening System under the **Ministry of Home Affairs, Government of India**, built with **React Native & Expo** following the *Sovereign Shield Directive* design specifications from Google Stitch.

---

## 🛠 Features

- **Sovereign Shield Design System**: High-contrast, military-grade dark theme (`#121317`), custom typography hierarchy, and status color coding.
- **Official Branding**: Indian National Emblem, Ministry of Home Affairs, and SSB security badges.
- **Authorized Login Screen**: Role-based access (Checkpoint vs Admin), 2FA OTP, password visibility toggle, 256-bit encrypted session indicators.
- **Command Dashboard**: Live operational status, greeting, stats overview (Verified, Mismatched, Pending Review), and recent activity feed.
- **AI Document Scanner Engine**:
  - Animated 4K sensor HUD with laser scan sweep.
  - Multi-stage AI pipeline simulation (OCR Extraction, Hologram Integrity, Biometric Facial Match, Watchlist Cross-Check).
  - Test presets (Valid Aadhaar, Expired Visa Passport, Tampered Hologram ID, High-Risk Watchlist Match).
  - Transition actions (Approve, Mismatch, Secondary Inspection, Detain).
- **Registry & Audit Log**: Search, filter by status, and detailed inspection modal for each verification event.
- **Threat Intelligence & Alerts**: Critical watchlist hits, LOC alerts, and checkpoint broadcast directive.
- **Officer Profile & Security Settings**: Officer badge, shift info, cryptographic session metadata, and biometric settings.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Web Browser
```bash
npm run web
```
or
```bash
npx expo start --web
```

### 3. Run on Mobile (iOS / Android)
```bash
npx expo start
```
Scan the QR code with the **Expo Go** app on your phone.

---

## 📁 Project Folder Structure

```text
SSB-AI_Screening_App/
│
├── App.tsx                          # Root React Native component & state management
├── index.js                         # Application entry point for Expo
├── app.json                         # Expo configuration (name, icons, splash, orientation)
├── babel.config.js                  # Babel configuration for React Native / Expo
├── tsconfig.json                    # TypeScript compiler configuration
├── package.json                     # Project dependencies, scripts, and Expo versions
├── package-lock.json                # Locked dependency tree
├── dummy_database.xlsx              # Border Control Passenger Registry Database (Excel)
├── run_app.bat                      # Windows batch script to launch frontend + backend
├── run_app.ps1                      # PowerShell script to launch full stack
├── .env / .env.example              # Environment variables & API URL configurations
│
├── assets/                          # Static assets (emblems, icons, images, splash screens)
│
├── src/                             # Frontend Source Code (React Native + TypeScript)
│   ├── components/                  # Reusable UI components
│   │   ├── BottomNavBar.tsx         # Persistent bottom navigation tabs
│   │   ├── Emblem.tsx               # MHA / SSB emblem & official crests
│   │   ├── StatCard.tsx             # Metric cards for checkpoint dashboard stats
│   │   └── TopAppBar.tsx            # Header bar with emblem, security badge & officer profile
│   │
│   ├── screens/                     # Main Application Screens
│   │   ├── AlertsScreen.tsx         # Security threats, LOC alerts & watchlist intelligence
│   │   ├── DashboardScreen.tsx      # Officer command center dashboard & metrics overview
│   │   ├── DocumentUploadScreen.tsx # Step 2: Document scan & Officer Face Photo entry
│   │   ├── FaceCaptureScreen.tsx    # Step 1: Real-time live camera capture & quality analysis
│   │   ├── LoginScreen.tsx          # Secure officer login with 2FA OTP & role validation
│   │   ├── ProfileModal.tsx         # Officer credentials & shift metadata modal
│   │   ├── RecordDetailModal.tsx    # Detailed screening record breakdown & audit inspector
│   │   ├── RecordsScreen.tsx        # Searchable registry audit trail with status filters
│   │   ├── ScannerScreen.tsx        # Document scanning sensor HUD & laser sweep animation
│   │   ├── SettingsScreen.tsx       # Checkpoint configuration & theme toggle
│   │   └── VerificationResultScreen.tsx # Step 3: Biometric match & document verification results
│   │
│   ├── services/                    # API Integration Services
│   │   └── api.ts                   # Unified REST client connecting frontend to FastAPI backend
│   │
│   ├── theme/                       # Design System & Styling
│   │   └── theme.ts                 # Color tokens, Sovereign Shield dark theme, typography, spacing
│   │
│   ├── types/                       # TypeScript Data Interfaces
│   │   └── index.ts                 # Types for ScreeningRecord, OfficerProfile, SecurityAlert, etc.
│   │
│   └── mockData/                    # Offline / Fallback Data
│       └── index.ts                 # Initial demo records, officer profiles & security alerts
│
└── backend/                         # AI & Forensic Backend (FastAPI + Python)
    ├── requirements.txt             # Python backend dependencies
    ├── .env                         # Backend environment configuration
    │
    ├── app/                         # FastAPI Application Core
    │   ├── main.py                  # FastAPI application entry point, CORS & middleware
    │   ├── config.py                # App configuration, thresholds & environment variables
    │   │
    │   ├── api/                     # REST API Route Handlers
    │   │   ├── routes_screen.py     # Main screening pipeline (/api/screen)
    │   │   ├── routes_standalone.py # Standalone services (OCR, Face Verify, Tampering, Registry)
    │   │   ├── routes_records.py    # Screening audit records CRUD (/api/records)
    │   │   ├── routes_dashboard.py  # Checkpoint dashboard statistics (/api/dashboard)
    │   │   ├── routes_alerts.py     # Security alerts & threat intelligence (/api/alerts)
    │   │   ├── routes_auth.py       # Officer authentication & verification (/api/auth)
    │   │   └── routes_demo.py       # Interactive demo test presets (/api/demo)
    │   │
    │   ├── services/                # Core AI & Verification Pipeline Services
    │   │   ├── face_service.py      # InsightFace + ArcFace 512D biometric comparison
    │   │   ├── ocr_service.py       # Tesseract OCR & Passport MRZ extractor
    │   │   ├── registry_service.py  # Excel / SQLite border passenger registry matcher
    │   │   ├── tampering_service.py # Error Level Analysis (ELA) & forgery detection
    │   │   ├── validation_service.py# Identity cross-field & expiration validation
    │   │   └── risk_engine.py       # Explainable multi-factor risk assessment engine
    │   │
    │   ├── database/                # Database Layer (SQLite / SQLAlchemy ORM)
    │   │   ├── models.py            # SQLAlchemy database models (Passenger, Visa, Watchlist, etc.)
    │   │   ├── session.py           # Database sessionmaker & SQLite connection engine
    │   │   └── seed_data.py         # Database seeder from dummy_database.xlsx
    │   │
    │   ├── schemas/                 # Pydantic Request & Response Schemas
    │   │   └── screening.py         # Data models for screening requests, UI records, security checks
    │   │
    │   └── utils/                   # Helper Utilities
    │       └── image_utils.py       # Image decoding (base64, OpenCV BGR conversion, resizing)
    │
    ├── data/                        # Persistent database storage (SSB screening SQLite DB)
    ├── models/                      # Haar Cascade XML and ONNX machine learning model weights
    ├── tests/                       # Automated backend unit test suite (38/38 tests)
    └── uploads/                     # Temporary staging for scanned document images
```
