/**
 * Layout Component
 * iOS style page layout, including navigation bar
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, Home, Mic2, Piano, Headphones, Sparkles } from 'lucide-react';
import { MeteorBackground } from './MeteorBackground';

// Navigation item configuration
const navItems = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Lyrics', path: '/lyrics', icon: Mic2 },
  { name: 'Melody', path: '/melody', icon: Piano },
  { name: 'Classification', path: '/classification', icon: Headphones },
];

/**
 * Navigation Bar Component
 * Deep Space Style: Frosted glass effect, fixed top, Neon Logo
 */
const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 group">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md group-hover:blur-lg transition-all duration-300" />
          <div className="relative w-full h-full bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center border border-white/10 shadow-neon">
            <Music className="w-5 h-5 text-white" />
          </div>
        </div>
        <span className="text-2xl font-bold tracking-tight text-white">
          Musify
        </span>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-xl
                text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary/10 text-primary shadow-neon-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <button className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </nav>
  );
};

/**
 * Footer Component
 */
const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-8 text-center text-sm text-gray-500">
      <div className="flex items-center justify-center space-x-1 mb-2">
        <Sparkles className="w-4 h-4" />
        <span>Powered by AI</span>
      </div>
      <p>© 2024 Musify. HKBU Final Project.</p>
    </footer>
  );
};

/**
 * Layout Props
 */
interface LayoutProps {
  children: React.ReactNode;
}

// Static Background Component, avoid re-rendering
const DeepSpaceBackground = React.memo(() => (
  <div className="fixed inset-0 -z-10 bg-slate-900 overflow-hidden pointer-events-none">
    {/* Radial Gradient Base */}
    <div className="absolute inset-0 bg-deep-space" />

    {/* Animated Blobs (Galaxy) - Layer 1 */}
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full mix-blend-screen filter blur-[128px] animate-blob will-change-transform" />
    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[128px] animate-blob animation-delay-200 will-change-transform" />
    <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-accent/20 rounded-full mix-blend-screen filter blur-[128px] animate-blob animation-delay-400 will-change-transform" />

    {/* Canvas Meteor Layer (Stars) - Layer 2 (Top of background) */}
    <MeteorBackground 
        starCount={150} 
        meteorCount={3} 
        baseSpeed={3} 
        className="z-0" //
    />

    {/* Noise Texture - Layer 3 (Overlay) */}
    <div className="absolute inset-0 opacity-[0.02] z-10"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
    />
  </div>
));

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col font-body text-slate-50 selection:bg-primary/30 overflow-x-hidden">
      <DeepSpaceBackground />

      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 pt-28 pb-12 px-4 md:px-8 max-w-7xl mx-auto w-full relative z-10">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Layout;