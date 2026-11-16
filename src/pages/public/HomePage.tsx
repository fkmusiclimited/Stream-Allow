import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Youtube,
  Radio,
  Play,
  Pause,
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
  Sparkles,
  Check,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { navigate, currency, setCurrency, formatPrice, plans, homepageDemoConfig } = useApp();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isDemoPlaying, setIsDemoPlaying] = useState(true);
  const [isDemoMuted, setIsDemoMuted] = useState(true);
  const demoVideoRef = useRef<HTMLVideoElement>(null);

  const demoConfig = homepageDemoConfig || {
    title: 'Relaxing LoFi Music 24/7',
    channelName: 'Music World',
    viewersText: '1.2K watching',
    videoUrl: '/uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80',
    resolution: '1080p · 60 FPS',
    bitrate: '4,500 kbps'
  };

  const handleChoosePlan = (planId: 'basic' | 'pro' | 'business') => {
    try {
      localStorage.setItem('streamjoin_selected_plan', planId);
    } catch {}
    navigate('public/register');
  };

  const handleSeeDemo = () => {
    setIsDemoModalOpen(true);
    setIsDemoPlaying(true);
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
                Stream Allow
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
              Automate, Manage and Grow Your YouTube Live Streams Easily. Perfect for music, radio, gaming, podcasts and 24/7 channels.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => navigate('public/register')}
                className="px-7 py-3.5 rounded-xl font-bold text-white gradient-brand hover:opacity-95 shadow-xl shadow-rose-500/25 flex items-center gap-2.5 transition-all transform active:scale-95 cursor-pointer"
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
                    <span className="ml-2 text-xs font-mono text-slate-400">streamallow.cloud/live/control-center</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE NOW
                  </span>
                </div>

                {/* Simulated Live Studio Broadcast */}
                <div className="relative aspect-video group cursor-pointer" onClick={handleSeeDemo}>
                  <img
                    src={demoConfig.thumbnailUrl}
                    alt={demoConfig.title}
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80';
                    }}
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
                      <p className="font-bold text-sm">{demoConfig.title}</p>
                      <p className="text-slate-300 text-[11px]">Channel: {demoConfig.channelName} · {demoConfig.viewersText}</p>
                    </div>
                    <div className="bg-black/60 px-2.5 py-1 rounded backdrop-blur border border-white/10 font-mono text-[11px]">
                      {demoConfig.resolution}
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
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">How Stream Allow Works</h3>
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

      {/* Pricing Section on Home Page */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF1B6B]">Flexible Plans</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Simple & Affordable Pricing
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Choose the best plan for your YouTube live streaming needs.
          </p>

          {/* Currency Switcher */}
          <div className="inline-flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setCurrency('BDT')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                currency === 'BDT'
                  ? 'bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              BDT (৳ - Bangladesh Taka)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD ($ - International)
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards Grid: Basic, Pro, Business */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((p) => {
            const isPro = p.id === 'pro';
            return (
              <div
                key={p.id}
                className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all ${
                  isPro
                    ? 'bg-gradient-to-b from-[#141C2E] to-[#0D1322] border-2 border-[#FF1B6B] shadow-2xl shadow-rose-950/40 md:-translate-y-2'
                    : 'bg-[#0F1626]/80 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Most Popular Badge */}
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] text-white shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{p.tagline}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-black text-white">
                      {formatPrice(p.priceUSD, p.priceBDT)}
                    </span>
                    <span className="text-xs text-slate-400">/month</span>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 space-y-3 text-xs sm:text-sm">
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-slate-300">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPro ? 'text-[#FF1B6B]' : 'text-emerald-400'}`} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => handleChoosePlan(p.id)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all transform active:scale-95 cursor-pointer ${
                      isPro
                        ? 'text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30'
                        : 'text-white bg-slate-850 hover:bg-slate-700 border border-slate-700 bg-slate-900'
                    }`}
                  >
                    Get Started
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 bg-gradient-to-r from-[#FF1B6B]/90 via-[#E11D48] to-[#9333EA] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-extrabold">Ready to Boost Your YouTube Watch Time?</h3>
            <p className="text-sm text-white/90 max-w-lg">
              Join 10,000+ creators and media channels broadcasting live around the clock with Stream Allow.
            </p>
          </div>
          <button
            onClick={() => navigate('public/register')}
            className="px-8 py-3.5 rounded-xl font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-xl transition-all transform active:scale-95 shrink-0 cursor-pointer"
          >
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Homepage Dedicated Demo Preview Modal (Isolated from Dashboard Real Streams) */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-[#0D131F] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111827]/90">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF1B6B] to-[#FF4585] flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base sm:text-lg">
                      {demoConfig.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      DEMO PREVIEW
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Channel: {demoConfig.channelName} · 24/7 Cloud RTMP Simulation · {demoConfig.resolution} · Zero Buffer
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close demo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Display */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video
                key={demoConfig.videoUrl}
                ref={demoVideoRef}
                src={demoConfig.videoUrl}
                poster={demoConfig.thumbnailUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted={isDemoMuted}
                playsInline
              />

              {/* Top simulation badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white pointer-events-none">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span>{demoConfig.viewersText} in demo</span>
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-emerald-400 pointer-events-none">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Cloud Server Active · 0% Buffer</span>
              </div>

              {/* Bottom Player Controls Bar */}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (demoVideoRef.current) {
                        if (isDemoPlaying) {
                          demoVideoRef.current.pause();
                        } else {
                          demoVideoRef.current.play().catch(() => {});
                        }
                      }
                      setIsDemoPlaying(!isDemoPlaying);
                    }}
                    className="w-9 h-9 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-200 transition-colors shadow-lg cursor-pointer"
                  >
                    {isDemoPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (demoVideoRef.current) {
                        demoVideoRef.current.muted = !isDemoMuted;
                      }
                      setIsDemoMuted(!isDemoMuted);
                    }}
                    className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title={isDemoMuted ? 'Unmute' : 'Mute'}
                  >
                    {isDemoMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  <span className="text-xs text-slate-300 font-mono">
                    {isDemoPlaying ? 'PREVIEW ACTIVE' : 'PAUSED'} · 1080p60 · 4,500 kbps
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDemoModalOpen(false);
                      navigate('public/register');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
