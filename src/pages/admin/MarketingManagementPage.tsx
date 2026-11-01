import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Megaphone,
  Tag,
  Gift,
  Mail,
  Bell,
  Edit,
  X,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { MarketingCampaign } from '../../types';

export const MarketingManagementPage: React.FC = () => {
  const { marketingCampaigns, addMarketingCampaign, showToast } = useApp();
  const [editingItem, setEditingItem] = useState<{ title: string; type: string } | null>(null);
  const [modalText, setModalText] = useState('');

  const tools = [
    { title: 'Promotional Banners', type: 'banner', icon: Megaphone, color: 'text-rose-500', desc: 'Header notification banners for platform discounts.' },
    { title: 'Discount Coupons', type: 'coupon', icon: Tag, color: 'text-indigo-400', desc: 'Promotional voucher codes (e.g. STREAM2026 for 25% off).' },
    { title: 'Referral Program', type: 'referral', icon: Gift, color: 'text-emerald-400', desc: 'Tiered 10% lifetime recurring commissions for affiliates.' },
    { title: 'Email Campaigns', type: 'email', icon: Mail, color: 'text-blue-400', desc: 'Targeted broadcast updates to creator subscriber lists.' },
    { title: 'Announcements', type: 'announcement', icon: Bell, color: 'text-amber-400', desc: 'In-app dashboard notification releases and alerts.' }
  ];

  const handleOpenEdit = (t: typeof tools[0]) => {
    setEditingItem(t);
    setModalText(t.title === 'Discount Coupons' ? 'STREAM2026 (25% OFF)' : 'Active');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`${editingItem?.title} parameters saved successfully!`, 'success');
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Marketing Tools</h1>
        <p className="text-xs text-slate-400">Manage promotions, discount vouchers and marketing campaigns.</p>
      </div>

      {/* 5 Marketing Tool Rows matching reference 12 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-xl">
        {tools.map((t, idx) => {
          const Icon = t.icon;
          return (
            <div key={idx} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  <Icon className={`w-5 h-5 ${t.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{t.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                </div>
              </div>

              <button
                onClick={() => handleOpenEdit(t)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shrink-0"
              >
                Edit
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F1626] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Configure {editingItem.title}</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Configuration Details</label>
                <input
                  type="text"
                  required
                  value={modalText}
                  onChange={e => setModalText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#FF1B6B] text-white font-bold text-xs"
              >
                Update Marketing Campaign
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
