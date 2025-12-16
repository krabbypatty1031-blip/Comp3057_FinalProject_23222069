# Musify - AI-Powered Music Creation & Discovery Platform

A comprehensive deep learning system for music generation, lyrics creation, and genre classification. This project integrates three independent AI modules: GPT-2 based lyrics generation, LSTM-based melody synthesis, and CNN-based genre classification.

## 🎵 Features

### 1. **Lyrics Generation**
- Generate creative song lyrics based on themes, moods, and keywords
- Powered by fine-tuned GPT-2 model
- Real-time generation with customizable parameters
- Average generation speed: 65 tokens/second

### 2. **Melody Generation**
- Create original musical melodies using LSTM networks
- Support for multiple genres (Pop, Jazz, Classical, Rock)
- Configurable tempo, genre, and bar count
- Multi-track MIDI output with bass and drums

### 3. **Genre Classification**
- Classify audio files into 10 music genres
- CNN-based spectrogram analysis
- Song-level accuracy: 81.7%
- Supported formats: WAV, MP3, FLAC, OGG, M4A, AAC

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI
- **Deep Learning**: TensorFlow/Keras, PyTorch, Transformers
- **Audio Processing**: Librosa, PrettyMIDI, SoundFile
- **API Server**: Uvicorn

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Audio Playback**: Tone.js, Soundfont Player
- **Routing**: React Router DOM

### AI Models
- **Lyrics**: GPT-2 (124M parameters)
- **Melody**: LSTM (2 layers, 128 units)
- **Classification**: CNN (5 convolutional layers)

## 📋 Prerequisites

### System Requirements
- **Python**: 3.8 or higher
- **Node.js**: 16.x or higher
- **GPU**: NVIDIA GPU with CUDA support (recommended for training, optional for inference)
- **RAM**: 8GB minimum, 16GB recommended
- **Disk Space**: ~5GB for models and dependencies

### Required Software
- Python package manager: `pip`
- Node.js package manager: `npm` or `yarn`
- Git (for cloning the repository)

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Musify
```

### ⚠️ Important: Model Setup

The repository includes the lightweight models for classification and melody generation, but **excludes** the large fine-tuned GPT-2 lyrics model due to file size limits.

**How to handle this:**

1.  **Recommended (For best results):**
    *   Open `Lyrics Generation/GPT2_Lyrics_Service.ipynb`.
    *   Run all cells. This will automatically download the base GPT-2 model, fine-tune it on the dataset, and save the optimized weights to your local `models/` folder.
    
2.  **Fallback:**
    *   If you skip step 1, the backend will automatically download and use the standard base `gpt2` model from Hugging Face.
    *   The application will still work, but the generated lyrics style may differ from the project's intended output.

### Step 2: Backend Setup

#### Option A: Using Virtual Environment (Recommended)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Option B: Using System Python

```bash
cd backend
pip install -r requirements.txt
```

**Note**: The installation may take 10-15 minutes depending on your internet connection, as it includes large packages like TensorFlow and PyTorch.

### Step 3: Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install
```

### Step 4: Download Pre-trained Models

The project requires pre-trained models for all three features. Models should be placed in the `models/` directory:

```
models/
├── gpt2_lyrics_backend/          # GPT-2 model for lyrics generation
│   ├── config.json
│   ├── pytorch_model.bin
│   └── tokenizer files...
├── music_generator_final.keras    # LSTM model for melody generation
├── normalization_params.json      # Normalization parameters for melody model
└── song_classification_model.keras # CNN model for genre classification
```

**If models are not available**, the system will run in "demo mode" with limited functionality. See the [Model Training](#model-training-optional) section for training instructions.

## 🎮 Running the Application

### Start Backend Server

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment (if using one)
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Start the server
python main.py

# Or using uvicorn directly:
uvicorn main:app --reload --port 8000
```

The backend will start on `http://localhost:8000`

**API Documentation**: Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Start Frontend Development Server

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev
# or
yarn dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is occupied)

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## 📁 Project Structure

```
Musify/
├── backend/                    # FastAPI backend server
│   ├── main.py                 # Main application entry point
│   ├── requirements.txt        # Python dependencies
│   └── services/               # AI service modules
│       ├── lyrics_service.py   # GPT-2 lyrics generation
│       ├── melody_service.py   # LSTM melody generation
│       └── classification_service.py # CNN genre classification
│
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── App.tsx            # Main application component
│   │   ├── main.tsx           # Application entry point
│   │   ├── api/               # API client
│   │   ├── components/        # Reusable UI components
│   │   └── pages/             # Page components
│   │       ├── Home.tsx
│   │       ├── LyricsPage.tsx
│   │       ├── MelodyPage.tsx
│   │       └── ClassificationPage.tsx
│   ├── package.json           # Node.js dependencies
│   └── vite.config.ts         # Vite configuration
│
├── models/                     # Pre-trained model files
│   ├── gpt2_lyrics_backend/   # GPT-2 model
│   ├── music_generator_final.keras
│   ├── normalization_params.json
│   └── song_classification_model.keras
│
├── Lyrics Generation/         # Lyrics model training notebook
│   └── GPT2_Lyrics_Service.ipynb
│
├── Music Generation/          # Melody model training notebook
│   └── Music_Generation.ipynb
│
├── Song Classification/       # Classification model training notebook
│   └── Song_Classification.ipynb
│
├── Academic_Project_Report.md # Academic project report
└── README.md                  # This file
```

