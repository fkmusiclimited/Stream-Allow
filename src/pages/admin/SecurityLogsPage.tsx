import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, ShieldAlert, Download, Search, CheckCircle2 } from 'lucide-react';

export const SecurityLogsPage: React.FC = () => {
  const { activityLogs, showToast } = useApp();
  const [tab, setTab] = useState<'admin' | 'user' | 'system' | 'login'>('admin');
  const [search, setSearch] = useState('');

  const filteredLogs = activityLogs.filter(l => {
    const matchesTab = l.category === tab || tab === 'admin';
    const matchesSearch = l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.ipAddress.includes(search);
    return matchesTab && matchesSearch;
  });

  const handleExport = () => {
    showToast('Activity logs downloaded (audit_logs_oct2026.json)', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header matching reference 15 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Activity Logs</h1>
          <p className="text-xs text-slate-400">Monitor admin and system activities, authentications, and IP audit trails.</p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Logs</span>
        </button>
      </div>

      {/* Tabs matching reference 15 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setTab('admin')}
            className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'admin' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Admin Logs
          </button>
          <button
            onClick={() => setTab('user')}
            className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'user' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            User Logs
          </button>
          <button
            onClick={() => setTab('system')}
            className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'system' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            System Logs
          </button>
          <button
            onClick={() => setTab('login')}
            className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'login' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Login Logs
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search logs by IP, user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-60 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
          />
        </div>
      </div>

      {/* Logs Table matching reference 15 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Date / Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log, idx) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{log.user}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 border border-slate-800 text-slate-200">
                      {log.action}
                    </span>
                    {log.details && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">{log.details}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{log.ipAddress}</td>
                  <td className="py-3.5 px-4 text-slate-400">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
