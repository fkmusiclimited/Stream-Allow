import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from './components/common/ToastContainer';
import { LiveVideoPlayerModal } from './components/common/LiveVideoPlayerModal';
import { InvoiceModal } from './components/common/InvoiceModal';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { AboutPage } from './pages/public/AboutPage';
import { FeaturesPage } from './pages/public/FeaturesPage';
import { PricingPage } from './pages/public/PricingPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { ServicesPage } from './pages/public/ServicesPage';
import { BlogPage } from './pages/public/BlogPage';
import { FaqPage } from './pages/public/FaqPage';
import { ContactPage } from './pages/public/ContactPage';
import { TermsPrivacyPage } from './pages/public/TermsPrivacyPage';
import { AuthPage } from './pages/public/AuthPage';

// User Dashboard Layout & Pages
import { UserLayout } from './components/user/UserLayout';
import { UserOverviewPage } from './pages/user/UserOverviewPage';
import { CreateStreamPage } from './pages/user/CreateStreamPage';
import { MyStreamsPage } from './pages/user/MyStreamsPage';
import { UserPlaylistPage } from './pages/user/UserPlaylistPage';
import { PlaylistDetailsPage } from './pages/user/PlaylistDetailsPage';
import { UserYouTubeChannelsPage } from './pages/user/UserYouTubeChannelsPage';
import { UserAnalyticsPage } from './pages/user/UserAnalyticsPage';
import { UserSubscriptionPage } from './pages/user/UserSubscriptionPage';
import { PaymentHistoryPage } from './pages/user/PaymentHistoryPage';
import { ProfileSettingsPage } from './pages/user/ProfileSettingsPage';
import { NotificationSettingsPage } from './pages/user/NotificationSettingsPage';
import { UserSupportPage } from './pages/user/UserSupportPage';
import { HelpCenterPage } from './pages/user/HelpCenterPage';
import { ReferEarnPage } from './pages/user/ReferEarnPage';
import { ApiAccessPage } from './pages/user/ApiAccessPage';
import { ChannelPermissionsPage } from './pages/user/ChannelPermissionsPage';
import { UserLogoutPage } from './pages/user/UserLogoutPage';

// Admin Dashboard Layout & Pages
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { StreamManagementPage } from './pages/admin/StreamManagementPage';
import { YouTubeManagementPage } from './pages/admin/YouTubeManagementPage';
import { AdminPlaylistPage } from './pages/admin/AdminPlaylistPage';
import { SubscriptionPlansPage } from './pages/admin/SubscriptionPlansPage';
import { PaymentManagementPage } from './pages/admin/PaymentManagementPage';
import { StaffRolesPage } from './pages/admin/StaffRolesPage';
import { SupportManagementPage } from './pages/admin/SupportManagementPage';
import { WebsiteManagementPage } from './pages/admin/WebsiteManagementPage';
import { SeoManagementPage } from './pages/admin/SeoManagementPage';
import { MarketingManagementPage } from './pages/admin/MarketingManagementPage';
import { ReportsAnalyticsPage } from './pages/admin/ReportsAnalyticsPage';
import { NotificationManagementPage } from './pages/admin/NotificationManagementPage';
import { SecurityLogsPage } from './pages/admin/SecurityLogsPage';
import { SystemSettingsPage } from './pages/admin/SystemSettingsPage';

const AppContent: React.FC = () => {
  const { currentPath, currentUser, adminImpersonatorUser, navigate } = useApp();

  const isAdmin = (currentUser && ['super_admin', 'admin', 'manager', 'support_manager', 'finance_manager'].includes(currentUser.role)) || !!adminImpersonatorUser;

  // Prevent regular users or guests from accessing admin routes
  React.useEffect(() => {
    if (currentPath.startsWith('admin/') && !isAdmin) {
      if (currentUser) {
        navigate('user/dashboard');
      } else {
        navigate('public/login');
      }
    }
  }, [currentPath, isAdmin, currentUser, navigate]);

  // Route routing logic
  const renderView = () => {
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
          {currentPath === 'admin/youtube' && <YouTubeManagementPage />}
          {currentPath === 'admin/playlists' && <AdminPlaylistPage />}
          {currentPath === 'admin/channel-permissions' && <ChannelPermissionsPage />}
          {currentPath === 'admin/subscriptions' && <SubscriptionPlansPage />}
          {currentPath === 'admin/payments' && <PaymentManagementPage />}
          {currentPath === 'admin/staff' && <StaffRolesPage />}
          {currentPath === 'admin/support' && <SupportManagementPage />}
          {currentPath === 'admin/website' && <WebsiteManagementPage />}
          {currentPath === 'admin/seo' && <SeoManagementPage />}
          {currentPath === 'admin/marketing' && <MarketingManagementPage />}
          {currentPath === 'admin/reports' && <ReportsAnalyticsPage />}
          {currentPath === 'admin/notifications' && <NotificationManagementPage />}
          {currentPath === 'admin/security' && <SecurityLogsPage />}
          {currentPath === 'admin/settings' && <SystemSettingsPage />}
        </AdminLayout>
      );
    }

    // 3. Public Pages (13 pages)
    return (
      <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
        <Navbar />
        <main className="flex-1">
          {currentPath === 'public/home' && <HomePage />}
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
      {renderView()}
      <LiveVideoPlayerModal />
      <InvoiceModal />
      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
