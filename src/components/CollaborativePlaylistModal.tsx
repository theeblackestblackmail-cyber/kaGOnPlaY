import React, { useEffect, useState, useRef } from 'react';
import { Users, Plus, ThumbsUp, Trash2, Send, MessageSquare, Play, X, Radio } from 'lucide-react';
import { AudioTrack } from '../types/audio';
import { audioEngine } from '../services/audioEngine';

interface CollaborativeTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  streamId: string;
  addedBy: string;
  votes: number;
  addedAt: number;
}

interface CollabMessage {
  id: string;
  user: string;
  text: string;
  time: string;
}

interface CollaborativePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  myNickname?: string;
}

export const CollaborativePlaylistModal: React.FC<CollaborativePlaylistModalProps> = ({
  isOpen,
  onClose,
  myNickname = 'CyberUser',
}) => {
  const [tracks, setTracks] = useState<CollaborativeTrack[]>([]);
  const [activeUsers, setActiveUsers] = useState(1);
  const [messages, setMessages] = useState<CollabMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/collaborate`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'join', user: myNickname }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'sync_state' && msg.data) {
          setTracks(msg.data.playlist || []);
          setActiveUsers(msg.data.activeUsers || 1);
          setMessages(msg.data.messages || []);
        }
      } catch (err) {
        console.warn('WebSocket message error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [isOpen, myNickname]);

  if (!isOpen) return null;

  const handleUpvote = (trackId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'vote_track',
          trackId,
          delta: 1,
        })
      );
    }
  };

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'add_track',
          track: {
            title: newTitle.trim(),
            artist: newArtist.trim() || 'Unknown Artist',
            duration: '3:30',
            streamId: '4xDzrJKXOOY',
            addedBy: myNickname,
          },
        })
      );
      setNewTitle('');
      setNewArtist('');
      setShowAddForm(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat_message',
          user: myNickname,
          text: chatInput.trim(),
        })
      );
      setChatInput('');
    }
  };

  const handlePlayCollaborativeTrack = (track: CollaborativeTrack) => {
    const audioTrack: AudioTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: 'Shared Playlist',
      duration: 210,
      durationFormatted: track.duration,
      sourceType: 'synth',
      synthPreset: 'cyber-resonance',
      addedAt: track.addedAt,
      favorite: false,
    };
    audioEngine.playTrack(audioTrack);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0c0c0e] border border-[#22222a] p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#22222a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#ff3e3e]/15 border border-[#ff3e3e]/40 text-[#ff3e3e]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold uppercase tracking-wider text-[#f2efeb]">
                  Live Collaborative Studio
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-full bg-[#141418] border border-[#22222a] text-[#ff3e3e]">
                  <Users className="w-3 h-3" />
                  <span>{activeUsers} Live</span>
                </span>
              </div>
              <p className="text-xs font-mono text-[#f2efeb]/60">
                Real-time WebSocket Playlist Synchronization (/ws/collaborate)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#f2efeb]/60 hover:text-[#f2efeb] rounded-lg hover:bg-[#141418] transition"
            aria-label="Close Collaborative Playlist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split: Playlist & Chat */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 flex-1 overflow-hidden">
          {/* Main Playlist Queue (2 cols) */}
          <div className="md:col-span-2 flex flex-col overflow-hidden bg-[#141418] rounded-xl border border-[#22222a] p-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#22222a]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#f2efeb]">
                Queue ({tracks.length})
              </span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#ff3e3e]/20 text-[#ff3e3e] text-xs font-semibold hover:bg-[#ff3e3e]/30 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add Track</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddTrack} className="my-3 p-3 bg-[#0c0c0e] rounded-lg border border-[#22222a] space-y-2">
                <input
                  type="text"
                  placeholder="Song Title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#141418] border border-[#22222a] rounded text-[#f2efeb] focus:outline-none focus:border-[#ff3e3e]"
                  required
                />
                <input
                  type="text"
                  placeholder="Artist..."
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#141418] border border-[#22222a] rounded text-[#f2efeb] focus:outline-none focus:border-[#ff3e3e]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-2.5 py-1 text-xs text-[#f2efeb]/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-bold rounded bg-[#ff3e3e] text-white"
                  >
                    Submit to Room
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
              {tracks.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-[#f2efeb]/40">
                  Shared queue is empty. Click "+ Add Track" to submit music.
                </div>
              ) : (
                tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#0c0c0e] border border-[#22222a] hover:border-[#ff3e3e]/40 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handlePlayCollaborativeTrack(track)}
                        className="p-2 rounded-full bg-[#1b1b22] text-[#ff3e3e] hover:bg-[#ff3e3e] hover:text-white transition shrink-0"
                        aria-label={`Play ${track.title}`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#f2efeb] truncate">{track.title}</p>
                        <p className="text-[11px] font-mono text-[#f2efeb]/60 truncate">
                          {track.artist} · <span className="text-[#ff3e3e]">{track.addedBy}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUpvote(track.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[#181820] border border-[#22222a] text-[11px] font-mono text-[#f2efeb] hover:border-[#ff3e3e] transition"
                        aria-label={`Upvote ${track.title}`}
                      >
                        <ThumbsUp className="w-3 h-3 text-[#ff3e3e]" />
                        <span className="font-bold tabular-nums">{track.votes}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Collaborative Chat Feed (1 col) */}
          <div className="flex flex-col bg-[#141418] rounded-xl border border-[#22222a] p-4 overflow-hidden">
            <div className="flex items-center gap-2 pb-2 border-b border-[#22222a] text-xs font-bold uppercase tracking-wider text-[#f2efeb]">
              <MessageSquare className="w-3.5 h-3.5 text-[#ff3e3e]" />
              <span>Studio Chat</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 text-xs">
              {messages.map((m) => (
                <div key={m.id} className="p-2 rounded bg-[#0c0c0e] border border-[#22222a]">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#f2efeb]/50 mb-1">
                    <span className="font-bold text-[#ff3e3e]">{m.user}</span>
                    <span>{m.time}</span>
                  </div>
                  <p className="text-[11px] text-[#f2efeb]/90 break-words">{m.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="mt-2 flex gap-1.5">
              <input
                type="text"
                placeholder="Chat in studio..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs bg-[#0c0c0e] border border-[#22222a] rounded text-[#f2efeb] focus:outline-none focus:border-[#ff3e3e]"
              />
              <button
                type="submit"
                className="p-2 rounded bg-[#ff3e3e] text-white hover:bg-[#e03030] transition"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
