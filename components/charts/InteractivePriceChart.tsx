'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { CandleData } from '@/lib/types';
import { RefreshCw } from 'lucide-react';

interface InteractivePriceChartProps {
  candles: CandleData[];
  ticker: string;
  assetType?: string;
}

export const InteractivePriceChart: React.FC<InteractivePriceChartProps> = ({
  candles: initialCandles,
  ticker,
  assetType = 'forex',
}) => {
  const [candles, setCandles] = useState<CandleData[]>(initialCandles || []);
  const [chartMode, setChartMode] = useState<'candles' | 'composed' | 'area'>('candles');
  const [activeTimeframe, setActiveTimeframe] = useState<string>('1D');
  const [isLoadingTimeframe, setIsLoadingTimeframe] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sync initialCandles when prop changes
  useEffect(() => {
    if (initialCandles && initialCandles.length > 0) {
      setCandles(initialCandles);
    }
  }, [initialCandles]);

  // Fetch real candles for chosen timeframe
  const handleTimeframeChange = async (tf: string) => {
    setActiveTimeframe(tf);
    setIsLoadingTimeframe(true);
    try {
      const res = await fetch(`/api/prices/${ticker}?resolution=${tf}&count=50`);
      const json = await res.json();
      if (json.success && Array.isArray(json.candles) && json.candles.length > 0) {
        setCandles(json.candles);
      }
    } catch (err) {
      console.error(`Failed to load candles for ${tf}:`, err);
    } finally {
      setIsLoadingTimeframe(false);
    }
  };

  if (!candles || candles.length === 0) {
    return (
      <div className="h-[380px] flex items-center justify-center text-slate-500 text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-blue-500" />
        กำลังโหลดข้อมูลกราฟราคา...
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
      index: i,
      time: c.timeStr || new Date(c.timestamp).toLocaleDateString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0,
      ema20: Number(ema20.toFixed(4)),
      ema50: Number(ema50.toFixed(4)),
      isBullish: c.close >= c.open,
    };
  });

  const minPrice = Math.min(...candles.map((c) => c.low)) * 0.998;
  const maxPrice = Math.max(...candles.map((c) => c.high)) * 1.002;
  const latestCandle = candles[candles.length - 1];
  const firstCandle = candles[0];
  const isNetPositive = latestCandle.close >= firstCandle.close;
  const decimals = assetType === 'forex' && !ticker.includes('JPY') ? 4 : 2;

  const activeCandle = hoveredIndex !== null && formattedData[hoveredIndex]
    ? formattedData[hoveredIndex]
    : formattedData[formattedData.length - 1];

  return (
    <div className="w-full flex flex-col">
      {/* Chart Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-white/[0.07] gap-3">
        {/* Active Candle Price HUD */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="text-slate-400 text-[11px]">
            O: <span className="text-white font-bold">{activeCandle?.open.toFixed(decimals)}</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            H: <span className="text-emerald-400 font-bold">{activeCandle?.high.toFixed(decimals)}</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            L: <span className="text-rose-400 font-bold">{activeCandle?.low.toFixed(decimals)}</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            C: <span className="text-white font-bold">{activeCandle?.close.toFixed(decimals)}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            <span className="text-blue-400 text-[10px]">EMA20: {activeCandle?.ema20.toFixed(decimals)}</span>
            <span className="text-amber-400 text-[10px]">EMA50: {activeCandle?.ema50.toFixed(decimals)}</span>
          </div>
        </div>

        {/* View & Timeframe Switchers */}
        <div className="flex items-center gap-2">
          {/* Timeframe Switcher */}
          <div className="flex rounded-lg bg-[#0a0f1c] p-0.5 border border-white/[0.08] text-[11px]">
            {[
              { id: '1D', label: '1D' },
              { id: '4H', label: '4H' },
              { id: '1H', label: '1H' },
              { id: '15M', label: '15M' },
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => handleTimeframeChange(tf.id)}
                disabled={isLoadingTimeframe}
                className={`px-2.5 py-0.5 rounded font-mono font-medium transition-all ${
                  activeTimeframe === tf.id
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Chart Style Switcher */}
          <div className="flex rounded-lg bg-[#0a0f1c] p-0.5 border border-white/[0.08] text-[11px]">
            <button
              onClick={() => setChartMode('candles')}
              className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                chartMode === 'candles' ? 'bg-emerald-700 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              แท่งเทียน (Candles)
            </button>
            <button
              onClick={() => setChartMode('composed')}
              className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                chartMode === 'composed' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              แนวโน้ม (Trend)
            </button>
            <button
              onClick={() => setChartMode('area')}
              className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                chartMode === 'area' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              พื้นที่ (Area)
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[360px] w-full relative">
        {isLoadingTimeframe && (
          <div className="absolute inset-0 bg-[#07090e]/60 backdrop-blur-[2px] z-20 flex items-center justify-center text-xs font-mono text-blue-400 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>กำลังปรับไทม์เฟรม {activeTimeframe}...</span>
          </div>
        )}

        {chartMode === 'candles' ? (
          /* Real Custom Candlestick SVG Chart */
          <CandlestickSvgChart
            data={formattedData}
            minPrice={minPrice}
            maxPrice={maxPrice}
            decimals={decimals}
            onHoverIndex={setHoveredIndex}
          />
        ) : (
          /* Area / Line Composed Chart */
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              onMouseMove={(state) => {
                if (state && state.activeTooltipIndex !== undefined) {
                  setHoveredIndex(state.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isNetPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={isNetPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                orientation="right"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickFormatter={(v) => Number(v).toFixed(decimals)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#090d18] border border-white/[0.12] p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1">
                        <div className="text-slate-400 text-[10px] pb-1 border-b border-white/[0.08] font-bold">
                          {d.time} ({activeTimeframe})
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pt-1">
                          <div className="text-slate-400">Open: <span className="text-white font-bold">{d.open.toFixed(decimals)}</span></div>
                          <div className="text-slate-400">High: <span className="text-emerald-400 font-bold">{d.high.toFixed(decimals)}</span></div>
                          <div className="text-slate-400">Low: <span className="text-rose-400 font-bold">{d.low.toFixed(decimals)}</span></div>
                          <div className="text-slate-400">Close: <span className="text-white font-bold">{d.close.toFixed(decimals)}</span></div>
                        </div>
                        <div className="text-[10px] text-blue-400 pt-1 flex justify-between border-t border-white/[0.06]">
                          <span>EMA 20: {d.ema20.toFixed(decimals)}</span>
                          <span className="text-amber-400">EMA 50: {d.ema50.toFixed(decimals)}</span>
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
                  stroke={isNetPositive ? '#10b981' : '#f43f5e'}
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                />
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={isNetPositive ? '#10b981' : '#f43f5e'}
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
        )}
      </div>
    </div>
  );
};

/**
 * High-Performance Candlestick SVG Renderer with Crosshair and EMA Overlay
 */
interface CandlestickSvgChartProps {
  data: Array<{
    index: number;
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    ema20: number;
    ema50: number;
    isBullish: boolean;
  }>;
  minPrice: number;
  maxPrice: number;
  decimals: number;
  onHoverIndex: (idx: number | null) => void;
}

const CandlestickSvgChart: React.FC<CandlestickSvgChartProps> = ({
  data,
  minPrice,
  maxPrice,
  decimals,
  onHoverIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(600);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; itemIndex: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const height = 360;
  const paddingRight = 60;
  const paddingBottom = 30;
  const paddingTop = 15;
  const paddingLeft = 10;

  const chartWidth = Math.max(100, width - paddingLeft - paddingRight);
  const chartHeight = Math.max(100, height - paddingTop - paddingBottom);

  const priceRange = maxPrice - minPrice || 1;
  const getY = (price: number) => {
    const ratio = (price - minPrice) / priceRange;
    return paddingTop + chartHeight * (1 - ratio);
  };

  const candleCount = data.length;
  const candleSlotWidth = chartWidth / candleCount;
  const candleBodyWidth = Math.max(2, Math.min(10, candleSlotWidth * 0.7));

  // Build grid horizontal lines
  const gridCount = 5;
  const gridLines = [];
  for (let i = 0; i <= gridCount; i++) {
    const price = minPrice + (priceRange / gridCount) * i;
    const y = getY(price);
    gridLines.push({ price, y });
  }

  // Generate EMA polyline paths
  const ema20Points = data
    .map((d, i) => `${paddingLeft + (i + 0.5) * candleSlotWidth},${getY(d.ema20)}`)
    .join(' ');
  const ema50Points = data
    .map((d, i) => `${paddingLeft + (i + 0.5) * candleSlotWidth},${getY(d.ema50)}`)
    .join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - paddingLeft;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= chartWidth) {
      const idx = Math.floor(x / candleSlotWidth);
      if (idx >= 0 && idx < data.length) {
        setHoverPos({ x: paddingLeft + (idx + 0.5) * candleSlotWidth, y, itemIndex: idx });
        onHoverIndex(idx);
        return;
      }
    }
    setHoverPos(null);
    onHoverIndex(null);
  };

  const handleMouseLeave = () => {
    setHoverPos(null);
    onHoverIndex(null);
  };

  const hoveredItem = hoverPos ? data[hoverPos.itemIndex] : null;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        width={width}
        height={height}
        className="w-full h-full cursor-crosshair select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Horizontal Grid Lines */}
        {gridLines.map((g, idx) => (
          <g key={idx}>
            <line
              x1={paddingLeft}
              y1={g.y}
              x2={width - paddingRight}
              y2={g.y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
            <text
              x={width - paddingRight + 8}
              y={g.y + 3}
              fill="#64748b"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
            >
              {g.price.toFixed(decimals)}
            </text>
          </g>
        ))}

        {/* Candlesticks (Wicks & Bodies) */}
        {data.map((c, i) => {
          const cx = paddingLeft + (i + 0.5) * candleSlotWidth;
          const yHigh = getY(c.high);
          const yLow = getY(c.low);
          const yOpen = getY(c.open);
          const yClose = getY(c.close);

          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
          const color = c.isBullish ? '#10b981' : '#f43f5e';

          return (
            <g key={i} className="transition-opacity">
              {/* Wick Line */}
              <line
                x1={cx}
                y1={yHigh}
                x2={cx}
                y2={yLow}
                stroke={color}
                strokeWidth={1.2}
              />
              {/* Candle Body */}
              <rect
                x={cx - candleBodyWidth / 2}
                y={bodyTop}
                width={candleBodyWidth}
                height={bodyHeight}
                fill={color}
                rx={1}
              />
            </g>
          );
        })}

        {/* EMA 20 Line Overlay (Blue) */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1.5}
          points={ema20Points}
          strokeLinejoin="round"
        />

        {/* EMA 50 Line Overlay (Amber) */}
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1.5}
          points={ema50Points}
          strokeLinejoin="round"
        />

        {/* Time X-Axis Ticks (Every 5-8 candles) */}
        {data.map((c, i) => {
          if (i % Math.max(5, Math.floor(candleCount / 6)) === 0 || i === candleCount - 1) {
            const cx = paddingLeft + (i + 0.5) * candleSlotWidth;
            return (
              <text
                key={i}
                x={cx}
                y={height - 8}
                fill="#64748b"
                fontSize={9}
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {c.time}
              </text>
            );
          }
          return null;
        })}

        {/* Crosshair Lines on Hover */}
        {hoverPos && (
          <g>
            {/* Vertical crosshair */}
            <line
              x1={hoverPos.x}
              y1={paddingTop}
              x2={hoverPos.x}
              y2={paddingTop + chartHeight}
              stroke="rgba(255,255,255,0.3)"
              strokeDasharray="2 2"
            />
            {/* Horizontal crosshair */}
            <line
              x1={paddingLeft}
              y1={hoverPos.y}
              x2={width - paddingRight}
              y2={hoverPos.y}
              stroke="rgba(255,255,255,0.3)"
              strokeDasharray="2 2"
            />
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip Card */}
      {hoveredItem && hoverPos && (
        <div
          className="absolute z-30 pointer-events-none bg-[#090d18] border border-white/[0.15] p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1 backdrop-blur-md"
          style={{
            left: Math.min(width - 170, Math.max(10, hoverPos.x - 70)),
            top: 20,
          }}
        >
          <div className="text-slate-400 text-[10px] font-bold border-b border-white/[0.08] pb-1">
            {hoveredItem.time}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pt-0.5">
            <div className="text-slate-400">Open: <span className="text-white font-bold">{hoveredItem.open.toFixed(decimals)}</span></div>
            <div className="text-slate-400">High: <span className="text-emerald-400 font-bold">{hoveredItem.high.toFixed(decimals)}</span></div>
            <div className="text-slate-400">Low: <span className="text-rose-400 font-bold">{hoveredItem.low.toFixed(decimals)}</span></div>
            <div className="text-slate-400">Close: <span className="text-white font-bold">{hoveredItem.close.toFixed(decimals)}</span></div>
          </div>
          <div className="text-[10px] text-blue-400 pt-1 flex justify-between border-t border-white/[0.06]">
            <span>EMA20: {hoveredItem.ema20.toFixed(decimals)}</span>
            <span className="text-amber-400">EMA50: {hoveredItem.ema50.toFixed(decimals)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
