/**
 * Lyrics Generation Page
 * Deep Space Theme - Split View
 */

import React, { useState } from 'react';
import { Mic2, Wand2, Copy, Check, RefreshCw, Sparkles } from 'lucide-react';
import { generateLyrics, LyricsRequest } from '../api/client';

// Mood options
const moodOptions = [
  { value: 'happy', label: '😊 Happy', color: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30' },
  { value: 'sad', label: '😢 Sad', color: 'bg-blue-500/20 text-blue-200 border-blue-500/30' },
  { value: 'energetic', label: '⚡ Energetic', color: 'bg-orange-500/20 text-orange-200 border-orange-500/30' },
  { value: 'chill', label: '😌 Chill', color: 'bg-green-500/20 text-green-200 border-green-500/30' },
];

// Theme suggestions
const themeSuggestions = ['Love', 'Night', 'Journey', 'Freedom', 'Dreams', 'Nature', 'City'];

export const LyricsPage: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState<LyricsRequest>({
    theme: '',
    mood: '',
    keywords: '',
    temperature: 0.8,
  });

  // UI state
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await generateLyrics(formData);
      setResult(response.generated_lyrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate lyrics');
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Select theme suggestion
  const selectTheme = (theme: string) => {
    setFormData(prev => ({ ...prev, theme }));
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-2xl bg-primary/20 text-primary backdrop-blur-md">
          <Mic2 className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Lyric Generator</h1>
          <p className="text-slate-400">Create expressive lyrics with AI</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Input Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Theme Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Theme <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Love, Night, Journey"
                  value={formData.theme}
                  onChange={e => setFormData({ ...formData, theme: e.target.value })}
                  required
                />
                {/* Theme suggestions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {themeSuggestions.map(theme => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => selectTheme(theme)}
                      className={`
                        px-3 py-1 text-xs font-medium rounded-full transition-all border
                        ${formData.theme === theme
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                        }
                      `}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mood <span className="text-primary">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {moodOptions.map(mood => (
                    <button
                      key={mood.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, mood: mood.value })}
                      className={`
                        p-3 rounded-xl text-sm font-medium transition-all border
                        ${formData.mood === mood.value
                          ? `ring-2 ring-primary/50 ${mood.color}`
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                        }
                      `}
                    >
                      {mood.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keywords Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Keywords (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., rain, neon, memories"
                  value={formData.keywords}
                  onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                />
              </div>

              {/* Temperature Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-300">Creativity</label>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                    {formData.temperature?.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={formData.temperature}
                  onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Conservative</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full group"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span>Generate Lyrics</span>
                  </>
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Result Stage */}
        <div className="lg:col-span-7">
          <div className="glass-card h-full min-h-[600px] flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-slate-300">Generated Result</span>
              </div>
              {result && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setResult('')}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                    title="Clear"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              {result ? (
                <div className="animate-fade-in">
                  <pre className="whitespace-pre-wrap font-sans text-lg md:text-xl leading-relaxed text-slate-200">
                    {result}
                  </pre>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                    <Mic2 className="w-10 h-10 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-slate-400">Ready to Create</p>
                    <p className="text-sm opacity-60">Configure the settings and hit generate</p>
                  </div>
                </div>
              )}
            </div>

            {/* Decorative Elements */}
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LyricsPage;
