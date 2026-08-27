"""
backend/utils/preprocessing.py
───────────────────────────────
OpenCV image preprocessing utilities for the Inspect-Vision defect detection
pipeline. Handles decoding, resizing, contrast enhancement, and Base64 encoding.
"""

from __future__ import annotations

import base64
from typing import Tuple

import cv2
import numpy as np


def preprocess_image(
    image_bytes: bytes,
    target_size: Tuple[int, int] = (640, 640),
) -> Tuple[np.ndarray, np.ndarray, Tuple[int, int]]:
    """Decode and preprocess raw image bytes for YOLOv8 inference.

    Steps:
    1. Decode bytes → BGR OpenCV image.
    2. Record original dimensions (needed to scale bounding boxes back).
    3. Letterbox-resize to ``target_size`` to preserve aspect ratio without
       distortion.
    4. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) on the
       luminance channel to enhance surface defect visibility.

    Args:
        image_bytes: Raw bytes from the uploaded file.
        target_size:  (width, height) expected by the YOLO model (default 640×640).

    Returns:
        A tuple of:
        - ``processed``: Float32 numpy array of shape ``(H, W, 3)`` ready for
          YOLO inference.
        - ``original``: Original BGR image array (uint8) for annotation drawing.
        - ``original_size``: ``(original_width, original_height)`` tuple.

    Raises:
        ValueError: If the bytes cannot be decoded as a valid image.
    """
    # ── 1. Decode ────────────────────────────────────────────────────────────
    nparr = np.frombuffer(image_bytes, dtype=np.uint8)
    original = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if original is None:
        raise ValueError("Could not decode image bytes. Ensure the upload is a valid image file.")

    orig_h, orig_w = original.shape[:2]
    original_size: Tuple[int, int] = (orig_w, orig_h)

    # ── 2. Letterbox resize ──────────────────────────────────────────────────
    processed = _letterbox(original, target_size)

    # ── 3. CLAHE contrast enhancement ───────────────────────────────────────
    processed = _apply_clahe(processed)

    return processed, original, original_size


def _letterbox(
    image: np.ndarray,
    target_size: Tuple[int, int],
    color: Tuple[int, int, int] = (114, 114, 114),
) -> np.ndarray:
    """Resize ``image`` to ``target_size`` with letterbox padding.

    Maintains aspect ratio by adding grey padding bars on the shorter axis.
    The resulting image has shape ``(target_size[1], target_size[0], 3)``
    with dtype ``float32`` values in the range ``[0.0, 1.0]``.

    Args:
        image:       Input BGR image (uint8).
        target_size: ``(target_w, target_h)`` output dimensions.
        color:       RGB padding colour (default neutral grey ``114, 114, 114``).

    Returns:
        Letterboxed float32 image.
    """
    target_w, target_h = target_size
    orig_h, orig_w = image.shape[:2]

    # Scale factor – uniform to maintain AR
    scale = min(target_w / orig_w, target_h / orig_h)
    new_w, new_h = int(round(orig_w * scale)), int(round(orig_h * scale))

    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    # Padding amounts
    pad_w = (target_w - new_w) // 2
    pad_h = (target_h - new_h) // 2

    canvas = np.full((target_h, target_w, 3), color, dtype=np.uint8)
    canvas[pad_h : pad_h + new_h, pad_w : pad_w + new_w] = resized

    return canvas.astype(np.float32) / 255.0


def _apply_clahe(image_float: np.ndarray) -> np.ndarray:
    """Apply grayscale conversion and CLAHE contrast enhancement.

    Enhances local contrast which makes surface defects (scratches, cracks,
    discoloration) significantly more visible to the model.

    Args:
        image_float: Float32 image with values in ``[0.0, 1.0]`` (BGR order).

    Returns:
        Grayscale and contrast-enhanced float32 image (3 channels for YOLO).
    """
    # Convert float → uint8 for OpenCV colour space conversion
    image_uint8 = (image_float * 255).astype(np.uint8)

    # 1. Convert to grayscale
    gray = cv2.cvtColor(image_uint8, cv2.COLOR_BGR2GRAY)

    # 2. Apply CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_gray = clahe.apply(gray)

    # 3. Convert back to BGR (YOLO and drawing functions expect 3 channels)
    enhanced_bgr = cv2.cvtColor(enhanced_gray, cv2.COLOR_GRAY2BGR)

    return enhanced_bgr.astype(np.float32) / 255.0


def draw_bounding_boxes(
    image: np.ndarray,
    defects: list,
) -> np.ndarray:
    """Render defect bounding boxes and labels onto a copy of ``image``.

    Colour coding (matches the frontend DefectOverlay rules):
    - Green  (0, 200, 0)   : confidence > 0.90
    - Yellow (0, 200, 200) : confidence 0.70 – 0.90
    - Red    (0, 0, 220)   : confidence < 0.70

    Args:
        image:   Original BGR uint8 image array.
        defects: List of ``Defect`` Pydantic objects (or dicts with the same
                 keys: ``type``, ``confidence``, ``boundingBox``).

    Returns:
        Annotated BGR uint8 image copy.
    """
    annotated = image.copy()

    for defect in defects:
        # Support both Pydantic model instances and plain dicts
        if hasattr(defect, "boundingBox"):
            bb = defect.boundingBox
            conf = defect.confidence
            dtype = defect.type
            x, y, w, h = bb.x, bb.y, bb.width, bb.height
        else:
            bb = defect["boundingBox"]
            conf = defect["confidence"]
            dtype = defect["type"]
            x, y, w, h = bb["x"], bb["y"], bb["width"], bb["height"]

        # ── Colour based on confidence ───────────────────────────────────────
        if conf > 0.90:
            color = (0, 200, 0)       # Green
        elif conf >= 0.70:
            color = (0, 200, 200)     # Yellow
        else:
            color = (0, 0, 220)       # Red

        # ── Draw rectangle ───────────────────────────────────────────────────
        cv2.rectangle(annotated, (x, y), (x + w, y + h), color, 2)

        # ── Label tag ────────────────────────────────────────────────────────
        label = f"{dtype} ({int(conf * 100)}%)"
        (text_w, text_h), baseline = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1
        )
        # Background rectangle for readability
        label_y = max(y - text_h - baseline - 4, 0)
        cv2.rectangle(
            annotated,
            (x, label_y),
            (x + text_w + 4, label_y + text_h + baseline + 4),
            color,
            cv2.FILLED,
        )
        cv2.putText(
            annotated,
            label,
            (x + 2, label_y + text_h + 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    return annotated


def encode_image_base64(image_array: np.ndarray) -> str:
    """Encode an OpenCV BGR image array into a Base64 JPEG data URL.

    The returned string is directly usable as the ``src`` of an ``<img>`` tag
    or as input to the HTML5 Canvas API in the React frontend.

    Args:
        image_array: OpenCV BGR image (uint8) to encode.

    Returns:
        String of the form ``data:image/jpeg;base64,<base64_data>``.

    Raises:
        ValueError: If OpenCV fails to encode the image.
    """
    success, buffer = cv2.imencode(".jpg", image_array, [cv2.IMWRITE_JPEG_QUALITY, 92])
    if not success:
        raise ValueError("Failed to encode image as JPEG.")

    b64_string = base64.b64encode(buffer.tobytes()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_string}"
