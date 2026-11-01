import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CreditCard,
  PlusCircle,
  Check,
  Edit,
  Sparkles,
  X,
  CheckCircle2
} from 'lucide-react';
import { SubscriptionPlan } from '../../types';

export const SubscriptionPlansPage: React.FC = () => {
  const { plans, updatePlan, formatPrice, showToast } = useApp();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Edit fields
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [priceUSD, setPriceUSD] = useState(0);
  const [priceBDT, setPriceBDT] = useState(0);

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setTagline(plan.tagline);
    setPriceUSD(plan.priceUSD);
    setPriceBDT(plan.priceBDT);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    updatePlan({
      ...editingPlan,
      name,
      tagline,
      priceUSD: Number(priceUSD),
      priceBDT: Number(priceBDT)
    });

    setEditingPlan(null);
  };

  return (
    <div className="space-y-6">
      {/* Header matching reference 6 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Subscription Plans</h1>
          <p className="text-xs text-slate-400">Manage pricing plans, quotas and features for creators.</p>
        </div>
        <button
          onClick={() => showToast('New plan template ready for customization.', 'info')}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Plan</span>
        </button>
      </div>

      {/* 3 Plan Cards Grid matching reference 6 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isPro = p.id === 'pro';
          return (
            <div
              key={p.id}
              className={`rounded-3xl p-7 flex flex-col justify-between transition-all ${
                isPro
                  ? 'bg-gradient-to-b from-[#141C2E] to-[#0D1322] border-2 border-[#FF1B6B] shadow-2xl relative'
                  : 'bg-[#0F1626] border border-slate-800'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#FF1B6B] text-white shadow-md">
                  Most Popular
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{p.tagline}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-white">
                    {formatPrice(p.priceUSD, p.priceBDT)}
                  </span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${isPro ? 'text-[#FF1B6B]' : 'text-emerald-400'}`} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Plan</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F1626] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Edit {editingPlan.name} Plan</h3>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price (USD $)</label>
                  <input
                    type="number"
                    required
                    value={priceUSD}
                    onChange={e => setPriceUSD(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price (BDT ৳)</label>
                  <input
                    type="number"
                    required
                    value={priceBDT}
                    onChange={e => setPriceBDT(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#FF1B6B] text-white font-bold text-xs"
              >
                Save Plan Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
