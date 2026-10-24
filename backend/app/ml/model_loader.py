import os
import joblib
from app.core.config import settings

class ModelLoader:
    def __init__(self):
        self.model_path = os.path.abspath(settings.FRAUD_MODEL_PATH)
        self.model = None

    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                return self.model
            except Exception:
                return None
        return None

    @property
    def is_loaded(self) -> bool:
        return self.model is not None
