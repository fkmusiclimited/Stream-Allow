import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Radio,
  Layers,
  Menu,
  X
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentPath, navigate, currentUser } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: 'public/home' },
    { label: 'About Us', path: 'public/about' },
    { label: 'Features', path: 'public/features' },
    { label: 'Pricing', path: 'public/pricing' },
    { label: 'How It Works', path: 'public/how-it-works' },
    { label: 'Services', path: 'public/services' },
    { label: 'Blog', path: 'public/blog' },
    { label: 'FAQ', path: 'public/faq' },
    { label: 'Contact', path: 'public/contact' }
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-2 min-[375px]:px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-1 sm:gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => handleNavClick('public/home')}
          className="flex items-center gap-1 min-[375px]:gap-1.5 sm:gap-3 cursor-pointer group shrink-0 min-w-0"
        >
          <img
            src="/logo-icon.png"
            alt="Stream Allow Logo"
            className="w-6 h-6 min-[375px]:w-7 min-[375px]:h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform object-contain shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs min-[375px]:text-sm sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
              Stream <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF1B6B] to-[#FF5E8E]">Allow</span>
            </span>
            <span className="hidden sm:block text-[10px] text-slate-400 font-medium tracking-wider uppercase -mt-1 whitespace-nowrap">
              YouTube Automation SaaS
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-300">
          {navLinks.map((link) => {
            const isActive = currentPath === link.path;
            return (
              <button
                key={link.path}
                onClick={() => handleNavClick(link.path)}
                className={`transition-colors py-1 hover:text-white whitespace-nowrap ${
                  isActive ? 'text-[#FF1B6B] font-semibold' : 'text-slate-300'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-1 min-[375px]:gap-1.5 sm:gap-3 shrink-0">
          {/* Dashboard Button (Takes user directly to dashboard if logged in, or login page if not) */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              if (currentUser) {
                navigate(currentUser.role === 'super_admin' || currentUser.role === 'manager' ? 'admin/dashboard' : 'user/dashboard');
              } else {
                navigate('public/login');
              }
            }}
            className="px-1.5 min-[375px]:px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-[10px] min-[375px]:text-[11px] sm:text-xs border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
          >
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FF1B6B] shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* CTA Get Started Button */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate(currentUser ? (currentUser.role === 'super_admin' || currentUser.role === 'manager' ? 'admin/dashboard' : 'user/dashboard') : 'public/register');
            }}
            className="px-1.5 py-1.5 min-[375px]:px-2.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[10px] min-[375px]:text-[11px] sm:text-sm text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30 transition-all transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            Get Started
          </button>

          {/* Mobile hamburger button */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-1 min-[375px]:p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-800 bg-[#0B0F17] px-4 py-5 space-y-3 max-h-[calc(100dvh-4rem)] overflow-y-auto shadow-2xl">
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 pb-4 border-b border-slate-800">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleNavClick(link.path)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  currentPath === link.path ? 'bg-[#FF1B6B]/20 text-[#FF1B6B] font-bold' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <button
              onClick={() => handleNavClick('public/terms')}
              className="text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-900/60"
            >
              Terms & Conditions
            </button>
            <button
              onClick={() => handleNavClick('public/privacy')}
              className="text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-900/60"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
