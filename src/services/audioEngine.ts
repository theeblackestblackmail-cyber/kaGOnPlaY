/**
 * audioEngine.ts
 * Dual-Channel Web Audio Engine (Channel 0 & Channel 1) with seamless crossfade (0s - 12s),
 * 80Hz Low-shelf Bass Boost (0dB to +14dB), 5-Band Biquad Graphic Equalizer,
 * real-time AnalyserNode, MediaSession API integration, and procedural synth fallback.
 */

import { AudioTrack, DualChannelState } from '../types/audio';
import { EQ_FREQUENCIES, EQ_PRESETS } from '../utils/audioPresets';
import { ProceduralSynth } from './synthEngine';

type AudioListener = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private audio0: HTMLAudioElement;
  private audio1: HTMLAudioElement;
  private source0: MediaElementAudioSourceNode | null = null;
  private source1: MediaElementAudioSourceNode | null = null;
  private ch0Gain: GainNode | null = null;
  private ch1Gain: GainNode | null = null;
  private masterBus: GainNode | null = null;
  private bassBoostFilter: BiquadFilterNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private synthEngine: ProceduralSynth;

  // Engine state
  private activeChannel: 0 | 1 = 0;
  private currentTrack: AudioTrack | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private duration = 0;
  private volume = 1.0;
  private crossfadeDuration = 3.0; // 0 to 12s
  private bassBoostEnabled = false;
  private bassBoostGain = 6.0; // 0 to +14dB
  private eqGains: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  private activePresetName = 'Flat';
  private listeners = new Set<AudioListener>();

  constructor() {
    this.audio0 = new Audio();
    this.audio1 = new Audio();
    this.audio0.preload = 'auto';
    this.audio1.preload = 'auto';
    this.audio0.crossOrigin = 'anonymous';
    this.audio1.crossOrigin = 'anonymous';

    this.synthEngine = new ProceduralSynth();
    this.setupAudioListeners();
  }

  private initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // 1. Channel gains
    this.ch0Gain = this.ctx.createGain();
    this.ch1Gain = this.ctx.createGain();
    this.ch0Gain.gain.value = 1.0;
    this.ch1Gain.gain.value = 0.0;

    // 2. Sources
    this.source0 = this.ctx.createMediaElementSource(this.audio0);
    this.source1 = this.ctx.createMediaElementSource(this.audio1);
    this.source0.connect(this.ch0Gain);
    this.source1.connect(this.ch1Gain);

    // 3. Master bus combining both channels & synth
    this.masterBus = this.ctx.createGain();
    this.ch0Gain.connect(this.masterBus);
    this.ch1Gain.connect(this.masterBus);
    this.synthEngine.connect(this.ctx, this.masterBus);

    // 4. 80Hz Low-shelf Bass Boost filter
    this.bassBoostFilter = this.ctx.createBiquadFilter();
    this.bassBoostFilter.type = 'lowshelf';
    this.bassBoostFilter.frequency.value = 80;
    this.bassBoostFilter.gain.value = this.bassBoostEnabled ? this.bassBoostGain : 0;
    this.masterBus.connect(this.bassBoostFilter);

    // 5. 5-Band Biquad Graphic Equalizer: 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz
    this.eqFilters = [];
    let previousNode: AudioNode = this.bassBoostFilter;

    for (let i = 0; i < EQ_FREQUENCIES.length; i++) {
      const freq = EQ_FREQUENCIES[i];
      const filter = this.ctx.createBiquadFilter();
      if (i === 0) {
        filter.type = 'lowshelf';
      } else if (i === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4;
      }
      filter.frequency.value = freq;
      filter.gain.value = this.eqGains[i];

      previousNode.connect(filter);
      previousNode = filter;
      this.eqFilters.push(filter);
    }

    // 6. Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    previousNode.connect(this.masterGain);

    // 7. AnalyserNode
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.85;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  private setupAudioListeners() {
    const handleTimeUpdate = (el: HTMLAudioElement, channel: 0 | 1) => {
      if (channel === this.activeChannel && !this.synthEngine.getIsPlaying()) {
        this.currentTime = el.currentTime;
        this.duration = el.duration || this.currentTrack?.duration || 0;
        this.notify();
      }
    };

    const handleEnded = (channel: 0 | 1) => {
      if (channel === this.activeChannel) {
        this.isPlaying = false;
        this.notify();
      }
    };

    this.audio0.addEventListener('timeupdate', () => handleTimeUpdate(this.audio0, 0));
    this.audio1.addEventListener('timeupdate', () => handleTimeUpdate(this.audio1, 1));
    this.audio0.addEventListener('ended', () => handleEnded(0));
    this.audio1.addEventListener('ended', () => handleEnded(1));

    // Handle synth clock timer for currentTime & duration
    setInterval(() => {
      if (this.synthEngine.getIsPlaying()) {
        this.currentTime = (this.currentTime + 0.1) % 180;
        this.duration = 180;
        this.notify();
      }
    }, 100);
  }

  // --- Track Playback & Dual Channel Switching ---
  async playTrack(track: AudioTrack, options?: { forceRestart?: boolean }) {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const previousTrack = this.currentTrack;
    this.currentTrack = track;
    this.isPlaying = true;

    // Check if procedural synth stem
    if (track.sourceType === 'synth' || !track.streamUrl) {
      this.audio0.pause();
      this.audio1.pause();
      this.synthEngine.start(track.synthPreset || 'cyber-resonance');
      this.currentTime = 0;
      this.duration = track.duration || 180;
      this.updateMediaSession(track);
      this.notify();
      return;
    }

    // Stop synth if it was playing
    this.synthEngine.stop();

    // Toggle active channel between 0 and 1 for gapless/crossfade handoff
    const nextChannel: 0 | 1 = this.activeChannel === 0 ? 1 : 0;
    const activeAudio = nextChannel === 0 ? this.audio0 : this.audio1;
    const standbyAudio = nextChannel === 0 ? this.audio1 : this.audio0;

    // Set source on next channel
    activeAudio.src = track.streamUrl;
    activeAudio.currentTime = 0;

    const crossfade = previousTrack && !options?.forceRestart ? this.crossfadeDuration : 0;

    if (this.ctx && this.ch0Gain && this.ch1Gain && crossfade > 0) {
      const now = this.ctx.currentTime;
      const activeGain = nextChannel === 0 ? this.ch0Gain : this.ch1Gain;
      const standbyGain = nextChannel === 0 ? this.ch1Gain : this.ch0Gain;

      // Crossfade: active channel ramps 0 -> 1, standby ramps 1 -> 0
      activeGain.gain.setValueAtTime(0.001, now);
      activeGain.gain.linearRampToValueAtTime(1.0, now + crossfade);

      standbyGain.gain.setValueAtTime(1.0, now);
      standbyGain.gain.linearRampToValueAtTime(0.001, now + crossfade);

      try {
        await activeAudio.play();
      } catch (err) {
        console.warn('Playback error:', err);
      }

      setTimeout(() => {
        standbyAudio.pause();
        standbyAudio.currentTime = 0;
        // Always reset active channel gain to 1.0 and standby to 0.0 on completion so sound never mutes
        if (activeGain && standbyGain) {
          activeGain.gain.value = 1.0;
          standbyGain.gain.value = 0.0;
        }
      }, crossfade * 1000);
    } else {
      // Immediate clean cut (crossfade 0s or fresh start)
      if (this.ch0Gain && this.ch1Gain) {
        if (nextChannel === 0) {
          this.ch0Gain.gain.value = 1.0;
          this.ch1Gain.gain.value = 0.0;
        } else {
          this.ch0Gain.gain.value = 0.0;
          this.ch1Gain.gain.value = 1.0;
        }
      }
      standbyAudio.pause();
      standbyAudio.currentTime = 0;

      try {
        await activeAudio.play();
      } catch (err) {
        console.warn('Playback error:', err);
      }
    }

    this.activeChannel = nextChannel;
    this.updateMediaSession(track);
    this.notify();
  }

  togglePlayPause() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.synthEngine.getIsPlaying()) {
      this.synthEngine.stop();
      this.isPlaying = false;
      this.notify();
      return;
    }

    if (this.currentTrack?.sourceType === 'synth') {
      this.synthEngine.start(this.currentTrack.synthPreset);
      this.isPlaying = true;
      this.notify();
      return;
    }

    const currentAudio = this.activeChannel === 0 ? this.audio0 : this.audio1;

    if (this.isPlaying) {
      currentAudio.pause();
      this.isPlaying = false;
    } else {
      currentAudio.play().catch((err) => console.warn('Play error:', err));
      this.isPlaying = true;
    }

    this.notify();
  }

  seek(seconds: number) {
    if (this.synthEngine.getIsPlaying()) {
      this.currentTime = Math.max(0, Math.min(seconds, 180));
      this.notify();
      return;
    }

    const currentAudio = this.activeChannel === 0 ? this.audio0 : this.audio1;
    currentAudio.currentTime = Math.max(0, Math.min(seconds, currentAudio.duration || 0));
    this.currentTime = currentAudio.currentTime;
    this.notify();
  }

  skipTime(deltaSeconds: number) {
    this.seek(this.currentTime + deltaSeconds);
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
    this.notify();
  }

  setCrossfadeDuration(seconds: number) {
    this.crossfadeDuration = Math.max(0, Math.min(12, seconds));
    this.notify();
  }

  // --- Bass Boost (80Hz Low-shelf, 0 to +14dB) ---
  setBassBoost(enabled: boolean, gainDb?: number) {
    this.bassBoostEnabled = enabled;
    if (typeof gainDb === 'number') {
      this.bassBoostGain = Math.max(0, Math.min(14, gainDb));
    }
    if (this.bassBoostFilter) {
      this.bassBoostFilter.gain.value = this.bassBoostEnabled ? this.bassBoostGain : 0;
    }
    this.notify();
  }

  // --- 5-Band Graphic Equalizer ---
  setEqGain(bandIndex: number, gainDb: number) {
    if (bandIndex >= 0 && bandIndex < 5) {
      const clampedGain = Math.max(-12, Math.min(12, gainDb));
      this.eqGains[bandIndex] = clampedGain;
      if (this.eqFilters[bandIndex]) {
        this.eqFilters[bandIndex].gain.value = clampedGain;
      }
      this.activePresetName = 'Custom';
      this.notify();
    }
  }

  setEqPreset(presetName: string) {
    const preset = EQ_PRESETS.find((p) => p.name.toLowerCase() === presetName.toLowerCase());
    if (preset) {
      this.activePresetName = preset.name;
      this.eqGains = [...preset.gains] as [number, number, number, number, number];
      for (let i = 0; i < this.eqFilters.length; i++) {
        this.eqFilters[i].gain.value = this.eqGains[i];
      }
      this.notify();
    }
  }

  // --- Visualizer Analyser Data ---
  getFrequencyData(targetArray: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(targetArray as any);
    } else {
      targetArray.fill(0);
    }
  }

  getWaveformData(targetArray: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(targetArray as any);
    } else {
      targetArray.fill(128);
    }
  }

  // --- MediaSession API ---
  private updateMediaSession(track: AudioTrack) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [
          { src: track.coverArt || '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: track.coverArt || '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('seekbackward', () => this.skipTime(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => this.skipTime(10));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) this.seek(details.seekTime);
      });
    }
  }

  // --- Subscriptions & Getters ---
  subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  getState() {
    return {
      activeChannel: this.activeChannel,
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      crossfadeDuration: this.crossfadeDuration,
      bassBoostEnabled: this.bassBoostEnabled,
      bassBoostGain: this.bassBoostGain,
      eqGains: this.eqGains,
      activePresetName: this.activePresetName,
      isSynth: this.synthEngine.getIsPlaying(),
      sampleRate: this.ctx ? this.ctx.sampleRate : 48000,
    };
  }
}

export const audioEngine = new AudioEngine();
