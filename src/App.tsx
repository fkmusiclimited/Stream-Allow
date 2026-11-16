import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastContainer } from './components/common/ToastContainer';
import { LiveVideoPlayerModal } from './components/common/LiveVideoPlayerModal';
import { InvoiceModal } from './components/common/InvoiceModal';
import { PaymentCheckoutModal } from './components/common/PaymentCheckoutModal';

import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { UserLayout } from './components/user/UserLayout';
import { AdminLayout } from './components/admin/AdminLayout';

function lazyNamed<T extends Record<string, React.ComponentType<any>>, K extends keyof T>(
  loader: () => Promise<T>,
  name: K
): React.LazyExoticComponent<T[K]> {
  return React.lazy(async () => {
    const delays = [600, 1400, 2800];
    let lastError: unknown;
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        const mod = await loader();
        return { default: mod[name] };
      } catch (err) {
        lastError = err;
        if (attempt < delays.length) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
      }
    }
    throw lastError;
  });
}

// Public Pages
const HomePage = lazyNamed(() => import('./pages/public/HomePage'), 'HomePage');
const AboutPage = lazyNamed(() => import('./pages/public/AboutPage'), 'AboutPage');
const FeaturesPage = lazyNamed(() => import('./pages/public/FeaturesPage'), 'FeaturesPage');
const PricingPage = lazyNamed(() => import('./pages/public/PricingPage'), 'PricingPage');
const HowItWorksPage = lazyNamed(() => import('./pages/public/HowItWorksPage'), 'HowItWorksPage');
const ServicesPage = lazyNamed(() => import('./pages/public/ServicesPage'), 'ServicesPage');
const BlogPage = lazyNamed(() => import('./pages/public/BlogPage'), 'BlogPage');
const FaqPage = lazyNamed(() => import('./pages/public/FaqPage'), 'FaqPage');
const ContactPage = lazyNamed(() => import('./pages/public/ContactPage'), 'ContactPage');
const TermsPrivacyPage = lazyNamed(() => import('./pages/public/TermsPrivacyPage'), 'TermsPrivacyPage');
const AuthPage = lazyNamed(() => import('./pages/public/AuthPage'), 'AuthPage');

// User Dashboard Pages
const UserOverviewPage = lazyNamed(() => import('./pages/user/UserOverviewPage'), 'UserOverviewPage');
const CreateStreamPage = lazyNamed(() => import('./pages/user/CreateStreamPage'), 'CreateStreamPage');
const MyStreamsPage = lazyNamed(() => import('./pages/user/MyStreamsPage'), 'MyStreamsPage');
const UserPlaylistPage = lazyNamed(() => import('./pages/user/UserPlaylistPage'), 'UserPlaylistPage');
const PlaylistDetailsPage = lazyNamed(() => import('./pages/user/PlaylistDetailsPage'), 'PlaylistDetailsPage');
const UserYouTubeChannelsPage = lazyNamed(() => import('./pages/user/UserYouTubeChannelsPage'), 'UserYouTubeChannelsPage');
const UserAnalyticsPage = lazyNamed(() => import('./pages/user/UserAnalyticsPage'), 'UserAnalyticsPage');
const UserSubscriptionPage = lazyNamed(() => import('./pages/user/UserSubscriptionPage'), 'UserSubscriptionPage');
const PaymentHistoryPage = lazyNamed(() => import('./pages/user/PaymentHistoryPage'), 'PaymentHistoryPage');
const ProfileSettingsPage = lazyNamed(() => import('./pages/user/ProfileSettingsPage'), 'ProfileSettingsPage');
const NotificationSettingsPage = lazyNamed(() => import('./pages/user/NotificationSettingsPage'), 'NotificationSettingsPage');
const UserSupportPage = lazyNamed(() => import('./pages/user/UserSupportPage'), 'UserSupportPage');
const HelpCenterPage = lazyNamed(() => import('./pages/user/HelpCenterPage'), 'HelpCenterPage');
const ReferEarnPage = lazyNamed(() => import('./pages/user/ReferEarnPage'), 'ReferEarnPage');
const ApiAccessPage = lazyNamed(() => import('./pages/user/ApiAccessPage'), 'ApiAccessPage');
const ChannelPermissionsPage = lazyNamed(() => import('./pages/user/ChannelPermissionsPage'), 'ChannelPermissionsPage');
const UserLogoutPage = lazyNamed(() => import('./pages/user/UserLogoutPage'), 'UserLogoutPage');

