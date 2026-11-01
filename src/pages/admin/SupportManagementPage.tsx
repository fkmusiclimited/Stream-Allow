import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Headphones,
  Search,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  X,
  Send
} from 'lucide-react';
import { SupportTicket } from '../../types';

export const SupportManagementPage: React.FC = () => {
  const { tickets, replyTicket, updateTicketStatus, showToast } = useApp();
  const [filter, setFilter] = useState<'all' | 'Open' | 'Pending' | 'Resolved'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  const filteredTickets = tickets.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    replyTicket(selectedTicket.id, replyText, 'agent');
    setReplyText('');
    showToast('Reply dispatched to creator email & dashboard.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header matching reference 9 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Support Tickets</h1>
          <p className="text-xs text-slate-400">Manage customer support requests and stream troubleshooting.</p>
        </div>
      </div>

      {/* Tabs matching reference 9 */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'all' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          All (56)
        </button>
        <button
          onClick={() => setFilter('Open')}
          className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'Open' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Open (12)
        </button>
        <button
          onClick={() => setFilter('Pending')}
          className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'Pending' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Pending (18)
        </button>
        <button
          onClick={() => setFilter('Resolved')}
          className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'Resolved' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Resolved (24)
        </button>
      </div>

      {/* Support Tickets Table matching reference 9 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTickets.map((t, idx) => (
                <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>

                  <td className="py-3 px-4 font-bold text-white">
                    {t.userName}
                  </td>

                  <td className="py-3 px-4 text-slate-200 max-w-xs truncate font-medium">
                    {t.subject}
                  </td>

                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'Open'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : t.status === 'Pending'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {t.status}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.priority === 'High'
                        ? 'bg-rose-500/10 text-rose-400'
                        : t.priority === 'Medium'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {t.priority}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-400">{t.createdAt}</td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-[#FF1B6B] hover:text-white text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
                    >
                      Respond
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-[#0F1626] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">{selectedTicket.subject}</h3>
                <p className="text-xs text-slate-400">User: {selectedTicket.userName} ({selectedTicket.userEmail})</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Mark Status:</span>
              {(['Open', 'Pending', 'Resolved'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => {
                    updateTicketStatus(selectedTicket.id, st);
                    setSelectedTicket({ ...selectedTicket, status: st });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    selectedTicket.status === st ? 'bg-[#FF1B6B] text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              {selectedTicket.messages.map((m, idx) => (
                <div key={idx} className="text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-bold text-slate-200">{m.senderName}</span>
                    <span className="text-[10px] text-slate-500">{m.timestamp}</span>
                  </div>
                  <p className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    {m.text}
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendReply} className="flex gap-2 pt-2">
              <input
                type="text"
                required
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type response to creator..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#FF1B6B] text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
