import numpy as np
import joblib
import pandas as pd
import tensorflow as tf
import os

def main():
    if not os.path.exists('ml/models/scaler.joblib') or not os.path.exists('ml/models/risk_scorer.tflite'):
        print("Please run 01_train_risk_scorer.py first to generate the models.")
        return

    # Load scaler and model
    scaler = joblib.load('ml/models/scaler.joblib')
    interpreter = tf.lite.Interpreter(model_path='ml/models/risk_scorer.tflite')
    interpreter.allocate_tensors()
    
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    # Profiles to test
    # Age, SystolicBP, DiastolicBP, BS, BodyTemp, HeartRate
    profiles = [
        {"name": "Healthy 25-year-old", "data": [25, 110, 70, 6.0, 98.2, 72], "expected": "low"},
        {"name": "Pre-eclampsia risk", "data": [32, 155, 100, 7.5, 98.6, 85], "expected": "high"},
        {"name": "Young mother", "data": [17, 100, 65, 5.8, 98.1, 78], "expected": "mid"},
        {"name": "Diabetic risk", "data": [38, 130, 85, 15.0, 98.8, 90], "expected": "high"},
        {"name": "Multiple risks", "data": [40, 165, 108, 12.0, 99.0, 95], "expected": "high"}
    ]
    
    risk_labels = {0: "low", 1: "mid", 2: "high"}
    
    print("Running Tests:\n")
    
    for i, profile in enumerate(profiles):
        # Calculate features
        age, sys_bp, dia_bp, bs, temp, hr = profile["data"]
        pulse_pressure = sys_bp - dia_bp
        map_score = dia_bp + (pulse_pressure / 3)
        
        # Prepare input
        features = np.array([[age, sys_bp, dia_bp, bs, temp, hr, pulse_pressure, map_score]])
        features_scaled = scaler.transform(features).astype(np.float32)
        
        # TFLite inference
        interpreter.set_tensor(input_details[0]['index'], features_scaled)
        interpreter.invoke()
        probs = interpreter.get_tensor(output_details[0]['index'])[0]
        
        pred_idx = np.argmax(probs)
        pred_label = risk_labels[pred_idx]
        conf = probs[pred_idx] * 100
        
        match = "✅ MATCH" if pred_label == profile["expected"] else "❌ MISMATCH"
        
        print(f"Profile {i+1}: Predicted={pred_label.upper()} (confidence={conf:.1f}%) | Expected={profile['expected'].upper()} | {match}")

if __name__ == "__main__":
    main()