// Admin Dashboard Pages
const AdminOverviewPage = lazyNamed(() => import('./pages/admin/AdminOverviewPage'), 'AdminOverviewPage');
const UserManagementPage = lazyNamed(() => import('./pages/admin/UserManagementPage'), 'UserManagementPage');
const StreamManagementPage = lazyNamed(() => import('./pages/admin/StreamManagementPage'), 'StreamManagementPage');
const YouTubeManagementPage = lazyNamed(() => import('./pages/admin/YouTubeManagementPage'), 'YouTubeManagementPage');
const AdminPlaylistPage = lazyNamed(() => import('./pages/admin/AdminPlaylistPage'), 'AdminPlaylistPage');
const SubscriptionPlansPage = lazyNamed(() => import('./pages/admin/SubscriptionPlansPage'), 'SubscriptionPlansPage');
const PaymentManagementPage = lazyNamed(() => import('./pages/admin/PaymentManagementPage'), 'PaymentManagementPage');
const StaffRolesPage = lazyNamed(() => import('./pages/admin/StaffRolesPage'), 'StaffRolesPage');
const SupportManagementPage = lazyNamed(() => import('./pages/admin/SupportManagementPage'), 'SupportManagementPage');
const WebsiteManagementPage = lazyNamed(() => import('./pages/admin/WebsiteManagementPage'), 'WebsiteManagementPage');
const AdminDemoVideoPage = lazyNamed(() => import('./pages/admin/AdminDemoVideoPage'), 'AdminDemoVideoPage');
const SeoManagementPage = lazyNamed(() => import('./pages/admin/SeoManagementPage'), 'SeoManagementPage');
const MarketingManagementPage = lazyNamed(() => import('./pages/admin/MarketingManagementPage'), 'MarketingManagementPage');
const ReportsAnalyticsPage = lazyNamed(() => import('./pages/admin/ReportsAnalyticsPage'), 'ReportsAnalyticsPage');
const NotificationManagementPage = lazyNamed(() => import('./pages/admin/NotificationManagementPage'), 'NotificationManagementPage');
const SecurityLogsPage = lazyNamed(() => import('./pages/admin/SecurityLogsPage'), 'SecurityLogsPage');
const SystemSettingsPage = lazyNamed(() => import('./pages/admin/SystemSettingsPage'), 'SystemSettingsPage');

