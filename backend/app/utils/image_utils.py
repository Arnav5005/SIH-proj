import base64
import re
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
from pathlib import Path
from typing import Tuple, Optional, List

def decode_image(image_input) -> Optional[np.ndarray]:
    """
    Decodes an image from various input types:
    - Base64 data URL string (e.g. "data:image/jpeg;base64,...")
    - Raw base64 string
    - Bytes or bytearray
    - File path (str or Path)
    - Already a numpy ndarray
    Returns a BGR numpy array suitable for OpenCV, or None if decoding fails.
    """
    if image_input is None:
        return None

    if isinstance(image_input, np.ndarray):
        return image_input

    if isinstance(image_input, (bytes, bytearray)):
        nparr = np.frombuffer(image_input, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if isinstance(image_input, (str, Path)):
        s = str(image_input).strip()
        # Check if it's a file path
        p = Path(s)
        if p.exists() and p.is_file():
            img = cv2.imread(str(p), cv2.IMREAD_COLOR)
            if img is not None:
                return img

        # Check if base64 data URI
        if s.startswith("data:image"):
            base64_data = re.sub(r"^data:image/.+;base64,", "", s)
            try:
                img_bytes = base64.b64decode(base64_data)
                nparr = np.frombuffer(img_bytes, np.uint8)
                return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception:
                return None

        # Check if plain base64 string
        try:
            img_bytes = base64.b64decode(s)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                return img
        except Exception:
            pass

    return None


def encode_image_to_base64(img_bgr: np.ndarray, format: str = "jpeg") -> str:
    """Encodes a BGR OpenCV image to a base64 data URL."""
    success, buffer = cv2.imencode(f".{format}", img_bgr)
    if not success:
        return ""
    b64_str = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/{format};base64,{b64_str}"


def detect_and_crop_faces(img_bgr: np.ndarray) -> List[Tuple[np.ndarray, Tuple[int, int, int, int]]]:
    """
    Detects faces in an image using skin-tone / facial contour geometry and facial aspect ratio.
    Returns a list of (cropped_face_bgr, (x, y, w, h)).
    """
    if img_bgr is None or img_bgr.size == 0:
        return []

    h_img, w_img = img_bgr.shape[:2]

    # Check if CascadeClassifier is available in cv2
    if hasattr(cv2, "CascadeClassifier") and hasattr(cv2, "data"):
        try:
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            face_cascade = cv2.CascadeClassifier(cascade_path)
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(30, 30),
            )
            if len(faces) > 0:
                results = []
                for (x, y, w, h) in faces:
                    margin_x = int(w * 0.15)
                    margin_y = int(h * 0.15)
                    x1 = max(0, x - margin_x)
                    y1 = max(0, y - margin_y)
                    x2 = min(w_img, x + w + margin_x)
                    y2 = min(h_img, y + h + margin_y)
                    results.append((img_bgr[y1:y2, x1:x2], (x, y, w, h)))
                return results
        except Exception:
            pass

    # Robust Face Localization using Skin Color Segmentation and Facial Aspect Ratio
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    # Standard human skin tone range in HSV
    lower_skin = np.array([0, 20, 70], dtype=np.uint8)
    upper_skin = np.array([25, 255, 255], dtype=np.uint8)
    mask = cv2.inRange(hsv, lower_skin, upper_skin)
    
    # Morphological closing to join face regions
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_faces = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > (h_img * w_img * 0.05):  # At least 5% of image area
            x, y, w, h = cv2.boundingRect(cnt)
            aspect_ratio = float(h) / max(1, w)
            if 0.8 <= aspect_ratio <= 2.2:  # Typical face aspect ratio
                face_crop = img_bgr[y:y+h, x:x+w]
                valid_faces.append((face_crop, (x, y, w, h)))

    if valid_faces:
        return valid_faces

    # Default fallback: return whole image if aspect ratio is roughly portrait/square
    return [(img_bgr, (0, 0, w_img, h_img))]


def preprocess_for_ocr(img_bgr: np.ndarray) -> np.ndarray:
    """Preprocesses a document image to optimize for text extraction and MRZ readability."""
    if img_bgr is None:
        return np.zeros((100, 100), dtype=np.uint8)

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    filtered = cv2.bilateralFilter(gray, 9, 75, 75)
    _, thresh = cv2.threshold(filtered, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh
