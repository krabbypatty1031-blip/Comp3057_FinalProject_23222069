/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        // Deep Space Theme
        slate: {
          850: '#1e293b', // Slightly lighter than 900 for cards
          900: '#0F172A', // Deep Space Background
        },
        primary: {
          DEFAULT: '#6366F1', // Indigo 500
          hover: '#4F46E5',   // Indigo 600
          glow: 'rgba(99, 102, 241, 0.5)',
        },
        accent: {
          DEFAULT: '#F472B6', // Pink 400
          glow: 'rgba(244, 114, 182, 0.5)',
        },
        success: '#10B981',
        error: '#EF4444',
      },
      backgroundImage: {
        'deep-space': 'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0f172a 100%)', // Indigo 950 to Slate 900
        'glass-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(99, 102, 241, 0.3), 0 0 40px rgba(99, 102, 241, 0.1)',
        'neon-hover': '0 0 30px rgba(99, 102, 241, 0.5), 0 0 60px rgba(99, 102, 241, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'waveform': 'waveform 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        waveform: {
          '0%, 100%': { height: '20%' },
          '50%': { height: '100%' },
        }
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
