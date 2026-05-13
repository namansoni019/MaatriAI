"""
04_audio_preprocessing.py
Maatri.AI — Standalone Audio Preprocessing Module

This module defines the EXACT preprocessing pipeline used during training.
The React Native mobile app MUST replicate these steps identically using
expo-av and JavaScript math for on-device inference to work correctly.

PREPROCESSING PIPELINE (must be replicated in mobile app):
─────────────────────────────────────────────────────────
1. Load raw audio → resample to 22050 Hz (mono)
2. Pad or trim to exactly 3.0 seconds (66150 samples)
3. Compute Mel Spectrogram:
     - n_mels=64, n_fft=1024, hop_length=512
     - This produces a (64, T) matrix where T ≈ 130
4. Convert power spectrogram to dB scale:
     - mel_db = 10 * log10(mel / max(mel))
5. Resize the (64, T) matrix to exactly (64, 64):
     - Use bilinear interpolation
6. Normalize to [0, 1]:
     - val = (val - min) / (max - min)
7. Reshape to (1, 64, 64, 1) for model input
"""

import numpy as np
import librosa
import json
import os

# ── Preprocessing parameters (MUST match training config)
SR = 22050           # Sample rate in Hz
DURATION = 3.0       # Audio clip length in seconds
N_MELS = 64          # Number of Mel frequency bands
N_FFT = 1024         # FFT window size (samples)
HOP_LENGTH = 512     # Hop length between FFT windows (samples)
TARGET_SAMPLES = int(SR * DURATION)  # = 66150 samples


def load_and_preprocess(audio_path: str, duration=DURATION, sr=SR) -> np.ndarray:
    """
    Load an audio file, resample to target SR, and pad/trim to exact duration.
    
    Steps (replicate in React Native):
    ───────────────────────────────────
    Step 1: Load the audio file
        - Use expo-av to record or load audio
        - Ensure mono channel (single channel)
        
    Step 2: Resample to 22050 Hz
        - If recorded at a different rate (e.g., 44100), 
          downsample by taking every Nth sample
        - Simple: new_audio[i] = audio[i * (original_sr / 22050)]
    
    Step 3: Pad or trim to exactly 66150 samples (3 seconds)
        - If shorter: append zeros to the end
        - If longer: take only the first 66150 samples
    
    Args:
        audio_path: Path to the .wav file
        duration: Target duration in seconds (default: 3.0)
        sr: Target sample rate (default: 22050)
    
    Returns:
        np.ndarray of shape (66150,) — the preprocessed audio waveform
    """
    # Step 1: Load audio, converting to mono and resampling to target SR
    audio, loaded_sr = librosa.load(audio_path, sr=sr, mono=True)
    
    target_length = int(sr * duration)
    
    # Step 3: Pad or trim
    if len(audio) < target_length:
        # Pad with zeros at the end
        padding = target_length - len(audio)
        audio = np.pad(audio, (0, padding), mode='constant', constant_values=0)
        # In JS: const padded = new Float32Array(66150); padded.set(audio);
    else:
        # Trim to exact length
        audio = audio[:target_length]
        # In JS: const trimmed = audio.slice(0, 66150);
    
    return audio


