import React, { useEffect, useRef } from 'react';

/**
 * Configuration Interface Definition
 */
interface MeteorProps {
  starCount?: number;        // Static star count, default 150
  meteorCount?: number;      // Max concurrent meteors, default 2
  baseSpeed?: number;        // Meteor base speed, default 3
  className?: string;        // Custom CSS class name
}

export const MeteorBackground: React.FC<MeteorProps> = ({
  starCount = 100,
  meteorCount = 4, // Increase concurrency
  baseSpeed = 3,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- State Management ---
    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrameId: number;
    
    // Reduce particles for mobile to optimize performance
    const isMobile = width < 768;
    const actualStarCount = isMobile ? Math.floor(starCount / 2) : starCount;
    const actualMeteorCount = isMobile ? 2 : meteorCount; // Slightly more on mobile too

    // Particle Object Definition
    interface Star { x: number; y: number; radius: number; opacity: number; blinkSpeed: number; }
    interface Meteor { x: number; y: number; length: number; speed: number; }

    const stars: Star[] = [];
    const meteors: Meteor[] = [];

    // --- Initialization Logic ---
    const init = () => {
      canvas.width = width;
      canvas.height = height;
      
      // Generate static stars
      stars.length = 0;
      for (let i = 0; i < actualStarCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.5, // Radius 0 ~ 1.5px
          opacity: Math.random(),
          blinkSpeed: 0.01 + Math.random() * 0.03 // Blink frequency
        });
      }
    };

    // --- Animation Loop ---
    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Draw static stars
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        
        // Breathing blink effect
        star.opacity += star.blinkSpeed;
        // Use Math.sin for smooth breathing curve
        const alpha = (Math.sin(star.opacity) + 1) / 2 * 0.8 + 0.2; // Range 0.2 ~ 1.0
        
        ctx.globalAlpha = alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1; // Reset

      // 2. Draw and update meteors
      // Meteors streak from top-right to bottom-left
      meteors.forEach((meteor, index) => {
        meteor.x -= meteor.speed; // Left
        meteor.y += meteor.speed; // Down

        // Draw meteor tail (Linear gradient)
        const endX = meteor.x + meteor.length;
        const endY = meteor.y - meteor.length;

        const gradient = ctx.createLinearGradient(meteor.x, meteor.y, endX, endY);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');   // Head highlight
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');   // Tail transparent

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw meteor head
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Remove meteors off-screen
        if (meteor.x < -300 || meteor.y > height + 300) {
          meteors.splice(index, 1);
        }
      });

      // 3. Randomly generate new meteors
      // Probability: 2% chance per frame (if below max count)
      if (meteors.length < actualMeteorCount && Math.random() < 0.02) {
        const startX = Math.random() * width + 200; // Generate on right side
        const startY = Math.random() * -200 - 50;   // Generate above
        
        meteors.push({
          x: startX,
          y: startY,
          length: Math.random() * 150 + 150, // Length 150 ~ 300
          speed: Math.random() * 2 + baseSpeed + 2 // Speed
        });
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    // --- Event Listeners ---
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      init(); // Regenerate star positions
    };

    init();
    draw();
    window.addEventListener('resize', handleResize);

    // --- Cleanup Function ---
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [starCount, meteorCount, baseSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      // Transparent background to overlay on existing CSS gradient
      style={{ background: 'transparent' }} 
    />
  );
};
