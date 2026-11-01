import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Lock, Bell, Link2, Upload, CheckCircle2, ShieldCheck } from 'lucide-react';

export const ProfileSettingsPage: React.FC = () => {
  const { currentUser, setCurrentUser, showToast, logActivity } = useApp();
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'notifications' | 'accounts'>('info');

  const [name, setName] = useState(currentUser?.name || 'Fahim Ahmed');
  const [email, setEmail] = useState(currentUser?.email || 'fahim@gmail.com');
  const [phone, setPhone] = useState('+880 1712-345678');
  const [language, setLanguage] = useState('English');
  const [avatar, setAvatar] = useState(currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');

  // Password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        name,
        email,
        avatar
      });
    }
    showToast('Profile information updated successfully!', 'success');
    logActivity('Updated user profile settings', 'user');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    showToast('Account password has been changed securely.', 'success');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Profile Settings</h1>
        <p className="text-xs text-slate-400">Update your account information and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Subnav Tabs matching reference 9 */}
        <div className="md:col-span-4 p-2 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <button
            onClick={() => setActiveTab('info')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeTab === 'info'
                ? 'bg-[#FF1B6B] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Personal Info</span>
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeTab === 'password'
                ? 'bg-[#FF1B6B] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Change Password</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeTab === 'notifications'
                ? 'bg-[#FF1B6B] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeTab === 'accounts'
                ? 'bg-[#FF1B6B] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Connected Accounts</span>
          </button>
        </div>

        {/* Right Settings Form Container matching reference 9 */}
        <div className="md:col-span-8 p-6 sm:p-8 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-6">
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">Profile Picture</label>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <img src={avatar} alt={name} className="w-16 h-16 rounded-full object-cover ring-2 ring-[#FF1B6B]" />
                  <div className="space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAvatar('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');
                        showToast('New avatar image chosen', 'info');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload New Photo</span>
                    </button>
                    <p className="text-[11px] text-slate-500">JPG, PNG (Max 2MB)</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">Language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                >
                  <option value="English">English</option>
                  <option value="Bengali">বাংলা (Bengali)</option>
                  <option value="Hindi">हिन्दी (Hindi)</option>
                  <option value="Spanish">Español</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30"
              >
                Update Password
              </button>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-400">Configure real-time push and email broadcast triggers.</p>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span>Stream Disconnection Emergency Alerts</span>
                  <input type="checkbox" defaultChecked className="rounded text-[#FF1B6B]" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Daily Viewership Digest</span>
                  <input type="checkbox" defaultChecked className="rounded text-[#FF1B6B]" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Google OAuth 2.0</p>
                  <p className="text-slate-400 text-[11px]">Connected as fahim@gmail.com</p>
                </div>
                <span className="text-emerald-400 font-semibold">Authorized</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
