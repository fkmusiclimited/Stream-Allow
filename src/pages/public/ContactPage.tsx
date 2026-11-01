import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Mail, MessageCircle, Briefcase, Send, CheckCircle2 } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { showToast, addTicket } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    addTicket(subject || 'General Inquiry', 'Contact Form', 'Medium', message);
    setIsSent(true);
    showToast('Your message has been sent! We will reply within 2 hours.', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF1B6B]">Direct Support</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Get in Touch
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          We are here to help. Contact us anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Contact Info Cards matching reference 9 */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-[#0F1626]/80 border border-slate-800 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Email</h4>
              <p className="text-xs text-slate-400 mt-0.5">support@streamjoin.com</p>
              <p className="text-[11px] text-slate-500 mt-2">Average response time: &lt; 30 mins</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1626]/80 border border-slate-800 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Live Chat</h4>
              <p className="text-xs text-slate-400 mt-0.5">Available 24/7 in User Dashboard</p>
              <p className="text-[11px] text-slate-500 mt-2">Instant connection with streaming engineers</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1626]/80 border border-slate-800 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Business Inquiry</h4>
              <p className="text-xs text-slate-400 mt-0.5">business@streamjoin.com</p>
              <p className="text-[11px] text-slate-500 mt-2">Enterprise bulk streaming & custom agreements</p>
            </div>
          </div>
        </div>

        {/* Right Contact Form matching reference 9 */}
        <div className="lg:col-span-7">
          <div className="p-8 rounded-2xl bg-[#0F1626] border border-slate-800">
            {isSent ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Message Delivered</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Thank you, {name}! Our team has received your ticket and will email a response to {email}.
                </p>
                <button
                  onClick={() => {
                    setIsSent(false);
                    setName('');
                    setEmail('');
                    setSubject('');
                    setMessage('');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Fahim Ahmed"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="How can we help?"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tell us about your streaming requirements or technical question..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
