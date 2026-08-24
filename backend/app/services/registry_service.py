import os
import re
import logging
from typing import Optional, Dict, Any, List, Tuple
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.database.models import Passenger, Visa, WatchlistEntry

logger = logging.getLogger(__name__)

EXCEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "dummy_database.xlsx")
)

class RegistryService:
    """Service to query authorized border registry (Database & Excel File) and national watchlist."""

    def __init__(self):
        self.excel_data: Optional[pd.DataFrame] = None
        self._load_excel_database()

    def _load_excel_database(self):
        """Loads dummy_database.xlsx from root folder into memory."""
        try:
            if os.path.exists(EXCEL_PATH):
                self.excel_data = pd.read_excel(EXCEL_PATH)
                logger.info(f"[Excel Registry] Successfully loaded {len(self.excel_data)} records from {EXCEL_PATH}")
            else:
                logger.warning(f"[Excel Registry] File not found at {EXCEL_PATH}")
        except Exception as e:
            logger.error(f"[Excel Registry] Error loading Excel database: {e}")

def normalize_ocr_passport(p: str) -> str:
    """Normalizes common OCR character confusion pairs in passport numbers."""
    if not p:
        return ""
    mapping = {'4': 'A', '8': 'B', '0': 'O', '1': 'I', '5': 'S', '2': 'Z', '6': 'G', '9': 'P'}
    cleaned = list(re.sub(r'[^A-Z0-9]', '', p.upper()))
    for i, c in enumerate(cleaned):
        if c in mapping:
            cleaned[i] = mapping[c]
    return ''.join(cleaned)


def is_fuzzy_passport_match(p1: str, p2: str) -> Tuple[bool, float]:
    """
    Checks if two passport numbers match despite OCR character errors (e.g. 4 vs A, 6 vs 4).
    Returns (is_match, confidence_score).
    """
    if not p1 or not p2:
        return False, 0.0
    c1 = re.sub(r'[^A-Z0-9]', '', p1.upper())
    c2 = re.sub(r'[^A-Z0-9]', '', p2.upper())
    if not c1 or not c2:
        return False, 0.0

    if c1 == c2:
        return True, 100.0

    n1 = normalize_ocr_passport(c1)
    n2 = normalize_ocr_passport(c2)
    if n1 == n2:
        return True, 92.0

    import difflib
    ratio = difflib.SequenceMatcher(None, n1, n2).ratio()
    if ratio >= 0.70:
        return True, round(ratio * 90.0, 1)

    return False, 0.0


def is_fuzzy_name_match(name1: str, name2: str) -> Tuple[bool, float]:
    """
    Checks if two names match regardless of word jumbling/ordering or minor typos.
    E.g. 'LIMA TASLIMA AKTER' matches 'TASLIMA AKTER LIMA'.
    Returns (is_match, confidence_score).
    """
    if not name1 or not name2:
        return False, 0.0

    w1 = set(re.findall(r'[A-Z0-9]+', name1.upper()))
    w2 = set(re.findall(r'[A-Z0-9]+', name2.upper()))

    if len(w1) > 1:
        w1 = {w for w in w1 if len(w) > 1}
    if len(w2) > 1:
        w2 = {w for w in w2 if len(w) > 1}

    if not w1 or not w2:
        return False, 0.0

    # 1. Exact token set equality (jumbled order)
    if w1 == w2:
        return True, 100.0

    # 2. Subset match (e.g. 'TASLIMA AKTER' subset of 'TASLIMA AKTER LIMA')
    if w1.issubset(w2) or w2.issubset(w1):
        return True, 95.0

    # 3. Jaccard word set similarity
    intersection = w1.intersection(w2)
    union = w1.union(w2)
    jaccard = len(intersection) / float(len(union))
    if jaccard >= 0.40:
        return True, round(jaccard * 90.0, 1)

    # 4. Sorted word Levenshtein sequence matching
    import difflib
    s1 = " ".join(sorted(list(w1)))
    s2 = " ".join(sorted(list(w2)))
    ratio = difflib.SequenceMatcher(None, s1, s2).ratio()
    if ratio >= 0.60:
        return True, round(ratio * 85.0, 1)

    return False, 0.0


