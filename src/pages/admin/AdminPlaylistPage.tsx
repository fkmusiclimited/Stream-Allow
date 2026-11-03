import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ListVideo,
  Search,
  Film,
  Trash2,
  ExternalLink,
  Play
} from 'lucide-react';

export const AdminPlaylistPage: React.FC = () => {
  const { playlists, deletePlaylist, openPlaylistDetails, showToast } = useApp();
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'ended'>('all');
  const [search, setSearch] = useState('');

  const filteredPlaylists = playlists.filter(p => {
    const matchesTab = filter === 'all' || p.status.toLowerCase() === filter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header matching reference 5 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">All Playlists</h1>
          <p className="text-xs text-slate-400">Stream playlists generated automatically from your live broadcasts.</p>
        </div>
      </div>

      {/* Tabs matching reference 5 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'all' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            All ({playlists.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'active' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Active ({playlists.filter(p => (p.status || '').toLowerCase() === 'active').length})
          </button>
          <button
            onClick={() => setFilter('scheduled')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'scheduled' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Scheduled ({playlists.filter(p => (p.status || '').toLowerCase() === 'scheduled').length})
          </button>
          <button
            onClick={() => setFilter('ended')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'ended' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Ended ({playlists.filter(p => (p.status || '').toLowerCase() === 'ended').length})
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
              {filteredPlaylists.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No stream playlists found. Start a new live stream to generate a playlist.
                  </td>
                </tr>
              ) : (
                filteredPlaylists.map((pl, idx) => (
                  <tr key={pl.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>

                    <td className="py-3 px-4">
                      <img
                        src={pl.thumbnail}
                        alt={pl.name}
                        onClick={() => openPlaylistDetails(pl.id)}
                        className="w-14 h-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    </td>

                    <td className="py-3 px-4 font-bold text-white">
                      <span
                        onClick={() => openPlaylistDetails(pl.id)}
                        className="cursor-pointer hover:text-[#FF1B6B] transition-colors"
                      >
                        {pl.name}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {pl.videos?.length || pl.videosCount || 0}
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openPlaylistDetails(pl.id)}
                          className="px-2.5 py-1 rounded-lg text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="View playlist and add/delete videos"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => deletePlaylist(pl.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete playlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
