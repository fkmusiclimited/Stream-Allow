import {
  User,
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

export const INITIAL_USERS: User[] = [
  {
    id: 'u-admin',
    name: 'Super Admin',
    email: 'admin@streamjoin.com',
    password: 'admin123',
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
  },
  {
    id: 'u1',
    name: 'Fahim Ahmed',
    email: 'fahim@gmail.com',
    password: 'user123',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    plan: 'Pro',
    status: 'Active',
    joinedDate: 'Oct 30, 2026',
    channelsCount: 3,
    totalViews: '125K',
    phone: '+880 1712-345678',
    country: 'Bangladesh',
    usedStorageGB: 6.4,
    maxStorageGB: 25,
    renewalDate: 'Nov 30, 2026',
    renewalDaysLeft: 30
  },
  {
    id: 'u2',
    name: 'Nadia Islam',
    email: 'nadia@gmail.com',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    plan: 'Basic',
    status: 'Active',
    joinedDate: 'Oct 29, 2026',
    channelsCount: 1,
    totalViews: '42K',
    phone: '+880 1819-876543',
    country: 'Bangladesh',
    usedStorageGB: 3.2,
    maxStorageGB: 5,
    renewalDate: 'Nov 14, 2026',
    renewalDaysLeft: 14
  },
  {
    id: 'u3',
    name: 'Rakib Hasan',
    email: 'rakib@gmail.com',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    plan: 'Business',
    status: 'Active',
    joinedDate: 'Oct 28, 2026',
    channelsCount: 8,
    totalViews: '850K',
    phone: '+880 1911-234567',
    country: 'Bangladesh',
    usedStorageGB: 42.8,
    maxStorageGB: 100,
    renewalDate: 'Nov 03, 2026',
    renewalDaysLeft: 3
  },
  {
    id: 'u4',
    name: 'Sumi Akter',
    email: 'sumi@gmail.com',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    plan: 'Basic',
    status: 'Suspended',
    joinedDate: 'Oct 27, 2026',
    channelsCount: 1,
    totalViews: '12K',
    phone: '+880 1610-987654',
    country: 'Bangladesh',
    usedStorageGB: 4.9,
    maxStorageGB: 5,
    renewalDate: 'Oct 27, 2026',
    renewalDaysLeft: 0 // Expired, shown in RED
  },
  {
    id: 'u5',
    name: 'Tanvir Hossain',
    email: 'tanvir@gmail.com',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    plan: 'Pro',
    status: 'Active',
    joinedDate: 'Oct 26, 2026',
    channelsCount: 4,
    totalViews: '310K',
    phone: '+880 1515-456789',
    country: 'Bangladesh',
    usedStorageGB: 24.2,
    maxStorageGB: 25,
    renewalDate: 'Oct 24, 2026',
    renewalDaysLeft: -3 // Expired / overdue, shown in RED
  }
];

export const INITIAL_STREAMS: StreamItem[] = [
  {
    id: 'str-1',
    title: 'Relaxing Music Live',
    description: '24/7 Lo-Fi & chill music stream for studying, sleeping, and deep focus.',
    channelName: 'Music World',
    channelId: 'ch-2',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    status: 'live',
    viewers: 1200,
    views: '125K',
    date: 'Oct 30, 2026',
    time: '10:00 PM',
    playlistId: 'pl-1',
    streamKey: 'stream_key_placeholder_1',
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    resolution: '1080p60',
    bitrate: '4500 kbps',
    loop: true
  },
  {
    id: 'str-2',
    title: 'Study With Me Live',
    description: 'Pomodoro study session with calming rain sounds and ambient lights.',
    channelName: 'Study BD',
    channelId: 'ch-4',
    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
    status: 'scheduled',
    viewers: 0,
    views: '18K',
    date: 'Oct 31, 2026',
    time: '8:00 PM',
    scheduledTime: 'Tomorrow, 8:00 PM',
    playlistId: 'pl-2',
    streamKey: 'stream_key_placeholder_2',
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    resolution: '1080p60',
    bitrate: '4000 kbps',
    loop: false
  },
  {
    id: 'str-3',
    title: 'Gaming Live Stream',
    description: 'Non-stop GTA V, Valorant and Minecraft community highlights and gameplay.',
    channelName: 'Game Zone',
    channelId: 'ch-3',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    status: 'ended',
    viewers: 856,
    views: '25K',
    date: 'Oct 29, 2026',
    time: '9:00 PM',
    playlistId: 'pl-3',
    streamKey: 'stream_key_placeholder_3',
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    resolution: '1080p60',
    bitrate: '6000 kbps',
    loop: true
  },
  {
    id: 'str-4',
    title: 'Lofi Chill Music',
    description: 'Aesthetic Japanese lofi hip hop mix with anime visuals.',
    channelName: 'Chill Beats',
    channelId: 'ch-2',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    status: 'ended',
    viewers: 0,
    views: '25K',
    date: 'Oct 29, 2026',
    time: '7:00 PM',
    playlistId: 'pl-4',
    streamKey: 'stream_key_placeholder_4',
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    resolution: '1080p',
    bitrate: '4500 kbps',
    loop: true
  },
  {
    id: 'str-5',
    title: 'Bollywood Hits Live',
    description: 'Classic & modern romantic songs non-stop radio jukebox.',
    channelName: 'Movie Songs',
    channelId: 'ch-5',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    status: 'failed',
    viewers: 0,
    views: '12K',
    date: 'Oct 29, 2026',
    time: '6:00 PM',
    playlistId: 'pl-5',
    streamKey: 'stream_key_placeholder_5',
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    resolution: '720p',
    bitrate: '2500 kbps',
    loop: false
  }
];

export const INITIAL_PLAYLISTS: PlaylistItem[] = [
  {
    id: 'pl-1',
    name: 'Relaxing Music',
    videosCount: 25,
    status: 'Active',
    createdAt: 'Oct 30, 2026',
    duration: '4h 32m',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    videos: [
      { id: 'v1', title: 'Deep Ambient Lo-Fi Tape #1 (Rain & Beats)', duration: '12:45', url: 'https://cdn.streamjoin.com/media/ambient1.mp4', thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80' },
      { id: 'v2', title: 'Midnight Chill Beats - Urban Tokyo Mix', duration: '14:20', url: 'https://cdn.streamjoin.com/media/chill2.mp4', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80' },
      { id: 'v3', title: 'Rainy Cafe Vibes - Smooth Rhodes Piano', duration: '18:10', url: 'https://cdn.streamjoin.com/media/cafe3.mp4', thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80' },
      { id: 'v4', title: 'Dusk Coffee Shop Jazz & Study Vibes', duration: '16:05', url: 'https://cdn.streamjoin.com/media/jazz4.mp4', thumbnail: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'pl-2',
    name: 'Study Music',
    videosCount: 40,
    status: 'Active',
    createdAt: 'Oct 29, 2026',
    duration: '8h 15m',
    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=80',
    videos: [
      { id: 'v5', title: 'Focus Piano Symphony - 432Hz Calm', duration: '20:00', url: 'https://cdn.streamjoin.com/media/piano1.mp4', thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&auto=format&fit=crop&q=80' },
      { id: 'v6', title: 'Binaural Alpha Waves for Deep Concentration', duration: '25:15', url: 'https://cdn.streamjoin.com/media/alpha2.mp4', thumbnail: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&auto=format&fit=crop&q=80' },
      { id: 'v7', title: 'Library Rainstorm & Soft Cello Solos', duration: '19:40', url: 'https://cdn.streamjoin.com/media/cello3.mp4', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'pl-3',
    name: 'Gaming Live',
    videosCount: 18,
    status: 'Scheduled',
    createdAt: 'Oct 28, 2026',
    duration: '3h 40m',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
    videos: [
      { id: 'v8', title: 'Esports Championship Highlights Vol. 3', duration: '15:20', url: 'https://cdn.streamjoin.com/media/esports1.mp4', thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=80' },
      { id: 'v9', title: 'Speedrun Marathon & Community Clutches', duration: '22:10', url: 'https://cdn.streamjoin.com/media/speedrun2.mp4', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'pl-4',
    name: 'LoFi Collection',
    videosCount: 35,
    status: 'Active',
    createdAt: 'Oct 27, 2026',
    duration: '6h 50m',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    videos: [
      { id: 'v10', title: 'Chillhop Records Autumn Beat Tape', duration: '18:40', url: 'https://cdn.streamjoin.com/media/autumn.mp4', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80' },
      { id: 'v11', title: 'Sunset Boulevard Synthwave & LoFi Mix', duration: '24:00', url: 'https://cdn.streamjoin.com/media/synthwave.mp4', thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80' }
    ]
  },
  {
    id: 'pl-5',
    name: 'My Favorites',
    videosCount: 28,
    status: 'Ended',
    createdAt: 'Oct 26, 2026',
    duration: '5h 10m',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    videos: [
      { id: 'v12', title: 'Best Acoustic Sessions & Live Performances', duration: '30:00', url: 'https://cdn.streamjoin.com/media/acoustic.mp4', thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80' }
    ]
  }
];

export const INITIAL_CHANNELS: YouTubeChannel[] = [
  {
    id: 'ch-1',
    name: 'FK Music',
    handle: '@fknmusic',
    subscribers: '1.68M subscribers',
    avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80',
    status: 'Connected',
    connectedAt: 'Oct 15, 2026',
    role: 'Owner'
  },
  {
    id: 'ch-2',
    name: 'Music World',
    handle: '@musicworld',
    subscribers: '482K subscribers',
    avatar: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100&auto=format&fit=crop&q=80',
    status: 'Connected',
    connectedAt: 'Oct 18, 2026',
    role: 'Owner'
  },
  {
    id: 'ch-3',
    name: 'Game Zone',
    handle: '@gamezone',
    subscribers: '125K subscribers',
    avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop&q=80',
    status: 'Disconnected',
    connectedAt: 'Oct 10, 2026',
    role: 'Editor'
  },
  {
    id: 'ch-4',
    name: 'Study BD',
    handle: '@studybd',
    subscribers: '86K subscribers',
    avatar: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=100&auto=format&fit=crop&q=80',
    status: 'Connected',
    connectedAt: 'Oct 22, 2026',
    role: 'Owner'
  },
  {
    id: 'ch-5',
    name: 'Movie Songs',
    handle: '@moviesongs',
    subscribers: '210K subscribers',
    avatar: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&auto=format&fit=crop&q=80',
    status: 'Pending',
    connectedAt: 'Oct 29, 2026',
    role: 'Viewer'
  },
  {
    id: 'ch-6',
    name: 'Fahim Music',
    handle: '@fahimmusic',
    subscribers: '125K subscribers',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    status: 'Connected',
    connectedAt: 'Oct 01, 2026',
    role: 'Owner'
  },
  {
    id: 'ch-7',
    name: 'Gaming World',
    handle: '@gamingworld',
    subscribers: '48K subscribers',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80',
    status: 'Connected',
    connectedAt: 'Oct 05, 2026',
    role: 'Editor'
  },
  {
    id: 'ch-8',
    name: 'Study Live BD',
    handle: '@studylivebd',
    subscribers: '12K subscribers',
    avatar: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=100&auto=format&fit=crop&q=80',
    status: 'Connected',
    connectedAt: 'Oct 12, 2026',
    role: 'Viewer'
  }
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'For small creators & solo streamers',
    priceUSD: 9,
    priceBDT: 990,
    features: [
      '1 YouTube Channel',
      'Basic Features',
      'Standard Support',
      '720p HD Stream Quality',
      'Up to 12 Hours Continuous Stream'
    ],
    maxChannels: 1,
    autoStreaming: false,
    playlistStreaming: false,
    advancedAnalytics: false,
    supportLevel: 'Standard Support'
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For growing creators & channels',
    priceUSD: 29,
    priceBDT: 2990,
    isPopular: true,
    features: [
      '5 YouTube Channels',
      'Playlist Streaming',
      'Auto Live Streaming (24/7)',
      'Advanced Analytics & Viewers Insights',
      'Priority Support',
      '1080p60 Full HD Streaming',
      'Automated Loop & Schedule'
    ],
    maxChannels: 5,
    autoStreaming: true,
    playlistStreaming: true,
    advancedAnalytics: true,
    supportLevel: 'Priority Support'
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For agencies, media houses & music labels',
    priceUSD: 69,
    priceBDT: 6990,
    features: [
      'Unlimited YouTube Channels',
      'All Features Included',
      'Team Access & Role Permissions',
      'Advanced Analytics & Raw Export',
      '24/7 Premium VIP Support',
      'Dedicated Cloud Stream Server',
      'Full API Access & Webhooks'
    ],
    maxChannels: 'Unlimited',
    autoStreaming: true,
    playlistStreaming: true,
    advancedAnalytics: true,
    supportLevel: '24/7 Premium Support'
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    userId: 'u1',
    userName: 'Fahim Ahmed',
    userEmail: 'fahim@gmail.com',
    plan: 'Pro Plan',
    amountUSD: 29,
    amountBDT: 2990,
    status: 'Paid',
    date: 'Oct 30, 2026',
    paymentMethod: 'bKash',
    invoiceNumber: 'INV-2026-1030'
  },
  {
    id: 'tx-2',
    userId: 'u2',
    userName: 'Nadia Islam',
    userEmail: 'nadia@gmail.com',
    plan: 'Basic Plan',
    amountUSD: 9,
    amountBDT: 990,
    status: 'Paid',
    date: 'Oct 29, 2026',
    paymentMethod: 'Nagad',
    invoiceNumber: 'INV-2026-1029'
  },
  {
    id: 'tx-3',
    userId: 'u3',
    userName: 'Rakib Hasan',
    userEmail: 'rakib@gmail.com',
    plan: 'Business Plan',
    amountUSD: 69,
    amountBDT: 6990,
    status: 'Pending',
    date: 'Oct 28, 2026',
    paymentMethod: 'SSLCommerz',
    invoiceNumber: 'INV-2026-1028'
  },
  {
    id: 'tx-4',
    userId: 'u4',
    userName: 'Sumi Akter',
    userEmail: 'sumi@gmail.com',
    plan: 'Pro Plan',
    amountUSD: 29,
    amountBDT: 2990,
    status: 'Failed',
    date: 'Oct 27, 2026',
    paymentMethod: 'Credit Card',
    invoiceNumber: 'INV-2026-1027'
  },
  {
    id: 'tx-5',
    userId: 'u5',
    userName: 'Tanvir Hossain',
    userEmail: 'tanvir@gmail.com',
    plan: 'Basic Plan',
    amountUSD: 9,
    amountBDT: 990,
    status: 'Paid',
    date: 'Oct 26, 2026',
    paymentMethod: 'bKash',
    invoiceNumber: 'INV-2026-1026'
  },
  {
    id: 'tx-6',
    userId: 'u1',
    userName: 'Fahim Ahmed',
    userEmail: 'fahim@gmail.com',
    plan: 'Pro Plan',
    amountUSD: 29,
    amountBDT: 2990,
    status: 'Paid',
    date: 'Sep 30, 2026',
    paymentMethod: 'bKash',
    invoiceNumber: 'INV-2026-0930'
  },
  {
    id: 'tx-7',
    userId: 'u1',
    userName: 'Fahim Ahmed',
    userEmail: 'fahim@gmail.com',
    plan: 'Pro Plan',
    amountUSD: 29,
    amountBDT: 2990,
    status: 'Paid',
    date: 'Aug 30, 2026',
    paymentMethod: 'bKash',
    invoiceNumber: 'INV-2026-0830'
  },
  {
    id: 'tx-8',
    userId: 'u1',
    userName: 'Fahim Ahmed',
    userEmail: 'fahim@gmail.com',
    plan: 'Pro Plan',
    amountUSD: 29,
    amountBDT: 2990,
    status: 'Paid',
    date: 'Jul 30, 2026',
    paymentMethod: 'bKash',
    invoiceNumber: 'INV-2026-0730'
  },
  {
    id: 'tx-9',
    userId: 'u1',
    userName: 'Fahim Ahmed',
    userEmail: 'fahim@gmail.com',
    plan: 'Basic Plan',
    amountUSD: 9,
    amountBDT: 990,
    status: 'Paid',
    date: 'Jun 30, 2026',
    paymentMethod: 'Rocket',
    invoiceNumber: 'INV-2026-0630'
  }
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'st-1',
    name: 'Admin',
    role: 'Super Admin',
    email: 'admin@streamjoin.com',
    status: 'Active',
    lastActive: 'Just now',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    permissions: ['all']
  },
  {
    id: 'st-2',
    name: 'Rafiq',
    role: 'Manager',
    email: 'rafiq@streamjoin.com',
    status: 'Active',
    lastActive: '5m ago',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    permissions: ['users', 'streams', 'playlists', 'youtube', 'reports']
  },
  {
    id: 'st-3',
    name: 'Jannat',
    role: 'Support',
    email: 'jannat@streamjoin.com',
    status: 'Active',
    lastActive: '12m ago',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    permissions: ['support', 'users_view', 'streams_view']
  },
  {
    id: 'st-4',
    name: 'Karim',
    role: 'Finance',
    email: 'karim@streamjoin.com',
    status: 'Active',
    lastActive: '30m ago',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    permissions: ['payments', 'subscriptions', 'reports']
  },
  {
    id: 'st-5',
    name: 'Mitu',
    role: 'Moderator',
    email: 'mitu@streamjoin.com',
    status: 'Active',
    lastActive: '1h ago',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    permissions: ['streams_view', 'streams_moderate', 'playlists_view']
  }
];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 't-1',
    userId: 'u1',
    userName: 'Fahim Ahmed',
    userEmail: 'fahim@gmail.com',
    subject: 'Stream not starting on Channel 2',
    status: 'Open',
    priority: 'High',
    createdAt: 'Oct 30, 2026',
    updatedAt: '10:25 PM',
    category: 'Streaming Issue',
    assignedTo: 'Jannat',
    messages: [
      {
        id: 'm1',
        sender: 'user',
        senderName: 'Fahim Ahmed',
        text: 'I scheduled a 24/7 stream for 10 PM, but YouTube studio shows waiting for live stream stream key.',
        timestamp: '10:24 PM'
      },
      {
        id: 'm2',
        sender: 'agent',
        senderName: 'Support Team',
        text: 'Hello Fahim! We are checking your RTMP pipeline right now. Sure! I will guide you step by step.',
        timestamp: '10:25 PM'
      }
    ]
  },
  {
    id: 't-2',
    userId: 'u2',
    userName: 'Nadia Islam',
    userEmail: 'nadia@gmail.com',
    subject: 'Payment issue with Nagad gateway',
    status: 'Pending',
    priority: 'Medium',
    createdAt: 'Oct 29, 2026',
    updatedAt: 'Oct 29',
    category: 'Billing',
    assignedTo: 'Karim',
    messages: [
      {
        id: 'm3',
        sender: 'user',
        senderName: 'Nadia Islam',
        text: 'Money was deducted from my Nagad wallet but plan shows Basic instead of Pro.',
        timestamp: 'Oct 29, 2:30 PM'
      }
    ]
  },
  {
    id: 't-3',
    userId: 'u3',
    userName: 'Rakib Hasan',
    userEmail: 'rakib@gmail.com',
    subject: 'Channel connect OAuth error',
    status: 'Resolved',
    priority: 'Low',
    createdAt: 'Oct 28, 2026',
    updatedAt: 'Oct 28',
    category: 'YouTube API',
    assignedTo: 'Rafiq',
    messages: [
      {
        id: 'm4',
        sender: 'user',
        senderName: 'Rakib Hasan',
        text: 'Google OAuth popped a permissions mismatch earlier. Re-authenticated and it is working now!',
        timestamp: 'Oct 28, 11:00 AM'
      }
    ]
  },
  {
    id: 't-4',
    userId: 'u4',
    userName: 'Sumi Akter',
    userEmail: 'sumi@gmail.com',
    subject: 'Playlist problem with large mp4 files',
    status: 'Open',
    priority: 'High',
    createdAt: 'Oct 27, 2026',
    updatedAt: 'Oct 27',
    category: 'Playlist',
    assignedTo: 'Jannat',
    messages: []
  },
  {
    id: 't-5',
    userId: 'u5',
    userName: 'Tanvir Hossain',
    userEmail: 'tanvir@gmail.com',
    subject: 'Refund request for duplicate charge',
    status: 'Pending',
    priority: 'Medium',
    createdAt: 'Oct 26, 2026',
    updatedAt: 'Oct 26',
    category: 'Billing',
    assignedTo: 'Karim',
    messages: []
  }
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    user: 'Admin',
    action: 'Login',
    category: 'admin',
    ipAddress: '103.52.12.45',
    timestamp: 'Oct 30, 2026 10:30 PM',
    details: 'Successful Super Admin authentication via 2FA'
  },
  {
    id: 'log-2',
    user: 'Rafiq',
    action: 'Update Plan',
    category: 'admin',
    ipAddress: '103.52.12.46',
    timestamp: 'Oct 30, 2026 08:12 PM',
    details: 'Modified Pro Plan features and quota limits'
  },
  {
    id: 'log-3',
    user: 'Jannat',
    action: 'Create User',
    category: 'admin',
    ipAddress: '103.52.12.47',
    timestamp: 'Oct 30, 2026 06:45 PM',
    details: 'Created internal test account user@streamjoin.com'
  },
  {
    id: 'log-4',
    user: 'Karim',
    action: 'Delete Stream',
    category: 'system',
    ipAddress: '103.52.12.48',
    timestamp: 'Oct 30, 2026 04:20 PM',
    details: 'Cleaned up stale stream container #9931'
  },
  {
    id: 'log-5',
    user: 'Mitu',
    action: 'Update Settings',
    category: 'system',
    ipAddress: '103.52.12.49',
    timestamp: 'Oct 30, 2026 02:10 PM',
    details: 'Toggled YouTube API quota alert thresholds'
  },
  {
    id: 'log-6',
    user: 'Fahim Ahmed',
    action: 'Stream Started',
    category: 'user',
    ipAddress: '103.52.12.50',
    timestamp: 'Oct 30, 2026 10:00 PM',
    details: 'Started Relaxing Music Live on YouTube'
  },
  {
    id: 'log-7',
    user: 'Nadia Islam',
    action: 'Channel Connected',
    category: 'user',
    ipAddress: '103.52.12.51',
    timestamp: 'Oct 29, 2026 03:15 PM',
    details: 'Connected YouTube Channel @nadialive'
  }
];

export const INITIAL_MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'mkt-1',
    type: 'banner',
    title: 'Autumn Mega Stream Sale',
    status: 'Active',
    targetAudience: 'All Visitors',
    impressions: 48500,
    clicks: 3420,
    expiryDate: 'Nov 15, 2026'
  },
  {
    id: 'mkt-2',
    type: 'coupon',
    title: 'STREAM2026',
    code: 'STREAM2026',
    discountPercent: 25,
    status: 'Active',
    targetAudience: 'New Registrations',
    impressions: 12400,
    clicks: 1890,
    expiryDate: 'Dec 31, 2026'
  },
  {
    id: 'mkt-3',
    type: 'referral',
    title: 'Referral Program (Earn 10% Lifetime)',
    status: 'Active',
    targetAudience: 'All Active Users'
  },
  {
    id: 'mkt-4',
    type: 'email',
    title: 'October YouTube Live Stream Growth Guide',
    status: 'Active',
    targetAudience: 'Pro & Business Creators'
  },
  {
    id: 'mkt-5',
    type: 'announcement',
    title: 'New Feature: Automated 24/7 Loop Playlist Streaming is Live!',
    status: 'Active',
    targetAudience: 'All Users'
  }
];

export const INITIAL_SEO: SeoSettings = {
  websiteTitle: 'Stream Join - YouTube Live Streaming Platform',
  metaDescription: 'Stream Join helps you grow your YouTube channel with automated live streaming, playlist streaming, and powerful tools. Start today and grow faster.',
  metaKeywords: 'YouTube live stream, automated streaming, playlist streaming, live stream tool, stream join, bdt live streaming, 24/7 youtube stream',
  ogTitle: 'Stream Join - Grow Your YouTube Live Stream',
  ogDescription: 'Automate, Manage and Grow Your YouTube Live Streams Easily.',
  ogImage: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&auto=format&fit=crop&q=80',
  canonicalUrl: 'https://streamjoin.com',
  robotsTxt: 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: https://streamjoin.com/sitemap.xml',
  enableSitemap: true
};

export const INITIAL_SYSTEM_SETTINGS: SystemSettingsData = {
  websiteName: 'Stream Join',
  websiteUrl: 'https://streamjoin.com',
  adminEmail: 'admin@streamjoin.com',
  timezone: 'Asia/Dhaka (GMT+6)',
  language: 'English',
  maintenanceMode: false,
  defaultCurrency: 'BDT',
  youtubeApiKey: 'YOUTUBE_API_KEY_PLACEHOLDER',
  youtubeClientId: 'GOOGLE_CLIENT_ID_PLACEHOLDER.apps.googleusercontent.com',
  bKashMerchantNumber: '01XXXXXXXXX',
  bKashAppKey: 'BKASH_APP_KEY_PLACEHOLDER',
  nagadMerchantId: 'NAGAD_MERCHANT_ID_PLACEHOLDER',
  stripePublicKey: 'pk_test_placeholder_key_for_setup_only',
  stripeSecretKey: 'STRIPE_SECRET_KEY_PLACEHOLDER',
  sslCommerzStoreId: 'SSLCOMMERZ_STORE_ID_PLACEHOLDER',
  smtpHost: 'smtp.sendgrid.net',
  smtpPort: 587,
  smtpUser: 'apikey',
  smtpSenderName: 'Stream Join Notifications',
  storageProvider: 'google_cloud'
};

export const BLOG_POSTS = [
  {
    id: 'blog-1',
    title: 'How to Grow Your YouTube Live Stream in 2026',
    date: 'Oct 28, 2026',
    category: 'Tips',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    summary: 'Discover the top strategies top creators use to maintain high concurrent viewer counts, optimize stream metadata, and rank in YouTube recommendations.',
    content: `Streaming 24/7 on YouTube has emerged as one of the fastest ways for music artists, podcasters, gaming creators, and education channels to compound organic watch time and subscriber acquisition.

1. High Bitrate and Constant Keyframe Interval
YouTube Live recommends a keyframe interval of 2 seconds and consistent CBR encoding. Stream Join handles this natively in the cloud without loading your local CPU.

2. Engaging Thumbnails and Live Chat Polls
A dynamic thumbnail with bold contrast and live badges drives CTR above 12%. Make sure to engage viewers with automated chatbots and regular interactive polls.

3. Playlist Automation
Never let the stream drop. By queuing high quality curated tracks and video clips, your stream stays active 24/7/365 while you sleep.`
  },
  {
    id: 'blog-2',
    title: 'Best Settings for YouTube Live Streaming',
    date: 'Oct 25, 2026',
    category: 'Guides',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    summary: 'A complete breakdown of resolution, bitrate, audio sample rates, and RTMP protocol optimization for crystal clear video delivery.',
    content: `Optimizing your streaming settings ensures zero buffering for your viewers.

Recommended Specifications:
- 1080p 60fps: 4,500 – 9,000 Kbps video bitrate
- Audio: 128 - 256 Kbps AAC stereo at 48kHz
- Protocol: RTMP / RTMPS with SSL encryption
- Stream Latency: Low Latency or Ultra Low Latency for instant chat interaction.`
  },
  {
    id: 'blog-3',
    title: 'How to Use Playlist Streaming on Stream Join',
    date: 'Oct 22, 2026',
    category: 'Updates',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    summary: 'Learn how to combine pre-recorded videos into continuous looping playlists and broadcast them directly to YouTube with automated scheduling.',
    content: `With Stream Join, you can upload videos or paste YouTube URLs to form playlists. Our cloud server stitches and loops them smoothly without audio glitches or frame drops.`
  }
];

export const FAQ_ITEMS = [
  {
    q: 'What is Stream Join?',
    a: 'Stream Join is a modern SaaS platform designed for YouTube creators, music labels, radio stations, and businesses to automate, schedule, and run uninterrupted YouTube live streams directly from the cloud.'
  },
  {
    q: 'How does it work?',
    a: 'Simply connect your YouTube channel, organize your videos into playlists, configure your stream resolution and timing, and click Go Live. Our cloud infrastructure takes care of encoding and RTMP transmission 24/7.'
  },
  {
    q: 'Do I need a YouTube channel?',
    a: 'Yes, you need an active YouTube channel with live streaming enabled (which takes up to 24 hours to activate for new channels under YouTube policy).'
  },
  {
    q: 'Can I stream to multiple channels?',
    a: 'Yes! Depending on your subscription plan (Pro supports 5 channels, Business supports unlimited channels), you can broadcast to multiple channels simultaneously.'
  },
  {
    q: 'Is it safe to use?',
    a: 'Absolutely. Stream Join connects to YouTube via official OAuth 2.0 and YouTube Data API v3 standards. We never store or access your Google account password.'
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes, we offer a 7-day money-back guarantee if you encounter any technical issues that our 24/7 support team cannot resolve.'
  },
  {
    q: 'How can I get support?',
    a: 'We provide 24/7 Live Chat directly inside your dashboard, ticket-based support, and direct email assistance at support@streamjoin.com.'
  }
];
