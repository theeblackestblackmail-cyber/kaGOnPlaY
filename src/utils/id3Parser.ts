/**
 * id3Parser.ts
 * In-browser ID3 Tag Parser.
 * Reads ID3v1 (last 128 bytes) and ID3v2 (TIT2, TPE1, TALB, TRCK) directly from
 * audio file ArrayBuffers without loading entire files into memory.
 */

export interface ParsedAudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  trackNumber?: number;
  year?: string;
}

export async function parseId3Tags(file: File): Promise<ParsedAudioMetadata> {
  const result: ParsedAudioMetadata = {};

  try {
    // 1. Try reading ID3v2 from the beginning of file (first 4KB is usually enough for header & text frames)
    const headerSlice = await file.slice(0, Math.min(file.size, 8192)).arrayBuffer();
    const v2Data = parseId3v2(headerSlice);
    if (v2Data.title) result.title = v2Data.title;
    if (v2Data.artist) result.artist = v2Data.artist;
    if (v2Data.album) result.album = v2Data.album;
    if (v2Data.trackNumber) result.trackNumber = v2Data.trackNumber;

    // 2. If title or artist missing, check ID3v1 in the last 128 bytes
    if ((!result.title || !result.artist) && file.size >= 128) {
      const tailSlice = await file.slice(file.size - 128, file.size).arrayBuffer();
      const v1Data = parseId3v1(tailSlice);
      if (!result.title && v1Data.title) result.title = v1Data.title;
      if (!result.artist && v1Data.artist) result.artist = v1Data.artist;
      if (!result.album && v1Data.album) result.album = v1Data.album;
      if (!result.trackNumber && v1Data.trackNumber) result.trackNumber = v1Data.trackNumber;
      if (!result.year && v1Data.year) result.year = v1Data.year;
    }
  } catch (err) {
    console.warn('ID3 parse warning:', err);
  }

  return result;
}

export function parseId3v1(buffer: ArrayBuffer): ParsedAudioMetadata {
  if (buffer.byteLength < 128) return {};

  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('iso-8859-1');

  // ID3v1 starts with "TAG"
  const tagHeader = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
  if (tagHeader !== 'TAG') return {};

  const readString = (start: number, length: number): string => {
    let str = decoder.decode(bytes.subarray(start, start + length));
    const nullIdx = str.indexOf('\0');
    if (nullIdx !== -1) str = str.substring(0, nullIdx);
    return str.trim();
  };

  const title = readString(3, 30);
  const artist = readString(33, 30);
  const album = readString(63, 30);
  const year = readString(93, 4);

  let trackNumber: number | undefined;
  // In ID3v1.1, byte 125 is 0 and byte 126 is track number
  if (bytes[125] === 0 && bytes[126] > 0) {
    trackNumber = bytes[126];
  }

  return {
    title: title || undefined,
    artist: artist || undefined,
    album: album || undefined,
    year: year || undefined,
    trackNumber,
  };
}

export function parseId3v2(buffer: ArrayBuffer): ParsedAudioMetadata {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 10) return {};

  // Check ID3 magic bytes
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return {};
  }

  const majorVersion = bytes[3];
  if (majorVersion < 2 || majorVersion > 4) return {};

  // Size is stored as syncsafe integer in bytes 6-9
  const tagSize =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);

  const maxOffset = Math.min(bytes.length, 10 + tagSize);
  let offset = 10;
  const result: ParsedAudioMetadata = {};

  while (offset < maxOffset - 10) {
    let frameId: string;
    let frameSize: number;

    if (majorVersion === 2) {
      // ID3v2.2 uses 3-byte frame ID and 3-byte size
      frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2]);
      frameSize = (bytes[offset + 3] << 16) | (bytes[offset + 4] << 8) | bytes[offset + 5];
      offset += 6;
    } else {
      // ID3v2.3 / ID3v2.4 uses 4-byte frame ID and 4-byte size + 2-byte flags
      frameId = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3]
      );
      if (majorVersion === 4) {
        frameSize =
          ((bytes[offset + 4] & 0x7f) << 21) |
          ((bytes[offset + 5] & 0x7f) << 14) |
          ((bytes[offset + 6] & 0x7f) << 7) |
          (bytes[offset + 7] & 0x7f);
      } else {
        frameSize =
          (bytes[offset + 4] << 24) |
          (bytes[offset + 5] << 16) |
          (bytes[offset + 6] << 8) |
          bytes[offset + 7];
      }
      offset += 10;
    }

    if (frameSize <= 0 || offset + frameSize > maxOffset) break;

    // We only care about TIT2 (title), TPE1 (artist), TALB (album), TRCK (track)
    if (['TIT2', 'TT2', 'TPE1', 'TP1', 'TALB', 'TAL', 'TRCK', 'TRK'].includes(frameId)) {
      const frameBuffer = bytes.subarray(offset, offset + frameSize);
      const text = decodeFrameText(frameBuffer);

      if (frameId === 'TIT2' || frameId === 'TT2') result.title = text;
      else if (frameId === 'TPE1' || frameId === 'TP1') result.artist = text;
      else if (frameId === 'TALB' || frameId === 'TAL') result.album = text;
      else if (frameId === 'TRCK' || frameId === 'TRK') {
        const num = parseInt(text.split('/')[0], 10);
        if (!isNaN(num)) result.trackNumber = num;
      }
    }

    offset += frameSize;
  }

  return result;
}

function decodeFrameText(bytes: Uint8Array): string {
  if (bytes.length <= 1) return '';
  const encoding = bytes[0];
  const payload = bytes.subarray(1);

  try {
    let decoder: TextDecoder;
    if (encoding === 0) decoder = new TextDecoder('iso-8859-1');
    else if (encoding === 1) decoder = new TextDecoder('utf-16');
    else if (encoding === 2) decoder = new TextDecoder('utf-16be');
    else decoder = new TextDecoder('utf-8');

    let text = decoder.decode(payload);
    const nullIdx = text.indexOf('\0');
    if (nullIdx !== -1) text = text.substring(0, nullIdx);
    return text.trim();
  } catch {
    return '';
  }
}
