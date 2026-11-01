import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  UserCheck,
  UserX,
  CreditCard,
  PlusCircle,
  Search,
  MoreVertical,
  X,
  ShieldCheck,
  ExternalLink,
  HardDrive,
  Clock,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { User } from '../../types';

export const UserManagementPage: React.FC = () => {
  const { users, addUser, updateUserStatus, renewUserPlan, expireUserPlan, impersonateUser, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // New user form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState<'Basic' | 'Pro' | 'Business'>('Pro');

  // Count active vs expired plans across platform
  const activePlanCount = users.filter(u => {
    const days = u.renewalDaysLeft !== undefined ? u.renewalDaysLeft : 24;
    return days > 0 && u.status === 'Active';
  }).length;

  const expiredPlanCount = users.filter(u => {
    const days = u.renewalDaysLeft !== undefined ? u.renewalDaysLeft : 24;
    return days <= 0 || u.status === 'Suspended' || u.status === 'Pending';
  }).length;

  const filteredUsers = users.filter(u => {
    const daysLeft = u.renewalDaysLeft !== undefined ? u.renewalDaysLeft : 24;
    const isExpired = daysLeft <= 0 || u.status === 'Suspended' || u.status === 'Pending';
    const isPlanActive = !isExpired && u.status === 'Active';

    let matchesPlan = true;
    if (planFilter === 'Plan Active') {
      matchesPlan = isPlanActive;
    } else if (planFilter === 'Plan Expire') {
      matchesPlan = isExpired;
    } else if (planFilter !== 'All') {
      matchesPlan = u.plan === planFilter;
    }

    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchesPlan && matchesSearch;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      showToast('Please enter name and email.', 'error');
      return;
    }
    const maxGB = newPlan === 'Business' ? 100 : newPlan === 'Pro' ? 25 : 5;
    addUser({
      name: newName,
      email: newEmail,
      plan: newPlan,
      status: 'Active',
      usedStorageGB: 0.0,
      maxStorageGB: maxGB,
      renewalDate: 'Nov 30, 2026',
      renewalDaysLeft: 30
    });
    setAddModalOpen(false);
    setNewName('');
    setNewEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Header matching reference 2 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">All Users</h1>
          <p className="text-xs text-slate-400">Manage all registered creators and their live stream subscription plans.</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* 4 Stat Boxes: Total Users, Plan Active, Paid Users, Plan Expire */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Total Users</span>
          <div className="text-2xl font-black text-white">{users.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Plan Active</span>
          <div className="text-2xl font-black text-emerald-400">{activePlanCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Paid Plans</span>
          <div className="text-2xl font-black text-white">{users.filter(u => u.plan !== 'Basic').length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Plan Expire</span>
          <div className="text-2xl font-black text-rose-400">{expiredPlanCount}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by user name, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
          />
        </div>

        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
        >
          <option value="All">All Users</option>
          <option value="Plan Active">Plan Active</option>
          <option value="Plan Expire">Plan Expire</option>
          <option value="Basic">Basic Plan</option>
          <option value="Pro">Pro Plan</option>
          <option value="Business">Business Plan</option>
        </select>
      </div>

      {/* Users Table matching reference 2 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Storage (GB)</th>
                <th className="py-3.5 px-4">Joined</th>
                <th className="py-3.5 px-4">Renewal</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u, idx) => {
                const daysLeft = u.renewalDaysLeft !== undefined ? u.renewalDaysLeft : 24;
                const isExpired = daysLeft <= 0 || u.status === 'Suspended' || u.status === 'Pending';
                const isPlanActive = !isExpired && u.status === 'Active';

                return (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                        <span className="font-bold text-white">{u.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{u.email}</td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-slate-300 border border-slate-800">
                        {u.plan}
                      </span>
                    </td>

                    {/* Plan Status Column: Plan Active (Green) or Plan Expire (Red) */}
                    <td className="py-3 px-4">
                      {isPlanActive ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                          Plan Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 w-fit animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
                          Plan Expire
                        </span>
                      )}
                    </td>

                    {/* Storage Used Column */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <HardDrive className="w-3 h-3 text-slate-400" />
                          <span className="font-bold text-white">{u.usedStorageGB !== undefined ? u.usedStorageGB : (u.plan === 'Business' ? 42.8 : u.plan === 'Pro' ? 6.4 : 3.2)} GB</span>
                          <span className="text-slate-500">/ {u.maxStorageGB !== undefined ? u.maxStorageGB : (u.plan === 'Business' ? 100 : u.plan === 'Pro' ? 25 : 5)} GB</span>
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              ((u.usedStorageGB !== undefined ? u.usedStorageGB : (u.plan === 'Business' ? 42.8 : u.plan === 'Pro' ? 6.4 : 3.2)) /
                               (u.maxStorageGB !== undefined ? u.maxStorageGB : (u.plan === 'Business' ? 100 : u.plan === 'Pro' ? 25 : 5))) > 0.85
                                ? 'bg-rose-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.round(((u.usedStorageGB !== undefined ? u.usedStorageGB : (u.plan === 'Business' ? 42.8 : u.plan === 'Pro' ? 6.4 : 3.2)) / (u.maxStorageGB !== undefined ? u.maxStorageGB : (u.plan === 'Business' ? 100 : u.plan === 'Pro' ? 25 : 5))) * 100))}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-400">{u.joinedDate}</td>

                    {/* Renewal Date & Days Left Column - Red when expired */}
                    <td className="py-3 px-4">
                      {(() => {
                        const isWarning = daysLeft > 0 && daysLeft <= 5;

                        if (isExpired) {
                          return (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                              <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>{daysLeft === 0 ? 'Due Today (0d)' : `Expired (${Math.abs(daysLeft)}d ago)`}</span>
                            </div>
                          );
                        }

                        if (isWarning) {
                          return (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{daysLeft} days left</span>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{daysLeft} days left</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {u.renewalDate || 'Nov 30, 2026'}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Actions: Login as User, Plan Active (Renew) / Plan Expire */}
                    <td className="py-3 px-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === u.id ? null : u.id)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {actionMenuId === u.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl p-1.5 z-20 text-xs space-y-1">
                            <button
                              onClick={() => {
                                impersonateUser(u);
                                setActionMenuId(null);
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#FF1B6B]" />
                              <span>Login as User</span>
                            </button>

                            {isPlanActive ? (
                              <button
                                onClick={() => {
                                  expireUserPlan(u.id);
                                  setActionMenuId(null);
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-rose-400 flex items-center gap-2 font-semibold cursor-pointer transition-colors"
                              >
                                <UserX className="w-3.5 h-3.5 text-rose-400" />
                                <span>Plan Expire</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  renewUserPlan(u.id, 30);
                                  setActionMenuId(null);
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-emerald-400 flex items-center gap-2 font-semibold cursor-pointer transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Plan Active</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F1626] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Add New Platform User</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Mahfuzur Rahman"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subscription Plan</label>
                <select
                  value={newPlan}
                  onChange={e => setNewPlan(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="Basic">Basic Plan</option>
                  <option value="Pro">Pro Plan</option>
                  <option value="Business">Business Plan</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#FF1B6B] text-white font-bold text-xs"
              >
                Create User
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
