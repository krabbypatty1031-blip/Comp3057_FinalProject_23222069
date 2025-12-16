# Musify Backend Services
# This package contains the AI model service wrappers

from .lyrics_service import lyrics_service
from .melody_service import melody_service
from .classification_service import classification_service

__all__ = ['lyrics_service', 'melody_service', 'classification_service']
