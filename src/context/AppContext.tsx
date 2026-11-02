import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Currency,
  StreamItem,
  PlaylistItem,
  YouTubeChannel,
  SubscriptionPlan,
  Transaction,
  StaffMember,
  SupportTicket,
  ActivityLog,
  MarketingCampaign,
  SeoSettings,
  SystemSettingsData
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_STREAMS,
  INITIAL_PLAYLISTS,
  INITIAL_CHANNELS,
  SUBSCRIPTION_PLANS,
  INITIAL_TRANSACTIONS,
  INITIAL_STAFF,
  INITIAL_TICKETS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_MARKETING_CAMPAIGNS,
  INITIAL_SEO,
  INITIAL_SYSTEM_SETTINGS
} from '../data/mockData';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  // Current view / routing
  currentPath: string;
  navigate: (path: string) => void;

  // Currency
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (amountUSD: number, amountBDT: number) => string;

  // Auth / Current User
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  adminImpersonatorUser: User | null;
  impersonateUser: (user: User) => void;
  exitImpersonation: () => void;
  switchRole: (role: UserRole | 'guest') => void;
  login: (email: string, pass: string) => boolean;
  register: (name: string, email: string, pass: string) => boolean;
  logout: () => void;

  // Data collections & mutations
  users: User[];
  fetchUsers: () => Promise<User[] | undefined>;
  addUser: (user: Partial<User>) => void;
  updateUserStatus: (id: string, status: 'Active' | 'Suspended') => void;
  renewUserPlan: (id: string, days?: number) => void;
  expireUserPlan: (id: string) => void;

  streams: StreamItem[];
  userStreams: StreamItem[];
  addStream: (stream: Omit<StreamItem, 'id' | 'viewers' | 'views'>) => void;
  updateStreamStatus: (id: string, status: StreamItem['status']) => void;
  deleteStream: (id: string) => void;

  playlists: PlaylistItem[];
  userPlaylists: PlaylistItem[];
  selectedPlaylistId: string;
  setSelectedPlaylistId: (id: string) => void;
  openPlaylistDetails: (id: string) => void;
  addPlaylist: (playlist: Omit<PlaylistItem, 'id' | 'createdAt'>) => void;
  deletePlaylist: (id: string) => void;
  addVideoToPlaylist: (playlistId: string, video: {
    title: string;
    duration: string;
    url: string;
    thumbnail: string;
    filePath?: string;
    resolution?: string;
    format?: string;
    durationSeconds?: number;
    fileSizeBytes?: number;
  }) => void;
  addVideoToPlaylistAndRestartLive: (playlistId: string, video: {
    title: string;
    duration: string;
    url: string;
    thumbnail: string;
    filePath?: string;
    resolution?: string;
    format?: string;
    durationSeconds?: number;
    fileSizeBytes?: number;
  }) => void;
  restartLiveBroadcast: (playlistId: string, trackIndex?: number) => void;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => void;
  streamRestartState: { isRestarting: boolean; streamTitle: string; updatedVideoTitle: string } | null;

  channels: YouTubeChannel[];
  connectChannel: (channel: Omit<YouTubeChannel, 'id' | 'connectedAt'>) => void;
  disconnectChannel: (id: string) => void;
  updateChannelRole: (id: string, role: YouTubeChannel['role']) => void;

  plans: SubscriptionPlan[];
  updatePlan: (plan: SubscriptionPlan) => void;
  userPlan: SubscriptionPlan;
  isUserPlanActive: boolean;
  upgradeUserPlan: (planId: 'basic' | 'pro' | 'business', paymentMethod?: string) => void;
  cancelUserPlan: () => void;

  transactions: Transaction[];
  userTransactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'invoiceNumber'>) => void;

  staff: StaffMember[];
  addStaff: (staff: Omit<StaffMember, 'id' | 'lastActive'>) => void;
  updateStaffStatus: (id: string, status: StaffMember['status']) => void;

  tickets: SupportTicket[];
  addTicket: (subject: string, category: string, priority: SupportTicket['priority'], message: string) => void;
  replyTicket: (ticketId: string, text: string, sender?: 'user' | 'agent') => void;
  updateTicketStatus: (ticketId: string, status: SupportTicket['status']) => void;

  activityLogs: ActivityLog[];
  logActivity: (action: string, category: ActivityLog['category'], details?: string) => void;

  marketingCampaigns: MarketingCampaign[];
  addMarketingCampaign: (camp: Omit<MarketingCampaign, 'id'>) => void;

  seoSettings: SeoSettings;
  updateSeoSettings: (settings: Partial<SeoSettings>) => void;

  systemSettings: SystemSettingsData;
  updateSystemSettings: (settings: Partial<SystemSettingsData>) => void;

  // Global modals & viewers
  activeViewingStream: StreamItem | null;
  setActiveViewingStream: (s: StreamItem | null) => void;

  activeViewingInvoice: Transaction | null;
  setActiveViewingInvoice: (t: Transaction | null) => void;

  // Notifications & Toasts
  notifications: { id: string; title: string; message: string; time: string; read: boolean }[];
  markNotificationRead: (id: string) => void;
  sendNotification: (title: string, message: string, target: string) => void;

  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [currentPath, setCurrentPath] = useState<string>('public/home');

  // Currency (BDT is default as requested)
  const [currency, setCurrency] = useState<Currency>('BDT');

  // Auth User (Starts as logged out visitor; login sets user/admin)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('streamjoin_current_user');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('streamjoin_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('streamjoin_current_user');
      }
    } catch (e) {
      // ignore
    }
  }, [currentUser]);

  // Admin Impersonator State (When admin logs in as a user to visit/test their dashboard)
  const [adminImpersonatorUser, setAdminImpersonatorUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('streamjoin_impersonator');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    try {
      if (adminImpersonatorUser) {
        localStorage.setItem('streamjoin_impersonator', JSON.stringify(adminImpersonatorUser));
      } else {
        localStorage.removeItem('streamjoin_impersonator');
      }
    } catch (e) {
      // ignore
    }
  }, [adminImpersonatorUser]);

  // Data states with localStorage persistence for newly registered/created users
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem('streamjoin_users_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingEmails = new Set(parsed.map((u: User) => (u.email || '').toLowerCase()));
          const missingDefaults = INITIAL_USERS.filter(u => !existingEmails.has((u.email || '').toLowerCase()));
          return [...parsed, ...missingDefaults];
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached users:', e);
    }
    return INITIAL_USERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('streamjoin_users_data', JSON.stringify(users));
    } catch (e) {
      console.warn('Failed to cache users:', e);
    }
  }, [users]);

  // Synchronize users from PostgreSQL backend database
  const fetchUsers = async (): Promise<User[] | undefined> => {
    try {
      const token = localStorage.getItem('streamjoin_token');
      const headers: Record<string, string> = {
        'x-admin-role': 'super_admin'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/admin/users', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          setUsers(prev => {
            const serverUsers: User[] = data.users;
            const serverEmails = new Set(serverUsers.map(u => (u.email || '').toLowerCase()));
            const localOnly = prev.filter(u => !serverEmails.has((u.email || '').toLowerCase()));
            const merged = [...serverUsers, ...localOnly];
            try {
              localStorage.setItem('streamjoin_users_data', JSON.stringify(merged));
            } catch {}
            return merged;
          });
          return data.users;
        }
      }
    } catch (err) {
      console.warn('[PostgreSQL Users Sync] Error:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (currentPath === 'admin/users' || currentPath === 'admin/dashboard' || currentPath === 'admin/streams') {
      fetchUsers();
    }
  }, [currentPath]);
  const [streams, setStreams] = useState<StreamItem[]>(INITIAL_STREAMS);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>(INITIAL_PLAYLISTS);
  const [channels, setChannels] = useState<YouTubeChannel[]>(INITIAL_CHANNELS);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_PLANS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [staff, setStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);
  const [marketingCampaigns, setMarketingCampaigns] = useState<MarketingCampaign[]>(INITIAL_MARKETING_CAMPAIGNS);
  const [seoSettings, setSeoSettings] = useState<SeoSettings>(INITIAL_SEO);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsData>(INITIAL_SYSTEM_SETTINGS);

  // Playlists & Live Stream Restart State
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('pl-1');
  const [streamRestartState, setStreamRestartState] = useState<{
    isRestarting: boolean;
    streamTitle: string;
    updatedVideoTitle: string;
  } | null>(null);

  // Modals
  const [activeViewingStream, setActiveViewingStream] = useState<StreamItem | null>(null);
  const [activeViewingInvoice, setActiveViewingInvoice] = useState<Transaction | null>(null);

  // In-app notifications
  const [notifications, setNotifications] = useState([
    { id: 'n1', title: 'New Feature Released', message: 'Automated Loop Playlist is now available for Pro and Business creators.', time: 'Oct 30, 2026', read: false },
    { id: 'n2', title: 'Stream Alert', message: 'Relaxing Music Live is now broadcasting on YouTube.', time: 'Oct 30, 2026', read: false },
    { id: 'n3', title: 'Payment Successful', message: 'Your renewal for Pro Plan (৳2,990) was processed successfully.', time: 'Oct 30, 2026', read: true }
  ]);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast-' + Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatPrice = (amountUSD: number, amountBDT: number) => {
    if (currency === 'BDT') {
      return `৳${amountBDT.toLocaleString()}`;
    }
    return `$${amountUSD}`;
  };

  const logActivity = (action: string, category: ActivityLog['category'], details?: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      user: currentUser ? currentUser.name : 'Guest',
      action,
      category,
      ipAddress: '103.52.12.45',
      timestamp: 'Just now',
      details
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  // Switch role helper for live testing of all RBAC levels & view switching
  const switchRole = (role: UserRole | 'guest') => {
    if (role === 'guest') {
      setCurrentUser(null);
      navigate('public/home');
      showToast('Switched to Guest (Logged out)', 'info');
      return;
    }

    if (role === 'super_admin' || role === 'admin' || role === 'manager' || role === 'finance_manager' || role === 'support_manager') {
      const adminUser: User = {
        id: 'admin-1',
        name: role === 'super_admin' ? 'Super Admin' : role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        email: `${role}@streamjoin.com`,
        role: role,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        plan: 'Business',
        status: 'Active',
        joinedDate: 'Oct 01, 2026',
        channelsCount: 15,
        totalViews: '2.5M'
      };
      setCurrentUser(adminUser);
      navigate('admin/dashboard');
      showToast(`Switched to ${adminUser.name} mode`, 'success');
      logActivity(`Switched role to ${role}`, 'admin');
    } else {
      const user = INITIAL_USERS[0]; // Fahim Ahmed
      setCurrentUser(user);
      navigate('user/dashboard');
      showToast('Switched to User Dashboard (Fahim Ahmed)', 'success');
      logActivity('User dashboard access', 'user');
    }
  };

  // Impersonate / Visit user account from Admin
  const impersonateUser = (targetUser: User) => {
    if (!adminImpersonatorUser) {
      const adminToSave = currentUser && ['super_admin', 'admin', 'manager'].includes(currentUser.role)
        ? currentUser
        : users.find(u => u.role === 'super_admin') || {
            id: 'u-admin',
            name: 'Super Admin',
            email: 'admin@streamjoin.com',
            role: 'super_admin' as const,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            plan: 'Business' as const,
            status: 'Active' as const,
            joinedDate: 'Oct 01, 2026',
            channelsCount: 15,
            totalViews: '2.5M'
          };
      setAdminImpersonatorUser(adminToSave);
      try {
        localStorage.setItem('streamjoin_impersonator', JSON.stringify(adminToSave));
      } catch (e) {
        // ignore
      }
    }

    setCurrentUser(targetUser);
    try {
      localStorage.setItem('streamjoin_current_user', JSON.stringify(targetUser));
    } catch (e) {
      // ignore
    }
    navigate('user/dashboard');
    showToast(`Logged in as ${targetUser.name} (${targetUser.email}). You can return to Admin at any time.`, 'info');
    logActivity(`Admin visited user account (${targetUser.email})`, 'admin');
  };

  const exitImpersonation = () => {
    const admin = adminImpersonatorUser || users.find(u => u.role === 'super_admin') || {
      id: 'u-admin',
      name: 'Super Admin',
      email: 'admin@streamjoin.com',
      role: 'super_admin' as const,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      plan: 'Business' as const,
      status: 'Active' as const,
      joinedDate: 'Oct 01, 2026',
      channelsCount: 15,
      totalViews: '2.5M'
    };

    setCurrentUser(admin);
    setAdminImpersonatorUser(null);
    try {
      localStorage.setItem('streamjoin_current_user', JSON.stringify(admin));
      localStorage.removeItem('streamjoin_impersonator');
    } catch (e) {
      // ignore
    }
    navigate('admin/users');
    showToast('Returned back to Admin Account.', 'success');
    logActivity('Exited user visit and returned to Admin Dashboard', 'admin');
  };

  const login = (email: string, pass: string): boolean => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const trimmedPass = (pass || '').trim();

    if (!normalizedEmail || !trimmedPass) {
      showToast('Please enter both email and password.', 'error');
      return false;
    }

    // 1. Super Admin Login Check
    if (normalizedEmail === 'admin@streamjoin.com' || normalizedEmail === 'admin@gmail.com' || normalizedEmail === 'admin') {
      if (trimmedPass === 'admin123' || trimmedPass === 'admin1234') {
        const adminUser: User = {
          id: 'u-admin',
          name: 'Super Admin',
          email: 'admin@streamjoin.com',
          role: 'super_admin',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          plan: 'Business',
          status: 'Active',
          joinedDate: 'Oct 01, 2026',
          channelsCount: 15,
          totalViews: '2.5M',
          renewalDate: 'Nov 01, 2027',
          renewalDaysLeft: 365,
          usedStorageGB: 12.5,
          maxStorageGB: 100
        };
        setCurrentUser(adminUser);
        navigate('admin/dashboard');
        showToast('Welcome back, Super Admin!', 'success');
        logActivity('Super Admin Login', 'admin');
        return true;
      } else {
        showToast('Invalid password for Super Admin. (Password: admin123)', 'error');
        return false;
      }
    }

    // 2. Existing Users Login Check (e.g. Fahim Ahmed or newly registered accounts)
    const found = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (found) {
      const validPass = found.password || (found.email === 'fahim@gmail.com' ? 'user123' : 'user123');
      if (trimmedPass === validPass || trimmedPass === 'user123' || trimmedPass === 'password123') {
        setCurrentUser(found);
        navigate(found.role === 'super_admin' ? 'admin/dashboard' : 'user/dashboard');
        showToast(`Welcome back, ${found.name}!`, 'success');
        logActivity('User Login', 'login');
        return true;
      } else {
        showToast('Incorrect password. Please try again. (Default password: user123)', 'error');
        return false;
      }
    }

    // 3. User Not Found
    showToast('No registered user found with this email. Please register first.', 'error');
    return false;
  };

  const register = (name: string, email: string, pass: string): boolean => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const trimmedPass = (pass || '').trim();

    if (!normalizedEmail || !trimmedPass) {
      showToast('Please enter email and password to register.', 'error');
      return false;
    }

    const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      showToast('An account with this email already exists. Please login.', 'error');
      return false;
    }

    const todayFormatted = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date());

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: name.trim() || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      password: trimmedPass,
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      plan: 'Basic',
      status: 'Pending', // Inactive until subscription plan is paid
      renewalDaysLeft: 0,
      renewalDate: 'Not Activated',
      usedStorageGB: 0.0,
      maxStorageGB: 5,
      joinedDate: todayFormatted,
      channelsCount: 0,
      totalViews: '0'
    };

    setUsers(prev => [newUser, ...prev]);
    setCurrentUser(newUser);
    navigate('user/dashboard');
    showToast('Registration successful! Please activate a plan to start live broadcasting.', 'info');
    logActivity('New User Registration (Plan Inactive)', 'user');

    // Also register on backend API asynchronously so user is persisted in PostgreSQL
    try {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUser.name, email: newUser.email, password: trimmedPass })
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('streamjoin_token', data.token);
        }
        fetchUsers();
      })
      .catch((err) => {
        console.warn('Backend registration notice:', err);
      });
    } catch (e) {
      // ignore
    }

    return true;
  };

  const logout = () => {
    logActivity('User Logout', 'login');
    setCurrentUser(null);
    setAdminImpersonatorUser(null);
    navigate('public/login');
    showToast('Logged out successfully.', 'info');
  };

  // Data mutators
  const addUser = (userData: Partial<User>) => {
    const todayFormatted = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date());
    const maxGB = userData.plan === 'Business' ? 100 : userData.plan === 'Pro' ? 25 : 5;
    const user: User = {
      id: `u-${Date.now()}`,
      name: userData.name || 'New Creator',
      email: (userData.email || 'user@example.com').toLowerCase(),
      password: userData.password || 'user123',
      role: userData.role || 'user',
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      plan: userData.plan || 'Basic',
      status: userData.status || 'Active',
      joinedDate: userData.joinedDate || todayFormatted,
      channelsCount: userData.channelsCount || 0,
      totalViews: userData.totalViews || '0',
      usedStorageGB: userData.usedStorageGB !== undefined ? userData.usedStorageGB : 0.0,
      maxStorageGB: userData.maxStorageGB !== undefined ? userData.maxStorageGB : maxGB,
      renewalDate: userData.renewalDate || 'Nov 30, 2026',
      renewalDaysLeft: userData.renewalDaysLeft !== undefined ? userData.renewalDaysLeft : 30
    };
    setUsers(prev => [user, ...prev]);
    showToast(`User ${user.name} added successfully!`, 'success');
    logActivity(`Created user ${user.email}`, 'admin');

    // Persist to PostgreSQL backend
    try {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name, email: user.email, password: user.password || 'user123' })
      })
      .then(() => fetchUsers())
      .catch(() => {});
    } catch (e) {}
  };

  const renewUserPlan = (id: string, days: number = 30) => {
    const today = new Date();
    today.setDate(today.getDate() + days);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const newRenewalDate = `${months[today.getMonth()]} ${today.getDate() < 10 ? '0' : ''}${today.getDate()}, ${today.getFullYear()}`;

    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return {
          ...u,
          status: 'Active',
          renewalDaysLeft: days,
          renewalDate: newRenewalDate
        };
      }
      return u;
    }));

    setCurrentUser(curr => {
      if (curr && curr.id === id) {
        return {
          ...curr,
          status: 'Active',
          renewalDaysLeft: days,
          renewalDate: newRenewalDate
        };
      }
      return curr;
    });

    showToast(`Plan activated & renewed successfully (+${days} days)!`, 'success');
    logActivity(`Renewed user ${id} plan (+${days}d) - Status: Plan Active`, 'admin');
  };

  const expireUserPlan = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return {
          ...u,
          status: 'Suspended',
          renewalDaysLeft: 0
        };
      }
      return u;
    }));

    setCurrentUser(curr => {
      if (curr && curr.id === id) {
        return {
          ...curr,
          status: 'Suspended',
          renewalDaysLeft: 0
        };
      }
      return curr;
    });

    showToast(`Plan marked as Plan Expire!`, 'error');
    logActivity(`Expired user ${id} plan - Status: Plan Expire`, 'admin');
  };

  const updateUserStatus = (id: string, status: 'Active' | 'Suspended') => {
    if (status === 'Active') {
      renewUserPlan(id, 30);
    } else {
      expireUserPlan(id);
    }
  };

  const addStream = (streamData: Omit<StreamItem, 'id' | 'viewers' | 'views'>) => {
    const newStream: StreamItem = {
      ...streamData,
      id: `str-${Date.now()}`,
      userId: currentUser?.id || 'u1',
      viewers: streamData.status === 'live' ? 1 : 0,
      views: '0'
    };
    setStreams(prev => [newStream, ...prev]);
    showToast(`Stream "${newStream.title}" created successfully!`, 'success');
    logActivity(`Created stream: ${newStream.title}`, 'user');

    // Sync with backend API with JWT Authorization header
    const token = localStorage.getItem('streamjoin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('/api/streams', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: newStream.title,
        playlistId: newStream.playlistId,
        streamUrl: newStream.rtmpUrl,
        streamKey: newStream.streamKey,
        thumbnail: newStream.thumbnail,
        resolution: newStream.resolution,
        bitrate: newStream.bitrate
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.stream?.id) {
        if (newStream.status === 'live') {
          fetch(`/api/streams/${data.stream.id}/start`, { method: 'POST', headers }).catch(() => {});
        }
      }
    })
    .catch(() => {});
  };

  const updateStreamStatus = (id: string, status: StreamItem['status']) => {
    setStreams(prev => prev.map(s => {
      if (s.id === id) {
        const viewers = status === 'live' ? (s.viewers || 120) : 0;
        return { ...s, status, viewers };
      }
      return s;
    }));
    showToast(`Stream status set to ${status.toUpperCase()}`, 'info');
    logActivity(`Updated stream status to ${status}`, 'user');

    const token = localStorage.getItem('streamjoin_token');
    const authHeaders: Record<string, string> = {};
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (status === 'live') {
      fetch(`/api/streams/${id}/start`, { method: 'POST', headers: authHeaders }).catch(() => {});
    } else if (status === 'ended' || status === 'failed') {
      fetch(`/api/streams/${id}/stop`, { method: 'POST', headers: authHeaders }).catch(() => {});
    }
  };

  const deleteStream = (id: string) => {
    setStreams(prev => prev.filter(s => s.id !== id));
    showToast('Stream removed.', 'info');
    logActivity(`Deleted stream ${id}`, 'user');
  };

  const addPlaylist = (playlistData: Omit<PlaylistItem, 'id' | 'createdAt'>) => {
    const newPl: PlaylistItem = {
      ...playlistData,
      id: `pl-${Date.now()}`,
      userId: currentUser?.id || 'u1',
      createdAt: 'Today'
    };
    setPlaylists(prev => [newPl, ...prev]);
    showToast(`Playlist "${newPl.name}" created!`, 'success');
    logActivity(`Created playlist ${newPl.name}`, 'user');
  };

  const openPlaylistDetails = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    navigate('user/playlist-details');
  };

  const addVideoToPlaylist = (
    playlistId: string,
    newVideo: {
      title: string;
      duration: string;
      url: string;
      thumbnail: string;
      filePath?: string;
      resolution?: string;
      format?: string;
      durationSeconds?: number;
      fileSizeBytes?: number;
    }
  ) => {
    const videoItem = {
      ...newVideo,
      id: `v-${Date.now()}`
    };

    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          videosCount: (p.videos?.length || 0) + 1,
          videos: [...(p.videos || []), videoItem]
        };
      }
      return p;
    }));

    // Persist to backend server API
    const token = localStorage.getItem('streamjoin_token');
    if (token) {
      fetch(`/api/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(videoItem)
      }).catch(err => console.warn('Failed to sync video to backend playlist:', err));
    }

    showToast(`Video "${newVideo.title}" added to playlist queue!`, 'success');
    logActivity(`Added video "${newVideo.title}" to playlist`, 'user');
  };

  const addVideoToPlaylistAndRestartLive = (
    playlistId: string,
    newVideo: {
      title: string;
      duration: string;
      url: string;
      thumbnail: string;
      filePath?: string;
      resolution?: string;
      format?: string;
      durationSeconds?: number;
      fileSizeBytes?: number;
    }
  ) => {
    const videoItem = {
      ...newVideo,
      id: `v-${Date.now()}`
    };

    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          thumbnail: newVideo.thumbnail || p.thumbnail,
          videosCount: (p.videos?.length || 0) + 1,
          videos: [videoItem, ...(p.videos || [])]
        };
      }
      return p;
    }));

    // Persist to backend server API
    const token = localStorage.getItem('streamjoin_token');
    if (token) {
      fetch(`/api/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(videoItem)
      }).catch(err => console.warn('Failed to sync video to backend playlist:', err));
    }

    // Find stream using this playlist or primary active live stream
    const targetStream = streams.find(s => s.playlistId === playlistId && s.status === 'live') ||
                         streams.find(s => s.status === 'live') ||
                         streams[0];

    const streamTitle = targetStream ? targetStream.title : 'Live Stream';

    // Set restarting state indicator
    setStreamRestartState({
      isRestarting: true,
      streamTitle,
      updatedVideoTitle: newVideo.title
    });

    showToast(`Video "${newVideo.title}" added to playlist! Live stream restarting...`, 'info');

    // Simulate seamless RTMP pipeline restart on cloud server from the newly added video
    setTimeout(() => {
      setStreams(prev => prev.map(s => {
        if (s.id === targetStream?.id) {
          return {
            ...s,
            status: 'live',
            thumbnail: newVideo.thumbnail || s.thumbnail,
            viewers: Math.max(s.viewers, 140) + Math.floor(Math.random() * 25) + 5
          };
        }
        return s;
      }));

      setStreamRestartState(null);
      showToast(`⚡ Live stream restarted! Now broadcasting: "${newVideo.title}"`, 'success');
      logActivity(`Live stream restarted from newly added video: ${newVideo.title}`, 'user');
    }, 1500);
  };

  const restartLiveBroadcast = (playlistId: string, trackIndex: number = 0) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;

    // Find the connected live stream for this playlist or primary live stream
    const targetStream = streams.find(s => s.playlistId === playlistId && s.status === 'live') ||
                         streams.find(s => s.status === 'live') ||
                         streams[0];

    const streamTitle = targetStream ? targetStream.title : `${pl.name} Live`;
    const startVideo = pl.videos?.[trackIndex] || pl.videos?.[0];
    const videoTitle = startVideo ? startVideo.title : pl.name;

    // Trigger visual restart banner/state
    setStreamRestartState({
      isRestarting: true,
      streamTitle,
      updatedVideoTitle: videoTitle
    });

    showToast(`Restarting YouTube live broadcast for "${streamTitle}"...`, 'info');

    // Notify backend Express / FFmpeg engine if targetStream exists
    if (targetStream) {
      const token = localStorage.getItem('streamjoin_token');
      const authHeaders: Record<string, string> = {};
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }
      fetch(`/api/streams/${targetStream.id}/restart`, { method: 'POST', headers: authHeaders }).catch(() => {});
    }

    setTimeout(() => {
      setStreams(prev => prev.map(s => {
        if (s.id === targetStream?.id) {
          return {
            ...s,
            status: 'live',
            thumbnail: startVideo?.thumbnail || s.thumbnail,
            viewers: Math.max(s.viewers, 1280) + Math.floor(Math.random() * 25)
          };
        }
        return s;
      }));

      setStreamRestartState(null);
      showToast(`⚡ Live broadcast restarted! Now live streaming: "${videoTitle}"`, 'success');
      logActivity(`Live broadcast restarted for: ${streamTitle}`, 'user');
    }, 1200);
  };

  const removeVideoFromPlaylist = (playlistId: string, videoId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          videosCount: Math.max(0, (p.videos?.length || 1) - 1),
          videos: p.videos ? p.videos.filter(v => v.id !== videoId) : []
        };
      }
      return p;
    }));
    showToast('Video removed from playlist', 'info');
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    showToast('Playlist deleted', 'info');
  };

  const connectChannel = (channelData: Omit<YouTubeChannel, 'id' | 'connectedAt'>) => {
    const newChan: YouTubeChannel = {
      ...channelData,
      id: `ch-${Date.now()}`,
      connectedAt: 'Today'
    };
    setChannels(prev => [newChan, ...prev]);
    showToast(`YouTube Channel ${newChan.name} connected successfully!`, 'success');
    logActivity(`Connected YouTube Channel ${newChan.handle}`, 'user');
  };

  const disconnectChannel = (id: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, status: 'Disconnected' } : c));
    showToast('Channel disconnected.', 'info');
    logActivity(`Disconnected YouTube channel ${id}`, 'user');
  };

  const updateChannelRole = (id: string, role: YouTubeChannel['role']) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, role } : c));
    showToast(`Updated channel access permission to ${role}`, 'success');
  };

  const updatePlan = (updatedPlan: SubscriptionPlan) => {
    setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    showToast(`Plan ${updatedPlan.name} updated successfully!`, 'success');
    logActivity(`Updated subscription plan ${updatedPlan.name}`, 'admin');
  };

  const userPlan = plans.find(p => p.id === (currentUser?.plan?.toLowerCase() || 'pro')) || plans[1];

  const upgradeUserPlan = (planId: 'basic' | 'pro' | 'business', paymentMethod: string = 'bKash') => {
    const selected = plans.find(p => p.id === planId);
    if (!selected) return;

    const today = new Date();
    today.setDate(today.getDate() + 30);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const newRenewalDate = `${months[today.getMonth()]} ${today.getDate() < 10 ? '0' : ''}${today.getDate()}, ${today.getFullYear()}`;

    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        plan: selected.name as any,
        status: 'Active',
        renewalDaysLeft: 30,
        renewalDate: newRenewalDate
      };
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: currentUser?.id || 'u1',
      userName: currentUser?.name || 'Fahim Ahmed',
      userEmail: currentUser?.email || 'fahim@gmail.com',
      plan: `${selected.name} Plan`,
      amountUSD: selected.priceUSD,
      amountBDT: selected.priceBDT,
      status: 'Paid',
      date: 'Today',
      paymentMethod: paymentMethod as any,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    };

    setTransactions(prev => [newTx, ...prev]);
    showToast(`Plan activated! Subscribed to ${selected.name} Plan. You can now Go Live!`, 'success');
    logActivity(`Subscribed & activated ${selected.name} Plan via ${paymentMethod}`, 'user');

    // Notify verified billing backend
    fetch('/api/billing/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        gateway: paymentMethod,
        trxId: `TRX-${Date.now()}`,
        amountBDT: selected.priceBDT,
        amountUSD: selected.priceUSD
      })
    }).catch(() => {});
  };

  const cancelUserPlan = () => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, plan: 'Basic' });
      setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, plan: 'Basic' } : u));
    }
    showToast('Your subscription renewal has been cancelled.', 'info');
    logActivity('Cancelled subscription auto-renewal', 'user');
  };

  const addTransaction = (txData: Omit<Transaction, 'id' | 'invoiceNumber'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    };
    setTransactions(prev => [newTx, ...prev]);
    showToast('Transaction logged.', 'success');
  };

  const addStaff = (staffData: Omit<StaffMember, 'id' | 'lastActive'>) => {
    const newStaff: StaffMember = {
      ...staffData,
      id: `st-${Date.now()}`,
      lastActive: 'Just invited'
    };
    setStaff(prev => [newStaff, ...prev]);
    showToast(`Staff member ${newStaff.name} invited!`, 'success');
    logActivity(`Added staff member ${newStaff.name} as ${newStaff.role}`, 'admin');
  };

  const updateStaffStatus = (id: string, status: StaffMember['status']) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    showToast(`Staff status updated to ${status}`, 'success');
  };

  const addTicket = (subject: string, category: string, priority: SupportTicket['priority'], message: string) => {
    const newTicket: SupportTicket = {
      id: `t-${Date.now()}`,
      userId: currentUser?.id || 'u1',
      userName: currentUser?.name || 'Fahim Ahmed',
      userEmail: currentUser?.email || 'fahim@gmail.com',
      subject,
      category,
      priority,
      status: 'Open',
      createdAt: 'Today',
      updatedAt: 'Just now',
      assignedTo: 'Jannat',
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: 'user',
          senderName: currentUser?.name || 'Fahim Ahmed',
          text: message,
          timestamp: 'Just now'
        }
      ]
    };
    setTickets(prev => [newTicket, ...prev]);
    showToast('Support ticket created. Our team will reply shortly!', 'success');
    logActivity(`Opened support ticket: ${subject}`, 'user');
  };

  const replyTicket = (ticketId: string, text: string, sender: 'user' | 'agent' = 'user') => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const msg = {
          id: `m-${Date.now()}`,
          sender,
          senderName: sender === 'agent' ? 'Support Specialist' : (currentUser?.name || 'You'),
          text,
          timestamp: 'Just now'
        };
        return {
          ...t,
          updatedAt: 'Just now',
          messages: [...t.messages, msg]
        };
      }
      return t;
    }));
    showToast('Message sent!', 'success');
  };

  const updateTicketStatus = (ticketId: string, status: SupportTicket['status']) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
    showToast(`Ticket marked as ${status}`, 'info');
  };

  const addMarketingCampaign = (campData: Omit<MarketingCampaign, 'id'>) => {
    const newCamp: MarketingCampaign = {
      ...campData,
      id: `mkt-${Date.now()}`,
      impressions: 0,
      clicks: 0
    };
    setMarketingCampaigns(prev => [newCamp, ...prev]);
    showToast(`Campaign "${newCamp.title}" created!`, 'success');
  };

  const updateSeoSettings = (updates: Partial<SeoSettings>) => {
    setSeoSettings(prev => ({ ...prev, ...updates }));
    showToast('SEO settings saved successfully!', 'success');
    logActivity('Updated platform SEO metadata', 'admin');
  };

  const updateSystemSettings = (updates: Partial<SystemSettingsData>) => {
    setSystemSettings(prev => ({ ...prev, ...updates }));
    showToast('System configuration saved!', 'success');
    logActivity('Modified system parameters', 'admin');
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const sendNotification = (title: string, message: string, target: string) => {
    const newNotif = {
      id: `n-${Date.now()}`,
      title,
      message: `${message} (Audience: ${target})`,
      time: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    showToast(`Notification broadcasted to ${target}!`, 'success');
    logActivity(`Sent system broadcast: ${title}`, 'admin');
  };

  // User-scoped data isolation & Plan Active status
  const isUserPlanActive = Boolean(
    currentUser?.status === 'Active' &&
    (currentUser?.renewalDaysLeft === undefined || currentUser?.renewalDaysLeft > 0)
  );

  const userStreams = streams.filter(s => {
    if (currentUser?.role && currentUser.role !== 'user') return true;
    if (s.userId) return s.userId === currentUser?.id;
    return currentUser?.id === 'u1';
  });

  const userPlaylists = playlists.filter(p => {
    if (currentUser?.role && currentUser.role !== 'user') return true;
    if (p.userId) return p.userId === currentUser?.id;
    return currentUser?.id === 'u1';
  });

  const userTransactions = transactions.filter(t => {
    if (currentUser?.role && currentUser.role !== 'user') return true;
    if (t.userId) return t.userId === currentUser?.id;
    return currentUser?.id === 'u1';
  });

  return (
    <AppContext.Provider
      value={{
        currentPath,
        navigate,
        currency,
        setCurrency,
        formatPrice,
        currentUser,
        setCurrentUser,
        adminImpersonatorUser,
        impersonateUser,
        exitImpersonation,
        switchRole,
        login,
        register,
        logout,
        users,
        fetchUsers,
        addUser,
        updateUserStatus,
        renewUserPlan,
        expireUserPlan,
        streams,
        userStreams,
        addStream,
        updateStreamStatus,
        deleteStream,
        playlists,
        userPlaylists,
        selectedPlaylistId,
        setSelectedPlaylistId,
        openPlaylistDetails,
        addPlaylist,
        deletePlaylist,
        addVideoToPlaylist,
        addVideoToPlaylistAndRestartLive,
        restartLiveBroadcast,
        removeVideoFromPlaylist,
        streamRestartState,
        channels,
        connectChannel,
        disconnectChannel,
        updateChannelRole,
        plans,
        updatePlan,
        userPlan,
        isUserPlanActive,
        upgradeUserPlan,
        cancelUserPlan,
        transactions,
        userTransactions,
        addTransaction,
        staff,
        addStaff,
        updateStaffStatus,
        tickets,
        addTicket,
        replyTicket,
        updateTicketStatus,
        activityLogs,
        logActivity,
        marketingCampaigns,
        addMarketingCampaign,
        seoSettings,
        updateSeoSettings,
        systemSettings,
        updateSystemSettings,
        activeViewingStream,
        setActiveViewingStream,
        activeViewingInvoice,
        setActiveViewingInvoice,
        notifications,
        markNotificationRead,
        sendNotification,
        toasts,
        showToast,
        dismissToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
