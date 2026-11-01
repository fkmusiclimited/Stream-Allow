import React, { useState } from 'react';
import { ShieldCheck, FileText, Lock, Globe } from 'lucide-react';

export const TermsPrivacyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {activeTab === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
        </h1>
        <p className="text-xs text-slate-400">Last updated: October 30, 2026</p>

        {/* Tab switch */}
        <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-5 py-2 rounded-lg transition-all ${
              activeTab === 'terms'
                ? 'bg-[#FF1B6B] text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Terms & Conditions
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-5 py-2 rounded-lg transition-all ${
              activeTab === 'privacy'
                ? 'bg-[#FF1B6B] text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
        </div>
      </div>

      <div className="p-8 sm:p-10 rounded-2xl bg-[#0F1626]/90 border border-slate-800 space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        {activeTab === 'terms' ? (
          <>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#FF1B6B]">1.</span> Introduction
              </h2>
              <p>
                These Terms and Conditions govern your access to and use of Stream Join, an automated YouTube live streaming SaaS platform provided by Stream Join Technologies Ltd. By registering or using our streaming services, you agree to comply with and be bound by these terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#FF1B6B]">2.</span> Account Registration
              </h2>
              <p>
                You must provide accurate and complete registration details. You are solely responsible for safeguarding your credentials and for all activities that occur under your account. We reserve the right to suspend or terminate accounts that provide misleading information.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#FF1B6B]">3.</span> Acceptable Use & Content Ownership
              </h2>
              <p>
                You agree not to use Stream Join for any illegal, infringing, or harmful activities. You must possess all necessary broadcasting rights, licenses, and permissions for all media, music, and video content transmitted via your playlists to YouTube.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#FF1B6B]">4.</span> YouTube API Compliance
              </h2>
              <p>
                Stream Join connects with the YouTube Data API v3. By connecting your YouTube account, you also agree to be bound by the{' '}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#FF1B6B] underline"
                >
                  YouTube Terms of Service
                </a>{' '}
                and the Google Privacy Policy. We do not store Google account passwords.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#FF1B6B]">5.</span> Subscriptions, BDT/USD Billing, & Refunds
              </h2>
              <p>
                Subscription plans are billed in advance on a recurring monthly cycle. Pricing is clearly designated in BDT (৳) and USD ($). You may cancel your subscription at any time from your User Dashboard. We provide a 7-day money-back guarantee for unresolved technical issues.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                Information We Collect
              </h2>
              <p>
                We collect your email address, profile name, and OAuth tokens necessary to interact with your YouTube channel. We do not store or process sensitive credit card numbers or banking PINs; all payments are handled by certified processors (bKash, Nagad, SSLCommerz, Stripe).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-400" />
                How We Use Your Data
              </h2>
              <p>
                We use your data solely to deliver 24/7 cloud live streaming, manage automated looping playlists, display audience analytics, and provide transactional email and invoice notifications.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FF1B6B]" />
                Data Security & Token Revocation
              </h2>
              <p>
                All data transmission is encrypted via TLS 1.3. You may revoke Stream Join&apos;s access to your YouTube channel at any time directly through the Google Security settings page or inside the YouTube Channels management page in your Stream Join dashboard.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
