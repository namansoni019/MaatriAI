import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import xgboost as xgb
import joblib
import os
import tensorflow as tf

def sklearn_to_tflite(X_train_scaled, sklearn_model, save_path):
    """
    Convert sklearn model to TFLite by creating a TF model
    that reproduces the same predictions.
    """
    # Get training data predictions for distillation
    y_pred_probs = sklearn_model.predict_proba(X_train_scaled)
    
    # Create simple TF model with same input/output
    tf_model = tf.keras.Sequential([
        tf.keras.layers.Dense(16, activation='relu', input_shape=(X_train_scaled.shape[1],)),
        tf.keras.layers.Dense(16, activation='relu'),
        tf.keras.layers.Dense(3, activation='softmax')
    ])
    
    tf_model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    
    # Compile and train briefly on sklearn predictions
    tf_model.fit(X_train_scaled, y_pred_probs, epochs=50, batch_size=32, verbose=0)
    
    # Convert to TFLite
    converter = tf.lite.TFLiteConverter.from_keras_model(tf_model)
    
    # Quantize to INT8 for smaller size
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    
    tflite_model = converter.convert()
    
    with open(save_path, 'wb') as f:
        f.write(tflite_model)
    
    return tflite_model

def main():
    os.makedirs('ml/models', exist_ok=True)
    
    # ── STEP 2: Load dataset
    csv_path = '../Maternal Health Risk Data Set.csv'
    df = pd.read_csv(csv_path)
    
    # ── STEP 3: Preprocessing
    # Map RiskLevel: 'low'→0, 'mid'→1, 'high'→2
    risk_map = {'low risk': 0, 'mid risk': 1, 'high risk': 2}
    df['RiskLevel'] = df['RiskLevel'].map(risk_map)
    
    # Check missing values → fill with median
    df.fillna(df.median(), inplace=True)
    
    # Feature engineering:
    df['pulse_pressure'] = df['SystolicBP'] - df['DiastolicBP']
    df['map_score'] = df['DiastolicBP'] + (df['pulse_pressure'] / 3)
    
    X = df[['Age', 'SystolicBP', 'DiastolicBP', 'BS', 'BodyTemp', 'HeartRate', 'pulse_pressure', 'map_score']]
    y = df['RiskLevel']
    
    # ── STEP 4: Train/test split 80/20, stratified, random_state=42
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    # ── STEP 5: Scale features with StandardScaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    joblib.dump(scaler, 'ml/models/scaler.joblib')
    
    # ── STEP 6: Train XGBoost model
    model = xgb.XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42, eval_metric='mlogloss')
    model.fit(X_train_scaled, y_train)
    
    # ── STEP 7: Evaluate
    y_pred = model.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    print("\nFeature Importances:")
    for f in range(X.shape[1]):
        print(f"{X.columns[indices[f]]}: {importances[indices[f]]:.4f}")
    
    # ── STEP 8: Save model
    joblib.dump(model, 'ml/models/risk_scorer.joblib')
    
    # ── STEP 9: Convert to TFLite
    tflite_path = 'ml/models/risk_scorer.tflite'
    tflite_model = sklearn_to_tflite(X_train_scaled, model, tflite_path)
    
    # ── STEP 10: Validate TFLite vs original
    interpreter = tf.lite.Interpreter(model_path=tflite_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    sample_indices = np.random.choice(X_test_scaled.shape[0], 10, replace=False)
    samples = X_test_scaled[sample_indices]
    
    match_count = 0
    for i, sample in enumerate(samples):
        # XGBoost
        xgb_probs = model.predict_proba([sample])[0]
        xgb_pred = np.argmax(xgb_probs)
        
        # TFLite
        input_data = np.array([sample], dtype=np.float32)
        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        tflite_probs = interpreter.get_tensor(output_details[0]['index'])[0]
        tflite_pred = np.argmax(tflite_probs)
        
        if xgb_pred == tflite_pred:
            match_count += 1
            
    print(f"\nTFLite matched XGBoost on {match_count}/10 samples.")
    
    # ── STEP 11: Print final stats
    tflite_size_kb = os.path.getsize(tflite_path) / 1024
    
    print("\n" + "="*50)
    print(f"✅ Risk scorer trained: {acc*100:.2f}% accuracy")
    print(f"✅ Model saved: ml/models/risk_scorer.joblib")
    print(f"✅ TFLite saved: {tflite_path} ({tflite_size_kb:.2f} KB)")
    print(f"✅ Scaler saved: ml/models/scaler.joblib")
    print(f"⚠️ Copy these scaler values to your React Native app:")
    print(f"   Means: {scaler.mean_.tolist()}")
    print(f"   Stds:  {scaler.scale_.tolist()}")
    print("="*50 + "\n")

if __name__ == "__main__":
    main()
