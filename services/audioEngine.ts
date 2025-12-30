import { SoundType, SoundTheme } from '../types';

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private nextNoteTime: number = 0.0;
  private timerID: number | null = null;
  private isPlaying: boolean = false;
  private scheduleAheadTime: number = 0.1;
  private lookahead: number = 25.0;

  // Metronome State
  private bpm: number = 120;
  private beatsPerMeasure: number = 4;
  private subdivision: number = 1; // 1, 2, 3, 4
  private theme: SoundTheme = SoundTheme.Mechanical;

  // Counters
  private currentBeatInBar: number = 0; // 0 to beatsPerMeasure - 1
  private currentSubdivision: number = 0; // 0 to subdivision - 1

  // Callback for visual updates (only fires on main beats)
  private onBeatCallback: ((beat: number) => void) | null = null;

  constructor() { }

  // Publicly exposed so UI components can trigger resume on first interaction
  public resumeContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
  }

  public setBeatsPerMeasure(beats: number) {
    this.beatsPerMeasure = beats;
    this.resetRhythm();
  }

  public setSubdivision(sub: number) {
    this.subdivision = sub;
    this.resetRhythm();
  }

  public setTheme(theme: SoundTheme) {
    this.theme = theme;
  }

  private resetRhythm() {
    this.currentBeatInBar = 0;
    this.currentSubdivision = 0;
  }

  public setOnBeatCallback(cb: (beat: number) => void) {
    this.onBeatCallback = cb;
  }

  // --- Sound Synthesis ---

  // Professional Click Component: Sharp transient + Body
  private playClick(freq: number, decay: number, type: 'digital' | 'wood' | 'metal' | 'mechanical', time: number) {
    if (!this.audioContext) return;
    const t = time;

    // 1. Sharp Escapement Click (The metallic "ping" of the gears)
    const transient = this.audioContext.createOscillator();
    const transGain = this.audioContext.createGain();

    if (type === 'mechanical') {
      // High-pitched metallic bite
      transient.type = 'square';
      transient.frequency.setValueAtTime(2500, t);
      transGain.gain.setValueAtTime(0.2, t);
    } else {
      transient.type = (type === 'digital' || type === 'metal') ? 'sine' : 'square';
      transient.frequency.setValueAtTime(freq * 2, t);
      transGain.gain.setValueAtTime(0.3, t);
    }

    transGain.gain.exponentialRampToValueAtTime(0.001, t + 0.004);

    transient.connect(transGain);
    transGain.connect(this.audioContext.destination);
    transient.start(t);
    transient.stop(t + 0.01);

    // 2. The Body (The "Tone")
    const body = this.audioContext.createOscillator();
    const bodyGain = this.audioContext.createGain();

    if (type === 'mechanical') {
      // Warm wooden character: low-mid frequency triangle
      body.type = 'triangle';
      body.frequency.setValueAtTime(freq, t);
      // Subtle pitch drift for organic feel
      body.frequency.exponentialRampToValueAtTime(freq * 0.95, t + decay);
    } else if (type === 'wood') {
      body.type = 'sine';
      body.frequency.setValueAtTime(freq, t);
      body.frequency.exponentialRampToValueAtTime(freq * 0.6, t + decay);
    } else if (type === 'metal') {
      body.type = 'sine';
      body.frequency.setValueAtTime(freq, t);
      // Add a higher harmonic for metal
      const harm = this.audioContext.createOscillator();
      const harmGain = this.audioContext.createGain();
      harm.type = 'sine';
      harm.frequency.setValueAtTime(freq * 2.1, t);
      harmGain.gain.setValueAtTime(0.1, t);
      harmGain.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.5);
      harm.connect(harmGain);
      harmGain.connect(this.audioContext.destination);
      harm.start(t);
      harm.stop(t + decay);
    } else {
      body.type = 'sine';
      body.frequency.setValueAtTime(freq, t);
    }

    bodyGain.gain.setValueAtTime(0, t);
    bodyGain.gain.linearRampToValueAtTime(0.4, t + 0.002);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    body.connect(bodyGain);
    bodyGain.connect(this.audioContext.destination);
    body.start(t);
    body.stop(t + decay + 0.1);

    // 3. Mechanical Snap/Air (The "Room" component)
    const noise = this.audioContext.createBufferSource();
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.03, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'bandpass';

    if (type === 'mechanical') {
      // Metallic room snap
      noiseFilter.frequency.value = 3500;
      noiseFilter.Q.value = 1.5;
      const noiseGain = this.audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.08, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.audioContext.destination);
      noise.start(t);
    } else if (type === 'wood') {
      noiseFilter.frequency.value = 800;
      noiseFilter.Q.value = 1;
      const noiseGain = this.audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.1, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.audioContext.destination);
      noise.start(t);
    }
  }

  public playMechanicalClick(type: SoundType = SoundType.Subbeat, time?: number) {
    if (!this.audioContext) this.resumeContext();
    if (!this.audioContext) return;
    const t = time ?? this.audioContext.currentTime;

    if (type === SoundType.Downbeat) {
      // Accent: slightly higher and louder body resonance
      this.playClick(500, 0.1, 'mechanical', t);

      // Traditional bell accent (can be mixed with the mechanical sound)
      const bell = this.audioContext.createOscillator();
      const bellGain = this.audioContext.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(1800, t);
      bellGain.gain.setValueAtTime(0, t);
      bellGain.gain.linearRampToValueAtTime(0.1, t + 0.005);
      bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      bell.connect(bellGain);
      bellGain.connect(this.audioContext.destination);
      bell.start(t);
      bell.stop(t + 0.3);
    } else if (type === SoundType.Beat) {
      // Normal Tock: Low warm resonance
      this.playClick(350, 0.08, 'mechanical', t);
    } else {
      // Subbeat: Light tick
      this.playClick(700, 0.04, 'mechanical', t);
    }
  }

  public playClassicClick(type: SoundType, time: number) {
    if (type === SoundType.Downbeat) {
      this.playClick(1000, 0.1, 'metal', time);
    } else if (type === SoundType.Beat) {
      this.playClick(500, 0.06, 'digital', time);
    } else {
      this.playClick(1500, 0.03, 'digital', time);
    }
  }

  public playDigitalBeep(type: SoundType, time: number) {
    if (type === SoundType.Downbeat) {
      this.playClick(2000, 0.05, 'digital', time);
    } else if (type === SoundType.Beat) {
      this.playClick(1000, 0.04, 'digital', time);
    } else {
      this.playClick(1500, 0.02, 'digital', time);
    }
  }

  public playWoodblock(type: SoundType, time: number) {
    if (type === SoundType.Downbeat) {
      this.playClick(1200, 0.08, 'wood', time);
    } else if (type === SoundType.Beat) {
      this.playClick(800, 0.06, 'wood', time);
    } else {
      this.playClick(1500, 0.03, 'wood', time);
    }
  }

  private playSound(type: SoundType, time: number) {
    switch (this.theme) {
      case SoundTheme.Classic:
        this.playClassicClick(type, time);
        break;
      case SoundTheme.Digital:
        this.playDigitalBeep(type, time);
        break;
      case SoundTheme.Wood:
        this.playWoodblock(type, time);
        break;
      case SoundTheme.Mechanical:
      default:
        this.playMechanicalClick(type, time);
        break;
    }
  }

  // --- Scheduler ---

  private scheduleNote(beatIndex: number, subdivisionIndex: number, time: number) {
    // Only fire visual callback on the main beat (subdivision 0)
    if (subdivisionIndex === 0 && this.audioContext) {
      // Fire callback 25ms earlier to compensate for React's state/render latency
      const drawTime = ((time - this.audioContext.currentTime) * 1000) - 25;
      setTimeout(() => {
        if (this.onBeatCallback && this.isPlaying) {
          this.onBeatCallback(beatIndex);
        }
      }, Math.max(0, drawTime));
    }

    // Determine Sound Type
    let type: SoundType = SoundType.Subbeat;
    if (subdivisionIndex === 0) {
      type = beatIndex === 0 ? SoundType.Downbeat : SoundType.Beat;
    }

    this.playSound(type, time);
  }

  private nextNote() {
    // Calculate time per subdivision
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPerSub = secondsPerBeat / this.subdivision;

    this.nextNoteTime += secondsPerSub;

    // Advance counters
    this.currentSubdivision++;

    if (this.currentSubdivision >= this.subdivision) {
      this.currentSubdivision = 0;
      this.currentBeatInBar++;

      if (this.currentBeatInBar >= this.beatsPerMeasure) {
        this.currentBeatInBar = 0;
      }
    }
  }

  private scheduler() {
    if (!this.audioContext) return;

    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeatInBar, this.currentSubdivision, this.nextNoteTime);
      this.nextNote();
    }

    if (this.isPlaying) {
      this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }
  }

  public start() {
    this.resumeContext();
    if (this.isPlaying) return;

    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isPlaying = true;
    this.resetRhythm();
    this.nextNoteTime = this.audioContext!.currentTime + 0.05;
    this.scheduler();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  public toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }
}

export const audioEngine = new AudioEngine();