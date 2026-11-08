import React, { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface TurntableProps {
  isPlaying: boolean;
  coverArt?: string;
  title?: string;
  artist?: string;
  onTogglePlay: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const Turntable: React.FC<TurntableProps> = ({
  isPlaying,
  coverArt,
  title = 'kaGO.PIaY Engine',
  artist = 'Vinyl Turntable',
  onTogglePlay,
  size = 'md',
}) => {
  const [rpm, setRpm] = useState<'33' | '45'>('33');

  const dimensions = {
    sm: 'w-48 h-48',
    md: 'w-64 h-64 sm:w-72 sm:h-72',
    lg: 'w-72 h-72 sm:w-88 sm:h-88',
  }[size];

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-[#0c0c0e] border border-[#22222a] rounded-2xl shadow-2xl">
      {/* Hardware Deck Top Bar */}
      <div className="w-full flex items-center justify-between mb-3 px-2 text-[10px] font-mono uppercase tracking-wider text-[#f2efeb]/50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff3e3e] shadow-[0_0_8px_#ff3e3e]" />
          <span>PRO-DIRECT DRIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRpm(rpm === '33' ? '45' : '33')}
            className="px-2 py-0.5 rounded bg-[#141418] border border-[#22222a] text-[#f2efeb] hover:border-[#ff3e3e]/40 transition"
          >
            {rpm} RPM
          </button>
          <span>QUARTZ LOCK</span>
        </div>
      </div>

      {/* Turntable Platter & Arm Container */}
      <div className="relative flex items-center justify-center">
        {/* Platter Base */}
        <div
          onClick={onTogglePlay}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') onTogglePlay();
          }}
          className={`relative ${dimensions} rounded-full bg-gradient-to-br from-[#121217] via-[#09090b] to-[#040405] border-[6px] border-[#22222a] shadow-[inset_0_0_40px_rgba(0,0,0,0.9),0_12px_24px_rgba(0,0,0,0.8)] cursor-pointer group flex items-center justify-center overflow-hidden`}
        >
          {/* Vinyl Grooves (spinning container) */}
          <div
            className={`absolute inset-0 rounded-full flex items-center justify-center transition-transform duration-700 ${
              isPlaying ? 'turntable-rotate' : 'turntable-paused'
            }`}
          >
            {/* Grooves Rings */}
            <div className="absolute inset-4 rounded-full border border-[#2a2a38]/40" />
            <div className="absolute inset-8 rounded-full border border-[#222230]/50" />
            <div className="absolute inset-12 rounded-full border border-[#2a2a38]/30" />
            <div className="absolute inset-16 rounded-full border border-[#1f1f28]/60" />
            <div className="absolute inset-20 rounded-full border border-[#2a2a38]/20" />

            {/* Vinyl Sheen Overlay */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.08)_0%,transparent_60%)] pointer-events-none" />

            {/* Center Label */}
            <div className="relative w-24 h-24 rounded-full bg-[#181820] border-4 border-[#ff3e3e]/70 shadow-[0_0_15px_rgba(255,62,62,0.4)] flex flex-col items-center justify-center overflow-hidden text-center p-2">
              {coverArt ? (
                <img
                  src={coverArt}
                  alt={title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <>
                  <Disc3 className="w-6 h-6 text-[#ff3e3e] mb-1" />
                  <span className="text-[9px] font-bold text-[#f2efeb] truncate max-w-[80px]">
                    {title}
                  </span>
                  <span className="text-[8px] font-mono text-[#f2efeb]/60 truncate max-w-[80px]">
                    {artist}
                  </span>
                </>
              )}

              {/* Spindle hole */}
              <div className="absolute w-4 h-4 rounded-full bg-[#000000] border-2 border-[#f2efeb]/80 shadow-inner z-10" />
            </div>
          </div>
        </div>

        {/* Realistic Tonearm Overlay */}
        <div
          className={`absolute -top-4 -right-4 w-16 h-48 pointer-events-none transition-transform duration-500 origin-top-right ${
            isPlaying ? 'rotate-[20deg]' : 'rotate-0'
          }`}
        >
          {/* Tonearm Pivot */}
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#2a2a35] border-2 border-[#ff3e3e]/60 shadow-lg" />
          {/* Arm Rod */}
          <div className="absolute top-5 right-5 w-1.5 h-36 bg-gradient-to-b from-[#888898] to-[#444450] shadow-md origin-top transform rotate-12" />
          {/* Cartridge & Stylus */}
          <div className="absolute bottom-8 right-12 w-4 h-7 bg-[#ff3e3e] rounded-sm shadow-[0_0_8px_rgba(255,62,62,0.8)]" />
        </div>
      </div>

      {/* Platter Control Indicator */}
      <div className="mt-3 flex items-center justify-between w-full px-3 text-[11px] font-mono">
        <span className="text-[#f2efeb]/70">MOTOR: {isPlaying ? 'RUNNING' : 'STANDBY'}</span>
        <span className="text-[#ff3e3e]">STATUS: {isPlaying ? 'ACTIVE STYLUS' : 'LIFTED'}</span>
      </div>
    </div>
  );
};
