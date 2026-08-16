import React from 'react';
import { Activity } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="relative flex items-center justify-center w-16 h-16 mb-4">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full animate-ping"></div>
        {/* Inner Spinner */}
        <div className="absolute inset-2 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
        {/* Center Icon */}
        <Activity className="w-5 h-5 text-blue-400" />
      </div>
      <h2 className="text-sm font-bold text-slate-300 font-mono tracking-widest uppercase">Initializing Nexus</h2>
      <p className="text-[10px] text-slate-500 font-mono mt-2 animate-pulse">Loading core modules...</p>
    </div>
  );
}
