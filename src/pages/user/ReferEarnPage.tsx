import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Gift,
  Copy,
  Share2,
  Users,
  DollarSign,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export const ReferEarnPage: React.FC = () => {
  const { currentUser, formatPrice, showToast } = useApp();
  const referralLink = `https://streamjoin.com/ref/${currentUser?.name.toLowerCase().replace(/\s+/g, '') || 'fahim123'}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(referralLink);
    showToast('Referral link copied to clipboard!', 'success');
  };

  const handleShare = (platform: string) => {
    showToast(`Opening share intent for ${platform}...`, 'info');
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Refer & Earn</h1>
        <p className="text-xs text-slate-400">Invite your creator friends and earn 10% recurring commissions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Referral Link Box matching reference 13 */}
        <div className="md:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF1B6B]">Creator Partner Program</span>
            <h2 className="text-xl font-bold text-white">Your Referral Link</h2>
            <p className="text-xs text-slate-400">
              Share this link with fellow YouTubers, labels and streamers. When they subscribe, you earn rewards every month.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>

          {/* Share on Social Media Buttons matching reference 13 */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-slate-300 block">Share on Social Media:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleShare('Facebook')}
                className="px-4 py-2 rounded-xl bg-[#1877F2]/20 border border-[#1877F2]/40 text-[#1877F2] hover:bg-[#1877F2] hover:text-white text-xs font-bold transition-all"
              >
                Facebook
              </button>
              <button
                onClick={() => handleShare('Twitter / X')}
                className="px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 hover:bg-sky-500 hover:text-white text-xs font-bold transition-all"
              >
                Twitter / X
              </button>
              <button
                onClick={() => handleShare('WhatsApp')}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-bold transition-all"
              >
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Right Stats & How it Works matching reference 13 */}
        <div className="md:col-span-5 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Total Referrals</span>
              <div className="text-2xl font-black text-white">12</div>
              <span className="text-[11px] text-slate-500 block">Pending: {formatPrice(12, 1440)}</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Total Earned</span>
              <div className="text-2xl font-black text-[#FF1B6B]">{formatPrice(36, 4320)}</div>
              <span className="text-[11px] text-emerald-400 font-medium block">Paid to bKash</span>
            </div>
          </div>

          {/* How It Works Steps matching reference 13 */}
          <div className="p-6 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-3">
            <h4 className="font-bold text-white text-sm">How It Works?</h4>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#FF1B6B]/20 text-[#FF1B6B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Share your referral link with creators</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#FF1B6B]/20 text-[#FF1B6B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Your friend creates an account</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#FF1B6B]/20 text-[#FF1B6B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>They subscribe to any plan (Basic, Pro, Business)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#FF1B6B]/20 text-[#FF1B6B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                <span className="font-semibold text-emerald-400">You earn 10% commission every billing cycle!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
