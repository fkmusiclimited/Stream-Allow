import React, { useState } from 'react';
import { FAQ_ITEMS } from '../../data/mockData';
import { Plus, Minus, HelpCircle, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FaqPage: React.FC = () => {
  const { navigate } = useApp();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF1B6B]">Help Center</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Find answers to common questions about Stream Join.
        </p>
      </div>

      {/* Accordion List matching reference 8 */}
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl transition-all border ${
                isOpen
                  ? 'bg-[#0F1626] border-[#FF1B6B]/40 shadow-lg shadow-rose-950/20'
                  : 'bg-[#0D121F]/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full py-4 px-6 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white"
              >
                <span>{item.q}</span>
                <span className={`p-1.5 rounded-lg shrink-0 transition-colors ${isOpen ? 'bg-[#FF1B6B] text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
              </button>

              {isOpen && (
                <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 mt-1">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ask question CTA */}
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
        <h3 className="font-bold text-white text-base">Still have questions?</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Our engineering and support team is on standby 24 hours a day to assist with channel setup, audio bitrate, and pricing questions.
        </p>
        <button
          onClick={() => navigate('public/contact')}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 inline-flex items-center gap-2 transition-colors"
        >
          <MessageSquare className="w-4 h-4 text-[#FF1B6B]" />
          <span>Contact Our Support Team</span>
        </button>
      </div>
    </div>
  );
};
