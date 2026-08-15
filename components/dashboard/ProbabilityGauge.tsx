'use client';

import React from 'react';
import { SignalDirection } from '@/lib/types';

interface ProbabilityGaugeProps {
  score: number; // 0.00 to 1.00
  direction: SignalDirection;
  size?: number;
  showLabels?: boolean;
}

export const ProbabilityGauge: React.FC<ProbabilityGaugeProps> = ({
  score,
  direction,
  size = 120,
  showLabels = true,
}) => {
  const rawPercentage = Math.min(100, Math.max(0, Math.round(score * 100)));
  const isBullish = direction.includes('BUY');
  const isBearish = direction.includes('SELL');

  // Directional Win Rate (e.g., 72% for STRONG_SELL instead of 28%)
  const winRate = isBearish ? (100 - rawPercentage) : (isBullish ? rawPercentage : 50);

  // Gauge needle angle from -90 to +90 degrees (180 deg arc)
  const angle = (score - 0.5) * 180; // 0 -> -90 deg, 0.5 -> 0 deg, 1.0 -> +90 deg

  const color = isBullish ? '#10b981' : isBearish ? '#f43f5e' : '#f59e0b';

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size * 0.65 }}>
        <svg
          viewBox="0 0 100 60"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={color} />
            </filter>
          </defs>

          {/* Background Track */}
          <path
            d="M 15 50 A 35 35 0 0 1 85 50"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Color Arc Track */}
          <path
            d="M 15 50 A 35 35 0 0 1 85 50"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Gauge Center Needle */}
          <g transform={`rotate(${angle} 50 50)`} style={{ transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="18"
              stroke={color}
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#glow)"
            />
            <circle cx="50" cy="50" r="5" fill="#ffffff" />
            <circle cx="50" cy="50" r="2.5" fill={color} />
          </g>
        </svg>

        {/* Center Win Rate Percentage Display */}
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className="text-base font-black font-mono text-white leading-none tracking-tight">
            {winRate}%
          </span>
          <span className="text-[9px] text-slate-400 font-sans mt-0.5">วินเรท (Win Rate)</span>
        </div>
      </div>

      {showLabels && (
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isBullish
                ? 'text-emerald-400 bg-emerald-950/70 border-emerald-800/80'
                : isBearish
                ? 'text-rose-400 bg-rose-950/70 border-rose-800/80'
                : 'text-amber-400 bg-amber-950/70 border-amber-800/80'
            }`}
          >
            {direction.replace('_', ' ')}
          </span>
        </div>
      )}
    </div>
  );
};
