'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Settings,
  RefreshCw,
  Cpu,
  TrendingUp,
  Cloud,
  Zap,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefresh,
  isRefreshing = false,
  lastUpdated,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      window.location.href = '/login';
    }
  };

  const navItems = [
    { label: 'แดชบอร์ด (Terminal)', href: '/dashboard', icon: BarChart3 },
    { label: 'ตารางสัญญาณ (Matrix)', href: '/signals', icon: Activity },
    { label: 'ตั้งค่า & แจ้งเตือน (Settings)', href: '/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#07090e]/90 backdrop-blur-xl border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
                  NEXUS <span className="text-emerald-400 font-mono text-[10px] px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-700/60 rounded">PRO 2.0</span>
                </span>
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">AI & Quant Intelligence</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white shadow-sm border border-white/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Status & Controls */}
          <div className="flex items-center gap-2.5">
            {/* 24/7 Cloud Online Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e1422] border border-white/[0.08] text-[11px] font-mono text-emerald-400 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <Cloud className="w-3 h-3" />
              <span className="hidden sm:inline">24/7 CLOUD</span>
            </div>

            {/* AI Engine Status */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e1422] border border-white/[0.08] text-[11px] font-mono text-blue-400">
              <Cpu className="w-3 h-3 text-blue-400" />
              <span>GEMINI AI (ไทย)</span>
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Sync Live Data"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'กำลังซิงค์...' : 'รีเฟรช'}</span>
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="ออกจากระบบ (Logout)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/[0.04] hover:bg-rose-500/20 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/30 text-slate-400 text-xs font-medium transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
