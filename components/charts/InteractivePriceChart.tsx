'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  ComposedChart,
  Line,
} from 'recharts';
import { CandleData } from '@/lib/types';
import { BarChart2, TrendingUp, Maximize2 } from 'lucide-react';

interface InteractivePriceChartProps {
  candles: CandleData[];
  ticker: string;
  assetType?: string;
}

export const InteractivePriceChart: React.FC<InteractivePriceChartProps> = ({
  candles,
  ticker,
  assetType = 'forex',
}) => {
  const [chartMode, setChartMode] = useState<'area' | 'composed'>('composed');
  const [activeTimeframe, setActiveTimeframe] = useState<string>('1D');

  if (!candles || candles.length === 0) {
    return (
      <div className="h-[360px] flex items-center justify-center text-slate-500 text-xs">
        Loading historical chart data...
      </div>
    );
  }

  // Calculate EMA 20 and EMA 50 for overlay
  const formattedData = candles.map((c, i, arr) => {
    let ema20 = c.close;
    let ema50 = c.close;

    if (i >= 20) {
      const slice20 = arr.slice(i - 20, i + 1);
      ema20 = slice20.reduce((acc, curr) => acc + curr.close, 0) / 21;
    }
    if (i >= 50) {
      const slice50 = arr.slice(i - 50, i + 1);
      ema50 = slice50.reduce((acc, curr) => acc + curr.close, 0) / 51;
    }

    return {
      time: c.timeStr || new Date(c.timestamp).toLocaleDateString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0,
      ema20: Number(ema20.toFixed(4)),
      ema50: Number(ema50.toFixed(4)),
    };
  });

  const minPrice = Math.min(...candles.map((c) => c.low)) * 0.998;
  const maxPrice = Math.max(...candles.map((c) => c.high)) * 1.002;
  const latestPrice = candles[candles.length - 1].close;
  const firstPrice = candles[0].close;
  const isNetPositive = latestPrice >= firstPrice;

  const decimals = assetType === 'forex' && !ticker.includes('JPY') ? 4 : 2;

  return (
    <div className="w-full flex flex-col">
      {/* Chart Header Controls */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2.5 h-0.5 bg-blue-500 inline-block"></span>
            <span>EMA 20</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2.5 h-0.5 bg-amber-500 inline-block"></span>
            <span>EMA 50</span>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2">
          <div className="flex rounded bg-[#131b2c] p-0.5 border border-slate-800 text-[11px]">
            {['1D', '4H', '1H'].map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-2 py-0.5 rounded font-mono font-medium transition-colors ${
                  activeTimeframe === tf ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex rounded bg-[#131b2c] p-0.5 border border-slate-800 text-[11px]">
            <button
              onClick={() => setChartMode('composed')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                chartMode === 'composed' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trend
            </button>
            <button
              onClick={() => setChartMode('area')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                chartMode === 'area' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Area
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isNetPositive ? '#10b981' : '#ef4444'} stopOpacity={0.4} />
                <stop offset="100%" stopColor={isNetPositive ? '#10b981' : '#ef4444'} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#172033" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              orientation="right"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              tickFormatter={(v) => Number(v).toFixed(decimals)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#0b101c] border border-slate-700 p-3 rounded-md shadow-xl text-xs font-mono">
                      <div className="text-slate-400 text-[10px] mb-1 font-semibold">{data.time}</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div className="text-slate-300">Open: <span className="text-white font-bold">{data.open}</span></div>
                        <div className="text-slate-300">High: <span className="text-emerald-400 font-bold">{data.high}</span></div>
                        <div className="text-slate-300">Low: <span className="text-rose-400 font-bold">{data.low}</span></div>
                        <div className="text-slate-300">Close: <span className="text-white font-bold">{data.close}</span></div>
                        <div className="text-blue-400 col-span-2">EMA 20: {data.ema20} | EMA 50: {data.ema50}</div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {chartMode === 'area' ? (
              <Area
                type="monotone"
                dataKey="close"
                stroke={isNetPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={isNetPositive ? '#10b981' : '#ef4444'}
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="ema20"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ema50"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
