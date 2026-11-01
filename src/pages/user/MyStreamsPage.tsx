import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PlusCircle,
  Play,
  Pause,
  Trash2,
  Copy,
  ExternalLink,
  MoreVertical,
  Search,
  CheckCircle2,
  Radio,
  Clock
} from 'lucide-react';
import { StreamStatus } from '../../types';

export const MyStreamsPage: React.FC = () => {
  const { userStreams, updateStreamStatus, deleteStream, navigate, setActiveViewingStream, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'scheduled' | 'ended'>('all');
  const [search, setSearch] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  const streamsList = userStreams || [];

  const filteredStreams = streamsList.filter(s => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'live' && s.status === 'live') ||
      (activeTab === 'scheduled' && s.status === 'scheduled') ||
      (activeTab === 'ended' && (s.status === 'ended' || s.status === 'failed'));

    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.channelName.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const liveCount = streamsList.filter(s => s.status === 'live').length;
  const scheduledCount = streamsList.filter(s => s.status === 'scheduled').length;
  const endedCount = streamsList.filter(s => s.status === 'ended' || s.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header matching reference 3 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">My Streams</h1>
          <p className="text-xs text-slate-400">Manage all your live streams and past broadcasts.</p>
        </div>
        <button
          onClick={() => navigate('user/create-stream')}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Stream</span>
        </button>
      </div>

      {/* Tabs & Search matching reference 3 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'all' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Streams ({streamsList.length})
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'live' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Live ({liveCount})
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'scheduled' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Scheduled ({scheduledCount})
          </button>
          <button
            onClick={() => setActiveTab('ended')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'ended' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ended ({endedCount})
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
                <th className="py-3.5 px-4">Title</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Views / Watchers</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStreams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                        <Radio className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white">No streams found</h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        You have not created any live broadcasts yet. Set up your stream URL & key to start broadcasting 24/7 loops.
                      </p>
                      <button
                        onClick={() => navigate('user/create-stream')}
                        className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Create First Stream</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStreams.map((str) => (
                <tr key={str.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setActiveViewingStream(str)}
                        className="relative w-16 h-11 rounded-lg overflow-hidden shrink-0 cursor-pointer group"
                      >
                        <img src={str.thumbnail} alt={str.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      </div>
                      <div>
                        <span
                          onClick={() => setActiveViewingStream(str)}
                          className="font-bold text-white hover:text-[#FF1B6B] cursor-pointer block text-xs"
                        >
                          {str.title}
                        </span>
                        <span className="text-[11px] text-slate-500">{str.resolution || '1080p'} · {str.loop ? '24/7 Loop' : 'Single Run'}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-300 font-medium">
                    {str.channelName}
                  </td>

                  <td className="py-3 px-4 text-slate-400">
                    <div>{str.date}</div>
                    <div className="text-[11px] text-slate-500">{str.time || '10:00 PM'}</div>
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                        Ended
                      </span>
                    )}
                    {str.status === 'failed' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Failed
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-200">
                    {str.status === 'live' ? (
                      <span className="text-emerald-400 font-bold">{str.viewers.toLocaleString()} watching</span>
                    ) : (
                      <span>{str.views}</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => setActionMenuOpenId(actionMenuOpenId === str.id ? null : str.id)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {actionMenuOpenId === str.id && (
                        <div className="absolute right-0 mt-1 w-44 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl p-1 z-20 text-xs">
                          <button
                            onClick={() => {
                              setActiveViewingStream(str);
                              setActionMenuOpenId(null);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                          >
                            <Play className="w-3.5 h-3.5 text-[#FF1B6B]" />
                            <span>Preview Stream</span>
                          </button>

                          {str.status === 'live' ? (
                            <button
                              onClick={() => {
                                updateStreamStatus(str.id, 'ended');
                                setActionMenuOpenId(null);
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-amber-400 flex items-center gap-2"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Stop Broadcast</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                updateStreamStatus(str.id, 'live');
                                setActionMenuOpenId(null);
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-emerald-400 flex items-center gap-2"
                            >
                              <Radio className="w-3.5 h-3.5" />
                              <span>Start Broadcast</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(str.streamKey || 'live_streamjoin_key');
                              showToast('Stream Key copied to clipboard!', 'success');
                              setActionMenuOpenId(null);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Stream Key</span>
                          </button>

                          <div className="border-t border-slate-800 my-1" />

                          <button
                            onClick={() => {
                              deleteStream(str.id);
                              setActionMenuOpenId(null);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-rose-950/40 text-rose-400 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Stream</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
