import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  PlusCircle,
  Search,
  MoreVertical,
  X,
  UserCheck,
  Trash2,
  Lock
} from 'lucide-react';
import { StaffMember } from '../../types';

export const StaffRolesPage: React.FC = () => {
  const { staff, addStaff, updateStaffStatus, showToast } = useApp();
  const [tab, setTab] = useState<'all' | 'Admins' | 'Managers' | 'Support' | 'Custom'>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // New staff form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffMember['role']>('Support');

  const filteredStaff = staff.filter(s => {
    if (tab === 'all') return true;
    if (tab === 'Admins') return s.role === 'Super Admin' || s.role === 'Admin';
    if (tab === 'Managers') return s.role === 'Manager' || s.role === 'Finance';
    if (tab === 'Support') return s.role === 'Support' || s.role === 'Moderator';
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    addStaff({
      name,
      email,
      role,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      permissions: [role.toLowerCase()]
    });

    setAddModalOpen(false);
    setName('');
    setEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Header matching reference 8 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Staff Members</h1>
          <p className="text-xs text-slate-400">Manage admin roles, managers and support staff permissions.</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Staff</span>
        </button>
      </div>

      {/* Tabs matching reference 8 */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setTab('all')}
          className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'all' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          All Staff (12)
        </button>
        <button
          onClick={() => setTab('Admins')}
          className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'Admins' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Admins (3)
        </button>
        <button
          onClick={() => setTab('Managers')}
          className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'Managers' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Managers (4)
        </button>
        <button
          onClick={() => setTab('Support')}
          className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'Support' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Support (4)
        </button>
        <button
          onClick={() => setTab('Custom')}
          className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'Custom' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Custom Roles
        </button>
      </div>

      {/* Staff Table matching reference 8 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStaff.map((st, idx) => (
                <tr key={st.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img src={st.avatar} alt={st.name} className="w-8 h-8 rounded-full object-cover" />
                      <span className="font-bold text-white">{st.name}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      st.role === 'Super Admin'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : st.role === 'Manager'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {st.role}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {st.email}
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {st.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => showToast(`Permissions matrix opened for ${st.name}`, 'info')}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F1626] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Invite Staff Member</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Staff Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Tariqul Islam"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tariqul@streamjoin.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Staff Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Support">Support Manager</option>
                  <option value="Finance">Finance Manager</option>
                  <option value="Moderator">Moderator</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#FF1B6B] text-white font-bold text-xs"
              >
                Send Staff Invitation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
