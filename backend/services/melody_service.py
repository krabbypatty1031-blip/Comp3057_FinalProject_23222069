"""
Melody Generation Service V2 (Optimized)
LSTM-based Melody Generation Service - Fully matches training logic

Optimizations:
1. Strictly matches Music_Generation.ipynb training config
2. Correct normalization/denormalization logic
3. Intelligent seed generation strategy
4. Key Constraint
5. Rhythmic Quantization
6. Enhanced MIDI Generation (Multi-track, Dynamic Velocity, Reverb)
"""

import os

# --- Monkey Patch for FluidSynth on Windows ---
# pretty_midi attempts to load FluidSynth which hardcodes a path 'C:\tools\fluidsynth\bin'.
# This causes a FileNotFoundError on Windows if the path doesn't exist.
# We patch os.add_dll_directory to catch this specific error.
if os.name == 'nt':
    original_add_dll_directory = os.add_dll_directory
    def safe_add_dll_directory(path):
        try:
            return original_add_dll_directory(path)
        except FileNotFoundError:
            # Ignore this error as we don't need FluidSynth's audio rendering features
            return None
    os.add_dll_directory = safe_add_dll_directory
# ----------------------------------------------

import numpy as np
import logging
from typing import List, Dict, Any, Optional
import json

import tensorflow as tf

logger = logging.getLogger(__name__)

# Model path configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_DIR = os.path.join(PROJECT_ROOT, "models")

# ============================================================================
# 1. Custom Loss Function (Consistent with training)
# ============================================================================

def mse_with_positive_pressure(y_true: tf.Tensor, y_pred: tf.Tensor) -> tf.Tensor:
    """
    MSE Loss + Penalty for negative values
    Exactly matches Music_Generation.ipynb
    """
    mse = tf.reduce_mean(tf.square(y_true - y_pred))
    positive_pressure = tf.reduce_mean(tf.maximum(-y_pred, 0.0) * 10)
    return mse + positive_pressure


# Register for compatibility with different TensorFlow versions
try:
    tf.keras.saving.register_keras_serializable()(mse_with_positive_pressure)
except AttributeError:
    try:
        tf.keras.utils.register_keras_serializable()(mse_with_positive_pressure)
    except AttributeError:
        pass


# ============================================================================
# 2. Prediction Function (Copied from Notebook)
# ============================================================================

def predict_next_note(
    notes: np.ndarray,
    model,
    temperature: float = 1.0
) -> tuple:
    """
    Prediction function directly copied from Music_Generation.ipynb
    
    Args:
        notes: Input sequence shape (1, seq_length, 3)
        model: Trained model
        temperature: Sampling temperature
    
    Returns:
        tuple: (pitch, step, duration)
    """
    assert temperature > 0, "Temperature must be greater than 0"
    
    # Model prediction
    predictions = model.predict(notes, verbose=0)
    
    # Pitch: sample after temperature scaling
    pitch_logits = predictions['pitch'] / temperature
    pitch = tf.random.categorical(pitch_logits, num_samples=1)
    pitch = tf.squeeze(pitch, axis=-1).numpy()[0]
    
    # Step and Duration: use regression output directly
    step = tf.squeeze(predictions['step'], axis=-1).numpy()[0]
    duration = tf.squeeze(predictions['duration'], axis=-1).numpy()[0]
    
    # Ensure step and duration are non-negative
    step = max(0, step)
    duration = max(0, duration)
    
    return int(pitch), float(step), float(duration)


# ============================================================================
# 3. Music Theory Tools
# ============================================================================

