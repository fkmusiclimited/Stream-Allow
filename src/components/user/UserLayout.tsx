import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  PlusCircle,
  Video,
  ListVideo,
  Youtube,
  BarChart3,
  CreditCard,
  Receipt,
  User,
  Bell,
  Headphones,
  HelpCircle,
  Gift,
  KeyRound,
  ShieldCheck,
  LogOut,
  Radio,
  Search,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';

interface UserLayoutProps {
  children: React.ReactNode;
}

export const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  const {
    currentPath,
    navigate,
    currentUser,
    adminImpersonatorUser,
    exitImpersonation,
    isUserPlanActive,
    currency,
    setCurrency,
    notifications,
    markNotificationRead
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = notifications.filter(n => !n.read).length;

  const userNavItems = [
    { label: 'Dashboard', path: 'user/dashboard', icon: LayoutDashboard },
    { label: 'Create Stream', path: 'user/create-stream', icon: PlusCircle, isCta: true },
    { label: 'My Streams', path: 'user/my-streams', icon: Video },
    { label: 'Playlist', path: 'user/playlist', icon: ListVideo },
    { label: 'Analytics', path: 'user/analytics', icon: BarChart3 },
    { label: 'Subscription', path: 'user/subscription', icon: CreditCard },
    { label: 'Payments', path: 'user/payment-history', icon: Receipt },
    { label: 'Profile Settings', path: 'user/profile', icon: User },
    { label: 'Notification Settings', path: 'user/notifications', icon: Bell },
    { label: 'Support', path: 'user/support', icon: Headphones },
    { label: 'Help Center', path: 'user/help-center', icon: HelpCircle },
    { label: 'Refer & Earn', path: 'user/refer-earn', icon: Gift },
    { label: 'API Access', path: 'user/api-access', icon: KeyRound },
    { label: 'Logout', path: 'user/logout', icon: LogOut }
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop matching reference 12 / reference image 3 */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0D121F] border-r border-slate-800 shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* Brand Header */}
        <div
          onClick={() => navigate('public/home')}
          className="p-5 border-b border-slate-800 flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF1B6B] to-[#E11D48] flex items-center justify-center text-white shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1">
              Stream <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF1B6B] to-[#FF4585]">Join</span>
            </span>
            <span className="text-[10px] text-slate-400 block -mt-1 font-medium">User Dashboard</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1 flex-1">
          {userNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            if (item.isCta) {
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className="w-full my-2 py-2.5 px-3.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-500/20 flex items-center gap-2.5 transition-all transform active:scale-95"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#FF1B6B]/15 text-[#FF1B6B] border border-[#FF1B6B]/25 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF1B6B]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Current Plan Mini Box */}
        <div className="p-3 m-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Current Plan</span>
            {isUserPlanActive ? (
              <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Active
              </span>
            ) : (
              <span className="text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded animate-pulse">
                Inactive
              </span>
            )}
          </div>
          <div className="font-bold text-white text-sm">
            {currentUser?.plan || 'Basic'} Plan
          </div>
          <button
            onClick={() => navigate('user/subscription')}
            className={`w-full py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              isUserPlanActive
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'gradient-brand text-white hover:opacity-95 shadow-md shadow-rose-600/30'
            }`}
          >
            {isUserPlanActive ? 'Manage Subscription' : 'Activate Plan'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Impersonation Notice Banner */}
        {(adminImpersonatorUser || currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
          <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 border-b border-rose-500/50 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs sticky top-0 z-40 shadow-lg">
            <div className="flex items-center gap-2 text-rose-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="font-extrabold text-white flex items-center gap-1.5 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                Admin Session
              </span>
              <span className="text-slate-300">
                Viewing User Dashboard (<strong>{currentUser?.name}</strong> - {currentUser?.email})
              </span>
            </div>
            <button
              onClick={() => {
                if (adminImpersonatorUser) {
                  exitImpersonation();
                } else {
                  navigate('admin/dashboard');
                }
              }}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all cursor-pointer transform active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Super Admin</span>
            </button>
          </div>
        )}

        {/* Top Header Bar matching reference image 3 */}
        <header className="sticky top-0 z-30 h-16 bg-[#0B0F17]/95 backdrop-blur border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search streams, playlists, channels..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">

            {/* Return to Admin Button in Header (Visible when Admin is visiting user account or admin navigating) */}
            {(adminImpersonatorUser || currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
              <button
                onClick={() => {
                  if (adminImpersonatorUser) {
                    exitImpersonation();
                  } else {
                    navigate('admin/dashboard');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 cursor-pointer"
                title="Return to Admin Panel"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>&gt; Super Admin &lt;</span>
              </button>
            )}

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF1B6B] ring-2 ring-[#0B0F17]" />
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-white">
                    <span>Notifications ({unreadCount} new)</span>
                    <button
                      onClick={() => notifications.forEach(n => markNotificationRead(n.id))}
                      className="text-[11px] text-[#FF1B6B] hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-2.5 rounded-xl text-xs space-y-1 cursor-pointer transition-colors ${
                          n.read ? 'bg-slate-900/40 text-slate-400' : 'bg-slate-900 border border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="font-semibold text-white flex items-center justify-between">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-slate-500">{n.time}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={currentUser?.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FF1B6B]/40"
                />
                <span className="hidden sm:block text-xs font-bold text-white text-left">
                  {currentUser?.name || 'Fahim'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1">
                  <div className="p-2 border-b border-slate-800">
                    <p className="font-bold text-white">{currentUser?.name}</p>
                    <p className="text-slate-400 text-[11px] truncate">{currentUser?.email}</p>
                  </div>
                  <button
                    onClick={() => { navigate('user/profile'); setProfileDropdownOpen(false); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={() => { navigate('user/subscription'); setProfileDropdownOpen(false); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Subscription Plan</span>
                  </button>
                  <button
                    onClick={() => { navigate('public/home'); setProfileDropdownOpen(false); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span>View Public Website</span>
                  </button>

                  {adminImpersonatorUser && (
                    <div className="pt-1 border-t border-slate-800">
                      <button
                        onClick={() => {
                          exitImpersonation();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 flex items-center gap-2 font-bold cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-rose-400" />
                        <span>Return to Admin Account</span>
                      </button>
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      onClick={() => { navigate('user/logout'); setProfileDropdownOpen(false); }}
                      className="w-full text-left p-2 rounded-lg hover:bg-rose-950/40 text-rose-400 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-64 max-w-xs bg-[#0D121F] border-r border-slate-800 h-full flex flex-col p-4 z-50">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FF1B6B] flex items-center justify-center text-white">
                    <Radio className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-white text-base">Stream Join</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-1">
                {userNavItems.map(item => (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                      currentPath === item.path ? 'bg-[#FF1B6B] text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
