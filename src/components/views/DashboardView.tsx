import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  FolderOpen,
  Music,
  Sliders,
  Radio,
  Zap,
  Disc3,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { VisualizerCanvas } from '../VisualizerCanvas';
import { Turntable } from '../Turntable';
import { audioEngine } from '../../services/audioEngine';
import { AudioTrack } from '../../types/audio';
import { getAllTracks } from '../../db/audioDb';
import { SYNTH_STEMS } from '../../services/synthEngine';

interface DashboardViewProps {
  onPlayTrack: (track: AudioTrack) => void;
  onPickSong: () => void;
  onPickFolder: () => void;
  onOpenEqualizer: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onPlayTrack,
  onPickSong,
  onPickFolder,
  onOpenEqualizer,
  onNavigateTab,
}) => {
  const [engineState, setEngineState] = useState(audioEngine.getState());
  const [libraryTracks, setLibraryTracks] = useState<AudioTrack[]>([]);

  useEffect(() => {
    const update = () => setEngineState(audioEngine.getState());
    const unsub = audioEngine.subscribe(update);
    getAllTracks().then(setLibraryTracks);
    return unsub;
  }, []);

  const handleQuickPlay = () => {
    if (engineState.currentTrack) {
      audioEngine.togglePlayPause();
    } else if (libraryTracks.length > 0) {
      onPlayTrack(libraryTracks[0]);
    } else {
      // Default procedural synth track
      const defaultStem = SYNTH_STEMS[0];
      const defaultTrack: AudioTrack = {
        id: 'stem-resonance',
        title: defaultStem.name,
        artist: 'kaGO Soundworks',
        album: 'Cyber Stems (Offline)',
        duration: 180,
        durationFormatted: '3:00',
        sourceType: 'synth',
        synthPreset: defaultStem.id,
        addedAt: Date.now(),
        favorite: true,
      };
      onPlayTrack(defaultTrack);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Hero Visualizer Deck */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141418] to-[#0c0c0e] border border-[#22222a] p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff3e3e] shadow-[0_0_10px_#ff3e3e] animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#ff3e3e] font-bold">
                DUAL-ENGINE DSP // CHANNEL {engineState.activeChannel}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#f2efeb] font-display">
              kaGO.PIaY Workstation
            </h1>
            <p className="text-xs text-[#f2efeb]/60 font-sans mt-0.5">
              100% Offline Audio Architecture & Free Music Streaming Streamer
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickPlay}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff3e3e] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_16px_rgba(255,62,62,0.5)] hover:bg-[#e03030] transition active:scale-95"
            >
              {engineState.isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Engine</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Quick Play</span>
                </>
              )}
            </button>
            <button
              onClick={onOpenEqualizer}
              className="p-2.5 rounded-xl bg-[#181820] border border-[#22222a] text-[#ff3e3e] hover:border-[#ff3e3e]/40 transition"
              aria-label="DSP Equalizer Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time 60fps Canvas Spectrum Visualizer */}
        <div className="p-3 bg-[#000000]/70 rounded-xl border border-[#22222a]">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#f2efeb]/50 mb-2">
            <span>SPECTRUM ANALYZER (60Hz - 14kHz)</span>
            <span className="text-[#ff3e3e]">
              {engineState.activePresetName.toUpperCase()} · BASS BOOST{' '}
              {engineState.bassBoostEnabled ? `+${engineState.bassBoostGain}dB` : 'OFF'}
            </span>
          </div>
          <VisualizerCanvas mode="bars" height={90} />
        </div>

        {/* Quick Action Dock */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <button
            onClick={onPickSong}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-[#ff3e3e]/50 hover:bg-[#1b1b22] transition text-left group"
          >
            <div className="p-2 rounded-lg bg-[#ff3e3e]/10 text-[#ff3e3e] group-hover:bg-[#ff3e3e] group-hover:text-white transition">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#f2efeb]">+ PICK SONG</p>
              <p className="text-[10px] font-mono text-[#f2efeb]/50">Audio Blob</p>
            </div>
          </button>

          <button
            onClick={onPickFolder}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-[#ff3e3e]/50 hover:bg-[#1b1b22] transition text-left group"
          >
            <div className="p-2 rounded-lg bg-[#f43f5e]/10 text-[#f43f5e] group-hover:bg-[#f43f5e] group-hover:text-white transition">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#f2efeb]">+ PICK FOLDER</p>
              <p className="text-[10px] font-mono text-[#f2efeb]/50">ID3 Auto-Scan</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('stream')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-[#ff3e3e]/50 hover:bg-[#1b1b22] transition text-left group"
          >
            <div className="p-2 rounded-lg bg-[#ff3e3e]/10 text-[#ff3e3e] group-hover:bg-[#ff3e3e] group-hover:text-white transition">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#f2efeb]">FREE STREAM</p>
              <p className="text-[10px] font-mono text-[#f2efeb]/50">Zero-Signup</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('lyrics')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-[#141418] border border-[#22222a] hover:border-[#ff3e3e]/50 hover:bg-[#1b1b22] transition text-left group"
          >
            <div className="p-2 rounded-lg bg-[#f43f5e]/10 text-[#f43f5e] group-hover:bg-[#f43f5e] group-hover:text-white transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#f2efeb]">SYNC LYRICS</p>
              <p className="text-[10px] font-mono text-[#f2efeb]/50">LRC Calibrator</p>
            </div>
          </button>
        </div>
      </div>

      {/* Hardware Audio Engine Telemetry & Turntable Deck Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Turntable Deck */}
        <div className="lg:col-span-2">
          <Turntable
            isPlaying={engineState.isPlaying}
            title={engineState.currentTrack?.title || 'kaGO.PIaY Engine'}
            artist={engineState.currentTrack?.artist || 'Ready for Playback'}
            coverArt={engineState.currentTrack?.coverArt}
            onTogglePlay={handleQuickPlay}
            size="md"
          />
        </div>

        {/* Real-time Hardware Metrics Card */}
        <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-[#22222a] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#22222a]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#ff3e3e]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#f2efeb]">
                Audio Engine Status
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#ff3e3e] font-bold">ONLINE</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center py-1 border-b border-[#181820]">
              <span className="text-[#f2efeb]/60">Channels</span>
              <span className="font-bold text-[#f2efeb]">CH 0 & CH 1 (Synced)</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#181820]">
              <span className="text-[#f2efeb]/60">Active Channel</span>
              <span className="font-bold text-[#ff3e3e]">Channel {engineState.activeChannel}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#181820]">
              <span className="text-[#f2efeb]/60">Crossfade Handoff</span>
              <span className="font-bold text-[#f2efeb]">
                {engineState.crossfadeDuration === 0 ? 'Cut (0.0s)' : `${engineState.crossfadeDuration}s Smooth`}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#181820]">
              <span className="text-[#f2efeb]/60">Sample Rate</span>
              <span className="font-bold text-[#f2efeb]">{engineState.sampleRate} Hz</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#181820]">
              <span className="text-[#f2efeb]/60">EQ Preset</span>
              <span className="font-bold text-[#ff3e3e]">{engineState.activePresetName}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[#181820]">
              <span className="text-[#f2efeb]/60">80Hz Bass Boost</span>
              <span className="font-bold text-[#f2efeb]">
                {engineState.bassBoostEnabled ? `+${engineState.bassBoostGain} dB` : 'Bypassed'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-[#f2efeb]/60">IndexedDB Storage</span>
              <span className="font-bold text-[#f2efeb]">{libraryTracks.length} Tracks Stored</span>
            </div>
          </div>

          <button
            onClick={onOpenEqualizer}
            className="w-full mt-2 py-2 rounded-lg bg-[#141418] border border-[#22222a] text-xs font-bold text-[#ff3e3e] hover:border-[#ff3e3e]/40 transition text-center"
          >
            Adjust Equalizer & Filter Sliders
          </button>
        </div>
      </div>

      {/* Procedural Offline Synth Stems Showcase */}
      <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-[#22222a]">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#22222a]">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#f2efeb]">
              Procedural Web Audio Stems (100% Offline)
            </h3>
            <p className="text-[11px] font-mono text-[#f2efeb]/60">
              Hardware synthesizers running directly in your browser without internet
            </p>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#ff3e3e]/15 border border-[#ff3e3e]/30 text-[10px] font-mono text-[#ff3e3e] font-bold">
            ZERO NETWORK REQ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SYNTH_STEMS.map((stem) => {
            const isPlayingThis =
              engineState.isPlaying &&
              engineState.currentTrack?.sourceType === 'synth' &&
              engineState.currentTrack?.synthPreset === stem.id;

            return (
              <div
                key={stem.id}
                onClick={() => {
                  const track: AudioTrack = {
                    id: `stem-${stem.id}`,
                    title: stem.name,
                    artist: 'kaGO Synthesizer',
                    album: 'Procedural Stems',
                    duration: 180,
                    durationFormatted: '3:00',
                    sourceType: 'synth',
                    synthPreset: stem.id,
                    addedAt: Date.now(),
                    favorite: false,
                  };
                  onPlayTrack(track);
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isPlayingThis
                    ? 'bg-[#181820] border-[#ff3e3e] shadow-[0_0_12px_rgba(255,62,62,0.3)]'
                    : 'bg-[#141418] border-[#22222a] hover:border-[#ff3e3e]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-[#ff3e3e] font-bold">
                    {stem.bpm} BPM · {stem.rootFreq}Hz
                  </span>
                  <div
                    className={`p-1.5 rounded-full ${
                      isPlayingThis ? 'bg-[#ff3e3e] text-white' : 'bg-[#0c0c0e] text-[#f2efeb]/50'
                    }`}
                  >
                    {isPlayingThis ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                  </div>
                </div>
                <h4 className="text-xs font-bold text-[#f2efeb]">{stem.name}</h4>
                <p className="text-[10px] text-[#f2efeb]/60 mt-1 line-clamp-2">{stem.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
