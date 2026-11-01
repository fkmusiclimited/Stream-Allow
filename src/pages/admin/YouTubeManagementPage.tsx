import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Youtube,
  PlusCircle,
  Search,
  CheckCircle2,
  RefreshCw,
  Settings,
  MoreVertical,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { ConnectChannelModal } from '../../components/common/ConnectChannelModal';

export const YouTubeManagementPage: React.FC = () => {
  const { channels, disconnectChannel, showToast } = useApp();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleSyncAll = () => {
    showToast('Batch synced YouTube Data API quotas & channel metrics across all 1,256 accounts.', 'success');
  };

  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.handle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header matching reference 4 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">YouTube Channels</h1>
          <p className="text-xs text-slate-400">Manage connected YouTube channels and platform API tokens.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync All API</span>
          </button>
          <button
            onClick={() => setConnectModalOpen(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Connect Channel</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Boxes matching reference 4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Total Channels</span>
          <div className="text-2xl font-black text-white">1,256</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Active</span>
          <div className="text-2xl font-black text-emerald-400">1,102</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Disconnected</span>
          <div className="text-2xl font-black text-rose-400">84</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Pending</span>
          <div className="text-2xl font-black text-amber-400">70</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search channels..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
        />
      </div>

      {/* Channels List matching reference 4 */}
      <div className="space-y-3">
        {filteredChannels.map((chan) => (
          <div
            key={chan.id}
            className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={chan.avatar}
                  alt={chan.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white">
                  <Youtube className="w-3 h-3 fill-current" />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-white text-base">{chan.name}</h3>
                <p className="text-xs text-slate-400">
                  {chan.handle} · <span className="text-slate-300 font-semibold">{chan.subscribers}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                chan.status === 'Connected'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : chan.status === 'Pending'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                ● {chan.status}
              </span>

              <div className="relative">
                <button
                  onClick={() => setMenuOpenId(menuOpenId === chan.id ? null : chan.id)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {menuOpenId === chan.id && (
                  <div className="absolute right-0 mt-1 w-44 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl p-1 z-20 text-xs space-y-1">
                    <button
                      onClick={() => {
                        showToast(`Refreshed OAuth credentials for ${chan.name}`, 'success');
                        setMenuOpenId(null);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200"
                    >
                      Refresh Token
                    </button>
                    <button
                      onClick={() => {
                        disconnectChannel(chan.id);
                        setMenuOpenId(null);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-rose-950/40 text-rose-400"
                    >
                      Revoke Permissions
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connect Modal */}
      <ConnectChannelModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
      />
    </div>
  );
};
