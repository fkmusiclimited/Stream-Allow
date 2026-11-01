import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PlusCircle,
  ListVideo,
  Play,
  Trash2,
  Clock,
  Film,
  MoreVertical,
  X,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { PlaylistItem } from '../../types';

export const UserPlaylistPage: React.FC = () => {
  const { userPlaylists, userStreams, addPlaylist, deletePlaylist, openPlaylistDetails, showToast } = useApp();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New playlist form
  const [newTitle, setNewTitle] = useState('');
  const [videoCount, setVideoCount] = useState('20');
  const [duration, setDuration] = useState('3h 30m');
  const [thumbnailUrl, setThumbnailUrl] = useState('https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Please enter a playlist name.', 'error');
      return;
    }

    addPlaylist({
      name: newTitle,
      videosCount: parseInt(videoCount) || 12,
      duration: duration || '2h 15m',
      status: 'Active',
      thumbnail: thumbnailUrl,
      videos: [
        { id: `v-${Date.now()}`, title: 'Opening Track / Intro Loop', duration: '12:30', url: 'https://youtube.com/watch?v=demo', thumbnail: thumbnailUrl }
      ]
    });

    setCreateModalOpen(false);
    setNewTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Header matching reference 4 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">My Playlists</h1>
          <p className="text-xs text-slate-400">
            Create, manage video files, and broadcast continuous loops to YouTube Live.
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* Playlist Grid or Empty State */}
      {(userPlaylists || []).length === 0 ? (
        <div className="rounded-2xl bg-[#0F1626] border border-slate-800 p-12 text-center shadow-xl">
          <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
              <ListVideo className="w-8 h-8 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No playlists created yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Assemble continuous 24/7 video loops by grouping your MP4 videos into organized playlists. When one video finishes, the next plays automatically.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Playlist</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(userPlaylists || []).map((pl) => {
            const isPlaylistLive = (userStreams || []).some(s => s.playlistId === pl.id && s.status === 'live');

            return (
              <div
                key={pl.id}
                className={`rounded-2xl overflow-hidden bg-[#0F1626] border transition-all flex flex-col justify-between group shadow-xl hover:shadow-2xl ${
                  isPlaylistLive
                    ? 'border-rose-500/60 hover:border-rose-500 hover:shadow-rose-500/15'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Click to open dedicated page */}
                  <div
                    onClick={() => openPlaylistDetails(pl.id)}
                    className="relative h-44 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={pl.videos?.[0]?.thumbnail || pl.thumbnail}
                      alt={pl.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* ONLY show 24/7 LIVE badge if this playlist is actually broadcasting live */}
                    {isPlaylistLive && (
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white flex items-center gap-1 shadow-lg shadow-rose-950/60 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>24/7 LIVE</span>
                        </span>
                      </div>
                    )}

                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FF1B6B] text-white shadow-md flex items-center gap-1 group-hover:scale-105 transition-transform">
                        <span>Open Playlist</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span className="font-semibold flex items-center gap-1.5 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg">
                        <Film className="w-3.5 h-3.5 text-[#FF1B6B]" />
                        <span>{pl.videos?.length || pl.videosCount} video files</span>
                      </span>
                      <span className="bg-black/60 backdrop-blur px-2 py-1 rounded-lg text-slate-300 font-mono text-[11px]">
                        {pl.duration}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3
                        onClick={() => openPlaylistDetails(pl.id)}
                        className="font-bold text-white text-base hover:text-[#FF1B6B] cursor-pointer transition-colors"
                      >
                        {pl.name}
                      </h3>
                      {isPlaylistLive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span>Live</span>
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          pl.status === 'Scheduled'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : pl.status === 'Ended'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {pl.status === 'Active' ? 'Ready' : pl.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">Created: {pl.createdAt}</p>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-800/80 mt-2">
                  <button
                    onClick={() => openPlaylistDetails(pl.id)}
                    className="text-xs font-semibold text-[#FF1B6B] hover:text-white flex items-center gap-1.5 transition-colors py-1 cursor-pointer"
                  >
                    <span>View & Add Files</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                      {pl.videos?.length || pl.videosCount}
                    </span>
                  </button>

                  <button
                    onClick={() => deletePlaylist(pl.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Delete playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Playlist Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F1626] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Create Video Playlist</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Playlist Name</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. 24/7 Deep LoFi Midnight"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Total Videos</label>
                  <input
                    type="number"
                    value={videoCount}
                    onChange={e => setVideoCount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="e.g. 4h 30m"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cover Art URL</label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={e => setThumbnailUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/20"
              >
                Save & Initialize Playlist
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
