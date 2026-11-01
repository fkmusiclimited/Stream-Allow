import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  PlusCircle,
  Video,
  Eye,
  Users,
  Radio,
  Clock,
  ArrowRight,
  TrendingUp,
  Play,
  ListVideo,
  Youtube,
  ShieldCheck
} from 'lucide-react';

export const UserOverviewPage: React.FC = () => {
  const { currentUser, userStreams, isUserPlanActive, navigate, setActiveViewingStream } = useApp();

  const currentStreams = userStreams || [];
  const liveStreams = currentStreams.filter(s => s.status === 'live');
  const isNewAccount = currentStreams.length === 0;

  return (
    <div className="space-y-8">
      {/* Plan Inactive Notice Banner for Unpaid Users */}
      {!isUserPlanActive && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h3 className="font-bold text-white text-sm">Account Plan Inactive</h3>
            </div>
            <p className="text-xs text-rose-300">
              Your subscription is not active. Activate a plan now to start 24/7 live broadcasting to YouTube.
            </p>
          </div>
          <button
            onClick={() => navigate('user/subscription')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30 transition-all shrink-0 cursor-pointer"
          >
            Activate Plan Now
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#141B2D] via-[#161F33] to-[#0E1424] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Cloud Server Active · Dhaka / AP Region</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome Back, {currentUser?.name || 'Creator'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {isUserPlanActive 
              ? 'Ready to grow your audience today? Your 24/7 streams are running smoothly.' 
              : 'Activate your account plan to broadcast 24/7 continuous high-definition streams.'}
          </p>
        </div>

        <button
          onClick={() => navigate('user/create-stream')}
          className="px-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-white gradient-brand hover:opacity-95 shadow-xl shadow-rose-600/30 flex items-center gap-2 transition-all transform active:scale-95 shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Stream</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Streams</span>
            <Video className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{currentStreams.length}</div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{isNewAccount ? 'Clean History' : '+3 this month'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total Views</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{isNewAccount ? '0' : (currentUser?.totalViews || '0')}</div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{isNewAccount ? 'New Creator' : '+12% organic'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Subscribers Gained</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{isNewAccount ? '0' : '+2.4K'}</div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{isNewAccount ? 'Start broadcasting' : '+25% organic reach'}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Live Now</span>
            <Radio className="w-4 h-4 text-[#FF1B6B] animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#FF1B6B]">
            {liveStreams.length}
          </div>
          <div className="text-[11px] text-slate-400">
            {liveStreams.length > 0 ? 'Broadcasting 24/7 on YouTube' : 'No active broadcasts'}
          </div>
        </div>
      </div>

      {/* Recent Streams Section */}
      <div className="p-6 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Streams</h2>
            <p className="text-xs text-slate-400">Manage and preview your active and upcoming broadcasts</p>
          </div>
          {currentStreams.length > 0 && (
            <button
              onClick={() => navigate('user/my-streams')}
              className="text-xs font-semibold text-[#FF1B6B] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {currentStreams.length === 0 ? (
          <div className="py-12 px-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center">
              <Video className="w-6 h-6 text-slate-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-sm">No Broadcasts Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your account history is clean. Create your first 24/7 stream using an MP4 video or playlist.
              </p>
            </div>
            <button
              onClick={() => navigate('user/create-stream')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/20 inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Stream</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {currentStreams.slice(0, 4).map((str) => (
              <div
                key={str.id}
                onClick={() => setActiveViewingStream(str)}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-all hover:bg-slate-900 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0">
                    <img
                      src={str.thumbnail}
                      alt={str.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white fill-current" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-[#FF1B6B] transition-colors">
                      {str.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>Channel: {str.channelName}</span>
                      <span>·</span>
                      <span>{str.resolution || '1080p'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  {str.status === 'live' && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-rose-600 text-white flex items-center gap-1.5 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        Live Now
                      </span>
                      <span className="text-slate-300 font-semibold">{str.viewers.toLocaleString()} watching</span>
                    </div>
                  )}

                  {str.status === 'scheduled' && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Scheduled
                      </span>
                      <span className="text-slate-400">{str.scheduledTime || 'Tomorrow 8:00 PM'}</span>
                    </div>
                  )}

                  {str.status === 'ended' && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400">
                        Ended
                      </span>
                      <span className="text-slate-400">{str.views} views</span>
                    </div>
                  )}

                  {str.status === 'failed' && (
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Launchpad Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => navigate('user/my-streams')}
          className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 hover:border-slate-700 cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-600/10 text-[#FF1B6B] flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm group-hover:text-[#FF1B6B] transition-colors">
              Manage Live Streams
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Monitor active broadcasts, schedule relays, and check stream health.
            </p>
          </div>
        </div>

        <div
          onClick={() => navigate('user/playlist')}
          className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 hover:border-slate-700 cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <ListVideo className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm group-hover:text-[#FF1B6B] transition-colors">
              Playlist Library
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Add continuous video loops or audio playlists.
            </p>
          </div>
        </div>

        <div
          onClick={() => navigate('user/support')}
          className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800 hover:border-slate-700 cursor-pointer space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm group-hover:text-[#FF1B6B] transition-colors">
              24/7 Creator Support
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Direct chat with our stream engineers anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
