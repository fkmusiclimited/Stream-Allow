import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Printer, Download, CheckCircle, ShieldCheck } from 'lucide-react';

export const InvoiceModal: React.FC = () => {
  const { activeViewingInvoice, setActiveViewingInvoice, formatPrice, showToast } = useApp();

  if (!activeViewingInvoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    showToast(`Downloading invoice ${activeViewingInvoice.invoiceNumber}.pdf...`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Action Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide">STREAM JOIN OFFICIAL RECEIPT</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF1B6B] hover:bg-[#E11D48] text-xs font-semibold text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => setActiveViewingInvoice(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body Printable Area */}
        <div className="p-8 overflow-y-auto space-y-8 bg-white print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF1B6B] to-[#E11D48] flex items-center justify-center text-white font-black text-lg">
                  S
                </div>
                <span className="text-xl font-extrabold tracking-tight text-slate-950">STREAM JOIN</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Stream Join Technologies Ltd.<br />
                Gulshan-2, Dhaka 1212, Bangladesh<br />
                support@streamjoin.com · https://streamjoin.com
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-900 tracking-tight">INVOICE</span>
              <p className="text-xs font-mono font-bold text-[#FF1B6B] mt-1">{activeViewingInvoice.invoiceNumber}</p>
              <p className="text-xs text-slate-500 mt-1">Date: {activeViewingInvoice.date}</p>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle className="w-3.5 h-3.5" />
                PAID IN FULL
              </div>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h4>
              <p className="font-bold text-sm text-slate-900">{activeViewingInvoice.userName}</p>
              <p className="text-slate-600">{activeViewingInvoice.userEmail}</p>
              <p className="text-slate-500">Dhaka, Bangladesh</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Details</h4>
              <p className="text-slate-700">Method: <strong className="text-slate-950 font-semibold">{activeViewingInvoice.paymentMethod}</strong></p>
              <p className="text-slate-700">Currency: <strong>BDT (৳) / USD ($)</strong></p>
              <p className="text-slate-700">Status: <strong className="text-emerald-700 font-semibold">Completed</strong></p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4 text-center">Period</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-4 px-4 font-medium text-slate-900">
                  {activeViewingInvoice.plan} Subscription
                  <div className="text-[11px] text-slate-500 font-normal">
                    Automated 24/7 YouTube live streams, playlist queuing, cloud rendering.
                  </div>
                </td>
                <td className="py-4 px-4 text-center text-slate-600">1 Month</td>
                <td className="py-4 px-4 text-right font-bold text-slate-900">
                  {formatPrice(activeViewingInvoice.amountUSD, activeViewingInvoice.amountBDT)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Total Calculation */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatPrice(activeViewingInvoice.amountUSD, activeViewingInvoice.amountBDT)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>VAT / Tax (0% Digital Services):</span>
                <span>৳0 / $0</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-2 font-black text-sm text-slate-900">
                <span>Total Paid:</span>
                <span className="text-[#FF1B6B]">
                  {formatPrice(activeViewingInvoice.amountUSD, activeViewingInvoice.amountBDT)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
            <p className="flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified secure transaction powered by Stream Join Cloud Payment Gateway.
            </p>
            <p className="mt-1">Thank you for building your YouTube streaming empire with Stream Join!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
