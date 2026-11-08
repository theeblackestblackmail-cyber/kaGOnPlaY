import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, RotateCw, Heart, Maximize2, Radio } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { AudioTrack } from '../types/audio';
import { toggleFavoriteTrack } from '../db/audioDb';

interface MiniPlayerProps {
  onOpenFullscreen: () => void;
  onNextTrack?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onOpenFullscreen, onNextTrack }) => {
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFav, setIsFav] = useState(false);

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

  if (!track) return null;

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(10);
    audioEngine.togglePlayPause();
  };

  const handleSkip = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(10);
    audioEngine.skipTime(delta);
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track) return;
    if (navigator.vibrate) navigator.vibrate(15);
    const newFav = await toggleFavoriteTrack(track.id);
    setIsFav(newFav);
    track.favorite = newFav;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onClick={onOpenFullscreen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') onOpenFullscreen();
      }}
      className="fixed bottom-[68px] left-2 right-2 md:left-6 md:right-6 max-w-4xl mx-auto z-40 bg-[#141418]/95 backdrop-blur-xl border border-[#22222a] hover:border-[#ff3e3e]/40 rounded-xl shadow-2xl transition-all cursor-pointer overflow-hidden group"
      aria-label={`Mini Player: ${track.title} by ${track.artist}`}
    >
      {/* Top Seek Progress Line */}
      <div className="w-full h-1 bg-[#22222a]">
        <div
          className="h-full bg-gradient-to-r from-[#ff3e3e] to-[#f43f5e] transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between p-3 gap-3">
        {/* Track Artwork / Vinyl Icon */}
        <div className="relative w-11 h-11 rounded-lg bg-[#0c0c0e] border border-[#22222a] overflow-hidden shrink-0 flex items-center justify-center">
          {track.coverArt ? (
            <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <Radio className={`w-5 h-5 ${isPlaying ? 'text-[#ff3e3e] animate-pulse' : 'text-[#f2efeb]/40'}`} />
          )}
          {isPlaying && (
            <div className="absolute inset-0 bg-[#ff3e3e]/10 pointer-events-none" />
          )}
        </div>

        {/* Track Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs sm:text-sm font-bold text-[#f2efeb] truncate">
              {track.title}
            </h4>
            {track.sourceType === 'synth' && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#ff3e3e]/20 text-[#ff3e3e] shrink-0 font-semibold">
                SYNTH
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-[#f2efeb]/60 truncate">
            {track.artist} · <span className="tabular-nums">{formatSec(currentTime)} / {formatSec(duration)}</span>
          </p>
        </div>

        {/* Quick Action Controls (44px touch targets) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={handleFavorite}
            className={`p-2.5 rounded-full hover:bg-[#1b1b22] transition ${
              isFav ? 'text-[#ff3e3e]' : 'text-[#f2efeb]/40 hover:text-[#f2efeb]'
            }`}
            aria-label="Toggle favorite"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={(e) => handleSkip(e, -10)}
            className="hidden sm:flex p-2.5 text-[#f2efeb]/70 hover:text-[#f2efeb] hover:bg-[#1b1b22] rounded-full transition"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleTogglePlay}
            className="p-2.5 rounded-full bg-[#ff3e3e] text-white hover:bg-[#e03030] shadow-[0_0_12px_rgba(255,62,62,0.5)] transition"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={(e) => handleSkip(e, 10)}
            className="hidden sm:flex p-2.5 text-[#f2efeb]/70 hover:text-[#f2efeb] hover:bg-[#1b1b22] rounded-full transition"
            aria-label="Forward 10 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {onNextTrack && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (navigator.vibrate) navigator.vibrate(10);
                onNextTrack();
              }}
              className="p-2.5 text-[#f2efeb]/70 hover:text-[#f2efeb] hover:bg-[#1b1b22] rounded-full transition"
              aria-label="Skip to next track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenFullscreen}
            className="p-2.5 text-[#f2efeb]/50 hover:text-[#f2efeb] hover:bg-[#1b1b22] rounded-full transition"
            aria-label="Expand player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
