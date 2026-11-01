import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  KeyRound,
  Copy,
  RefreshCw,
  Code2,
  Webhook,
  Activity,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';

export const ApiAccessPage: React.FC = () => {
  const { showToast } = useApp();
  const [apiKey, setApiKey] = useState('sj_api_key_placeholder_99284');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('https://mysite.com/webhook/stream-status');

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(apiKey);
    showToast('API key copied to clipboard!', 'success');
  };

  const handleRegenerate = () => {
    const newK = 'sj_api_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    setApiKey(newK);
    showToast('New API key generated. Previous key invalidated.', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold text-white">API Access</h1>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#FF1B6B]/20 text-[#FF1B6B] border border-[#FF1B6B]/40 uppercase tracking-wider">
          Pro Plan Active
        </span>
      </div>
      <p className="text-xs text-slate-400 -mt-4">
        Integrate with your own apps, headless broadcasters and tools using our enterprise REST API.
      </p>

      {/* API Key Box matching reference 14 */}
      <div className="p-6 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Live Secret API Key</label>
          <button
            onClick={handleRegenerate}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Regenerate Key</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={apiKey}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono tracking-wider"
          />
          <button
            onClick={handleCopyKey}
            className="px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Authenticate requests by including <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">Authorization: Bearer sj_api_...</code> in your HTTP header.
        </p>
      </div>

      {/* 3 Nav Action Rows matching reference 14 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-xl">
        <div
          onClick={() => setDocModalOpen(true)}
          className="p-5 flex items-center justify-between hover:bg-slate-900/50 cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-[#FF1B6B] transition-colors">
                API Documentation
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">View full API documentation and endpoint references</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
        </div>

        <div
          onClick={() => setWebhookModalOpen(true)}
          className="p-5 flex items-center justify-between hover:bg-slate-900/50 cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-[#FF1B6B] transition-colors">
                Webhooks
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Get real-time webhook notifications when streams start or end</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
        </div>

        <div className="p-5 flex items-center justify-between hover:bg-slate-900/50 cursor-pointer transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Usage Limits</h3>
              <p className="text-xs text-slate-400 mt-0.5">Monitor your monthly API calls: 1,420 / 50,000 requests</p>
            </div>
          </div>
          <div className="w-32 hidden sm:block">
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '18%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* API Docs Modal */}
      {docModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#0F1626] border border-slate-800 rounded-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Stream Join Cloud API v1</h3>
              <button onClick={() => setDocModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 font-mono text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold">GET /api/streams</span>
                <p className="text-slate-400 font-sans">Returns all current active broadcasts and viewer stats.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-blue-400 font-bold">POST /api/streams/start</span>
                <p className="text-slate-400 font-sans">Programmatically trigger a playlist loop on a YouTube channel.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-rose-400 font-bold">POST /api/streams/stop</span>
                <p className="text-slate-400 font-sans">Immediately terminates RTMP ingest and marks broadcast ended.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {webhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F1626] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Configure Webhooks</h3>
              <button onClick={() => setWebhookModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Webhook URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              onClick={() => {
                showToast('Webhook endpoint saved successfully!', 'success');
                setWebhookModalOpen(false);
              }}
              className="w-full py-2.5 rounded-xl bg-[#FF1B6B] text-white font-bold text-xs"
            >
              Save Webhook
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
