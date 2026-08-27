"""
backend/routes/detect.py
─────────────────────────
FastAPI router for the POST /api/inspect endpoint.

Accepts multipart image uploads, runs the YOLOv8 defect detection pipeline,
annotates the image with bounding boxes, and persists the inspection record.
"""

from __future__ import annotations

import logging
import os
import cv2
from datetime import datetime, timezone

from typing import Optional
from dotenv import load_dotenv
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status, Depends
from sqlalchemy.orm import Session

from shared.dto import InspectionResult, Defect as DefectSchema
from backend.storage.database import get_db
from backend.storage.models import Inspection, Defect as DBDefect
from backend.detection.runtime import runtime_manager
from backend.utils.preprocessing import (
    draw_bounding_boxes,
    preprocess_image,
)

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Configuration ─────────────────────────────────────────────────────────────
MODEL_PATH: str = os.getenv("MODEL_PATH", "backend/models/yolov8n.pt")
MAX_FILE_SIZE_MB: float = float(os.getenv("MAX_FILE_SIZE_MB", "10"))
MEDIA_DIR: str = "backend/storage/media"

MAX_FILE_SIZE_BYTES: int = int(MAX_FILE_SIZE_MB * 1024 * 1024)

ALLOWED_CONTENT_TYPES: set[str] = {"image/jpeg", "image/jpg", "image/png"}
ALLOWED_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png"}

# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/inspect",
    response_model=InspectionResult,
    summary="Run defect detection on an uploaded product image",
    response_description="Full inspection result with defect list and annotated image URL",
)
async def inspect_image(
    file: UploadFile = File(..., description="Product image file (JPG or PNG, max 10 MB)"),
    modelId: str = Form("yolov8", description="Model ID to use for inference"),
    productName: Optional[str] = Form(None, description="Context for guided models"),
    db: Session = Depends(get_db)
) -> InspectionResult:
    """
    Upload a product image and receive a complete defect inspection report.

    **Processing pipeline:**
    1. Validate MIME type and file size.
    2. Decode and pre-process the image (letterbox + CLAHE).
    3. Run YOLOv8 defect detection.
    4. Draw annotated bounding boxes on the original image.
    5. Save images to disk and create a DB record.
    6. Calculate severity score and persist the record.

    **Error codes:**
    - `400 Unsupported file type` — only JPG/PNG accepted.
    - `400 File size exceeds 10MB limit` — file too large.
    - `500 Detection model error` — inference failure.
    """

    # ── 1. MIME type validation ────────────────────────────────────────────
    content_type = (file.content_type or "").lower()
    file_ext = os.path.splitext(file.filename or "")[1].lower()

    if content_type not in ALLOWED_CONTENT_TYPES and file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type",
        )

    # ── 2. Read bytes & size check ─────────────────────────────────────────
    image_bytes = await file.read()

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit",
        )

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    # ── 3. Preprocessing ───────────────────────────────────────────────────
    try:
        processed, original, original_size = preprocess_image(image_bytes)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    # ── 4. Defect detection ────────────────────────────────────────────────
    try:
        defects, severity_score = runtime_manager.run_inference(modelId, processed, context=productName)
    except Exception as exc:
        logger.exception("Unexpected error during detection: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Detection model error",
        )

    # ── 5. Scale bounding boxes from 640×640 → original dimensions ─────────
    orig_w, orig_h = original_size
    scale_x = orig_w / 640.0
    scale_y = orig_h / 640.0

    for defect in defects:
        bb = defect.boundingBox
        bb.x = int(bb.x * scale_x)
        bb.y = int(bb.y * scale_y)
        bb.width = int(bb.width * scale_x)
        bb.height = int(bb.height * scale_y)
        # Clamp to image bounds
        bb.x = max(0, min(bb.x, orig_w - 1))
        bb.y = max(0, min(bb.y, orig_h - 1))
        bb.width = max(1, min(bb.width, orig_w - bb.x))
        bb.height = max(1, min(bb.height, orig_h - bb.y))

    # ── 6. Annotate original image ─────────────────────────────────────────
    annotated = draw_bounding_boxes(original, defects)

    # ── 7. Generate ID and Save Images to Disk ──────────────────────────────
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"insp_{today}_"
    count = db.query(Inspection).filter(Inspection.id.startswith(prefix)).count()
    inspection_id = f"{prefix}{count + 1:03d}"

    orig_filename = f"{inspection_id}_orig.jpg"
    ann_filename = f"{inspection_id}_ann.jpg"
    orig_path = os.path.join(MEDIA_DIR, orig_filename)
    ann_path = os.path.join(MEDIA_DIR, ann_filename)

    cv2.imwrite(orig_path, original)
    cv2.imwrite(ann_path, annotated)

    image_url = f"http://localhost:8000/media/{ann_filename}"

    # ── 8. Compose and Persist Result ──────────────────────────────────────
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    total_defects = len(defects)
    result_status = "passed" if total_defects == 0 else "failed"

    # Save to SQLite
    db_inspection = Inspection(
        id=inspection_id,
        timestamp=timestamp,
        original_image_path=orig_path,
        annotated_image_path=ann_path,
        model_id=modelId,
        product_name=productName,
        total_defects=total_defects,
        severity_score=severity_score,
        status=result_status,
    )
    db.add(db_inspection)
    db.flush() # flush to get inspection saved before defects (not strictly necessary but safe)

    for d in defects:
        db_defect = DBDefect(
            inspection_id=inspection_id,
            type=d.type,
            confidence=d.confidence,
            x=d.boundingBox.x,
            y=d.boundingBox.y,
            width=d.boundingBox.width,
            height=d.boundingBox.height,
        )
        db.add(db_defect)
    db.commit()

    logger.info(
        "Inspection %s complete: %d defect(s), status=%s, score=%d",
        inspection_id,
        total_defects,
        result_status,
        severity_score,
    )

    return InspectionResult(
        inspectionId=inspection_id,
        timestamp=timestamp,
        imageUrl=image_url,
        defects=defects,
        totalDefects=total_defects,
        status=result_status,
        severityScore=severity_score,
    )

@router.post(
    "/stream",
    summary="Real-time non-persisted frame inspection",
)
async def stream_frame(
    file: UploadFile = File(...),
    modelId: str = Form("yolov8"),
    productName: Optional[str] = Form(None),
) -> dict:
    image_bytes = await file.read()
    try:
        processed, original, original_size = preprocess_image(image_bytes)
        defects, severity_score = runtime_manager.run_inference(modelId, processed, context=productName)
        
        orig_w, orig_h = original_size
        scale_x = orig_w / 640.0
        scale_y = orig_h / 640.0

        for defect in defects:
            bb = defect.boundingBox
            bb.x = int(bb.x * scale_x)
            bb.y = int(bb.y * scale_y)
            bb.width = int(bb.width * scale_x)
            bb.height = int(bb.height * scale_y)
            bb.x = max(0, min(bb.x, orig_w - 1))
            bb.y = max(0, min(bb.y, orig_h - 1))
            bb.width = max(1, min(bb.width, orig_w - bb.x))
            bb.height = max(1, min(bb.height, orig_h - bb.y))

        annotated = draw_bounding_boxes(original, defects)
        # For stream, return base64 since it's not persisted
        from backend.utils.preprocessing import encode_image_base64
        image_url = encode_image_base64(annotated)
        
        return {
            "defects": [d.model_dump() for d in defects],
            "severityScore": severity_score,
            "imageUrl": image_url
        }
    except Exception as exc:
        logger.exception("Stream inference error: %s", exc)
        raise HTTPException(status_code=500, detail="Inference failed")