class MusicTheory:
    """
    Music Theory Utility Class
    Provides key constraints, scale mapping, etc.
    """
    
    # Scale definitions (MIDI intervals)
    SCALES = {
        'major': [0, 2, 4, 5, 7, 9, 11],  # C Major
        'minor': [0, 2, 3, 5, 7, 8, 10],  # A Minor
        'pentatonic': [0, 2, 4, 7, 9],    # Pentatonic
        'blues': [0, 3, 5, 6, 7, 10],     # Blues Scale
    }
    
    # Genre to scale mapping
    GENRE_SCALE_MAP = {
        'pop': 'major',
        'rock': 'pentatonic',
        'jazz': 'blues',
        'classical': 'major',
    }
    
    @staticmethod
    def get_scale_for_genre(genre: str) -> List[int]:
        """Get scale for genre"""
        scale_name = MusicTheory.GENRE_SCALE_MAP.get(genre.lower(), 'major')
        return MusicTheory.SCALES[scale_name]
    
    @staticmethod
    def constrain_to_scale(pitch: int, scale: List[int]) -> int:
        """
        Constrain pitch to specified scale
        
        Args:
            pitch: MIDI pitch
            scale: Scale interval list
        
        Returns:
            Adjusted pitch
        """
        if pitch < 0 or pitch > 127:
            return 60  # Middle C
        
        note = pitch % 12
        octave = pitch // 12
        
        # If already in scale, return directly
        if note in scale:
            return pitch
        
        # Find nearest scale note
        distances = [abs(note - s) for s in scale]
        min_distance = min(distances)
        nearest_note = scale[distances.index(min_distance)]
        
        # Handle octave crossing
        if nearest_note > note and note < 6:
            # May need to drop to next octave
            return octave * 12 + nearest_note
        else:
            return octave * 12 + nearest_note
    
    @staticmethod
    def quantize_duration(value: float, grid: float = 0.125) -> float:
        """
        Quantize duration to nearest grid (Rhythmic Quantization)
        
        Args:
            value: Original duration (seconds)
            grid: Grid size (default 0.125 = 32nd note)
        
        Returns:
            Quantized duration
        """
        if value <= 0.05:
            return 0.0
        
        # Round to nearest grid multiple
        quantized = round(value / grid) * grid
        
        # Minimum length protection
        if quantized == 0 and value > 0.05:
            return grid
        
        return quantized


# ============================================================================
# 4. Seed Generation Strategy
# ============================================================================

class SeedGenerator:
    """
    Intelligent Seed Sequence Generator
    Generates musical initial sequence based on genre
    """
    
    # Genre to start pitch mapping
    GENRE_START_PITCH = {
        'pop': 60,        # C4
        'rock': 57,       # A3
        'jazz': 63,       # Eb4
        'classical': 64,  # E4
    }
    
    @staticmethod
    def generate_smart_seed(
        genre: str,
        seq_length: int = 25,
        vocab_size: int = 128,
        max_step: float = 1.0,
        max_duration: float = 1.0
    ) -> np.ndarray:
        """
        Generate intelligent seed sequence
        
        Strategy:
        1. First half uses padding (0, 0, 0)
        2. Second half introduces simple musical motif
        3. Use correct normalization
        """
        seed = []
        
        # Get start pitch
        start_pitch = SeedGenerator.GENRE_START_PITCH.get(genre.lower(), 60)
        
        # Build sequence
        for i in range(seq_length):
            if i < 15:
                # First 15: Padding
                seed.append([0, 0, 0])
            else:
                # Last 10: Simple ascending scale
                offset = i - 15
                pitch = start_pitch + (offset % 5)  # Simple fifths ascending
                step = 0.5      # Eighth note
                duration = 0.4  # Slightly shorter than step
                
                # Normalization (Consistent with training)
                seed.append([
                    pitch / vocab_size,
                    step / max_step,
                    duration / max_duration
                ])
        
        return np.array(seed, dtype=np.float32)


# ============================================================================
# 5. MIDI Enhanced Generator
# ============================================================================

