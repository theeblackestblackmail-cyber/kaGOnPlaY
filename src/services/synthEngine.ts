/**
 * synthEngine.ts
 * Real-time procedural Web Audio synth stems.
 * Generates cyberpunk basslines, ambient chords, and electronic rhythms
 * when offline or when remote streams fail/are blocked by error 150/101.
 */

export interface SynthStem {
  id: string;
  name: string;
  bpm: number;
  rootFreq: number; // Hz
  scale: number[]; // semitone offsets
  description: string;
}

export const SYNTH_STEMS: SynthStem[] = [
  {
    id: 'cyber-resonance',
    name: 'Cyber Resonance',
    bpm: 110,
    rootFreq: 55, // A1
    scale: [0, 3, 7, 10, 12, 15],
    description: 'Deep analog bassline with resonant low-pass sweep and sub-bass weight',
  },
  {
    id: 'neon-drive',
    name: 'Neon Drive',
    bpm: 124,
    rootFreq: 65.41, // C2
    scale: [0, 4, 7, 9, 12, 16],
    description: 'Driving synthwave arpeggio with shimmering detuned sawtooth leads',
  },
  {
    id: 'midnight-drift',
    name: 'Midnight Drift',
    bpm: 85,
    rootFreq: 73.42, // D2
    scale: [0, 2, 5, 7, 9, 12],
    description: 'Chilled lo-fi ambient tape warmth with soft triangle chords',
  },
  {
    id: 'tokyo-drift',
    name: 'Tokyo 2099',
    bpm: 128,
    rootFreq: 49, // G1
    scale: [0, 3, 5, 6, 7, 10],
    description: 'Aggressive electro-industrial bass pulse and punchy filter decay',
  },
];

export class ProceduralSynth {
  private ctx: AudioContext | null = null;
  private outputNode: AudioNode | null = null;
  private intervalId: number | null = null;
  private isPlaying = false;
  private currentStem: SynthStem = SYNTH_STEMS[0];
  private step = 0;

  connect(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.outputNode = destination;
  }

  start(stemId?: string) {
    if (!this.ctx || !this.outputNode) return;
    this.stop();

    if (stemId) {
      const found = SYNTH_STEMS.find((s) => s.id === stemId);
      if (found) this.currentStem = found;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    this.step = 0;

    const stepDurationMs = (60 / this.currentStem.bpm / 2) * 1000; // 16th notes
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, stepDurationMs);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getStem(): SynthStem {
    return this.currentStem;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private tick() {
    if (!this.ctx || !this.outputNode || !this.isPlaying) return;

    const now = this.ctx.currentTime;
    const stem = this.currentStem;
    const stepInBar = this.step % 16;
    this.step++;

    // 1. Kick on 0, 4, 8, 12
    if (stepInBar % 4 === 0) {
      this.triggerKick(now);
    }

    // 2. Snare / Clack on 4, 12
    if (stepInBar === 4 || stepInBar === 12) {
      this.triggerSnare(now);
    }

    // 3. Bassline pattern
    const bassNoteIndex = (this.step * 3) % stem.scale.length;
    const semitone = stem.scale[bassNoteIndex];
    const freq = stem.rootFreq * Math.pow(2, semitone / 12);

    if (stepInBar % 2 === 0 || stepInBar === 7 || stepInBar === 15) {
      this.triggerBass(now, freq, (60 / stem.bpm) * 0.4);
    }

    // 4. Ambient Pad chord on step 0
    if (stepInBar === 0) {
      this.triggerPad(now, stem);
    }
  }

  private triggerKick(time: number) {
    if (!this.ctx || !this.outputNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private triggerSnare(time: number) {
    if (!this.ctx || !this.outputNode) return;
    // White noise buffer
    const bufferSize = this.ctx.sampleRate * 0.15;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.15);
  }

  private triggerBass(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.outputNode) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, time + duration);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerPad(time: number, stem: SynthStem) {
    if (!this.ctx || !this.outputNode) return;
    const chordSemitones = [stem.scale[0], stem.scale[2] || 7, stem.scale[4] || 12];

    for (const semitone of chordSemitones) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      const freq = stem.rootFreq * 2 * Math.pow(2, semitone / 12);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.8);
      gain.gain.linearRampToValueAtTime(0.001, time + 3.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.outputNode);

      osc.start(time);
      osc.stop(time + 3.3);
    }
  }
}
