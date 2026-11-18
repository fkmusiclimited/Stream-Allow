import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  SystemSettingsData,
  PaymentGatewaySettings,
  HomepageDemoConfig
} from '../types';
import {
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
  INITIAL_SYSTEM_SETTINGS,
  DEFAULT_PAYMENT_GATEWAY_SETTINGS
} from '../data/mockData';
import { setUploadAuthToken } from '../utils/chunkedUpload';

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
  authToken: string | null;
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  adminImpersonatorUser: User | null;
  impersonateUser: (user: User) => void;
  exitImpersonation: () => void;
  switchRole: (role: UserRole | 'guest') => void;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string, planChoice?: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
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
  fetchStreams: () => Promise<StreamItem[] | undefined>;
  addStream: (stream: Omit<StreamItem, 'id' | 'viewers' | 'views'> & {
    mediaId?: string;
    filePath?: string;
    videoUrl?: string;
    videoDuration?: string;
    durationSeconds?: number;
  }) => Promise<boolean>;
  updateStreamStatus: (id: string, status: StreamItem['status']) => Promise<boolean>;
  stoppingStreamIds: string[];
  deleteStream: (id: string) => Promise<void>;

  playlists: PlaylistItem[];
  userPlaylists: PlaylistItem[];
  fetchPlaylists: () => Promise<PlaylistItem[] | undefined>;
  selectedPlaylistId: string;
  setSelectedPlaylistId: (id: string) => void;
  openPlaylistDetails: (id: string) => void;
  addPlaylist: (playlist: Omit<PlaylistItem, 'id' | 'createdAt'>) => Promise<PlaylistItem | null>;
  deletePlaylist: (id: string) => Promise<void>;

  // Uploaded media files
  userMedia: any[];
  fetchMedia: () => Promise<any[] | undefined>;
  deleteMedia: (id: string) => Promise<boolean>;
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
    mediaId?: string;
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

  // Manual & Gateway Checkout Modal
  paymentGatewaySettings: PaymentGatewaySettings;
  updatePaymentGatewaySettings: (settings: Partial<PaymentGatewaySettings>) => Promise<void>;
  checkoutModalPlan: SubscriptionPlan | null;
  setCheckoutModalPlan: (plan: SubscriptionPlan | null) => void;
  openCheckoutModal: (planId?: 'basic' | 'pro' | 'business') => void;
  submitUserPayment: (data: {
    planId: 'basic' | 'pro' | 'business';
    gateway: string;
    transactionId: string;
    amountBDT: number;
    amountUSD: number;
    currency: 'BDT' | 'USD';
  }) => Promise<boolean>;
  approveUserTransaction: (transactionId: string) => Promise<boolean>;
  rejectUserTransaction: (transactionId: string) => Promise<boolean>;

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

  homepageDemoConfig: HomepageDemoConfig;
  fetchHomepageDemoConfig: () => Promise<void>;
  updateHomepageDemoConfig: (config: Partial<HomepageDemoConfig>) => Promise<boolean>;
  resetHomepageDemoConfig: () => Promise<boolean>;

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
  // Navigation: Strictly start on public website unless explicitly navigating a public route
  const [currentPath, setCurrentPath] = useState<string>(() => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash && hash.startsWith('public/')) {
        return hash;
      }
      if (hash && (hash.startsWith('user/') || hash.startsWith('admin/'))) {
        return 'public/login';
      }
    } catch {}
    return 'public/home';
  });

  // Currency (BDT is default as requested)
  const [currency, setCurrency] = useState<Currency>('BDT');
  const [stoppingStreamIds, setStoppingStreamIds] = useState<string[]>([]);
  const stopInFlightRef = useRef<Map<string, Promise<boolean>>>(new Map());

  // In-memory JWT & Authenticated User State (NEVER persisted in localStorage/sessionStorage to guarantee zero auto-login)
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const authTokenRef = useRef<string | null>(null);
  const setAuthToken = (tok: string | null) => {
    const clean = tok && tok.trim() ? tok.trim() : null;
    authTokenRef.current = clean;
    setAuthTokenState(clean);
    setUploadAuthToken(clean);
  };

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminImpersonatorUser, setAdminImpersonatorUser] = useState<User | null>(null);

  const getAuthHeaders = (extra?: Record<string, string>, tokenOverride?: string): Record<string, string> => {
    const headers: Record<string, string> = { ...(extra || {}) };
    const tok = tokenOverride ?? authTokenRef.current;
    if (tok) {
      headers['Authorization'] = `Bearer ${tok}`;
    }
    return headers;
  };

  // Clear any legacy auth/cache keys so old sessions never trigger auto-login
  const clearLegacyAuthStorage = () => {
    const legacyKeys = [
      'streamjoin_token',
      'streamjoin_current_user',
      'streamjoin_impersonator',
      'streamjoin_users_data',
      'streamjoin_streams_cache'
    ];
    for (const key of legacyKeys) {
      try { localStorage.removeItem(key); } catch {}
      try { sessionStorage.removeItem(key); } catch {}
    }
  };

  // Helper to strictly deduplicate users by ID and unique email
  const deduplicateUsers = (list: User[]): User[] => {
    const byId = new Map<string, User>();
    const seenEmails = new Set<string>();
    for (const u of list) {
      if (!u || !u.id) continue;
      const normEmail = (u.email || '').trim().toLowerCase();
      if (byId.has(u.id)) continue;
      if (normEmail && seenEmails.has(normEmail)) continue;

      byId.set(u.id, u);
      if (normEmail) seenEmails.add(normEmail);
    }
    return Array.from(byId.values());
  };

  const [users, setUsers] = useState<User[]>([]);

  const safeParseResponse = async (res: Response): Promise<any> => {
    try {
      const text = await res.text();
      if (res.status === 429 || (text && text.includes('Rate exceeded'))) {
        return {
          success: false,
          rateExceeded: true,
          message: 'Request rate limit reached. Please wait a moment.',
          error: 'Request rate limit reached. Please wait a moment.'
        };
      }
      if (!text) {
        return {
          success: false,
          error: res.ok ? 'Empty response from server.' : `Server error (HTTP ${res.status}).`
        };
      }
      return JSON.parse(text);
    } catch {
      return {
        success: false,
        error: res.status >= 400
          ? `Server returned HTTP ${res.status}${res.statusText ? ` (${res.statusText})` : ''}.`
          : 'Failed to parse response JSON.'
      };
    }
  };

  // Synchronize users from PostgreSQL backend database (strictly requires authenticated admin JWT)
  const fetchUsers = async (tokenOverride?: string): Promise<User[] | undefined> => {
    const tok = tokenOverride ?? authTokenRef.current;
    if (!tok) return undefined;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('/api/admin/users', {
        headers: getAuthHeaders(undefined, tok),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await safeParseResponse(res);
        if (data.success && Array.isArray(data.users)) {
          const serverUsers: User[] = deduplicateUsers(data.users);
          setUsers(serverUsers);

          setCurrentUser(curr => {
            if (!curr) return curr;
            const found = serverUsers.find((u: User) => (u.id === curr.id || (u.email && curr.email && u.email.toLowerCase() === curr.email.toLowerCase())));
            if (found) {
              return {
                ...curr,
                status: found.status,
                plan: found.plan,
                subscriptionStartDate: found.subscriptionStartDate,
                planDurationDays: found.planDurationDays,
                renewalDaysLeft: found.renewalDaysLeft,
                renewalDate: found.renewalDate,
                expiresAt: found.expiresAt
              };
            }
            return curr;
          });

          return serverUsers;
        }
      }
    } catch (err) {
      console.warn('[PostgreSQL Users Sync] Error:', err);
    }
    return undefined;
  };

  const prevPathRef = useRef(currentPath);

  useEffect(() => {
    clearLegacyAuthStorage();
  }, []);

  useEffect(() => {
    if (prevPathRef.current === currentPath) return;
    prevPathRef.current = currentPath;
    if (
      authTokenRef.current &&
      currentUser &&
      ['super_admin', 'admin', 'manager', 'finance_manager', 'support_manager'].includes(currentUser.role) &&
      (currentPath === 'admin/users' || currentPath === 'admin/dashboard' || currentPath === 'admin/streams' || currentPath === 'admin/payments')
    ) {
      fetchUsers();
    }
  }, [currentPath, currentUser?.role]);

  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [userMedia, setUserMedia] = useState<any[]>([]);

  const fetchPlaylists = async (tokenOverride?: string): Promise<PlaylistItem[] | undefined> => {
    const token = tokenOverride ?? authTokenRef.current;
    if (!token) return undefined;

    try {
      const res = await fetch('/api/playlists', {
        headers: getAuthHeaders(undefined, token)
      });
      if (res.ok) {
        const data = await safeParseResponse(res);
        if (data.success && Array.isArray(data.playlists)) {
          const loaded: PlaylistItem[] = data.playlists.map((p: any) => ({
            id: p.id,
            userId: p.userId,
            name: p.name,
            description: p.description,
            status: p.status,
            isLiveLoop: p.isLiveLoop,
            videosCount: p.totalVideos || (p.videos?.length || 0),
            duration: p.totalRuntime || '00:00',
            totalVideos: p.totalVideos || (p.videos?.length || 0),
            totalRuntime: p.totalRuntime || '00:00',
            thumbnail: p.thumbnail,
            createdAt: 'Today',
            videos: (p.videos || []).map((v: any) => ({
              id: v.id,
              title: v.title,
              duration: v.duration,
              durationSeconds: v.durationSeconds,
              resolution: v.resolution,
              format: v.format,
              url: v.url,
              filePath: v.filePath,
              fileSizeBytes: v.fileSizeBytes,
              thumbnail: v.thumbnail,
              positionOrder: v.positionOrder
            }))
          }));
          setPlaylists(loaded);
          if (loaded.length > 0) {
            setSelectedPlaylistId(prev => (prev && loaded.some(pl => pl.id === prev)) ? prev : loaded[0].id);
          }
          return loaded;
        }
      }
    } catch (err) {
      console.warn('fetchPlaylists error:', err);
    }
    return undefined;
  };

  const fetchStreams = async (tokenOverride?: string): Promise<StreamItem[] | undefined> => {
    const token = tokenOverride ?? authTokenRef.current;
    if (!token) return undefined;

    try {
      const res = await fetch('/api/streams', {
        headers: getAuthHeaders(undefined, token)
      });
      if (res.ok) {
        const data = await safeParseResponse(res);
        if (data.success && Array.isArray(data.streams)) {
          const loaded: StreamItem[] = data.streams.map((s: any) => ({
            id: s.id,
            userId: s.userId,
            title: s.title,
            thumbnail: s.thumbnail,
            channelName: s.channelName || (s.isDualStream ? 'YouTube Live (Dual Stream)' : 'YouTube Live'),
            playlistId: s.playlistId,
            status: s.status,
            viewers: s.viewers || 0,
            views: s.views || '0',
            date: s.date || 'Today',
            time: s.time || '10:00 PM',
            resolution: s.resolution || '1080p60',
            bitrate: s.bitrate || '4500 kbps',
            rtmpUrl: s.streamUrl,
            streamKey: s.maskedStreamKey || '••••••••••••',
            startedAt: s.startedAt,
            currentTrackIndex: typeof s.currentTrackIndex === 'number' ? s.currentTrackIndex : undefined,
            currentTrackStartedAt: s.currentTrackStartedAt,
            totalTracks: typeof s.totalTracks === 'number' ? s.totalTracks : undefined
          }));
          setStreams(loaded);
          return loaded;
        }
      }
    } catch (err) {
      console.warn('fetchStreams error:', err);
    }
    return undefined;
  };

  const fetchMedia = async (tokenOverride?: string): Promise<any[] | undefined> => {
    const token = tokenOverride ?? authTokenRef.current;
    if (!token) return undefined;

    try {
      const res = await fetch('/api/media', {
        headers: getAuthHeaders(undefined, token)
      });
      if (res.ok) {
        const data = await safeParseResponse(res);
        if (data.success && Array.isArray(data.media)) {
          setUserMedia(data.media);
          return data.media;
        }
      }
    } catch (err) {
      console.warn('fetchMedia error:', err);
    }
    return undefined;
  };

  const deleteMedia = async (id: string): Promise<boolean> => {
    if (!authTokenRef.current) {
      showToast('Authentication required. Please login.', 'error');
      return false;
    }
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserMedia(prev => prev.filter(m => m.id !== id));
        showToast('Video deleted from server storage.', 'info');
        return true;
      }
      showToast(data.message || 'Failed to delete video.', 'error');
      return false;
    } catch (err: any) {
      showToast(`Error deleting video: ${err.message}`, 'error');
      return false;
    }
  };

  // Periodically synchronize streams state ONLY when authenticated
  useEffect(() => {
    if (!authToken || !currentUser) return;
    const streamInterval = setInterval(() => {
      if (authTokenRef.current) {
        fetchStreams().catch(() => {});
      }
    }, 4000);
    return () => clearInterval(streamInterval);
  }, [authToken, currentUser?.id]);

  const [channels, setChannels] = useState<YouTubeChannel[]>(INITIAL_CHANNELS);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_PLANS);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem('streamjoin_txs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(t => Boolean(t && typeof t === 'object' && t.id));
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return INITIAL_TRANSACTIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('streamjoin_txs', JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  // Payment gateway settings state
  const [paymentGatewaySettings, setPaymentGatewaySettings] = useState<PaymentGatewaySettings>(() => {
    try {
      const stored = localStorage.getItem('streamjoin_gateway_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return { ...DEFAULT_PAYMENT_GATEWAY_SETTINGS, ...parsed };
      }
    } catch {}
    return DEFAULT_PAYMENT_GATEWAY_SETTINGS;
  });

  useEffect(() => {
    fetch('/api/system/gateway-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setPaymentGatewaySettings(prev => ({ ...prev, ...data.settings }));
          try {
            localStorage.setItem('streamjoin_gateway_settings', JSON.stringify(data.settings));
          } catch {}
        }
      })
      .catch(() => {});

    fetch('/api/homepage-demo')
      .then(res => res.json())
      .then(data => {
        if (data?.success && data?.config) {
          setHomepageDemoConfig(data.config);
          try {
            localStorage.setItem('streamallow_homepage_demo', JSON.stringify(data.config));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const updatePaymentGatewaySettings = async (settings: Partial<PaymentGatewaySettings>) => {
    const updated = { ...paymentGatewaySettings, ...settings };
    setPaymentGatewaySettings(updated);
    try {
      localStorage.setItem('streamjoin_gateway_settings', JSON.stringify(updated));
    } catch {}
    try {
      const res = await fetch('/api/system/gateway-settings', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast('Payment gateway numbers and instructions saved successfully!', 'success');
        logActivity('Updated payment gateway numbers & QR settings', 'admin');
      } else {
        showToast('Authorization required to update payment gateway settings.', 'error');
      }
    } catch (err) {
      showToast('Failed to reach server to save payment gateway settings.', 'error');
    }
  };

  const [checkoutModalPlan, setCheckoutModalPlan] = useState<SubscriptionPlan | null>(null);

  const openCheckoutModal = (planId?: 'basic' | 'pro' | 'business') => {
    const targetPlan = plans.find(p => p.id === (planId || currentUser?.plan?.toLowerCase() || 'pro')) || plans[1];
    setCheckoutModalPlan(targetPlan);
  };
  const [staff, setStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);
  const [marketingCampaigns, setMarketingCampaigns] = useState<MarketingCampaign[]>(INITIAL_MARKETING_CAMPAIGNS);
  const [seoSettings, setSeoSettings] = useState<SeoSettings>(INITIAL_SEO);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsData>(INITIAL_SYSTEM_SETTINGS);

  const DEFAULT_HOMEPAGE_DEMO: HomepageDemoConfig = {
    title: 'Relaxing LoFi Music 24/7',
    channelName: 'Music World',
    viewersText: '1.2K watching',
    videoUrl: '/uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80',
    videoSourceType: 'uploaded',
    resolution: '1080p · 60 FPS',
    bitrate: '4,500 kbps'
  };

  const [homepageDemoConfig, setHomepageDemoConfig] = useState<HomepageDemoConfig>(() => {
    try {
      const saved = localStorage.getItem('streamallow_homepage_demo');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_HOMEPAGE_DEMO;
  });

  // Playlists & Live Stream Restart State
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
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

  // Role switching helper: 'guest' triggers full logout; unauthenticated elevation is disabled
  const switchRole = (role: UserRole | 'guest') => {
    if (role === 'guest') {
      logout();
      return;
    }
    showToast('Direct role switching is disabled. Please sign in with valid credentials.', 'error');
  };

  // Impersonate / Visit user account from Admin (requires active verified admin session; memory-only)
  const impersonateUser = (targetUser: User) => {
    if (!currentUser || !['super_admin', 'admin', 'manager'].includes(currentUser.role) || !authTokenRef.current) {
      showToast('Admin authentication is required.', 'error');
      return;
    }
    if (!adminImpersonatorUser) {
      setAdminImpersonatorUser(currentUser);
    }

    setCurrentUser(targetUser);
    navigate('user/dashboard');
    showToast(`Logged in as ${targetUser.name} (${targetUser.email}). You can return to Admin at any time.`, 'info');
    logActivity(`Admin visited user account (${targetUser.email})`, 'admin');
  };

  const exitImpersonation = () => {
    if (!adminImpersonatorUser) {
      logout();
      return;
    }

    setCurrentUser(adminImpersonatorUser);
    setAdminImpersonatorUser(null);
    navigate('admin/users');
    showToast('Returned back to Admin Account.', 'success');
    logActivity('Exited user visit and returned to Admin Dashboard', 'admin');
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    const rawIdentifier = (email || '').trim();
    const trimmedPass = (pass || '').trim();

    if (!rawIdentifier || !trimmedPass) {
      showToast('Please enter both username/email and password.', 'error');
      return false;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rawIdentifier, password: trimmedPass })
      });

      const data = await safeParseResponse(res);

      if (res.ok && data?.success && data?.user && data?.token) {
        const { user, token } = data;
        setAuthToken(token);
        setCurrentUser(user);
        setAdminImpersonatorUser(null);

        const isAdminRole = ['super_admin', 'admin', 'manager', 'finance_manager', 'support_manager'].includes(user.role);
        await Promise.allSettled([
          fetchPlaylists(token),
          fetchStreams(token),
          fetchMedia(token),
          isAdminRole ? fetchUsers(token) : Promise.resolve()
        ]);

        if (isAdminRole) {
          navigate('admin/dashboard');
        } else {
          navigate('user/dashboard');
        }

        showToast(`Welcome back, ${user.name}!`, 'success');
        logActivity(`${user.name} logged in`, 'login');
        return true;
      }

      if (data?.rateExceeded) {
        showToast('Too many login requests. Please wait a moment and try again.', 'error');
      } else {
        showToast(data?.message || 'Invalid username/email or password.', 'error');
      }
      return false;
    } catch (err: any) {
      showToast(`Login failed: ${err?.message || 'Network error'}`, 'error');
      return false;
    }
  };

  const register = async (name: string, email: string, pass: string, planChoice?: string): Promise<boolean> => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const trimmedPass = (pass || '').trim();
    const assignedPlan = (planChoice || 'Basic') as 'Basic' | 'Pro' | 'Business';

    if (!normalizedEmail || !trimmedPass) {
      showToast('Please enter email and password to register.', 'error');
      return false;
    }
    if (trimmedPass.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return false;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          password: trimmedPass,
          plan: assignedPlan
        })
      });

      const data = await safeParseResponse(res);

      if (res.ok && data?.success && data?.user && data?.token) {
        const { user, token } = data;
        setAuthToken(token);
        setCurrentUser(user);
        setAdminImpersonatorUser(null);

        // Fresh user starts with clean empty playlists, streams, and media
        setPlaylists([]);
        setStreams([]);
        setUserMedia([]);

        navigate('user/dashboard');
        showToast('Registration successful! Welcome to Stream Allow.', 'success');
        logActivity(`New User Registered: ${user.name}`, 'user');
        return true;
      }

      if (data?.rateExceeded) {
        showToast(data?.message || data?.error || 'Too many registration requests. Please wait a moment and try again.', 'error');
      } else {
        showToast(data?.message || data?.error || 'Registration failed.', 'error');
      }
      return false;
    } catch (err: any) {
      showToast(`Registration failed: ${err?.message || 'Network error'}`, 'error');
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    const token = authTokenRef.current;
    if (!token) {
      showToast('Please login to change your password.', 'error');
      return false;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await safeParseResponse(res);
      if (res.ok && data?.success) {
        if (data.token) {
          setAuthToken(data.token);
        }
        showToast(data.message || 'Password updated securely!', 'success');
        logActivity('Account password updated securely', currentUser?.role === 'user' ? 'user' : 'admin');
        return true;
      }
      showToast(data?.message || 'Failed to update password.', 'error');
      return false;
    } catch (err: any) {
      showToast(`Failed to update password: ${err?.message || 'Network error'}`, 'error');
      return false;
    }
  };

  const logout = () => {
    const token = authTokenRef.current;
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }

    logActivity('User Logout', 'login');
    setAuthToken(null);
    clearLegacyAuthStorage();
    setCurrentUser(null);
    setAdminImpersonatorUser(null);
    setUsers([]);
    setPlaylists([]);
    setStreams([]);
    setUserMedia([]);
    navigate('public/login');
    showToast('Logged out successfully.', 'info');
  };

  // Data mutators
  const addUser = async (userData: Partial<User>) => {
    if (!authTokenRef.current) {
      showToast('Admin authentication required.', 'error');
      return;
    }

    const durationDays = Math.max(1, Number(userData.planDurationDays || 30) || 30);
    const now = new Date();
    const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(d);

    const maxGB = userData.plan === 'Business' ? 100 : userData.plan === 'Pro' ? 25 : 5;
    const normalizedEmail = (userData.email || 'user@example.com').trim().toLowerCase();

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: userData.name || 'New Creator',
          email: normalizedEmail,
          plan: userData.plan || 'Basic',
          password: userData.password || undefined,
          durationDays,
          maxStorageGB: maxGB,
          joinedDate: formatDate(now),
          expiresAt: expiry.toISOString()
        })
      });
      const data = await safeParseResponse(res);
      if (res.ok && data?.success && data?.user) {
        setUsers(prev => deduplicateUsers([data.user, ...prev]));
        showToast(`User ${data.user.name} added successfully!`, 'success');
        logActivity(`Created user ${data.user.email}`, 'admin');
        await fetchUsers();
        return;
      }
      showToast(data?.message || 'Failed to add user.', 'error');
    } catch (err: any) {
      showToast(`Failed to add user: ${err?.message || 'Network error'}`, 'error');
    }
  };

  const renewUserPlan = async (id: string, days: number = 30) => {
    const durationDays = Math.max(1, Number(days) || 30);
    const now = new Date();
    const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const newRenewalDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(expiry);
    const startIso = now.toISOString();
    const expiresAtIso = expiry.toISOString();

    const applyUpdatedUser = (serverUser?: Partial<User>) => {
      const mergedFields = {
        status: (serverUser?.status || 'Active') as User['status'],
        subscriptionStartDate: serverUser?.subscriptionStartDate || startIso,
        planDurationDays: serverUser?.planDurationDays ?? durationDays,
        renewalDaysLeft: serverUser?.renewalDaysLeft ?? durationDays,
        renewalDate: serverUser?.renewalDate || newRenewalDate,
        expiresAt: serverUser?.expiresAt || expiresAtIso
      };

      setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...mergedFields } : u)));
      setCurrentUser(curr => (curr && curr.id === id ? { ...curr, ...mergedFields } : curr));
    };

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: 'Active', durationDays })
      });
      const data = await safeParseResponse(res);
      if (res.ok && data?.success && data?.user) {
        applyUpdatedUser(data.user);
        await fetchUsers();
        showToast(`Plan activated & renewed successfully (+${durationDays} days)!`, 'success');
        logActivity(`Renewed user ${id} plan (+${durationDays}d) - Status: Plan Active`, 'admin');
        return;
      }
      showToast(data?.message || 'Failed to renew plan.', 'error');
    } catch (err: any) {
      showToast(`Failed to renew plan: ${err?.message || 'Network error'}`, 'error');
    }
  };

  const expireUserPlan = async (id: string) => {
    const expiredIso = new Date().toISOString();

    const applyExpiredUser = (serverUser?: Partial<User>) => {
      const mergedFields = {
        status: (serverUser?.status || 'Inactive') as User['status'],
        renewalDaysLeft: serverUser?.renewalDaysLeft ?? 0,
        renewalDate: serverUser?.renewalDate || 'Expired',
        expiresAt: serverUser?.expiresAt || expiredIso
      };

      setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...mergedFields } : u)));
      setCurrentUser(curr => (curr && curr.id === id ? { ...curr, ...mergedFields } : curr));
    };

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: 'Inactive' })
      });
      const data = await safeParseResponse(res);
      if (res.ok && data?.success && data?.user) {
        applyExpiredUser(data.user);
        await fetchUsers();
        showToast('Plan marked as Plan Expire!', 'error');
        logActivity(`Expired user ${id} plan - Status: Plan Expire`, 'admin');
        return;
      }
      showToast(data?.message || 'Failed to update plan status.', 'error');
    } catch (err: any) {
      showToast(`Failed to expire plan: ${err?.message || 'Network error'}`, 'error');
    }
  };

  const updateUserStatus = (id: string, status: 'Active' | 'Suspended') => {
    if (status === 'Active') {
      renewUserPlan(id, 30);
    } else {
      expireUserPlan(id);
    }
  };

  const addStream = async (streamData: Omit<StreamItem, 'id' | 'viewers' | 'views'> & {
    mediaId?: string;
    filePath?: string;
    videoUrl?: string;
    videoDuration?: string;
    durationSeconds?: number;
  }): Promise<boolean> => {
    const token = authTokenRef.current;
    if (!token) {
      showToast('Authentication required. Please login.', 'error');
      return false;
    }

    try {
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title: streamData.title,
          playlistId: streamData.playlistId,
          streamUrl: streamData.rtmpUrl,
          streamKey: streamData.streamKey,
          isDualStream: Boolean(streamData.isDualStream),
          backupRtmpUrl: streamData.backupRtmpUrl || '',
          thumbnail: streamData.thumbnail,
          resolution: streamData.resolution,
          bitrate: streamData.bitrate,
          mediaId: streamData.mediaId,
          filePath: streamData.filePath,
          videoUrl: streamData.videoUrl,
          videoDuration: streamData.videoDuration,
          durationSeconds: streamData.durationSeconds,
          loop: streamData.loop
        })
      });

      const data = await safeParseResponse(res);
      if (res.ok && data?.success && data?.stream) {
        const s = data.stream;
        const newStream: StreamItem = {
          ...streamData,
          id: s.id,
          userId: s.userId || currentUser?.id,
          viewers: 0,
          views: '0',
          date: s.date || 'Today',
          time: s.time || 'Just now',
          status: s.status || streamData.status || 'scheduled'
        };
        setStreams(prev => [newStream, ...prev.filter(x => x.id !== s.id)]);
        fetchStreams(token).catch(() => {});
        showToast(`Stream "${newStream.title}" created & permanently saved in database!`, 'success');
        logActivity(`Created stream: ${newStream.title}`, 'user');

        if (streamData.status === 'live') {
          return await updateStreamStatus(s.id, 'live');
        }
        return true;
      }
      showToast(data?.message || data?.error || 'Failed to create stream.', 'error');
      return false;
    } catch (err: any) {
      showToast(`Error creating stream: ${err?.message || 'Unexpected error'}`, 'error');
      return false;
    }
  };

  const updateStreamStatus = async (id: string, status: StreamItem['status']): Promise<boolean> => {
    const isStopAction = status === 'ended' || (status as string) === 'stopped' || status === 'failed';

    if (isStopAction) {
      const existingStopPromise = stopInFlightRef.current.get(id);
      if (existingStopPromise) {
        return existingStopPromise;
      }

      const stopPromise = (async (): Promise<boolean> => {
        setStoppingStreamIds(prev => (prev.includes(id) ? prev : [...prev, id]));
        try {
          const token = authTokenRef.current;
          if (!token) {
            showToast('Authentication required. Please login.', 'error');
            return false;
          }

          const retryDelays = [1200, 2400];
          let lastErrorMsg = 'Failed to confirm stream stop from server.';

          for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);
            try {
              const res = await fetch(`/api/streams/${encodeURIComponent(id)}/stop`, {
                method: 'POST',
                headers: getAuthHeaders(undefined, token),
                signal: controller.signal
              });
              clearTimeout(timeoutId);

              const data = await safeParseResponse(res);

              if (res.ok && data?.success) {
                setStreams(prev => prev.map(s => (s.id === id ? { ...s, status: 'ended' as const, viewers: 0 } : s)));
                setActiveViewingStream(curr => (curr && curr.id === id ? { ...curr, status: 'ended', viewers: 0 } : curr));
                setPlaylists(prev =>
                  prev.map(p => {
                    const matched = streams.find(s => s.id === id);
                    if (matched && (p.id === matched.playlistId || p.id === matched.id)) {
                      return { ...p, status: 'Ended' };
                    }
                    return p;
                  })
                );
                fetchStreams().catch(() => {});
                fetchPlaylists().catch(() => {});
                showToast('Stream stopped successfully. Broadcast is now OFFLINE.', 'info');
                logActivity(`Stopped live stream ${id}`, 'user');
                return true;
              }

              const isRetryable = res.status === 429 || data?.rateExceeded || res.status === 502 || res.status === 503 || res.status === 504;
              lastErrorMsg = data?.error || data?.message || `Server returned ${res.status} while stopping stream.`;

              if (isRetryable && attempt < retryDelays.length) {
                await new Promise(r => setTimeout(r, retryDelays[attempt]));
                continue;
              }

              showToast(lastErrorMsg, 'error');
              return false;
            } catch (reqErr: any) {
              clearTimeout(timeoutId);
              const isTimeoutOrNetwork = reqErr?.name === 'AbortError' || reqErr instanceof TypeError;
              lastErrorMsg = reqErr?.name === 'AbortError'
                ? 'Stop request timed out while waiting for server confirmation.'
                : `Stream stop error: ${reqErr?.message || 'Network error'}`;

              if (isTimeoutOrNetwork && attempt < retryDelays.length) {
                await new Promise(r => setTimeout(r, retryDelays[attempt]));
                continue;
              }

              showToast(lastErrorMsg, 'error');
              return false;
            }
          }

          showToast(lastErrorMsg, 'error');
          return false;
        } finally {
          stopInFlightRef.current.delete(id);
          setStoppingStreamIds(prev => prev.filter(sid => sid !== id));
        }
      })();

      stopInFlightRef.current.set(id, stopPromise);
      return stopPromise;
    }

    const token = authTokenRef.current;
    if (!token) {
      showToast('Authentication required. Please login.', 'error');
      return false;
    }

    try {
      if (status === 'live') {
        const res = await fetch(`/api/streams/${id}/start`, {
          method: 'POST',
          headers: getAuthHeaders(undefined, token)
        });
        const data = await safeParseResponse(res);
        if (res.ok && data.success) {
          setStreams(prev => prev.map(s => {
            if (s.id === id) {
              return {
                ...s,
                status: 'live',
                viewers: data.stats?.fps ? Math.round(data.stats.fps * 4) : 1,
                startedAt: data.stats?.startedAt || new Date().toISOString(),
                currentTrackIndex: typeof data.stats?.currentTrackIndex === 'number' ? data.stats.currentTrackIndex : 0,
                currentTrackStartedAt: data.stats?.currentTrackStartedAt || data.stats?.startedAt || new Date().toISOString(),
                totalTracks: data.stats?.totalTracks
              };
            }
            return s;
          }));
          setPlaylists(prev => prev.map(p => {
            const matched = streams.find(s => s.id === id);
            if (matched && (p.id === matched.playlistId || p.id === matched.id)) {
              return { ...p, status: 'Active' as const };
            }
            return p;
          }));
          fetchStreams().catch(() => {});
          fetchPlaylists().catch(() => {});
          showToast(`⚡ Stream is now LIVE on YouTube RTMP (PID: ${data.stats?.pid})!`, 'success');
          logActivity(`Started live stream ${id} (PID: ${data.stats?.pid})`, 'user');
          return true;
        } else {
          setStreams(prev => prev.map(s => s.id === id ? { ...s, status: 'failed' } : s));
          const errMsg = data.error || data.message || 'FFmpeg failed to start stream.';
          showToast(errMsg, 'error');
          return false;
        }
      }
      return false;
    } catch (err: any) {
      showToast(`Stream update error: ${err.message}`, 'error');
      return false;
    }
  };

  const deleteStream = async (id: string) => {
    if (!authTokenRef.current) {
      showToast('Authentication required. Please login.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/streams/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStreams(prev => prev.filter(s => s.id !== id));
        showToast('Stream removed permanently from database.', 'info');
        logActivity(`Deleted stream ${id}`, 'user');
        return;
      }
      showToast(data.message || 'Failed to delete stream.', 'error');
    } catch (err: any) {
      showToast(`Error deleting stream: ${err.message}`, 'error');
    }
  };

  const addPlaylist = async (playlistData: Omit<PlaylistItem, 'id' | 'createdAt'>): Promise<PlaylistItem | null> => {
    if (!authTokenRef.current) {
      showToast('Authentication required. Please login.', 'error');
      return null;
    }
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: playlistData.name,
          description: playlistData.description || '',
          thumbnail: playlistData.thumbnail,
          isLiveLoop: playlistData.isLiveLoop !== undefined ? playlistData.isLiveLoop : true
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.playlist) {
        const p = data.playlist;
        const newPl: PlaylistItem = {
          ...playlistData,
          id: p.id,
          userId: p.userId,
          createdAt: 'Today',
          videos: []
        };
        setPlaylists(prev => [newPl, ...prev]);
        setSelectedPlaylistId(p.id);
        showToast(`Playlist "${newPl.name}" created!`, 'success');
        logActivity(`Created playlist ${newPl.name}`, 'user');
        return newPl;
      }

      showToast(data?.message || 'Failed to create playlist.', 'error');
      return null;
    } catch (err: any) {
      showToast(`Error creating playlist: ${err?.message || 'Network error'}`, 'error');
      return null;
    }
  };

  const openPlaylistDetails = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    if (currentPath.startsWith('admin/')) {
      navigate('admin/playlist-details');
    } else {
      navigate('user/playlist-details');
    }
  };

  const addVideoToPlaylist = async (
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
      mediaId?: string;
    }
  ) => {
    const tempVideoId = `vid-${Date.now()}`;
    const optimisticVideo = {
      id: tempVideoId,
      playlistId,
      title: newVideo.title,
      duration: newVideo.duration || '00:00',
      formattedDuration: newVideo.duration || '00:00',
      durationSeconds: newVideo.durationSeconds || 0,
      url: newVideo.url,
      fileUrl: newVideo.url,
      thumbnail: newVideo.thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
      thumbnailUrl: newVideo.thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
      filePath: newVideo.filePath,
      storagePath: newVideo.filePath,
      resolution: newVideo.resolution || '1080p FHD',
      format: newVideo.format || 'MP4',
      fileSizeBytes: newVideo.fileSizeBytes || 0,
      positionOrder: 99
    };

    // Optimistically add video to state immediately
    setPlaylists(prev => {
      const exists = prev.some(p => p.id === playlistId);
      if (exists) {
        return prev.map(p => {
          if (p.id === playlistId) {
            const updatedVideos = [...(p.videos || []), optimisticVideo];
            return {
              ...p,
              videosCount: updatedVideos.length,
              videos: updatedVideos,
              thumbnail: newVideo.thumbnail || p.thumbnail
            };
          }
          return p;
        });
      }
      const matchingStream = streams.find(s => s.playlistId === playlistId || s.id === playlistId);
      const newPlaylist: PlaylistItem = {
        id: playlistId,
        name: matchingStream?.title || newVideo.title || 'Stream Playlist',
        description: 'Live broadcast playlist',
        videosCount: 1,
        duration: newVideo.duration || '00:00',
        status: 'Active',
        createdAt: 'Today',
        thumbnail: newVideo.thumbnail || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
        isLiveLoop: true,
        videos: [optimisticVideo]
      };
      return [...prev, newPlaylist];
    });

    const token = authTokenRef.current;
    try {
      const res = await fetch(`/api/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }, token || undefined),
        body: JSON.stringify(newVideo)
      });

      const data = await res.json();
      if (res.ok && data.success && data.video) {
        const serverVideo = data.video;
        // Replace optimistic video with genuine server record
        setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId) {
            const updatedVideos = (p.videos || []).map(v => v.id === tempVideoId ? serverVideo : v);
            return {
              ...p,
              videosCount: updatedVideos.length,
              videos: updatedVideos,
              thumbnail: serverVideo.thumbnail || serverVideo.thumbnailUrl || newVideo.thumbnail || p.thumbnail
            };
          }
          return p;
        }));
        showToast(`Video "${newVideo.title}" added to playlist queue!`, 'success');
        logActivity(`Added video "${newVideo.title}" to playlist`, 'user');
        return;
      }
      // If server returned a message, log notice but keep optimistic item
      if (data.message) {
        console.warn('Backend playlist add notice:', data.message);
      }
    } catch (err: any) {
      console.warn('Network notice during video add:', err?.message);
    }
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
    const token = authTokenRef.current;
    if (token) {
      fetch(`/api/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }, token),
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

    const applyUpdatedStats = (stats?: any) => {
      const resolvedTrackIndex = typeof stats?.currentTrackIndex === 'number' ? stats.currentTrackIndex : trackIndex;
      const resolvedStartedAt = stats?.currentTrackStartedAt || new Date().toISOString();
      setStreams(prev => prev.map(s => {
        if (s.id === targetStream?.id) {
          return {
            ...s,
            status: 'live',
            thumbnail: startVideo?.thumbnail || s.thumbnail,
            currentTrackIndex: resolvedTrackIndex,
            currentTrackStartedAt: resolvedStartedAt,
            totalTracks: stats?.totalTracks ?? s.totalTracks,
            startedAt: stats?.startedAt ?? s.startedAt
          };
        }
        return s;
      }));
      setActiveViewingStream(curr => {
        if (curr && curr.id === targetStream?.id) {
          return {
            ...curr,
            status: 'live',
            thumbnail: startVideo?.thumbnail || curr.thumbnail,
            currentTrackIndex: resolvedTrackIndex,
            currentTrackStartedAt: resolvedStartedAt,
            totalTracks: stats?.totalTracks ?? curr.totalTracks
          };
        }
        return curr;
      });
      setStreamRestartState(null);
      showToast(`⚡ Live broadcast restarted! Now live streaming: "${videoTitle}"`, 'success');
      logActivity(`Live broadcast restarted for: ${streamTitle}`, 'user');
    };

    // Notify backend Express / FFmpeg engine if targetStream exists
    if (targetStream) {
      fetch(`/api/streams/${targetStream.id}/restart`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ playlistId, trackIndex })
      })
        .then(res => safeParseResponse(res).catch(() => null))
        .then(data => {
          applyUpdatedStats(data?.stats);
          fetchStreams().catch(() => {});
        })
        .catch(() => {
          applyUpdatedStats();
        });
    } else {
      setTimeout(() => applyUpdatedStats(), 600);
    }
  };

  const removeVideoFromPlaylist = async (playlistId: string, videoId: string) => {
    try {
      await fetch(`/api/playlists/${playlistId}/videos/${videoId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (e) {
      console.warn('Failed to delete video from playlist on server:', e);
    }

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

  const deletePlaylist = async (id: string) => {
    try {
      await fetch(`/api/playlists/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (e) {
      console.warn('Failed to delete playlist on server:', e);
    }

    setPlaylists(prev => prev.filter(p => p.id !== id));
    showToast('Playlist deleted', 'info');
  };

  const connectChannel = (channelData: Omit<YouTubeChannel, 'id' | 'connectedAt'>) => {
    const newChan: YouTubeChannel = {
      ...channelData,
      id: `ch-${Date.now()}`,
      userId: currentUser?.id,
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
      userId: currentUser?.id || '',
      userName: currentUser?.name || 'User',
      userEmail: currentUser?.email || '',
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

  const submitUserPayment = async (data: {
    planId: 'basic' | 'pro' | 'business';
    gateway: string;
    transactionId: string;
    amountBDT: number;
    amountUSD: number;
    currency: 'BDT' | 'USD';
  }): Promise<boolean> => {
    const selectedPlan = plans.find(p => p.id === data.planId) || plans[1];
    const todayFormatted = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date());

    const pendingTx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: currentUser?.id || 'u-user',
      userName: currentUser?.name || 'User',
      userEmail: currentUser?.email || 'user@streamallow.com',
      plan: `${selectedPlan.name} Plan`,
      amountUSD: data.amountUSD,
      amountBDT: data.amountBDT,
      status: 'Pending',
      paymentMethod: data.gateway as any,
      transactionId: data.transactionId,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: todayFormatted,
      submittedAt: 'Just now'
    };

    setTransactions(prev => [pendingTx, ...prev]);

    // Send to backend
    try {
      await fetch('/api/billing/submit-payment', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          planId: data.planId,
          gateway: data.gateway,
          transactionId: data.transactionId,
          amountBDT: data.amountBDT,
          amountUSD: data.amountUSD,
          currency: data.currency,
          userId: currentUser?.id,
          userName: currentUser?.name,
          userEmail: currentUser?.email
        })
      });
    } catch (e) {
      console.warn('Backend submit-payment warning:', e);
    }

    logActivity(`Submitted ${data.gateway} payment for ${selectedPlan.name} Plan (TrxID: ${data.transactionId}) - Pending Admin Verification`, 'user');
    return true;
  };

  const approveUserTransaction = async (transactionId: string): Promise<boolean> => {
    const tx = transactions.find(t => t.id === transactionId || t.transactionId === transactionId || t.invoiceNumber === transactionId);
    if (!tx) {
      showToast('Transaction not found.', 'error');
      return false;
    }

    let planTier: 'Basic' | 'Pro' | 'Business' = 'Pro';
    if (tx.plan.toLowerCase().includes('business')) planTier = 'Business';
    else if (tx.plan.toLowerCase().includes('basic')) planTier = 'Basic';
    else if (tx.plan.toLowerCase().includes('pro')) planTier = 'Pro';

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const newRenewalDate = `${months[expiryDate.getMonth()]} ${expiryDate.getDate() < 10 ? '0' : ''}${expiryDate.getDate()}, ${expiryDate.getFullYear()}`;
    const expiresAtIso = expiryDate.toISOString();

    // 1. Mark transaction as Paid
    setTransactions(prev => {
      const updated = prev.map(t => {
        if (t.id === tx.id || t.transactionId === tx.transactionId || (tx.invoiceNumber && t.invoiceNumber === tx.invoiceNumber)) {
          return { ...t, status: 'Paid' as const };
        }
        return t;
      });
      try {
        localStorage.setItem('streamjoin_transactions_data', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Activate user account in users state
    setUsers(prev => prev.map(u => {
      const matches = (tx.userId && u.id === tx.userId) ||
                      (tx.userEmail && u.email && u.email.toLowerCase() === tx.userEmail.toLowerCase()) ||
                      (tx.userName && u.name && u.name.toLowerCase() === tx.userName.toLowerCase());
      if (matches) {
        return {
          ...u,
          status: 'Active' as const,
          plan: planTier,
          renewalDaysLeft: 30,
          renewalDate: newRenewalDate,
          expiresAt: expiresAtIso
        };
      }
      return u;
    }));

    // 3. Update current user if matching
    if (currentUser && (
      (tx.userId && currentUser.id === tx.userId) ||
      (tx.userEmail && currentUser.email && currentUser.email.toLowerCase() === tx.userEmail.toLowerCase()) ||
      (tx.userName && currentUser.name && currentUser.name.toLowerCase() === tx.userName.toLowerCase())
    )) {
      const updatedUser: User = {
        ...currentUser,
        status: 'Active',
        plan: planTier,
        renewalDaysLeft: 30,
        renewalDate: newRenewalDate,
        expiresAt: expiresAtIso
      };
      setCurrentUser(updatedUser);
    }

    // 4. Send full backend sync payload to guarantee PostgreSQL activates the user account
    try {
      await fetch(`/api/admin/transactions/${encodeURIComponent(tx.id)}/approve`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          transactionId: tx.id,
          transactionRef: tx.transactionId,
          invoiceNumber: tx.invoiceNumber,
          userId: tx.userId,
          userEmail: tx.userEmail,
          userName: tx.userName,
          plan: planTier
        })
      });
      // Fetch fresh PostgreSQL state
      await fetchUsers();
    } catch (e) {
      console.warn('Backend approve warning:', e);
    }

    showToast(`✓ Payment approved! User account (${tx.userName}) is now ACTIVE.`, 'success');
    logActivity(`Approved payment ${tx.invoiceNumber} (TrxID: ${tx.transactionId || 'N/A'}) - Account Activated`, 'admin');
    return true;
  };

  const rejectUserTransaction = async (transactionId: string): Promise<boolean> => {
    setTransactions(prev => prev.map(t => {
      if (t.id === transactionId || t.transactionId === transactionId || t.invoiceNumber === transactionId) {
        return { ...t, status: 'Failed' };
      }
      return t;
    }));

    try {
      await fetch(`/api/admin/transactions/${transactionId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' })
      });
    } catch (e) {}

    showToast('Transaction marked as Failed / Rejected.', 'info');
    logActivity(`Rejected transaction ${transactionId}`, 'admin');
    return true;
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
      userId: currentUser?.id || '',
      userName: currentUser?.name || 'User',
      userEmail: currentUser?.email || '',
      subject,
      category,
      priority,
      status: 'Open',
      createdAt: 'Today',
      updatedAt: 'Just now',
      assignedTo: 'Support Team',
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: 'user',
          senderName: currentUser?.name || 'User',
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

  const fetchHomepageDemoConfig = async () => {
    try {
      const res = await fetch('/api/homepage-demo');
      const data = await safeParseResponse(res);
      if (res.ok && data?.success && data?.config) {
        setHomepageDemoConfig(data.config);
        try {
          localStorage.setItem('streamallow_homepage_demo', JSON.stringify(data.config));
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to fetch homepage demo config:', e);
    }
  };

  const updateHomepageDemoConfig = async (newConfig: Partial<HomepageDemoConfig>): Promise<boolean> => {
    const merged = { ...homepageDemoConfig, ...newConfig };
    try {
      const res = await fetch('/api/admin/homepage-demo', {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(merged)
      });
      const data = await safeParseResponse(res);
      if (res.ok && data?.success) {
        setHomepageDemoConfig(merged);
        try {
          localStorage.setItem('streamallow_homepage_demo', JSON.stringify(merged));
        } catch {}
        showToast('Homepage Demo Video updated! Public Homepage now reflects the new video.', 'success');
        logActivity(`Super Admin updated Homepage Demo Video to "${merged.title}"`, 'admin');
        return true;
      }
      showToast(data?.message || 'Failed to update Homepage Demo Video.', 'error');
      return false;
    } catch (err: any) {
      showToast(`Error updating demo video: ${err.message}`, 'error');
      return false;
    }
  };

  const resetHomepageDemoConfig = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/homepage-demo/reset', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' })
      });
      const data = await safeParseResponse(res);
      if (res.ok && data?.success && data?.config) {
        setHomepageDemoConfig(data.config);
        try {
          localStorage.setItem('streamallow_homepage_demo', JSON.stringify(data.config));
        } catch {}
        showToast('Homepage Demo Video reset to original default.', 'info');
        logActivity('Super Admin reset Homepage Demo Video to default', 'admin');
        return true;
      }
      showToast(data?.message || 'Failed to reset demo video.', 'error');
      return false;
    } catch (err: any) {
      showToast(`Error resetting demo video: ${err.message}`, 'error');
      return false;
    }
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

  // User-scoped data isolation & Plan Active status with 1-month auto-expiry check
  const isUserPlanActive = Boolean(
    currentUser?.status === 'Active' &&
    (currentUser?.renewalDaysLeft === undefined || currentUser?.renewalDaysLeft > 0) &&
    (!currentUser?.expiresAt || new Date(currentUser.expiresAt).getTime() > Date.now())
  );

  const userStreams = streams.filter(s => {
    if (currentUser?.role && currentUser.role !== 'user') return true;
    if (s.userId) {
      if (s.userId === currentUser?.id) return true;
      if (currentUser?.email && s.userId.toLowerCase() === currentUser.email.toLowerCase()) return true;
    }
    return false;
  });

  const userPlaylists = playlists.filter(p => {
    if (currentUser?.role && currentUser.role !== 'user') return true;
    if (p.userId) return p.userId === currentUser?.id;
    return false;
  });

  const userChannels = (currentUser?.role && currentUser.role !== 'user')
    ? channels
    : channels.filter(c => c.userId === currentUser?.id);

  const userTransactions = transactions.filter(t => {
    if (currentUser?.role && currentUser.role !== 'user') return true;
    if (t.userId) return t.userId === currentUser?.id;
    return false;
  });

  return (
    <AppContext.Provider
      value={{
        currentPath,
        navigate,
        currency,
        setCurrency,
        formatPrice,
        authToken,
        currentUser,
        setCurrentUser,
        adminImpersonatorUser,
        impersonateUser,
        exitImpersonation,
        switchRole,
        login,
        register,
        changePassword,
        logout,
        users,
        fetchUsers,
        addUser,
        updateUserStatus,
        renewUserPlan,
        expireUserPlan,
        streams,
        userStreams,
        fetchStreams,
        addStream,
        updateStreamStatus,
        stoppingStreamIds,
        deleteStream,
        playlists,
        userPlaylists,
        fetchPlaylists,
        userMedia,
        fetchMedia,
        deleteMedia,
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
        channels: userChannels,
        connectChannel,
        disconnectChannel,
        updateChannelRole,
        plans,
        updatePlan,
        userPlan,
        isUserPlanActive,
        upgradeUserPlan,
        cancelUserPlan,
        paymentGatewaySettings,
        updatePaymentGatewaySettings,
        checkoutModalPlan,
        setCheckoutModalPlan,
        openCheckoutModal,
        submitUserPayment,
        approveUserTransaction,
        rejectUserTransaction,
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
        homepageDemoConfig,
        fetchHomepageDemoConfig,
        updateHomepageDemoConfig,
        resetHomepageDemoConfig,
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
