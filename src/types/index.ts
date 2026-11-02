export type UserRole = 
  | 'super_admin' 
  | 'admin' 
  | 'manager' 
  | 'support_manager' 
  | 'finance_manager' 
  | 'user';

export type Currency = 'BDT' | 'USD';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  plan: 'Basic' | 'Pro' | 'Business';
  status: 'Active' | 'Suspended' | 'Pending';
  joinedDate: string;
  channelsCount: number;
  totalViews: string;
  phone?: string;
  country?: string;
  password?: string;
  usedStorageGB?: number;
  maxStorageGB?: number;
  renewalDate?: string;
  renewalDaysLeft?: number;
}

export type StreamStatus = 'live' | 'scheduled' | 'ended' | 'failed';

export interface StreamItem {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  channelName: string;
  channelId: string;
  thumbnail: string;
  status: StreamStatus;
  viewers: number;
  views: string;
  date: string;
  time?: string;
  scheduledTime?: string;
  playlistId?: string;
  streamKey?: string;
  rtmpUrl?: string;
  resolution?: string;
  bitrate?: string;
  loop?: boolean;
}

export interface PlaylistItem {
  id: string;
  userId?: string;
  name: string;
  videosCount: number;
  status: 'Active' | 'Scheduled' | 'Ended';
  createdAt: string;
  thumbnail: string;
  duration: string;
  videos: {
    id: string;
    title: string;
    duration: string;
    durationSeconds?: number;
    resolution?: string;
    format?: string;
    url: string;
    filePath?: string;
    fileSizeBytes?: number;
    thumbnail: string;
  }[];
}

export interface YouTubeChannel {
  id: string;
  name: string;
  handle: string;
  subscribers: string;
  avatar: string;
  status: 'Connected' | 'Disconnected' | 'Pending';
  connectedAt: string;
  role?: 'Owner' | 'Editor' | 'Viewer';
  liveStreamStatus?: 'Active' | 'Idle';
}

export interface SubscriptionPlan {
  id: 'basic' | 'pro' | 'business';
  name: string;
  tagline: string;
  priceUSD: number;
  priceBDT: number;
  isPopular?: boolean;
  features: string[];
  maxChannels: number | string;
  autoStreaming: boolean;
  playlistStreaming: boolean;
  advancedAnalytics: boolean;
  supportLevel: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  amountUSD: number;
  amountBDT: number;
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  date: string;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Credit Card' | 'Stripe' | 'SSLCommerz';
  invoiceNumber: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Super Admin' | 'Admin' | 'Manager' | 'Support' | 'Finance' | 'Moderator';
  email: string;
  status: 'Active' | 'Inactive';
  lastActive: string;
  avatar: string;
  permissions: string[];
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  status: 'Open' | 'Pending' | 'Resolved';
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  updatedAt: string;
  category: string;
  assignedTo?: string;
  messages: {
    id: string;
    sender: 'user' | 'agent';
    senderName: string;
    text: string;
    timestamp: string;
  }[];
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  category: 'admin' | 'user' | 'system' | 'login';
  ipAddress: string;
  timestamp: string;
  details?: string;
}

export interface MarketingCampaign {
  id: string;
  type: 'banner' | 'coupon' | 'referral' | 'email' | 'announcement';
  title: string;
  code?: string;
  discountPercent?: number;
  status: 'Active' | 'Draft' | 'Expired';
  targetAudience: string;
  impressions?: number;
  clicks?: number;
  expiryDate?: string;
}

export interface SeoSettings {
  websiteTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonicalUrl: string;
  robotsTxt: string;
  enableSitemap: boolean;
}

export interface SystemSettingsData {
  websiteName: string;
  websiteUrl: string;
  adminEmail: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
  defaultCurrency: Currency;
  youtubeApiKey: string;
  youtubeClientId: string;
  bKashMerchantNumber: string;
  bKashAppKey: string;
  nagadMerchantId: string;
  stripePublicKey: string;
  stripeSecretKey: string;
  sslCommerzStoreId: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSenderName: string;
  storageProvider: 'local' | 's3' | 'google_cloud';
}
