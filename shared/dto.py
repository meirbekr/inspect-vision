from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

class BoundingBox(BaseModel):
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)

class Defect(BaseModel):
    type: str = Field(...)
    confidence: float = Field(..., ge=0.0, le=1.0)
    boundingBox: BoundingBox = Field(...)

    @field_validator("type")
    @classmethod
    def normalize_type(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("confidence")
    @classmethod
    def round_confidence(cls, v: float) -> float:
        return round(v, 4)

class InspectionResult(BaseModel):
    inspectionId: str = Field(...)
    timestamp: str = Field(...)
    imageUrl: str = Field(...)
    defects: List[Defect] = Field(default_factory=list)
    totalDefects: int = Field(..., ge=0)
    status: str = Field(..., pattern=r"^(passed|failed)$")
    severityScore: int = Field(..., ge=0, le=100)

    @model_validator(mode="after")
    def validate_consistency(self) -> "InspectionResult":
        actual_count = len(self.defects)
        if self.totalDefects != actual_count:
            self.totalDefects = actual_count
        expected_status = "passed" if actual_count == 0 else "failed"
        if self.status != expected_status:
            self.status = expected_status
        return self

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat() + "Z"}
