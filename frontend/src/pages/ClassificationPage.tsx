/**
 * Song Classification Page
 * Deep Space Theme - Centered Upload
 */

import React, { useState, useCallback } from 'react';
import { Headphones, Upload, Music2, AlertCircle, FileAudio, X, BarChart2 } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { classifySong, ClassificationResponse } from '../api/client';

// Genre color mapping
const genreColors: Record<string, string> = {
  'Metal': 'from-slate-600 to-slate-800',
  'Disco': 'from-pink-500 to-purple-500',
  'Classical': 'from-amber-500 to-orange-500',
  'Hip-hop': 'from-green-500 to-emerald-600',
  'Jazz': 'from-blue-500 to-indigo-500',
  'Country': 'from-yellow-500 to-amber-500',
  'Pop': 'from-pink-400 to-rose-500',
  'Blues': 'from-blue-600 to-blue-800',
  'Reggae': 'from-green-400 to-yellow-500',
  'Rock': 'from-red-500 to-orange-500',
};

// Genre icons
const genreEmojis: Record<string, string> = {
  'Metal': '🤘', 'Disco': '🪩', 'Classical': '🎻', 'Hip-hop': '🎤', 'Jazz': '🎷',
  'Country': '🤠', 'Pop': '🎵', 'Blues': '🎺', 'Reggae': '🌴', 'Rock': '🎸',
};

export const ClassificationPage: React.FC = () => {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ClassificationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError('');
    }
  };

  // Handle drag
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('audio/') ||
        droppedFile.name.match(/\.(wav|mp3|flac|ogg|m4a)$/i)) {
        setFile(droppedFile);
        setResult(null);
        setError('');
      } else {
        setError('Please upload an audio file (.wav, .mp3, etc.)');
      }
    }
  }, []);

  // Clear file
  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError('');
  };

  // Submit classification
  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await classifySong(file);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classification failed');
    } finally {
      setLoading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8 justify-center">
        <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 backdrop-blur-md">
          <Headphones className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Song Classifier</h1>
          <p className="text-slate-400">Identify music genres with Deep Learning</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Upload Section */}
        <div className={`transition-all duration-500 ${result ? 'lg:col-span-5' : 'lg:col-span-8 lg:col-start-3'}`}>
          <div className="glass-card p-8">
            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300
                ${dragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }
                ${file ? 'bg-success/5 border-success/30' : ''}
              `}
            >
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {file ? (
                // File selected
                <div className="flex items-center justify-center space-x-4 animate-fade-in">
                  <div className="w-14 h-14 bg-success/20 rounded-xl flex items-center justify-center">
                    <FileAudio className="w-7 h-7 text-success" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">{file.name}</div>
                    <div className="text-sm text-slate-400">{formatFileSize(file.size)}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors z-10"
                  >
                    <X className="w-5 h-5 text-slate-400 hover:text-white" />
                  </button>
                </div>
              ) : (
                // No file
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium text-slate-200 mb-1">
                    Drop your audio file here
                  </p>
                  <p className="text-sm text-slate-500">
                    or click to browse • Supports WAV, MP3, FLAC
                  </p>
                </div>
              )}
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleSubmit}
              disabled={!file || loading}
              className={`
                btn-primary w-full mt-6 group
                ${!file ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Music2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Analyze Genre</span>
                </>
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400 animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Supported Genres (Only show when no result) */}
            {!result && !loading && (
              <div className="mt-8 pt-6 border-t border-white/5">
                <p className="text-xs text-slate-500 text-center mb-4 uppercase tracking-wider">Supported Genres</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {Object.entries(genreEmojis).map(([genre, emoji]) => (
                    <span
                      key={genre}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white/5 rounded-full text-xs text-slate-400 border border-white/5"
                    >
                      <span>{emoji}</span>
                      <span>{genre}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="lg:col-span-7 animate-slide-up">
            <div className="glass-card p-8 h-full">
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">Analysis Results</h3>
              </div>

              {/* Main Prediction */}
              <div className="text-center mb-8 pb-8 border-b border-white/5 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-2xl -z-10" />
                <div className="text-xs text-primary font-medium uppercase tracking-wider mb-4">
                  Top Prediction
                </div>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <span className="text-6xl filter drop-shadow-lg animate-bounce-slow">
                    {genreEmojis[result.top_genre] || '🎵'}
                  </span>
                  <h2 className="text-5xl font-bold text-white tracking-tight">
                    {result.top_genre}
                  </h2>
                </div>
                <div className="inline-flex items-center px-4 py-1.5 bg-success/20 text-success border border-success/30 rounded-full text-sm font-medium">
                  {(result.confidence * 100).toFixed(1)}% Confidence
                </div>
              </div>

              {/* Probability Bars */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-4">
                  Genre Probabilities
                </h3>
                <div className="space-y-4">
                  {Object.entries(result.probabilities)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5) // Show top 5
                    .map(([genre, prob]) => (
                      <div key={genre} className="group">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{genreEmojis[genre] || '🎵'}</span>
                            <span className="font-medium text-slate-200">{genre}</span>
                          </div>
                          <span className="text-sm text-slate-400 font-mono">
                            {(prob * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${genreColors[genre] || 'from-slate-400 to-slate-500'} progress-animate relative`}
                            style={{ width: `${prob * 100}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Model Info */}
              <div className="mt-8 pt-6 border-t border-white/5 text-center">
                <p className="text-xs text-slate-600">
                  Powered by CNN (GTZAN Dataset) • Mel Spectrogram Analysis
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassificationPage;
