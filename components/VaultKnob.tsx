import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MIN_BPM, MAX_BPM, START_ANGLE, END_ANGLE } from '../constants';
import { audioEngine } from '../services/audioEngine';
import { ThemeColors } from '../types';

interface VaultKnobProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  currentBeat?: number;
  theme: ThemeColors;
}

const VaultKnob: React.FC<VaultKnobProps> = ({ bpm, onBpmChange, currentBeat, theme }) => {
  const knobRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [angle, setAngle] = useState(START_ANGLE);

  // --- Knob Logic ---
  useEffect(() => {
    const percentage = (bpm - MIN_BPM) / (MAX_BPM - MIN_BPM);
    const targetAngle = START_ANGLE + percentage * (END_ANGLE - START_ANGLE);
    setAngle(targetAngle);
  }, [bpm]);

  const calculateBpmFromAngle = (inputAngle: number) => {
    let logicalAngle = inputAngle;
    if (logicalAngle < 90) logicalAngle += 360;
    if (logicalAngle < START_ANGLE) logicalAngle = START_ANGLE;
    if (logicalAngle > END_ANGLE) logicalAngle = END_ANGLE;

    const percentage = (logicalAngle - START_ANGLE) / (END_ANGLE - START_ANGLE);
    return {
      angle: logicalAngle,
      bpm: Math.round(MIN_BPM + percentage * (MAX_BPM - MIN_BPM))
    };
  };

  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    if (!knobRef.current) return;

    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deg = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    if (deg < 0) deg += 360;

    const result = calculateBpmFromAngle(deg);

    setAngle(result.angle);

    if (result.bpm !== bpm) {
      onBpmChange(result.bpm);
      // Revert to mechanical click for metal/original sound
      audioEngine.playMechanicalClick();
    }
  }, [bpm, onBpmChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Initializing audio context on the first user interaction event is crucial
    // to bypass browser autoplay policies and ensure immediate sound.
    audioEngine.resumeContext();

    e.preventDefault();
    setIsDragging(true);
    handleInteraction(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Initializing audio context on the first user interaction event is crucial
    audioEngine.resumeContext();

    e.preventDefault();
    setIsDragging(true);
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDragging) handleInteraction(e.clientX, e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, handleInteraction]);

  const adjustBpm = (e: React.MouseEvent | React.TouchEvent, delta: number) => {
    e.stopPropagation();
    audioEngine.resumeContext(); // Ensure sound works on button click too
    const newBpm = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm + delta));
    onBpmChange(newBpm);
    audioEngine.playMechanicalClick();
  };

  // --- Visual Dimensions ---
  const size = 340;
  const center = size / 2;

  // Layer Geometry
  const outerRadius = 160;     // The glow arc
  const trackRadius = 145;     // The ball path
  const tickOuterRadius = 135; // Ticks start here
  const tickInnerRadius = 115; // Ticks end here

  const circumference = 2 * Math.PI * outerRadius;
  const trackLength = circumference * 0.75; // 270 degrees
  const percentage = (bpm - MIN_BPM) / (MAX_BPM - MIN_BPM);
  const activeLength = trackLength * percentage;

  const rotationOffset = 135;

  // Knob Handle Position (The Ball)
  // The ball sits on the trackRadius
  const rad = (angle * Math.PI) / 180;
  const thumbX = center + outerRadius * Math.cos(rad); // Ball on the outer glow ring edge
  const thumbY = center + outerRadius * Math.sin(rad);

  // --- Beat Flashing Logic ---
  const [flashLevel, setFlashLevel] = useState(0);
  const lastBeatRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (currentBeat !== undefined && currentBeat !== lastBeatRef.current && currentBeat >= 0) {
      setFlashLevel(1);
      const timer = setTimeout(() => setFlashLevel(0), 150);
      lastBeatRef.current = currentBeat;
      return () => clearTimeout(timer);
    }
  }, [currentBeat]);

  const isFlashing = flashLevel > 0;

  // Generate Ticks (High Density)
  const numTicks = 100;
  const ticks = [];
  for (let i = 0; i <= numTicks; i++) {
    const tickAngle = START_ANGLE + (i / numTicks) * (END_ANGLE - START_ANGLE);
    const isHighlighted = tickAngle <= angle;
    const tRad = (tickAngle * Math.PI) / 180;

    const x1 = center + tickInnerRadius * Math.cos(tRad);
    const y1 = center + tickInnerRadius * Math.sin(tRad);
    const x2 = center + tickOuterRadius * Math.cos(tRad);
    const y2 = center + tickOuterRadius * Math.sin(tRad);

    // Only flash the part of the progress that is active (highlighted)
    const isCurrentFlash = isFlashing && isHighlighted;

    ticks.push(
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isCurrentFlash ? theme.primary : (isHighlighted ? theme.primary : "#334155")}
        strokeWidth={isCurrentFlash ? 3.5 : 1.5}
        strokeLinecap="butt"
        className="transition-all duration-150"
        style={{
          filter: isCurrentFlash ? `drop-shadow(0 0 10px ${theme.primary}) brightness(2) saturate(2)` : 'none',
          opacity: isCurrentFlash ? 1 : (isHighlighted ? 0.9 : 0.4),
          scale: isCurrentFlash ? 1.08 : 1,
          transformOrigin: 'center'
        }}
      />
    );
  }

  return (
    <div className="relative flex items-center justify-center">

      <div
        ref={knobRef}
        className="relative z-10 cursor-grab active:cursor-grabbing touch-none select-none rounded-full"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="overflow-visible pointer-events-none">
          <defs>
            <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={theme.primary} />
              <stop offset="100%" stopColor={theme.gradientStop} />
            </linearGradient>

            {/* Glow for the outer arc */}
            <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Metallic Sphere Gradient */}
            <radialGradient id="sphereMetal" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f1f5f9" />  {/* White highlight */}
              <stop offset="40%" stopColor="#94a3b8" /> {/* Light grey */}
              <stop offset="100%" stopColor="#475569" /> {/* Dark grey */}
            </radialGradient>

            {/* Drop shadow for the ball to make it float */}
            <filter id="ballShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="black" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* 1. Track Background (Behind ticks) */}
          {/* This gives the dark area where ticks reside */}
          <path
            d={`M ${center + outerRadius * Math.cos(START_ANGLE * Math.PI / 180)} ${center + outerRadius * Math.sin(START_ANGLE * Math.PI / 180)} A ${outerRadius} ${outerRadius} 0 1 1 ${center + outerRadius * Math.cos(END_ANGLE * Math.PI / 180)} ${center + outerRadius * Math.sin(END_ANGLE * Math.PI / 180)}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth="4"
            strokeLinecap="round"
            className="opacity-50"
          />

          {/* 2. Active Progress Arc (The glowing outer rim) */}
          {/* Note: This is OUTSIDE the ticks */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke={theme.primary}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${activeLength} ${circumference}`}
            transform={`rotate(${rotationOffset} ${center} ${center})`}
            filter="url(#arcGlow)"
            className="transition-[stroke-dasharray] duration-75 ease-linear opacity-90"
          />

          {/* 3. The Ticks (Inner Ring) */}
          <g>{ticks}</g>

          {/* 4. The Sphere Handle */}
          <g
            style={{ transform: `translate(${thumbX}px, ${thumbY}px)` }}
            className="transition-transform duration-75 ease-linear"
          >
            {/* Shadow */}
            <circle r="12" fill="transparent" filter="url(#ballShadow)" />

            {/* Main Sphere */}
            <circle r="10" fill="url(#sphereMetal)" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.5" />

            {/* Subtle colored glow from the track reflecting on the ball */}
            <circle r="10" fill={theme.primary} opacity="0.2" style={{ mixBlendMode: 'overlay' }} />
          </g>
        </svg>

        {/* Center UI Overlay - The Glassy Hub */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Main Hub Container */}
          <div className="w-[210px] h-[210px] rounded-full flex flex-col items-center justify-center pointer-events-auto relative overflow-hidden group z-20 border border-white/5"
            style={{
              background: 'radial-gradient(circle at 50% 100%, #1e293b, #020617 90%)',
              boxShadow: '0 0 40px -10px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.8)'
            }}
          >
            {/* Note: Grid removed as per request */}
            <div
              className={`absolute inset-0 bg-white/10 pointer-events-none transition-opacity duration-150 ${isFlashing ? 'opacity-100' : 'opacity-0'}`}
              style={{ mixBlendMode: 'overlay' }}
            ></div>
            {/* Top "Lens" Reflection - Crucial for the look */}
            <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/10 to-transparent rounded-t-full pointer-events-none blur-[1px]"></div>

            {/* BPM Label */}
            <span className="text-slate-500 text-[10px] font-bold tracking-[0.2em] mb-2 z-10 uppercase">BPM</span>

            <div className="flex items-center gap-2 relative z-10 w-full justify-center px-3">
              {/* Minus Button */}
              <button
                onMouseDown={(e) => adjustBpm(e, -1)}
                onTouchStart={(e) => adjustBpm(e, -1)}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-[#0f172a] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.1)] text-slate-500 hover:text-slate-200 transition-all active:scale-95"
              >
                <svg width="12" height="2" viewBox="0 0 14 2" fill="currentColor"><rect width="14" height="2" rx="1" /></svg>
              </button>

              {/* Number Display */}
              <div className="min-w-[5rem] flex-1 text-center relative flex justify-center">
                <span className="text-6xl leading-none font-bold text-white tabular-nums tracking-tighter drop-shadow-2xl font-[Inter]">
                  {bpm}
                </span>
              </div>

              {/* Plus Button */}
              <button
                onMouseDown={(e) => adjustBpm(e, 1)}
                onTouchStart={(e) => adjustBpm(e, 1)}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-[#0f172a] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.1)] text-slate-500 hover:text-slate-200 transition-all active:scale-95"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><path d="M6 6V1a1 1 0 0 1 2 0v5h5a1 1 0 0 1 0 2H8v5a1 1 0 0 1-2 0V8H1a1 1 0 0 1 0-2h5z" /></svg>
              </button>
            </div>

            {/* Bottom reflection detail */}
            <div className="absolute bottom-4 w-12 h-1 rounded-full bg-white/5 blur-sm"></div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VaultKnob;