import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ListVideo,
  PlusCircle,
  Search,
  Film,
  Trash2,
  MoreVertical,
  X,
  Play
} from 'lucide-react';

export const AdminPlaylistPage: React.FC = () => {
  const { playlists, addPlaylist, deletePlaylist, showToast } = useApp();
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'ended'>('all');
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New playlist form
  const [name, setName] = useState('');
  const [videosCount, setVideosCount] = useState('30');
  const [duration, setDuration] = useState('5h 20m');

  const filteredPlaylists = playlists.filter(p => {
    const matchesTab = filter === 'all' || p.status.toLowerCase() === filter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addPlaylist({
      name,
      videosCount: parseInt(videosCount) || 20,
      duration: duration || '4h 00m',
      status: 'Active',
      thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
      videos: []
    });

    setCreateModalOpen(false);
    setName('');
  };

  return (
    <div className="space-y-6">
      {/* Header matching reference 5 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">All Playlists</h1>
          <p className="text-xs text-slate-400">Create and manage video playlists across all creators.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* Tabs matching reference 5 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'all' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            All (320)
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'active' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Active (280)
          </button>
          <button
            onClick={() => setFilter('scheduled')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'scheduled' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Scheduled (25)
          </button>
          <button
            onClick={() => setFilter('ended')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'ended' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Ended (15)
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search playlists..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-60 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
          />
        </div>
      </div>

      {/* Playlists Table matching reference 5 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Thumbnail</th>
                <th className="py-3.5 px-4">Playlist Name</th>
                <th className="py-3.5 px-4">Videos</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPlaylists.map((pl, idx) => (
                <tr key={pl.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>

                  <td className="py-3 px-4">
                    <img src={pl.thumbnail} alt={pl.name} className="w-14 h-10 rounded-lg object-cover" />
                  </td>

                  <td className="py-3 px-4 font-bold text-white">
                    {pl.name}
                  </td>

                  <td className="py-3 px-4 text-slate-300 font-medium">
                    {pl.videosCount}
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {pl.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-400">
                    {pl.createdAt}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => deletePlaylist(pl.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F1626] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Create Admin Playlist</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Playlist Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Master LoFi 24/7 Pool"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#FF1B6B] text-white font-bold text-xs"
              >
                Create Playlist
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
