import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Check,
  CreditCard,
  Calendar,
  ShieldCheck,
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';

export const UserSubscriptionPage: React.FC = () => {
  const { plans, currentUser, isUserPlanActive, formatPrice, upgradeUserPlan, cancelUserPlan, showToast } = useApp();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const currentPlan = plans.find(p => p.id === (currentUser?.plan?.toLowerCase() || 'basic')) || plans[0];
  const otherPlans = plans.filter(p => p.id !== currentPlan.id);

  const handleConfirmCancel = () => {
    cancelUserPlan();
    setCancelModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white">My Subscription</h1>
        <p className="text-xs text-slate-400">Manage your subscription, activate plans, and process secure payments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Current Plan Card */}
        <div className={`lg:col-span-6 p-7 rounded-3xl bg-gradient-to-b from-[#141C2E] to-[#0D1322] border-2 ${isUserPlanActive ? 'border-[#FF1B6B]' : 'border-rose-500/50'} shadow-2xl space-y-6`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Plan</span>
            {isUserPlanActive ? (
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ● Plan Active
              </span>
            ) : (
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                ● Plan Inactive / Unpaid
              </span>
            )}
          </div>

          <div>
            <h2 className="text-3xl font-black text-white">{currentPlan.name} Plan</h2>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold text-[#FF1B6B]">
                {formatPrice(currentPlan.priceUSD, currentPlan.priceBDT)}
              </span>
              <span className="text-xs text-slate-400">/month</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {isUserPlanActive ? (
                <>Renews on <strong className="text-slate-200">{currentUser?.renewalDate || 'Nov 30, 2026'}</strong> via automatic billing.</>
              ) : (
                <span className="text-rose-400 font-semibold block">
                  ⚠️ Your plan is currently inactive. Complete payment below to activate 24/7 RTMP live streaming.
                </span>
              )}
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-800 text-xs sm:text-sm">
            {currentPlan.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-slate-200">
                <Check className="w-4 h-4 text-[#FF1B6B] shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
            {!isUserPlanActive ? (
              <button
                onClick={() => {
                  upgradeUserPlan(currentPlan.id as any, 'bKash');
                }}
                className="flex-1 py-3.5 rounded-xl font-black text-xs text-white gradient-brand hover:opacity-95 shadow-xl shadow-rose-600/30 transition-all text-center cursor-pointer"
              >
                Activate & Pay Now ({formatPrice(currentPlan.priceUSD, currentPlan.priceBDT)})
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    upgradeUserPlan('business', 'bKash');
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30 transition-all text-center cursor-pointer"
                >
                  Upgrade to Business
                </button>
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel Plan
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Available Plans matching reference 7 */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Available Plans</h3>

          <div className="space-y-4">
            {otherPlans.map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-2xl bg-[#0F1626] border border-slate-800 hover:border-slate-700 transition-all space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-white">{p.name}</h4>
                    <p className="text-xs text-slate-400">{p.tagline}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-white">
                      {formatPrice(p.priceUSD, p.priceBDT)}
                    </span>
                    <span className="text-[11px] text-slate-500 block">/month</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {p.features.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => upgradeUserPlan(p.id)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-[#FF1B6B] hover:text-white text-slate-200 font-bold text-xs border border-slate-700 transition-all"
                >
                  Switch to {p.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-[#0F1626] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Cancel Subscription?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure? Your 24/7 stream loops and multi-channel features will end at the close of your current billing period on Nov 30, 2026.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Keep My Plan
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
