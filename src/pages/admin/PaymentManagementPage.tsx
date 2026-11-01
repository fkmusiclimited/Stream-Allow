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
  Calendar
} from 'lucide-react';
import { Transaction } from '../../types';

export const PaymentManagementPage: React.FC = () => {
  const { transactions, formatPrice, setActiveViewingInvoice, showToast } = useApp();
  const [filter, setFilter] = useState<'all' | 'Paid' | 'Pending' | 'Failed' | 'Refunded'>('all');
  const [search, setSearch] = useState('');

  const filteredTxs = transactions.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch = t.userName.toLowerCase().includes(search.toLowerCase()) ||
      t.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      t.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExportCSV = () => {
    showToast('Exporting transaction records to CSV...', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header matching reference 7 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">All Transactions</h1>
          <p className="text-xs text-slate-400">View and manage all subscription payments and invoices.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Oct 1, 2026 – Oct 30, 2026</span>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search matching reference 7 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold overflow-x-auto">
          {(['all', 'Paid', 'Pending', 'Failed', 'Refunded'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === st ? 'bg-[#FF1B6B] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'all' ? 'All' : st === 'Paid' ? 'Successful' : st}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by user, transaction ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
          />
        </div>
      </div>

      {/* Table matching reference 7 */}
      <div className="rounded-2xl bg-[#0F1626] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTxs.map((tx, idx) => (
                <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-white block">{tx.userName}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{tx.userEmail}</span>
                  </td>

                  <td className="py-3 px-4 font-medium text-slate-200">
                    {tx.plan}
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {formatPrice(tx.amountUSD, tx.amountBDT)}
                  </td>

                  <td className="py-3 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-[11px] border border-slate-800">
                      {tx.paymentMethod}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tx.status === 'Paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : tx.status === 'Pending'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {tx.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-400">{tx.date}</td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setActiveViewingInvoice(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF1B6B] hover:bg-slate-800 transition-colors"
                      title="View & Download Invoice"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
