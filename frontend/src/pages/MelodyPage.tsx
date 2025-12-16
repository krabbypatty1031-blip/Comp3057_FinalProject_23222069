/**
 * Melody Generation Page
 * Deep Space Theme - Split View
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Piano, Play, Pause, Download, RefreshCw, Music, Square, Sliders, Volume2, AlertCircle } from 'lucide-react';
import * as Tone from 'tone';
import Soundfont from 'soundfont-player';
import { generateMelody, MelodyNote, MelodyResponse } from '../api/client';

// Genre options
const genreOptions = [
  { value: 'pop', label: '🎤 Pop', description: 'Catchy melodies' },
  { value: 'jazz', label: '🎷 Jazz', description: 'Smooth & complex' },
  { value: 'classical', label: '🎻 Classical', description: 'Elegant & structured' },
  { value: 'rock', label: '🎸 Rock', description: 'Powerful & energetic' },
];

// MIDI pitch to note name
const pitchToNote = (pitch: number): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(pitch / 12) - 1;
  const note = notes[pitch % 12];
  return `${note}${octave}`;
};

export const MelodyPage: React.FC = () => {
  // Form state
  const [tempo, setTempo] = useState(120);
  const [genre, setGenre] = useState('pop');
  const [bars, setBars] = useState(8);

  // Result state
  const [result, setResult] = useState<MelodyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [pianoLoaded, setPianoLoaded] = useState(false);

  // Soundfont player ref
  const instrumentRef = useRef<Soundfont.Player | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null);
  
  const sequenceRef = useRef<number[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current note
  useEffect(() => {
    if (currentNoteIndex > -1 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeNoteElement = container.children[currentNoteIndex] as HTMLElement;

      if (activeNoteElement) {
        const containerWidth = container.clientWidth;
        const noteLeft = activeNoteElement.offsetLeft;
        const noteWidth = activeNoteElement.clientWidth;

        // Calculate scroll position to center current note
        const targetScroll = noteLeft - (containerWidth / 2) + (noteWidth / 2);

        container.scrollTo({
          left: targetScroll,
          behavior: 'smooth'
        });
      }
    }
  }, [currentNoteIndex]);

    // Initialize audio context and effects chain
    const initAudioContext = useCallback(async () => {
        if (!audioContextRef.current) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = ctx;
  
            // 1. Create master gain control
            const masterGain = ctx.createGain();
            masterGain.gain.value = 0.8; // Lower slightly to prevent clipping
            masterGain.connect(ctx.destination);
            masterGainNodeRef.current = masterGain;
  
            // 2. Create Convolver Reverb
            // For simplicity, we generate a Synthetic Impulse Response
            // This avoids loading external wav files and sounds good
            const sampleRate = ctx.sampleRate;
            const length = sampleRate * 2.0; // 2 seconds reverb tail
            const impulse = ctx.createBuffer(2, length, sampleRate);
            const left = impulse.getChannelData(0);
            const right = impulse.getChannelData(1);
  
            for (let i = 0; i < length; i++) {
                // Exponential decay
                const n = i;
                const reverse = length - i;
                const decay = Math.pow(reverse / length, 2); // Smooth decay
                
                // Generate white noise and apply decay
                left[i] = (Math.random() * 2 - 1) * decay;
                right[i] = (Math.random() * 2 - 1) * decay;
            }
  
            const convolver = ctx.createConvolver();
            convolver.buffer = impulse;
            
            // Create Dry/Wet control for reverb
            // Usually we connect instrument to Master, and also to Reverb, then Reverb to Master
            const reverbGain = ctx.createGain();
            reverbGain.gain.value = 0.4; // 40% Wet (Reverb amount)
            
            convolver.connect(reverbGain);
            reverbGain.connect(masterGain);
            
            reverbNodeRef.current = convolver;
        }
        return audioContextRef.current;
    }, []);
  
    // Initialize instrument (using Soundfont)
    const initInstrument = useCallback(async (selectedGenre: string) => {
      const ctx = await initAudioContext();
  
          // Map genre to Soundfont instrument name
          const instrumentMap: Record<string, string> = {
            'rock': 'overdriven_guitar',
            'jazz': 'tenor_sax',         // Saxophone
            'classical': 'violin',       
            'pop': 'acoustic_grand_piano',
          };      
      const instrumentName = instrumentMap[selectedGenre] || 'acoustic_grand_piano';
      setPianoLoaded(false);
  
      try {
        const player = await Soundfont.instrument(
          ctx, 
          instrumentName as any, 
          { 
              soundfont: 'MusyngKite',
              // Key: Connect instrument output to our custom effects chain
              // Note: Soundfont-player allows specifying destination
              destination: reverbNodeRef.current! // Connect to reverb for testing, or we need more complex routing
          }
        );
        
        // Manual routing: Soundfont defaults to destination, we need special handling
        // But soundfont-player's destination parameter is actually the final node.
        // To achieve "Dry + Wet", we need an intermediate node.
        
        // Revised routing strategy:
        // Instrument -> Splitter -> [Direct to Master]
        //                        -> [Reverb -> Master]
        // Since soundfont-player is deeply encapsulated, passing masterGainNodeRef is safest
        // We put reverb as "Insert" effect in series, or simpler:
        // Connect soundfont directly to masterGain, adding Aux Send before masterGain is complex.
        
        // Simple solution: Reconfigure reverb as "Insert" mode (series), before Master
        // Instrument -> Reverb (Wet 30% + Dry 100%) -> Master
        
        // Reload instrument, connect to MasterGain this time
        const playerWithEffects = await Soundfont.instrument(
            ctx,
            instrumentName as any,
            {
                soundfont: 'MusyngKite',
                destination: masterGainNodeRef.current! 
            }
        );
        
        // !!! Dynamically add reverb !!!
        // This is a trick: soundfont-player instance doesn't expose raw node.
        // But we can reuse AudioContext's global reverb.
        
        // Actually, soundfont-player allows passing destination.
        // We create an InputNode, connected to both Master and Reverb
        const inputNode = ctx.createGain();
        inputNode.connect(masterGainNodeRef.current!); // Dry signal
        inputNode.connect(reverbNodeRef.current!);     // Wet signal (via Reverb)
        
        const finalPlayer = await Soundfont.instrument(
          ctx, 
          instrumentName as any, 
          { 
              soundfont: 'MusyngKite',
              destination: inputNode 
          }
        );
  
        instrumentRef.current = finalPlayer;
        setPianoLoaded(true);
        console.log(`Loaded instrument: ${instrumentName} with Reverb`);
        return finalPlayer;
      } catch (err) {
        console.error("Failed to load soundfont:", err);
        setPianoLoaded(true); 
        return null;
      }
    }, [initAudioContext]);
  // MIDI pitch to Tone.js note format
  const midiToToneNote = (pitch: number): string => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const note = notes[pitch % 12];
    return `${note}${octave}`;
  };

  // Preload instrument when result is available
  useEffect(() => {
    if (result) {
      // Reset loading state
      setPianoLoaded(false); 
      initInstrument(result.genre);
    }
  }, [result, initInstrument]);

  // Generate melody
  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await generateMelody({ tempo, genre, bars });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate melody');
    } finally {
      setLoading(false);
    }
  };

  // Play/Stop
  const togglePlay = async () => {
    if (!result) return;

    if (isPlaying) {
      // Stop playback logic
      if (instrumentRef.current) {
        instrumentRef.current.stop(); 
      }
      
      // Clear all timers, preventing subsequent notes
      sequenceRef.current.forEach(id => clearTimeout(id));
      sequenceRef.current = [];
      
      setIsPlaying(false);
      setCurrentNoteIndex(-1);
      
    } else {
      // Start playback logic
      if (!audioContextRef.current) {
        await initAudioContext();
      }
      if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
      }

      let instrument = instrumentRef.current;
      if (!instrument) {
         instrument = await initInstrument(result.genre);
      }
      if (!instrument) return;

      setIsPlaying(true);

      let currentTime = 0;
      const notes = result.notes;

      sequenceRef.current.forEach(id => clearTimeout(id));
      sequenceRef.current = [];

      // Use setTimeout to schedule notes one by one, allowing stop via clearTimeout
      notes.forEach((note, index) => {
        const delay = currentTime * 1000; // milliseconds
        
        const timeoutId = window.setTimeout(() => {
          // Double check if playing (prevent edge cases)
          // Note: state might be stale in setTimeout callback, but since we cleared timeout,
          // theoretically stopped timer won't trigger. Just double insurance.
          
          // 1. Visual update
          setCurrentNoteIndex(index);
          
          // 2. Audio playback (Instant)
          if (instrumentRef.current) {
              const noteName = pitchToNote(note.pitch);
              instrumentRef.current.play(noteName, 0, { 
                  duration: note.duration,
                  gain: 1.0 
              });
          }
        }, delay);
        
        sequenceRef.current.push(timeoutId);
        currentTime += note.step;
      });

      // End processing
      const totalDuration = currentTime + (notes[notes.length - 1]?.duration || 0);
      const endTimeoutId = window.setTimeout(() => {
        setIsPlaying(false);
        setCurrentNoteIndex(-1);
      }, totalDuration * 1000);
      sequenceRef.current.push(endTimeoutId);
    }
  };

  // Stop playback (on unmount)
  const stopPlay = () => {
    if (instrumentRef.current) instrumentRef.current.stop();
    sequenceRef.current.forEach(id => clearTimeout(id));
    sequenceRef.current = [];
    setIsPlaying(false);
    setCurrentNoteIndex(-1);
  };

  // Download MIDI
  const downloadMidi = () => {
    console.log("Download requested", result);
    if (!result?.audio_url) {
        console.error("No audio URL available for download");
        return;
    }
    
    try {
        const link = document.createElement('a');
        link.href = result.audio_url;
        link.download = `melody_${result.genre}_${result.tempo}bpm.mid`;
        
        // Must append link to document for click to work in some browsers (e.g. Firefox)
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log("Download triggered successfully");
    } catch (err) {
        console.error("Download failed:", err);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-2xl bg-accent/20 text-accent backdrop-blur-md">
          <Piano className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Melody Creator</h1>
          <p className="text-slate-400">Compose original melodies with AI</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 md:p-8">
            <div className="space-y-8">
              {/* Tempo Control */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Sliders className="w-4 h-4" />
                    Tempo
                  </label>
                  <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-1 rounded">
                    {tempo} BPM
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="180"
                  value={tempo}
                  onChange={e => setTempo(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* Bars Control */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Music className="w-4 h-4" />
                    Length
                  </label>
                  <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-1 rounded">
                    {bars} Bars
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="16"
                  value={bars}
                  onChange={e => setBars(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>

              {/* Genre Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-4">Style</label>
                <div className="grid grid-cols-2 gap-3">
                  {genreOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setGenre(option.value)}
                      className={`
                        p-3 rounded-xl text-left transition-all border
                        ${genre === option.value
                          ? 'bg-accent/20 border-accent/50 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }
                      `}
                    >
                      <div className="text-sm font-medium mb-1">{option.label}</div>
                      <div className="text-xs opacity-60">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="btn-primary w-full bg-accent hover:bg-pink-500 shadow-neon-accent group"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Composing...</span>
                  </>
                ) : (
                  <>
                    <Music className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Generate Melody</span>
                  </>
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Visualization & Player */}
        <div className="lg:col-span-8">
          <div className="glass-card h-full min-h-[600px] flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-slate-300">Studio Monitor</span>
              </div>
              {result && (
                <div className="flex gap-2 items-center">
                  <span className="hidden md:inline text-xs text-slate-500 mr-2">
                    Download to hear Bass & Accompaniment
                  </span>
                  <button
                    onClick={downloadMidi}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/10 hover:border-white/30 shadow-lg"
                    title="Download MIDI file"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download MIDI</span>
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-8 flex flex-col">
              {result ? (
                <div className="flex-1 flex flex-col animate-fade-in">
                  {/* Player Controls */}
                  <div className="flex items-center justify-center gap-6 mb-12">
                    <button
                      onClick={togglePlay}
                      disabled={!pianoLoaded}
                      className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${!pianoLoaded
                          ? 'bg-slate-700 cursor-not-allowed'
                          : isPlaying
                            ? 'bg-red-500 shadow-neon-red'
                            : 'bg-accent shadow-neon-accent'
                        }`}
                    >
                      {isPlaying ? (
                        <Pause className="w-8 h-8 fill-current" />
                      ) : (
                        <Play className="w-8 h-8 fill-current ml-1" />
                      )}
                    </button>
                  </div>

                  {/* Visualization */}
                  <div className="flex-1 bg-slate-900/50 rounded-2xl border border-white/5 relative overflow-hidden">
                    
                    {/* Ambient Background (New) */}
                    <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-20'}`}>
                        <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl mix-blend-screen animate-pulse" />
                        <div className="absolute -top-20 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl mix-blend-screen animate-pulse animation-delay-200" />
                    </div>

                    {/* Background Waves (Ripples) */}
                    <div className="absolute inset-0 z-0 opacity-30 pointer-events-none overflow-hidden">
                        <style>{`
                            @keyframes waveSlide {
                                0% { background-position-x: 0px; }
                                100% { background-position-x: 1440px; }
                            }
                        `}</style>
                        {/* Wave 1 (Primary) */}
                        <div 
                            className={`absolute bottom-0 left-0 right-0 h-full transition-all duration-1000 ${isPlaying ? 'opacity-60 translate-y-0' : 'opacity-20 translate-y-10'}`}
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%236366F1' fill-opacity='0.4' d='M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundSize: '1440px 100%',
                                backgroundRepeat: 'repeat-x',
                                backgroundPosition: 'bottom',
                                animation: isPlaying ? 'waveSlide 10s linear infinite' : 'none'
                            }}
                        />
                        {/* Wave 2 (Accent) */}
                        <div 
                            className={`absolute bottom-0 left-0 right-0 h-full transition-all duration-1000 delay-100 ${isPlaying ? 'opacity-40 translate-y-0' : 'opacity-10 translate-y-16'}`}
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23F472B6' fill-opacity='0.3' d='M0,256L48,245.3C96,235,192,213,288,192C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,224C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundSize: '1440px 100%',
                                backgroundRepeat: 'repeat-x',
                                backgroundPosition: 'bottom',
                                animation: isPlaying ? 'waveSlide 15s linear infinite reverse' : 'none'
                            }}
                        />
                    </div>

                    <div 
                      ref={scrollContainerRef}
                      className="absolute inset-0 flex items-end p-6 gap-1 overflow-x-auto custom-scrollbar scroll-smooth"
                    >
                      {result.notes.map((note: MelodyNote, idx: number) => {
                        const minPitch = Math.min(...result.notes.map(n => n.pitch));
                        const maxPitch = Math.max(...result.notes.map(n => n.pitch));
                        const pitchRange = maxPitch - minPitch || 1;
                        const heightPercent = ((note.pitch - minPitch) / pitchRange) * 60 + 20;
                        const isCurrentNote = idx === currentNoteIndex;

                        return (
                          <div
                            key={idx}
                            className="flex flex-col items-center group flex-shrink-0 transition-all duration-300 relative"
                            style={{ width: '40px' }}
                          >
                            {isCurrentNote && (
                                <>
                                  {/* Vertical Beam */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-10 h-[60vh] bg-gradient-to-t from-white/20 to-transparent blur-md pointer-events-none origin-bottom animate-pulse" />
                                  {/* Top Sparkle */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-2 h-2 bg-white rounded-full blur-[1px] animate-ping" />
                                </>
                            )}

                            <div
                              className={`w-6 rounded-t-lg transition-all duration-150 relative z-10 ${isCurrentNote
                                  ? 'bg-white shadow-[0_0_25px_rgba(99,102,241,0.6)] scale-y-125 translate-y-[-4px]'
                                  : 'bg-primary/40 group-hover:bg-primary/60'
                                }`}
                              style={{ height: `${heightPercent}%` }}
                            />
                            <div className={`text-[10px] mt-2 font-mono transition-colors ${isCurrentNote ? 'text-accent font-bold scale-110' : 'text-slate-600'
                              }`}>
                              {pitchToNote(note.pitch)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grid Lines */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="absolute left-0 right-0 border-t border-white/5"
                          style={{ top: `${25 * i}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Info Bar */}
                  <div className="mt-6 flex justify-center gap-8 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent"></span>
                      {result.genre.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      {result.tempo} BPM
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {result.notes.length} NOTES
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                    <Piano className="w-10 h-10 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-slate-400">Studio Ready</p>
                    <p className="text-sm opacity-60">Select style and parameters to compose</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MelodyPage;
