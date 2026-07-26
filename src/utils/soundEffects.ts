// Web Audio API Sound Effects Utility for StudyBook UI
// Synthesizes zero-delay, crisp interactive sound effects without external audio files.

export type SoundType = 
  | 'click' 
  | 'pop' 
  | 'like' 
  | 'send' 
  | 'delete' 
  | 'success' 
  | 'openModal' 
  | 'closeModal' 
  | 'toggle' 
  | 'notification' 
  | 'tab' 
  | 'streak';

let audioCtx: AudioContext | null = null;
let cachedEnabled: boolean | null = null;
let cachedVolume: number | null = null;

/**
 * Gets or creates the global AudioContext singleton
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Reads current sound settings from localStorage or cache
 */
export function getSoundSettings(): { soundEnabled: boolean; soundVolume: number } {
  try {
    const raw = localStorage.getItem('sb_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      const enabled = parsed.soundEnabled !== false; // default true
      const volume = typeof parsed.soundVolume === 'number' ? parsed.soundVolume : 0.7;
      cachedEnabled = enabled;
      cachedVolume = volume;
      return { soundEnabled: enabled, soundVolume: volume };
    }
  } catch (_) {}

  return { 
    soundEnabled: cachedEnabled ?? true, 
    soundVolume: cachedVolume ?? 0.7 
  };
}

/**
 * Play a specific UI sound effect
 */
export function playSound(type: SoundType, customVolume?: number) {
  const { soundEnabled, soundVolume } = getSoundSettings();
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const masterVol = Math.max(0, Math.min(1, customVolume ?? soundVolume));
  if (masterVol === 0) return;

  const now = ctx.currentTime;

  try {
    switch (type) {
      case 'click': {
        // Crisp pop click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        
        gain.gain.setValueAtTime(masterVol * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      case 'pop': {
        // High quick bubble pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.03);

        gain.gain.setValueAtTime(masterVol * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
        break;
      }

      case 'tab': {
        // Soft navigation tap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.035);

        gain.gain.setValueAtTime(masterVol * 0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
        break;
      }

      case 'like': {
        // Uplifting double chime
        const notes = [523.25, 783.99]; // C5, G5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.05;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(masterVol * 0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.1);
        });
        break;
      }

      case 'send': {
        // Smooth upward swoop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

        gain.gain.setValueAtTime(masterVol * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'delete': {
        // Low soft decline tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.11);

        gain.gain.setValueAtTime(masterVol * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.11);
        break;
      }

      case 'success': {
        // Celebratory major chord arpeggio
        const arpeggio = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        arpeggio.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.045;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(masterVol * 0.28, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.14);
        });
        break;
      }

      case 'toggle': {
        // Dual tick sound
        [400, 650].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.03;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(masterVol * 0.22, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.035);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.035);
        });
        break;
      }

      case 'openModal': {
        // Soft bubble swell
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.07);

        gain.gain.setValueAtTime(masterVol * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }

      case 'closeModal': {
        // Soft bubble decline
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(720, now);
        osc.frequency.exponentialRampToValueAtTime(360, now + 0.07);

        gain.gain.setValueAtTime(masterVol * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }

      case 'notification': {
        // Pleasant bell notification
        [880, 1174.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.06;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(masterVol * 0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.15);
        });
        break;
      }

      case 'streak': {
        // High energetic reward chime
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5 -> E6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.04;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(masterVol * 0.32, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.16);
        });
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.warn('AudioContext playback error:', e);
  }
}
