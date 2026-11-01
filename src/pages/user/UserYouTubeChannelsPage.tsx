import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Youtube,
  PlusCircle,
  Settings,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  MoreVertical
} from 'lucide-react';
import { ConnectChannelModal } from '../../components/common/ConnectChannelModal';

export const UserYouTubeChannelsPage: React.FC = () => {
  const { channels, disconnectChannel, showToast } = useApp();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleSync = (name: string) => {
    showToast(`Synced subscriber count & live broadcast status for ${name}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header matching reference 5 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Connected YouTube Channels</h1>
          <p className="text-xs text-slate-400">Manage your YouTube channels and connect new channels.</p>
        </div>
        <button
          onClick={() => setConnectModalOpen(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Connect Channel</span>
        </button>
      </div>

      {/* Connected Channel Cards List matching reference 5 */}
      <div className="space-y-3">
        {channels.map((chan) => (
          <div
            key={chan.id}
            className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={chan.avatar}
                  alt={chan.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-700"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white shadow">
                  <Youtube className="w-3 h-3 fill-current" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">{chan.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {chan.role || 'Owner'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {chan.handle} · <span className="text-slate-300 font-semibold">{chan.subscribers}</span>
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>OAuth 2.0 Live Streaming Scope: Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                chan.status === 'Connected'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                <span className={`w-2 h-2 rounded-full ${chan.status === 'Connected' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {chan.status}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSync(chan.name)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Sync YouTube metrics"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === chan.id ? null : chan.id)}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {activeMenuId === chan.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl p-1 z-30 text-xs space-y-1">
                      <button
                        onClick={() => { handleSync(chan.name); setActiveMenuId(null); }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200"
                      >
                        Re-authorize Token
                      </button>
                      <button
                        onClick={() => { disconnectChannel(chan.id); setActiveMenuId(null); }}
                        className="w-full text-left p-2 rounded-lg hover:bg-rose-950/40 text-rose-400"
                      >
                        Disconnect Channel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connect Channel Modal */}
      <ConnectChannelModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
      />
    </div>
  );
};
