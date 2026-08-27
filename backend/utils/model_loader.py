"""
backend/utils/model_loader.py
──────────────────────────────
YOLOv8 model wrapper for defect detection inference.

Features:
- Loads the model from MODEL_PATH in the .env file.
- Graceful fallback to deterministic simulated detections when the weights
  file is absent (enables full API testing without GPU/model downloads).
- Severity score calculation using weighted defect type + confidence + size.
"""

from __future__ import annotations

import logging
import os
import random
from typing import List

import numpy as np

from shared.dto import BoundingBox, Defect

logger = logging.getLogger(__name__)

# ── Defect class mapping ──────────────────────────────────────────────────────
DEFECT_CLASSES: List[str] = ["scratch", "dent", "crack", "discoloration"]

# ── Severity weights per defect type (higher = more severe) ──────────────────
SEVERITY_WEIGHTS: dict[str, float] = {
    "crack": 1.0,
    "dent": 0.85,
    "scratch": 0.65,
    "discoloration": 0.50,
}

# ── Singleton model holder ────────────────────────────────────────────────────
_model = None
_model_available: bool = False


def _load_model(model_path: str) -> None:
    """Load the YOLOv8 model from ``model_path`` into the module-level singleton.

    Sets ``_model_available = True`` on success; logs a warning and falls back
    to demo mode if the weights file is missing.

    Args:
        model_path: Path to the ``.pt`` weights file.
    """
    global _model, _model_available

    if not os.path.exists(model_path):
        logger.warning(
            "Model weights not found at '%s'. Running in DEMO (simulation) mode. "
            "Download yolov8n.pt from https://github.com/ultralytics/assets/releases "
            "and place it at the configured MODEL_PATH to enable real inference.",
            model_path,
        )
        _model_available = False
        return

    try:
        from ultralytics import YOLO  # type: ignore

        _model = YOLO(model_path)
        _model_available = True
        logger.info("YOLOv8 model loaded successfully from '%s'.", model_path)
    except Exception as exc:
        logger.error("Failed to load YOLOv8 model: %s", exc)
        _model_available = False


def get_detector(model_path: str) -> "DefectDetector":
    """Factory that returns a ``DefectDetector`` bound to the loaded model.

    Args:
        model_path: Path resolved from the MODEL_PATH env variable.

    Returns:
        A ``DefectDetector`` instance ready for inference or demo simulation.
    """
    _load_model(model_path)
    return DefectDetector(model=_model, available=_model_available)


# ─────────────────────────────────────────────────────────────────────────────

