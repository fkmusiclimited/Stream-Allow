import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  CreditCard,
  Youtube,
  Mail,
  HardDrive,
  Database,
  ShieldAlert,
  Save,
  CheckCircle2
} from 'lucide-react';

export const SystemSettingsPage: React.FC = () => {
  const { systemSettings, updateSystemSettings, showToast } = useApp();
  const [subTab, setSubTab] = useState<'general' | 'payments' | 'youtube' | 'smtp' | 'storage' | 'backup' | 'maintenance'>('general');

  // Form states
  const [websiteName, setWebsiteName] = useState(systemSettings.websiteName);
  const [websiteUrl, setWebsiteUrl] = useState(systemSettings.websiteUrl);
  const [adminEmail, setAdminEmail] = useState(systemSettings.adminEmail);
  const [timezone, setTimezone] = useState(systemSettings.timezone);
  const [language, setLanguage] = useState(systemSettings.language);

  // Payment gateways
  const [bkashNumber, setBkashNumber] = useState(systemSettings.bKashMerchantNumber);
  const [nagadId, setNagadId] = useState(systemSettings.nagadMerchantId);
  const [stripeKey, setStripeKey] = useState(systemSettings.stripePublicKey);

  // YouTube API
  const [youtubeApiKey, setYoutubeApiKey] = useState(systemSettings.youtubeApiKey);
  const [youtubeClientId, setYoutubeClientId] = useState(systemSettings.youtubeClientId);

  // Maintenance mode
  const [maintenance, setMaintenance] = useState(systemSettings.maintenanceMode);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings({
      websiteName,
      websiteUrl,
      adminEmail,
      timezone,
      language,
      bKashMerchantNumber: bkashNumber,
      nagadMerchantId: nagadId,
      stripePublicKey: stripeKey,
      youtubeApiKey,
      youtubeClientId,
      maintenanceMode: maintenance
    });
  };

  const navItems = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'payments', label: 'Payment Gateways', icon: CreditCard },
    { id: 'youtube', label: 'YouTube API', icon: Youtube },
    { id: 'smtp', label: 'SMTP Settings', icon: Mail },
    { id: 'storage', label: 'Storage Settings', icon: HardDrive },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'maintenance', label: 'Maintenance Mode', icon: ShieldAlert }
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">System Settings</h1>
        <p className="text-xs text-slate-400">Configure your website, payment gateways, and platform settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Subtab Navigation matching reference 16 */}
        <div className="md:col-span-4 p-2 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = subTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSubTab(item.id as any)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                  isSelected
                    ? 'bg-[#FF1B6B] text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Form matching reference 16 */}
        <div className="md:col-span-8 p-6 sm:p-8 rounded-2xl bg-[#0F1626] border border-slate-800">
          <form onSubmit={handleSave} className="space-y-5">
            {subTab === 'general' && (
              <>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">General Settings</h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Website Name</label>
                  <input
                    type="text"
                    required
                    value={websiteName}
                    onChange={e => setWebsiteName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Website URL</label>
                  <input
                    type="url"
                    required
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Timezone</label>
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                    >
                      <option value="Asia/Dhaka (GMT+6)">Asia/Dhaka (GMT+6)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="America/New_York (EST)">America/New_York (EST)</option>
                      <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Default Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                    >
                      <option value="English">English</option>
                      <option value="Bengali">Bengali (বাংলা)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {subTab === 'payments' && (
              <>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Payment Gateway Configurations</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">bKash Merchant Number</label>
                  <input
                    type="text"
                    value={bkashNumber}
                    onChange={e => setBkashNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nagad Merchant ID</label>
                  <input
                    type="text"
                    value={nagadId}
                    onChange={e => setNagadId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stripe Public Key</label>
                  <input
                    type="text"
                    value={stripeKey}
                    onChange={e => setStripeKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
              </>
            )}

            {subTab === 'youtube' && (
              <>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">YouTube API & OAuth Credentials</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">YouTube Data API v3 Key</label>
                  <input
                    type="password"
                    value={youtubeApiKey}
                    onChange={e => setYoutubeApiKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">OAuth 2.0 Web Client ID</label>
                  <input
                    type="text"
                    value={youtubeClientId}
                    onChange={e => setYoutubeClientId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                </div>
              </>
            )}

            {subTab === 'smtp' && (
              <>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">SMTP Mail Server Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Host</label>
                    <input type="text" defaultValue="smtp.sendgrid.net" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Port</label>
                    <input type="number" defaultValue={587} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                </div>
              </>
            )}

            {subTab === 'storage' && (
              <>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Cloud Storage Engine</h3>
                <p className="text-xs text-slate-400">Google Cloud Storage Multi-Region (Asia-South1) active for thumbnail & video assets.</p>
              </>
            )}

            {subTab === 'backup' && (
              <>
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Database Backup & Recovery</h3>
                <button
                  type="button"
                  onClick={() => showToast('Full database snapshot initiated (backup_20261030.sql)', 'success')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700"
                >
                  Create Manual Backup Snapshot
                </button>
              </>
            )}

            {subTab === 'maintenance' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Maintenance Mode</h3>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <p className="font-bold text-white text-xs">Enable Maintenance Screen</p>
                    <p className="text-[11px] text-slate-400">Public visitors will see a maintenance notice; active streams continue running.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={maintenance}
                    onChange={e => setMaintenance(e.target.checked)}
                    className="w-5 h-5 rounded text-[#FF1B6B]"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
