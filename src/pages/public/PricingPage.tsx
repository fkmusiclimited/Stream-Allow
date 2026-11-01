import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Check, Sparkles, ShieldCheck, CreditCard, ArrowRight, X } from 'lucide-react';

export const PricingPage: React.FC = () => {
  const { currency, setCurrency, formatPrice, plans, upgradeUserPlan, currentUser, navigate } = useApp();
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<'basic' | 'pro' | 'business' | null>(null);
  const [paymentGateway, setPaymentGateway] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Stripe' | 'SSLCommerz'>('bKash');
  const [phoneOrCard, setPhoneOrCard] = useState('01712345678');

  const handleChoosePlan = (planId: 'basic' | 'pro' | 'business') => {
    setSelectedPlanToBuy(planId);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanToBuy) return;
    upgradeUserPlan(selectedPlanToBuy, paymentGateway);
    setSelectedPlanToBuy(null);
    navigate('user/subscription');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Simple & Affordable Pricing
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Choose the best plan for your YouTube live streaming needs.
        </p>

        {/* Currency Switcher */}
        <div className="inline-flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setCurrency('BDT')}
            className={`px-4 py-2 rounded-lg transition-all ${
              currency === 'BDT'
                ? 'bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            BDT (৳ - Bangladesh Taka)
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-4 py-2 rounded-lg transition-all ${
              currency === 'USD'
                ? 'bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            USD ($ - International)
          </button>
        </div>
      </div>

      {/* 3 Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((p) => {
          const isPro = p.id === 'pro';
          return (
            <div
              key={p.id}
              className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all ${
                isPro
                  ? 'bg-gradient-to-b from-[#141C2E] to-[#0D1322] border-2 border-[#FF1B6B] shadow-2xl shadow-rose-950/40 md:-translate-y-2'
                  : 'bg-[#0F1626]/80 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Most Popular Badge */}
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] text-white shadow-md">
                  Most Popular
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{p.tagline}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-white">
                    {formatPrice(p.priceUSD, p.priceBDT)}
                  </span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>

                <div className="pt-4 border-t border-slate-800/80 space-y-3 text-xs sm:text-sm">
                  {p.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-slate-300">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPro ? 'text-[#FF1B6B]' : 'text-emerald-400'}`} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => handleChoosePlan(p.id)}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all transform active:scale-95 ${
                    isPro
                      ? 'text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30'
                      : 'text-white bg-slate-850 hover:bg-slate-700 border border-slate-700 bg-slate-900'
                  }`}
                >
                  Get Started
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkout / Payment Modal */}
      {selectedPlanToBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F1626] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Complete Subscription</h3>
                <p className="text-xs text-slate-400">
                  {selectedPlanToBuy.toUpperCase()} Plan ·{' '}
                  {formatPrice(
                    plans.find(p => p.id === selectedPlanToBuy)?.priceUSD || 0,
                    plans.find(p => p.id === selectedPlanToBuy)?.priceBDT || 0
                  )}
                  /month
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanToBuy(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select Payment Gateway
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bKash', label: 'bKash', color: 'border-pink-500/40' },
                    { id: 'Nagad', label: 'Nagad', color: 'border-orange-500/40' },
                    { id: 'Rocket', label: 'Rocket', color: 'border-purple-500/40' },
                    { id: 'Stripe', label: 'Card / Stripe', color: 'border-indigo-500/40' },
                    { id: 'SSLCommerz', label: 'SSLCommerz', color: 'border-blue-500/40' }
                  ].map((gw) => (
                    <button
                      type="button"
                      key={gw.id}
                      onClick={() => setPaymentGateway(gw.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        paymentGateway === gw.id
                          ? 'bg-[#FF1B6B]/20 border-[#FF1B6B] text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {gw.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {paymentGateway === 'Stripe' ? 'Card Number' : `${paymentGateway} Account Number`}
                </label>
                <input
                  type="text"
                  required
                  value={phoneOrCard}
                  onChange={e => setPhoneOrCard(e.target.value)}
                  placeholder={paymentGateway === 'Stripe' ? '4242 •••• •••• 4242' : '017XXXXXXXX'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Instant Automatic Provisioning</span>
                </div>
                <p>You can upgrade, downgrade, or cancel your subscription at any time with zero penalty.</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30 transition-all"
              >
                Confirm Payment & Activate
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
