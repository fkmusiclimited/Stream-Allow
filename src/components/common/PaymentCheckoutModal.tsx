import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Clock,
  QrCode,
  Lock,
  ArrowRight
} from 'lucide-react';
import { SubscriptionPlan } from '../../types';

interface PaymentCheckoutModalProps {
  plan: SubscriptionPlan | null;
  onClose: () => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({ plan, onClose }) => {
  const {
    currency,
    formatPrice,
    paymentGatewaySettings,
    submitUserPayment,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'BDT' | 'USD'>(currency === 'USD' ? 'USD' : 'BDT');
  const [selectedBdtMethod, setSelectedBdtMethod] = useState<'bKash' | 'Nagad' | 'QR Code'>('bKash');
  const [trxId, setTrxId] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stripe Card form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [billingCountry, setBillingCountry] = useState('United States');

  if (!plan) return null;

  const currentNumber = selectedBdtMethod === 'bKash'
    ? paymentGatewaySettings.bkashNumber
    : selectedBdtMethod === 'Nagad'
    ? paymentGatewaySettings.nagadNumber
    : paymentGatewaySettings.bkashNumber;

  const currentType = selectedBdtMethod === 'bKash'
    ? paymentGatewaySettings.bkashType
    : selectedBdtMethod === 'Nagad'
    ? paymentGatewaySettings.nagadType
    : 'Merchant';

  const currentQrUrl = selectedBdtMethod === 'bKash'
    ? paymentGatewaySettings.bkashQrUrl
    : selectedBdtMethod === 'Nagad'
    ? paymentGatewaySettings.nagadQrUrl
    : paymentGatewaySettings.qrCodeImageUrl;

  const instructions = selectedBdtMethod === 'bKash'
    ? paymentGatewaySettings.bkashInstructions
    : selectedBdtMethod === 'Nagad'
    ? paymentGatewaySettings.nagadInstructions
    : paymentGatewaySettings.qrCodeInstructions;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(currentNumber.replace(/[^0-9]/g, ''));
    setCopiedNumber(true);
    showToast(`Copied ${selectedBdtMethod} number: ${currentNumber}`, 'info');
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleBdtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTrx = trxId.trim().toUpperCase();
    if (!cleanTrx) {
      showToast('অনুগ্রহ করে Transaction ID (TrxID) লিখুন।', 'error');
      return;
    }

    if (cleanTrx.length < 5) {
      showToast('সঠিক Transaction ID দিন (কমপক্ষে ৫ অক্ষর)।', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await submitUserPayment({
        planId: plan.id,
        gateway: selectedBdtMethod,
        transactionId: cleanTrx,
        amountBDT: plan.priceBDT,
        amountUSD: plan.priceUSD,
        currency: 'BDT'
      });

      if (success) {
        showToast('✓ পেমেন্ট সফলভাবে সাবমিট হয়েছে! সাধারণত ৫-১০ মিনিটের মধ্যে অ্যাডমিন ভেরিফাই করে আপনার একাউন্ট অ্যাক্টিভ করে দেবে।', 'success');
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiryDate || !cvc) {
      showToast('Please enter complete card details.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedTrx = `STRIPE_${Date.now().toString(36).toUpperCase()}`;
      const success = await submitUserPayment({
        planId: plan.id,
        gateway: 'Stripe',
        transactionId: generatedTrx,
        amountBDT: plan.priceBDT,
        amountUSD: plan.priceUSD,
        currency: 'USD'
      });

      if (success) {
        showToast('✓ Stripe payment submitted! Admin will verify and activate your subscription.', 'success');
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#0D121F] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        
        {/* Top Header & Currency Tabs Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 bg-slate-900/80 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#FF1B6B]">
                Secure Checkout
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF1B6B]" />
              <span className="text-xs font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                {plan.name} Plan
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
              Activate Subscription · {formatPrice(plan.priceUSD, plan.priceBDT)}
              <span className="text-xs text-slate-400 font-normal ml-1">/ month</span>
            </h2>
          </div>

          {/* BDT / USD Tab Toggle Buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('BDT')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'BDT'
                    ? 'bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🇧🇩 BDT (৳)</span>
                <span className="text-[10px] opacity-80">bKash/Nagad</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('USD')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'USD'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🌐 USD ($)</span>
                <span className="text-[10px] opacity-80">Stripe/Card</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-8">
          {activeTab === 'BDT' ? (
            /* ============================================================== */
            /* TAB 1: BDT (Pay with bKash / Nagad / QR) matching user's image */
            /* ============================================================== */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  <span>Pay with bKash / Nagad / QR</span>
                </h3>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Manual Verification via Mobile Banking
                </span>
              </div>

              {/* 3 Columns Layout matching reference image */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                {/* Column 1: Gateway Radio Options */}
                <div className="md:col-span-4 space-y-3 flex flex-col justify-between">
                  {/* bKash Option */}
                  <label
                    onClick={() => setSelectedBdtMethod('bKash')}
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedBdtMethod === 'bKash'
                        ? 'bg-pink-950/30 border-pink-500/80 shadow-md shadow-pink-950/40 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bdt_method"
                      checked={selectedBdtMethod === 'bKash'}
                      onChange={() => setSelectedBdtMethod('bKash')}
                      className="accent-[#FF1B6B] w-4 h-4 cursor-pointer"
                    />
                    <div className="w-8 h-8 rounded-lg bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 font-extrabold text-sm shrink-0">
                      ৳
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">bKash</span>
                      <span className="text-[11px] text-slate-400">{paymentGatewaySettings.bkashType} Account</span>
                    </div>
                  </label>

                  {/* Nagad Option */}
                  <label
                    onClick={() => setSelectedBdtMethod('Nagad')}
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedBdtMethod === 'Nagad'
                        ? 'bg-orange-950/30 border-orange-500/80 shadow-md shadow-orange-950/40 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bdt_method"
                      checked={selectedBdtMethod === 'Nagad'}
                      onChange={() => setSelectedBdtMethod('Nagad')}
                      className="accent-orange-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-extrabold text-sm shrink-0">
                      🔥
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Nagad</span>
                      <span className="text-[11px] text-slate-400">{paymentGatewaySettings.nagadType} Account</span>
                    </div>
                  </label>

                  {/* QR Code Option */}
                  <label
                    onClick={() => setSelectedBdtMethod('QR Code')}
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedBdtMethod === 'QR Code'
                        ? 'bg-blue-950/30 border-blue-500/80 shadow-md shadow-blue-950/40 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bdt_method"
                      checked={selectedBdtMethod === 'QR Code'}
                      onChange={() => setSelectedBdtMethod('QR Code')}
                      className="accent-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">QR Code</span>
                      <span className="text-[11px] text-slate-400">Any Bank / Mobile Bank</span>
                    </div>
                  </label>
                </div>

                {/* Column 2: QR Code Visual */}
                <div className="md:col-span-4 p-4 rounded-2xl bg-white border border-slate-300 flex flex-col items-center justify-center text-center space-y-2.5">
                  <div className="w-40 h-40 bg-white p-2 rounded-xl flex items-center justify-center shadow-inner">
                    <img
                      src={currentQrUrl}
                      alt="Payment QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-900 block">
                      {selectedBdtMethod} {currentType}
                    </span>
                    <span className="text-[11px] text-slate-600">Scan to Pay</span>
                  </div>
                </div>

                {/* Column 3: Payment Instructions */}
                <div className="md:col-span-4 p-4.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    Payment Instruction
                  </h4>

                  <div className="space-y-2 text-xs text-slate-300">
                    {instructions.map((inst, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="leading-tight pt-0.5">{inst}</div>
                      </div>
                    ))}
                  </div>

                  {/* Highlighted Phone Number with Copy Button */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-pink-500/40 text-xs">
                      <div className="font-mono font-bold text-pink-400 text-sm tracking-wide">
                        {currentNumber}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyNumber}
                        className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedNumber ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedNumber ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Input Row: Amount (BDT) and Transaction ID */}
              <form onSubmit={handleBdtSubmit} className="space-y-4 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  {/* Amount (BDT) */}
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Amount (BDT)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={`৳ ${plan.priceBDT.toLocaleString()}`}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white cursor-not-allowed select-all"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-slate-400">
                        {plan.name}
                      </span>
                    </div>
                  </div>

                  {/* Transaction ID */}
                  <div className="sm:col-span-7">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Transaction ID (bKash/Nagad)</span>
                      <span className="text-[10px] text-rose-400 font-normal">*Required</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={trxId}
                        onChange={e => setTrxId(e.target.value)}
                        placeholder="e.g. 8A7K5D9H3"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-[#FF1B6B] rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Big Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white gradient-brand hover:opacity-95 shadow-xl shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSubmitting ? 'Submitting Payment...' : 'Submit Payment'}</span>
                </button>

                {/* Verification Time Notice */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{paymentGatewaySettings.verificationNotice}</span>
                </div>
              </form>
            </div>
          ) : (
            /* ============================================================== */
            /* TAB 2: USD (Pay Securely with Stripe) matching user's image    */
            /* ============================================================== */
            <form onSubmit={handleStripeSubmit} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
                    S
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Pay Securely with Stripe
                    </h3>
                    <p className="text-xs text-slate-400">
                      International payment via Credit / Debit Card
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Secure Payment by Stripe</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Card Form Inputs */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Card Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Card Information
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-28 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <div className="absolute right-3 top-2 flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <span>VISA</span>
                        <span className="text-rose-400">MC</span>
                        <span className="text-blue-400">AMEX</span>
                      </div>
                    </div>
                  </div>

                  {/* Expiry Date & CVC */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        required
                        value={expiryDate}
                        onChange={e => setExpiryDate(e.target.value)}
                        placeholder="MM / YY"
                        maxLength={5}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        CVC
                      </label>
                      <input
                        type="text"
                        required
                        value={cvc}
                        onChange={e => setCvc(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-center"
                      />
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={cardholderName}
                      onChange={e => setCardholderName(e.target.value)}
                      placeholder="Your name on card"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Billing Country */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Billing Country
                    </label>
                    <select
                      value={billingCountry}
                      onChange={e => setBillingCountry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="United States">🇺🇸 United States</option>
                      <option value="Bangladesh">🇧🇩 Bangladesh</option>
                      <option value="United Kingdom">🇬🇧 United Kingdom</option>
                      <option value="Canada">🇨🇦 Canada</option>
                      <option value="Australia">🇦🇺 Australia</option>
                      <option value="Germany">🇩🇪 Germany</option>
                      <option value="India">🇮🇳 India</option>
                      <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
                    </select>
                  </div>
                </div>

                {/* Right Trust Badges Column */}
                <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Secure & Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Visa, MasterCard, Amex</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Instant Activation</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Powered by Stripe</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 text-center">
                    <span className="text-xl font-black text-indigo-400 tracking-wider">
                      stripe
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">256-Bit SSL End-to-End Encryption</p>
                  </div>
                </div>
              </div>

              {/* Stripe Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:opacity-95 shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-95 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Processing Payment...' : `Pay $${plan.priceUSD.toFixed(2)} & Activate Now`}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
