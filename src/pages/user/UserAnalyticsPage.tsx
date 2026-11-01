import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  Eye,
  Clock,
  Users,
  Video,
  Calendar,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export const UserAnalyticsPage: React.FC = () => {
  const { currentUser, userStreams, navigate } = useApp();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [metricTab, setMetricTab] = useState<'views' | 'watchTime' | 'subs'>('views');

  const streamsList = userStreams || [];
  const isNewAccount = streamsList.length === 0;

  // Chart data points
  const points = isNewAccount ? [] : [
    { label: 'Oct 1', views: 4200, height: 35 },
    { label: 'Oct 5', views: 5800, height: 48 },
    { label: 'Oct 10', views: 7400, height: 60 },
    { label: 'Oct 15', views: 6100, height: 50 },
    { label: 'Oct 20', views: 9200, height: 75 },
    { label: 'Oct 25', views: 11400, height: 88 },
    { label: 'Oct 30', views: 14800, height: 100 }
  ];

  return (
    <div className="space-y-6">
      {/* Header matching reference 6 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Analytics</h1>
          <p className="text-xs text-slate-400">Track your stream performance and audience growth.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 rounded-lg transition-all ${timeRange === '7d' ? 'bg-[#FF1B6B] text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 rounded-lg transition-all ${timeRange === '30d' ? 'bg-[#FF1B6B] text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-3 py-1 rounded-lg transition-all ${timeRange === '90d' ? 'bg-[#FF1B6B] text-white' : 'text-slate-400 hover:text-white'}`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* 4 Metric Cards matching reference 6 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Views</span>
            <Eye className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {isNewAccount ? '0' : (currentUser?.totalViews || '125K')}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{isNewAccount ? '0%' : '+12%'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Watch Time (Hours)</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {isNewAccount ? '0' : '4.2K'}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{isNewAccount ? '0%' : '+18%'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Subscribers</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {isNewAccount ? '0' : '+2.4K'}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{isNewAccount ? '0%' : '+25%'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Streams</span>
            <Video className="w-4 h-4 text-[#FF1B6B]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {streamsList.length}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{isNewAccount ? 'Clean History' : '+20%'}</span>
          </div>
        </div>
      </div>

      {/* Interactive Views Chart Container matching reference 6 */}
      <div className="p-6 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Views Growth Trend</h3>
            <p className="text-xs text-slate-400">Daily concurrent and on-demand YouTube watch hours</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold bg-slate-900 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setMetricTab('views')}
              className={`px-3 py-1 rounded ${metricTab === 'views' ? 'bg-[#FF1B6B] text-white' : 'text-slate-400'}`}
            >
              Views
            </button>
            <button
              onClick={() => setMetricTab('watchTime')}
              className={`px-3 py-1 rounded ${metricTab === 'watchTime' ? 'bg-[#FF1B6B] text-white' : 'text-slate-400'}`}
            >
              Watch Time
            </button>
            <button
              onClick={() => setMetricTab('subs')}
              className={`px-3 py-1 rounded ${metricTab === 'subs' ? 'bg-[#FF1B6B] text-white' : 'text-slate-400'}`}
            >
              Subscribers
            </button>
          </div>
        </div>

        {/* SVG Curve Line Graph or Empty State */}
        {isNewAccount ? (
          <div className="h-64 w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
              <TrendingUp className="w-6 h-6 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">No broadcast analytics yet</h4>
              <p className="text-xs text-slate-400 max-w-md">
                Once you start your first 24/7 continuous stream to YouTube, daily viewer engagement, watch duration, and concurrent peaks will display here in real time.
              </p>
            </div>
            <button
              onClick={() => navigate('user/create-stream')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
            >
              Start First Live Stream
            </button>
          </div>
        ) : (
          <div className="h-64 w-full relative pt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF1B6B" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid horizontal lines */}
              <line x1="0" y1="40" x2="700" y2="40" stroke="#1E293B" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="700" y2="90" stroke="#1E293B" strokeDasharray="3 3" />
              <line x1="0" y1="140" x2="700" y2="140" stroke="#1E293B" strokeDasharray="3 3" />
              <line x1="0" y1="190" x2="700" y2="190" stroke="#1E293B" />

              {/* Area under curve */}
              <path
                d="M 20,160 Q 120,130 220,110 T 420,70 T 580,40 T 680,20 L 680,190 L 20,190 Z"
                fill="url(#chartGradient)"
              />

              {/* Smooth Spline Line */}
              <path
                d="M 20,160 Q 120,130 220,110 T 420,70 T 580,40 T 680,20"
                fill="none"
                stroke="#FF1B6B"
                strokeWidth="3.5"
              />

              {/* Data points */}
              {[
                { x: 20, y: 160, label: 'Oct 1' },
                { x: 120, y: 130, label: 'Oct 5' },
                { x: 220, y: 110, label: 'Oct 10' },
                { x: 320, y: 120, label: 'Oct 15' },
                { x: 420, y: 70, label: 'Oct 20' },
                { x: 550, y: 45, label: 'Oct 25' },
                { x: 680, y: 20, label: 'Oct 30' }
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="5" fill="#FF1B6B" stroke="#FFFFFF" strokeWidth="2" />
                </g>
              ))}
            </svg>

            {/* X axis labels */}
            <div className="flex justify-between text-[11px] text-slate-500 pt-3">
              <span>Oct 1</span>
              <span>Oct 5</span>
              <span>Oct 10</span>
              <span>Oct 15</span>
              <span>Oct 20</span>
              <span>Oct 25</span>
              <span>Oct 30</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
