# Inspect-Vision Project Analysis

## 1. Project Overview
**Inspect-Vision** is a comprehensive manufacturing image-inspection application. It is designed to process images of manufactured goods or structures, detect defects or anomalies using computer vision models, and provide an interface for operators to review, manage, and export inspection results.

The technology stack consists of:
*   **Frontend**: React built with Vite.
*   **Backend**: FastAPI (Python).
*   **Computer Vision**: OpenCV for preprocessing and PyTorch/Ultralytics for deep learning models.
*   **Database**: SQLite for storing metadata and inspection history.

## 2. Key Functionalities
The project offers a robust set of features for operators and inspectors:
*   **Manual Model Selection**: Operators can manually choose which AI model to use across different views (Dashboard, Inspect, Live Stream, Samples). Model selection and product context are independent.
*   **Category-Guided Anomaly Localization**: The ability to prompt the general model with text (e.g., "Bottle", "Screw") to guide anomaly detection.
*   **Specialist Models**: Domain-specific models for distinct tasks like detecting steel surface defects or concrete cracks.
*   **Inspection History**: A persistent database (SQLite) that tracks past inspections, retaining both the original uploaded media and the model-annotated output media.
*   **Live-Frame Inspection**: Non-persisted, real-time inspection via the `/api/stream` endpoint for continuous video frame analysis.
*   **Quality Scoring**: A backend-authoritative heuristic score (0-100) based on defect class, confidence, defect count, and bounding box area.
*   **CSV Export**: Server-side generation of CSV files containing filtered inspection history.
*   **Demo Samples Catalog**: A tracked, local operator demo catalog (using a subset of the VisA dataset) available completely offline.

## 3. Models and Parameters
The application employs three exposed models, each serving a distinct purpose in the inspection ecosystem.

### A. General Manufacturing (Bayes-PFL)
*   **Role**: A broad, guided localizer used when the exact domain-specific defect taxonomy is unknown.
*   **Scope**: Supports multiple product categories guided by text context (CLIP prompt context).
*   **Native Output**: Classifies findings simply as `anomaly`.
*   **Artifacts**: `train_visa.pth` (~109.5 MB) coupled with a CLIP visual/text backbone `ViT-L-14-336px.pt` (~934.1 MB).
*   **Parameters / Preprocessing**:
    *   Geometry: Resized via `518x518` stretch.
    *   CLIP normalization.
    *   Gaussian sigma: `8`.
    *   Fixed application threshold: `0.72`.
    *   Minimum component area ratio: `0.0005`.
    *   Bounding box display margin: 25%.

### B. Steel Surface Specialist
*   **Role**: A narrow specialist model for identifying defects strictly on steel surfaces.
*   **Architecture**: Ultralytics YOLOv8.
*   **Native Output**: Identifies six specific named steel-defect classes.
*   **Artifacts**: `defect_neu_yolov8.pt` (~6.3 MB).

### C. Concrete & Structural Cracks Specialist
*   **Role**: A narrow specialist model for identifying visible structural cracks on concrete, masonry, walls, and floors.
*   **Architecture**: Ultralytics YOLOv8.
*   **Native Output**: Classifies findings as `crack`.
*   **Artifacts**: `crack_detection.pt` (~22.5 MB).

### Model Runtime Behavior
*   **Device Strategy**: Supports `auto`, `cpu`, `cuda`, `cuda:N`, and `mps`. The `auto` policy resolves to `CUDA -> MPS -> CPU`.
*   **Caching & Locking**: `DetectionRuntimeManager` lazy-loads and caches one successful `DetectionService` per model. There is a single inference lock shared by the application.
*   **Context Injection**: For the Bayes-PFL model, changing the category updates the prompt context under the model's runtime lock without reloading the entire model into memory.

## 4. How Detection Works (Inspection Flow)
The application strictly defines the boundaries and data flow during an inspection:

