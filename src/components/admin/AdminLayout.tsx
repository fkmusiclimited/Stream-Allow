import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Video,
  Youtube,
  ListVideo,
  CreditCard,
  Receipt,
  ShieldCheck,
  Headphones,
  Globe,
  Search,
  Megaphone,
  BarChart3,
  Bell,
  Lock,
  Settings,
  Radio,
  ExternalLink,
  ChevronDown,
  Menu,
  X,
  UserCheck
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const {
    currentPath,
    navigate,
    currentUser,
    currency,
    setCurrency,
    switchRole,
    impersonateUser,
    users,
    notifications,
    markNotificationRead
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const adminNavItems = [
    { label: 'Dashboard', path: 'admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: 'admin/users', icon: Users },
    { label: 'Streams', path: 'admin/streams', icon: Video },
    { label: 'YouTube Channels', path: 'admin/youtube', icon: Youtube },
    { label: 'Playlists', path: 'admin/playlists', icon: ListVideo },
    { label: 'Channel Permissions', path: 'admin/channel-permissions', icon: ShieldCheck },
    { label: 'Subscriptions', path: 'admin/subscriptions', icon: CreditCard },
    { label: 'Payments', path: 'admin/payments', icon: Receipt },
    { label: 'Staff & Roles', path: 'admin/staff', icon: ShieldCheck },
    { label: 'Support', path: 'admin/support', icon: Headphones },
    { label: 'Website', path: 'admin/website', icon: Globe },
    { label: 'SEO', path: 'admin/seo', icon: Search },
    { label: 'Marketing', path: 'admin/marketing', icon: Megaphone },
    { label: 'Analytics', path: 'admin/reports', icon: BarChart3 },
    { label: 'Notifications', path: 'admin/notifications', icon: Bell },
    { label: 'Security', path: 'admin/security', icon: Lock },
    { label: 'Settings', path: 'admin/settings', icon: Settings }
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop matching reference image 2 */}
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
            <div className="flex items-center gap-1.5 -mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Admin Control</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1 flex-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path === 'admin/streams' && currentPath === 'admin/create-stream');

            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#FF1B6B] text-white shadow-lg shadow-rose-500/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick jump to User view */}
        <div className="p-3 m-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-[11px] text-slate-400">View as User:</div>
          <button
            onClick={() => {
              const fahim = users.find(u => u.email === 'fahim@gmail.com') || users.find(u => u.role === 'user') || users[1];
              if (fahim) {
                impersonateUser(fahim);
              }
            }}
            className="w-full py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Fahim Ahmed Dashboard</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar matching reference image 2 */}
        <header className="sticky top-0 z-30 h-16 bg-[#0B0F17]/95 backdrop-blur border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search platform users, streams, transactions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#111827] border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                  alt="Admin"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-rose-500"
                />
                <div className="hidden sm:block text-left text-xs">
                  <div className="font-bold text-white leading-tight">Admin</div>
                  <div className="text-[10px] text-rose-400 font-semibold">Super Admin</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1">
                  <div className="p-2 border-b border-slate-800">
                    <p className="font-bold text-white">Super Administrator</p>
                    <p className="text-slate-400 text-[11px]">admin@streamjoin.com</p>
                  </div>
                  <button
                    onClick={() => { navigate('admin/settings'); setProfileDropdownOpen(false); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200"
                  >
                    System Settings
                  </button>
                  <button
                    onClick={() => { navigate('admin/security'); setProfileDropdownOpen(false); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200"
                  >
                    Security Logs
                  </button>
                  <button
                    onClick={() => { navigate('public/home'); setProfileDropdownOpen(false); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200"
                  >
                    Public Website
                  </button>
                  <div className="border-t border-slate-800 pt-1">
                    <button
                      onClick={() => { switchRole('guest'); setProfileDropdownOpen(false); }}
                      className="w-full text-left p-2 rounded-lg hover:bg-rose-950/40 text-rose-400"
                    >
                      Logout Admin
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
                <span className="font-extrabold text-white text-base">Admin Panel</span>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-1">
                {adminNavItems.map(item => {
                  const isActive = currentPath === item.path || (item.path === 'admin/streams' && currentPath === 'admin/create-stream');
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                        isActive ? 'bg-[#FF1B6B] text-white' : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
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
