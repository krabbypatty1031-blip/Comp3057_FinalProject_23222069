"""
Musify Backend - FastAPI Main Entry
AI-Powered Music Creation & Discovery Platform

Startup Command: 
    cd backend
    uvicorn main:app --reload --port 8000

Or:
    python main.py
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== Request/Response Models ====================

class LyricsRequest(BaseModel):
    """Lyrics generation request"""
    theme: str = Field(..., description="Theme, e.g., love, night, journey")
    mood: str = Field(..., description="Mood, e.g., happy, sad, energetic, chill")
    keywords: str = Field(default="", description="Keywords (optional)")
    num_words: int = Field(default=100, ge=20, le=1000, description="Number of words to generate")
    temperature: float = Field(default=0.8, ge=0.1, le=2.0, description="Generation temperature")

class LyricsResponse(BaseModel):
    """Lyrics generation response"""
    generated_lyrics: str
    theme: str
    mood: str
    engine_used: Optional[str] = "unknown" # Return actual engine used

class MelodyRequest(BaseModel):
    """Melody generation request"""
    tempo: int = Field(default=120, ge=60, le=200, description="Tempo BPM")
    genre: str = Field(default="pop", description="Genre: pop, jazz, classical, rock")
    bars: int = Field(default=8, ge=4, le=32, description="Number of bars")

class MelodyNote(BaseModel):
    """Note data"""
    pitch: int
    step: float
    duration: float
    start_time: Optional[float] = None

class MelodyResponse(BaseModel):
    """Melody generation response"""
    audio_url: str
    notes: List[dict]
    tempo: int
    genre: str
    bars: int

class ClassificationResponse(BaseModel):
    """Classification prediction response"""
    top_genre: str
    confidence: float
    probabilities: dict
    all_genres: Optional[dict] = None

class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
    error_code: Optional[str] = None


# ==================== Application Lifecycle ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown"""
    # On startup
    logger.info("=" * 50)
    logger.info("🎵 Musify Backend Starting...")
    logger.info("=" * 50)
    
    # Preload model services
    try:
        from services import lyrics_service, melody_service, classification_service
        logger.info("✓ Lyrics Service initialized")
        logger.info("✓ Melody Service initialized")
        logger.info("✓ Classification Service initialized")
    except Exception as e:
        logger.error(f"Error initializing services: {e}")
    
    logger.info("=" * 50)
    logger.info("🚀 Musify Backend Ready!")
    logger.info("   API Docs: http://localhost:8000/docs")
    logger.info("=" * 50)
    
    yield
    
    # On shutdown
    logger.info("Musify Backend Shutting down...")


# ==================== Create FastAPI App ====================

app = FastAPI(
    title="Musify API",
    description="""
    ## 🎵 Musify - AI-Powered Music Creation & Discovery
    
    Musify provides three core features:
    
    - **🎤 Lyrics Generation**: AI-powered lyrics generation based on GPT-2
    - **🎼 Melody Generation**: AI-driven melody creation
    - **🎧 Song Classification**: Deep learning music genre classification
    
    ### Tech Stack
    - TensorFlow / Keras
    - Librosa (Audio Processing)
    - Pretty MIDI (MIDI Processing)
    """,
    version="1.0.0",
    lifespan=lifespan,
    responses={
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Specify domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Global Exception Handling ====================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_code": "INTERNAL_ERROR"}
    )


# ==================== API Routes ====================

@app.get("/", tags=["Root"])
async def root():
    """API Root"""
    return {
        "message": "Welcome to Musify API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "lyrics": "/api/lyrics/generate",
            "melody": "/api/melody/generate",
            "classification": "/api/song-classification/predict"
        }
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "musify-api"}


# -------------------- Lyrics API --------------------

@app.post(
    "/api/lyrics/generate",
    response_model=LyricsResponse,
    tags=["Lyrics Generation"],
    summary="Generate Lyrics",
    description="Generate creative lyrics based on theme, mood, and keywords"
)
def generate_lyrics(request: LyricsRequest):
    """
    🎤 Generate Lyrics
    
    - **theme**: Lyrics theme (e.g., love, night, freedom)
    - **mood**: Mood tone (happy, sad, energetic, chill)
    - **keywords**: Keywords to include
    - **num_words**: Number of words to generate (20-200)
    - **temperature**: Creativity temperature, higher is more random (0.1-2.0)
    """
    try:
        from services import lyrics_service
        
        # Call generation service
        generated = lyrics_service.generate_lyrics(
            theme=request.theme,
            mood=request.mood,
            keywords=request.keywords,
            num_words=request.num_words,
            temperature=request.temperature
        )
        
        return LyricsResponse(
            generated_lyrics=generated,
            theme=request.theme,
            mood=request.mood,
            engine_used="GPT-2"
        )
        
    except Exception as e:
        logger.error(f"Lyrics generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate lyrics: {str(e)}"
        )


# -------------------- Melody API --------------------

@app.post(
    "/api/melody/generate",
    response_model=MelodyResponse,
    tags=["Melody Generation"],
    summary="Generate Melody",
    description="Generate original melody based on genre and parameters"
)
def generate_melody(request: MelodyRequest):
    """
    🎼 Generate Melody
    
    - **tempo**: Tempo BPM (60-200)
    - **genre**: Music genre (pop, jazz, classical, rock)
    - **bars**: Number of bars to generate (4-32)
    
    Returns:
    - Audio playback URL
    - Note sequence data (for visualization)
    """
    try:
        from services import melody_service
        
        result = melody_service.generate_melody(
            tempo=request.tempo,
            genre=request.genre,
            bars=request.bars
        )
        
        return MelodyResponse(**result)
        
    except Exception as e:
        logger.error(f"Melody generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate melody: {str(e)}"
        )


# -------------------- Classification API --------------------

@app.post(
    "/api/song-classification/predict",
    response_model=ClassificationResponse,
    tags=["Song Classification"],
    summary="Predict Music Genre",
    description="Upload audio file, predict music genre using CNN model"
)
async def predict_genre(
    file: UploadFile = File(..., description="Audio file (.wav, .mp3)")
):
    """
    🎧 Music Genre Classification
    
    Upload an audio file, AI will analyze and predict its music genre.
    
    Supported formats: WAV, MP3, FLAC, OGG, M4A
    
    Returns:
    - Predicted top genre
    - Confidence score
    - Top-3 genre probability distribution
    """
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        allowed_extensions = {'.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Read file content
        file_bytes = await file.read()
        
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Call classification service
        from services import classification_service
        from fastapi.concurrency import run_in_threadpool
        
        # Run CPU-bound prediction in thread pool
        result = await run_in_threadpool(classification_service.predict_genre, file_bytes)
        
        return ClassificationResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to classify song: {str(e)}"
        )


@app.get(
    "/api/song-classification/genres",
    tags=["Song Classification"],
    summary="Get list of supported music genres"
)
async def get_genres():
    """Get all supported music genres"""
    return {
        "genres": [
            "Metal", "Disco", "Classical", "Hip-hop", "Jazz",
            "Country", "Pop", "Blues", "Reggae", "Rock"
        ]
    }


# ==================== Main Entry ====================

if __name__ == "__main__":
    import uvicorn
    
    # Get port (supports environment variables)
    port = int(os.environ.get("PORT", 8000))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
