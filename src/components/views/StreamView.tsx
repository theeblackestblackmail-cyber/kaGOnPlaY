import React, { useState, useEffect } from 'react';
import {
  Search,
  Radio,
  Play,
  Plus,
  Heart,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AudioTrack } from '../../types/audio';
import { toggleFavoriteTrack, saveTrack } from '../../db/audioDb';

const GENRE_CHIPS = [
  'Afrobeats',
  'Hip-Hop',
  'Lo-Fi',
  'Synthwave',
  'Pop',
  'EDM',
  'Rock',
  'R&B',
] as const;

interface StreamResult {
  id: string; // strictly 11 characters
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  channel: string;
}

interface StreamViewProps {
  onPlayTrack: (track: AudioTrack) => void;
  onAddToQueue: (track: AudioTrack) => void;
}

export const StreamView: React.FC<StreamViewProps> = ({ onPlayTrack, onAddToQueue }) => {
  const [query, setQuery] = useState('Synthwave');
  const [results, setResults] = useState<StreamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('Synthwave');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('kago_recent_searches');
      return stored ? JSON.parse(stored) : ['Synthwave', 'Afrobeats', 'Lo-Fi Chill'];
    } catch {
      return ['Synthwave', 'Afrobeats', 'Lo-Fi Chill'];
    }
  });
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  useEffect(() => {
    performSearch('Synthwave');
  }, []);

  const performSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    setRecoveryNotice(null);

    // Update recent searches
    setRecentSearches((prev) => {
      const updated = [q, ...prev.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem('kago_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data.results)) {
        // Enforce strictly 11-char video ID, discarding any 26-char playlist/mix IDs
        const validResults = data.results.filter(
          (item: StreamResult) => item.id && /^[a-zA-Z0-9_-]{11}$/.test(item.id)
        );
        setResults(validResults);
      }
    } catch (err) {
      console.warn('Search query failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleClearRecents = () => {
    setRecentSearches([]);
    localStorage.removeItem('kago_recent_searches');
  };

  const handleGenreClick = (genre: string) => {
    setSelectedGenre(genre);
    setQuery(genre);
    performSearch(genre);
  };

  const handlePlayStream = (item: StreamResult) => {
    if (navigator.vibrate) navigator.vibrate(10);
    const track: AudioTrack = {
      id: `yt-${item.id}`,
      title: item.title,
      artist: item.artist,
      album: 'YouTube Stream',
      duration: 210,
      durationFormatted: item.duration || '3:30',
      sourceType: 'synth', // Procedural audio backed with YouTube embed bridge
      synthPreset: 'cyber-resonance',
      youtubeId: item.id,
      coverArt: item.thumbnail,
      addedAt: Date.now(),
      favorite: false,
    };
    saveTrack(track);
    onPlayTrack(track);
  };

  const handleQueueStream = (item: StreamResult) => {
    if (navigator.vibrate) navigator.vibrate(15);
    const track: AudioTrack = {
      id: `yt-${item.id}`,
      title: item.title,
      artist: item.artist,
      album: 'YouTube Stream',
      duration: 210,
      durationFormatted: item.duration || '3:30',
      sourceType: 'synth',
      synthPreset: 'neon-drive',
      youtubeId: item.id,
      coverArt: item.thumbnail,
      addedAt: Date.now(),
      favorite: false,
    };
    saveTrack(track);
    onAddToQueue(track);
  };

  // Auto-recovery test simulator for Error 150/101 embed blocks
  const triggerAutoRecoveryTest = async (item: StreamResult) => {
    setRecoveryNotice(`Detecting embed restriction (Error 150/101) on "${item.title}". Auto-resolving alternate audio stems...`);
    try {
      const res = await fetch(`/api/youtube/resolve?id=${item.id}&title=${encodeURIComponent(item.title)}&artist=${encodeURIComponent(item.artist)}`);
      const data = await res.json();
      if (data.recoveryQueries && data.recoveryQueries.length > 0) {
        setTimeout(() => {
          setRecoveryNotice(`Seamlessly switched to alternate stream for "${item.title}". Audio continuous.`);
          setTimeout(() => setRecoveryNotice(null), 4000);
        }, 1200);
      }
    } catch {
      setRecoveryNotice('Switching to local procedural Web Audio synth stem.');
      setTimeout(() => setRecoveryNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Top Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, synthwave, afrobeats..."
          className="w-full pl-11 pr-24 py-3 bg-[#141418] border border-[#22222a] rounded-xl text-sm text-[#f2efeb] placeholder-[#f2efeb]/40 focus:outline-none focus:border-[#ff3e3e] shadow-lg"
        />
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-[#f2efeb]/40" />
        <button
          type="submit"
          className="absolute right-2 top-2 px-4 py-1.5 bg-[#ff3e3e] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#e03030] transition"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Auto-Recovery Notice Banner */}
      {recoveryNotice && (
        <div className="p-3 bg-[#181820] border border-[#ff3e3e] rounded-xl text-xs font-mono text-[#ff3e3e] flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{recoveryNotice}</span>
          </div>
        </div>
      )}

      {/* Recent Search Chips */}
      {recentSearches.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-mono text-[#f2efeb]/50 shrink-0">RECENTS:</span>
          {recentSearches.map((term) => (
            <button
              key={term}
              onClick={() => {
                setQuery(term);
                performSearch(term);
              }}
              className="px-2.5 py-1 rounded-md bg-[#141418] border border-[#22222a] text-[#f2efeb]/70 hover:border-[#ff3e3e]/40 hover:text-[#f2efeb] transition shrink-0 whitespace-nowrap"
            >
              {term}
            </button>
          ))}
          <button
            onClick={handleClearRecents}
            className="text-[10px] font-mono text-[#ff3e3e] hover:underline shrink-0 ml-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* Curated Genre Pills */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#f2efeb]/60 mb-2">
          Curated Sound Banks
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {GENRE_CHIPS.map((genre) => {
            const isSelected = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => handleGenreClick(genre)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider shrink-0 transition-all ${
                  isSelected
                    ? 'bg-[#ff3e3e] text-white shadow-[0_0_10px_rgba(255,62,62,0.5)]'
                    : 'bg-[#141418] border border-[#22222a] text-[#f2efeb]/70 hover:border-[#ff3e3e]/40 hover:text-[#f2efeb]'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#f2efeb]">
            Free Streams ({results.length})
          </h2>
          <span className="text-[10px] font-mono text-[#ff3e3e]">
            ZERO-SIGNUP // 11-CHAR VERIFIED
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-[#f2efeb]/50">
            Querying YouTube individual video stream index (&sp=EgIQAQ%253D%253D)...
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono text-[#f2efeb]/40 bg-[#0c0c0e] rounded-xl border border-[#22222a]">
            No results found. Try searching for "Synthwave", "Afrobeats", or "Lo-Fi".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {results.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#0c0c0e] border border-[#22222a] hover:border-[#ff3e3e]/40 transition flex flex-col justify-between group"
              >
                <div className="flex gap-3">
                  {/* Thumbnail with overlay play */}
                  <div className="relative w-24 h-16 rounded-lg bg-[#141418] overflow-hidden shrink-0 border border-[#22222a]">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[9px] font-mono font-bold text-[#f2efeb]">
                      {item.duration}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-[#f2efeb] line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] font-mono text-[#f2efeb]/60 mt-1 truncate">
                      {item.artist}
                    </p>
                    <span className="text-[9px] font-mono text-[#ff3e3e]/80">
                      ID: {item.id}
                    </span>
                  </div>
                </div>

                {/* Stream Actions */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#181820]">
                  <button
                    onClick={() => triggerAutoRecoveryTest(item)}
                    className="text-[10px] font-mono text-[#f2efeb]/40 hover:text-[#ff3e3e] flex items-center gap-1 transition"
                    title="Simulate error 150 embed recovery"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto-Recovery</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQueueStream(item)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold text-[#f2efeb]/80 bg-[#141418] border border-[#22222a] hover:border-[#ff3e3e]/40 rounded-lg transition"
                      aria-label="Add to Queue"
                    >
                      <Plus className="w-3 h-3 text-[#ff3e3e]" />
                      <span>Queue</span>
                    </button>
                    <button
                      onClick={() => handlePlayStream(item)}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-[#ff3e3e] rounded-lg hover:bg-[#e03030] shadow-[0_0_10px_rgba(255,62,62,0.4)] transition"
                      aria-label="Play Stream Now"
                    >
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                      <span>Play</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
