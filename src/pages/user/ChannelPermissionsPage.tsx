import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Youtube,
  Users,
  UserPlus,
  X,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { YouTubeChannel } from '../../types';

export const ChannelPermissionsPage: React.FC = () => {
  const { channels, updateChannelRole, showToast } = useApp();
  const [selectedChan, setSelectedChan] = useState<YouTubeChannel | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Editor' | 'Viewer'>('Editor');

  const handleRoleChange = (chanId: string, newRole: YouTubeChannel['role']) => {
    updateChannelRole(chanId, newRole);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    showToast(`Access invitation sent to ${inviteEmail} as ${inviteRole}`, 'success');
    setSelectedChan(null);
    setInviteEmail('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Channel Permissions</h1>
        <p className="text-xs text-slate-400">Manage team roles and collaborator access to your connected YouTube channels.</p>
      </div>

      {/* Channels List matching reference 15 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-xl">
        {channels.map((chan) => (
          <div key={chan.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img src={chan.avatar} alt={chan.name} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700" />
              <div>
                <h3 className="font-bold text-white text-sm">{chan.name}</h3>
                <p className="text-xs text-slate-400">{chan.handle} · {chan.subscribers}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Role Dropdown */}
              <select
                value={chan.role || 'Owner'}
                onChange={e => handleRoleChange(chan.id, e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
              >
                <option value="Owner">Owner</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
              </select>

              <button
                onClick={() => setSelectedChan(chan)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Manage Access
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Manage Access Modal */}
      {selectedChan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F1626] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Manage Channel Access</h3>
                <p className="text-xs text-slate-400">{selectedChan.name}</p>
              </div>
              <button onClick={() => setSelectedChan(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Invite Collaborator Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                >
                  <option value="Editor">Editor (Can create and stop streams)</option>
                  <option value="Viewer">Viewer (Can view analytics and status only)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-[#FF1B6B]" />
                  <span>Scoped Token Security</span>
                </div>
                <p>Team members will never have access to your Google or YouTube account credentials.</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30"
              >
                Send Invitation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
