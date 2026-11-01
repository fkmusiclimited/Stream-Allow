import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserPlus, Link2, Settings, PlayCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const { navigate } = useApp();

  const steps = [
    {
      num: '1',
      icon: UserPlus,
      title: 'Create Account',
      desc: 'Sign up and choose your plan. Instant setup with no complicated server configuration.'
    },
    {
      num: '2',
      icon: Link2,
      title: 'Connect YouTube',
      desc: 'Link your YouTube channel securely with one click using official Google OAuth 2.0.'
    },
    {
      num: '3',
      icon: Settings,
      title: 'Setup Stream',
      desc: 'Add videos or playlist, set stream title, resolution, schedule time and looping preference.'
    },
    {
      num: '4',
      icon: PlayCircle,
      title: 'Go Live',
      desc: 'Start your live stream on YouTube and watch your subscribers and revenue grow 24/7.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF1B6B]">Simple Onboarding</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          How Stream Join Works
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Get started in just a few simple steps and start your YouTube live stream.
        </p>
      </div>

      {/* 4 Steps Row with connecting arrows matching reference 5 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
        {steps.map((st, idx) => {
          const Icon = st.icon;
          return (
            <div
              key={idx}
              className="p-8 rounded-2xl bg-[#0F1626]/80 border border-slate-800 text-center space-y-4 hover:border-slate-700 transition-all flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-[#FF1B6B] flex items-center justify-center shadow-md">
                <Icon className="w-8 h-8" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#FF1B6B]/20 text-[#FF1B6B] font-extrabold text-sm flex items-center justify-center border border-[#FF1B6B]/40">
                {st.num}
              </div>
              <h3 className="text-lg font-bold text-white">{st.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Cloud Automation vs OBS Comparison Card */}
      <div className="p-8 sm:p-12 rounded-3xl bg-[#0D1322] border border-slate-800 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Why Stream Join Over Traditional PC Streaming?</h2>
          <p className="text-xs sm:text-sm text-slate-400">Save electricity, protect your computer, and ensure continuous live stream uptime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm">
          <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-3">
            <h4 className="font-bold text-rose-400 text-base">Traditional OBS / PC Streaming</h4>
            <ul className="space-y-2 text-slate-400">
              <li>❌ Requires PC running 24/7 (high electric bills)</li>
              <li>❌ Frame drops and buffering if local internet fluctuates</li>
              <li>❌ Risk of PC rebooting for OS updates or crashes</li>
              <li>❌ Heavy CPU and GPU load prevents other work</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-3">
            <h4 className="font-bold text-emerald-400 text-base">Stream Join Cloud Infrastructure</h4>
            <ul className="space-y-2 text-slate-300">
              <li>✅ Runs 24/7 on Google Cloud enterprise servers</li>
              <li>✅ 1 Gbps direct uplink into YouTube RTMP ingest</li>
              <li>✅ Automatic stream recovery and continuous playlist loop</li>
              <li>✅ Zero hardware load — manage everything from your phone</li>
            </ul>
          </div>
        </div>

        <div className="text-center pt-4">
          <button
            onClick={() => navigate('public/register')}
            className="px-8 py-3.5 rounded-xl font-bold text-white gradient-brand hover:opacity-95 shadow-xl shadow-rose-500/25 inline-flex items-center gap-2"
          >
            <span>Launch Your First Stream</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
