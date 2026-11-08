import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  FileCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Sliders,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { sanitizeFilename, SanitizedMetadata } from '../../utils/filenameSanitizer';
import { parseId3Tags } from '../../utils/id3Parser';
import { AudioTrack } from '../../types/audio';
import { saveTracksBatch } from '../../db/audioDb';

interface ScannerViewProps {
  onScanComplete?: (count: number) => void;
  onPlayTrack: (track: AudioTrack) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({ onScanComplete, onPlayTrack }) => {
  // Interactive Live Test Bench state
  const [testInput, setTestInput] = useState(
    '01 - Daft_Punk_feat._Pharrell_Williams_-_Get_Lucky_[Official_Video]_(Lyrics)_[HQ].mp3'
  );
  const [testResult, setTestResult] = useState<SanitizedMetadata>(() =>
    sanitizeFilename(
      '01 - Daft_Punk_feat._Pharrell_Williams_-_Get_Lucky_[Official_Video]_(Lyrics)_[HQ].mp3'
    )
  );

  // Scanning progress state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<AudioTrack[]>([]);
  const [scanStatus, setScanStatus] = useState<string>('Ready to scan music directories');
  const [totalFound, setTotalFound] = useState(0);

  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  const handleTestInputChange = (value: string) => {
    setTestInput(value);
    setTestResult(sanitizeFilename(value));
  };

  // 1. Modern Directory Picker API with Recursive Scanning
  const handleDirectoryPickerScan = async () => {
    if (!('showDirectoryPicker' in window)) {
      // Fallback to input file picker
      fallbackInputRef.current?.click();
      return;
    }

    try {
      // Request directory handle
      const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      setIsScanning(true);
      setScanStatus(`Scanning "${dirHandle.name}" and subfolders...`);

      const audioFiles: File[] = [];
      const folderPaths: string[] = [];

      async function scanDirectory(handle: FileSystemDirectoryHandle, currentPath: string) {
        // @ts-ignore - async iterator for values()
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            const file = await (entry as FileSystemFileHandle).getFile();
            if (/\.(mp3|wav|ogg|flac|m4a|aac|webm|opus)$/i.test(file.name)) {
              audioFiles.push(file);
              folderPaths.push(currentPath);
            }
          } else if (entry.kind === 'directory') {
            await scanDirectory(entry as FileSystemDirectoryHandle, `${currentPath}/${entry.name}`);
          }
        }
      }

      await scanDirectory(dirHandle, dirHandle.name);
      await processScannedFiles(audioFiles, folderPaths);
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('Directory scan fallback triggered:', err);
        fallbackInputRef.current?.click();
      }
    } finally {
      setIsScanning(false);
    }
  };

  // 2. Fallback <input type="file" webkitdirectory /> Handler
  const handleFallbackFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setScanStatus(`Scanning ${files.length} selected files...`);

    const audioFiles: File[] = [];
    const folderPaths: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (/\.(mp3|wav|ogg|flac|m4a|aac|webm|opus)$/i.test(f.name)) {
        audioFiles.push(f);
        // Extract folder path from webkitRelativePath
        const pathParts = f.webkitRelativePath ? f.webkitRelativePath.split('/') : ['Music'];
        pathParts.pop(); // remove file name
        folderPaths.push(pathParts.join('/') || 'Imported Files');
      }
    }

    await processScannedFiles(audioFiles, folderPaths);
    setIsScanning(false);
  };

  // Process files through in-browser ID3 Tag Parser & Filename Sanitizer
  const processScannedFiles = async (files: File[], paths: string[]) => {
    setTotalFound(files.length);
    const parsedTracks: AudioTrack[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setScanStatus(`Parsing ID3 tags: ${i + 1}/${files.length} (${file.name})`);

      // 1. Sanitizer fallback
      const sanitized = sanitizeFilename(file.name);

      // 2. In-browser ID3 tag parser (reads ID3v1 last 128 bytes & ID3v2 header ArrayBuffers)
      const id3 = await parseId3Tags(file);

      const title = id3.title || sanitized.title;
      const artist = id3.artist || sanitized.artist;
      const album = id3.album || sanitized.album;

      const trackUrl = URL.createObjectURL(file);

      const track: AudioTrack = {
        id: `local-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        artist,
        album,
        duration: 180, // estimated until playback
        durationFormatted: '3:00',
        sourceType: 'local',
        streamUrl: trackUrl,
        fileBlob: file,
        folderPath: paths[i] || 'Local Device Music',
        addedAt: Date.now(),
        favorite: false,
      };

      parsedTracks.push(track);
    }

    // Save to IndexedDB
    await saveTracksBatch(parsedTracks);
    setScannedFiles(parsedTracks);
    setScanStatus(`Successfully scanned & parsed ${parsedTracks.length} audio tracks!`);
    onScanComplete?.(parsedTracks.length);
  };

  const samplePresets = [
    '01 - The_Weeknd_-_Blinding_Lights_(Official_Audio)_[4K].mp3',
    'Kendrick_Lamar_-_HUMBLE._[Official_Music_Video].wav',
    '03. Synthwave_Boy_-_Neon_Sunset_(Lyrics)_[HQ].flac',
    'Corrupted\uFFFDTrack_Title_With_Noise_[Remastered].mp3',
  ];

  return (
    <div className="space-y-6 pb-28">
      {/* Hidden Fallback Input */}
      <input
        type="file"
        ref={fallbackInputRef}
        onChange={handleFallbackFileSelect}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
      />

      {/* Hero Scanner Deck */}
      <div className="rounded-2xl bg-gradient-to-b from-[#141418] to-[#0c0c0e] border border-[#22222a] p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#22222a]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff3e3e] shadow-[0_0_8px_#ff3e3e]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#ff3e3e] font-bold">
                BROWSER DIRECTORY PICKER & ID3 PARSER
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#f2efeb] font-display">
              Device Music Folder Scanner
            </h1>
            <p className="text-xs text-[#f2efeb]/60 mt-0.5">
              Directly reads local audio files and extracts clean metadata into IndexedDB
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDirectoryPickerScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff3e3e] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#e03030] shadow-[0_0_15px_rgba(255,62,62,0.4)] transition disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <FolderOpen className="w-4 h-4" />
                  <span>Select Music Folder</span>
                </>
              )}
            </button>
            <button
              onClick={() => fallbackInputRef.current?.click()}
              className="px-3 py-2.5 rounded-xl bg-[#181820] border border-[#22222a] text-xs font-mono text-[#f2efeb]/80 hover:border-[#ff3e3e]"
              title="Manual browser file input fallback"
            >
              Fallback Picker
            </button>
          </div>
        </div>

        {/* Scan Status Display */}
        <div className="mt-4 p-3 bg-[#000000]/60 rounded-xl border border-[#22222a] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${scannedFiles.length > 0 ? 'text-[#ff3e3e]' : 'text-[#f2efeb]/40'}`} />
            <span className="text-[#f2efeb]/80">{scanStatus}</span>
          </div>
          {totalFound > 0 && (
            <span className="text-[#ff3e3e] font-bold">{totalFound} Files</span>
          )}
        </div>
      </div>

      {/* Interactive Live Filename Sanitizer Test Bench */}
      <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-[#22222a] shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#22222a]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#ff3e3e]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#f2efeb]">
              Filename Sanitizer Live Test Bench
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[#ff3e3e]">REAL-TIME REGEX ENGINE</span>
        </div>

        <p className="text-xs text-[#f2efeb]/60 my-3">
          Type or paste any noisy audio filename below to see live extraction of clean Title, Artist, Album, and removal of video noise tags ([Official Video], [HQ], 01 -):
        </p>

        {/* Live Input */}
        <div className="space-y-2">
          <input
            type="text"
            value={testInput}
            onChange={(e) => handleTestInputChange(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#141418] border border-[#22222a] focus:border-[#ff3e3e] rounded-xl text-[#f2efeb] focus:outline-none"
            placeholder="Type any raw noisy audio filename..."
          />

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
            <span className="text-[#f2efeb]/40 shrink-0">TRY SAMPLES:</span>
            {samplePresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleTestInputChange(preset)}
                className="px-2 py-0.5 rounded bg-[#141418] border border-[#22222a] hover:border-[#ff3e3e]/40 text-[#f2efeb]/70 hover:text-[#f2efeb] transition shrink-0 whitespace-nowrap"
              >
                Sample {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Live Sanitizer Output Comparison Card */}
        <div className="mt-4 p-4 rounded-xl bg-[#141418] border border-[#22222a] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#f2efeb]/50">ORIGINAL RAW FILE:</span>
            <span className="text-[#f2efeb]/70 truncate max-w-xs">{testResult.original}</span>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#1f1f28]">
            <ArrowRight className="w-4 h-4 text-[#ff3e3e] shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] font-mono text-[#ff3e3e] font-bold block">
                SANITIZED DISPLAY NAME:
              </span>
              <p className="text-sm font-bold text-[#f2efeb]">{testResult.cleanedName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1f1f28] text-xs font-mono">
            <div className="p-2 rounded bg-[#0c0c0e] border border-[#22222a]">
              <span className="text-[#ff3e3e] block text-[10px]">PARSED TITLE</span>
              <span className="font-bold text-[#f2efeb] truncate block">{testResult.title}</span>
            </div>
            <div className="p-2 rounded bg-[#0c0c0e] border border-[#22222a]">
              <span className="text-[#ff3e3e] block text-[10px]">PARSED ARTIST</span>
              <span className="font-bold text-[#f2efeb] truncate block">{testResult.artist}</span>
            </div>
            <div className="p-2 rounded bg-[#0c0c0e] border border-[#22222a]">
              <span className="text-[#ff3e3e] block text-[10px]">PARSED ALBUM</span>
              <span className="font-bold text-[#f2efeb] truncate block">{testResult.album}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scanned Files Results List */}
      {scannedFiles.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-[#22222a]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#f2efeb] mb-3">
            Scanned & Cached Audio Tracks ({scannedFiles.length})
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {scannedFiles.map((t) => (
              <div
                key={t.id}
                onClick={() => onPlayTrack(t)}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#141418] hover:bg-[#1b1b22] border border-[#22222a] hover:border-[#ff3e3e]/40 transition cursor-pointer text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#f2efeb] truncate">{t.title}</p>
                  <p className="text-[11px] font-mono text-[#f2efeb]/60 truncate">
                    {t.artist} · <span className="text-[#ff3e3e]">{t.folderPath}</span>
                  </p>
                </div>
                <span className="px-2 py-1 rounded bg-[#0c0c0e] text-[10px] font-mono text-[#f2efeb]/70">
                  Ready
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
