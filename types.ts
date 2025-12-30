export interface MetronomeSettings {
  bpm: number;
  isPlaying: boolean;
  beatsPerMeasure: number; // e.g., 4 for 4/4 time
  subdivision: number; // 1 = quarter, 2 = eighth, etc.
}

export enum SoundType {
  Downbeat = 'downbeat', // First beat of measure
  Beat = 'beat',         // Quarter notes
  Subbeat = 'subbeat'    // Eighths, sixteenths, etc.
}

export enum SoundTheme {
  Mechanical = 'mechanical',
  Classic = 'classic',
  Digital = 'digital',
  Wood = 'wood'
}

export interface ThemeColors {
  id: string;
  name: string;
  primary: string; // Hex for canvas/svg
  accentClass: string; // Text color e.g. 'text-cyan-400'
  bgActive: string; // Background e.g. 'bg-cyan-500/10'
  border: string; // Border color e.g. 'border-cyan-500/30'
  shadow: string; // Shadow e.g. 'shadow-cyan-500/50'
  gradientStop: string; // For SVG gradients
}