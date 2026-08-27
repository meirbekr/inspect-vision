"""
backend/main.py
────────────────
FastAPI application entry-point for Inspect-Vision.

- Initialises the app with metadata and CORS.
- Mounts /api routers from detect.py and history.py.
- Ensures required storage and sample directories exist on startup.
"""

from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.routes import detect, history
from backend.storage.database import engine, Base

# ── Load environment variables ────────────────────────────────────────────────
load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── CORS origins ──────────────────────────────────────────────────────────────
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ── FastAPI application ───────────────────────────────────────────────────────
app = FastAPI(
    title="Inspect-Vision API",
    description=(
        "AI-powered visual quality control system for manufacturing environments. "
        "Upload product images and receive real-time defect detection with annotated overlays."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "Inspect-Vision Engineering",
        "url": "https://github.com/inspect-vision",
    },
    license_info={
        "name": "MIT",
    },
)

# ── CORS middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(detect.router, prefix="/api", tags=["Detection"])
app.include_router(history.router, prefix="/api", tags=["History"])

# ── Static Media ──────────────────────────────────────────────────────────────
app.mount("/media", StaticFiles(directory="backend/storage/media"), name="media")



# ── Startup hook ──────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_checks() -> None:
    """Ensure required directories exist and log startup configuration."""

    required_dirs = [
        "backend/storage",
        "backend/storage/media",
        "backend/samples",
        "backend/models",
    ]
    for directory in required_dirs:
        os.makedirs(directory, exist_ok=True)
        logger.info("Directory ready: %s", directory)

    # Initialize SQLite tables
    Base.metadata.create_all(bind=engine)
    logger.info("Initialized SQLite database tables.")

    logger.info("✅  Inspect-Vision API started.")
    logger.info("    CORS allowed origins : %s", ALLOWED_ORIGINS)
    logger.info("    Model path           : %s", os.getenv("MODEL_PATH", "backend/models/yolov8n.pt"))
    logger.info("    Database path        : %s", os.getenv("DATABASE_URL", "sqlite:///backend/storage/inspections.db"))
    logger.info("    Max file size        : %s MB", os.getenv("MAX_FILE_SIZE_MB", "10"))


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"], summary="Health check endpoint")
async def health_check() -> dict:
    """Returns 200 OK with service status information."""
    return {
        "status": "healthy",
        "service": "Inspect-Vision API",
        "version": "1.0.0",
    }
