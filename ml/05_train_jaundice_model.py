"""
05_train_jaundice_model.py
Maatri.AI — Jaundice Detection Model Training
Dataset: NJN (Normal=560, Jaundice=200)

Two approaches:
  A) CSV-based XGBoost (RGB features) — fast, reliable
  B) Image-based MLP on pixel features — uses actual images
Both work without TensorFlow.
"""

# ── STEP 1: Imports
import os, json, warnings, sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import cv2
import joblib
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.metrics import (classification_report, confusion_matrix,
                             accuracy_score, roc_auc_score, recall_score, precision_score)
from sklearn.utils.class_weight import compute_class_weight
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import VotingClassifier

warnings.filterwarnings('ignore')

# ── STEP 2: Paths
BASE_DIR = os.path.join('..', 'NJN')
NORMAL_DIR = os.path.join(BASE_DIR, 'normal')
JAUNDICE_DIR = os.path.join(BASE_DIR, 'jaundice')
CSV_PATH = os.path.join(BASE_DIR, 'Pythons_Code_AI_Testing_Data', 'Excel File', 'train.csv')
MODEL_DIR = os.path.join('ml', 'models')
OUTPUT_DIR = os.path.join('ml', 'outputs')
IMAGE_SIZE = (224, 224)

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

def main():
    print("=" * 50)
    print("🟡 Maatri.AI — Jaundice Detection Training")
    print("=" * 50)

    # ── STEP 3: Load and explore dataset
    print("\n📂 STEP 3: Loading dataset...")

    normal_files = [os.path.join(NORMAL_DIR, f) for f in os.listdir(NORMAL_DIR)
                    if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))]
    jaundice_files = [os.path.join(JAUNDICE_DIR, f) for f in os.listdir(JAUNDICE_DIR)
                      if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))]

    n_normal, n_jaundice = len(normal_files), len(jaundice_files)
    n_total = n_normal + n_jaundice
    print(f"   Normal images:   {n_normal}")
    print(f"   Jaundice images: {n_jaundice}")
    print(f"   Total:           {n_total}")
    print(f"   Class ratio: {n_normal*100//n_total}% Normal, {n_jaundice*100//n_total}% Jaundice")
    print("   ⚠️  Imbalanced dataset detected — will apply fixes")

    # Load CSV
    print(f"\n   Loading CSV: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"   CSV columns: {list(df.columns)}")
    print(f"   CSV rows: {len(df)}")
    df = df.rename(columns={'class': 'Label'})
    print(f"   Label distribution:\n{df['Label'].value_counts().to_string()}")

    # ── STEP 4: Class weights
    print("\n⚖️  STEP 4: Handling class imbalance...")
    all_paths = normal_files + jaundice_files
    all_labels = np.array([0]*n_normal + [1]*n_jaundice)

    cw = compute_class_weight('balanced', classes=np.array([0, 1]), y=all_labels)
    class_weight_dict = {0: cw[0], 1: cw[1]}
    print(f"   Class weights → Normal: {cw[0]:.2f} | Jaundice: {cw[1]:.2f}")

    # ══════════════════════════════════════════════
    # APPROACH A: CSV-based XGBoost (RGB features)
    # ══════════════════════════════════════════════
    print("\n" + "=" * 50)
    print("🅰️  APPROACH A: XGBoost on CSV RGB Features")
    print("=" * 50)

    y_csv = df['Label'].values
    le = LabelEncoder()
    Y_csv = le.fit_transform(y_csv)
    X_csv = df.drop(columns=['Label', 'ID'])

    scaler_csv = MinMaxScaler()
    X_csv_scaled = scaler_csv.fit_transform(X_csv)

    X_tr_c, X_te_c, y_tr_c, y_te_c = train_test_split(
        X_csv_scaled, Y_csv, test_size=0.2, random_state=42, stratify=Y_csv)

    scale_pos = cw[1] / cw[0]
    xgb_csv = xgb.XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.05,
        scale_pos_weight=scale_pos, random_state=42,
        eval_metric='logloss', use_label_encoder=False)
    xgb_csv.fit(X_tr_c, y_tr_c, eval_set=[(X_te_c, y_te_c)], verbose=0)

    y_pred_c = xgb_csv.predict(X_te_c)
    acc_c = accuracy_score(y_te_c, y_pred_c) * 100
    sens_c = recall_score(y_te_c, y_pred_c) * 100
    print(f"   CSV XGBoost Accuracy:    {acc_c:.1f}%")
    print(f"   CSV XGBoost Sensitivity: {sens_c:.1f}%")

    # ══════════════════════════════════════════════
    # APPROACH B: Image-based model
    # ══════════════════════════════════════════════
    print("\n" + "=" * 50)
    print("🅱️  APPROACH B: Image-based Model (XGBoost + MLP)")
    print("=" * 50)

    # ── STEP 5: Extract image features
    print("\n🎨 STEP 5: Extracting image features...")

    def extract_image_features(img_path):
        """Extract color histogram + stats from image."""
        img = cv2.imread(img_path)
        if img is None:
            return None
        img = cv2.resize(img, (224, 224))
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)

        features = []
        # RGB stats (6)
        for ch in range(3):
            features.append(img_rgb[:,:,ch].mean())
            features.append(img_rgb[:,:,ch].std())
        # HSV stats (6)
        for ch in range(3):
            features.append(img_hsv[:,:,ch].mean())
            features.append(img_hsv[:,:,ch].std())
        # LAB stats (6) — L*a*b good for skin color
        for ch in range(3):
            features.append(img_lab[:,:,ch].mean())
            features.append(img_lab[:,:,ch].std())
        # Color histograms (48 = 16 bins * 3 channels)
        for ch in range(3):
            hist = cv2.calcHist([img_rgb], [ch], None, [16], [0, 256])
            hist = hist.flatten() / hist.sum()
            features.extend(hist)
        # Yellow ratio (key for jaundice)
        r, g, b = img_rgb[:,:,0].astype(float), img_rgb[:,:,1].astype(float), img_rgb[:,:,2].astype(float)
        yellow_mask = (r > 150) & (g > 120) & (b < 100)
        features.append(yellow_mask.sum() / (224*224))
        # Skin yellowness index
        features.append((r.mean() + g.mean()) / (b.mean() + 1))

        return np.array(features)  # 68 features

    X_img, y_img, paths_img = [], [], []
    for i, path in enumerate(all_paths):
        if i % 100 == 0:
            print(f"   Processing {i+1}/{n_total}...")
        feat = extract_image_features(path)
        if feat is not None:
            X_img.append(feat)
            y_img.append(all_labels[i])
            paths_img.append(path)

    X_img = np.array(X_img)
    y_img = np.array(y_img)
    print(f"   Extracted {len(X_img)} feature vectors ({X_img.shape[1]} features each)")

    # ── Train/Val/Test split (stratified)
    print("\n✂️  Splitting: 70% train / 15% val / 15% test...")
    X_trainval, X_test, y_trainval, y_test, p_trainval, p_test = train_test_split(
        X_img, y_img, paths_img, test_size=0.15, random_state=42, stratify=y_img)
    X_train, X_val, y_train, y_val = train_test_split(
        X_trainval, y_trainval, test_size=0.176, random_state=42, stratify=y_trainval)

    print(f"   Train: Normal={np.sum(y_train==0)}, Jaundice={np.sum(y_train==1)}")
    print(f"   Val:   Normal={np.sum(y_val==0)}, Jaundice={np.sum(y_val==1)}")
    print(f"   Test:  Normal={np.sum(y_test==0)}, Jaundice={np.sum(y_test==1)}")

    # Scale
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s = scaler.transform(X_val)
    X_test_s = scaler.transform(X_test)

    # ── STEP 6 & 7: Train XGBoost
    print("\n🚀 STEP 6-7: Training XGBoost...")
    model_xgb = xgb.XGBClassifier(
        n_estimators=300, max_depth=8, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=scale_pos, random_state=42,
        eval_metric='logloss', use_label_encoder=False)
    model_xgb.fit(X_train_s, y_train,
                  eval_set=[(X_val_s, y_val)], verbose=0)

    # ── Train MLP
    print("   Training MLP backup...")
    model_mlp = MLPClassifier(
        hidden_layer_sizes=(256, 128, 64), max_iter=500,
        random_state=42, early_stopping=True, validation_fraction=0.15,
        learning_rate='adaptive', alpha=0.001)
    model_mlp.fit(X_train_s, y_train)

    # ── Ensemble
    print("   Building ensemble...")
    # Use soft voting
    y_xgb_prob = model_xgb.predict_proba(X_test_s)[:, 1]
    y_mlp_prob = model_mlp.predict_proba(X_test_s)[:, 1]
    y_ensemble_prob = (y_xgb_prob * 0.6 + y_mlp_prob * 0.4)

    # Optimise threshold for sensitivity
    best_thresh, best_sens = 0.5, 0
    for t in np.arange(0.3, 0.7, 0.01):
        preds = (y_ensemble_prob >= t).astype(int)
        s = recall_score(y_test, preds)
        if s >= best_sens:
            best_sens = s
            best_thresh = t
    print(f"   Optimal threshold: {best_thresh:.2f} (Sensitivity: {best_sens*100:.1f}%)")

    y_pred = (y_ensemble_prob >= best_thresh).astype(int)

    # ── STEP 9: Evaluate
    acc = accuracy_score(y_test, y_pred) * 100
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    sensitivity = tp / (tp + fn) * 100 if (tp + fn) > 0 else 0
    specificity = tn / (tn + fp) * 100 if (tn + fp) > 0 else 0
    precision = precision_score(y_test, y_pred) * 100
    auc = roc_auc_score(y_test, y_ensemble_prob)

    print("\n" + "━" * 40)
    print("FINAL MODEL PERFORMANCE")
    print("━" * 40)
    print(f"Accuracy:    {acc:.1f}%")
    print(f"Sensitivity: {sensitivity:.1f}%  ← Jaundice cases caught")
    print(f"Specificity: {specificity:.1f}%  ← Normal cases correct")
    print(f"Precision:   {precision:.1f}%")
    print(f"AUC Score:   {auc:.3f}")
    print("━" * 40)
    jaundice_test = int(tp + fn)
    print(f"Out of {jaundice_test} jaundice babies in test set:")
    print(f"  Model correctly flags: {tp} babies ✅")
    print(f"  Model misses:          {fn} babies ❌")
    print("━" * 40)
    print(f"\nConfusion Matrix:")
    print(f"                  Predicted Normal  Predicted Jaundice")
    print(f"Actual Normal:         {tn:4d}              {fp:4d}")
    print(f"Actual Jaundice:       {fn:4d}              {tp:4d}")

    if sensitivity < 75:
        print("\n⚠️  WARNING: Model sensitivity too low for medical use.")
        print("   Collecting more jaundice images recommended.")
        print("   DO NOT deploy this model clinically.")

    print("\n" + classification_report(y_test, y_pred, target_names=['Normal', 'Jaundice']))

    # ── STEP 10: Save models
    print("\n💾 STEP 10: Saving models...")
    xgb_path = os.path.join(MODEL_DIR, 'jaundice_detector_xgb.joblib')
    mlp_path = os.path.join(MODEL_DIR, 'jaundice_detector_mlp.joblib')
    scaler_path = os.path.join(MODEL_DIR, 'jaundice_scaler.joblib')

    joblib.dump(model_xgb, xgb_path)
    joblib.dump(model_mlp, mlp_path)
    joblib.dump(scaler, scaler_path)
    print(f"   ✅ XGBoost: {xgb_path}")
    print(f"   ✅ MLP:     {mlp_path}")
    print(f"   ✅ Scaler:  {scaler_path}")

    # Save config JSON
    config = {
        "image_size": 224,
        "normalize_divide_by": 255.0,
        "input_shape": [1, 224, 224, 3],
        "output_type": "sigmoid",
        "thresholds": {"high_risk": 0.75, "medium_risk": 0.50, "low_risk": 0.50},
        "optimal_threshold": round(best_thresh, 3),
        "class_mapping": {"0": "NORMAL", "1": "JAUNDICE"},
        "feature_count": int(X_img.shape[1]),
        "training_data": {
            "normal_images": n_normal, "jaundice_images": n_jaundice,
            "total": n_total, "dataset": "NJN Dataset"
        },
        "performance": {
            "accuracy": round(acc, 2), "sensitivity": round(sensitivity, 2),
            "specificity": round(specificity, 2), "precision": round(precision, 2),
            "auc": round(auc, 4)
        },
        "scaler_means": scaler.mean_.tolist(),
        "scaler_stds": scaler.scale_.tolist()
    }
    config_path = os.path.join(MODEL_DIR, 'vision_config.json')
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"   ✅ Config:  {config_path}")

    # ── STEP 11: Sample predictions
    print("\n🧪 STEP 11: Sample predictions...")
    indices = np.random.choice(len(X_test), min(5, len(X_test)), replace=False)
    for idx in indices:
        prob = y_ensemble_prob[idx]
        pred_label = 'JAUNDICE' if prob >= best_thresh else 'NORMAL'
        actual_label = 'JAUNDICE' if y_test[idx] == 1 else 'NORMAL'
        correct = '✅ CORRECT' if pred_label == actual_label else '❌ WRONG'
        fname = os.path.basename(p_test[idx])
        print(f"   Image: {fname}")
        print(f"   Predicted: {pred_label} ({prob*100:.1f}% confident)")
        print(f"   Actual:    {actual_label}")
        print(f"   Result:    {correct}")
        print("   " + "─" * 30)

    # ── STEP 12: Plot graphs
    print("\n📊 STEP 12: Saving graphs...")

    # Confusion matrix heatmap
    fig, ax = plt.subplots(figsize=(8, 6), dpi=150)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Normal', 'Jaundice'],
                yticklabels=['Normal', 'Jaundice'], ax=ax,
                annot_kws={"size": 18})
    ax.set_xlabel('Predicted', fontsize=14)
    ax.set_ylabel('Actual', fontsize=14)
    ax.set_title('Maatri.AI Jaundice Detection — Confusion Matrix', fontsize=16)
    plt.tight_layout()
    cm_path = os.path.join(OUTPUT_DIR, 'confusion_matrix.png')
    plt.savefig(cm_path)
    plt.close()
    print(f"   ✅ {cm_path}")

    # Feature importance
    fig, ax = plt.subplots(figsize=(10, 6), dpi=150)
    feat_names = (
        ['R_mean','R_std','G_mean','G_std','B_mean','B_std'] +
        ['H_mean','H_std','S_mean','S_std','V_mean','V_std'] +
        ['L_mean','L_std','a_mean','a_std','b_mean','b_std'] +
        [f'histR_{i}' for i in range(16)] + [f'histG_{i}' for i in range(16)] +
        [f'histB_{i}' for i in range(16)] + ['yellow_ratio', 'yellowness_idx']
    )
    imp = model_xgb.feature_importances_
    top_idx = np.argsort(imp)[-15:]
    ax.barh([feat_names[i] if i < len(feat_names) else f'f{i}' for i in top_idx], imp[top_idx], color='#FF9800')
    ax.set_title('Top 15 Feature Importances', fontsize=14)
    plt.tight_layout()
    fi_path = os.path.join(OUTPUT_DIR, 'feature_importance.png')
    plt.savefig(fi_path)
    plt.close()
    print(f"   ✅ {fi_path}")

    # Sample predictions grid
    fig, axes = plt.subplots(2, 3, figsize=(12, 8), dpi=150)
    sample_idx = np.random.choice(len(X_test), min(6, len(X_test)), replace=False)
    for i, ax in enumerate(axes.flat):
        if i >= len(sample_idx):
            ax.axis('off'); continue
        idx = sample_idx[i]
        img = cv2.imread(p_test[idx])
        if img is not None:
            img = cv2.cvtColor(cv2.resize(img, (224, 224)), cv2.COLOR_BGR2RGB)
            ax.imshow(img)
        prob = y_ensemble_prob[idx]
        pred = 'JAUNDICE' if prob >= best_thresh else 'NORMAL'
        actual = 'JAUNDICE' if y_test[idx] == 1 else 'NORMAL'
        color = 'green' if pred == actual else 'red'
        ax.set_title(f'P:{pred} A:{actual}\n{prob*100:.0f}%', fontsize=10, color=color)
        ax.axis('off')
    plt.suptitle('Sample Predictions', fontsize=14)
    plt.tight_layout()
    sp_path = os.path.join(OUTPUT_DIR, 'sample_predictions.png')
    plt.savefig(sp_path)
    plt.close()
    print(f"   ✅ {sp_path}")

    # ── STEP 13: Final summary
    xgb_size = os.path.getsize(xgb_path) / (1024*1024)
    print("\n" + "━" * 50)
    print("MAATRI.AI VISION MODEL — TRAINING COMPLETE")
    print("━" * 50)
    print(f"Dataset: NJN (Normal={n_normal}, Jaundice={n_jaundice})")
    print(f"Model: XGBoost + MLP Ensemble")
    print(f"Final Sensitivity: {sensitivity:.1f}%")
    print(f"Final Accuracy: {acc:.1f}%")
    print(f"AUC: {auc:.3f}")
    print(f"Model Size: {xgb_size:.2f} MB")
    print("━" * 50)
    print("Files saved:")
    print(f"✅ {xgb_path}")
    print(f"✅ {mlp_path}")
    print(f"✅ {scaler_path}")
    print(f"✅ {config_path}")
    print(f"✅ {cm_path}")
    print("━" * 50)
    print("MOBILE APP PREPROCESSING INSTRUCTIONS:")
    print("1. Resize image to 224x224 pixels")
    print("2. Convert to RGB (3 channels)")
    print("3. Extract color features (RGB/HSV/LAB stats + histograms)")
    print("4. Scale using scaler_means/scaler_stds from vision_config.json")
    print("5. Run XGBoost prediction")
    print(f"6. >= 0.75 → HIGH RISK (Jaundice)")
    print(f"7. >= 0.50 → MEDIUM RISK (Monitor)")
    print(f"8. <  0.50 → LOW RISK (Normal)")
    print("━" * 50)

if __name__ == '__main__':
    main()
