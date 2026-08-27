import threading
import logging
from typing import Optional, Dict

from backend.detection.adapters import ModelAdapter, YOLOv8Adapter, BayesPFLAdapter

logger = logging.getLogger(__name__)

class DetectionRuntimeManager:
    """Manages lazy-loading, caching, and thread-safe inference of multiple models."""
    
    def __init__(self):
        self._models: Dict[str, ModelAdapter] = {}
        self._inference_lock = threading.Lock()
        
        # Configure model registry
        self._registry = {
            "yolov8": (YOLOv8Adapter, "backend/models/yolov8_defects.pt"),
            "steel": (YOLOv8Adapter, "backend/models/defect_neu_yolov8.pt"),
            "concrete": (YOLOv8Adapter, "backend/models/crack_detection.pt"),
            "general": (BayesPFLAdapter, "backend/models/train_visa.pth"),
        }

    def get_model(self, model_id: str) -> ModelAdapter:
        """Lazy-loads and returns a model adapter based on model_id."""
        if model_id not in self._registry:
            logger.warning(f"Unknown model_id '{model_id}', falling back to 'yolov8'")
            model_id = "yolov8"
            
        with self._inference_lock:
            if model_id not in self._models:
                adapter_cls, path = self._registry[model_id]
                adapter = adapter_cls()
                adapter.load(path)
                self._models[model_id] = adapter
                
            return self._models[model_id]
            
    def run_inference(self, model_id: str, image_array, context: Optional[str] = None):
        """Thread-safe inference using the lock."""
        adapter = self.get_model(model_id)
        with self._inference_lock:
            defects = adapter.predict(image_array, context=context)
            score = adapter.calculate_severity(defects)
            return defects, score

# Global singleton
runtime_manager = DetectionRuntimeManager()
