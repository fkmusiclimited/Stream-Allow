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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => navigate('public/home')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF1B6B] to-[#E11D48] flex items-center justify-center text-white shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Stream <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF1B6B] to-[#FF5E8E]">Join</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase -mt-1">
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
                className={`transition-colors py-1 hover:text-white ${
                  isActive ? 'text-[#FF1B6B] font-semibold' : 'text-slate-300'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-3">
          {/* Dashboard Button (Takes user directly to dashboard if logged in, or login page if not) */}
          <button
            onClick={() => {
              if (currentUser) {
                navigate(currentUser.role === 'super_admin' || currentUser.role === 'manager' ? 'admin/dashboard' : 'user/dashboard');
              } else {
                navigate('public/login');
              }
            }}
            className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-[#FF1B6B]" />
            <span>Dashboard</span>
          </button>

          {/* CTA Get Started Button */}
          <button
            onClick={() => navigate(currentUser ? (currentUser.role === 'super_admin' || currentUser.role === 'manager' ? 'admin/dashboard' : 'user/dashboard') : 'public/register')}
            className="px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30 transition-all transform active:scale-95 cursor-pointer"
          >
            Get Started
          </button>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-800 bg-[#0B0F17] px-4 py-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 pb-4 border-b border-slate-800">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleNavClick(link.path)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentPath === link.path ? 'bg-[#FF1B6B]/20 text-[#FF1B6B] font-bold' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => handleNavClick('public/terms')}
              className="text-left px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Terms & Conditions
            </button>
            <button
              onClick={() => handleNavClick('public/privacy')}
              className="text-left px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
