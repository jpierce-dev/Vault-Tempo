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

  public playMechanicalClick(type: SoundType = SoundType.Subbeat, time?: number) {
    if (!this.audioContext) {
      this.resumeContext();
    }
    if (!this.audioContext) return;

    const t = time ?? this.audioContext.currentTime;

    // Metallic synthesis: Inharmonic partials + exponential decay
    const createMetallicResonance = (baseFreq: number, gainVal: number, scale: number, decay: number) => {
      // Metallic partials often follow inharmonic ratios
      const partials = [1, 1.52, 2.76, 3.41, 4.1, 5.23, 6.7];

      const masterGain = this.audioContext!.createGain();
      masterGain.connect(this.audioContext!.destination);
      masterGain.gain.setValueAtTime(0, t);
      masterGain.gain.linearRampToValueAtTime(gainVal, t + 0.002);
      masterGain.gain.exponentialRampToValueAtTime(0.001, t + decay);

      partials.forEach((ratio, i) => {
        const osc = this.audioContext!.createOscillator();
        const pGain = this.audioContext!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * ratio, t);
        // Slightly detune overtime for metal feel
        osc.frequency.exponentialRampToValueAtTime(baseFreq * ratio * 0.99, t + decay);

        // Higher partials decay faster
        pGain.gain.setValueAtTime(scale / (i + 1), t);
        pGain.gain.exponentialRampToValueAtTime(0.001, t + (decay / (i + 1)));

        osc.connect(pGain);
        pGain.connect(masterGain);
        osc.start(t);
        osc.stop(t + decay + 0.1);
      });

      // Sharp "Ping" noise component
      const noise = this.audioContext!.createBiquadFilter();
      noise.type = 'highpass';
      noise.frequency.value = 5000;
      const noiseGain = this.audioContext!.createGain();
      noiseGain.gain.setValueAtTime(gainVal * 0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);

      // Use a square wave oscillator as raw noise source
      const noiseOsc = this.audioContext!.createOscillator();
      noiseOsc.type = 'square';
      noiseOsc.frequency.value = 8000;
      noiseOsc.connect(noise);
      noise.connect(noiseGain);
      noiseGain.connect(this.audioContext!.destination);
      noiseOsc.start(t);
      noiseOsc.stop(t + 0.02);
    };

    if (type === SoundType.Downbeat) {
      // Big metal "DANG" 
      createMetallicResonance(2000, 0.4, 0.5, 0.5);
    } else if (type === SoundType.Beat) {
      // Sharp metal "DING"
      createMetallicResonance(1400, 0.25, 0.3, 0.3);
    } else {
      // Small metal "tick"
      createMetallicResonance(3000, 0.08, 0.1, 0.05);
    }
  }

  // Classic: Bell for Downbeat, Sharp Tock for Beats
  public playClassicClick(type: SoundType, time: number) {
    if (!this.audioContext) return;
    const t = time;

    if (type === SoundType.Downbeat) {
      // Bell Sound (Sine wave with long decay)
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, t); // High pitched bell

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.005); // Attack
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5); // Long ring decay

      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    }

    // The Tock Sound (for Downbeat overlay and normal Beats)
    // We play a click on downbeat too, to give it attack
    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc2.type = 'square'; // Square wave for "plastic/hard" sound
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, t);

    // Pitch
    const baseFreq = (type === SoundType.Subbeat) ? 600 : 800;
    osc2.frequency.setValueAtTime(baseFreq, t);

    // Envelope
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.15, t + 0.002);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.04); // Short decay

    osc2.connect(filter);
    filter.connect(gain2);
    gain2.connect(this.audioContext.destination);

    osc2.start(t);
    osc2.stop(t + 0.05);
  }

  public playDigitalBeep(type: SoundType, time: number) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';

    if (type === SoundType.Downbeat) {
      osc.frequency.setValueAtTime(2000, time);
      gain.gain.setValueAtTime(0.25, time);
    } else if (type === SoundType.Beat) {
      osc.frequency.setValueAtTime(1000, time);
      gain.gain.setValueAtTime(0.15, time);
    } else {
      osc.frequency.setValueAtTime(800, time);
      gain.gain.setValueAtTime(0.05, time);
    }

    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  public playWoodblock(type: SoundType, time: number) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine'; // Sine is good for hollow wood sounds

    if (type === SoundType.Downbeat) {
      osc.frequency.setValueAtTime(1600, time);
      gain.gain.setValueAtTime(0.3, time);
    } else if (type === SoundType.Beat) {
      osc.frequency.setValueAtTime(1000, time);
      gain.gain.setValueAtTime(0.2, time);
    } else {
      osc.frequency.setValueAtTime(1200, time); // Slightly different pitch for subs
      gain.gain.setValueAtTime(0.05, time);
    }

    // Quick decay for wood snap
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start(time);
    osc.stop(time + 0.06);
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