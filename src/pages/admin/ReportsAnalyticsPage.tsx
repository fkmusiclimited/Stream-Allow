import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  Users,
  Video,
  DollarSign,
  Clock,
  Globe,
  Calendar,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';

export const ReportsAnalyticsPage: React.FC = () => {
  const { formatPrice } = useApp();
  const [range, setRange] = useState('30d');

  const countryStats = [
    { country: 'Bangladesh', percent: 45, color: 'bg-emerald-500' },
    { country: 'India', percent: 22, color: 'bg-blue-500' },
    { country: 'USA', percent: 12, color: 'bg-rose-500' },
    { country: 'UK', percent: 8, color: 'bg-purple-500' },
    { country: 'Others', percent: 13, color: 'bg-slate-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Header matching reference 13 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Reports & Analytics</h1>
          <p className="text-xs text-slate-400">Track your platform growth and streaming infrastructure load.</p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Last 30 Days</span>
        </div>
      </div>

      {/* 4 Stat Boxes matching reference 13 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Total Users</span>
          <div className="text-2xl font-black text-white">12.5K</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>+14%</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Total Streams</span>
          <div className="text-2xl font-black text-white">3.2K</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>+22%</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Total Revenue</span>
          <div className="text-2xl font-black text-white">{formatPrice(12458, 1495000)}</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>+12%</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Live Hours</span>
          <div className="text-2xl font-black text-[#FF1B6B]">856</div>
          <div className="text-[11px] text-slate-400 font-medium">Cloud RTMP Ingest</div>
        </div>
      </div>

      {/* Charts Grid: User Growth + Traffic by Country matching reference 13 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* User Growth Line Chart */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">User Growth</h3>

          <div className="h-56 w-full relative pt-4">
            <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
              <line x1="0" y1="30" x2="500" y2="30" stroke="#1E293B" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#1E293B" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#1E293B" strokeDasharray="3 3" />
              <line x1="0" y1="155" x2="500" y2="155" stroke="#1E293B" />

              <path
                d="M 10,135 Q 90,110 180,90 T 320,60 T 420,35 T 490,15 L 490,155 L 10,155 Z"
                fill="rgba(255, 27, 107, 0.15)"
              />
              <path
                d="M 10,135 Q 90,110 180,90 T 320,60 T 420,35 T 490,15"
                fill="none"
                stroke="#FF1B6B"
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

        {/* Traffic by Country matching reference 13 */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">Traffic by Country</h3>

          <div className="space-y-3 pt-2">
            {countryStats.map((cs) => (
              <div key={cs.country} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">{cs.country}</span>
                  <span className="font-bold text-white font-mono">{cs.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div className={`h-full ${cs.color} rounded-full`} style={{ width: `${cs.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Hostinger VPS & FFmpeg Worker Telemetry */}
      <div className="p-6 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Ubuntu 24.04 VPS & FFmpeg Worker Node Telemetry
            </h3>
            <p className="text-xs text-slate-400">Real-time CPU, RAM, active transcode streams, and PostgreSQL engine health.</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Node Online
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">CPU Core Load</span>
            <div className="text-xl font-bold text-white font-mono">14.2%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '14.2%' }} />
            </div>
            <span className="text-[10px] text-slate-500">2 vCPUs Available</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">RAM Memory</span>
            <div className="text-xl font-bold text-white font-mono">2.1 GB / 8 GB</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: '26%' }} />
            </div>
            <span className="text-[10px] text-slate-500">26% Utilized</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">FFmpeg Live Workers</span>
            <div className="text-xl font-bold text-[#FF1B6B] font-mono">2 Active PIDs</div>
            <div className="text-[10px] text-emerald-400 font-medium">Auto-Recovery Active</div>
            <span className="text-[10px] text-slate-500">Multi-tenant isolated</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">PostgreSQL Relational DB</span>
            <div className="text-xl font-bold text-white font-mono">Active Pool</div>
            <div className="text-[10px] text-emerald-400 font-medium">Max 20 Connections</div>
            <span className="text-[10px] text-slate-500">Auto-Schema Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
