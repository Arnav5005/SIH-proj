from typing import Dict, Any, List
from backend.app.config import settings

class RiskEngine:
    """
    Explainable Multi-Factor Risk Assessment Engine for Border Screening.
    Computes a weighted risk score and synthesizes concrete evidence reasons
    for officer decision support.
    """

    def evaluate(
        self,
        watchlist_matches: List[Any],
        validation_results: Dict[str, Any],
        tampering_results: Dict[str, Any],
        face_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        reasons: List[str] = []
        base_score = 0.0

        # 1. Watchlist Evaluation (Critical Threat Signal)
        if watchlist_matches:
            base_score += 80.0
            for w in watchlist_matches:
                circular = getattr(w, "circular_ref", "LOC Alert")
                desc = getattr(w, "description", "Central Security Circular Hit")
                reasons.append(f"CRITICAL WATCHLIST HIT: Subject flagged under {circular} ({desc})")

        # 2. Tampering & Forgery Evaluation
        tampering_detected = tampering_results.get("tampering_detected", False)
        tampering_score = tampering_results.get("tampering_score", 0.0)
        hologram_detected = tampering_results.get("hologram_detected", True)

        if tampering_detected or tampering_score >= settings.TAMPERING_SCORE_THRESHOLD:
            tamper_weight = 60.0 + (tampering_score / 100.0) * 25.0
            base_score = max(base_score, tamper_weight)
            reasons.append(f"Tampering/forgery anomalies detected on credential (Forensic anomaly score: {tampering_score}/100)")
            for anomaly in tampering_results.get("anomalies", []):
                reasons.append(f"Forensic evidence: {anomaly}")
        elif not hologram_detected:
            base_score += 35.0
            reasons.append("Hologram / optical security thread pattern integrity failure")

        # 3. Biometric Face Verification Evaluation
        face_match = face_results.get("match", False)
        face_sim = face_results.get("similarity_score") or 0.0
        face_status = face_results.get("status", "")

        if not face_match:
            if face_status == "ERROR_NO_FACE":
                base_score += 25.0
                reasons.append("Subject facial image missing or unreadable in live capture")
            else:
                face_penalty = 65.0 + max(0.0, (65.0 - face_sim) * 0.4)
                base_score = max(base_score, face_penalty)
                reasons.append(f"Biometric facial mismatch: Person in passport photo does NOT match live subject photo (Similarity: {face_sim}%)")
        else:
            reasons.append(f"AI Biometric Face Verification Verified: Person in passport photo matches live subject photo (Similarity: {face_sim}%)")

        # 4. Document & Registry Validation Evaluation
        val_status = validation_results.get("overall_status", "MATCH")
        is_registered = validation_results.get("is_registered", True)
        discrepancies = validation_results.get("discrepancies", [])

        if not is_registered:
            base_score = max(base_score, 45.0)
            reasons.append("Document / identity number is unverified in authorized border registry (Requires secondary verification)")
        elif val_status == "MISMATCH":
            base_score = max(base_score, 55.0 + (len(discrepancies) * 8.0))
            for d in discrepancies:
                reasons.append(f"Registry discrepancy: {d}")
        elif val_status == "EXPIRED":
            base_score = max(base_score, 50.0)
            reasons.append("Identity document or visa permit is expired")

        # 5. Calculate Final Score & Level
        if not reasons:
            final_score = 5
        else:
            final_score = int(round(min(100.0, max(5.0, base_score))))

        if watchlist_matches:
            level = "HIGH"
            status = "HIGH_RISK"
        elif final_score >= 65 or tampering_detected or (not face_match and face_sim < 45.0):
            level = "HIGH"
            status = "MISMATCH"
        elif final_score >= 40 or not face_match or val_status in ["EXPIRED", "MISMATCH"] or not is_registered:
            level = "MEDIUM"
            status = "NEEDS_REVIEW"
        else:
            level = "LOW"
            status = "VERIFIED"
            reasons.append("All primary identity, biometric, optical, and registry checks passed with high confidence.")

        return {
            "score": final_score,
            "level": level,
            "status": status,
            "reasons": reasons,
            "label": "Prototype Risk Score — Decision Support",
        }

risk_engine = RiskEngine()
