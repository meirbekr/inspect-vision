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
6. [Usage Guide for Operators](#6-usage-guide-for-operators)  
7. [Repository Folder Structure](#7-repository-folder-structure)  
8. [Tools & Technologies](#8-tools--technologies)  

---

## 1. Project Objective & Architecture Overview

Inspect-Vision gives manufacturing plant operators a web-based interface to:

- **Upload** product photos via drag-and-drop or file picker.
- **Detect** surface defects (scratches, dents, cracks, discoloration) using a suite of AI vision models (e.g., YOLOv8, Bayes-PFL).
- **Stream** real-time camera frames for on-the-fly inspection without bloating storage.
- **Visualise** results on an annotated canvas with colour-coded bounding boxes.
- **Review** past inspections in a filterable, exportable history table stored reliably in a SQL database.
- **Track** quality trends on a real-time dashboard (pass rate, severity score, top defect type).

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Port 5173)                     │
│                                                                 │
│  React 18 + Vite + TanStack Router                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────┐  │
│  │Dashboard │  │LiveInspection│  │  History  │  │ Details  │  │
│  └──────────┘  └──────┬───────┘  └─────┬─────┘  └────┬─────┘  │
│                        │                │              │        │
│  Axios API Client ──────┴────────────────┴──────────────┘       │
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
| Contracts     | Shared DTOs (`shared/dto.py`, `shared/types.js`) |
| Backend       | Python 3.10+, FastAPI 0.111                   |
| Validation    | Pydantic v2                                   |
| Database      | SQLite via SQLAlchemy ORM                     |
| Vision        | Ultralytics YOLOv8, OpenCV                    |

---

## 2. Prerequisites & System Requirements

| Requirement         | Minimum Version | Notes                                  |
|--------------------|-----------------|----------------------------------------|
| Python             | 3.10+           | 3.11 recommended for best performance  |
| pip                | 23+             | Bundled with Python 3.10+              |
| Node.js            | 18+             | LTS release recommended                |
| npm                | 9+              | Bundled with Node 18+                  |
| RAM                | 4 GB            | 8 GB+ recommended for YOLOv8 inference |
| OS                 | Windows / macOS / Linux | Cross-platform supported           |

---

## 3. Step-by-Step Setup Instructions

### Option A: Quick Setup via Makefile (Recommended)

Our cross-platform `Makefile` works seamlessly on **macOS**, **Linux**, and **Windows**.

#### 1. One-command Installation
Installs Python dependencies, sets up the virtual environment (`.venv`), creates `.env`, and installs frontend Node modules:
```bash
make install
```

#### 2. One-command Launch
Starts both the FastAPI Backend (`http://localhost:8000`) and the React Frontend (`http://localhost:5173`) concurrently. **The SQLite database and media folders will be generated automatically.**
```bash
make run
```

---

### Option B: Manual Setup (Step-by-Step)

If you prefer to set up and run the services manually in separate terminal windows:

#### 1. Backend Setup

```bash
# Navigate to the project root
cd inspect-vision

# Create and activate a Python virtual environment
python -m venv .venv

# Activate virtualenv (macOS/Linux):
source .venv/bin/activate
# Or on Windows:
.venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env

# Start FastAPI backend (must be run from project ROOT)
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend Setup

In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at **`http://localhost:5173`**.

---

## 4. Model Management & Inference

Inspect-Vision supports multiple Computer Vision models simultaneously, gracefully managed by the `DetectionRuntimeManager`. This allows operators to run different models on different products (e.g., concrete vs. steel) without memory bloat.

### Supported Adapters
- **YOLOv8Adapter**: For domain-specialised bounding-box localization (`crack_detection.pt`, `yolov8_defects.pt`).
- **BayesPFLAdapter**: For generalized category-guided anomaly localization via CLIP prompt context (e.g., `modelId="general"`, `productName="bottle"`).

### Thread-Safe Execution
The runtime manager features lazy loading (models are loaded onto the GPU/CPU only on first request) and uses `threading.Lock` during inference to prevent race conditions and GPU out-of-memory errors in high-throughput environments.

---

## 5. API Documentation

### Route Summary

| Method   | Endpoint                    | Description                              |
|----------|-----------------------------|------------------------------------------|
| `POST`   | `/api/inspect`              | Upload image, run detection, save to DB  |
| `POST`   | `/api/stream`               | Real-time inspection (no DB/disk storage)|
| `GET`    | `/api/history`              | List inspections (filters + `q` search)  |
| `GET`    | `/api/history/{id}`         | Fetch a single inspection record         |
| `DELETE` | `/api/history/{id}`         | Delete record and associated media files |
| `POST`   | `/api/history/clear`        | Wipe the SQLite DB and clean media folder|
| `GET`    | `/api/export`               | Download history as a CSV file           |
| `GET`    | `/media/{file}`             | Serve original and annotated JPG files   |

---

## 6. Usage Guide for Operators

### Running Your First Inspection

1. Open the browser at **`http://localhost:5173`**.
2. Navigate to **"Live Inspection"** in the top navbar.
3. Select your desired AI Model (e.g., `yolov8` or `concrete`).
4. **Drag and drop** a JPG/PNG product image into the upload zone.
5. Click **"Run Inspection"**.
6. The AI analyses the image, persists the record, and renders annotated bounding boxes with confidence levels.

### Confidence Colour Coding

| Colour   | Confidence     | Meaning                                 |
|----------|----------------|-----------------------------------------|
| 🟢 Green  | > 90%          | High-confidence detection               |
| 🟡 Yellow | 70% – 90%      | Medium-confidence, worth investigating  |
| 🔴 Red    | < 70%          | Low-confidence, may be a false positive |

---

## 7. Repository Folder Structure

```text
inspect-vision/
│
├── frontend/                         # React + Vite SPA
│   ├── package.json                  # NPM dependencies
│   ├── vite.config.js                # Vite config + API proxy
│   └── src/                          # React source components and routes
│
├── backend/                          # FastAPI Python backend
│   ├── main.py                       # FastAPI application entrypoint
│   ├── detection/                    # Model adapters and DetectionRuntimeManager
│   ├── storage/                      # SQLAlchemy models, SQLite config, and media
│   ├── routes/                       # API route handlers (detect, history)
│   ├── utils/                        # Preprocessing and OpenCV utilities
│   ├── models/                       # Model weights (.pt, .pth)
│   └── samples/                      # Manufacturing defect sample images
│
├── shared/                           # Shared Data Transfer Objects (Contracts)
│   ├── dto.py                        # Pydantic schemas (Backend)
│   └── types.js                      # JSDoc definitions (Frontend)
│
├── Makefile                          # Cross-platform Makefile (install, run)
├── .env                              # Environment configuration template
├── requirements.txt                  # Python dependencies
└── README.md                         # Project documentation
```

---

*Built with ❤️ by the Inspect-Vision Engineering Team.*