## 🔌 API Endpoints

### Lyrics Generation

**POST** `/api/lyrics/generate`

Generate lyrics based on theme, mood, and keywords.

**Request Body:**
```json
{
  "theme": "love",
  "mood": "happy",
  "keywords": "summer night",
  "num_words": 200,
  "temperature": 0.9
}
```

**Response:**
```json
{
  "generated_lyrics": "Song Title: Love\nMood: Happy\n\n[Verse 1]\n...",
  "theme": "love",
  "mood": "happy",
  "engine_used": "GPT-2"
}
```

### Melody Generation

**POST** `/api/melody/generate`

Generate musical melody with specified parameters.

**Request Body:**
```json
{
  "tempo": 120,
  "genre": "pop",
  "bars": 8
}
```

**Response:**
```json
{
  "audio_url": "data:audio/midi;base64,...",
  "notes": [...],
  "tempo": 120,
  "genre": "pop",
  "bars": 8
}
```

### Genre Classification

**POST** `/api/song-classification/predict`

Classify uploaded audio file into music genre.

**Request:** Multipart form data with audio file

**Response:**
```json
{
  "top_genre": "Pop",
  "confidence": 0.8234,
  "probabilities": {
    "Pop": 0.8234,
    "Rock": 0.1023,
    "Jazz": 0.0456
  },
  "all_genres": {...}
}
```

**GET** `/api/song-classification/genres`

Get list of supported genres.

## 🎓 Model Training (Optional)

If you want to train the models from scratch or fine-tune them:

### Lyrics Generation Model

1. Open `Lyrics Generation/GPT2_Lyrics_Service.ipynb` in Jupyter
2. Run all cells to:
   - Download and preprocess dataset
   - Fine-tune GPT-2 model
   - Export model for backend use

**Training Time**: ~2-3 hours on GPU (RTX 4060)

### Melody Generation Model

1. Open `Music Generation/Music_Generation.ipynb` in Jupyter
2. Run all cells to:
   - Load and process MIDI files
   - Train LSTM model
   - Save model and normalization parameters

**Training Time**: ~30-40 minutes on GPU

### Genre Classification Model

1. Open `Song Classification/Song_Classification.ipynb` in Jupyter
2. Run all cells to:
   - Download GTZAN dataset
   - Process audio to spectrograms
   - Train CNN model

**Training Time**: ~2-3 hours on GPU

## 🐛 Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError` when starting backend
```bash
# Solution: Ensure virtual environment is activated and dependencies are installed
cd backend
pip install -r requirements.txt
```

**Problem**: `CUDA out of memory` error
```bash
# Solution: Models will fall back to CPU mode automatically
# For training, reduce batch size in notebooks
```

**Problem**: Model files not found
```
# Solution: System will run in demo mode
# Check that model files exist in models/ directory
# See Model Training section to generate models
```

**Problem**: Port 8000 already in use
```bash
# Solution: Change port in main.py or use:
uvicorn main:app --reload --port 8001
```

### Frontend Issues

**Problem**: `npm install` fails
```bash
# Solution: Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Problem**: Frontend can't connect to backend
```bash
# Solution: Check backend is running on port 8000
# Update API base URL in frontend/src/api/client.ts if needed
```

**Problem**: CORS errors
```bash
# Solution: Backend CORS is configured to allow all origins
# Check backend/main.py CORS settings
```

### Model Loading Issues

**Problem**: GPT-2 model loading slowly
```
# Solution: First load takes time to download from HuggingFace
# Subsequent loads use cached model
```

**Problem**: Melody generation produces invalid notes
```
# Solution: Check normalization_params.json exists
# Regenerate if missing using Music_Generation.ipynb
```

## 📊 Performance Metrics

### Lyrics Generation
- **Generation Speed**: 65 tokens/second
- **Average Time**: 2.24 seconds per generation
- **Model Size**: 124M parameters (~498 MB)

### Melody Generation
- **Training Loss**: 4.65 → 3.62 (converged)
- **Sequence Length**: 25 notes
- **Model Size**: ~2.5 MB

### Genre Classification
- **Song-level Accuracy**: 81.7%
- **Segment-level Accuracy**: 72.0%
- **Best Genres**: Metal (96.7%), Classical (96.7%), Jazz (93.3%)

## 🔒 Environment Variables (Optional)

Create a `.env` file in the `backend/` directory for configuration:

```env
PORT=8000
LOG_LEVEL=INFO
MODEL_CACHE_DIR=../.cache
```

## 📝 Development

### Backend Development

```bash
cd backend
# Install development dependencies
pip install -r requirements.txt

# Run with auto-reload
uvicorn main:app --reload --port 8000
```

### Frontend Development

```bash
cd frontend
# Install dependencies
npm install

# Start development server with hot reload
npm run dev
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
# Output in dist/ directory
```

**Backend:**
```bash
cd backend
# Production server (no reload)
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is for academic purposes. Please refer to the license file for details.

## 🙏 Acknowledgments

- **Datasets**:
  - Spotify Million Song Dataset (Kaggle)
  - Classical Music MIDI Dataset (Kaggle)
  - GTZAN Genre Classification Dataset
- **Libraries**:
  - Hugging Face Transformers
  - TensorFlow/Keras
  - PyTorch
  - FastAPI
  - React

## 📧 Contact

For questions or issues, please open an issue on the repository.

---

**Note**: This project is part of an academic deep learning capstone project. For detailed technical information, see `Academic_Project_Report.md`.

