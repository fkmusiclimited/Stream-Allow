import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Radio, Eye, EyeOff, Lock, Mail, User, ShieldCheck, ArrowRight, Check } from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const { login, register, showToast } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [useRecoveryKey, setUseRecoveryKey] = useState(false);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatusMsg, setForgotStatusMsg] = useState<string | null>(null);

  // Selected subscription plan from Pricing or Home page
  const [selectedPlan, setSelectedPlan] = useState<string>(() => {
    try {
      return localStorage.getItem('streamjoin_selected_plan') || 'pro';
    } catch {
      return 'pro';
    }
  });

  React.useEffect(() => {
    setMode(initialMode);
    try {
      const stored = localStorage.getItem('streamjoin_selected_plan');
      if (stored) setSelectedPlan(stored);
    } catch {}
  }, [initialMode]);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (password !== confirmPassword) {
          showToast('Passwords do not match.', 'error');
          setLoading(false);
          return;
        }
        if (!agreeTerms) {
          showToast('Please agree to the Terms & Conditions.', 'error');
          setLoading(false);
          return;
        }
        const planName = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1);
        await register(name || 'New Creator', email, password, planName);
      }
    } finally {
      setLoading(false);
    }
  };

  const openForgotModal = () => {
    setForgotEmail(email.trim());
    setForgotStep('request');
    setResetTokenInput('');
    setUseRecoveryKey(false);
    setRecoveryKeyInput('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setForgotStatusMsg(null);
    setForgotModalOpen(true);
  };

  const handleForgotRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = forgotEmail.trim();
    if (!identifier) {
      showToast('Please enter your username or email address.', 'error');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        const msg = data.message || 'Reset token generated. Check your configured email or server security logs.';
        setForgotStatusMsg(msg);
        setForgotStep('reset');
        showToast('Password reset token generated (valid for 15 minutes).', 'info');
      } else {
        showToast(data?.message || 'Unable to process password reset request.', 'error');
      }
    } catch (err: any) {
      showToast(`Reset request failed: ${err?.message || 'Network error'}`, 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useRecoveryKey && !resetTokenInput.trim()) {
      showToast('Please enter the verification reset token.', 'error');
      return;
    }
    if (useRecoveryKey && !recoveryKeyInput.trim()) {
      showToast('Please enter the server recovery key.', 'error');
      return;
    }
    if (resetNewPassword.trim().length < 6) {
      showToast('New password must be at least 6 characters long.', 'error');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim() || undefined,
          token: useRecoveryKey ? undefined : resetTokenInput.trim(),
          recoveryKey: useRecoveryKey ? recoveryKeyInput.trim() : undefined,
          newPassword: resetNewPassword
        })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showToast(data.message || 'Password reset successfully. Please login with your new password.', 'success');
        setPassword('');
        setForgotModalOpen(false);
      } else {
        showToast(data?.message || 'Invalid or expired reset credentials.', 'error');
      }
    } catch (err: any) {
      showToast(`Password reset failed: ${err?.message || 'Network error'}`, 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl bg-[#0D131F] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Visual Column matching reference 11 */}
        <div className="md:col-span-5 relative p-8 bg-gradient-to-br from-[#161F33] to-[#0A0E18] flex flex-col justify-between overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo-icon.png"
                alt="Stream Allow Logo"
                className="w-9 h-9 rounded-xl shadow-lg shadow-rose-500/25 object-contain"
              />
              <span className="text-xl font-extrabold tracking-tight text-white">Stream Allow</span>
            </div>

            <div className="pt-8 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {mode === 'login' ? 'Welcome Back' : 'Join Stream Allow'}
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
              <div className="space-y-1.5 pb-1">
                <label className="block text-xs font-medium text-slate-300">Selected Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'basic', label: 'Basic', price: '৳990' },
                    { id: 'pro', label: 'Pro (Popular)', price: '৳2,990' },
                    { id: 'business', label: 'Business', price: '৳6,990' }
                  ].map((pl) => {
                    const isSelected = selectedPlan.toLowerCase() === pl.id;
                    return (
                      <button
                        type="button"
                        key={pl.id}
                        onClick={() => {
                          setSelectedPlan(pl.id);
                          try { localStorage.setItem('streamjoin_selected_plan', pl.id); } catch {}
                        }}
                        className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-rose-950/80 to-slate-900 border-[#FF1B6B] text-white shadow-md shadow-rose-950/40'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                        }`}
                      >
                        <div className={`text-xs font-bold ${isSelected ? 'text-[#FF1B6B]' : ''}`}>{pl.label}</div>
                        <div className="text-[10px] text-slate-400">{pl.price}/mo</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {mode === 'login' ? 'Email Address or Username' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={mode === 'register' ? 'email' : 'text'}
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={mode === 'login' ? 'admin@streamallow.com or admin' : 'name@example.com'}
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
                <span className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Session login required</span>
                </span>
                <button
                  type="button"
                  onClick={openForgotModal}
                  className="text-xs text-[#FF1B6B] hover:underline font-medium"
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
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30 transition-all mt-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Create Account')}
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
          <div className="relative w-full max-w-md bg-[#0F1626] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Reset Password</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {forgotStep === 'request' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </span>
            </div>

            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotRequestSubmit} className="space-y-3">
                <p className="text-xs text-slate-400">
                  Enter your account username or email address (e.g. <span className="text-slate-200">admin</span> or <span className="text-slate-200">admin@streamallow.com</span>) to generate a one-time 15-minute reset token.
                </p>
                <input
                  type="text"
                  required
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="Username or email address"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => setForgotStep('reset')}
                    className="text-[#FF1B6B] hover:underline"
                  >
                    Already have a reset token or recovery key?
                  </button>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="flex-1 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 rounded-lg bg-[#FF1B6B] text-xs text-white font-bold disabled:opacity-50"
                  >
                    {forgotLoading ? 'Generating...' : 'Generate Reset Token'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetConfirmSubmit} className="space-y-3">
                {forgotStatusMsg && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 leading-relaxed">
                    {forgotStatusMsg}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Account Username or Email</label>
                  <input
                    type="text"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="admin@streamallow.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">
                    {useRecoveryKey ? 'Server Recovery Key (ADMIN_RESET_KEY)' : 'Verification Reset Token'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseRecoveryKey(prev => !prev)}
                    className="text-[#FF1B6B] hover:underline"
                  >
                    {useRecoveryKey ? 'Use Reset Token instead' : 'Use Server Recovery Key'}
                  </button>
                </div>

                {useRecoveryKey ? (
                  <input
                    type="password"
                    required
                    value={recoveryKeyInput}
                    onChange={e => setRecoveryKeyInput(e.target.value)}
                    placeholder="Enter server ADMIN_RESET_KEY"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={resetTokenInput}
                    onChange={e => setResetTokenInput(e.target.value)}
                    placeholder="Paste 48-char reset token from server logs/email"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#FF1B6B]"
                  />
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">New Password (min 6 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetNewPassword}
                    onChange={e => setResetNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetConfirmPassword}
                    onChange={e => setResetConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 font-semibold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 rounded-lg bg-[#FF1B6B] text-xs text-white font-bold disabled:opacity-50"
                  >
                    {forgotLoading ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
