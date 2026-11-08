import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Clock,
  Upload,
  Save,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  Edit3,
  Check,
  Music,
} from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';
import { parseLrc, getActiveLyricIndex, formatTimeLrc, LrcLine } from '../../utils/lrcParser';
import { saveLyrics, getLyrics } from '../../db/audioDb';

const DEFAULT_LRC_SAMPLE = `[ti:Resonance]
[ar:HOME]
[al:Odyssey]
[offset:0]
[00:00.00]♪ Ambient Synthwave Intro ♪
[00:12.50]Waiting in the neon light
[00:24.00]Analog filters sweeping through the night
[00:36.50][01:12.00]Bass resonance shaking the floor
[00:48.20]Cyberpunk rhythms asking for more
[01:00.00]Dual-channel audio engine online
[01:15.50]Synchronized lyrics right on time
[01:30.00]♪ Synth Pad Solo ♪
[01:45.00]Cruising through the electric skyline
[02:00.00]kaGO.PIaY offline workstation
[02:15.00]♪ Outro Fade ♪`;

export const LyricsView: React.FC = () => {
  const [engineState, setEngineState] = useState(audioEngine.getState());
  const [lrcContent, setLrcContent] = useState<string>(DEFAULT_LRC_SAMPLE);
  const [parsedLines, setParsedLines] = useState<LrcLine[]>([]);
  const [calibrationOffset, setCalibrationOffset] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const update = () => setEngineState(audioEngine.getState());
    const unsub = audioEngine.subscribe(update);
    return unsub;
  }, []);

  // Load lyrics for the active track
  useEffect(() => {
    async function loadCurrentLyrics() {
      if (engineState.currentTrack) {
        const stored = await getLyrics(engineState.currentTrack.id);
        if (stored) {
          setLrcContent(stored);
        } else if (engineState.currentTrack.lrcLyrics) {
          setLrcContent(engineState.currentTrack.lrcLyrics);
        }
      }
    }
    loadCurrentLyrics();
  }, [engineState.currentTrack]);

  // Re-parse whenever content or offset changes
  useEffect(() => {
    const parsed = parseLrc(lrcContent, calibrationOffset);
    setParsedLines(parsed.lines);
  }, [lrcContent, calibrationOffset]);

  // Active line index
  const activeIndex = getActiveLyricIndex(parsedLines, engineState.currentTime, calibrationOffset);

  // Auto-scroll to active line
  useEffect(() => {
    if (!isEditing && scrollContainerRef.current && activeIndex >= 0) {
      const activeEl = scrollContainerRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex, isEditing]);

  const handleOffsetChange = (delta: number) => {
    const val = Math.round((calibrationOffset + delta) * 10) / 10;
    if (val >= -2.0 && val <= 2.0) {
      setCalibrationOffset(val);
    }
  };

  const handleResetOffset = () => {
    setCalibrationOffset(0);
  };

  // Built-in Lyric Text Editor: Stamp current playback timestamp at cursor
  const handleInsertTimestamp = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const timeTag = formatTimeLrc(engineState.currentTime);

    const updatedText =
      lrcContent.substring(0, startPos) +
      timeTag +
      ' ' +
      lrcContent.substring(endPos);

    setLrcContent(updatedText);

    // Reposition cursor right after inserted tag
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + timeTag.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleSaveLyrics = async () => {
    if (engineState.currentTrack) {
      await saveLyrics(engineState.currentTrack.id, lrcContent);
      engineState.currentTrack.lrcLyrics = lrcContent;
    }
    setSaveStatus('Saved to IndexedDB');
    setTimeout(() => setSaveStatus(null), 3000);
    setIsEditing(false);
  };

  // Drag and drop & File upload for .lrc files
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setLrcContent(text);
        setSaveStatus(`Imported ${file.name}`);
        setTimeout(() => setSaveStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleLyricClick = (time: number) => {
    if (navigator.vibrate) navigator.vibrate(10);
    audioEngine.seek(time);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Top Header Deck */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-[#141418] to-[#0c0c0e] border border-[#22222a] shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#22222a]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff3e3e] shadow-[0_0_8px_#ff3e3e]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#ff3e3e] font-bold">
                SYNCHRONIZED LRC KARAOKE ENGINE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#f2efeb] font-display">
              Sync Lyrics Engine
            </h1>
            <p className="text-xs text-[#f2efeb]/60 mt-0.5">
              Current Song: {engineState.currentTrack ? engineState.currentTrack.title : 'No Track Selected'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept=".lrc,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141418] border border-[#22222a] text-[#f2efeb] text-xs font-mono hover:border-[#ff3e3e]/40 transition"
            >
              <Upload className="w-3.5 h-3.5 text-[#ff3e3e]" />
              <span>Import .LRC</span>
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                isEditing
                  ? 'bg-[#181820] text-[#ff3e3e] border border-[#ff3e3e]'
                  : 'bg-[#ff3e3e] text-white hover:bg-[#e03030] shadow-[0_0_12px_rgba(255,62,62,0.4)]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Live View' : 'Edit Lyrics'}</span>
            </button>
          </div>
        </div>

        {/* Timing Calibration Offset Tool (-2.0s to +2.0s in 0.1s increments) */}
        <div className="mt-4 p-4 rounded-xl bg-[#000000]/70 border border-[#22222a] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#ff3e3e]" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#f2efeb] block">
                Timing Calibration Offset Tool
              </span>
              <span className="text-[10px] font-mono text-[#f2efeb]/50">
                Shift sync timing between -2.0s and +2.0s
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleOffsetChange(-0.1)}
              className="px-2.5 py-1.5 rounded-lg bg-[#141418] border border-[#22222a] text-xs font-mono font-bold text-[#f2efeb] hover:border-[#ff3e3e] transition"
            >
              -0.1s
            </button>

            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={calibrationOffset}
              onChange={(e) => setCalibrationOffset(parseFloat(e.target.value))}
              className="w-32 sm:w-40 h-2 bg-[#22222a] rounded-lg accent-[#ff3e3e] cursor-pointer"
              aria-label="Calibration offset slider"
            />

            <button
              onClick={() => handleOffsetChange(0.1)}
              className="px-2.5 py-1.5 rounded-lg bg-[#141418] border border-[#22222a] text-xs font-mono font-bold text-[#f2efeb] hover:border-[#ff3e3e] transition"
            >
              +0.1s
            </button>

            <button
              onClick={handleResetOffset}
              className="px-2.5 py-1.5 rounded-lg bg-[#141418] border border-[#22222a] text-xs font-mono text-[#ff3e3e] hover:bg-[#ff3e3e] hover:text-white transition"
              title="Reset offset to 0.0s"
            >
              0.0s
            </button>

            <span className="w-14 text-right text-xs font-mono font-bold text-[#ff3e3e] tabular-nums">
              {calibrationOffset > 0 ? `+${calibrationOffset.toFixed(1)}s` : `${calibrationOffset.toFixed(1)}s`}
            </span>
          </div>
        </div>

        {saveStatus && (
          <div className="mt-3 p-2 text-center text-xs font-mono text-[#ff3e3e] bg-[#ff3e3e]/10 border border-[#ff3e3e]/30 rounded-lg">
            {saveStatus}
          </div>
        )}
      </div>

      {/* Main Display: Live View vs Built-in Lyric Text Editor */}
      {!isEditing ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="p-6 rounded-2xl bg-[#0c0c0e] border border-[#22222a] shadow-xl relative min-h-[420px] flex flex-col justify-center"
        >
          <div className="text-center mb-4 pb-2 border-b border-[#181820] text-[11px] font-mono text-[#f2efeb]/40">
            CLICK ANY LYRIC LINE TO JUMP AUDIO TO THAT TIMESTAMP · DRAG & DROP .LRC FILES HERE
          </div>

          <div
            ref={scrollContainerRef}
            className="space-y-4 max-h-[500px] overflow-y-auto text-center py-10 px-4 scroll-smooth"
          >
            {parsedLines.length === 0 ? (
              <div className="text-center py-16 text-xs font-mono text-[#f2efeb]/40">
                No timestamps detected. Switch to "Edit Lyrics" or click "Import .LRC" above.
              </div>
            ) : (
              parsedLines.map((line, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={line.id}
                    onClick={() => handleLyricClick(line.time)}
                    className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-lg group ${
                      isActive
                        ? 'scale-110 lyrics-glow font-extrabold text-xl sm:text-2xl'
                        : 'text-sm text-[#f2efeb]/40 hover:text-[#f2efeb]/90'
                    }`}
                  >
                    <span className="text-[10px] font-mono opacity-0 group-hover:opacity-60 mr-2 text-[#ff3e3e]">
                      {formatTimeLrc(line.time)}
                    </span>
                    <span>{line.text || '♪'}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Built-in Lyric Text Editor */
        <div className="p-5 rounded-2xl bg-[#0c0c0e] border border-[#22222a] shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#22222a]">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#f2efeb]">
                Built-in Lyric Text Editor
              </h3>
              <p className="text-[11px] font-mono text-[#f2efeb]/60">
                Play the track and click "INSERT TIMESTAMP" to synchronize lyrics live
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInsertTimestamp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff3e3e]/20 border border-[#ff3e3e]/50 text-[#ff3e3e] text-xs font-mono font-bold hover:bg-[#ff3e3e]/30 transition"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>INSERT TIMESTAMP ({formatTimeLrc(engineState.currentTime)})</span>
              </button>

              <button
                onClick={handleSaveLyrics}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#ff3e3e] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#e03030] shadow-[0_0_10px_rgba(255,62,62,0.4)] transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save to DB</span>
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={lrcContent}
            onChange={(e) => setLrcContent(e.target.value)}
            rows={14}
            className="w-full p-4 bg-[#141418] border border-[#22222a] rounded-xl text-xs font-mono leading-relaxed text-[#f2efeb] focus:outline-none focus:border-[#ff3e3e] shadow-inner"
            placeholder="[00:15.00] Lyric line goes here..."
          />
        </div>
      )}
    </div>
  );
};
