import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Youtube,
  Radio,
  Play,
  ArrowRight,
  ShieldCheck,
  Zap,
  ListVideo,
  Layers,
  BarChart3,
  Clock,
  Headphones,
  CheckCircle2,
  Users,
  Eye,
  Sparkles
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { navigate, streams, setActiveViewingStream } = useApp();

  const handleSeeDemo = () => {
    // Open the first live stream in full broadcast modal
    const liveStream = streams.find(s => s.status === 'live') || streams[0];
    setActiveViewingStream(liveStream);
  };

  const featureCards = [
    {
      icon: Zap,
      title: 'Easy Setup',
      desc: 'Link your channel in seconds and launch a continuous stream without installing any software.'
    },
    {
      icon: ListVideo,
      title: 'Playlist Streaming',
      desc: 'Queue dozens of videos into an automated repeating loop that never buffers.'
    },
    {
      icon: Layers,
      title: 'Multiple Accounts',
      desc: 'Connect and manage up to unlimited YouTube channels from a single unified hub.'
    },
    {
      icon: Clock,
      title: 'Auto Streaming',
      desc: 'Schedule broadcasts ahead of time with auto-restart on network drop.'
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      desc: 'Live viewer counts, watch-time graphs, and peak engagement reports.'
    },
    {
      icon: ShieldCheck,
      title: 'Secure & Reliable',
      desc: '99.9% uptime backed by Google Cloud enterprise compute and OAuth 2.0.'
    }
  ];

  return (
    <div className="space-y-24 pb-20 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#FF1B6B]/20 via-[#4F46E5]/15 to-transparent blur-[120px] rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-6 space-y-6 text-left relative z-10">
            {/* YouTube Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/10 border border-red-500/25 text-red-400 text-xs font-semibold">
              <Youtube className="w-4 h-4 fill-current text-red-500" />
              <span>YouTube Certified Streaming Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Grow Your YouTube Live Stream with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF1B6B] via-[#FF4585] to-[#E11D48]">
                Stream Join
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
              Automate, Manage and Grow Your YouTube Live Streams Easily. Perfect for music, radio, gaming, podcasts and 24/7 channels.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => navigate('public/pricing')}
                className="px-7 py-3.5 rounded-xl font-bold text-white gradient-brand hover:opacity-95 shadow-xl shadow-rose-500/25 flex items-center gap-2.5 transition-all transform active:scale-95"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleSeeDemo}
                className="px-6 py-3.5 rounded-xl font-semibold text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-2.5 transition-all"
              >
                <Play className="w-4 h-4 text-[#FF1B6B] fill-current" />
                <span>See Demo</span>
              </button>
            </div>

            {/* Quick trust metrics */}
            <div className="pt-4 flex items-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No credit card needed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instant channel sync</span>
              </div>
            </div>
          </div>

          {/* Right Hero Visual Mockup */}
          <div className="lg:col-span-6 relative z-10">
            <div className="relative rounded-2xl p-1 bg-gradient-to-b from-slate-700/60 via-slate-800/40 to-slate-900/80 shadow-2xl">
              <div className="relative rounded-xl overflow-hidden bg-[#0D121E] border border-slate-800">
                {/* Simulated Screen Header */}
                <div className="px-4 py-3 bg-[#111827] border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="ml-2 text-xs font-mono text-slate-400">streamjoin.cloud/live/control-center</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE NOW
                  </span>
                </div>

                {/* Simulated Live Studio Broadcast */}
                <div className="relative aspect-video group cursor-pointer" onClick={handleSeeDemo}>
                  <img
                    src="https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80"
                    alt="Stream Join Live Broadcast"
                    className="w-full h-full object-cover brightness-[0.7] group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                  {/* Play overlay button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#FF1B6B]/90 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play className="w-7 h-7 fill-current ml-1" />
                    </div>
                  </div>

                  {/* Live overlay tags */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                    <div>
                      <p className="font-bold text-sm">Relaxing LoFi Music 24/7</p>
                      <p className="text-slate-300 text-[11px]">Channel: Music World · 1.2K watching</p>
                    </div>
                    <div className="bg-black/60 px-2.5 py-1 rounded backdrop-blur border border-white/10 font-mono text-[11px]">
                      1080p · 60 FPS
                    </div>
                  </div>
                </div>

                {/* Sub-bar stats inside mockup */}
                <div className="p-4 bg-[#0A0E17] grid grid-cols-3 gap-2 text-center text-xs border-t border-slate-800/80">
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Bitrate</span>
                    <span className="font-bold text-slate-100">4,500 kbps</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Loop Status</span>
                    <span className="font-bold text-emerald-400">Repeating (24/7)</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Health</span>
                    <span className="font-bold text-emerald-400">Excellent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counters Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-8 rounded-2xl bg-[#0F1626]/80 border border-slate-800/80 backdrop-blur-md">
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-white">10K+</div>
            <div className="text-xs sm:text-sm font-medium text-slate-400">Active Users</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-white">50M+</div>
            <div className="text-xs sm:text-sm font-medium text-slate-400">Live Views Generated</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-white">99.9%</div>
            <div className="text-xs sm:text-sm font-medium text-slate-400">Uptime Reliability</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-white">24/7</div>
            <div className="text-xs sm:text-sm font-medium text-slate-400">Live Stream & Tech Support</div>
          </div>
        </div>
      </section>

      {/* Features Grid: Everything You Need for YouTube Live Streaming */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF1B6B]">Cloud Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Everything You Need for YouTube Live Streaming
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Run uninterrupted 24/7 streams from our high-performance cloud servers without exhausting your computer or home Wi-Fi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-7 rounded-2xl bg-[#0F1626]/70 border border-slate-800 hover:border-slate-700 hover:bg-[#121B2F] transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-[#FF1B6B] group-hover:scale-110 group-hover:bg-[#FF1B6B] group-hover:text-white transition-all shadow-md">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{feat.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it Works Preview on Home */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#101728] to-[#0A0E18] border border-slate-800 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#FF1B6B]">Fast Onboarding</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">How Stream Join Works</h3>
            <p className="text-xs sm:text-sm text-slate-400">Get started in just a few simple steps and launch your live broadcast.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up and choose your plan with instant activation.' },
              { step: '2', title: 'Connect YouTube', desc: 'Link your YouTube channel securely via official OAuth 2.0.' },
              { step: '3', title: 'Setup Stream', desc: 'Add videos, playlists and configure title and resolution.' },
              { step: '4', title: 'Go Live', desc: 'Start your cloud live stream and grow views and subscribers 24/7.' }
            ].map((st, i) => (
              <div key={i} className="text-center p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                <div className="w-10 h-10 mx-auto rounded-full bg-[#FF1B6B]/20 text-[#FF1B6B] border border-[#FF1B6B]/30 flex items-center justify-center font-bold text-sm">
                  {st.step}
                </div>
                <h4 className="font-bold text-white text-base">{st.title}</h4>
                <p className="text-xs text-slate-400">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 bg-gradient-to-r from-[#FF1B6B]/90 via-[#E11D48] to-[#9333EA] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-extrabold">Ready to Boost Your YouTube Watch Time?</h3>
            <p className="text-sm text-white/90 max-w-lg">
              Join 10,000+ creators and media channels broadcasting live around the clock with Stream Join.
            </p>
          </div>
          <button
            onClick={() => navigate('public/pricing')}
            className="px-8 py-3.5 rounded-xl font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-xl transition-all transform active:scale-95 shrink-0"
          >
            Start Free Trial
          </button>
        </div>
      </section>
    </div>
  );
};
