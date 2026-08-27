from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.storage.database import Base

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(String, index=True)
    original_image_path = Column(String)
    annotated_image_path = Column(String)
    model_id = Column(String, index=True, nullable=True)
    product_name = Column(String, index=True, nullable=True)
    total_defects = Column(Integer, default=0)
    severity_score = Column(Float, default=100)
    status = Column(String, index=True)

    defects = relationship("Defect", back_populates="inspection", cascade="all, delete-orphan")

class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    inspection_id = Column(String, ForeignKey("inspections.id", ondelete="CASCADE"))
    type = Column(String, index=True)
    confidence = Column(Float)
    x = Column(Integer)
    y = Column(Integer)
    width = Column(Integer)
    height = Column(Integer)

    inspection = relationship("Inspection", back_populates="defects")
