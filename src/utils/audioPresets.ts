/**
 * audioPresets.ts
 * 5-Band Biquad Graphic Equalizer (60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz)
 * 12 Hardware Presets (-12dB to +12dB) & Bass Boost parameters.
 */

export interface EqPreset {
  name: string;
  description: string;
  gains: [number, number, number, number, number]; // 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz
}

export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000] as const;

export const EQ_PRESETS: EqPreset[] = [
  {
    name: 'Flat',
    description: 'Neutral frequency response across all bands',
    gains: [0, 0, 0, 0, 0],
  },
  {
    name: 'Bass',
    description: 'Warm low-end enhancement for punchy beats',
    gains: [6, 4, 0, 0, -1],
  },
  {
    name: 'Heavy Bass',
    description: 'Sub-bass emphasis for club and electronic music',
    gains: [10, 7, 1, -1, -2],
  },
  {
    name: 'Rock',
    description: 'Aggressive low and high shelf with scooped mids',
    gains: [5, 3, -1, 3, 5],
  },
  {
    name: 'Pop',
    description: 'Crisp vocal midrange with controlled dynamics',
    gains: [-1, 2, 5, 2, -2],
  },
  {
    name: 'Classical',
    description: 'Natural acoustic spectrum with refined air',
    gains: [4, 2, -2, 2, 4],
  },
  {
    name: 'Jazz',
    description: 'Smooth brass highs and textured acoustic bass',
    gains: [3, 2, -1, 2, 3],
  },
  {
    name: 'Electronic',
    description: 'Deep kicks and sizzling synth leads',
    gains: [6, 4, -1, 3, 5],
  },
  {
    name: 'Hip-Hop',
    description: 'Heavy 808 subs and articulate vocal presence',
    gains: [7, 5, 0, 2, 3],
  },
  {
    name: 'Vocal Boost',
    description: 'Enhanced vocal clarity and dialog intelligibility',
    gains: [-2, 0, 6, 4, 1],
  },
  {
    name: 'Acoustic',
    description: 'Open soundstage for guitar and acoustic strings',
    gains: [4, 2, 1, 3, 3],
  },
  {
    name: 'Treble Boost',
    description: 'Bright harmonic extension and high-frequency sparkle',
    gains: [-2, -1, 1, 5, 8],
  },
];
