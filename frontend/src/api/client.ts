/**
 * Musify API Client
 * Unified API request encapsulation
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// API base URL configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s timeout (model inference might be slow)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Can add auth token here, etc.
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Unified error handling
    const errorMessage = extractErrorMessage(error);
    console.error('[API Error]', errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
);

// Extract error message
function extractErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as { detail?: string; message?: string };
    return data.detail || data.message || 'Unknown error';
  }
  if (error.message) {
    return error.message;
  }
  return 'Network error';
}

export default apiClient;

// ==================== API Interfaces ====================

export interface LyricsRequest {
  theme: string;
  mood: string;
  keywords?: string;
  num_words?: number;
  temperature?: number;
}

export interface LyricsResponse {
  generated_lyrics: string;
  theme: string;
  mood: string;
}

export interface MelodyRequest {
  tempo?: number;
  genre?: string;
  bars?: number;
}

export interface MelodyNote {
  pitch: number;
  step: number;
  duration: number;
  start_time?: number;
}

export interface MelodyResponse {
  audio_url: string;
  notes: MelodyNote[];
  tempo: number;
  genre: string;
  bars: number;
}

export interface ClassificationResponse {
  top_genre: string;
  confidence: number;
  probabilities: Record<string, number>;
  all_genres?: Record<string, number>;
}

// ==================== API Functions ====================

/**
 * Generate lyrics  
 */
export async function generateLyrics(params: LyricsRequest): Promise<LyricsResponse> {
  const response = await apiClient.post<LyricsResponse>('/api/lyrics/generate', params);
  return response.data;
}

/**
 * Generate melody
 */
export async function generateMelody(params: MelodyRequest): Promise<MelodyResponse> {
  const response = await apiClient.post<MelodyResponse>('/api/melody/generate', params);
  return response.data;
}

/**
 * Classify song
 */
export async function classifySong(file: File): Promise<ClassificationResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ClassificationResponse>(
    '/api/song-classification/predict',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

/**
 * Get supported genres list
 */
export async function getGenres(): Promise<{ genres: string[] }> {
  const response = await apiClient.get<{ genres: string[] }>('/api/song-classification/genres');
  return response.data;
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string }> {
  const response = await apiClient.get<{ status: string }>('/health');
  return response.data;
}
