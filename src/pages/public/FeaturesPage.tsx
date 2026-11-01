import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Link2,
  ListVideo,
  Settings,
  Users2,
  BarChart3,
  Headphones,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Video,
  Clock,
  ArrowRight
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  const { navigate } = useApp();

  const coreFeatures = [
    {
      icon: Link2,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      title: 'Easy YouTube Integration',
      desc: 'Connect your YouTube channel in just a few clicks with official Google OAuth 2.0.'
    },
    {
      icon: ListVideo,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      title: 'Playlist Streaming',
      desc: 'Stream multiple videos in a continuous seamless playlist with automated shuffling or ordered playback.'
    },
    {
      icon: Settings,
      color: 'text-[#FF1B6B]',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      title: 'Auto Live Streaming',
      desc: 'Schedule and automate your live streams 24/7 with auto-recovery on network drops.'
    },
    {
      icon: Users2,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      title: 'Multiple Accounts',
      desc: 'Manage multiple YouTube channels easily from one unified dashboard without re-logging.'
    },
    {
      icon: BarChart3,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      title: 'Analytics',
      desc: 'Track your stream performance, real-time concurrent viewership and audience growth metrics.'
    },
    {
      icon: Headphones,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      title: '24/7 Support',
      desc: 'We are always here to help you via live in-dashboard chat, ticket system and priority escalation.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF1B6B]">Features</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Powerful Features for YouTube Live Streaming
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Everything you need to create, manage and grow your live streams in one place.
        </p>
      </div>

      {/* 6 Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {coreFeatures.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="p-8 rounded-2xl bg-[#0F1626]/80 border border-slate-800 hover:border-slate-700 hover:bg-[#121B2F] transition-all group space-y-4"
            >
              <div className={`w-14 h-14 rounded-2xl ${feat.bgColor} ${feat.borderColor} border ${feat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#FF1B6B] transition-colors">
                {feat.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {feat.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Deep Dive Feature Highlights */}
      <div className="p-8 sm:p-12 rounded-3xl bg-[#0D1322] border border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">High Reliability</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Never Let Your YouTube Live Stream Stop
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Standard broadcasting tools like OBS require your computer to run 24 hours a day, heating your GPU and consuming bandwidth. Stream Join handles RTMP encoding in enterprise cloud clusters.
          </p>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full 1080p60 high-definition video encoding</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Auto-reconnect if YouTube experiences momentary stream latency</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pre-scheduled calendar broadcasts with customized countdown timers</span>
            </li>
          </ul>
          <button
            onClick={() => navigate('public/pricing')}
            className="px-6 py-3 rounded-xl font-bold text-white gradient-brand hover:opacity-95 text-xs sm:text-sm shadow-lg shadow-rose-500/20 flex items-center gap-2"
          >
            <span>Start Streaming Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-black/60 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
            <span className="font-semibold text-slate-300">Cloud Stream Monitor</span>
            <span className="text-emerald-400 font-mono">Status: Optimal</span>
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Encoding Protocol:</span>
              <span className="text-white">RTMPS / TLS 1.3</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Output Resolution:</span>
              <span className="text-white">1920x1080 @ 60fps</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Keyframe Interval:</span>
              <span className="text-white">2.00 seconds (GOP 120)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Audio Format:</span>
              <span className="text-white">AAC Stereo 256kbps 48kHz</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