const AppContent: React.FC = () => {
  const { currentPath, currentUser, adminImpersonatorUser, navigate, checkoutModalPlan, setCheckoutModalPlan } = useApp();

  const isAdmin = (currentUser && ['super_admin', 'admin', 'manager', 'support_manager', 'finance_manager'].includes(currentUser.role)) || !!adminImpersonatorUser;

  // Prevent unauthenticated visitors from accessing admin or user routes, and regular users from admin routes
  React.useEffect(() => {
    if (!currentUser && (currentPath.startsWith('admin/') || currentPath.startsWith('user/'))) {
      navigate('public/login');
      return;
    }
    if (currentPath.startsWith('admin/') && !isAdmin) {
      navigate('user/dashboard');
    }
  }, [currentPath, isAdmin, currentUser, navigate]);

  // Route routing logic
  const renderView = () => {
    if (!currentUser && (currentPath.startsWith('user/') || currentPath.startsWith('admin/'))) {
      return (
        <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
          <Navbar />
          <main className="flex-1">
            <AuthPage initialMode="login" />
          </main>
          <Footer />
        </div>
      );
    }

    // 1. User Dashboard Routes
    if (currentPath.startsWith('user/')) {
      return (
        <UserLayout>
          {currentPath === 'user/dashboard' && <UserOverviewPage />}
          {currentPath === 'user/create-stream' && <CreateStreamPage />}
          {currentPath === 'user/my-streams' && <MyStreamsPage />}
          {currentPath === 'user/playlist' && <UserPlaylistPage />}
          {currentPath === 'user/playlist-details' && <PlaylistDetailsPage />}
          {currentPath === 'user/youtube-channels' && <UserYouTubeChannelsPage />}
          {currentPath === 'user/analytics' && <UserAnalyticsPage />}
          {currentPath === 'user/subscription' && <UserSubscriptionPage />}
          {currentPath === 'user/payment-history' && <PaymentHistoryPage />}
          {currentPath === 'user/profile' && <ProfileSettingsPage />}
          {currentPath === 'user/notifications' && <NotificationSettingsPage />}
          {currentPath === 'user/support' && <UserSupportPage />}
          {currentPath === 'user/help-center' && <HelpCenterPage />}
          {currentPath === 'user/refer-earn' && <ReferEarnPage />}
          {currentPath === 'user/api-access' && <ApiAccessPage />}
          {currentPath === 'user/channel-permissions' && <ChannelPermissionsPage />}
          {currentPath === 'user/logout' && <UserLogoutPage />}
          {![
            'user/dashboard', 'user/create-stream', 'user/my-streams', 'user/playlist',
            'user/playlist-details', 'user/youtube-channels', 'user/analytics',
            'user/subscription', 'user/payment-history', 'user/profile',
            'user/notifications', 'user/support', 'user/help-center',
            'user/refer-earn', 'user/api-access', 'user/channel-permissions', 'user/logout'
          ].includes(currentPath) && <UserOverviewPage />}
        </UserLayout>
      );
    }

    // 2. Admin Dashboard Routes
    if (currentPath.startsWith('admin/')) {
      if (!isAdmin) {
        return (
          <UserLayout>
            <UserOverviewPage />
          </UserLayout>
        );
      }
      return (
        <AdminLayout>
          {currentPath === 'admin/dashboard' && <AdminOverviewPage />}
          {currentPath === 'admin/users' && <UserManagementPage />}
          {currentPath === 'admin/streams' && <StreamManagementPage />}
          {currentPath === 'admin/create-stream' && <CreateStreamPage />}
          {currentPath === 'admin/youtube' && <YouTubeManagementPage />}
          {currentPath === 'admin/playlists' && <AdminPlaylistPage />}
          {currentPath === 'admin/playlist-details' && <PlaylistDetailsPage />}
          {currentPath === 'admin/channel-permissions' && <ChannelPermissionsPage />}
          {currentPath === 'admin/subscriptions' && <SubscriptionPlansPage />}
          {currentPath === 'admin/payments' && <PaymentManagementPage />}
          {currentPath === 'admin/staff' && <StaffRolesPage />}
          {currentPath === 'admin/support' && <SupportManagementPage />}
          {currentPath === 'admin/website' && <WebsiteManagementPage />}
          {currentPath === 'admin/demo-video' && <AdminDemoVideoPage />}
          {currentPath === 'admin/seo' && <SeoManagementPage />}
          {currentPath === 'admin/marketing' && <MarketingManagementPage />}
          {currentPath === 'admin/reports' && <ReportsAnalyticsPage />}
          {currentPath === 'admin/notifications' && <NotificationManagementPage />}
          {currentPath === 'admin/security' && <SecurityLogsPage />}
          {currentPath === 'admin/settings' && <SystemSettingsPage />}
          {![
            'admin/dashboard', 'admin/users', 'admin/streams', 'admin/create-stream',
            'admin/youtube', 'admin/playlists', 'admin/playlist-details',
            'admin/channel-permissions', 'admin/subscriptions', 'admin/payments',
            'admin/staff', 'admin/support', 'admin/website', 'admin/demo-video', 'admin/seo',
            'admin/marketing', 'admin/reports', 'admin/notifications',
            'admin/security', 'admin/settings'
          ].includes(currentPath) && <AdminOverviewPage />}
        </AdminLayout>
      );
    }


    // 3. Public Pages (13 pages)
    const isKnownPublicPath = [
      'public/home', 'public/about', 'public/features', 'public/pricing',
      'public/how-it-works', 'public/services', 'public/blog', 'public/faq',
      'public/contact', 'public/terms', 'public/privacy', 'public/login', 'public/register'
    ].includes(currentPath);

    return (
      <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
        <Navbar />
        <main className="flex-1">
          {(currentPath === 'public/home' || !isKnownPublicPath) && <HomePage />}
          {currentPath === 'public/about' && <AboutPage />}
          {currentPath === 'public/features' && <FeaturesPage />}
          {currentPath === 'public/pricing' && <PricingPage />}
          {currentPath === 'public/how-it-works' && <HowItWorksPage />}
          {currentPath === 'public/services' && <ServicesPage />}
          {currentPath === 'public/blog' && <BlogPage />}
          {currentPath === 'public/faq' && <FaqPage />}
          {currentPath === 'public/contact' && <ContactPage />}
          {(currentPath === 'public/terms' || currentPath === 'public/privacy') && <TermsPrivacyPage />}
          {currentPath === 'public/login' && <AuthPage initialMode="login" />}
          {currentPath === 'public/register' && <AuthPage initialMode="register" />}
        </main>
        <Footer />
      </div>
    );
  };

  return (
    <>
      <React.Suspense fallback={<div className="min-h-screen bg-[#0B0F17]" />}>
        {renderView()}
      </React.Suspense>
      <LiveVideoPlayerModal />
      <InvoiceModal />
      <PaymentCheckoutModal
        plan={checkoutModalPlan}
        onClose={() => setCheckoutModalPlan(null)}
      />
      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

