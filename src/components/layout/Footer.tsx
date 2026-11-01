import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Radio, Youtube, Twitter, Facebook, Instagram, ShieldCheck, Mail, ArrowRight } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigate, showToast } = useApp();
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    showToast('Subscribed to YouTube Live Streaming newsletter!', 'success');
    setEmail('');
  };

  return (
    <footer className="bg-[#080C14] border-t border-slate-800/80 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div
              onClick={() => navigate('public/home')}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF1B6B] to-[#E11D48] flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                <Radio className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                Stream <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF1B6B] to-[#FF5E8E]">Join</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Stream Join is an international-standard cloud streaming automation platform for YouTube creators, record labels, and broadcasters. Stream continuous playlists 24/7 with zero local CPU overhead.
            </p>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-white cursor-pointer transition-colors">
                <Youtube className="w-4 h-4 text-red-500" />
              </span>
              <span className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-white cursor-pointer transition-colors">
                <Twitter className="w-4 h-4 text-sky-400" />
              </span>
              <span className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-white cursor-pointer transition-colors">
                <Facebook className="w-4 h-4 text-blue-500" />
              </span>
              <span className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-white cursor-pointer transition-colors">
                <Instagram className="w-4 h-4 text-pink-400" />
              </span>
            </div>
          </div>

          {/* Product links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigate('public/features')} className="hover:text-white transition-colors">Features</button></li>
              <li><button onClick={() => navigate('public/pricing')} className="hover:text-white transition-colors">Pricing & Plans</button></li>
              <li><button onClick={() => navigate('public/how-it-works')} className="hover:text-white transition-colors">How It Works</button></li>
              <li><button onClick={() => navigate('public/services')} className="hover:text-white transition-colors">Streaming Services</button></li>
              <li><button onClick={() => navigate('user/dashboard')} className="hover:text-white transition-colors">Creator Dashboard</button></li>
            </ul>
          </div>

          {/* Company & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Company</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigate('public/about')} className="hover:text-white transition-colors">About Us</button></li>
              <li><button onClick={() => navigate('public/blog')} className="hover:text-white transition-colors">Latest Articles</button></li>
              <li><button onClick={() => navigate('public/faq')} className="hover:text-white transition-colors">FAQ & Answers</button></li>
              <li><button onClick={() => navigate('public/contact')} className="hover:text-white transition-colors">Contact Us</button></li>
              <li><button onClick={() => navigate('public/terms')} className="hover:text-white transition-colors">Terms of Service</button></li>
              <li><button onClick={() => navigate('public/privacy')} className="hover:text-white transition-colors">Privacy Policy</button></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Get Updates</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Get creator tips, YouTube algorithm updates, and feature alerts.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-2.5 rounded bg-[#FF1B6B] hover:bg-[#E11D48] text-white text-xs flex items-center justify-center transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Certified YouTube API Partner Compliance</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Stream Join. All rights reserved. BDT & USD billing ready.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('public/terms')} className="hover:text-slate-300">Terms</button>
            <button onClick={() => navigate('public/privacy')} className="hover:text-slate-300">Privacy</button>
            <button onClick={() => navigate('admin/dashboard')} className="hover:text-slate-300 flex items-center gap-1">
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
