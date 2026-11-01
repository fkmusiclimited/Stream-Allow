import React from 'react';
import { useApp } from '../../context/AppContext';
import { Headphones, Globe2, Sparkles, Target, Compass, Award, ArrowRight } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { navigate } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      {/* Top Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF1B6B]/10 border border-[#FF1B6B]/30 text-[#FF1B6B] text-xs font-bold uppercase tracking-wider">
            About Us
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            We Help Creators Go Live Easily and Grow Faster
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Stream Join is a modern platform designed for YouTube creators, music labels, radio stations, and businesses to manage and grow their live streams easily. Our mission is to make live streaming simple, powerful and accessible to everyone.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={() => navigate('public/pricing')}
              className="px-6 py-3 rounded-xl font-bold text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-500/20 flex items-center gap-2 text-sm"
            >
              <span>Explore Plans</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('public/features')}
              className="px-6 py-3 rounded-xl font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sm"
            >
              See All Features
            </button>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl p-1 bg-gradient-to-b from-slate-700/50 to-slate-900">
            <img
              src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80"
              alt="Stream Join Creator Workstation"
              className="rounded-xl w-full h-[360px] object-cover filter brightness-90"
            />
            <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-950/80 backdrop-blur border border-white/10 text-xs text-slate-200">
              <span className="font-bold text-white block">Engineered for Zero Downtime</span>
              Continuous RTMP distribution across global cloud edge nodes.
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Mission */}
        <div className="p-8 rounded-2xl bg-[#0F1626]/80 border border-slate-800/80 space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Target className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white">Our Mission</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            To empower creators with simple and powerful streaming tools that eliminate high hardware costs and complex setups.
          </p>
        </div>

        {/* Vision */}
        <div className="p-8 rounded-2xl bg-[#0F1626]/80 border border-slate-800/80 space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FF1B6B]/10 border border-[#FF1B6B]/20 text-[#FF1B6B] flex items-center justify-center">
            <Compass className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white">Our Vision</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            To be the most trusted platform for YouTube live streaming worldwide, helping millions of creators broadcast uninterrupted.
          </p>
        </div>

        {/* Values */}
        <div className="p-8 rounded-2xl bg-[#0F1626]/80 border border-slate-800/80 space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white">Our Values</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Simplicity, Reliability, Innovation and Creator Success guide every line of code and feature we engineer.
          </p>
        </div>
      </div>

      {/* Team / Story highlight */}
      <div className="p-8 sm:p-10 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h4 className="text-lg font-bold text-white">Built by Streamers, for Streamers</h4>
          <p className="text-xs sm:text-sm text-slate-400">
            Founded with roots in Bangladesh and serving a worldwide audience of creators across Asia, Europe, and the Americas.
          </p>
        </div>
        <button
          onClick={() => navigate('public/contact')}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors shrink-0"
        >
          Get in Touch With Us
        </button>
      </div>
    </div>
  );
};
