from .model_loader import ModelLoader

model_loader = ModelLoader()
# Load when starting backend server
model_loader.load_model()
