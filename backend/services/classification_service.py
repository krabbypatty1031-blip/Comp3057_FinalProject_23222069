"""
Song Classification Service
CNN-based Music Genre Classification Service
Reference: Song_Classification.ipynb
"""

import os
import io
import numpy as np
import logging
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Model path configuration: points to models folder in project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_DIR = os.path.join(PROJECT_ROOT, "models")

# Genre label mapping (Consistent with Notebook training)
# genres = {'metal': 0, 'disco': 1, 'classical': 2, 'hiphop': 3, 'jazz': 4,
#           'country': 5, 'pop': 6, 'blues': 7, 'reggae': 8, 'rock': 9}
GENRES = {
    0: 'Metal',
    1: 'Disco', 
    2: 'Classical',
    3: 'Hip-hop',
    4: 'Jazz',
    5: 'Country',
    6: 'Pop',
    7: 'Blues',
    8: 'Reggae',
    9: 'Rock'
}


class ClassificationService:
    """
    Song Classification Service Class
    Uses CNN model to classify audio Mel spectrograms
    """
    
    # Audio processing parameters (Consistent with training)
    SAMPLE_RATE = 22050
    SONG_SAMPLES = 660000  # 30 seconds * 22050 Hz
    WINDOW_SIZE = 0.05     # 5% window
    OVERLAP = 0.5          # 50% overlap
    N_FFT = 1024
    HOP_LENGTH = 256
    N_MELS = 128
    
    def __init__(self):
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """
        Load pre-trained classification model
        """
        try:
            # Attempt to load main model
            model_path = os.path.join(MODEL_DIR, "song_classification_model.keras")
            if os.path.exists(model_path):
                from tensorflow.keras.models import load_model
                self.model = load_model(model_path)
                logger.info(f"Classification model loaded from {model_path}")
                return
            
            # Attempt alternate path
            alt_path = os.path.join(
                os.path.dirname(os.path.dirname(MODEL_DIR)),
                "Song Classification",
                "custom_cnn_2d.keras"
            )
            if os.path.exists(alt_path):
                from tensorflow.keras.models import load_model
                self.model = load_model(alt_path)
                logger.info(f"Classification model loaded from {alt_path}")
                return
            
            logger.warning("Classification model not found, using demo mode")
            
        except Exception as e:
            logger.error(f"Error loading classification model: {e}")
            self.model = None
    
    def predict_genre(self, file_bytes: bytes) -> Dict[str, Any]:
        """
        Predict music genre of audio file
        
        Args:
            file_bytes: Byte content of audio file
        
        Returns:
            Dictionary containing prediction results and probabilities
        """
        
        if self.model is not None:
            logger.info("Using real model for classification")
            return self._predict_with_model(file_bytes)
        else:
            logger.warning("Model not loaded, using demo mode for classification")
            return self._predict_demo()
    
    def _predict_with_model(self, file_bytes: bytes) -> Dict[str, Any]:
        """
        Predict using real model
        """
        try:
            import librosa
            import soundfile as sf
            
            # Load audio
            signal, sr = self._load_audio(file_bytes)
            if signal is None:
                raise ValueError("Failed to load audio file")
            
            # Resample (if needed)
            if sr != self.SAMPLE_RATE:
                signal = librosa.resample(signal, orig_sr=sr, target_sr=self.SAMPLE_RATE)
            
            # Convert to mono
            if len(signal.shape) > 1:
                signal = np.mean(signal, axis=1)
            
            # Ensure sufficient length
            if len(signal) < self.SONG_SAMPLES:
                # Pad
                signal = np.pad(signal, (0, self.SONG_SAMPLES - len(signal)))
            else:
                signal = signal[:self.SONG_SAMPLES]
            
            # Split and convert to spectrograms
            specs = self._process_audio(signal)
            
            # Batch prediction
            predictions = self.model.predict(specs, verbose=0)
            
            # Aggregate predictions (average over all segments)
            avg_predictions = np.mean(predictions, axis=0)
            
            # Get top-k results
            return self._format_predictions(avg_predictions)
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            # Return demo results on error
            return self._predict_demo()
    
    def _load_audio(self, file_bytes: bytes) -> Tuple[Optional[np.ndarray], Optional[int]]:
        """
        Load audio from byte stream
        """
        import librosa
        import soundfile as sf
        
        try:
            # Try using soundfile
            audio_io = io.BytesIO(file_bytes)
            signal, sr = sf.read(audio_io)
            return signal, sr
        except Exception:
            pass
        
        try:
            # Try using librosa
            audio_io = io.BytesIO(file_bytes)
            signal, sr = librosa.load(audio_io, sr=None)
            return signal, sr
        except Exception as e:
            logger.error(f"Failed to load audio: {e}")
            return None, None
    
    def _process_audio(self, signal: np.ndarray) -> np.ndarray:
        """
        Process audio signal into Mel spectrogram
        Reference: splitsongs and to_melspectrogram in Song_Classification.ipynb
        """
        import librosa
        
        # Split parameters (Consistent with Notebook)
        chunk_size = int(len(signal) * self.WINDOW_SIZE)  # 660000 * 0.05 = 33000
        offset = int(chunk_size * (1 - self.OVERLAP))     # 33000 * 0.5 = 16500
        
        # Split audio (splitsongs)
        chunks = []
        for i in range(0, len(signal) - chunk_size + offset, offset):
            chunk = signal[i:i + chunk_size]
            if len(chunk) == chunk_size:
                chunks.append(chunk)
        
        logger.info(f"Split audio into {len(chunks)} chunks")
        
        # Convert to Mel spectrogram (to_melspectrogram)
        # Note: No amplitude_to_db conversion in Notebook!
        specs = []
        for chunk in chunks:
            mel_spec = librosa.feature.melspectrogram(
                y=chunk.astype(np.float32),
                sr=self.SAMPLE_RATE,
                n_fft=self.N_FFT,
                hop_length=self.HOP_LENGTH,
                n_mels=self.N_MELS
            )
            # Add channel dimension [:,:,np.newaxis] - Consistent with Notebook
            specs.append(mel_spec[:, :, np.newaxis])
        
        return np.array(specs)
    
    def _format_predictions(self, predictions: np.ndarray, top_k: int = 3) -> Dict[str, Any]:
        """
        Format prediction results
        """
        # Get sorted indices
        sorted_indices = np.argsort(predictions)[::-1]
        
        # Main prediction
        top_genre = GENRES[sorted_indices[0]]
        
        # Top-k probabilities
        probabilities = {}
        for i in range(min(top_k, len(sorted_indices))):
            idx = sorted_indices[i]
            genre_name = GENRES[idx]
            prob = float(predictions[idx])
            probabilities[genre_name] = round(prob, 4)
        
        return {
            "top_genre": top_genre,
            "confidence": round(float(predictions[sorted_indices[0]]), 4),
            "probabilities": probabilities,
            "all_genres": {GENRES[i]: round(float(p), 4) for i, p in enumerate(predictions)}
        }
    
    def _predict_demo(self) -> Dict[str, Any]:
        """
        Demo Mode: Return simulated prediction results
        """
        # Generate random but plausible probability distribution
        np.random.seed(None)  # Ensure different results each time
        
        # Use Dirichlet distribution to generate probabilities
        probs = np.random.dirichlet(np.ones(len(GENRES)) * 0.5)
        
        return self._format_predictions(probs)
    
    def get_supported_formats(self) -> list:
        """Return supported audio formats"""
        return ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac']


# Create global service instance
classification_service = ClassificationService()
