/**
 * lrcParser.ts
 * Robust parser and generator for synchronized LRC lyrics files.
 * Handles standard [mm:ss.xx] and [mm:ss.xxx], repeated timestamps per line,
 * metadata tags ([ti:], [ar:], [al:]), timing offsets, and active line index matching.
 */

export interface LrcLine {
  id: string;
  time: number; // in seconds
  text: string;
}

export interface ParsedLrc {
  lines: LrcLine[];
  title?: string;
  artist?: string;
  album?: string;
  offsetSeconds: number;
}

export function parseLrc(content: string, calibrationOffset: number = 0): ParsedLrc {
  const lines: LrcLine[] = [];
  let title: string | undefined;
  let artist: string | undefined;
  let album: string | undefined;
  let headerOffsetSeconds = 0;

  const rawLines = content.split(/\r?\n/);
  const timeTagRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  const metaTagRegex = /^\[(ti|ar|al|offset):([^\]]+)\]/i;

  let counter = 0;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check for metadata tags
    const metaMatch = trimmed.match(metaTagRegex);
    if (metaMatch) {
      const key = metaMatch[1].toLowerCase();
      const value = metaMatch[2].trim();
      if (key === 'ti') title = value;
      else if (key === 'ar') artist = value;
      else if (key === 'al') album = value;
      else if (key === 'offset') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          // Standard LRC offset is in milliseconds: positive means lyrics delayed
          headerOffsetSeconds = parsed / 1000;
        }
      }
      continue;
    }

    // Extract all timestamps from line (e.g. [00:12.30][00:45.00]Chorus)
    const matches = Array.from(trimmed.matchAll(timeTagRegex));
    if (matches.length > 0) {
      // The text is whatever is left after removing all timestamps
      const text = trimmed.replace(timeTagRegex, '').trim();

      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fractionStr = match[3] || '0';
        const fraction = parseFloat(`0.${fractionStr}`);
        const totalTime = minutes * 60 + seconds + fraction;

        lines.push({
          id: `lrc-${counter++}-${totalTime.toFixed(2)}`,
          time: totalTime,
          text,
        });
      }
    }
  }

  // Sort by playback time ascending
  lines.sort((a, b) => a.time - b.time);

  return {
    lines,
    title,
    artist,
    album,
    offsetSeconds: headerOffsetSeconds + calibrationOffset,
  };
}

/**
 * Returns the index of the currently active lyric line given playback currentTime and calibration offset.
 */
export function getActiveLyricIndex(
  lines: LrcLine[],
  currentTime: number,
  offsetSeconds: number = 0
): number {
  if (lines.length === 0) return -1;
  const adjustedTime = Math.max(0, currentTime - offsetSeconds);

  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= adjustedTime) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return activeIndex;
}

/**
 * Formats time in seconds to [mm:ss.xx] LRC format
 */
export function formatTimeLrc(timeInSeconds: number): string {
  const safeTime = Math.max(0, timeInSeconds);
  const minutes = Math.floor(safeTime / 60);
  const seconds = Math.floor(safeTime % 60);
  const centiseconds = Math.floor((safeTime % 1) * 100);

  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  const xx = centiseconds.toString().padStart(2, '0');

  return `[${mm}:${ss}.${xx}]`;
}

/**
 * Generates an LRC text representation from structured lyric lines
 */
export function generateLrc(
  lines: { time: number; text: string }[],
  meta?: { title?: string; artist?: string; album?: string; offsetSeconds?: number }
): string {
  const output: string[] = [];

  if (meta?.title) output.push(`[ti:${meta.title}]`);
  if (meta?.artist) output.push(`[ar:${meta.artist}]`);
  if (meta?.album) output.push(`[al:${meta.album}]`);
  if (meta?.offsetSeconds && meta.offsetSeconds !== 0) {
    output.push(`[offset:${Math.round(meta.offsetSeconds * 1000)}]`);
  }

  const sorted = [...lines].sort((a, b) => a.time - b.time);
  for (const line of sorted) {
    output.push(`${formatTimeLrc(line.time)} ${line.text}`);
  }

  return output.join('\n');
}
