import React, { useState, useEffect, useCallback, useRef } from 'react';
import VaultKnob from './components/VaultKnob';
import { audioEngine } from './services/audioEngine';
import { DEFAULT_BPM, THEMES } from './constants';
import { SoundTheme, ThemeColors } from './types';

// Defines the structure for time signatures
interface TimeSignature {
  top: number;
  bottom: number;
}

// Common time signatures
const TIME_SIGNATURES: TimeSignature[] = [
  { top: 2, bottom: 4 },
  { top: 3, bottom: 4 },
  { top: 4, bottom: 4 },
  { top: 6, bottom: 8 },
];

const TIMER_OPTIONS = [5, 10, 15, 20, 30, 60]; // Minutes

const App: React.FC = () => {
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [isPlaying, setIsPlaying] = useState(false);

  // Timer State
  const [timerLimit, setTimerLimit] = useState<number | null>(null); // in seconds
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);

  // New Features State
  const [subdivision, setSubdivision] = useState(1);
  const [showSubdivisionMenu, setShowSubdivisionMenu] = useState(false);
  const [soundTheme, setSoundTheme] = useState<SoundTheme>(SoundTheme.Mechanical);

  // Visual Theme State - Default to CYAN (Cyber)
  const [currentTheme, setCurrentTheme] = useState<ThemeColors>(THEMES.CYAN);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Initialize with 4/4
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(TIME_SIGNATURES[2]);

  const [currentBeat, setCurrentBeat] = useState(-1);
  const subdivisionMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Fullscreen & PWA State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  useEffect(() => {
    audioEngine.setBpm(bpm);
    audioEngine.setBeatsPerMeasure(timeSignature.top);
    audioEngine.setSubdivision(subdivision);
    audioEngine.setTheme(soundTheme);
    audioEngine.setOnBeatCallback((beat) => setCurrentBeat(beat));
  }, []);

  // Update engine when state changes
  useEffect(() => { audioEngine.setSubdivision(subdivision); }, [subdivision]);
  useEffect(() => { audioEngine.setTheme(soundTheme); }, [soundTheme]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (subdivisionMenuRef.current && !subdivisionMenuRef.current.contains(event.target as Node)) {
        setShowSubdivisionMenu(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: number;

    if (isPlaying && timeLeft !== null && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev !== null && prev <= 1) {
            // Timer finished
            togglePlay();
            return timerLimit;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, timerLimit]);

  const handleBpmChange = useCallback((newBpm: number) => {
    setBpm(newBpm);
    audioEngine.setBpm(newBpm);
  }, []);

  const togglePlay = () => {
    const playing = audioEngine.toggle();
    setIsPlaying(playing);
    audioEngine.playMechanicalClick(); // Click sound on toggle
    if (!playing) {
      setCurrentBeat(-1);
    } else {
      if (timeLeft === 0 && timerLimit !== null) {
        setTimeLeft(timerLimit);
      }
    }
  };

  const updateTimeSignature = (sig: TimeSignature) => {
    setTimeSignature(sig);
    audioEngine.setBeatsPerMeasure(sig.top);
    audioEngine.playMechanicalClick();
  };

  const setTimerDuration = (minutes: number | null) => {
    if (minutes === null) {
      setTimerLimit(null);
      setTimeLeft(null);
    } else {
      const seconds = minutes * 60;
      setTimerLimit(seconds);
      setTimeLeft(seconds);
    }
    setShowTimerModal(false);
    audioEngine.playMechanicalClick();
  };

  const toggleSoundTheme = () => {
    setSoundTheme(prev => {
      if (prev === SoundTheme.Mechanical) return SoundTheme.Classic;
      if (prev === SoundTheme.Classic) return SoundTheme.Digital;
      if (prev === SoundTheme.Digital) return SoundTheme.Wood;
      return SoundTheme.Mechanical;
    });
    audioEngine.playMechanicalClick();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    // Main Container
    <div className="relative h-[100dvh] w-full bg-[#0f172a] text-slate-200 overflow-hidden selection:bg-white/30 font-sans grid grid-rows-[auto_1fr_auto] landscape:grid-rows-1 landscape:grid-cols-[1fr_22rem]">

      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none row-span-full col-span-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#1e293b,transparent_70%)] opacity-60"></div>
        <div
          className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] transition-colors duration-1000 opacity-10"
          style={{ backgroundColor: currentTheme.primary }}
        ></div>
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] transition-colors duration-1000 opacity-10"
          style={{ backgroundColor: currentTheme.primary }}
        ></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* Controls Wrapper */}
      <div className="contents landscape:flex landscape:flex-col landscape:justify-between landscape:col-start-2 landscape:row-start-1 landscape:h-full landscape:bg-[#0f172a]/80 landscape:backdrop-blur-xl landscape:border-l landscape:border-white/5 landscape:z-40 landscape:overflow-y-auto">

        {/* Header */}
        <header className="relative z-40 w-full p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6 shrink-0 row-start-1">
          <div className="flex flex-col items-center">
            <h1 className="text-xs font-bold tracking-[0.3em] text-slate-500 uppercase">Vault Tempo</h1>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mt-2"></div>
          </div>

          {/* Top Feature Bar */}
          <div className="flex w-full max-w-xs justify-between bg-[#131b2d] p-1 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5 relative z-50">
            {/* Time Signature */}
            <div className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-colors font-bold text-sm cursor-default select-none relative group ${currentTheme.accentClass}`}>
              <span className={`drop-shadow-[0_0_8px_rgba(0,0,0,0.3)]`}>{timeSignature.top}/{timeSignature.bottom}</span>
            </div>
            <div className="w-px bg-gradient-to-b from-transparent via-white/10 to-transparent my-2"></div>
            {/* Subdivision */}
            <div className="relative flex-1" ref={subdivisionMenuRef}>
              <button onClick={() => setShowSubdivisionMenu(!showSubdivisionMenu)} className={`w-full h-full flex items-center justify-center gap-2 rounded-xl transition-all duration-200 font-bold text-sm ${showSubdivisionMenu ? 'bg-white/5 text-slate-100 shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
                <span className="text-xl leading-none pt-1">{subdivision === 1 ? '♩' : subdivision === 2 ? '♫' : subdivision === 3 ? '3' : '4'}</span>
              </button>
              {showSubdivisionMenu && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-40 bg-[#1a2235] border border-slate-600/30 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col p-1.5 animate-in fade-in zoom-in-95 duration-200 z-50">
                  <div className="text-[9px] text-center text-slate-500 font-bold tracking-widest uppercase py-1 mb-1 border-b border-white/5">Subdivision</div>
                  {[1, 2, 3, 4].map(sub => (
                    <button key={sub} onClick={() => { setSubdivision(sub); setShowSubdivisionMenu(false); audioEngine.playMechanicalClick(); }} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${subdivision === sub ? `${currentTheme.bgActive} ${currentTheme.accentClass} ${currentTheme.border.replace('/30', '/20')} border` : 'text-slate-400 hover:bg-white/5 border border-transparent'}`}>
                      <span className="flex items-center gap-3">
                        <span className="text-lg w-5 text-center leading-none">
                          {sub === 1 && '♩'}
                          {sub === 2 && '♫'}
                          {sub === 3 && '3'}
                          {sub === 4 && '4'}
                        </span>
                        <span className="text-xs opacity-70 font-mono">
                          {sub === 1 && '1/4'}
                          {sub === 2 && '1/8'}
                          {sub === 3 && '1/12'}
                          {sub === 4 && '1/16'}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-px bg-gradient-to-b from-transparent via-white/10 to-transparent my-2"></div>
            {/* Theme Toggle */}
            <div className="relative flex-1" ref={themeMenuRef}>
              <button onClick={() => setShowThemeMenu(!showThemeMenu)} className="w-full h-full flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors text-slate-400 hover:text-slate-200" title="Color Theme">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21a9 9 0 1 0 0-18c1.5 0 2.8.6 3.8 1.5.8.9 1.2 2.1 1.2 3.5 0 2.5-2.5 4.5-5 4.5-1 0-1.5.5-1.5 1.5 0 1.5.5 3 1.5 7z" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" /><circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" /><circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" /></svg>
              </button>
              {showThemeMenu && (
                <div className="absolute top-full right-0 mt-3 w-32 bg-[#1a2235] border border-slate-600/30 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col p-1.5 animate-in fade-in zoom-in-95 duration-200 z-50">
                  <div className="text-[9px] text-center text-slate-500 font-bold tracking-widest uppercase py-1 mb-1 border-b border-white/5">Theme</div>
                  {Object.values(THEMES).map(theme => (
                    <button key={theme.id} onClick={() => { setCurrentTheme(theme); setShowThemeMenu(false); audioEngine.playMechanicalClick(); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1 ${currentTheme.id === theme.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: theme.primary }}></div>
                      <span>{theme.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-px bg-gradient-to-b from-transparent via-white/10 to-transparent my-2"></div>
            {/* Sound Toggle */}
            <button onClick={toggleSoundTheme} className="flex-1 flex items-center justify-center py-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors text-slate-400 hover:text-slate-200" title="Change Sound">
              {soundTheme === SoundTheme.Mechanical && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>}
              {soundTheme === SoundTheme.Classic && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>}
              {soundTheme === SoundTheme.Digital && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20M2 12l5-5M22 12l-5 5" /></svg>}
              {soundTheme === SoundTheme.Wood && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v8M8 12h8M4 20h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" /></svg>}
            </button>
          </div>

          <div className="flex gap-2">
            {/* PWA Install Button */}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors text-xs font-bold uppercase tracking-wider border border-indigo-500/20"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Install App
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
              )}
            </button>
          </div>
        </header>

        {/* Bottom Control Area */}
        <div className="shrink-0 w-full flex flex-col gap-4 md:gap-8 items-center pb-6 md:pb-12 z-40 row-start-3 landscape:row-auto landscape:justify-end landscape:pb-8">

          {/* Time Signature */}
          <div className="w-full flex justify-center px-4">
            <div className="flex flex-wrap justify-center gap-3 max-w-md">
              {TIME_SIGNATURES.map((sig) => {
                const isActive = timeSignature.top === sig.top && timeSignature.bottom === sig.bottom;
                return (
                  <button key={`${sig.top}-${sig.bottom}`} onClick={() => updateTimeSignature(sig)} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all duration-300 transform ${isActive ? `${currentTheme.bgActive} ${currentTheme.border} ${currentTheme.accentClass} ${currentTheme.shadow} scale-105` : 'border-transparent bg-slate-800/40 text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}>
                    {sig.top}/{sig.bottom}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Physical Controls Row - Centered Layout */}
          {/* Removed the extra placeholder div to allow natural centering */}
          <div className="flex items-center justify-center gap-6 md:gap-8 w-full">

            {/* Timer Button */}
            <button
              onClick={() => setShowTimerModal(true)}
              className={`
                    group flex flex-row items-center justify-between gap-3 h-12 px-4 rounded-xl transition-all duration-200 border relative overflow-hidden shadow-lg
                    ${timerLimit !== null
                  ? `bg-[#1e293b] ${currentTheme.border} ${currentTheme.accentClass} ${currentTheme.shadow} w-32 ring-1 ring-white/10`
                  : 'bg-[#131b2d] border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10 shadow-black/40 w-12 justify-center'
                }
                  `}
            >
              <div className="shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              {timerLimit !== null && timeLeft !== null && (
                <span className="text-sm font-bold font-mono tracking-tighter tabular-nums text-right flex-1">
                  {formatTime(timeLeft)}
                </span>
              )}
            </button>

            {/* Ignition Style Play Button */}
            <button
              onClick={togglePlay}
              className="group relative w-24 h-24 rounded-full outline-none touch-manipulation z-10 active:scale-95 transition-transform duration-150"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* 1. Metal Ring Bezel */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#475569] to-[#0f172a] shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-[#0f172a]"></div>
              <div className="absolute inset-[2px] rounded-full bg-[#1e293b] shadow-[inset_0_2px_4px_rgba(0,0,0,1)]"></div>

              {/* 2. The Button Plunger */}
              <div className={`
                      absolute inset-2 rounded-full flex items-center justify-center transition-all duration-100 border border-t-white/10 border-b-black/40
                      ${isPlaying
                  ? `bg-gradient-to-br from-[#ef4444] to-[#7f1d1d] translate-y-[2px] shadow-[inset_0_5px_10px_rgba(0,0,0,0.5)]` // Active State (Always Red/Start feel)
                  : `bg-gradient-to-br from-[#334155] to-[#0f172a] shadow-[0_5px_10px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)]` // Inactive State
                }
                  `}>

                {/* Inner Glass/LED Glow */}
                <div className={`
                         absolute inset-0 rounded-full transition-all duration-300
                         ${isPlaying ? 'opacity-100 animate-pulse' : 'opacity-0'}
                      `}
                  style={{
                    background: `radial-gradient(circle at center, ${currentTheme.primary} 0%, transparent 70%)`,
                    filter: 'blur(8px)'
                  }}
                ></div>

                {/* Icon */}
                <div className={`
                          relative z-10 transition-all duration-300
                          ${isPlaying ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-slate-500'}
                      `}>
                  {isPlaying ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M5 3L19 12L5 21V3Z" /></svg>
                  )}
                </div>
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* Main Stage (Knob) */}
      <main className="relative z-10 w-full min-h-0 flex flex-col items-center justify-center row-start-2 landscape:row-start-1 landscape:col-start-1 landscape:h-full">

        <div className="flex-1 flex items-center justify-center w-full transform scale-[0.65] xs:scale-[0.8] sm:scale-90 md:scale-100 lg:scale-110 landscape:scale-90 lg:landscape:scale-125 xl:scale-125 transition-transform duration-500 ease-out origin-center">
          <VaultKnob
            bpm={bpm}
            onBpmChange={handleBpmChange}
            currentBeat={currentBeat}
            theme={currentTheme}
          />
        </div>

        {/* LED Visualizer */}
        <div className="shrink-0 flex gap-4 mb-4 md:mb-8 flex-wrap justify-center max-w-xs px-6 h-10 items-center bg-[#131b2d]/50 rounded-full border border-white/5 shadow-inner">
          {[...Array(timeSignature.top)].map((_, i) => (
            <div
              key={i}
              className={`
                   rounded-full transition-all duration-75 relative
                   ${currentBeat === i
                  ? `bg-white w-3 h-3 ${currentTheme.shadow} scale-110`
                  : 'bg-[#0f172a] w-2.5 h-2.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] border border-white/5 opacity-50'
                }
                `}
              style={{ backgroundColor: currentBeat === i ? currentTheme.primary : undefined }}
            >
              {currentBeat === i && <div className="absolute inset-0 bg-white rounded-full opacity-40 animate-ping"></div>}
            </div>
          ))}
        </div>

      </main>

      {/* Timer Modal */}
      {showTimerModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowTimerModal(false)}
        >
          <div
            className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 w-[80%] max-w-[300px] transform scale-100 animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Set Timer</span>
              <button onClick={() => setShowTimerModal(false)} className="text-slate-500 hover:text-slate-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {TIMER_OPTIONS.map(min => (
                <button
                  key={min}
                  onClick={() => setTimerDuration(min)}
                  className={`
                        py-3 text-sm font-bold rounded-xl transition-all border border-transparent
                        ${(timerLimit === min * 60)
                      ? `${currentTheme.bgActive} ${currentTheme.border} ${currentTheme.accentClass}`
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }
                      `}
                >
                  {min}m
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/5">
              <button
                onClick={() => setTimerDuration(null)}
                className={`
                      w-full py-3 text-sm font-bold rounded-xl transition-colors text-center
                      ${timerLimit === null
                    ? 'text-slate-600 cursor-default'
                    : 'text-red-400 hover:bg-red-500/10'
                  }
                    `}
              >
                Stop Timer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;