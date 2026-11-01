import React from 'react';
import { useApp } from '../../context/AppContext';
import { Radio, LogOut } from 'lucide-react';

export const UserLogoutPage: React.FC = () => {
  const { logout, navigate } = useApp();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 rounded-3xl bg-[#0F1626] border border-slate-800 shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-[#FF1B6B] to-[#E11D48] flex items-center justify-center text-white shadow-xl shadow-rose-500/25">
          <Radio className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Stream Join</span>
          <h2 className="text-2xl font-black text-white">Logout</h2>
          <p className="text-xs text-slate-400 pt-1">
            Are you sure you want to logout from your account?
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate('user/dashboard')}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={logout}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30 transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
