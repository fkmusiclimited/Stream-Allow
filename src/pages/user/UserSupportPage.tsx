import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare,
  Ticket,
  HelpCircle,
  Send,
  Headphones,
  CheckCircle2,
  Paperclip,
  Clock,
  Sparkles
} from 'lucide-react';

export const UserSupportPage: React.FC = () => {
  const { currentUser, tickets, addTicket, showToast, navigate } = useApp();
  const [activeTab, setActiveTab] = useState<'chat' | 'ticket' | 'faq'>('chat');

  // Live Chat state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'agent', name: 'Support Team', text: 'Hello! How can we help you today?', time: '10:24 PM' },
    { sender: 'user', name: currentUser?.name || 'Fahim', text: 'I need help with live stream setup on YouTube.', time: '10:25 PM' },
    { sender: 'agent', name: 'Support Team', text: 'Sure! I will guide you step by step. Have you linked your channel with OAuth yet?', time: '10:25 PM' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Ticket form
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Streaming Issue');
  const [ticketPriority, setTicketPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [ticketMessage, setTicketMessage] = useState('');

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [
      ...prev,
      { sender: 'user', name: currentUser?.name || 'You', text: userText, time: 'Just now' }
    ]);
    setChatInput('');

    // Responsive agent simulation
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'agent',
          name: 'Jannat (Live Support)',
          text: `Thanks for the details! Our server has verified your stream ingest. You can safely launch your stream from the "Create Stream" page. Let me know if you need any bitrate adjustments!`,
          time: 'Just now'
        }
      ]);
    }, 1200);
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      showToast('Please fill out subject and description.', 'error');
      return;
    }

    addTicket(ticketSubject, ticketCategory, ticketPriority, ticketMessage);
    setTicketSubject('');
    setTicketMessage('');
    setActiveTab('chat');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Get Support</h1>
        <p className="text-xs text-slate-400">We are here to help you 24/7 with zero waiting time.</p>
      </div>

      {/* 3 Tabs matching reference 11 */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'chat'
              ? 'bg-[#FF1B6B] text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Live Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('ticket')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ticket'
              ? 'bg-[#FF1B6B] text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Create Ticket</span>
        </button>

        <button
          onClick={() => navigate('user/help-center')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help Center</span>
        </button>
      </div>

      {/* Tab 1: Live Chat matching reference 11 */}
      {activeTab === 'chat' && (
        <div className="rounded-2xl bg-[#0F1626] border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[520px]">
          {/* Chat Header */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-[#FF1B6B]/20 text-[#FF1B6B] flex items-center justify-center font-bold text-xs">
                  <Headphones className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">Support Team</h4>
                <p className="text-[11px] text-emerald-400 font-medium">● Online · Typically replies in seconds</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Stream Join 24/7 Care</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {chatMessages.map((msg, i) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={i}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">{msg.name}</span>
                    <span>·</span>
                    <span>{msg.time}</span>
                  </div>
                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] text-white rounded-tr-none shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendChat} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-[#FF1B6B] hover:bg-[#E11D48] text-white transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Create Ticket */}
      {activeTab === 'ticket' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0F1626] border border-slate-800 space-y-5">
          <h3 className="font-bold text-white text-base">Open a Priority Support Ticket</h3>

          <form onSubmit={handleTicketSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                required
                value={ticketSubject}
                onChange={e => setTicketSubject(e.target.value)}
                placeholder="Brief summary of your issue"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={ticketCategory}
                  onChange={e => setTicketCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                >
                  <option value="Streaming Issue">Streaming Issue</option>
                  <option value="YouTube API">YouTube API & OAuth</option>
                  <option value="Billing & Invoice">Billing & Invoice</option>
                  <option value="Playlist Encoding">Playlist Encoding</option>
                  <option value="Feature Request">Feature Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                <select
                  value={ticketPriority}
                  onChange={e => setTicketPriority(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                >
                  <option value="High">High (Live stream broken)</option>
                  <option value="Medium">Medium (Account/Settings)</option>
                  <option value="Low">Low (General question)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Message Description</label>
              <textarea
                required
                rows={4}
                value={ticketMessage}
                onChange={e => setTicketMessage(e.target.value)}
                placeholder="Describe what occurred, any error codes or affected YouTube channel handle..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30"
            >
              Submit Ticket
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
