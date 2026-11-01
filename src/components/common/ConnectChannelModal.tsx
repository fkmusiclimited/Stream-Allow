import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Youtube, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ConnectChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectChannelModal: React.FC<ConnectChannelModalProps> = ({ isOpen, onClose }) => {
  const { connectChannel, showToast } = useApp();
  const [step, setStep] = useState<'auth' | 'select'>('auth');
  const [channelName, setChannelName] = useState('');
  const [handle, setHandle] = useState('');
  const [subscribers, setSubscribers] = useState('');

  if (!isOpen) return null;

  const handleSimulateGoogleOAuth = () => {
    setStep('select');
  };

  const handleConnect = (name: string, handl: string, subs: string, avatar: string) => {
    connectChannel({
      name,
      handle: handl.startsWith('@') ? handl : `@${handl}`,
      subscribers: subs || '50K subscribers',
      avatar,
      status: 'Connected',
      role: 'Owner'
    });
    onClose();
    setStep('auth');
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) {
      showToast('Please enter your channel name', 'error');
      return;
    }
    handleConnect(
      channelName,
      handle || `@${channelName.toLowerCase().replace(/\s+/g, '')}`,
      subscribers || '10K subscribers',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0D131F] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111827]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
              <Youtube className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Connect YouTube Channel</h3>
              <p className="text-xs text-slate-400">OAuth 2.0 Google API Integration</p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); setStep('auth'); }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'auth' ? (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
                  <Youtube className="w-7 h-7 fill-current" />
                </div>
                <h4 className="text-lg font-bold text-white">Link Your YouTube Account</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Stream Join requires permission to broadcast scheduled streams and read your live analytics via official YouTube Data API v3.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-300">Required Permissions:</div>
                <div className="flex items-center gap-2 text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Manage your YouTube live broadcasts and video streams</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>View YouTube channel metrics and concurrent viewership</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>256-Bit SSL Encrypted & Tokenized (Zero password storage)</span>
                </div>
              </div>

              <button
                onClick={handleSimulateGoogleOAuth}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 shadow-lg transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white">Select Channel or Add Details</h4>

              <div className="space-y-2">
                <div
                  onClick={() => handleConnect('Dhaka Beats Official', '@dhakabeats', '95K subscribers', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100')}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#FF1B6B] flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img src="https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100" className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div>
                      <p className="text-sm font-bold text-white">Dhaka Beats Official</p>
                      <p className="text-xs text-slate-400">@dhakabeats · 95K subscribers</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#FF1B6B]/20 text-[#FF1B6B]">Select</span>
                </div>

                <div
                  onClick={() => handleConnect('Lofi Rain Studio', '@lofirainstudio', '240K subscribers', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100')}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#FF1B6B] flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100" className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div>
                      <p className="text-sm font-bold text-white">Lofi Rain Studio</p>
                      <p className="text-xs text-slate-400">@lofirainstudio · 240K subscribers</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#FF1B6B]/20 text-[#FF1B6B]">Select</span>
                </div>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                <div className="relative flex justify-center text-xs text-slate-500 uppercase"><span className="bg-[#0D131F] px-2 font-semibold">Or enter manually</span></div>
              </div>

              <form onSubmit={handleCustomSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Channel Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bangladesh Esports Live"
                    value={channelName}
                    onChange={e => setChannelName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Handle</label>
                    <input
                      type="text"
                      placeholder="@handle"
                      value={handle}
                      onChange={e => setHandle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Subscribers Count</label>
                    <input
                      type="text"
                      placeholder="e.g. 50K"
                      value={subscribers}
                      onChange={e => setSubscribers(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#FF1B6B] hover:bg-[#E11D48] text-white font-bold text-xs transition-colors"
                >
                  Connect Custom Channel
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