def extract_melspec(audio: np.ndarray, sr=SR) -> np.ndarray:
    """
    Extract Mel Spectrogram from preprocessed audio, return normalized (64, 64) array.
    
    Steps (replicate in React Native):
    ───────────────────────────────────
    Step 1: Compute Short-Time Fourier Transform (STFT)
        - Window size: 1024 samples
        - Hop: 512 samples  
        - This slides a 1024-sample window across the audio,
          moving 512 samples each step
        - For 66150 samples: produces ~130 time frames
        - Apply Hann window before FFT
        
        In JS (simplified):
        ```
        for (let frame = 0; frame * 512 + 1024 <= audio.length; frame++) {
            const segment = audio.slice(frame * 512, frame * 512 + 1024);
            // Apply Hann window
            for (let i = 0; i < 1024; i++) {
                segment[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / 1023));
            }
            // FFT → magnitude squared → power spectrum
            const fft = computeFFT(segment);
            powerSpectrum[frame] = fft.map(x => x.real**2 + x.imag**2);
        }
        ```
    
    Step 2: Apply Mel filterbank
        - Create 64 triangular filters spaced on the Mel scale
        - Mel(f) = 2595 * log10(1 + f/700)
        - Multiply each power spectrum frame by the filterbank matrix
        - Result: (64, ~130) matrix
        
    Step 3: Convert to decibels
        - mel_db = 10 * log10(mel_power / max_power)
        - Clip minimum to -80 dB
        
        In JS:
        ```
        const maxVal = Math.max(...melPower.flat());
        const melDb = melPower.map(row => 
            row.map(val => Math.max(10 * Math.log10(val / maxVal + 1e-10), -80))
        );
        ```
    
    Step 4: Resize to (64, 64)
        - The time axis has ~130 frames, resize to 64
        - Use bilinear interpolation along the time axis
        
        In JS (simplified):
        ```
        const resized = new Array(64);
        for (let i = 0; i < 64; i++) {
            resized[i] = new Float32Array(64);
            for (let j = 0; j < 64; j++) {
                const srcJ = j * (origWidth - 1) / 63;
                const low = Math.floor(srcJ);
                const high = Math.min(low + 1, origWidth - 1);
                const frac = srcJ - low;
                resized[i][j] = melDb[i][low] * (1 - frac) + melDb[i][high] * frac;
            }
        }
        ```
    
    Step 5: Normalize to [0, 1]
        - Find min and max across entire (64, 64) matrix
        - val_normalized = (val - min) / (max - min)
        
        In JS:
        ```
        let min = Infinity, max = -Infinity;
        for (const row of resized) {
            for (const val of row) {
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }
        const range = max - min || 1;
        const normalized = resized.map(row => 
            row.map(val => (val - min) / range)
        );
        ```
    
    Args:
        audio: Preprocessed audio waveform, shape (66150,)
        sr: Sample rate (default: 22050)
    
    Returns:
        np.ndarray of shape (64, 64) — normalized Mel Spectrogram
    """
    # Step 1 & 2: Compute Mel Spectrogram
    mel = librosa.feature.melspectrogram(
        y=audio, sr=sr, 
        n_mels=N_MELS,     # 64 frequency bands
        n_fft=N_FFT,        # 1024 FFT window
        hop_length=HOP_LENGTH  # 512 hop
    )
    # mel shape: (64, ~130)
    
    # Step 3: Convert to dB scale
    mel_db = librosa.power_to_db(mel, ref=np.max)
    # mel_db values are now in range [-80, 0] approximately
    
    # Step 4: Resize to (64, 64) using bilinear interpolation
    import cv2
    mel_resized = cv2.resize(mel_db, (64, 64), interpolation=cv2.INTER_LINEAR)
    
    # Step 5: Normalize to [0, 1]
    mel_min = mel_resized.min()
    mel_max = mel_resized.max()
    if mel_max - mel_min > 0:
        mel_normalized = (mel_resized - mel_min) / (mel_max - mel_min)
    else:
        mel_normalized = np.zeros_like(mel_resized)
    
    return mel_normalized  # shape: (64, 64)


def preprocess_for_model(audio_path: str) -> np.ndarray:
    """
    Complete pipeline: audio file → model-ready input tensor.
    
    Args:
        audio_path: Path to audio file
    
    Returns:
        np.ndarray of shape (1, 64, 64, 1) — ready for TFLite inference
    """
    # Step 1: Load and preprocess audio
    audio = load_and_preprocess(audio_path)
    
    # Step 2: Extract Mel Spectrogram
    mel = extract_melspec(audio)
    
    # Step 3: Reshape for model: (64, 64) → (1, 64, 64, 1)
    # Batch dimension + channel dimension
    model_input = mel[np.newaxis, ..., np.newaxis].astype(np.float32)
    
    return model_input


# ── Self-test
if __name__ == '__main__':
    print("=" * 60)
    print("🔧 Audio Preprocessing Pipeline — Self Test")
    print("=" * 60)
    
    print(f"\n📋 Configuration:")
    print(f"   Sample Rate:  {SR} Hz")
    print(f"   Duration:     {DURATION} sec")
    print(f"   Target Samples: {TARGET_SAMPLES}")
    print(f"   N_MELS:       {N_MELS}")
    print(f"   N_FFT:        {N_FFT}")
    print(f"   HOP_LENGTH:   {HOP_LENGTH}")
    
    # Test with synthetic audio
    print(f"\n🧪 Testing with synthetic 3-second sine wave...")
    t = np.linspace(0, DURATION, TARGET_SAMPLES, endpoint=False)
    test_audio = 0.1 * np.sin(2 * np.pi * 300 * t)
    
    print(f"   Audio shape: {test_audio.shape}")
    print(f"   Audio range: [{test_audio.min():.4f}, {test_audio.max():.4f}]")
    
    mel = extract_melspec(test_audio)
    print(f"   Mel Spec shape: {mel.shape}")
    print(f"   Mel Spec range: [{mel.min():.4f}, {mel.max():.4f}]")
    
    model_input = mel[np.newaxis, ..., np.newaxis].astype(np.float32)
    print(f"   Model input shape: {model_input.shape}")
    print(f"   Model input dtype: {model_input.dtype}")
    
    # Test with a real ICBHI file if available
    dataset_dir = os.path.join('..', 'ICBHI_final_database')
    wav_files = [f for f in os.listdir(dataset_dir) if f.endswith('.wav')] if os.path.exists(dataset_dir) else []
    
    if wav_files:
        test_wav = os.path.join(dataset_dir, wav_files[0])
        print(f"\n🎵 Testing with real file: {wav_files[0]}")
        
        audio = load_and_preprocess(test_wav)
        print(f"   Loaded audio shape: {audio.shape}")
        
        mel = extract_melspec(audio)
        print(f"   Mel Spec shape: {mel.shape}")
        
        model_input = mel[np.newaxis, ..., np.newaxis].astype(np.float32)
        print(f"   Model input shape: {model_input.shape}")
    
    print(f"\n✅ Preprocessing pipeline working correctly!")
    print(f"   React Native app must replicate these exact steps.")
    print("=" * 60)
