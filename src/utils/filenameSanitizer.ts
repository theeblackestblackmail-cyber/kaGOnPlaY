/**
 * filenameSanitizer.ts
 * Sanitizes audio filenames by stripping publisher tags, video noise, track number prefixes,
 * underscores, and mojibake characters to extract clean Title, Artist, and Album metadata.
 */

export interface SanitizedMetadata {
  title: string;
  artist: string;
  album: string;
  cleanedName: string;
  original: string;
}

const NOISE_TAG_PATTERNS = [
  /\[official\s*(music)?\s*(video|audio|visualizer|lyric\s*video|hd|hq|4k)?\]/gi,
  /\(official\s*(music)?\s*(video|audio|visualizer|lyric\s*video|hd|hq|4k)?\)/gi,
  /\[(audio|video|lyrics?|visualizer|hq|hd|4k|1080p|remaster(ed)?)\]/gi,
  /\((audio|video|lyrics?|visualizer|hq|hd|4k|1080p|remaster(ed)?)\)/gi,
  /\[\s*free\s*download\s*\]/gi,
  /\(\s*prod\.\s*[^)]+\)/gi,
  /\[\s*prod\.\s*[^\]]+\)/gi,
];

// Prefixes like "01 - ", "01. ", "01 ", "01_ "
const TRACK_NUMBER_PREFIX = /^(\d{1,3}[\s._-]+)/;

// Common audio extensions
const EXTENSION_PATTERN = /\.(mp3|wav|ogg|flac|m4a|aac|webm|opus)$/i;

export function sanitizeFilename(rawFilename: string): SanitizedMetadata {
  const original = rawFilename;

  // 1. Strip file extension
  let name = rawFilename.replace(EXTENSION_PATTERN, '').trim();

  // 2. Remove mojibake (\uFFFD replacement char or double encoded junk)
  name = name.replace(/\uFFFD/g, ' ').replace(/[\x00-\x1F\x7F]/g, ' ');

  // 3. Replace underscores with spaces
  name = name.replace(/_+/g, ' ');

  // 4. Strip noise tags ([Official Video], (Lyrics), etc.)
  for (const pattern of NOISE_TAG_PATTERNS) {
    name = name.replace(pattern, ' ');
  }

  // 5. Strip track number prefixes (e.g., "01 - ", "02. ")
  name = name.replace(TRACK_NUMBER_PREFIX, '');

  // 6. Clean up repeated spaces, dangling hyphens/brackets
  name = name
    .replace(/\s{2,}/g, ' ')
    .replace(/^[-–—\s]+|[-–—\s]+$/g, '')
    .trim();

  // 7. Parse Artist vs Title if "Artist - Title" or "Artist – Title" format
  let artist = 'Unknown Artist';
  let title = name;
  let album = 'Unknown Album';

  const separatorMatch = name.match(/^(.*?)\s*[-–—]\s*(.*)$/);
  if (separatorMatch) {
    artist = separatorMatch[1].trim();
    title = separatorMatch[2].trim();
  }

  // Final fallback if title ended up empty
  if (!title) {
    title = original.replace(EXTENSION_PATTERN, '') || 'Untitled Track';
  }

  return {
    title,
    artist,
    album,
    cleanedName: `${artist !== 'Unknown Artist' ? `${artist} - ` : ''}${title}`,
    original,
  };
}
