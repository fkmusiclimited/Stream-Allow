import React from 'react';
import { useApp } from '../../context/AppContext';
import { Music, Radio, Gamepad2, Mic, Film, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { navigate } = useApp();

  const services = [
    {
      title: 'Music Live Streaming',
      desc: 'Perfect for music labels, DJs, indie artists, and chill-hop channels wanting 24/7 music radio stations.',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      icon: Music,
      features: ['Automated album art display', 'Continuous audio normalization', 'Track title overlay bot']
    },
    {
      title: 'Radio Live Streaming',
      desc: 'Ideal for online radio stations, podcasts, community broadcasts, and live voice talk shows.',
      image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80',
      icon: Radio,
      features: ['Shoutcast & Icecast direct relay', '24/7 voice broadcast resilience', 'Multi-timezone scheduling']
    },
    {
      title: 'Gaming Live Streaming',
      desc: 'Stream your gameplay highlights, esports reruns, speedrun marathons, and community clips easily.',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
      icon: Gamepad2,
      features: ['60 FPS ultra-smooth playback', 'Dynamic overlay support', 'Instant playlist reshuffle']
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF1B6B]">Solutions</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Our Services
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Professional YouTube live streaming solutions for everyone.
        </p>
      </div>

      {/* 3 Main Service Cards matching reference 6 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {services.map((svc, idx) => {
          const Icon = svc.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl overflow-hidden bg-[#0F1626]/80 border border-slate-800 hover:border-slate-700 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={svc.image}
                    alt={svc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1626] to-transparent" />
                  <div className="absolute top-4 left-4 p-2.5 rounded-xl bg-slate-900/80 backdrop-blur border border-white/10 text-[#FF1B6B]">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <h3 className="text-xl font-bold text-white group-hover:text-[#FF1B6B] transition-colors">
                    {svc.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {svc.desc}
                  </p>

                  <div className="pt-3 space-y-2">
                    {svc.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <button
                  onClick={() => navigate('public/pricing')}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white border border-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Select Service</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise Custom Channels */}
      <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-slate-900 to-[#10192A] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Need a Dedicated 24/7 Channel Manager?</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Our Enterprise engineering team handles custom RTMP failover routing, video transcoding, and live moderation for large music labels and television networks.
          </p>
        </div>
        <button
          onClick={() => navigate('public/contact')}
          className="px-6 py-3 rounded-xl font-bold text-slate-900 bg-white hover:bg-slate-100 text-xs sm:text-sm transition-colors shrink-0"
        >
          Talk to Enterprise Sales
        </button>
      </div>
    </div>
  );
};
