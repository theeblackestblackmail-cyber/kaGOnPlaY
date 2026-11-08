import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFilename } from './filenameSanitizer';
import { parseLrc, getActiveLyricIndex, formatTimeLrc, generateLrc } from './lrcParser';

test('sanitizeFilename removes video noise tags and prefixes', () => {
  const input1 = '01 - Daft Punk - Get Lucky [Official Video].mp3';
  const res1 = sanitizeFilename(input1);
  assert.equal(res1.artist, 'Daft Punk');
  assert.equal(res1.title, 'Get Lucky');

  const input2 = 'The_Weeknd_-_Blinding_Lights_(Lyrics)_[HQ].flac';
  const res2 = sanitizeFilename(input2);
  assert.equal(res2.artist, 'The Weeknd');
  assert.equal(res2.title, 'Blinding Lights');

  const input3 = '05. Synthwave Dream [4K].wav';
  const res3 = sanitizeFilename(input3);
  assert.equal(res3.title, 'Synthwave Dream');

  const input4 = 'Corrupted\uFFFDTrack_Title.mp3';
  const res4 = sanitizeFilename(input4);
  assert.equal(res4.title, 'Corrupted Track Title');
});

test('lrcParser parses timestamps and repeated lyrics', () => {
  const sampleLrc = `
[ti:Midnight City]
[ar:M83]
[al:Hurry Up, We're Dreaming]
[offset:+200]
[00:15.50]Waiting in a car
[00:22.10][00:44.20]Looking at the city lights
[01:05.00]The city is my church
`;

  const parsed = parseLrc(sampleLrc);
  assert.equal(parsed.title, 'Midnight City');
  assert.equal(parsed.artist, 'M83');
  assert.equal(parsed.album, "Hurry Up, We're Dreaming");
  // Check repeated timestamp produced two entries
  assert.equal(parsed.lines.length, 4);

  // Check sorting
  assert.equal(parsed.lines[0].text, 'Waiting in a car');
  assert.equal(parsed.lines[1].text, 'Looking at the city lights');
  assert.equal(parsed.lines[1].time, 22.1);
  assert.equal(parsed.lines[2].time, 44.2);
  assert.equal(parsed.lines[3].text, 'The city is my church');
});

test('getActiveLyricIndex returns correct active line based on playback time', () => {
  const lines = [
    { id: '1', time: 10, text: 'First line' },
    { id: '2', time: 20, text: 'Second line' },
    { id: '3', time: 30, text: 'Third line' },
  ];

  assert.equal(getActiveLyricIndex(lines, 5), -1);
  assert.equal(getActiveLyricIndex(lines, 12), 0);
  assert.equal(getActiveLyricIndex(lines, 25), 1);
  assert.equal(getActiveLyricIndex(lines, 35), 2);

  // With calibration offset (+2 seconds delay)
  assert.equal(getActiveLyricIndex(lines, 22, 2.0), 1);
});

test('formatTimeLrc formats seconds to [mm:ss.xx]', () => {
  assert.equal(formatTimeLrc(75.5), '[01:15.50]');
  assert.equal(formatTimeLrc(0), '[00:00.00]');
  assert.equal(formatTimeLrc(123.45), '[02:03.45]');
});