class EnhancedMidiGenerator:
    """
    Enhanced MIDI Generator
    Generates multi-track, reverb, dynamic velocity MIDI files
    """
    
    # Genre to instrument mapping
    INSTRUMENT_MAP = {
        'rock': 29,       # Overdriven Guitar
        'jazz': 66,       # Tenor Sax
        'classical': 40,  # Violin
        'pop': 0,         # Acoustic Grand Piano
    }
    
    # Chord progression (I - V - vi - IV)
    CHORD_PROGRESSION = [36, 43, 45, 41]  # C2, G2, A2, F2
    
    @staticmethod
    def notes_to_midi_base64(
        notes: List[Dict],
        tempo: int = 120,
        genre: str = "pop"
    ) -> str:
        """
        Convert notes to MIDI file base64 encoding
        
        Optimizations:
        1. Multi-track (Melody + Bass + Drums)
        2. Velocity Dynamics
        3. Unified Time Scaling - Solves rhythm misalignment
        """
        try:
            import pretty_midi
            import base64
            import io
            
            pm = pretty_midi.PrettyMIDI(initial_tempo=tempo)
            
            # --- Unified Time Scaling Factor ---
            
            # Assume model raw output is based on 120 BPM (1 beat = 0.5s)
            # We need to stretch/compress all timestamps based on target Tempo
            time_scale = 120.0 / max(tempo, 1)
            
            # Base beat duration (Quarter note at 120 BPM = 0.5s)
            base_seconds_per_beat = 0.5
            # Scaled beat duration
            seconds_per_beat = base_seconds_per_beat * time_scale
            
            # ==========================
            # Track 1: Melody
            # ==========================
            
            program = EnhancedMidiGenerator.INSTRUMENT_MAP.get(genre.lower(), 0)
            melody_inst = pretty_midi.Instrument(program=program, name="Melody")
            
            total_duration = 0.0
            
            # Notes here contain already scaled times (processed in generate_with_constraints)
            # So we don't need to scale start/end again, use directly.
            
            for note in notes:
                # Use directly, do not multiply by time_scale (prevent double scaling)
                start = note['start']
                end = note['end']
                
                # === Dynamic Velocity ===
                base_velocity = 100
                humanize = np.random.randint(-5, 6)
                
                # Strong beat accent (calculated based on scaled time)
                beat_pos = (start / seconds_per_beat) % 4
                accent = 0
                if abs(beat_pos - 0) < 0.1:      # First beat
                    accent = 15
                elif abs(beat_pos - 2) < 0.1:    # Third beat
                    accent = 10
                
                final_velocity = min(127, max(0, base_velocity + humanize + accent))
                
                midi_note = pretty_midi.Note(
                    velocity=final_velocity,
                    pitch=int(note['pitch']),
                    start=start,
                    end=end
                )
                melody_inst.notes.append(midi_note)
                total_duration = max(total_duration, end)
            
            pm.instruments.append(melody_inst)
            
            # ==========================
            # Track 2: Bass
            # ==========================
            
            bass_inst = pretty_midi.Instrument(program=33, name="Bass")
            
            current_time = 0.0
            bar_index = 0
            seconds_per_bar = seconds_per_beat * 4
            
            while current_time < total_duration:
                # Get current chord root
                root_pitch = EnhancedMidiGenerator.CHORD_PROGRESSION[bar_index % 4]
                
                # First beat: Long note
                bass_note1 = pretty_midi.Note(
                    velocity=90,
                    pitch=root_pitch,
                    start=current_time,
                    end=current_time + seconds_per_beat * 2
                )
                bass_inst.notes.append(bass_note1)
                
                # Third beat: Repeat
                if current_time + seconds_per_beat * 2 < total_duration:
                    bass_note2 = pretty_midi.Note(
                        velocity=85,
                        pitch=root_pitch,
                        start=current_time + seconds_per_beat * 2,
                        end=current_time + seconds_per_beat * 4
                    )
                    bass_inst.notes.append(bass_note2)
                
                current_time += seconds_per_bar
                bar_index += 1
            
            pm.instruments.append(bass_inst)
            
            # ==========================
            # Track 3: Drums
            # ==========================
            
            drum_inst = pretty_midi.Instrument(program=0, is_drum=True, name="Drums")
            
            current_time = 0.0
            bar_index = 0
            
            while current_time < total_duration:
                is_fill_bar = (bar_index + 1) % 4 == 0
                
                if is_fill_bar:
                    # === Drum Fill ===
                    # Hi-hat (First 3 beats)
                    for i in range(6):
                        hat_time = current_time + i * (seconds_per_beat / 2)
                        drum_inst.notes.append(pretty_midi.Note(
                            velocity=np.random.randint(60, 90),
                            pitch=42,
                            start=hat_time,
                            end=hat_time + 0.1
                        ))
                    
                    # Kick & Snare (First 3 beats)
                    drum_inst.notes.append(pretty_midi.Note(
                        velocity=100, pitch=36,
                        start=current_time,
                        end=current_time + 0.1
                    ))
                    drum_inst.notes.append(pretty_midi.Note(
                        velocity=95, pitch=38,
                        start=current_time + seconds_per_beat,
                        end=current_time + seconds_per_beat + 0.1
                    ))
                    drum_inst.notes.append(pretty_midi.Note(
                        velocity=90, pitch=36,
                        start=current_time + seconds_per_beat * 2,
                        end=current_time + seconds_per_beat * 2 + 0.1
                    ))
                    
                    # Fill (4th beat)
                    fill_start = current_time + seconds_per_beat * 3
                    drum_inst.notes.append(pretty_midi.Note(
                        velocity=110, pitch=38, start=fill_start, end=fill_start + 0.1
                    ))
                    drum_inst.notes.append(pretty_midi.Note(
                        velocity=100, pitch=50,
                        start=fill_start + seconds_per_beat * 0.25,
                        end=fill_start + seconds_per_beat * 0.25 + 0.1
                    ))
                    drum_inst.notes.append(pretty_midi.Note(
                        velocity=110, pitch=47,
                        start=fill_start + seconds_per_beat * 0.5,
                        end=fill_start + seconds_per_beat * 0.5 + 0.1
                    ))
                    drum_inst.notes.append(pretty_midi.Note(
                        velocity=120, pitch=43,
                        start=fill_start + seconds_per_beat * 0.75,
                        end=fill_start + seconds_per_beat * 0.75 + 0.1
                    ))
                    
                else:
                    # === Standard Groove ===
                    # Hi-hat (Eighth notes)
                    for i in range(8):
                        hat_time = current_time + i * (seconds_per_beat / 2)
                        if hat_time >= total_duration:
                            break
                        
                        base_vel = 85 if i % 2 == 0 else 60
                        vel = base_vel + np.random.randint(-10, 10)
                        
                        drum_inst.notes.append(pretty_midi.Note(
                            velocity=max(1, min(127, vel)),
                            pitch=42,
                            start=hat_time,
                            end=hat_time + 0.1
                        ))
                    
                    # Kick
                    kick_times = [0, 2, 2.5]
                    for kt in kick_times:
                        k_time = current_time + kt * seconds_per_beat
                        if k_time >= total_duration:
                            break
                        vel = 100 if kt % 1 == 0 else 90
                        drum_inst.notes.append(pretty_midi.Note(
                            velocity=vel, pitch=36,
                            start=k_time, end=k_time + 0.1
                        ))
                    
                    # Snare
                    snare_times = [1, 3]
                    for st in snare_times:
                        s_time = current_time + st * seconds_per_beat
                        if s_time >= total_duration:
                            break
                        
                        drum_inst.notes.append(pretty_midi.Note(
                            velocity=95 + np.random.randint(-5, 5),
                            pitch=38,
                            start=s_time,
                            end=s_time + 0.1
                        ))
                    
                    # Ghost Snare
                    if bar_index % 2 == 1:
                        ghost_time = current_time + 3.75 * seconds_per_beat
                        if ghost_time < total_duration:
                            drum_inst.notes.append(pretty_midi.Note(
                                velocity=50, pitch=38,
                                start=ghost_time,
                                end=ghost_time + 0.05
                            ))
                
                current_time += seconds_per_bar
                bar_index += 1
            
            pm.instruments.append(drum_inst)
            
            # Write to memory
            buffer = io.BytesIO()
            pm.write(buffer)
            buffer.seek(0)
            
            return base64.b64encode(buffer.read()).decode('utf-8')
            
        except Exception as e:
            import traceback
            logger.error(f"Error creating MIDI: {e}")
            logger.error(traceback.format_exc())
            return ""


