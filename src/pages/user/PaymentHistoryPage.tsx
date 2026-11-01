import React from 'react';
import { useApp } from '../../context/AppContext';
import { Download, CheckCircle2, Receipt, FileText, ExternalLink } from 'lucide-react';

export const PaymentHistoryPage: React.FC = () => {
  const { userTransactions, formatPrice, setActiveViewingInvoice, navigate } = useApp();

  const transactionsList = userTransactions || [];

  return (
    <div className="space-y-6">
      {/* Header matching reference 8 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Payment History</h1>
          <p className="text-xs text-slate-400">View all your transactions and download official VAT invoices.</p>
        </div>
      </div>

      {/* Transactions Table or Empty State */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactionsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                        <Receipt className="w-6 h-6 text-slate-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white">No payment transactions yet</h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        When you activate or renew a subscription plan with bKash, Nagad, or Card, your transactions and downloadable invoices will be listed here.
                      </p>
                      <button
                        onClick={() => navigate('user/subscription')}
                        className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
                      >
                        Choose Subscription Plan
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                transactionsList.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4 font-medium text-slate-300">
                      {tx.date}
                    </td>

                    <td className="py-4 px-4 font-bold text-white">
                      {tx.plan}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-slate-100">
                      {formatPrice(tx.amountUSD, tx.amountBDT)}
                    </td>

                    <td className="py-4 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300">
                        {tx.paymentMethod}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {tx.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setActiveViewingInvoice(tx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[#FF1B6B] border border-rose-500/20 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
