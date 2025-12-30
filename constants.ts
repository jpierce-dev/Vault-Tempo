import { ThemeColors } from './types';

export const MIN_BPM = 40;
export const MAX_BPM = 220;
export const DEFAULT_BPM = 120;

// Angle constraints for the knob (in degrees)
// Using a standard gauge layout: 
// 135 degrees (Bottom Left) to 405 degrees (Bottom Right)
export const START_ANGLE = 135; 
export const END_ANGLE = 405; 

export const THEMES: Record<string, ThemeColors> = {
  CYAN: {
    id: 'cyan',
    name: 'Cyber',
    primary: '#06b6d4', // cyan-500
    accentClass: 'text-cyan-400',
    bgActive: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    shadow: 'shadow-cyan-500/50',
    gradientStop: '#22d3ee' // cyan-400
  },
  AMBER: {
    id: 'amber',
    name: 'Amber',
    primary: '#f97316', // orange-500
    accentClass: 'text-orange-400',
    bgActive: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    shadow: 'shadow-orange-500/50',
    gradientStop: '#fbbf24' // amber-400
  },
  ROSE: {
    id: 'rose',
    name: 'Neon',
    primary: '#f43f5e', // rose-500
    accentClass: 'text-rose-400',
    bgActive: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    shadow: 'shadow-rose-500/50',
    gradientStop: '#fb7185' // rose-400
  },
  EMERALD: {
    id: 'emerald',
    name: 'Toxic',
    primary: '#10b981', // emerald-500
    accentClass: 'text-emerald-400',
    bgActive: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    shadow: 'shadow-emerald-500/50',
    gradientStop: '#34d399' // emerald-400
  }
};

export const COLORS = {
  primary: '#0f172a', // slate-900
  secondary: '#1e293b', // slate-800
  text: '#f8fafc',
};