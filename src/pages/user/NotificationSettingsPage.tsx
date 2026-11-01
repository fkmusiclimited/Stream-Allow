import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Radio, Mail, Tag, Receipt, Globe, CheckCircle2 } from 'lucide-react';

export const NotificationSettingsPage: React.FC = () => {
  const { showToast } = useApp();

  const [streamAlerts, setStreamAlerts] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(true);

  const handleSave = () => {
    showToast('Notification preferences saved successfully!', 'success');
  };

  const notificationOptions = [
    {
      id: 'stream',
      icon: Radio,
      title: 'Stream Alerts',
      desc: 'Get notified when your stream is live or if RTMP frames drop.',
      checked: streamAlerts,
      onChange: setStreamAlerts
    },
    {
      id: 'email',
      icon: Mail,
      title: 'Email Notifications',
      desc: 'Receive important updates and security alerts via email.',
      checked: emailNotifications,
      onChange: setEmailNotifications
    },
    {
      id: 'marketing',
      icon: Tag,
      title: 'Marketing Emails',
      desc: 'Receive YouTube tips, seasonal discounts and feature updates.',
      checked: marketingEmails,
      onChange: setMarketingEmails
    },
    {
      id: 'payment',
      icon: Receipt,
      title: 'Payment Alerts',
      desc: 'Get notified about payments, receipts and recurring invoices.',
      checked: paymentAlerts,
      onChange: setPaymentAlerts
    },
    {
      id: 'browser',
      icon: Globe,
      title: 'Browser Notifications',
      desc: 'Show real-time push notifications in your browser.',
      checked: browserNotifications,
      onChange: setBrowserNotifications
    }
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Notification Settings</h1>
        <p className="text-xs text-slate-400">Choose what notifications you want to receive.</p>
      </div>

      {/* 5 Toggle Cards matching reference 10 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-xl">
        {notificationOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <div key={opt.id} className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-[#FF1B6B] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{opt.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </div>
              </div>

              {/* iOS style toggle */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={opt.checked}
                  onChange={e => opt.onChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF1B6B]" />
              </label>
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30"
        >
          Save Notification Settings
        </button>
      </div>
    </div>
  );
};
