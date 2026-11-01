import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  Mail,
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export const NotificationManagementPage: React.FC = () => {
  const { sendNotification, showToast } = useApp();
  const [channelTab, setChannelTab] = useState<'in_app' | 'email' | 'sms'>('in_app');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('All Users');

  const [recentNotifications, setRecentNotifications] = useState([
    { title: 'New Feature Released', target: 'Sent to all users', date: 'Oct 30, 2026' },
    { title: 'System Maintenance', target: 'Sent to all users', date: 'Oct 29, 2026' },
    { title: 'New Pricing Plan', target: 'Sent to all users', date: 'Oct 28, 2026' },
    { title: 'Discount Offer', target: 'Sent to all users', date: 'Oct 27, 2026' },
    { title: 'Important Update', target: 'Sent to all users', date: 'Oct 26, 2026' }
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Please enter both title and message.', 'error');
      return;
    }

    sendNotification(title, message, targetAudience);
    setRecentNotifications(prev => [
      { title, target: `Sent to ${targetAudience.toLowerCase()}`, date: 'Oct 30, 2026' },
      ...prev
    ]);

    setTitle('');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Send Notification</h1>
        <p className="text-xs text-slate-400">Broadcast notifications to users via in-app alerts, email and SMS.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Send Form matching reference 14 */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-5">
          {/* Channel Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold w-fit">
            <button
              onClick={() => setChannelTab('in_app')}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                channelTab === 'in_app' ? 'bg-[#FF1B6B] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              In-App
            </button>
            <button
              onClick={() => setChannelTab('email')}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                channelTab === 'email' ? 'bg-[#FF1B6B] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Email
            </button>
            <button
              onClick={() => setChannelTab('sms')}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                channelTab === 'sms' ? 'bg-[#FF1B6B] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              SMS
            </button>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter notification title..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Message</label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Send To</label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
              >
                <option value="All Users">All Users (12,548 creators)</option>
                <option value="Paid Users">Paid Users (Pro & Business)</option>
                <option value="Inactive Users">Inactive Users (30+ days)</option>
                <option value="Trial Users">Trial Users</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send Notification</span>
            </button>
          </form>
        </div>

        {/* Right Recent Notifications Feed matching reference 14 */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">Recent Notifications</h3>

          <div className="space-y-3">
            {recentNotifications.map((notif, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-white">{notif.title}</h4>
                  <p className="text-[11px] text-slate-400">{notif.target}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">{notif.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
