import React, { useState, useEffect } from 'react';
import {
  Music,
  Folder,
  ListPlus,
  Disc,
  Mic2,
  Heart,
  Plus,
  FolderOpen,
  Play,
  Trash2,
  Users,
  Radio,
  FileAudio,
} from 'lucide-react';
import { AudioTrack, Playlist } from '../../types/audio';
import {
  getAllTracks,
  getAllPlaylists,
  savePlaylist,
  deletePlaylist,
  deleteTrack,
  toggleFavoriteTrack,
} from '../../db/audioDb';
import { CollaborativePlaylistModal } from '../CollaborativePlaylistModal';

type SubTab = 'all' | 'folders' | 'playlists' | 'albums' | 'artists' | 'favorites';

interface LibraryViewProps {
  onPlayTrack: (track: AudioTrack) => void;
  onPickSong: () => void;
  onPickFolder: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  onPlayTrack,
  onPickSong,
  onPickFolder,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    const loadedTracks = await getAllTracks();
    const loadedPlaylists = await getAllPlaylists();
    setTracks(loadedTracks);
    setPlaylists(loadedPlaylists);
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      trackIds: [],
      createdAt: Date.now(),
    };

    await savePlaylist(newPl);
    setNewPlaylistName('');
    setShowNewPlaylistModal(false);
    loadLibrary();
  };

  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deletePlaylist(id);
    loadLibrary();
  };

  const handleDeleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTrack(id);
    loadLibrary();
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavoriteTrack(id);
    loadLibrary();
  };

  // Derived collections
  const favoriteTracks = tracks.filter((t) => t.favorite);

  // Group by Folders
  const folderMap = new Map<string, AudioTrack[]>();
  for (const t of tracks) {
    const folder = t.folderPath || 'Internal Storage / Local Audio';
    if (!folderMap.has(folder)) folderMap.set(folder, []);
    folderMap.get(folder)!.push(t);
  }

  // Group by Albums
  const albumMap = new Map<string, AudioTrack[]>();
  for (const t of tracks) {
    const album = t.album || 'Unknown Album';
    if (!albumMap.has(album)) albumMap.set(album, []);
    albumMap.get(album)!.push(t);
  }

  // Group by Artists
  const artistMap = new Map<string, AudioTrack[]>();
  for (const t of tracks) {
    const artist = t.artist || 'Unknown Artist';
    if (!artistMap.has(artist)) artistMap.set(artist, []);
    artistMap.get(artist)!.push(t);
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header Actions & Collaborative Trigger */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#22222a]">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-[#f2efeb] font-display">
            Music Library
          </h1>
          <p className="text-xs font-mono text-[#f2efeb]/60">
            {tracks.length} Songs · {playlists.length} Playlists · IndexedDB Cached
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCollabOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff3e3e]/20 border border-[#ff3e3e]/50 text-[#ff3e3e] text-xs font-bold uppercase tracking-wider hover:bg-[#ff3e3e]/30 transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Shared Live Studio</span>
          </button>

          <button
            onClick={onPickSong}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141418] border border-[#22222a] text-[#f2efeb] text-xs font-bold uppercase tracking-wider hover:border-[#ff3e3e]/40 transition"
          >
            <Music className="w-3.5 h-3.5 text-[#ff3e3e]" />
            <span>+ PICK SONG</span>
          </button>

          <button
            onClick={onPickFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff3e3e] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#e03030] shadow-[0_0_12px_rgba(255,62,62,0.4)] transition"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>+ PICK FOLDER</span>
          </button>
        </div>
      </div>

      {/* 6 Sub-Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#0c0c0e] rounded-xl border border-[#22222a]">
        <button
          onClick={() => setSubTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition ${
            subTab === 'all'
              ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_rgba(255,62,62,0.5)]'
              : 'text-[#f2efeb]/60 hover:text-[#f2efeb]'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>All Songs ({tracks.length})</span>
        </button>

        <button
          onClick={() => setSubTab('folders')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition ${
            subTab === 'folders'
              ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_rgba(255,62,62,0.5)]'
              : 'text-[#f2efeb]/60 hover:text-[#f2efeb]'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Folders ({folderMap.size})</span>
        </button>

        <button
          onClick={() => setSubTab('playlists')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition ${
            subTab === 'playlists'
              ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_rgba(255,62,62,0.5)]'
              : 'text-[#f2efeb]/60 hover:text-[#f2efeb]'
          }`}
        >
          <ListPlus className="w-3.5 h-3.5" />
          <span>Playlists ({playlists.length})</span>
        </button>

        <button
          onClick={() => setSubTab('albums')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition ${
            subTab === 'albums'
              ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_rgba(255,62,62,0.5)]'
              : 'text-[#f2efeb]/60 hover:text-[#f2efeb]'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          <span>Albums ({albumMap.size})</span>
        </button>

        <button
          onClick={() => setSubTab('artists')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition ${
            subTab === 'artists'
              ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_rgba(255,62,62,0.5)]'
              : 'text-[#f2efeb]/60 hover:text-[#f2efeb]'
          }`}
        >
          <Mic2 className="w-3.5 h-3.5" />
          <span>Artists ({artistMap.size})</span>
        </button>

        <button
          onClick={() => setSubTab('favorites')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition ${
            subTab === 'favorites'
              ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_rgba(255,62,62,0.5)]'
              : 'text-[#f2efeb]/60 hover:text-[#f2efeb]'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Favorites ({favoriteTracks.length})</span>
        </button>
      </div>

      {/* Sub-Tab Contents */}
      {subTab === 'all' && (
        <div className="space-y-2">
          {tracks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0c0c0e] border border-[#22222a]">
              <FileAudio className="w-10 h-10 text-[#ff3e3e] mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-bold text-[#f2efeb]">No Local Audio Files Imported Yet</h3>
              <p className="text-xs text-[#f2efeb]/60 mt-1 max-w-sm mx-auto">
                Click "+ PICK FOLDER" to scan your device's music folder with ID3 parser, or "+ PICK SONG" to load files.
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={onPickSong}
                  className="px-4 py-2 rounded-lg bg-[#141418] border border-[#22222a] text-xs font-bold text-[#f2efeb] hover:border-[#ff3e3e]"
                >
                  Pick Individual Audio File
                </button>
                <button
                  onClick={onPickFolder}
                  className="px-4 py-2 rounded-lg bg-[#ff3e3e] text-xs font-bold text-white hover:bg-[#e03030]"
                >
                  Scan Device Music Folder
                </button>
              </div>
            </div>
          ) : (
            tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0c0c0e] border border-[#22222a] hover:border-[#ff3e3e]/40 transition group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#141418] border border-[#22222a] flex items-center justify-center shrink-0 group-hover:bg-[#ff3e3e] group-hover:text-white text-[#ff3e3e] transition">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#f2efeb] truncate">{track.title}</p>
                    <p className="text-[11px] font-mono text-[#f2efeb]/60 truncate">
                      {track.artist} {track.album ? `· ${track.album}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-[#f2efeb]/50">
                    {track.durationFormatted}
                  </span>
                  <button
                    onClick={(e) => handleToggleFavorite(track.id, e)}
                    className={`p-1.5 rounded-full hover:bg-[#141418] transition ${
                      track.favorite ? 'text-[#ff3e3e]' : 'text-[#f2efeb]/40 hover:text-[#f2efeb]'
                    }`}
                    aria-label="Toggle Favorite"
                  >
                    <Heart className={`w-4 h-4 ${track.favorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteTrack(track.id, e)}
                    className="p-1.5 rounded-full hover:bg-[#141418] text-[#f2efeb]/30 hover:text-red-500 transition"
                    aria-label="Delete Song"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {subTab === 'playlists' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f2efeb]/70">
              Your Playlists
            </span>
            <button
              onClick={() => setShowNewPlaylistModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff3e3e] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#e03030] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Playlist</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="p-4 rounded-xl bg-[#0c0c0e] border border-[#22222a] hover:border-[#ff3e3e]/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <ListPlus className="w-5 h-5 text-[#ff3e3e]" />
                    <button
                      onClick={(e) => handleDeletePlaylist(pl.id, e)}
                      className="text-[#f2efeb]/30 hover:text-red-500 transition p-1"
                      aria-label="Delete Playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-[#f2efeb]">{pl.name}</h4>
                  <p className="text-[11px] font-mono text-[#f2efeb]/50 mt-1">
                    {pl.trackIds.length} Tracks
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'folders' && (
        <div className="space-y-3">
          {Array.from(folderMap.entries()).map(([folderName, folderTracks]) => (
            <div key={folderName} className="p-4 rounded-xl bg-[#0c0c0e] border border-[#22222a]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#181820]">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-[#ff3e3e]" />
                  <span className="text-xs font-bold text-[#f2efeb]">{folderName}</span>
                </div>
                <span className="text-xs font-mono text-[#ff3e3e]">{folderTracks.length} Songs</span>
              </div>
              <div className="space-y-1.5">
                {folderTracks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onPlayTrack(t)}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#141418] hover:bg-[#1b1b22] cursor-pointer text-xs"
                  >
                    <span className="font-semibold text-[#f2efeb] truncate">{t.title}</span>
                    <span className="font-mono text-[#f2efeb]/50">{t.durationFormatted}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'albums' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from(albumMap.entries()).map(([albumName, albumTracks]) => (
            <div key={albumName} className="p-4 rounded-xl bg-[#0c0c0e] border border-[#22222a]">
              <div className="flex items-center gap-3 mb-3">
                <Disc className="w-6 h-6 text-[#ff3e3e]" />
                <div>
                  <h4 className="text-xs font-bold text-[#f2efeb] truncate">{albumName}</h4>
                  <p className="text-[11px] font-mono text-[#f2efeb]/50">{albumTracks.length} Tracks</p>
                </div>
              </div>
              <button
                onClick={() => onPlayTrack(albumTracks[0])}
                className="w-full py-1.5 rounded bg-[#141418] border border-[#22222a] text-xs font-bold text-[#ff3e3e] hover:border-[#ff3e3e]"
              >
                Play Album
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === 'artists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from(artistMap.entries()).map(([artistName, artistTracks]) => (
            <div key={artistName} className="p-4 rounded-xl bg-[#0c0c0e] border border-[#22222a]">
              <div className="flex items-center gap-3 mb-3">
                <Mic2 className="w-6 h-6 text-[#ff3e3e]" />
                <div>
                  <h4 className="text-xs font-bold text-[#f2efeb] truncate">{artistName}</h4>
                  <p className="text-[11px] font-mono text-[#f2efeb]/50">{artistTracks.length} Tracks</p>
                </div>
              </div>
              <button
                onClick={() => onPlayTrack(artistTracks[0])}
                className="w-full py-1.5 rounded bg-[#141418] border border-[#22222a] text-xs font-bold text-[#ff3e3e] hover:border-[#ff3e3e]"
              >
                Play Artist Tracks
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === 'favorites' && (
        <div className="space-y-2">
          {favoriteTracks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0c0c0e] border border-[#22222a]">
              <Heart className="w-8 h-8 text-[#ff3e3e] mx-auto mb-2 opacity-50" />
              <p className="text-xs font-mono text-[#f2efeb]/50">No favorite songs marked yet.</p>
            </div>
          ) : (
            favoriteTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0c0c0e] border border-[#22222a] hover:border-[#ff3e3e]/40 transition group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#141418] flex items-center justify-center text-[#ff3e3e]">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#f2efeb] truncate">{track.title}</p>
                    <p className="text-[11px] font-mono text-[#f2efeb]/60 truncate">{track.artist}</p>
                  </div>
                </div>
                <Heart className="w-4 h-4 text-[#ff3e3e] fill-current" />
              </div>
            ))
          )}
        </div>
      )}

      {/* New Playlist Modal */}
      {showNewPlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreatePlaylist}
            className="w-full max-w-sm rounded-xl bg-[#0c0c0e] border border-[#22222a] p-5 shadow-2xl"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#f2efeb] mb-3">
              Create New Playlist
            </h3>
            <input
              type="text"
              placeholder="Playlist Name (e.g. Cyberpunk Drives)..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#141418] border border-[#22222a] rounded-lg text-[#f2efeb] focus:outline-none focus:border-[#ff3e3e]"
              required
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowNewPlaylistModal(false)}
                className="px-3 py-1.5 text-xs text-[#f2efeb]/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#ff3e3e] text-white hover:bg-[#e03030]"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collaborative Shared Playlist Modal */}
      <CollaborativePlaylistModal
        isOpen={isCollabOpen}
        onClose={() => setIsCollabOpen(false)}
      />
    </div>
  );
};
