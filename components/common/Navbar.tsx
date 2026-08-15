'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Compass,
  Bell,
  Settings,
  RefreshCw,
  Cpu,
  TrendingUp,
} from 'lucide-react';

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

  const navItems = [
    { label: 'Terminal', href: '/dashboard', icon: BarChart3 },
    { label: 'Signals Matrix', href: '/signals', icon: Activity },
    { label: 'Settings & Alerts', href: '/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0a0e17]/95 backdrop-blur-md border-b border-[#1e293b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  NEXUS <span className="text-emerald-400 font-mono text-xs px-1.5 py-0.5 bg-emerald-950/60 border border-emerald-800/60 rounded">INTEL PRO</span>
                </span>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Forex & Equities Probability Engine</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Status & Refresh Controls */}
          <div className="flex items-center gap-3">
            {/* Realtime Live Engine Status */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#101726] border border-slate-800 text-[11px] font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE FEED</span>
            </div>

            {/* AI Engine Status */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101726] border border-slate-800 text-[11px] font-mono text-blue-400">
              <Cpu className="w-3 h-3" />
              <span>GEMINI 2.0 FLASH</span>
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh Live Data"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#131c2e] hover:bg-[#1e293b] border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