# ============================================================================
# 6. Main Service Class
# ============================================================================

class MelodyServiceV2:
    """
    Melody Generation Service Class V2 (Optimized)
    
    Optimizations:
    1. Strictly matches training config
    2. Correct normalization logic
    3. Key constraints
    4. Rhythmic quantization
    5. Enhanced MIDI generation
    """
    
    # Training config constants (Consistent with Music_Generation.ipynb)
    KEY_ORDER = ['pitch', 'step', 'duration']
    VOCAB_SIZE = 128
    SEQ_LENGTH = 25
    
    def __init__(self):
        self.model = None
        # Normalization params (will load from file)
        self.max_step = 1.0
        self.max_duration = 1.0
        self.vocab_size = 128
        
        self._load_model()
    
    def _load_model(self):
        """
        Load pre-trained melody generation model and normalization params
        """
        try:
            # 1. Load model
            saved_model_path = os.path.join(MODEL_DIR, "classical_music_rnn_model")
            keras_model_path = os.path.join(MODEL_DIR, "music_generator_final.keras")
            
            path_to_load = None
            if os.path.exists(saved_model_path):
                path_to_load = saved_model_path
            elif os.path.exists(keras_model_path):
                path_to_load = keras_model_path
            else:
                # Compatible with old filename
                old_keras_path = os.path.join(MODEL_DIR, "music_generator.keras")
                if os.path.exists(old_keras_path):
                    path_to_load = old_keras_path
            
            if path_to_load:
                from tensorflow.keras.models import load_model
                self.model = load_model(
                    path_to_load,
                    custom_objects={"mse_with_positive_pressure": mse_with_positive_pressure},
                )
                logger.info(f"✓ Melody model loaded from {path_to_load}")
            else:
                logger.warning("Model not found, using demo mode")
            
            # 2. Load normalization params (CRITICAL!)
            params_path = os.path.join(MODEL_DIR, "normalization_params.json")
            if os.path.exists(params_path):
                with open(params_path, 'r') as f:
                    params = json.load(f)
                    self.max_step = params.get('MAX_STEP', 1.0)
                    self.max_duration = params.get('MAX_DURATION', 1.0)
                    self.vocab_size = params.get('VOCAB_SIZE', 128)
                logger.info(f"✓ Loaded normalization params: MAX_STEP={self.max_step:.4f}, MAX_DURATION={self.max_duration:.4f}")
            else:
                logger.warning("normalization_params.json not found, using defaults (1.0)")
        
        except Exception as e:
            logger.error(f"Error loading melody model: {e}")
            self.model = None
    
    def generate_melody(
        self,
        tempo: int = 120,
        genre: str = "pop",
        bars: int = 8,
        temperature: float = 1.1
    ) -> Dict[str, Any]:
        """
        Generate Melody (Optimized)
        
        Args:
            tempo: BPM
            genre: Music genre
            bars: Number of bars
            temperature: Sampling temperature
        
        Returns:
            Dictionary containing audio_url, notes, tempo, genre, bars
        """
        # Estimate number of notes
        num_notes = int(bars * 4 * 1.5)
        
        # 1. Generate intelligent seed
        input_notes = SeedGenerator.generate_smart_seed(
            genre=genre,
            seq_length=self.SEQ_LENGTH,
            vocab_size=self.vocab_size,
            max_step=self.max_step,
            max_duration=self.max_duration
        )
        
        # 2. Generate notes
        if self.model is not None:
            logger.info("Using real model for melody generation")
            try:
                notes = self._generate_with_constraints(
                    num_notes, input_notes, tempo, genre, temperature
                )
            except Exception as e:
                logger.error(f"Model inference failed: {e}")
                import traceback
                logger.error(traceback.format_exc())
                notes = self._generate_demo_melody(num_notes, tempo, genre)
        else:
            logger.warning("Model not loaded, using demo mode")
            notes = self._generate_demo_melody(num_notes, tempo, genre)
        
        # 3. Generate MIDI audio
        audio_url = self._create_audio(notes, tempo, genre)
        
        return {
            "audio_url": audio_url,
            "notes": notes,
            "tempo": tempo,
            "genre": genre,
            "bars": bars
        }
    
    def _generate_with_constraints(
        self,
        total_notes: int,
        input_notes: np.ndarray,
        tempo: int,
        genre: str,
        temperature: float
    ) -> List[Dict]:
        """
        Generate melody with constraints
        """
        generated_notes = []
        prev_start = 0.0
        
        # Get scale for this genre
        scale = MusicTheory.get_scale_for_genre(genre)
        logger.info(f"Using scale for {genre}: {scale}")
        
        # --- Tempo Scaling Factor ---
        # Re-introduced: To reflect tempo changes in frontend player (reading notes) and MIDI file
        # We unify time scaling here.
        tempo_scale = 120.0 / max(tempo, 1) 
        
        # Generation loop
        for i in range(total_notes):
            # 1. Predict
            pitch, step, duration = predict_next_note(
                input_notes[np.newaxis, :, :],
                self.model,
                temperature=temperature
            )
            
            # 2. Key constraint
            pitch = MusicTheory.constrain_to_scale(pitch, scale)
            
            # 3. Rhythmic quantization
            step = MusicTheory.quantize_duration(step, grid=0.125)
            duration = MusicTheory.quantize_duration(duration, grid=0.125)
            
            # 4. Minimum value protection
            step = max(0.125, step)
            duration = max(0.125, duration)
            
            # 5. Apply tempo scaling
            scaled_step = step * tempo_scale
            scaled_duration = duration * tempo_scale
            
            # 6. Build note object
            # start/end are accumulated absolute times, already scaled
            start = prev_start + scaled_step
            end = start + scaled_duration
            
            note_data = {
                'pitch': int(pitch),
                'start': float(start),
                'end': float(end),
                'step': float(scaled_step),
                'duration': float(scaled_duration)
            }
            generated_notes.append(note_data)
            
            # 7. Update input sequence (Note: Input sequence must keep original normalized values!)
            norm_new_note = [
                pitch / self.vocab_size,
                step / self.max_step,
                duration / self.max_duration
            ]
            input_notes = np.vstack([input_notes[1:], norm_new_note])
            
            prev_start = start
            
            # 8. Dynamic temperature adjustment
            if i > 0 and i % 16 == 0:
                temperature = 0.9 if temperature > 1.0 else 1.2
        
        logger.info(f"✓ Generated {len(generated_notes)} notes with tempo scale {tempo_scale:.2f}")
        return generated_notes
    
    def _generate_demo_melody(
        self,
        num_notes: int,
        tempo: int,
        genre: str
    ) -> List[Dict]:
        """
        Demo Mode Melody Generation
        """
        genre_configs = {
            "pop": {
                "scale": [60, 62, 64, 65, 67, 69, 71, 72],
                "rhythm_pattern": [0.5, 0.5, 1.0, 0.5, 0.5, 1.0, 0.25, 0.25],
                "duration_pattern": [0.4, 0.4, 0.8, 0.4, 0.4, 0.8, 0.2, 0.2]
            },
            "jazz": {
                "scale": [60, 63, 65, 66, 67, 70, 72],
                "rhythm_pattern": [0.33, 0.67, 0.5, 0.5, 1.0, 0.33, 0.67],
                "duration_pattern": [0.3, 0.6, 0.4, 0.4, 0.9, 0.3, 0.6]
            },
            "classical": {
                "scale": [60, 62, 64, 65, 67, 69, 71, 72, 74, 76],
                "rhythm_pattern": [1.0, 1.0, 0.5, 0.5, 1.0, 1.0, 2.0],
                "duration_pattern": [0.9, 0.9, 0.45, 0.45, 0.9, 0.9, 1.8]
            },
            "rock": {
                "scale": [60, 63, 65, 67, 70, 72],
                "rhythm_pattern": [0.25, 0.25, 0.5, 0.25, 0.25, 0.5, 1.0],
                "duration_pattern": [0.2, 0.2, 0.4, 0.2, 0.2, 0.4, 0.8]
            }
        }
        
        config = genre_configs.get(genre.lower(), genre_configs["pop"])
        scale = config["scale"]
        rhythm = config["rhythm_pattern"]
        durations = config["duration_pattern"]
        
        notes = []
        current_time = 0.0
        prev_pitch = scale[len(scale) // 2]
        
        for i in range(num_notes):
            # Choose pitch
            pitch_choices = [p for p in scale if abs(p - prev_pitch) <= 5]
            if not pitch_choices:
                pitch_choices = scale
            pitch = np.random.choice(pitch_choices)
            
            # Choose rhythm
            step = rhythm[i % len(rhythm)]
            duration = durations[i % len(durations)]
            
            # Add random variation
            step *= np.random.uniform(0.9, 1.1)
            duration *= np.random.uniform(0.9, 1.1)
            
            notes.append({
                "pitch": int(pitch),
                "step": round(step, 3),
                "duration": round(duration, 3),
                "start_time": round(current_time, 3)
            })
            
            current_time += step
            prev_pitch = pitch
        
        return notes
    
    def _create_audio(self, notes: List[Dict], tempo: int, genre: str) -> str:
        """
        Generate MIDI audio (return base64 data URL)
        """
        try:
            midi_base64 = EnhancedMidiGenerator.notes_to_midi_base64(notes, tempo, genre)
            if midi_base64:
                return f"data:audio/midi;base64,{midi_base64}"
        except Exception as e:
            logger.error(f"Error creating MIDI audio: {e}")
        
        return ""


# ============================================================================
# Global Service Instance
# ============================================================================

melody_service = MelodyServiceV2()
