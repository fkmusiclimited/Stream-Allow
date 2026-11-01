import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Globe, FileCode, CheckCircle2, ShieldCheck } from 'lucide-react';

export const SeoManagementPage: React.FC = () => {
  const { seoSettings, updateSeoSettings, showToast } = useApp();
  const [tab, setTab] = useState<'general' | 'pages' | 'sitemap' | 'robots' | 'schema'>('general');

  const [title, setTitle] = useState(seoSettings.websiteTitle);
  const [desc, setDesc] = useState(seoSettings.metaDescription);
  const [keywords, setKeywords] = useState(seoSettings.metaKeywords);
  const [robotsTxt, setRobotsTxt] = useState(seoSettings.robotsTxt);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSeoSettings({
      websiteTitle: title,
      metaDescription: desc,
      metaKeywords: keywords,
      robotsTxt
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">SEO Settings</h1>
        <p className="text-xs text-slate-400">Optimize metadata, indexing rules, OpenGraph tags and schema markup.</p>
      </div>

      {/* Tabs matching reference 11 */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setTab('general')}
          className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'general' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          General SEO
        </button>
        <button
          onClick={() => setTab('pages')}
          className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'pages' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Page Settings
        </button>
        <button
          onClick={() => setTab('sitemap')}
          className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'sitemap' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Sitemap
        </button>
        <button
          onClick={() => setTab('robots')}
          className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'robots' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Robots.txt
        </button>
        <button
          onClick={() => setTab('schema')}
          className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'schema' ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Schema
        </button>
      </div>

      {/* Form matching reference 11 */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0F1626] border border-slate-800">
        {tab === 'general' && (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Website Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Meta Description</label>
              <textarea
                rows={3}
                required
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Meta Keywords</label>
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            {/* Google SERP Snippet Preview */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Search Result Snippet Preview</span>
              <p className="text-xs text-emerald-400 font-mono">https://streamjoin.com</p>
              <h4 className="text-sm font-bold text-sky-400 hover:underline cursor-pointer">{title}</h4>
              <p className="text-xs text-slate-400 line-clamp-2">{desc}</p>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#FF1B6B] hover:bg-[#E11D48] text-white font-bold text-xs shadow-md transition-colors"
            >
              Save Changes
            </button>
          </form>
        )}

        {tab === 'robots' && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-slate-300">robots.txt Directives</label>
            <textarea
              rows={6}
              value={robotsTxt}
              onChange={e => setRobotsTxt(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-[#FF1B6B]"
            />
            <button
              onClick={() => showToast('robots.txt updated.', 'success')}
              className="px-5 py-2 rounded-xl bg-[#FF1B6B] text-white font-bold text-xs"
            >
              Update robots.txt
            </button>
          </div>
        )}

        {tab === 'sitemap' && (
          <div className="space-y-3 text-xs text-slate-300">
            <p>XML Sitemap is automatically regenerated whenever website pages or blog articles are published.</p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-emerald-400">
              https://streamjoin.com/sitemap.xml (Status: 200 OK · 18 Indexed URLs)
            </div>
            <button
              onClick={() => showToast('Google Search Console pinged with updated sitemap.xml', 'success')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Ping Search Engines
            </button>
          </div>
        )}

        {tab === 'schema' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-400">JSON-LD Structured Data Schema for Rich Results:</p>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto">
{`{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Stream Join",
  "operatingSystem": "All",
  "applicationCategory": "MultimediaApplication",
  "offers": {
    "@type": "Offer",
    "price": "9.00",
    "priceCurrency": "USD"
  }
}`}
            </pre>
          </div>
        )}

        {tab === 'pages' && (
          <div className="space-y-3 text-xs text-slate-300">
            <p>Page-specific meta title and canonical tags are active across all 13 public routes.</p>
          </div>
        )}
      </div>
    </div>
  );
};