class DefectDetector:
    """Wrapper around a YOLOv8 model for surface defect detection.

    In DEMO mode (``available=False``) the detector returns deterministic
    simulated defects so the entire API/frontend pipeline can be exercised
    without a trained model.
    """

    def __init__(self, model, available: bool) -> None:
        self._model = model
        self._available = available

    # ── Public interface ──────────────────────────────────────────────────────

    def detect_defects(self, image_array: np.ndarray) -> List[Defect]:
        """Run defect detection on a pre-processed image array.

        Args:
            image_array: Float32 or uint8 numpy array (H × W × 3, BGR).

        Returns:
            List of ``Defect`` instances found in the image.

        Raises:
            RuntimeError: Propagated as HTTP 500 ``"Detection model error"``
                          by the route handler.
        """
        if not self._available:
            return self._simulate_defects(image_array)

        try:
            return self._run_yolo(image_array)
        except Exception as exc:
            logger.error("YOLO inference error: %s", exc)
            raise RuntimeError("Detection model error") from exc

    def calculate_severity_score(self, defects: List[Defect]) -> int:
        """Compute an integer quality score in the range 0–100.

        Algorithm:
        - Start at 100 (perfect quality).
        - Deduct points for each defect based on:
          * Defect presence base penalty (12.0 * weight * confidence)
          * Relative bounding-box area contribution (20.0 * weight * confidence * area_factor)
          * Compounding penalty for multiple defects (+10 pts per additional defect)
        - Apply realistic quality caps based on defect count and confidence:
          * >= 5 defects: max 30 points
          * >= 3 defects: max 55 points
          * >= 1 high-confidence defect (>= 0.5): max 75 points
        - Score is clamped to [0, 100].

        Args:
            defects: List of detected ``Defect`` objects.

        Returns:
            Integer severity score where ``100`` = no defects (perfect).
        """
        if not defects:
            return 100

        MAX_AREA = 640 * 640  # reference YOLO input area
        total_deduction = 0.0

        for d in defects:
            weight = SEVERITY_WEIGHTS.get(d.type, 0.7)
            # Base penalty for defect presence
            base_penalty = 12.0 * weight * d.confidence
            # Relative area factor (0–1)
            area_fraction = (d.boundingBox.width * d.boundingBox.height) / MAX_AREA
            area_factor = min(area_fraction * 5.0, 1.0)
            area_penalty = 20.0 * weight * d.confidence * area_factor

            total_deduction += (base_penalty + area_penalty)

        # Compounding penalty for multiple defects
        if len(defects) > 1:
            total_deduction += (len(defects) - 1) * 10.0

        score = max(0, min(100, round(100 - total_deduction)))

        # Realistic quality caps based on defect count and confidence
        high_conf_defects = [d for d in defects if d.confidence >= 0.5]
        if len(defects) >= 5:
            score = min(score, 30)
        elif len(defects) >= 3:
            score = min(score, 55)
        elif len(high_conf_defects) >= 1:
            score = min(score, 75)

        return score

    # ── Private helpers ───────────────────────────────────────────────────────

    def _run_yolo(self, image_array: np.ndarray) -> List[Defect]:
        """Run real YOLOv8 inference and convert results to ``Defect`` objects.

        Args:
            image_array: Preprocessed image (float32, values 0–1, BGR).

        Returns:
            List of ``Defect`` instances.
        """
        # Convert float32 back to uint8 RGB for Ultralytics
        if image_array.dtype != np.uint8:
            img_uint8 = (image_array * 255).clip(0, 255).astype(np.uint8)
        else:
            img_uint8 = image_array

        # Ultralytics expects RGB
        img_rgb = img_uint8[:, :, ::-1]

        results = self._model(img_rgb, verbose=False)
        defects: List[Defect] = []

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])

                # Map class index to defect name (fallback to scratch)
                if class_id < len(DEFECT_CLASSES):
                    defect_type = DEFECT_CLASSES[class_id]
                else:
                    defect_type = "scratch"

                defects.append(
                    Defect(
                        type=defect_type,
                        confidence=round(confidence, 4),
                        boundingBox=BoundingBox(
                            x=max(0, int(x1)),
                            y=max(0, int(y1)),
                            width=max(1, int(x2 - x1)),
                            height=max(1, int(y2 - y1)),
                        ),
                    )
                )

        return defects

    def _simulate_defects(self, image_array: np.ndarray) -> List[Defect]:
        """Return deterministic simulated defects for demo/test mode.

        The simulation uses the image pixel statistics as a seed so that the
        same image always produces the same "detected" defects, making it
        useful for regression testing.

        Returns 0–3 simulated defects depending on image brightness.
        """
        h, w = image_array.shape[:2]

        # Use mean brightness as a reproducible seed
        mean_brightness = float(np.mean(image_array))
        rng = random.Random(int(mean_brightness * 1000))

        num_defects = rng.randint(0, 3)
        defects: List[Defect] = []

        defect_pool = [
            ("scratch", 0.92, 120, 85, 45, 30),
            ("dent", 0.87, 300, 200, 60, 50),
            ("crack", 0.73, 180, 320, 35, 70),
            ("discoloration", 0.61, 450, 150, 80, 60),
        ]

        for i in range(num_defects):
            dtype, conf, bx, by, bw, bh = defect_pool[i % len(defect_pool)]

            # Add slight jitter so coords land inside actual image bounds
            bx_clamped = min(bx, max(0, w - bw - 1))
            by_clamped = min(by, max(0, h - bh - 1))

            defects.append(
                Defect(
                    type=dtype,
                    confidence=round(conf + rng.uniform(-0.02, 0.02), 4),
                    boundingBox=BoundingBox(
                        x=bx_clamped,
                        y=by_clamped,
                        width=bw,
                        height=bh,
                    ),
                )
            )

        return defects
