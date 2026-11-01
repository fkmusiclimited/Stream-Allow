import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Video,
  Youtube,
  CreditCard,
  Settings,
  AlertTriangle,
  ArrowRight,
  X,
  CheckCircle2
} from 'lucide-react';

export const HelpCenterPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<{ title: string; desc: string; articles: string[] } | null>(null);

  const categories = [
    {
      id: 'get-started',
      icon: BookOpen,
      color: 'text-blue-400',
      title: 'Getting Started',
      count: '5 articles',
      desc: 'First time setup, quickstart guide, and account verification.',
      articles: [
        'How to create your first 24/7 YouTube live stream in 3 minutes',
        'Understanding Stream Join cloud architecture and RTMP routing',
        'Inviting team members and assigning channel roles',
        'System requirements and mobile dashboard access'
      ]
    },
    {
      id: 'streaming',
      icon: Video,
      color: 'text-[#FF1B6B]',
      title: 'Live Streaming',
      count: '12 articles',
      desc: 'Bitrate settings, 1080p60 encoding, and continuous 24/7 loops.',
      articles: [
        'How to stream looping playlists without audio pops',
        'Recommended CBR video bitrate and 2.0s keyframe GOP for YouTube',
        'Scheduling broadcasts with customized countdown timers',
        'Monitoring stream health and viewer drop recovery'
      ]
    },
    {
      id: 'youtube',
      icon: Youtube,
      color: 'text-red-500',
      title: 'YouTube Setup',
      count: '8 articles',
      desc: 'OAuth connection, permissions, and YouTube Studio sync.',
      articles: [
        'How to enable 24-hour live streaming on YouTube',
        'Resolving Google OAuth permissions mismatches',
        'Connecting multiple brand accounts to one Stream Join dashboard',
        'YouTube Studio RTMP latency settings: Ultra-low vs Low'
      ]
    },
    {
      id: 'billing',
      icon: CreditCard,
      color: 'text-emerald-400',
      title: 'Billing & Subscription',
      count: '6 articles',
      desc: 'BDT & USD pricing, bKash/Nagad/Cards, and invoices.',
      articles: [
        'How to pay with bKash, Nagad or Rocket in Bangladesh',
        'Downloading official tax invoices and receipts',
        'Upgrading from Pro to Business plan seamlessly',
        'Our 7-day technical money-back guarantee policy'
      ]
    },
    {
      id: 'account',
      icon: Settings,
      color: 'text-purple-400',
      title: 'Account Settings',
      count: '7 articles',
      desc: 'Profile details, password changes, notifications, and security.',
      articles: [
        'Two-factor authentication (2FA) setup for staff and creators',
        'Managing push alerts for stream disconnects',
        'Updating login email and organization profile details'
      ]
    },
    {
      id: 'troubleshooting',
      icon: AlertTriangle,
      color: 'text-amber-400',
      title: 'Troubleshooting',
      count: '10 articles',
      desc: 'Fix buffering, bad audio sync, or offline stream key errors.',
      articles: [
        'YouTube shows "Stream key waiting" — how to force RTMP handshake',
        'Video stuttering on mobile viewers: adjusting keyframe interval',
        'Handling YouTube copyright Content ID claims on loop playlists',
        'What to do if local internet drops while cloud stream is running'
      ]
    }
  ];

  const filteredCategories = categories.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="text-center space-y-4 max-w-xl mx-auto">
        <h1 className="text-3xl font-extrabold text-white">Help Center</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Find answers to common questions and step-by-step streaming guides.
        </p>

        {/* Search Bar matching reference 12 */}
        <div className="relative pt-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-5" />
          <input
            type="text"
            placeholder="Search for help articles, setup guides, error codes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0F1626] border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B] shadow-xl"
          />
        </div>
      </div>

      {/* 6 Category Cards Grid matching reference 12 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              onClick={() => setSelectedTopic(cat)}
              className="p-6 rounded-2xl bg-[#0F1626] border border-slate-800 hover:border-slate-700 hover:bg-[#121B2F] transition-all cursor-pointer group space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                  {cat.count}
                </span>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-[#FF1B6B] transition-colors">
                {cat.title}
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed">
                {cat.desc}
              </p>

              <div className="pt-2 text-xs font-semibold text-[#FF1B6B] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Browse Guides</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Topic Articles Modal */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#0F1626] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">{selectedTopic.title}</h3>
                <p className="text-xs text-slate-400">{selectedTopic.desc}</p>
              </div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5">
              {selectedTopic.articles.map((art, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#FF1B6B] flex items-center justify-between gap-3 text-xs text-slate-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-medium">{art}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedTopic(null)}
                className="w-full py-2.5 rounded-xl bg-[#FF1B6B] font-bold text-xs text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
