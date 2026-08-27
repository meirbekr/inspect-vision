"""
backend/routes/history.py
──────────────────────────
FastAPI router for inspection history management endpoints using SQLite.

Routes:
  GET    /api/history          – List all (optionally filtered) inspections
  GET    /api/history/{id}     – Fetch a single inspection by ID
  DELETE /api/history/{id}     – Remove a specific inspection
  POST   /api/history/clear    – Wipe all inspection records
  GET    /api/export           – Download history as a CSV file
"""

from __future__ import annotations

import csv
import io
import logging
import os
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query, status, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from shared.dto import InspectionResult
from backend.storage.database import get_db
from backend.storage.models import Inspection, Defect

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Helper utilities
# ─────────────────────────────────────────────────────────────────────────────

def _build_inspection_result(db_inspection: Inspection) -> dict:
    """Helper to convert SQLAlchemy Inspection to dict matching InspectionResult schema."""
    defects_list = []
    for d in db_inspection.defects:
        defects_list.append({
            "type": d.type,
            "confidence": d.confidence,
            "boundingBox": {
                "x": d.x,
                "y": d.y,
                "width": d.width,
                "height": d.height
            }
        })
    
    return {
        "inspectionId": db_inspection.id,
        "timestamp": db_inspection.timestamp,
        "imageUrl": f"http://localhost:8000/media/{os.path.basename(db_inspection.annotated_image_path)}" if db_inspection.annotated_image_path else "",
        "defects": defects_list,
        "totalDefects": db_inspection.total_defects,
        "status": db_inspection.status,
        "severityScore": int(db_inspection.severity_score) if db_inspection.severity_score else 100
    }

def _apply_filters(query, start_date: Optional[str], end_date: Optional[str], defect_type: Optional[str], q: Optional[str] = None):
    """Apply optional date-range, defect-type, and query filters to a record query."""
    if start_date:
        query = query.filter(Inspection.timestamp >= start_date)

    if end_date:
        # Append 'Z' sentinel to make the end_date inclusive up to end-of-day
        end_sentinel = end_date + "T23:59:59Z" if "T" not in end_date else end_date
        query = query.filter(Inspection.timestamp <= end_sentinel)

    if defect_type:
        dtype_lower = defect_type.strip().lower()
        query = query.join(Defect).filter(Defect.type.ilike(dtype_lower))

    if q:
        search_pattern = f"%{q}%"
        query = query.filter(Inspection.id.ilike(search_pattern))

    return query


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/history",
    summary="List all inspection records",
    response_description="Array of InspectionResult objects",
)
async def list_history(
    start_date: Optional[str] = Query(None, description="Filter from this ISO-8601 date (e.g. 2025-01-01)"),
    end_date: Optional[str] = Query(None, description="Filter up to this ISO-8601 date (e.g. 2025-12-31)"),
    defect_type: Optional[str] = Query(None, description="Filter by defect type: scratch | dent | crack | discoloration"),
    q: Optional[str] = Query(None, description="Search by inspection ID"),
    db: Session = Depends(get_db)
) -> List[dict]:
    """Return all stored inspections with optional filtering.
    Results are returned in reverse-chronological order (newest first).
    """
    query = db.query(Inspection)
    query = _apply_filters(query, start_date, end_date, defect_type, q)
    
    records = query.order_by(Inspection.timestamp.desc()).all()
    
    summary = []
    for r in records:
        entry = _build_inspection_result(r)
        # The URL is small now (no Base64), so it's fine to include in the list response
        summary.append(entry)

    return summary


@router.get(
    "/history/{inspection_id}",
    response_model=InspectionResult,
    summary="Fetch a single inspection record by ID",
)
async def get_inspection(inspection_id: str, db: Session = Depends(get_db)) -> dict:
    """Return the full inspection record including the image URL."""
    record = db.query(Inspection).filter(Inspection.id == inspection_id).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection not found",
        )

    return _build_inspection_result(record)


@router.delete(
    "/history/{inspection_id}",
    summary="Delete a specific inspection record",
)
async def delete_inspection(inspection_id: str, db: Session = Depends(get_db)) -> dict:
    """Remove a single inspection record by ID and its media files."""
    record = db.query(Inspection).filter(Inspection.id == inspection_id).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection not found",
        )

    # Delete media files
    if record.original_image_path and os.path.exists(record.original_image_path):
        os.remove(record.original_image_path)
    if record.annotated_image_path and os.path.exists(record.annotated_image_path):
        os.remove(record.annotated_image_path)

    db.delete(record)
    db.commit()
    logger.info("Deleted inspection %s.", inspection_id)

    return {"message": f"Inspection {inspection_id} deleted successfully."}


@router.post(
    "/history/clear",
    summary="Clear all inspection records",
)
async def clear_history(db: Session = Depends(get_db)) -> dict:
    """Wipe the entire inspection history from the database and disk."""
    records = db.query(Inspection).all()
    for r in records:
        if r.original_image_path and os.path.exists(r.original_image_path):
            os.remove(r.original_image_path)
        if r.annotated_image_path and os.path.exists(r.annotated_image_path):
            os.remove(r.annotated_image_path)
        db.delete(r)

    db.commit()
    logger.info("Inspection history cleared.")
    return {"message": "All inspection records cleared successfully."}


@router.get(
    "/export",
    summary="Export inspection history as a CSV file",
    response_class=StreamingResponse,
)
async def export_csv(
    start_date: Optional[str] = Query(None, description="ISO-8601 start date filter"),
    end_date: Optional[str] = Query(None, description="ISO-8601 end date filter"),
    defect_type: Optional[str] = Query(None, description="Defect type filter"),
    q: Optional[str] = Query(None, description="Search filter"),
    db: Session = Depends(get_db)
) -> StreamingResponse:
    """Stream the inspection history as a downloadable CSV file."""
    query = db.query(Inspection)
    query = _apply_filters(query, start_date, end_date, defect_type, q)
    records = query.order_by(Inspection.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "inspection_id",
            "timestamp",
            "defect_count",
            "types",
            "status",
            "severity_score",
        ],
    )
    writer.writeheader()

    for r in records:
        types_str = "; ".join(sorted({d.type for d in r.defects})) or "none"

        writer.writerow(
            {
                "inspection_id": r.id,
                "timestamp": r.timestamp,
                "defect_count": r.total_defects,
                "types": types_str,
                "status": r.status,
                "severity_score": int(r.severity_score) if r.severity_score else 100,
            }
        )

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=inspect_vision_history.csv"
        },
    )
