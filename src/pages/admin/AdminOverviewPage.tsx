import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  CreditCard,
  DollarSign,
  Video,
  Radio,
  Youtube,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const { formatPrice, navigate, activityLogs } = useApp();

  return (
    <div className="space-y-8">
      {/* Welcome Banner matching reference 1 */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#141B2E] via-[#161F33] to-[#0E1424] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome Back, Admin!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Here&apos;s what&apos;s happening with your platform today.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Calendar className="w-4 h-4 text-[#FF1B6B]" />
          <span>Oct 30, 2026</span>
        </div>
      </div>

      {/* 6 Top Stat Cards matching reference 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">Total Users</span>
          <div className="text-2xl font-black text-white">12,548</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+14%</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">Paid Users</span>
          <div className="text-2xl font-black text-emerald-400">2,843</div>
          <div className="text-[11px] text-slate-500">22.6% conversion</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">Total Revenue</span>
          <div className="text-2xl font-black text-white">{formatPrice(12458, 1495000)}</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+18%</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">Active Streams</span>
          <div className="text-2xl font-black text-white">126</div>
          <div className="text-[11px] text-slate-500">99.98% cloud health</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">Live Streams</span>
          <div className="text-2xl font-black text-[#FF1B6B] flex items-center gap-2">
            <span>28</span>
            <span className="w-2 h-2 rounded-full bg-[#FF1B6B] animate-ping" />
          </div>
          <div className="text-[11px] text-rose-400">RTMP Broadcasting</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">YouTube Channels</span>
          <div className="text-2xl font-black text-white">1,256</div>
          <div className="text-[11px] text-slate-500">OAuth tokens valid</div>
        </div>
      </div>

      {/* Revenue Overview & Recent Activities matching reference 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Revenue Overview</span>
              <div className="text-xl font-black text-white mt-0.5">
                {formatPrice(12458, 1495000)}{' '}
                <span className="text-xs font-semibold text-emerald-400 ml-1">+18% this month</span>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-semibold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
              This Month
            </span>
          </div>

          {/* SVG Spline */}
          <div className="h-56 w-full relative pt-2">
            <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0B0F17" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="35" x2="600" y2="35" stroke="#1E293B" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="600" y2="80" stroke="#1E293B" strokeDasharray="3 3" />
              <line x1="0" y1="125" x2="600" y2="125" stroke="#1E293B" strokeDasharray="3 3" />
              <line x1="0" y1="170" x2="600" y2="170" stroke="#1E293B" />

              <path
                d="M 10,140 Q 100,120 180,95 T 350,75 T 480,45 T 590,25 L 590,170 L 10,170 Z"
                fill="url(#adminRevGrad)"
              />
              <path
                d="M 10,140 Q 100,120 180,95 T 350,75 T 480,45 T 590,25"
                fill="none"
                stroke="#6366F1"
                strokeWidth="3.5"
              />
            </svg>
            <div className="flex justify-between text-[11px] text-slate-500 pt-2 font-mono">
              <span>Oct 1</span>
              <span>Oct 5</span>
              <span>Oct 10</span>
              <span>Oct 15</span>
              <span>Oct 20</span>
              <span>Oct 25</span>
              <span>Oct 30</span>
            </div>
          </div>
        </div>

        {/* Recent Activities Feed matching reference 1 */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm">Recent Activities</h3>
            <button
              onClick={() => navigate('admin/security')}
              className="text-[11px] text-[#FF1B6B] hover:underline"
            >
              All Logs
            </button>
          </div>

          <div className="space-y-3.5">
            {[
              { text: 'New user registered', user: 'Shakib Khan', time: '5 min ago', color: 'bg-emerald-500' },
              { text: 'New payment received', user: 'Fahim Ahmed (৳2,990)', time: '12 min ago', color: 'bg-[#FF1B6B]' },
              { text: 'Stream started', user: 'Relaxing Music Live', time: '24 min ago', color: 'bg-blue-500' },
              { text: 'Playlist created', user: 'LoFi Chillhop Tape', time: '1 hour ago', color: 'bg-purple-500' },
              { text: 'Subscription upgraded', user: 'Rakib Hasan (Business)', time: '2 hours ago', color: 'bg-amber-500' }
            ].map((act, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <span className={`w-2 h-2 rounded-full ${act.color} mt-1.5 shrink-0`} />
                <div className="flex-1 space-y-0.5">
                  <p className="font-medium text-slate-200">{act.text}</p>
                  <p className="text-[11px] text-slate-500">{act.user}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
