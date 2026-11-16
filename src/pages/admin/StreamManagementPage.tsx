import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Video,
  PlusCircle,
  Search,
  Radio,
  Play,
  Pause,
  Trash2,
  MoreVertical,
  ExternalLink,
  ListVideo
} from 'lucide-react';

export const StreamManagementPage: React.FC = () => {
  const { streams, playlists, openPlaylistDetails, showToast, updateStreamStatus, stoppingStreamIds, deleteStream, setActiveViewingStream, navigate, fetchStreams } = useApp();
  const [filter, setFilter] = useState<'all' | 'live' | 'scheduled' | 'ended' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  React.useEffect(() => {
    fetchStreams().catch(() => {});
  }, []);

  const handleOpenStreamPlaylist = (str: any) => {
    let targetPlaylistId = str.playlistId;
    if (!targetPlaylistId) {
      const match = playlists.find(p => p.id === str.id || p.name.trim().toLowerCase() === str.title.trim().toLowerCase());
      if (match) targetPlaylistId = match.id;
    }
    if (targetPlaylistId) {
      openPlaylistDetails(targetPlaylistId);
    } else if (playlists.length > 0) {
      openPlaylistDetails(playlists[0].id);
    } else {
      openPlaylistDetails(str.id);
    }
  };

  const totalCount = streams.length;
  const liveCount = streams.filter(s => s.status === 'live').length;
  const scheduledCount = streams.filter(s => s.status === 'scheduled').length;
  const endedCount = streams.filter(s => s.status === 'ended').length;
  const failedCount = streams.filter(s => s.status === 'failed').length;

  const filteredStreams = streams.filter(s => {
    const matchesTab = filter === 'all' || s.status === filter;
    const q = search.toLowerCase();
    const matchesSearch = (s.title || '').toLowerCase().includes(q) ||
      (s.channelName || '').toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header matching reference 3 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">All Streams</h1>
          <p className="text-xs text-slate-400">Manage live, scheduled and completed streams platform-wide.</p>
        </div>
        <button
          onClick={() => navigate('admin/create-stream')}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Stream</span>
        </button>
      </div>

      {/* Tabs matching reference 3 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'all' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('live')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'live' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Live ({liveCount})
          </button>
          <button
            onClick={() => setFilter('scheduled')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'scheduled' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Scheduled ({scheduledCount})
          </button>
          <button
            onClick={() => setFilter('ended')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'ended' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Completed ({endedCount})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'failed' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Failed ({failedCount})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search streams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-60 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
          />
        </div>
      </div>

      {/* Streams Table matching reference 3 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Thumbnail</th>
                <th className="py-3.5 px-4">Title</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Viewers</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStreams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                        <Radio className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white">No streams found</h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No broadcast sessions match the selected filter. Streams created by users or admins are permanently stored in PostgreSQL.
                      </p>
                      <button
                        onClick={() => navigate('admin/create-stream')}
                        className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Create New Stream</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStreams.map((str) => (
                  <tr
                    key={str.id}
                    onClick={() => handleOpenStreamPlaylist(str)}
                    className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                    title="Click to open playlist"
                  >
                    <td className="py-3 px-4">
                      <div
                        className="relative w-16 h-11 rounded-lg overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-[#FF1B6B]/40 transition-all"
                      >
                        <img src={str.thumbnail} alt={str.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ListVideo className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </td>

                  <td className="py-3 px-4 font-bold text-white max-w-xs truncate">
                    <span className="group-hover:text-[#FF1B6B] transition-colors">
                      {str.title}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-normal">Click to view playlist queue</span>
                  </td>

                  <td className="py-3 px-4 text-slate-300 font-medium">
                    {str.channelName}
                  </td>

                  <td className="py-3 px-4">
                    {str.status === 'live' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white inline-flex items-center gap-1 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        Live
                      </span>
                    )}
                    {str.status === 'scheduled' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Scheduled
                      </span>
                    )}
                    {str.status === 'ended' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                        Stopped
                      </span>
                    )}
                    {str.status === 'failed' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Failed
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                    {str.status === 'live' ? `${str.viewers.toLocaleString()} watching` : str.views}
                  </td>

                  <td className="py-3 px-4 text-slate-400">{str.date}</td>

                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block text-left">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === str.id ? null : str.id); }}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === str.id && (
                        <div className="absolute right-0 mt-1 w-44 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl p-1 z-20 text-xs space-y-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenStreamPlaylist(str); setActiveMenuId(null); }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                          >
                            <ListVideo className="w-3.5 h-3.5 text-[#FF1B6B]" />
                            <span>Open Playlist</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveViewingStream(str); setActiveMenuId(null); }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                          >
                            <Play className="w-3.5 h-3.5 text-blue-400" />
                            <span>Monitor Video</span>
                          </button>
                          {str.status === 'live' ? (
                            <button
                              disabled={stoppingStreamIds.includes(str.id)}
                              onClick={(e) => { e.stopPropagation(); updateStreamStatus(str.id, 'ended'); setActiveMenuId(null); }}
                              className="w-full text-left p-2 rounded-lg hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-amber-400"
                            >
                              {stoppingStreamIds.includes(str.id) ? 'Stopping...' : 'Force Stop Stream'}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStreamStatus(str.id, 'live'); setActiveMenuId(null); }}
                              className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-emerald-400"
                            >
                              Force Start Stream
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteStream(str.id); setActiveMenuId(null); }}
                            className="w-full text-left p-2 rounded-lg hover:bg-rose-950/40 text-rose-400"
                          >
                            Delete Stream
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )))
            }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
