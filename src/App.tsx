/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Radio,
  Library,
  FolderSearch,
  FileText,
  Sliders,
  Volume2,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { PWAInstallButton } from './components/PWAInstallButton';
import { MiniPlayer } from './components/MiniPlayer';
import { FullscreenPlayer } from './components/FullscreenPlayer';
import { EqualizerModal } from './components/EqualizerModal';
import { DashboardView } from './components/views/DashboardView';
import { StreamView } from './components/views/StreamView';
import { LibraryView } from './components/views/LibraryView';
import { ScannerView } from './components/views/ScannerView';
import { LyricsView } from './components/views/LyricsView';
import { audioEngine } from './services/audioEngine';
import { AudioTrack } from './types/audio';
import { getAllTracks, saveTrack } from './db/audioDb';
import { sanitizeFilename } from './utils/filenameSanitizer';
import { parseId3Tags } from './utils/id3Parser';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { SYNTH_STEMS } from './services/synthEngine';

type NavTab = 'dashboard' | 'stream' | 'library' | 'scanner' | 'lyrics';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);

  const isOnline = useOnlineStatus();
  const filePickerRef = useRef<HTMLInputElement | null>(null);

  // Initialize library and seed default tracks if empty
  useEffect(() => {
    async function initLibrary() {
      const existing = await getAllTracks();
      if (existing.length === 0) {
        // Seed default procedural synth stems
        const seedTracks: AudioTrack[] = SYNTH_STEMS.map((stem, idx) => ({
          id: `seed-${stem.id}`,
          title: stem.name,
          artist: 'kaGO Soundworks',
          album: 'Cyber Stems (Offline)',
          duration: 180,
          durationFormatted: '3:00',
          sourceType: 'synth',
          synthPreset: stem.id,
          addedAt: Date.now() - idx * 1000,
          favorite: idx === 0,
        }));
        for (const t of seedTracks) {
          await saveTrack(t);
        }
        setQueue(seedTracks);
      } else {
        setQueue(existing);
      }
    }
    initLibrary();
  }, []);

  const handlePlayTrack = (track: AudioTrack) => {
    // Add to queue if not present
    setQueue((prev) => {
      if (!prev.some((t) => t.id === track.id)) {
        return [track, ...prev];
      }
      return prev;
    });
    audioEngine.playTrack(track);
  };

  const handleAddToQueue = (track: AudioTrack) => {
    setQueue((prev) => {
      if (!prev.some((t) => t.id === track.id)) {
        return [...prev, track];
      }
      return prev;
    });
  };

  const handleNextTrack = () => {
    if (queue.length === 0) return;
    const currentTrack = audioEngine.getState().currentTrack;
    if (!currentTrack) {
      handlePlayTrack(queue[0]);
      return;
    }
    const currentIdx = queue.findIndex((t) => t.id === currentTrack.id);
    const nextIdx = (currentIdx + 1) % queue.length;
    handlePlayTrack(queue[nextIdx]);
  };

  const handlePickSong = () => {
    filePickerRef.current?.click();
  };

  const handlePickFolder = () => {
    setActiveTab('scanner');
  };

  // Handle individual picked file
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sanitized = sanitizeFilename(file.name);
    const id3 = await parseId3Tags(file);

    const title = id3.title || sanitized.title;
    const artist = id3.artist || sanitized.artist;
    const album = id3.album || sanitized.album;
    const url = URL.createObjectURL(file);

    const track: AudioTrack = {
      id: `local-file-${Date.now()}`,
      title,
      artist,
      album,
      duration: 180,
      durationFormatted: '3:00',
      sourceType: 'local',
      streamUrl: url,
      fileBlob: file,
      addedAt: Date.now(),
      favorite: false,
    };

    await saveTrack(track);
    handlePlayTrack(track);
  };

  const handleTabChange = (tab: NavTab) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f2efeb] flex flex-col font-sans selection:bg-[#ff3e3e] selection:text-white">
      {/* Hidden File Picker */}
      <input
        type="file"
        ref={filePickerRef}
        onChange={handleFilePicked}
        accept="audio/*"
        className="hidden"
      />

      {/* Offline Status Pill */}
      {!isOnline && (
        <div className="bg-[#141418] border-b border-[#22222a] px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-mono text-[#ff3e3e]">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode: 100% Offline Audio Engine & Procedural Stems Active</span>
        </div>
      )}

      {/* Top Bar Contract (Brand, Nav links, 1 Primary Action) */}
      <header className="sticky top-0 z-40 bg-[#000000]/90 backdrop-blur-md border-b border-[#181820] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
        {/* Brand Zone */}
        <div
          onClick={() => handleTabChange('dashboard')}
          className="flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff3e3e] shadow-[0_0_8px_#ff3e3e]" />
          <span className="text-lg font-black tracking-wider text-[#f2efeb] font-display whitespace-nowrap">
            kaGO<span className="text-[#ff3e3e]">.</span>PIaY
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#f2efeb]/70">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`whitespace-nowrap transition hover:text-[#f2efeb] ${
              activeTab === 'dashboard' ? 'text-[#ff3e3e] font-bold' : ''
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleTabChange('stream')}
            className={`whitespace-nowrap transition hover:text-[#f2efeb] ${
              activeTab === 'stream' ? 'text-[#ff3e3e] font-bold' : ''
            }`}
          >
            Stream
          </button>
          <button
            onClick={() => handleTabChange('library')}
            className={`whitespace-nowrap transition hover:text-[#f2efeb] ${
              activeTab === 'library' ? 'text-[#ff3e3e] font-bold' : ''
            }`}
          >
            Library
          </button>
          <button
            onClick={() => handleTabChange('scanner')}
            className={`whitespace-nowrap transition hover:text-[#f2efeb] ${
              activeTab === 'scanner' ? 'text-[#ff3e3e] font-bold' : ''
            }`}
          >
            Folder Scanner
          </button>
          <button
            onClick={() => handleTabChange('lyrics')}
            className={`whitespace-nowrap transition hover:text-[#f2efeb] ${
              activeTab === 'lyrics' ? 'text-[#ff3e3e] font-bold' : ''
            }`}
          >
            Sync Lyrics
          </button>
        </nav>

        {/* Action Zone: PWA Install Button & Equalizer */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          <button
            onClick={() => setIsEqualizerOpen(true)}
            className="p-2 rounded-lg bg-[#141418] border border-[#22222a] text-[#ff3e3e] hover:border-[#ff3e3e]/40 transition"
            aria-label="Open Hardware DSP Studio"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            onPlayTrack={handlePlayTrack}
            onPickSong={handlePickSong}
            onPickFolder={handlePickFolder}
            onOpenEqualizer={() => setIsEqualizerOpen(true)}
            onNavigateTab={(tab) => handleTabChange(tab as NavTab)}
          />
        )}
        {activeTab === 'stream' && (
          <StreamView onPlayTrack={handlePlayTrack} onAddToQueue={handleAddToQueue} />
        )}
        {activeTab === 'library' && (
          <LibraryView
            onPlayTrack={handlePlayTrack}
            onPickSong={handlePickSong}
            onPickFolder={handlePickFolder}
          />
        )}
        {activeTab === 'scanner' && (
          <ScannerView
            onPlayTrack={handlePlayTrack}
            onScanComplete={() => {
              getAllTracks().then(setQueue);
            }}
          />
        )}
        {activeTab === 'lyrics' && <LyricsView />}
      </main>

      {/* Floating MiniPlayer */}
      <MiniPlayer
        onOpenFullscreen={() => setIsFullscreenOpen(true)}
        onNextTrack={handleNextTrack}
      />

      {/* Fullscreen Vinyl Turntable Player Modal */}
      <FullscreenPlayer
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        queue={queue}
        onSelectTrack={handlePlayTrack}
        onOpenEqualizer={() => setIsEqualizerOpen(true)}
      />

      {/* 5-Band Biquad Graphic Equalizer & Bass Boost Modal */}
      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
      />

      {/* Bottom Mobile Navigation Bar (44px+ touch targets with haptic feedback) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-[#181820] px-2 py-1 flex items-center justify-around md:hidden"
        aria-label="Mobile Navigation"
      >
        <button
          onClick={() => handleTabChange('dashboard')}
          className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 text-[10px] font-mono tracking-wider transition ${
            activeTab === 'dashboard' ? 'text-[#ff3e3e] font-bold' : 'text-[#f2efeb]/50'
          }`}
          aria-label="Dashboard Tab"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => handleTabChange('stream')}
          className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 text-[10px] font-mono tracking-wider transition ${
            activeTab === 'stream' ? 'text-[#ff3e3e] font-bold' : 'text-[#f2efeb]/50'
          }`}
          aria-label="Stream Tab"
        >
          <Radio className="w-5 h-5" />
          <span>Stream</span>
        </button>

        <button
          onClick={() => handleTabChange('library')}
          className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 text-[10px] font-mono tracking-wider transition ${
            activeTab === 'library' ? 'text-[#ff3e3e] font-bold' : 'text-[#f2efeb]/50'
          }`}
          aria-label="Library Tab"
        >
          <Library className="w-5 h-5" />
          <span>Library</span>
        </button>

        <button
          onClick={() => handleTabChange('scanner')}
          className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 text-[10px] font-mono tracking-wider transition ${
            activeTab === 'scanner' ? 'text-[#ff3e3e] font-bold' : 'text-[#f2efeb]/50'
          }`}
          aria-label="Folder Scanner Tab"
        >
          <FolderSearch className="w-5 h-5" />
          <span>Scanner</span>
        </button>

        <button
          onClick={() => handleTabChange('lyrics')}
          className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-1 text-[10px] font-mono tracking-wider transition ${
            activeTab === 'lyrics' ? 'text-[#ff3e3e] font-bold' : 'text-[#f2efeb]/50'
          }`}
          aria-label="Sync Lyrics Tab"
        >
          <FileText className="w-5 h-5" />
          <span>Lyrics</span>
        </button>
      </nav>
    </div>
  );
}