class RegistryService:
    """Service to query authorized border registry (Database & Excel File) and national watchlist."""

    def __init__(self):
        self.excel_data: Optional[pd.DataFrame] = None
        self._load_excel_database()

    def _load_excel_database(self):
        """Loads dummy_database.xlsx from root folder into memory."""
        try:
            if os.path.exists(EXCEL_PATH):
                self.excel_data = pd.read_excel(EXCEL_PATH)
                logger.info(f"[Excel Registry] Successfully loaded {len(self.excel_data)} records from {EXCEL_PATH}")
            else:
                logger.warning(f"[Excel Registry] File not found at {EXCEL_PATH}")
        except Exception as e:
            logger.error(f"[Excel Registry] Error loading Excel database: {e}")

    def lookup_excel_database(self, passport_number: Optional[str], full_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Looks up a passenger in dummy_database.xlsx with jumbled-word name matching and OCR error tolerance.
        """
        if self.excel_data is None:
            self._load_excel_database()

        if self.excel_data is None or self.excel_data.empty:
            return {"is_found": False, "reason": "Excel database unavailable."}

        p_clean = passport_number.strip().upper() if passport_number else ""
        name_clean = full_name.strip().upper() if full_name else ""

        if not p_clean and not name_clean:
            return {"is_found": False, "reason": "No passport number or name provided for database lookup."}

        best_match_row = None
        best_score = 0.0
        matched_by = "NONE"

        for _, row in self.excel_data.iterrows():
            db_pass = str(row.get("Passport Number", "")).strip().upper()
            db_fullname = str(row.get("Full Name", "")).strip().upper()
            db_surname = str(row.get("Surname", "")).strip().upper()
            db_given = str(row.get("Given Name(s)", "")).strip().upper()
            db_combined_name = f"{db_given} {db_surname}".strip() if db_given else db_fullname

            current_score = 0.0
            current_matched_by = []

            # Passport Number Match Check
            if p_clean and db_pass:
                pass_match, pass_score = is_fuzzy_passport_match(p_clean, db_pass)
                if pass_match:
                    current_score += pass_score * 1.2
                    current_matched_by.append("PASSPORT_NUMBER")

            # Name Match Check (Full Name, Surname, Given Name, or Jumbled Words)
            if name_clean:
                n1_match, n1_score = is_fuzzy_name_match(name_clean, db_fullname)
                n2_match, n2_score = is_fuzzy_name_match(name_clean, db_combined_name)
                n3_match, n3_score = is_fuzzy_name_match(name_clean, db_surname)
                max_n_score = max(n1_score, n2_score, n3_score)
                if max_n_score > 0:
                    current_score += max_n_score
                    current_matched_by.append("JUMBLED_NAME_FUZZY")

            if current_score > best_score and current_score >= 50.0:
                best_score = current_score
                best_match_row = row.to_dict()
                matched_by = "+".join(current_matched_by)

        if best_match_row is not None:
            return {
                "is_found": True,
                "s_no": best_match_row.get("S.No"),
                "passport_number": str(best_match_row.get("Passport Number", "")).strip().upper(),
                "full_name": str(best_match_row.get("Full Name", "")).strip(),
                "surname": str(best_match_row.get("Surname", "")).strip(),
                "given_name": str(best_match_row.get("Given Name(s)", "")).strip(),
                "nationality": str(best_match_row.get("Nationality", "")).strip(),
                "dob": str(best_match_row.get("Date of Birth", "")).strip(),
                "gender": str(best_match_row.get("Gender", "")).strip(),
                "notes": str(best_match_row.get("Notes", "")).strip() if pd.notna(best_match_row.get("Notes")) else None,
                "matched_by": matched_by,
                "match_score": round(best_score, 1),
            }

        return {
            "is_found": False,
            "reason": f"Passport number '{p_clean}' or name '{name_clean}' not found in dummy_database.xlsx",
        }

    def lookup_passenger(self, db: Session, passport_number: str) -> Optional[Passenger]:
        """Looks up a passenger by passport number."""
        if not passport_number:
            return None
        cleaned = passport_number.strip().upper()
        return db.query(Passenger).filter(
            (Passenger.passport_number == cleaned) | (Passenger.national_id == cleaned)
        ).first()

    def lookup_visa_by_passport(self, db: Session, passport_number: str) -> Optional[Visa]:
        """Looks up the most recent visa linked to a passport number."""
        if not passport_number:
            return None
        cleaned = passport_number.strip().upper()
        return db.query(Visa).filter(Visa.passport_number == cleaned).first()

    def lookup_visa_by_number(self, db: Session, visa_number: str) -> Optional[Visa]:
        """Looks up a visa by its visa number."""
        if not visa_number:
            return None
        cleaned = visa_number.strip().upper()
        return db.query(Visa).filter(Visa.visa_number == cleaned).first()

    def check_watchlist(
        self,
        db: Session,
        name: Optional[str] = None,
        passport_number: Optional[str] = None,
        national_id: Optional[str] = None
    ) -> List[WatchlistEntry]:
        """Queries the national/Interpol watchlist for suspect matches."""
        query = db.query(WatchlistEntry)
        filters = []

        if passport_number:
            cleaned_p = passport_number.strip().upper()
            filters.append(WatchlistEntry.passport_number == cleaned_p)
        
        if national_id:
            cleaned_id = national_id.strip().upper()
            filters.append(WatchlistEntry.national_id == cleaned_id)

        if name and len(name.strip()) > 3:
            name_clean = name.strip()
            filters.append(WatchlistEntry.name.ilike(f"%{name_clean}%"))

        if not filters:
            return []

        from sqlalchemy import or_
        return query.filter(or_(*filters)).all()

registry_service = RegistryService()
