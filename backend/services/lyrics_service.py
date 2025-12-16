"""
Lyrics Generation Service - GPT-2 Only
Uses local fine-tuned GPT-2 model for lyrics generation.
"""

import os
import logging
import torch
import re
from typing import Dict

logger = logging.getLogger(__name__)

# Path configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_DIR = os.path.join(PROJECT_ROOT, "models")

# Define list of possible model paths (priority from high to low)
POSSIBLE_MODEL_PATHS = [
    os.path.join(MODEL_DIR, "gpt2_lyrics_backend"),                # Prioritize backend-specific exported model
    os.path.join(MODEL_DIR, "gpt2_lyrics", "final_model"),         # Then try fine-tuned output in models directory
    os.path.join(PROJECT_ROOT, "gpt2_lyrics", "final_model"),      # Finally try fine-tuned output in root directory
]

class LyricsService:
    """
    GPT-2 based lyrics generation service.
    """
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_path: str = "unknown"
        self._load_model()
    
    def _load_model(self) -> bool:
        """Load GPT-2 model from local directory or Hugging Face."""
        try:
            from transformers import GPT2LMHeadModel, GPT2Tokenizer
            
            # Find valid local model path
            model_path = 'gpt2'  # Default fallback to HF
            found_local = False
            
            for path in POSSIBLE_MODEL_PATHS:
                if os.path.exists(path):
                    logger.info(f"Found local fine-tuned model at: {path}")
                    model_path = path
                    found_local = True
                    break
            
            if not found_local:
                logger.info("No local fine-tuned model found. Using base 'gpt2' from Hugging Face.")

            self.model_path = model_path

            tokenizer_kwargs = {}
            model_kwargs = {}

            # If we are using a local exported model directory, prefer safetensors if available
            # This avoids the torch.load vulnerability error (CVE-2025-32434)
            if found_local:
                try:
                    model_kwargs["use_safetensors"] = True
                except Exception:
                    pass
            
            self.tokenizer = GPT2Tokenizer.from_pretrained(model_path, **tokenizer_kwargs)
            self.model = GPT2LMHeadModel.from_pretrained(model_path, **model_kwargs)
            
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            self.model.to(self.device)
            self.model.eval()
            
            logger.info(f"GPT-2 loaded successfully from '{self.model_path}' on {self.device}")
            return True
            
        except ImportError:
            logger.error("Transformers library not installed. Run: pip install transformers")
            return False
        except Exception as e:
            logger.error(f"Failed to load GPT-2: {e}")
            return False
    
    def generate_lyrics(
        self,
        theme: str,
        mood: str,
        keywords: str = "",
        num_words: int = 300,
        temperature: float = 0.9,
        **kwargs
    ) -> str:
        """
        Generate lyrics using GPT-2.
        
        Args:
            theme: Song theme.
            mood: Mood/emotion.
            keywords: Optional keywords.
            num_words: Target word count.
            temperature: Sampling temperature (higher = more creative).
        
        Returns:
            Generated lyrics text.
        """
        if self.model is None:
            return self._demo_lyrics(theme, mood, keywords)
        
        try:
            prompt = self._build_prompt(theme, mood, keywords)
            logger.info(f"Generating with prompt: {prompt[:80]}...")
            
            inputs = self.tokenizer(prompt, return_tensors='pt').to(self.device)
            max_new_tokens = int(num_words * 1.3)
            
            with torch.no_grad():
                outputs = self.model.generate(
                    inputs['input_ids'],
                    max_new_tokens=max_new_tokens,
                    min_new_tokens=100,
                    temperature=temperature,
                    top_k=kwargs.get('top_k', 50),
                    top_p=kwargs.get('top_p', 0.95),
                    repetition_penalty=kwargs.get('repetition_penalty', 1.2),
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    early_stopping=True,
                )
            
            generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            generated_text = self._clean_output(generated_text)
            
            logger.info("Generation successful")
            return generated_text
            
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return self._demo_lyrics(theme, mood, keywords)
    
    def _build_prompt(self, theme: str, mood: str, keywords: str) -> str:
        """Build prompt for GPT-2."""
        prompt = f"Song Title: {theme.title()}\n"
        prompt += f"Mood: {mood.capitalize()}\n\n"
        prompt += "[Verse 1]\n"
        
        if keywords:
            prompt += f"{keywords.capitalize()}"
        
        return prompt
    
    def _clean_output(self, text: str) -> str:
        """Clean generated text."""
        # 0. Remove specific artifacts and non-ASCII characters
        # Force ASCII to remove unicode artifacts like ÃÂÃÂ, , 
        text = text.encode('ascii', 'ignore').decode('ascii')
        
        # Remove specific dataset artifacts
        artifacts = [
            r'externalToEVA', 
            r'rawdownload', 
            r'embedreportprint',
            r'http\S+',
            r'www\.\S+'
        ]
        for artifact in artifacts:
            text = re.sub(artifact, '', text, flags=re.IGNORECASE)

        # Remove control characters and non-standard punctuation
        # Keep only alphanumeric, basic punctuation, and newlines
        text = re.sub(r'[^a-zA-Z0-9\s.,!?\'\"\-;:\n]', '', text)

        # 1. Remove excess empty lines
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # 2. Fix spaces before punctuation (e.g., "hello , world" -> "hello, world")
        text = re.sub(r' {2,}', ' ', text)
        text = re.sub(r'\s+([,.!?;:])', r'\1', text)
        
        # 3. Remove common lyrics metadata markers (x2, x3, repeat, chorus, etc.)
        # Match: x2, x 2, (x2), [repeat], (chorus), etc.
        text = re.sub(r'[\(\[\{].*?(repeat|chorus|verse|bridge|hook).*?[\)\]\}]', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\bx\s?\d+\b', '', text, flags=re.IGNORECASE) # Remove x2, x 4
        text = re.sub(r'\b(repeat|chorus)\s+\d+x\b', '', text, flags=re.IGNORECASE)
        
        # 4. Remove dangling characters at end of lines (e.g., last line only "x" or "and")
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            # If a line is too short and contains strange characters, discard
            if len(line) < 3 and re.search(r'[xX\(\)\[\]]', line):
                continue
            if line:
                cleaned_lines.append(line)
        
        text = '\n'.join(cleaned_lines)
        
        return text.strip()
    
    def _demo_lyrics(self, theme: str, mood: str, keywords: str) -> str:
        """Demo mode fallback."""
        return f"""(Demo Mode - Model Not Available)

Title: {theme}
Mood: {mood}
{f'Keywords: {keywords}' if keywords else ''}

Verse 1:
The {theme} is calling me tonight
I feel the {mood} rhythm inside
{keywords if keywords else 'Dancing'} through the endless sky
Everything feels so alive

Chorus:
Oh {theme}, you light my way
Through the {mood} and the gray
I'll follow you until the end of days
Forever in your embrace

(To enable AI generation, install: pip install transformers)
"""
    
    def get_engine_info(self) -> Dict:
        """Get service status info."""
        return {
            "engine": "GPT-2",
            "model_loaded": self.model is not None,
            "device": str(self.device),
            "model_path": self.model_path,
        }


# Global service instance
lyrics_service = LyricsService()
