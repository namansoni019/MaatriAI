# Maatri.AI: Maternal & Neonatal Care AI 🤱🩺

Maatri.AI is an offline-first mobile application designed to empower ASHA (Accredited Social Health Activist) workers in rural India. It provides AI-powered diagnostic tools to identify high-risk pregnancies and neonatal conditions, ensuring timely medical intervention.

## 🚨 The Problem
In India:
- **24,000+** maternal deaths occur annually due to preventable complications.
- **468,000+** neonatal deaths happen each year, often due to missed danger signs like jaundice or respiratory distress.
- ASHA workers lack access to rapid, on-the-spot diagnostic assistance in remote, offline areas.

## ✨ What Maatri.AI Does
1. **Offline-First Patient Management**: Add and manage records for pregnant mothers and newborns entirely offline.
2. **AI Danger Sign Triage**: Evaluates health metrics and symptoms to immediately flag high-risk cases using a rules-based NLP engine.
3. **Neonatal Breath Analysis**: Uses an on-device/local machine learning model to detect abnormal breathing patterns via microphone audio.
4. **Jaundice Vision Scan**: Uses the smartphone camera to analyze skin tone against a color-calibration card, predicting jaundice risk (bilirubin levels).
5. **Smart Priority Queueing**: Automatically prioritizes the ASHA worker's daily visits based on risk scores and overdue dates.
6. **Background Sync**: Seamlessly syncs all data to a secure FastAPI cloud backend the moment internet connectivity is restored.

## 📱 Screenshots
*(Screenshots coming soon)*

## 🛠️ Tech Stack
- **Frontend App**: React Native (Expo), TypeScript
- **Local Storage**: SQLite (expo-sqlite), AsyncStorage
- **State/i18n**: React Context, react-i18next (Hindi/Marathi support)
- **AI/ML Pipeline**: XGBoost, MLPClassifier, Librosa (Audio), OpenCV
- **Backend API**: Python, FastAPI, SQLAlchemy
- **Voice**: expo-speech (Text-to-Speech), @react-native-voice/voice

## 🚀 How to Run Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Expo Server:**
   ```bash
   npx expo start
   ```

3. **Run on your Phone:**
   Download the **Expo Go** app on your Android/iOS device and scan the QR code shown in your terminal. Ensure your phone and computer are on the same Wi-Fi network.

## 🎯 Try Demo Mode
Don't want to set up an account or add test data manually?
1. Open the app.
2. On the Login Screen, click the **"🎯 Try Demo Mode"** link at the very bottom.
3. The app will automatically populate with a sample ASHA worker profile and 5 pre-scored mothers with varying risk tiers, and log you in immediately.

## 🧠 ML Models (Training)
The `/ml` directory contains the Python scripts required to train the diagnostic models.
- **Breath Model**: `03_train_breath_model.py` trains on the ICBHI respiratory dataset.
- **Jaundice Model**: `05_train_jaundice_model.py` trains on the NJN (Neonatal Jaundice) image dataset.
- Models are exported as `.joblib` files and served via the FastAPI inference server (`06_inference_server.py`).

## 🤝 Looking for Partners
We are actively seeking collaborations to take Maatri.AI from a prototype to a life-saving tool in the field.

We are looking for:
- 🏥 **NGO partners** for a pilot program
- 👩⚕️ **Clinical advisors** (maternal/neonatal health experts)
- 🏛️ **Government health officials** (NHM/ASHA program directors)

**Contact:** [YOUR EMAIL HERE]

*Organizations we hope to partner with:*
Wadhwani AI | ARMMAN | Digital Green | UNICEF India

## 📄 License
This project is licensed under the MIT License.
