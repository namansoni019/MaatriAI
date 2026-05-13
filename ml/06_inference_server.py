"""
06_inference_server.py
Maatri.AI — FastAPI Inference Server for Jaundice Detection
Run: uvicorn ml.06_inference_server:app --reload --port 5000
  OR: python 06_inference_server.py
Endpoint: POST http://localhost:5000/analyse-image
"""

import os, json, base64, io, warnings
import numpy as np
import cv2
import joblib
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

warnings.filterwarnings('ignore')

app = FastAPI(title="Maatri.AI Vision API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_DIR = os.path.join('ml', 'models')

# Load models at startup
print("🔄 Loading models...")
model_xgb = joblib.load(os.path.join(MODEL_DIR, 'jaundice_detector_xgb.joblib'))
model_mlp = joblib.load(os.path.join(MODEL_DIR, 'jaundice_detector_mlp.joblib'))
scaler = joblib.load(os.path.join(MODEL_DIR, 'jaundice_scaler.joblib'))

with open(os.path.join(MODEL_DIR, 'vision_config.json'), 'r') as f:
    config = json.load(f)

THRESHOLD = config.get('optimal_threshold', 0.5)
print(f"✅ Models loaded. Threshold: {THRESHOLD}")


def extract_image_features(img_rgb):
    """Extract 68 color features from a 224x224 RGB image."""
    img_hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
    img_lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
    features = []
    for ch in range(3):
        features.append(img_rgb[:,:,ch].mean())
        features.append(img_rgb[:,:,ch].std())
    for ch in range(3):
        features.append(img_hsv[:,:,ch].mean())
        features.append(img_hsv[:,:,ch].std())
    for ch in range(3):
        features.append(img_lab[:,:,ch].mean())
        features.append(img_lab[:,:,ch].std())
    for ch in range(3):
        hist = cv2.calcHist([img_rgb], [ch], None, [16], [0, 256])
        hist = hist.flatten() / hist.sum()
        features.extend(hist)
    r, g, b = img_rgb[:,:,0].astype(float), img_rgb[:,:,1].astype(float), img_rgb[:,:,2].astype(float)
    yellow_mask = (r > 150) & (g > 120) & (b < 100)
    features.append(yellow_mask.sum() / (224*224))
    features.append((r.mean() + g.mean()) / (b.mean() + 1))
    return np.array(features)


def predict_from_image(img_np):
    """Run prediction on a 224x224 RGB numpy array."""
    features = extract_image_features(img_np).reshape(1, -1)
    features_scaled = scaler.transform(features)
    prob_xgb = model_xgb.predict_proba(features_scaled)[0][1]
    prob_mlp = model_mlp.predict_proba(features_scaled)[0][1]
    probability = prob_xgb * 0.6 + prob_mlp * 0.4

    if probability >= 0.75:
        risk = 'HIGH'
    elif probability >= 0.50:
        risk = 'MEDIUM'
    else:
        risk = 'LOW'

    return {
        'jaundice_probability': round(float(probability), 4),
        'risk_level': risk,
        'confidence': round(float(max(probability, 1 - probability)), 4),
        'model_version': 'NJN-XGBoost-MLP-v1'
    }


# ── Request/Response models
class ImageRequest(BaseModel):
    image_base64: str

class AnalysisResponse(BaseModel):
    jaundice_probability: float
    risk_level: str
    confidence: float
    model_version: str


@app.post('/analyse-image', response_model=AnalysisResponse)
async def analyse_image(req: ImageRequest):
    """Analyse a base64-encoded image for jaundice."""
    try:
        img_bytes = base64.b64decode(req.image_base64)
        img_pil = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img_np = np.array(img_pil.resize((224, 224)))
        return predict_from_image(img_np)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/upload', response_model=AnalysisResponse)
async def upload_image(file: UploadFile = File(...)):
    """Upload an image file directly (easiest way to test from Swagger /docs)."""
    try:
        contents = await file.read()
        img_pil = Image.open(io.BytesIO(contents)).convert('RGB')
        img_np = np.array(img_pil.resize((224, 224)))
        return predict_from_image(img_np)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/health')
async def health():
    return {'status': 'ok', 'model': 'jaundice_detector', 'version': 'v1'}


if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("🟡 Maatri.AI Vision Server running (FastAPI)...")
    print("   POST /analyse-image  → jaundice detection")
    print("   GET  /health         → server health check")
    print("   GET  /docs           → Swagger UI")
    print("   http://localhost:5000")
    print("=" * 50 + "\n")
    uvicorn.run(app, host='0.0.0.0', port=5000)