1.  **Input Submission**: The operator uploads an image (JPEG/PNG bytes) along with a `modelId` and an optional `productName` (for guided context) to the `POST /api/inspect` endpoint.
2.  **Validation & Preprocessing**: The backend validates the bytes and decodes the image using OpenCV into a BGR NumPy array.
3.  **Inference**:
    *   *For Ultralytics Specialists (YOLOv8)*: The image undergoes a square letterbox transformation, passes through the registered preprocessing profile, and is fed into the YOLOv8 detector.
    *   *For Anomaly-Map Detectors (Bayes-PFL)*: The image undergoes a model-specific stretch (`518x518`) and normalization. The model generates an anomaly map and performs specific postprocessing.
4.  **Geometry Restoration**: The backend takes the resulting bounding boxes and restores them once back to the original image's coordinates (pixels with a top-left origin). The models maintain their native defect classes without a semantic translation layer.
5.  **Quality & Annotation**: The `DetectionService` validates the native classes, computes the quality score, applies visual annotations, and constructs the Data Transfer Object (DTO).
6.  **Persistence**: The resulting metadata, verdict, and both the original and annotated images are persisted via the storage service into the SQLite database.
7.  **Response**: The inspection detail contract is returned to the React frontend, which layers a Canvas overlay on top of the original image for the user to view.

## 5. System Architecture & Strict Boundaries
The project adheres to a highly controlled, acyclic dependency graph, enforcing specific rules for how modules interact:

*   **`frontend/` -> `backend/api/` -> `shared-contracts/`**: 
    *   The React frontend is strictly isolated. It never imports backend Python code or reads SQLite persistence directly. It exclusively consumes the FastAPI HTTP surface and stable `shared-contracts`.
    *   The frontend uses `imageUrl` (annotated) for downloads, and `originalImageUrl` as the clean source for the Canvas viewer.
*   **`backend/routes/`**: The FastAPI layer handling HTTP contracts, CORS, inference locking, and error mapping. It invokes `defect-detection` and `inspection-history` as independent downstream services.
*   **`backend/detection/`**: The core vision module. Manages OpenCV integrations, detector adapters, model manifest validation, device allocation, and selection metadata. **Crucially, this module emits normalized defects independent of any specific model library, and it never persists records itself.**
*   **`backend/storage/`**: Manages the SQLite database, relative media paths, filtering logic, and media lifecycle. It persists results but **never loads or executes a model**.
*   **`backend/samples/`**: Contains the local VisA demo corpus used for UI demonstrations, serving files without any runtime network dependency.
*   **`shared/`**: Contains documented DTO semantics shared between frontend and backend. It depends on no higher-level modules.

## 6. API Contract & Data Exchange
The boundary between the React UI and FastAPI backend is strictly defined by an API contract that normalizes data formats and guarantees invariants.

*   **Data Formatting**: All JSON fields use `camelCase`. Dates are UTC ISO 8601 strings. Bounding boxes use original-image pixels with `(0, 0)` at the top-left.
*   **Endpoints**:
    *   `POST /api/inspect`: Primary entrypoint. Accepts `multipart/form-data` (JPEG/PNG up to 10 MiB), `modelId`, and an optional `productName`. Successful requests persist both metadata and media.
    *   `POST /api/stream`: Used for live inspection of a single JPEG frame. Uses the same detection runtime and inference lock, but results are non-persisted.
    *   `GET /api/history`: Supports filtering via inclusive UTC dates (`from`/`to`), lowercase exact `type`, and case-insensitive substring `q` (over ID or filename).
    *   `GET /api/export`: Translates filtered history directly to a UTF-8 CSV download containing `inspectionId`, `timestamp`, `defectCount`, `types`, `qualityScore`, and `status`.
*   **Validation Rules**:
    *   For guided models (like Bayes-PFL), the API validates `productName` via a strict regex (2-40 chars, Latin letters/spaces/hyphens, max 3 words), returning `HTTP 422 Unprocessable Entity` for malformed inputs.
    *   Uploads larger than 10 MiB trigger `HTTP 413 Payload Too Large`.
*   **Quality Scoring Formula**: The returned `qualityScore` is an authoritative integer from `0` to `100` calculated strictly on the backend. The inspection `status` is marked as `passed` only when `totalDefects` equals `0`.
