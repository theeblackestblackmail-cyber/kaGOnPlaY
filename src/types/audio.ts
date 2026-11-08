/**
 * audio.ts
 * Core types for kaGO.PIaY audio engine, tracks, playlists, lyrics, and collaborative queue.
 */

export type AudioSourceType = 'local' | 'youtube' | 'synth';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  durationFormatted: string;
  sourceType: AudioSourceType;
  streamUrl?: string; // blob url or remote stream url
  youtubeId?: string;
  fileBlob?: Blob;
  coverArt?: string;
  folderPath?: string;
  lrcLyrics?: string;
  addedAt: number;
  favorite: boolean;
  synthPreset?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  createdAt: number;
  isCollaborative?: boolean;
}

export interface PlayHistoryItem {
  id: string;
  trackId: string;
  playedAt: number;
}

export interface DualChannelState {
  activeChannel: 0 | 1;
  ch0Gain: number;
  ch1Gain: number;
  crossfadeDuration: number; // in seconds (0 to 12s)
  bassBoostEnabled: boolean;
  bassBoostGain: number; // 0 to 14 dB
  eqGains: [number, number, number, number, number]; // 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz
  activePresetName: string;
}
