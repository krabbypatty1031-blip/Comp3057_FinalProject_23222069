/**
 * Home Page
 * Deep Space Theme - Asymmetric Layout
 */

import React from 'react';
import { Mic2, Piano, Headphones, Sparkles, ArrowRight, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between min-h-[80vh] animate-fade-in gap-12 lg:gap-20">

      {/* Left Column: Hero Content */}
      <div className="flex-1 text-center lg:text-left max-w-2xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-sm font-medium text-slate-300 tracking-wide uppercase">AI-Powered Music Studio</span>
        </div>

        {/* Headline */}
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight leading-[1.1]">
          Redefine <br />
          <span className="text-gradient">Music Creation.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-slate-400 leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
          Unleash your creativity with state-of-the-art AI. Generate lyrics, compose melodies, and classify genres in seconds.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
          <Link to="/lyrics" className="btn-primary group w-full sm:w-auto">
            <span>Start Creating</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link to="/melody" className="btn-secondary group w-full sm:w-auto">
            <PlayCircle className="w-5 h-5" />
            <span>Try Demo</span>
          </Link>
        </div>

        {/* Stats / Trust */}
        <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 text-slate-500 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>LSTM Networks</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>CNN Models</span>
          </div>
        </div>
      </div>

      {/* Right Column: Bento Grid Features */}
      <div className="flex-1 w-full max-w-xl">
        <div className="grid grid-cols-2 gap-4 auto-rows-[180px]">

          {/* Main Feature: Lyrics */}
          <Link to="/lyrics" className="glass-card col-span-2 p-6 flex flex-col justify-between group hover:bg-white/5">
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-2xl bg-primary/20 text-primary">
                <Mic2 className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Lyric Generation</h3>
              <p className="text-sm text-slate-400">Create expressive lyrics with AI.</p>
            </div>
            {/* Decorative Waveform */}
            <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg width="200" height="100" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 50C20 40 40 60 60 50C80 40 100 60 120 50C140 40 160 60 180 50" stroke="currentColor" strokeWidth="4" />
              </svg>
            </div>
          </Link>

          {/* Feature: Melody */}
          <Link to="/melody" className="glass-card p-6 flex flex-col justify-between group hover:bg-white/5">
            <div className="p-3 rounded-2xl bg-accent/20 text-accent w-fit">
              <Piano className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Melody</h3>
              <p className="text-xs text-slate-400">AI Composition</p>
            </div>
          </Link>

          {/* Feature: Classification */}
          <Link to="/classification" className="glass-card p-6 flex flex-col justify-between group hover:bg-white/5">
            <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 w-fit">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Classify</h3>
              <p className="text-xs text-slate-400">Genre Detection</p>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
};

export default Home;
