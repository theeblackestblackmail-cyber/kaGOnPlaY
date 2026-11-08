/**
 * audioDb.ts
 * IndexedDB storage layer for kaGO.PIaY:
 * Database: kaGO_PIaY_Audio_DB
 * Object Stores: tracks, playlists, lyrics, history
 */

import { AudioTrack, Playlist } from '../types/audio';

const DB_NAME = 'kaGO_PIaY_Audio_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('tracks')) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
        trackStore.createIndex('title', 'title', { unique: false });
        trackStore.createIndex('artist', 'artist', { unique: false });
        trackStore.createIndex('favorite', 'favorite', { unique: false });
      }

      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('lyrics')) {
        db.createObjectStore('lyrics', { keyPath: 'trackId' });
      }

      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function getAllTracks(): Promise<AudioTrack[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readonly');
    const store = tx.objectStore('tracks');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTrack(track: AudioTrack): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const req = store.put(track);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveTracksBatch(tracks: AudioTrack[]): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    for (const track of tracks) {
      store.put(track);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTrack(trackId: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const req = store.delete(trackId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function toggleFavoriteTrack(trackId: string): Promise<boolean> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const getReq = store.get(trackId);

    getReq.onsuccess = () => {
      const track: AudioTrack | undefined = getReq.result;
      if (!track) {
        return resolve(false);
      }
      track.favorite = !track.favorite;
      store.put(track);
      resolve(track.favorite);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readonly');
    const store = tx.objectStore('playlists');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    const req = store.put(playlist);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    const req = store.delete(playlistId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveLyrics(trackId: string, lrcContent: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lyrics', 'readwrite');
    const store = tx.objectStore('lyrics');
    const req = store.put({ trackId, lrcContent, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getLyrics(trackId: string): Promise<string | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lyrics', 'readonly');
    const store = tx.objectStore('lyrics');
    const req = store.get(trackId);
    req.onsuccess = () => resolve(req.result ? req.result.lrcContent : null);
    req.onerror = () => reject(req.error);
  });
}

export async function addPlayHistory(trackId: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    store.add({ trackId, playedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
