import React, { useEffect, useState, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Heart,
  Sliders,
  ListMusic,
  FileText,
  Volume2,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { AudioTrack } from '../types/audio';
import { Turntable } from './Turntable';
import { VisualizerCanvas } from './VisualizerCanvas';
import { parseLrc, getActiveLyricIndex, LrcLine } from '../utils/lrcParser';
import { toggleFavoriteTrack, getLyrics } from '../db/audioDb';

interface FullscreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: AudioTrack[];
  onSelectTrack: (track: AudioTrack) => void;
  onOpenEqualizer: () => void;
  onAutoRecover?: (track: AudioTrack) => void;
}

export const FullscreenPlayer: React.FC<FullscreenPlayerProps> = ({
  isOpen,
  onClose,
  queue,
  onSelectTrack,
  onOpenEqualizer,
  onAutoRecover,
}) => {
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [activeTab, setActiveTab] = useState<'turntable' | 'lyrics' | 'queue'>('turntable');
  const [lrcLines, setLrcLines] = useState<LrcLine[]>([]);
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const update = () => {
      const state = audioEngine.getState();
      setTrack(state.currentTrack);
      setIsPlaying(state.isPlaying);
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
      if (state.currentTrack) {
        setIsFav(state.currentTrack.favorite);
      }
    };

    update();
    return audioEngine.subscribe(update);
  }, []);

  // Fetch or parse lyrics whenever currentTrack changes
  useEffect(() => {
    if (!track) return;
    let isMounted = true;

    async function loadLyrics() {
      let rawLrc = track?.lrcLyrics;
      if (!rawLrc) {
        const stored = await getLyrics(track!.id);
        if (stored) rawLrc = stored;
      }

      if (rawLrc && isMounted) {
        const parsed = parseLrc(rawLrc, calibrationOffset);
        setLrcLines(parsed.lines);
      } else if (isMounted) {
        // Fallback procedural synced lyric lines for visual immersion
        setLrcLines([
          { id: '1', time: 0, text: `▶ Playing: ${track?.title}` },
          { id: '2', time: 8, text: `Artist: ${track?.artist}` },
          { id: '3', time: 16, text: `kaGO.PIaY 100% Offline Audio Architecture` },
          { id: '4', time: 25, text: `Dual-Channel Web Audio Graph Active` },
          { id: '5', time: 40, text: `80Hz Sub-Bass Filter Engaged` },
          { id: '6', time: 60, text: `Rotating Direct-Drive Vinyl Turntable Engine` },
          { id: '7', time: 90, text: `Hardware 5-Band Equalizer DSP Real-time Processing` },
          { id: '8', time: 120, text: `End of track preview` },
        ]);
      }
    }

    loadLyrics();
    return () => {
      isMounted = false;
    };
  }, [track, calibrationOffset]);

  // Auto-scroll lyrics to active line
  const activeLyricIdx = getActiveLyricIndex(lrcLines, currentTime, calibrationOffset);

  useEffect(() => {
    if (activeTab === 'lyrics' && lyricsContainerRef.current && activeLyricIdx >= 0) {
      const activeEl = lyricsContainerRef.current.children[activeLyricIdx] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyricIdx, activeTab]);

  if (!isOpen || !track) return null;

  const handleTogglePlay = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    audioEngine.togglePlayPause();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    audioEngine.seek(time);
  };

  const handleSkip = (delta: number) => {
    if (navigator.vibrate) navigator.vibrate(10);
    audioEngine.skipTime(delta);
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    const currentIdx = queue.findIndex((t) => t.id === track.id);
    const nextIdx = (currentIdx + 1) % queue.length;
    onSelectTrack(queue[nextIdx]);
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    const currentIdx = queue.findIndex((t) => t.id === track.id);
    const prevIdx = (currentIdx - 1 + queue.length) % queue.length;
    onSelectTrack(queue[prevIdx]);
  };

  const handleFavorite = async () => {
    if (!track) return;
    if (navigator.vibrate) navigator.vibrate(15);
    const newFav = await toggleFavoriteTrack(track.id);
    setIsFav(newFav);
    track.favorite = newFav;
  };

  const handleOffsetAdjust = (delta: number) => {
    const newOffset = Math.round((calibrationOffset + delta) * 10) / 10;
    if (newOffset >= -2.0 && newOffset <= 2.0) {
      setCalibrationOffset(newOffset);
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-[#f2efeb] flex flex-col justify-between animate-in slide-in-from-bottom duration-300 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#181820]">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-[#141418] text-[#f2efeb]/70 hover:text-[#f2efeb] transition"
          aria-label="Collapse player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* Tab Controls: Turntable / Lyrics / Queue */}
        <div className="flex items-center p-1 bg-[#0c0c0e] rounded-xl border border-[#22222a]">
          <button
            onClick={() => setActiveTab('turntable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'turntable'
                ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_rgba(255,62,62,0.5)]'
                : 'text-[#f2efeb]/60 hover:text-[#f2efeb]'
            }`}
          >
            Turntable
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'lyrics'
                ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_rgba(255,62,62,0.5)]'
                : 'text-[#f2efeb]/60 hover:text-[#f2efeb]'
            }`}
          >
            Sync Lyrics
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'queue'
                ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_rgba(255,62,62,0.5)]'
                : 'text-[#f2efeb]/60 hover:text-[#f2efeb]'
            }`}
          >
            Queue ({queue.length})
          </button>
        </div>

        <button
          onClick={onOpenEqualizer}
          className="p-2 rounded-full bg-[#141418] border border-[#22222a] text-[#ff3e3e] hover:border-[#ff3e3e]/40 transition"
          aria-label="Open Equalizer DSP"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>

      {/* Main Viewport Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
        {activeTab === 'turntable' && (
          <div className="w-full flex flex-col items-center gap-6">
            <Turntable
              isPlaying={isPlaying}
              coverArt={track.coverArt}
              title={track.title}
              artist={track.artist}
              onTogglePlay={handleTogglePlay}
              size="lg"
            />
            {/* Visualizer Spectrum Bar beneath Turntable */}
            <div className="w-full px-2">
              <VisualizerCanvas mode="bars" height={56} className="bg-[#0c0c0e]/80 border border-[#22222a]" />
            </div>
          </div>
        )}

        {activeTab === 'lyrics' && (
          <div className="w-full flex-1 flex flex-col justify-between max-h-[55vh]">
            {/* Calibration Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c0c0e] border border-[#22222a] mb-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#ff3e3e]" />
                <span className="text-[#f2efeb]/70">LRC Offset:</span>
                <span className="text-[#ff3e3e] font-bold tabular-nums">
                  {calibrationOffset > 0 ? `+${calibrationOffset.toFixed(1)}s` : `${calibrationOffset.toFixed(1)}s`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOffsetAdjust(-0.1)}
                  className="px-2 py-1 rounded bg-[#141418] border border-[#22222a] hover:border-[#ff3e3e] text-xs font-bold"
                >
                  -0.1s
                </button>
                <button
                  onClick={() => setCalibrationOffset(0)}
                  className="px-2 py-1 rounded bg-[#141418] border border-[#22222a] hover:text-[#ff3e3e] text-[11px]"
                >
                  0.0s
                </button>
                <button
                  onClick={() => handleOffsetAdjust(0.1)}
                  className="px-2 py-1 rounded bg-[#141418] border border-[#22222a] hover:border-[#ff3e3e] text-xs font-bold"
                >
                  +0.1s
                </button>
              </div>
            </div>

            {/* Scrolling Synchronized Lyrics List */}
            <div
              ref={lyricsContainerRef}
              className="flex-1 overflow-y-auto space-y-4 text-center py-8 px-4 scroll-smooth"
            >
              {lrcLines.map((line, idx) => {
                const isActive = idx === activeLyricIdx;
                return (
                  <p
                    key={line.id}
                    onClick={() => audioEngine.seek(line.time)}
                    className={`cursor-pointer transition-all duration-300 py-1.5 font-sans leading-relaxed ${
                      isActive
                        ? 'text-lg sm:text-xl font-extrabold lyrics-glow scale-105'
                        : 'text-sm text-[#f2efeb]/40 hover:text-[#f2efeb]/80'
                    }`}
                  >
                    {line.text || '♪'}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="w-full flex-1 max-h-[55vh] flex flex-col bg-[#0c0c0e] border border-[#22222a] rounded-xl p-4 overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f2efeb]/70 pb-2 border-b border-[#22222a] flex items-center justify-between">
              <span>Playback Queue</span>
              <span className="font-mono text-[#ff3e3e]">{queue.length} Tracks</span>
            </h3>
            <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1">
              {queue.map((item, idx) => {
                const isCurrent = item.id === track.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectTrack(item)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                      isCurrent
                        ? 'bg-[#181820] border-[#ff3e3e] shadow-[0_0_10px_rgba(255,62,62,0.3)]'
                        : 'bg-[#141418] border-transparent hover:border-[#22222a]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-[#f2efeb]/40 w-4">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#ff3e3e]' : 'text-[#f2efeb]'}`}>
                          {item.title}
                        </p>
                        <p className="text-[11px] font-mono text-[#f2efeb]/60 truncate">{item.artist}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#f2efeb]/50 shrink-0">
                      {item.durationFormatted}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Track Controls Area */}
      <div className="p-5 bg-[#0c0c0e] border-t border-[#181820] max-w-lg mx-auto w-full">
        {/* Track Title & Favorite */}
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-[#f2efeb] truncate">{track.title}</h2>
            <p className="text-xs font-mono text-[#f2efeb]/60 truncate">
              {track.artist} {track.album ? `— ${track.album}` : ''}
            </p>
          </div>
          <button
            onClick={handleFavorite}
            className={`p-2.5 rounded-full hover:bg-[#141418] transition ${
              isFav ? 'text-[#ff3e3e]' : 'text-[#f2efeb]/40 hover:text-[#f2efeb]'
            }`}
            aria-label="Favorite Track"
          >
            <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Seek Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.5"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-[#22222a] rounded-lg accent-[#ff3e3e] cursor-pointer"
            aria-label="Seek track position"
          />
          <div className="flex justify-between text-[11px] font-mono text-[#f2efeb]/50">
            <span>{formatSec(currentTime)}</span>
            <span>{formatSec(duration)}</span>
          </div>
        </div>

        {/* Primary Hardware Controls (44px+ touch targets) */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => handleSkip(-10)}
            className="p-3 text-[#f2efeb]/70 hover:text-[#f2efeb] rounded-full hover:bg-[#141418] transition"
            aria-label="Rewind 10s"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={handlePrev}
            className="p-3 text-[#f2efeb]/80 hover:text-[#f2efeb] rounded-full hover:bg-[#141418] transition"
            aria-label="Previous track"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <button
            onClick={handleTogglePlay}
            className="p-4 rounded-full bg-[#ff3e3e] text-white hover:bg-[#e03030] shadow-[0_0_20px_rgba(255,62,62,0.6)] transition"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-3 text-[#f2efeb]/80 hover:text-[#f2efeb] rounded-full hover:bg-[#141418] transition"
            aria-label="Next track"
          >
            <SkipForward className="w-6 h-6" />
          </button>

          <button
            onClick={() => handleSkip(10)}
            className="p-3 text-[#f2efeb]/70 hover:text-[#f2efeb] rounded-full hover:bg-[#141418] transition"
            aria-label="Forward 10s"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
