import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Globe, Edit, ExternalLink, Check, Eye, Layout } from 'lucide-react';

export const WebsiteManagementPage: React.FC = () => {
  const { navigate, showToast } = useApp();
  const [selectedPage, setSelectedPage] = useState('Homepage');
  const [headline, setHeadline] = useState('Grow Your YouTube Live Stream with Stream Join');
  const [subheading, setSubheading] = useState('Automate, Manage and Grow Your YouTube Live Streams Easily. Perfect for music, radio, gaming, podcasts and more.');

  const pages = [
    { name: 'Homepage', path: 'public/home' },
    { name: 'About Us', path: 'public/about' },
    { name: 'Features', path: 'public/features' },
    { name: 'Pricing', path: 'public/pricing' },
    { name: 'Services', path: 'public/services' },
    { name: 'Blog', path: 'public/blog' },
    { name: 'FAQ', path: 'public/faq' },
    { name: 'Contact', path: 'public/contact' }
  ];

  const handleSavePage = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Content for ${selectedPage} updated and deployed to CDN!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header matching reference 10 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Website Pages</h1>
          <p className="text-xs text-slate-400">Edit public marketing copy, banners, and layout settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left List of Pages matching reference 10 */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-slate-300 pb-2 border-b border-slate-800">Website Pages</h3>

          <div className="space-y-1">
            {pages.map((pg) => {
              const isSelected = selectedPage === pg.name;
              return (
                <div
                  key={pg.name}
                  className={`p-3 rounded-xl flex items-center justify-between transition-all ${
                    isSelected ? 'bg-slate-900 border border-[#FF1B6B]/40' : 'hover:bg-slate-900/60'
                  }`}
                >
                  <span className="text-xs font-semibold text-white">{pg.name}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedPage(pg.name)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        isSelected ? 'bg-[#FF1B6B] text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => navigate(pg.path)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Open page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Live Preview / CMS Editor matching reference 10 */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Editing {selectedPage}</h3>
              <button
                onClick={() => navigate('public/home')}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Site</span>
              </button>
            </div>

            <form onSubmit={handleSavePage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hero Title</label>
                <input
                  type="text"
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subtitle / Hero Copy</label>
                <textarea
                  rows={3}
                  value={subheading}
                  onChange={e => setSubheading(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              {/* Homepage Mini Card Mockup Preview */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Live Card Preview</span>
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#141B2E] to-[#0B0F17] border border-slate-800 space-y-1.5">
                  <h4 className="font-extrabold text-white text-sm">{headline}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{subheading}</p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#FF1B6B] hover:bg-[#E11D48] text-white font-bold text-xs shadow-md transition-colors"
              >
                Save Page Changes
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
