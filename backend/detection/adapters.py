import logging
import os
import random
from abc import ABC, abstractmethod
from typing import List, Optional
import numpy as np

from shared.dto import BoundingBox, Defect

logger = logging.getLogger(__name__)

class ModelAdapter(ABC):
    """Abstract base class for vision model adapters."""
    
    @abstractmethod
    def load(self, model_path: str) -> bool:
        """Load the model into memory. Return True if successful."""
        pass

    @abstractmethod
    def predict(self, image_array: np.ndarray, context: Optional[str] = None) -> List[Defect]:
        """Run inference on the preprocessed image array."""
        pass

    def calculate_severity(self, defects: List[Defect]) -> int:
        """Default severity calculation."""
        return 100 if not defects else max(0, 100 - len(defects) * 10)


class YOLOv8Adapter(ModelAdapter):
    """Adapter for YOLOv8 based specialist models (Steel, Concrete)."""
    
    DEFECT_CLASSES = ["scratch", "dent", "crack", "discoloration"]
    SEVERITY_WEIGHTS = {"crack": 1.0, "dent": 0.85, "scratch": 0.65, "discoloration": 0.50}
    
    def __init__(self):
        self.model = None
        self.available = False

    def load(self, model_path: str) -> bool:
        if not os.path.exists(model_path):
            logger.warning(f"YOLOv8 model weights missing at {model_path}. Using DEMO mode.")
            self.available = False
            return False
            
        try:
            from ultralytics import YOLO # type: ignore
            self.model = YOLO(model_path)
            self.available = True
            logger.info(f"Loaded YOLOv8 model from {model_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load YOLOv8 model: {e}")
            self.available = False
            return False

    def predict(self, image_array: np.ndarray, context: Optional[str] = None) -> List[Defect]:
        if not self.available:
            return self._simulate(image_array)
            
        # YOLO expects RGB uint8
        img_uint8 = (image_array * 255).clip(0, 255).astype(np.uint8) if image_array.dtype != np.uint8 else image_array
        img_rgb = img_uint8[:, :, ::-1]
        
        results = self.model(img_rgb, verbose=False)
        defects = []
        for result in results:
            if result.boxes is None: continue
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                dtype = self.DEFECT_CLASSES[cls_id] if cls_id < len(self.DEFECT_CLASSES) else "anomaly"
                
                defects.append(Defect(
                    type=dtype, confidence=round(conf, 4),
                    boundingBox=BoundingBox(x=max(0, int(x1)), y=max(0, int(y1)), width=max(1, int(x2-x1)), height=max(1, int(y2-y1)))
                ))
        return defects

    def calculate_severity(self, defects: List[Defect]) -> int:
        if not defects:
            return 100

        MAX_AREA = 640 * 640
        total_deduction = 0.0

        for d in defects:
            weight = self.SEVERITY_WEIGHTS.get(d.type, 0.7)
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

    def _simulate(self, image_array: np.ndarray) -> List[Defect]:
        h, w = image_array.shape[:2]
        mean_bright = float(np.mean(image_array))
        rng = random.Random(int(mean_bright * 1000))
        num = rng.randint(0, 3)
        pool = [("scratch", 0.92, 120, 85, 45, 30), ("dent", 0.87, 300, 200, 60, 50)]
        
        defects = []
        for i in range(num):
            dtype, conf, bx, by, bw, bh = pool[i % len(pool)]
            defects.append(Defect(
                type=dtype, confidence=round(conf + rng.uniform(-0.02, 0.02), 4),
                boundingBox=BoundingBox(x=min(bx, max(0, w-bw-1)), y=min(by, max(0, h-bh-1)), width=bw, height=bh)
            ))
        return defects


class BayesPFLAdapter(ModelAdapter):
    """Adapter for the Bayes-PFL generalized anomaly model using CLIP context."""
    
    def __init__(self):
        self.model = None
        self.available = False
        self.clip_context = None

    def load(self, model_path: str) -> bool:
        # Dummy implementation since we don't have the weights
        logger.warning(f"Bayes-PFL model weights missing at {model_path}. Using DEMO mode.")
        self.available = False
        return False

    def predict(self, image_array: np.ndarray, context: Optional[str] = None) -> List[Defect]:
        # Context injection happens here (e.g., productName = 'Bottle')
        if context:
            logger.info(f"Bayes-PFL context injected: {context}")
            
        # Simulate an anomaly detection
        h, w = image_array.shape[:2]
        return [Defect(
            type="anomaly", confidence=0.85,
            boundingBox=BoundingBox(x=int(w*0.4), y=int(h*0.4), width=int(w*0.2), height=int(h*0.2))
        )]
