"""
03_train_breath_model.py
Maatri.AI — Train Breath Sound Analyser on ICBHI 2017 Dataset
Uses XGBoost + scikit-learn (NO TensorFlow, NO PyTorch)
Binary classification: Normal vs Abnormal (Crackles/Wheezes/Both)
"""

# ── STEP 1: Import libraries (all proven to work on this system)
import os
import json
import warnings
import numpy as np
import librosa
import cv2
import joblib
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.neural_network import MLPClassifier

warnings.filterwarnings('ignore')

# ── CONFIGURATION
DATASET_DIR = os.path.join('..', 'ICBHI_final_database')
MODELS_DIR = os.path.join('ml', 'models')
SR = 22050
DURATION = 3.0
N_MELS = 64
N_FFT = 1024
HOP_LENGTH = 512

os.makedirs(MODELS_DIR, exist_ok=True)

# ── STEP 2: Parse ICBHI annotations
def parse_annotations(dataset_dir):
    segments = []
    txt_files = [f for f in os.listdir(dataset_dir) if f.endswith('.txt')
                 and not f.startswith('filename') and not f.startswith('script')]
    
    for txt_file in txt_files:
        base_name = txt_file.replace('.txt', '')
        wav_path = os.path.join(dataset_dir, base_name + '.wav')
        if not os.path.exists(wav_path):
            continue
        
        txt_path = os.path.join(dataset_dir, txt_file)
        with open(txt_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split('\t')
                if len(parts) < 4:
                    continue
                try:
                    start = float(parts[0])
                    end = float(parts[1])
                    crackle = int(parts[2])
                    wheeze = int(parts[3])
                except (ValueError, IndexError):
                    continue
                
                label = 0 if (crackle == 0 and wheeze == 0) else 1
                segments.append({
                    'wav_path': wav_path,
                    'start': start,
                    'end': end,
                    'label': label
                })
    return segments

# ── STEP 3: Extract audio segment
def extract_segment(wav_path, start, end, sr=SR, duration=DURATION):
    try:
        audio, _ = librosa.load(wav_path, sr=sr, offset=start, duration=end - start)
    except Exception:
        return None
    
    target_length = int(sr * duration)
    if len(audio) < target_length:
        audio = np.pad(audio, (0, target_length - len(audio)), mode='constant')
    else:
        audio = audio[:target_length]
    return audio

# ── STEP 4: Feature extraction — Mel Spectrogram + statistical features
def audio_to_melspec(audio, sr=SR, n_mels=N_MELS, n_fft=N_FFT, hop_length=HOP_LENGTH):
    mel = librosa.feature.melspectrogram(y=audio, sr=sr, n_mels=n_mels, n_fft=n_fft, hop_length=hop_length)
    mel_db = librosa.power_to_db(mel, ref=np.max)
    mel_resized = cv2.resize(mel_db, (64, 64), interpolation=cv2.INTER_LINEAR)
    
    mel_min = mel_resized.min()
    mel_max = mel_resized.max()
    if mel_max - mel_min > 0:
        mel_normalized = (mel_resized - mel_min) / (mel_max - mel_min)
    else:
        mel_normalized = np.zeros_like(mel_resized)
    return mel_normalized

def extract_features(audio, sr=SR):
    """
    Extract a rich feature vector from audio for XGBoost classification.
    Returns a 1D feature vector combining:
    - Mel spectrogram statistics (mean, std per band)
    - MFCCs (13 coefficients + deltas)
    - Spectral features (centroid, bandwidth, rolloff, contrast)
    - Zero crossing rate
    - RMS energy
    """
    features = []
    
    # 1. Mel spectrogram stats: mean + std per mel band (64*2 = 128 features)
    mel = librosa.feature.melspectrogram(y=audio, sr=sr, n_mels=N_MELS, n_fft=N_FFT, hop_length=HOP_LENGTH)
    mel_db = librosa.power_to_db(mel, ref=np.max)
    features.extend(mel_db.mean(axis=1))  # 64
    features.extend(mel_db.std(axis=1))   # 64
    
    # 2. MFCCs: 13 coefficients + their deltas (13*4 = 52 features)
    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
    mfcc_delta = librosa.feature.delta(mfcc)
    features.extend(mfcc.mean(axis=1))       # 13
    features.extend(mfcc.std(axis=1))        # 13
    features.extend(mfcc_delta.mean(axis=1)) # 13
    features.extend(mfcc_delta.std(axis=1))  # 13
    
    # 3. Spectral centroid (2 features)
    cent = librosa.feature.spectral_centroid(y=audio, sr=sr)
    features.append(cent.mean())
    features.append(cent.std())
    
    # 4. Spectral bandwidth (2 features)
    bw = librosa.feature.spectral_bandwidth(y=audio, sr=sr)
    features.append(bw.mean())
    features.append(bw.std())
    
    # 5. Spectral rolloff (2 features)
    rolloff = librosa.feature.spectral_rolloff(y=audio, sr=sr)
    features.append(rolloff.mean())
    features.append(rolloff.std())
    
    # 6. Zero crossing rate (2 features)
    zcr = librosa.feature.zero_crossing_rate(audio)
    features.append(zcr.mean())
    features.append(zcr.std())
    
    # 7. RMS energy (2 features)
    rms = librosa.feature.rms(y=audio)
    features.append(rms.mean())
    features.append(rms.std())
    
    # 8. Spectral contrast (7 bands * 2 = 14 features)
    contrast = librosa.feature.spectral_contrast(y=audio, sr=sr)
    features.extend(contrast.mean(axis=1))  # 7
    features.extend(contrast.std(axis=1))   # 7
    
    return np.array(features)  # Total: 128 + 52 + 10 + 14 = 204 features

# ── STEP 5: Data augmentation
def augment_add_noise(audio, sigma=0.003):
    return audio + np.random.randn(len(audio)) * sigma

def augment_time_shift(audio, shift_sec=0.1, sr=SR):
    return np.roll(audio, int(sr * shift_sec))

def main():
    print("=" * 60)
    print("🫁 Maatri.AI — Breath Sound Analyser Training")
    print("   Using XGBoost + scikit-learn (no TF/PyTorch needed)")
    print("=" * 60)
    
    # ── Parse annotations
    print("\n📂 Parsing ICBHI annotations...")
    segments = parse_annotations(DATASET_DIR)
    print(f"   Found {len(segments)} annotated segments")
    
    normal_count = sum(1 for s in segments if s['label'] == 0)
    abnormal_count = sum(1 for s in segments if s['label'] == 1)
    print(f"   Normal: {normal_count} | Abnormal: {abnormal_count}")
    
    # ── Extract features
    print("\n🎵 Extracting audio features...")
    X_features = []
    X_melspecs = []
    y_labels = []
    valid_segments = []
    skipped = 0
    
    for i, seg in enumerate(segments):
        if i % 200 == 0:
            print(f"   Processing {i+1}/{len(segments)}...")
        audio = extract_segment(seg['wav_path'], seg['start'], seg['end'])
        if audio is None:
            skipped += 1
            continue
        
        feat = extract_features(audio)
        mel = audio_to_melspec(audio)
        
        X_features.append(feat)
        X_melspecs.append(mel)
        y_labels.append(seg['label'])
        valid_segments.append(seg)
    
    X_features = np.array(X_features)
    y_labels = np.array(y_labels)
    print(f"   Extracted: {len(X_features)} samples (skipped {skipped})")
    print(f"   Feature vector size: {X_features.shape[1]} per sample")
    
    # ── Data augmentation
    print("\n🔄 Augmenting data...")
    X_aug = list(X_features)
    y_aug = list(y_labels)
    
    for i in range(len(X_features)):
        if i % 500 == 0:
            print(f"   Augmenting {i+1}/{len(X_features)}...")
        seg = valid_segments[i]
        audio = extract_segment(seg['wav_path'], seg['start'], seg['end'])
        if audio is None:
            continue
        
        # Noise augmentation
        noisy = augment_add_noise(audio)
        X_aug.append(extract_features(noisy))
        y_aug.append(y_labels[i])
        
        # Time shift augmentation
        shifted = augment_time_shift(audio)
        X_aug.append(extract_features(shifted))
        y_aug.append(y_labels[i])
    
    X_aug = np.array(X_aug)
    y_aug = np.array(y_aug)
    print(f"   After augmentation: {len(X_aug)} samples")
    print(f"   Normal: {np.sum(y_aug == 0)} | Abnormal: {np.sum(y_aug == 1)}")
    
    # ── Train/test split
    print("\n✂️ Splitting data (80/20, stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_aug, y_aug, test_size=0.2, stratify=y_aug, random_state=42
    )
    print(f"   Train: {len(X_train)} | Test: {len(X_test)}")
    
    # ── Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save scaler
    scaler_path = os.path.join(MODELS_DIR, 'breath_scaler.joblib')
    joblib.dump(scaler, scaler_path)
    
    # ── Class weights
    cw = compute_class_weight('balanced', classes=np.array([0, 1]), y=y_train)
    scale_pos = cw[1] / cw[0]
    print(f"   Class weights: Normal={cw[0]:.2f}, Abnormal={cw[1]:.2f}")
    
    # ── STEP 6 & 7: Train XGBoost model
    print("\n🚀 Training XGBoost model...")
    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos,
        random_state=42,
        eval_metric='logloss',
        use_label_encoder=False
    )
    
    model.fit(
        X_train_scaled, y_train,
        eval_set=[(X_test_scaled, y_test)],
        verbose=50
    )
    
    # ── STEP 8: Evaluate
    print("\n📊 Evaluation Results:")
    y_pred = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)
    
    acc = accuracy_score(y_test, y_pred)
    print(f"   Accuracy: {acc * 100:.2f}%")
    
    print("\n   Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Normal', 'Abnormal']))
    
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
    
    print(f"   Sensitivity (Abnormal recall): {sensitivity * 100:.2f}%")
    print(f"   Specificity (Normal recall):   {specificity * 100:.2f}%")
    
    # ── Feature importance (top 15)
    print("\n   Top 15 Feature Importances:")
    importances = model.feature_importances_
    feature_names = (
        [f'mel_mean_{i}' for i in range(64)] +
        [f'mel_std_{i}' for i in range(64)] +
        [f'mfcc_mean_{i}' for i in range(13)] +
        [f'mfcc_std_{i}' for i in range(13)] +
        [f'mfcc_delta_mean_{i}' for i in range(13)] +
        [f'mfcc_delta_std_{i}' for i in range(13)] +
        ['centroid_mean', 'centroid_std', 'bw_mean', 'bw_std',
         'rolloff_mean', 'rolloff_std', 'zcr_mean', 'zcr_std',
         'rms_mean', 'rms_std'] +
        [f'contrast_mean_{i}' for i in range(7)] +
        [f'contrast_std_{i}' for i in range(7)]
    )
    
    top_indices = np.argsort(importances)[::-1][:15]
    for idx in top_indices:
        name = feature_names[idx] if idx < len(feature_names) else f'feat_{idx}'
        print(f"     {name}: {importances[idx]:.4f}")
    
    # ── STEP 8: Save model
    model_path = os.path.join(MODELS_DIR, 'breath_analyser.joblib')
    joblib.dump(model, model_path)
    model_size_kb = os.path.getsize(model_path) / 1024
    
    # ── STEP 9: Also train a lightweight MLP for comparison
    print("\n🧠 Training backup MLP classifier...")
    mlp = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        max_iter=500,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.15
    )
    mlp.fit(X_train_scaled, y_train)
    mlp_acc = accuracy_score(y_test, mlp.predict(X_test_scaled))
    print(f"   MLP Accuracy: {mlp_acc * 100:.2f}%")
    
    mlp_path = os.path.join(MODELS_DIR, 'breath_analyser_mlp.joblib')
    joblib.dump(mlp, mlp_path)
    
    # ── STEP 10: Save config + scaler values for mobile app
    config = {
        'sr': SR,
        'duration': DURATION,
        'n_mels': N_MELS,
        'n_fft': N_FFT,
        'hop_length': HOP_LENGTH,
        'feature_count': int(X_features.shape[1]),
        'labels': ['Normal', 'Abnormal'],
        'model_accuracy': round(acc * 100, 2),
        'sensitivity': round(sensitivity * 100, 2),
        'specificity': round(specificity * 100, 2),
        'scaler_means': scaler.mean_.tolist(),
        'scaler_stds': scaler.scale_.tolist()
    }
    
    config_path = os.path.join(MODELS_DIR, 'breath_config.json')
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    # ── STEP 11: Test with synthetic audio
    print("\n🧪 Testing with synthetic audio...")
    t = np.linspace(0, DURATION, int(SR * DURATION), endpoint=False)
    synthetic = 0.1 * np.sin(2 * np.pi * 200 * t)
    
    feat_test = extract_features(synthetic)
    feat_scaled = scaler.transform([feat_test])
    pred = model.predict(feat_scaled)[0]
    proba = model.predict_proba(feat_scaled)[0]
    
    label = 'Normal' if pred == 0 else 'Abnormal'
    conf = proba[pred] * 100
    print(f"   Synthetic sine → {label} ({conf:.1f}% confidence)")
    
    # ── FINAL SUMMARY
    print("\n" + "=" * 60)
    print(f"✅ Breath model trained: {acc * 100:.2f}% accuracy")
    print(f"✅ Sensitivity: {sensitivity * 100:.2f}% | Specificity: {specificity * 100:.2f}%")
    print(f"✅ XGBoost saved: {model_path} ({model_size_kb:.2f} KB)")
    print(f"✅ MLP backup saved: {mlp_path} (Acc: {mlp_acc*100:.2f}%)")
    print(f"✅ Scaler saved: {scaler_path}")
    print(f"✅ Config saved: {config_path}")
    print(f"\n⚠️  Copy these scaler values to your React Native app:")
    print(f"   Feature count: {X_features.shape[1]}")
    print(f"   (Means and Stds saved in breath_config.json)")
    print("=" * 60)

if __name__ == '__main__':
    main()
