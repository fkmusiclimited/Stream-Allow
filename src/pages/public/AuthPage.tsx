import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Radio, Eye, EyeOff, Lock, Mail, User, ShieldCheck, ArrowRight, Check } from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const { login, register, navigate, showToast, switchRole } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      login(email, password);
    } else {
      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
      }
      if (!agreeTerms) {
        showToast('Please agree to the Terms & Conditions.', 'error');
        return;
      }
      register(name || 'New Creator', email, password);
    }
  };

  const handleGoogleLogin = () => {
    showToast('Authenticated with Google OAuth 2.0', 'success');
    login('fahim@gmail.com', 'user123');
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Password reset link sent to ${forgotEmail || email}`, 'success');
    setForgotModalOpen(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl bg-[#0D131F] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Visual Column matching reference 11 */}
        <div className="md:col-span-5 relative p-8 bg-gradient-to-br from-[#161F33] to-[#0A0E18] flex flex-col justify-between overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF1B6B] to-[#E11D48] flex items-center justify-center text-white shadow-lg shadow-rose-500/25">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">Stream Join</span>
            </div>

            <div className="pt-8 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {mode === 'login' ? 'Welcome Back' : 'Join Stream Join'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {mode === 'login'
                  ? 'Login to your account and manage your 24/7 live broadcasts.'
                  : 'Start automating your YouTube live broadcasts in minutes.'}
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-8 space-y-4">
            <div className="rounded-xl overflow-hidden border border-slate-700/60 shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80"
                alt="Streaming Control"
                className="w-full h-40 object-cover brightness-75"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Encrypted 24/7 RTMP Streaming</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Connect your YouTube Studio RTMP key directly. Zero Google Workspace linking required.
              </p>
            </div>
          </div>
        </div>

        {/* Right Form Column matching reference 11 */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          {/* Mode Switch Tabs */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`pb-3 px-4 font-bold text-sm transition-all relative ${
                mode === 'login' ? 'text-[#FF1B6B]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Login
              {mode === 'login' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF1B6B]" />
              )}
            </button>
            <button
              onClick={() => setMode('register')}
              className={`pb-3 px-4 font-bold text-sm transition-all relative ${
                mode === 'register' ? 'text-[#FF1B6B]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
              {mode === 'register' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF1B6B]" />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Fahim Ahmed"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>
              </div>
            )}

            {mode === 'login' ? (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-[#FF1B6B] focus:ring-[#FF1B6B]"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs text-[#FF1B6B] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-[#FF1B6B] focus:ring-[#FF1B6B]"
                />
                <span>I agree to the Terms of Service & Privacy Policy</span>
              </label>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30 transition-all mt-2"
            >
              {mode === 'login' ? 'Login' : 'Create Account'}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase text-slate-500">
                <span className="bg-[#0D131F] px-2 font-medium">OR</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 transition-colors shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="text-center text-xs text-slate-400 pt-2">
              {mode === 'login' ? (
                <p>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-[#FF1B6B] font-semibold hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-[#FF1B6B] font-semibold hover:underline"
                  >
                    Log in
                  </button>
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-[#0F1626] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Reset Password</h3>
            <p className="text-xs text-slate-400">
              Enter your email address and we will send you a password recovery link.
            </p>
            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#FF1B6B] text-xs text-white font-bold"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
