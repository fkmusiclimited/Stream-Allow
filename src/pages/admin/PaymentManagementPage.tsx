import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Receipt,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Settings,
  Check,
  X,
  Copy,
  Clock,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { Transaction, PaymentGatewaySettings } from '../../types';

export const PaymentManagementPage: React.FC = () => {
  const {
    transactions,
    formatPrice,
    setActiveViewingInvoice,
    showToast,
    paymentGatewaySettings,
    updatePaymentGatewaySettings,
    approveUserTransaction,
    rejectUserTransaction
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'Paid' | 'Pending' | 'Failed' | 'Refunded'>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Gateway Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeGatewayTab, setActiveGatewayTab] = useState<'bkash' | 'nagad' | 'qr'>('bkash');
  const [formSettings, setFormSettings] = useState<PaymentGatewaySettings>(paymentGatewaySettings);

  // Sync form when settings change
  React.useEffect(() => {
    setFormSettings(paymentGatewaySettings);
  }, [paymentGatewaySettings]);

  const filteredTxs = transactions.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      (t.userName || '').toLowerCase().includes(q) ||
      (t.userEmail || '').toLowerCase().includes(q) ||
      (t.invoiceNumber || '').toLowerCase().includes(q) ||
      Boolean(t.transactionId && t.transactionId.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = transactions.filter(t => t.status === 'Pending').length;
  const paidCount = transactions.filter(t => t.status === 'Paid').length;
  const totalBdtRevenue = transactions
    .filter(t => t.status === 'Paid')
    .reduce((sum, t) => sum + (t.amountBDT || 0), 0);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied TrxID: ${text}`, 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleApprove = async (tx: Transaction) => {
    setIsProcessing(tx.id);
    try {
      await approveUserTransaction(tx.id);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (tx: Transaction) => {
    if (window.confirm(`Are you sure you want to reject transaction from ${tx.userName}?`)) {
      setIsProcessing(tx.id);
      try {
        await rejectUserTransaction(tx.id);
      } finally {
        setIsProcessing(null);
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePaymentGatewaySettings(formSettings);
    setIsSettingsOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Invoice', 'User Name', 'Email', 'Plan', 'Amount BDT', 'Amount USD', 'Method', 'TrxID', 'Status', 'Date'];
    const rows = filteredTxs.map(t => [
      t.invoiceNumber,
      `"${t.userName}"`,
      t.userEmail,
      `"${t.plan}"`,
      t.amountBDT,
      t.amountUSD,
      t.paymentMethod,
      t.transactionId || 'N/A',
      t.status,
      t.date
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `streamallow_payments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported transaction records to CSV.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <span>Payment Management & Gateways</span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                {pendingCount} Pending Verification
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400">
            Verify user mobile banking payments (bKash/Nagad), activate accounts, and configure gateway numbers.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] text-white text-xs font-bold shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all hover:opacity-95 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>⚙️ Edit bKash/Nagad Numbers</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Pending Verifications</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">{pendingCount}</span>
            <span className="text-[11px] text-amber-400/80 font-semibold">Action Required</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Total Paid Revenue (BDT)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">৳ {totalBdtRevenue.toLocaleString()}</span>
            <span className="text-[11px] text-emerald-400/80 font-semibold">{paidCount} Paid</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Active bKash Number</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-sm font-mono font-bold text-pink-400">{paymentGatewaySettings.bkashNumber}</span>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {paymentGatewaySettings.bkashType}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1626] border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Active Nagad Number</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-sm font-mono font-bold text-orange-400">{paymentGatewaySettings.nagadNumber}</span>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {paymentGatewaySettings.nagadType}
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold overflow-x-auto">
          {(['all', 'Pending', 'Paid', 'Failed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === st
                  ? st === 'Pending'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-[#FF1B6B] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'all' ? 'All Transactions' : st === 'Paid' ? 'Paid / Active' : st === 'Pending' ? `Pending (${pendingCount})` : st}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search user, TrxID, invoice..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-72 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Gateway</th>
                <th className="py-3.5 px-4">Transaction ID (TrxID)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Admin Verification & Action</th>
                <th className="py-3.5 px-4 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No transactions match the selected filter or query.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx, idx) => (
                  <tr key={tx.id} className={`hover:bg-slate-900/40 transition-colors ${tx.status === 'Pending' ? 'bg-amber-950/10' : ''}`}>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{idx + 1}</td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{tx.userName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{tx.userEmail}</span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {tx.plan}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {formatPrice(tx.amountUSD, tx.amountBDT)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        tx.paymentMethod === 'bKash'
                          ? 'bg-pink-950/40 text-pink-400 border-pink-500/30'
                          : tx.paymentMethod === 'Nagad'
                          ? 'bg-orange-950/40 text-orange-400 border-orange-500/30'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}>
                        {tx.paymentMethod}
                      </span>
                    </td>

                    {/* Transaction ID Column */}
                    <td className="py-3.5 px-4">
                      {tx.transactionId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-white bg-slate-950 px-2 py-1 rounded-md border border-slate-700 tracking-wider text-[11px]">
                            {tx.transactionId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(tx.transactionId || '', tx.id)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copy TrxID"
                          >
                            {copiedId === tx.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1 ${
                        tx.status === 'Paid'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : tx.status === 'Pending'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {tx.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {tx.status === 'Paid' && <CheckCircle2 className="w-3 h-3" />}
                        <span>{tx.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{tx.date}</td>

                    {/* Action / Admin Approval */}
                    <td className="py-3.5 px-4 text-center">
                      {tx.status === 'Pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprove(tx)}
                            disabled={isProcessing === tx.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-950/30 transition-all cursor-pointer disabled:opacity-50"
                            title="Approve payment & activate user account"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Approve & Activate</span>
                          </button>

                          <button
                            onClick={() => handleReject(tx)}
                            disabled={isProcessing === tx.id}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 font-bold text-xs border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                            title="Reject this payment"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : tx.status === 'Paid' ? (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Account Active</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApprove(tx)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Re-activate
                        </button>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveViewingInvoice(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF1B6B] hover:bg-slate-800 transition-colors cursor-pointer"
                        title="View & Download Invoice"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ADMIN MODAL: Edit bKash / Nagad / QR Settings                  */}
      {/* ============================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0D121F] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 bg-slate-900/80 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#FF1B6B]" />
                  <span>Payment Gateway Configuration</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update bKash number, Nagad number, QR codes, and user payment instructions.
                </p>
              </div>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-6 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveGatewayTab('bkash')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeGatewayTab === 'bkash'
                    ? 'border-[#FF1B6B] text-[#FF1B6B]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                bKash Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveGatewayTab('nagad')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeGatewayTab === 'nagad'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Nagad Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveGatewayTab('qr')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeGatewayTab === 'qr'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Bank QR & General Notice
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSettings} className="p-6 space-y-5">
              {activeGatewayTab === 'bkash' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        bKash Account Number
                      </label>
                      <input
                        type="text"
                        required
                        value={formSettings.bkashNumber}
                        onChange={e => setFormSettings({ ...formSettings, bkashNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF1B6B]"
                        placeholder="01712-345678"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Account Type
                      </label>
                      <select
                        value={formSettings.bkashType}
                        onChange={e => setFormSettings({ ...formSettings, bkashType: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B] cursor-pointer"
                      >
                        <option value="Merchant">Merchant</option>
                        <option value="Personal">Personal</option>
                        <option value="Send Money">Send Money</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      bKash QR Code Image URL
                    </label>
                    <input
                      type="text"
                      value={formSettings.bkashQrUrl}
                      onChange={e => setFormSettings({ ...formSettings, bkashQrUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF1B6B]"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Payment Instructions (One step per line)
                    </label>
                    <textarea
                      rows={4}
                      value={formSettings.bkashInstructions.join('\n')}
                      onChange={e => setFormSettings({
                        ...formSettings,
                        bkashInstructions: e.target.value.split('\n').filter(s => s.trim().length > 0)
                      })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#FF1B6B] leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {activeGatewayTab === 'nagad' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Nagad Account Number
                      </label>
                      <input
                        type="text"
                        required
                        value={formSettings.nagadNumber}
                        onChange={e => setFormSettings({ ...formSettings, nagadNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                        placeholder="01812-345678"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Account Type
                      </label>
                      <select
                        value={formSettings.nagadType}
                        onChange={e => setFormSettings({ ...formSettings, nagadType: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="Merchant">Merchant</option>
                        <option value="Personal">Personal</option>
                        <option value="Send Money">Send Money</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nagad QR Code Image URL
                    </label>
                    <input
                      type="text"
                      value={formSettings.nagadQrUrl}
                      onChange={e => setFormSettings({ ...formSettings, nagadQrUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Payment Instructions (One step per line)
                    </label>
                    <textarea
                      rows={4}
                      value={formSettings.nagadInstructions.join('\n')}
                      onChange={e => setFormSettings({
                        ...formSettings,
                        nagadInstructions: e.target.value.split('\n').filter(s => s.trim().length > 0)
                      })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {activeGatewayTab === 'qr' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Direct QR Code Image URL (Any Bank / Mobile Bank)
                    </label>
                    <input
                      type="text"
                      value={formSettings.qrCodeImageUrl}
                      onChange={e => setFormSettings({ ...formSettings, qrCodeImageUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Verification Notice Banner (Shown at checkout footer)
                    </label>
                    <input
                      type="text"
                      value={formSettings.verificationNotice}
                      onChange={e => setFormSettings({ ...formSettings, verificationNotice: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      placeholder="Payment Verification: সাধারণত ৫-১০ মিনিটের মধ্যে..."
                    />
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl gradient-brand text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:opacity-95 transition-all cursor-pointer"
                >
                  Save Gateway Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
