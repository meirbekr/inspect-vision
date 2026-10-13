# Inspect-Vision — AI-Powered Visual Quality Control System

> **Production-grade defect detection for manufacturing environments.**  
> Upload product images → receive real-time AI analysis with annotated overlays → track quality metrics over time.

---

## Table of Contents

1. [Project Objective & Architecture Overview](#1-project-objective--architecture-overview)  
2. [Prerequisites & System Requirements](#2-prerequisites--system-requirements)  
3. [Step-by-Step Setup Instructions](#3-step-by-step-setup-instructions)  
4. [Model Management & Inference](#4-model-management--inference)  
5. [API Documentation](#5-api-documentation)  
6. [Interactive Operator Features & UI Guide](#6-interactive-operator-features--ui-guide)  
7. [Repository Folder Structure](#7-repository-folder-structure)  
8. [Tools & Technologies](#8-tools--technologies)  

---

## 1. Project Objective & Architecture Overview

Inspect-Vision gives manufacturing plant operators and quality control engineers a modern web interface to:

- **Upload** product photos via drag-and-drop or select from built-in procedural test samples.
- **Detect** surface defects (scratches, dents, cracks, discoloration) using specialist vision models (e.g., YOLOv8, Bayes-PFL).
- **Stream** real-time camera frames for on-the-fly continuous inspection without disk bloating.
- **Inspect Interactively** with zoom & pan (up to 5x), original/overlay toggle, and defect focus highlighting.
- **Receive Audio Feedback** via Web Audio API tones (Passed / Failed) for noisy shop-floor environments.
- **Review & Export** historical records with search, date filters, CSV downloads, and printable official QC certificates.
- **Track Metrics** on an analytical dashboard featuring pass rate, severity score, and defect distribution charts.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Port 5173)                     │
│                                                                 │
│  React 18 + Vite + TanStack Router                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────┐  │
│  │Dashboard │  │LiveInspection│  │  History  │  │ Details  │  │
│  └──────────┘  └──────┬───────┘  └─────┬─────┘  └────┬─────┘  │
│       ▲               │                │              │        │
│  Web Audio / Hotkeys  │                │              │        │
│  Axios API Client ────┴────────────────┴──────────────┘        │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTP / multipart
┌─────────────────────────────────▼───────────────────────────────┐
│                       FastAPI (Port 8000)                       │
│                                                                 │
│  POST /api/inspect/stream ──► preprocessing.py                 │
│                               │ Grayscale + CLAHE + resize      │
│                               ▼                                 │
│                      DetectionRuntimeManager                   │
│                               │ Lazy-loads & Locks Models       │
│                     ┌─────────┴─────────┐                       │
│                     ▼                   ▼                       │
│              YOLOv8Adapter        BayesPFLAdapter               │
│                                                                 │
│  GET/DELETE /api/history  ──► SQLAlchemy (SQLite)              │
│  GET /media/*             ──► Static Files (Original/Annotated)│
└─────────────────────────────────────────────────────────────────┘
```

### Technical Stack

| Layer          | Technology                                   |
|---------------|----------------------------------------------|
| Frontend      | React 18, Vite 5, TanStack Router v1          |
| Styling       | Tailwind CSS 3, custom glassmorphism theme    |
| Audio         | Web Audio API (zero-asset procedural audio)   |
| Contracts     | Shared DTOs (`shared/dto.py`, `shared/types.js`) |
| Backend       | Python 3.10+, FastAPI 0.141                   |
| Validation    | Pydantic v2                                   |
| Database      | SQLite via SQLAlchemy ORM                     |
| Vision & Math | Ultralytics YOLOv8, OpenCV, NumPy             |

---

## 2. Prerequisites & System Requirements

| Requirement         | Minimum Version | Notes                                  |
|--------------------|-----------------|----------------------------------------|
| Python             | 3.10+           | 3.11 recommended for best performance  |
| pip                | 23+             | Bundled with Python 3.10+              |
| Node.js            | 18+             | LTS release recommended                |
| npm                | 9+              | Bundled with Node 18+                  |
| RAM                | 4 GB            | 8 GB+ recommended for YOLOv8 inference |
| OS                 | Windows / macOS / Linux | Cross-platform supported       |

---

## 3. Step-by-Step Setup Instructions

### Option A: Quick Setup via Makefile (Recommended)

Our cross-platform `Makefile` works seamlessly on **macOS**, **Linux**, and **Windows**:

#### 1. One-command Installation
Sets up the Python virtual environment (`.venv`), installs dependencies, creates `.env`, and installs frontend Node modules:
```bash
make install
```

#### 2. One-command Launch
Starts both the FastAPI Backend (`http://localhost:8000`) and the React Frontend (`http://localhost:5173`) concurrently:
```bash
make run
```
*Note: The SQLite database and media folders are generated automatically on startup.*

---

### Option B: Manual Setup (Step-by-Step)

#### 1. Backend Setup
```bash
# Navigate to project root
cd inspect-vision

# Create and activate Python virtual environment
python -m venv .venv

# Activate virtualenv (macOS/Linux):
source .venv/bin/activate
# Or on Windows:
.venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env

# Start FastAPI backend (run from root directory)
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend Setup
In a second terminal window:
```bash
cd frontend
npm install
npm run dev
```

Frontend application will open at **`http://localhost:5173`**.

---

## 4. Model Management & Inference

Inspect-Vision supports multiple Computer Vision models simultaneously, managed gracefully by `DetectionRuntimeManager`:

### Supported Adapters
- **YOLOv8Adapter**: Domain-specialised defect detection (`yolov8_defects.pt`, `crack_detection.pt`, `defect_neu_yolov8.pt`).
- **BayesPFLAdapter**: Category-guided anomaly localization via CLIP prompt context (e.g., `modelId="general"`, `productName="bottle"`).
- **Graceful Fallback Mode**: If model weights files are absent, adapters automatically operate in deterministic simulation (DEMO) mode, allowing complete end-to-end UI and API testing out-of-the-box.

### Thread-Safe Execution
The runtime manager employs lazy loading and enforces a shared `threading.Lock` during inference to prevent race conditions and GPU out-of-memory errors in concurrent production environments.

---

## 5. API Documentation

### Route Summary

| Method   | Endpoint                    | Description                              |
|----------|-----------------------------|------------------------------------------|
| `POST`   | `/api/inspect`              | Upload image, run detection, save to DB  |
| `POST`   | `/api/stream`               | Real-time inspection (no DB/disk storage)|
| `GET`    | `/api/history`              | List inspections (filters + `q` search)  |
| `GET`    | `/api/history/{id}`         | Fetch single inspection record           |
| `DELETE` | `/api/history/{id}`         | Delete record and associated media files |
| `POST`   | `/api/history/clear`        | Wipe SQLite DB and clean media folder    |
| `GET`    | `/api/export`               | Download inspection history as CSV       |
| `GET`    | `/media/{file}`             | Serve original and annotated JPG files   |

---

## 6. Interactive Operator Features & UI Guide

### 🔍 1. Interactive Canvas with Zoom & Pan
- **Mouse Wheel Zoom**: Smooth zoom from **1.0x to 5.0x** centered on the cursor.
- **Drag & Pan**: When zoomed in (`> 1.0x`), click and drag anywhere on the canvas to inspect micro-cracks and tiny surface scratches.
- **Zoom Toolbar**: Zoom In (`+`), Zoom Out (`-`), and Reset View (`RotateCcw` or hotkey `0`).
- **Clean Image Toggle**: Click the eye icon or press `H` to toggle between the original photo and annotated bounding boxes.

### 🎯 2. Defect Focus Highlighting
- Hovering or clicking any defect card in the defect list immediately spotlights that defect on the canvas with a glowing border and shadow, while other bounding boxes are gently dimmed.

### ⚡ 3. One-Click Quick Demo Samples
Under the upload dropzone, three built-in procedural samples can be generated instantly without searching for images:
- 🟢 **Clean Metal Plate** — Produces a defect-free part (`Passed`).
- 🔴 **Concrete Crack** — Features a prominent structural fracture.
- 🟡 **Scratches & Dent** — Displays mechanical surface imperfections.

### 🔊 4. Shop-Floor Audio Feedback (Web Audio API)
- **Passed Sound**: Harmonic ascending chime (`C5 → E5 → G5`) confirms defect-free parts.
- **Failed Sound**: Soft double warning buzzer (`E4 → C4`) alerts of defects found.
- Sound can be toggled on/off in the top navbar (`Volume2` / `VolumeX`) with preferences remembered in `localStorage`.

### 📄 5. Official QC Inspection Act Printing & PDF Export
- Click **"Печать"** on the inspection details page to print or save a formal PDF inspection document.
- Custom `@media print` styling strips navigation, backgrounds, and buttons, formatting the inspection into a formal QC Certificate with:
  - Enterprise inspection header and timestamp;
  - Annotated part photo;
  - Detailed defect breakdown table;
  - Official QC inspector signature and stamp block.

### 📋 6. Instant Summary Copy
- Click **"Копировать"** on any inspection card to copy a markdown summary directly to your clipboard for defect tracking and messaging:
  ```text
  📋 Акт инспекции: #insp_20261013_001
  Статус: ❌ FAILED
  Оценка качества: 75/100
  Дефектов обнаружено: 2 шт.
  Детализация: scratch (88%), dent (74%)
  Дата инспекции: 13 Oct 2026 · 15:20 UTC
  ```

### ⌨️ 7. Operator Keyboard Shortcuts
Click the keyboard icon in the header for a quick reference overlay:
- `H` — Toggle defect bounding box overlay on/off;
- `0` — Reset canvas zoom and pan to 100%;
- `Esc` — Reset current inspection to start a new check;
- `Mouse Wheel` — Zoom in/out on inspection image.

### 📊 8. Defect Taxonomy Distribution
The dashboard features an automated **Defect Distribution** breakdown chart calculating occurrences and percentage ratios across all historical defect categories (`crack`, `scratch`, `dent`, `discoloration`).

---

## 7. Repository Folder Structure

```text
inspect-vision/
│
├── frontend/                         # React 18 + Vite SPA
│   ├── package.json                  # Dependencies (TanStack Router, Lucide, Tailwind)
│   ├── vite.config.js                # Vite config with backend /api proxy
│   └── src/
│       ├── App.jsx                   # Router tree configuration
│       ├── index.css                 # Glassmorphism styling and @media print rules
│       ├── routes/
│       │   ├── __root.jsx            # Layout with navbar, audio toggle, and shortcut modal
│       │   ├── index.jsx             # Dashboard with metrics, pass rate, and defect distribution
│       │   ├── inspect.jsx           # Live inspection view with drag-and-drop & shortcuts
│       │   ├── history.jsx           # Filterable, exportable history table
│       │   └── details.$id.jsx       # Detailed report view with printable act layout
│       ├── components/
│       │   ├── DefectOverlay.jsx     # Canvas with zoom, pan, overlay toggle, and defect focus
│       │   ├── ImageUploader.jsx     # Upload dropzone + Quick Demo Sample chips
│       │   ├── DefectList.jsx        # Defect items with hover focus integration
│       │   ├── InspectionCard.jsx    # Card with severity dial, copy summary, and print buttons
│       │   ├── InspectionViewer.jsx  # Inspection results coordinator
│       │   └── HistoryTable.jsx      # Historical data grid with CSV export
│       ├── hooks/
│       │   └── useInspection.js      # Inspection state manager with audio triggers
│       └── utils/
│           ├── apiClient.js          # Axios HTTP client with error handling
│           ├── soundEffects.js       # Procedural audio generator (Web Audio API)
│           └── demoSamples.js        # Synthetic test sample generator
│
├── backend/                          # FastAPI Python backend
│   ├── main.py                       # Application entrypoint & static media mount
│   ├── detection/
│   │   ├── runtime.py                # DetectionRuntimeManager (thread-safe, lazy-load)
│   │   └── adapters.py               # YOLOv8 & BayesPFL adapters + demo simulation
│   ├── storage/
│   │   ├── database.py               # SQLite connection & SQLAlchemy session provider
│   │   └── models.py                 # Inspection and Defect ORM schemas
│   ├── routes/
│   │   ├── detect.py                 # POST /api/inspect and POST /api/stream
│   │   └── history.py                # History retrieval, deletion, and CSV export
│   ├── utils/
│   │   ├── preprocessing.py          # OpenCV Letterbox, CLAHE, and drawing tools
│   │   └── model_loader.py           # Fallback model loading utilities
│   ├── models/                       # Model weights directory (.pt, .pth)
│   ├── samples/                      # Manufacturing defect demo corpus
│   └── train_model.py                # YOLOv8 fine-tuning and dataset preparation script
│
├── shared/                           # Contract definitions
│   ├── dto.py                        # Pydantic schemas (Backend)
│   └── types.js                      # JSDoc definitions (Frontend)
│
├── Makefile                          # Cross-platform automation (install, run)
├── .env.example                      # Environment variables template
├── requirements.txt                  # Python dependencies
└── README.md                         # Project documentation
```

---

## 8. Tools & Technologies

- **FastAPI** — High-performance asynchronous API framework with automatic OpenAPI documentation (`/docs`).
- **Ultralytics YOLOv8** — State-of-the-art vision models for bounding-box defect localization.
- **OpenCV** — Robust image pre-processing with CLAHE contrast enhancement and letterboxing.
- **SQLAlchemy 2.0 & SQLite** — Reliable relational persistence for inspection records and defect coordinates.
- **React 18 & TanStack Router** — Type-safe, declarative client-side routing and reactive UI.
- **Tailwind CSS 3** — Modern utility-first glassmorphism design system.
- **Web Audio API** — Hardware-accelerated, zero-asset audio synthesis for operator notifications.

---

*Built with ❤️ for modern industrial quality control.*
