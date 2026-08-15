'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { CandleData } from '@/lib/types';
import { RefreshCw, Calendar, Eye, EyeOff } from 'lucide-react';

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
  const [tooltipMode, setTooltipMode] = useState<'smart_float' | 'top_hud'>('smart_float');

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

  const candleChangePercent = activeCandle
    ? ((activeCandle.close - activeCandle.open) / activeCandle.open) * 100
    : 0;

  return (
    <div className="w-full flex flex-col">
      {/* Chart Header Controls & Non-Obtrusive Top HUD */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 mb-2 border-b border-white/[0.07] gap-3">
        {/* Dynamic Top Price HUD Bar */}
        <div className="flex items-center gap-2.5 text-xs font-mono flex-wrap bg-[#080c16] px-3 py-1.5 rounded-lg border border-white/[0.06] shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] pr-2 border-r border-white/[0.08]">
            <Calendar className="w-3 h-3 text-blue-400" />
            <span className="text-white font-bold">{activeCandle?.time}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500">O:</span>
            <span className="text-white font-bold">{activeCandle?.open.toFixed(decimals)}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500">H:</span>
            <span className="text-emerald-400 font-bold">{activeCandle?.high.toFixed(decimals)}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500">L:</span>
            <span className="text-rose-400 font-bold">{activeCandle?.low.toFixed(decimals)}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500">C:</span>
            <span className="text-white font-bold">{activeCandle?.close.toFixed(decimals)}</span>
            <span
              className={`text-[10px] font-bold px-1 rounded ${
                candleChangePercent >= 0 ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'
              }`}
            >
              {candleChangePercent >= 0 ? '+' : ''}
              {candleChangePercent.toFixed(2)}%
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            <span className="text-blue-400 text-[10px]">EMA20: {activeCandle?.ema20.toFixed(decimals)}</span>
            <span className="text-amber-400 text-[10px]">EMA50: {activeCandle?.ema50.toFixed(decimals)}</span>
          </div>
        </div>

        {/* View & Timeframe Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
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
              แท่งเทียน
            </button>
            <button
              onClick={() => setChartMode('composed')}
              className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                chartMode === 'composed' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              แนวโน้ม
            </button>
            <button
              onClick={() => setChartMode('area')}
              className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                chartMode === 'area' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              พื้นที่
            </button>
          </div>

          {/* Tooltip Float / HUD Toggle */}
          <button
            onClick={() => setTooltipMode(tooltipMode === 'smart_float' ? 'top_hud' : 'smart_float')}
            title={tooltipMode === 'smart_float' ? 'โหมดกล่องลอยตามเมาส์ (Smart Float)' : 'โหมดแสดงบนแถบด้านบน (Docked Top HUD)'}
            className={`p-1 rounded-lg border text-[10px] flex items-center gap-1 font-mono transition-colors ${
              tooltipMode === 'smart_float'
                ? 'bg-blue-950/60 border-blue-600/50 text-blue-300'
                : 'bg-[#0a0f1c] border-white/[0.08] text-slate-400 hover:text-white'
            }`}
          >
            {tooltipMode === 'smart_float' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{tooltipMode === 'smart_float' ? 'กล่องลอย' : 'แถบบน'}</span>
          </button>
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
          /* Real High-Precision Candlestick SVG Chart with Smart Offset Popup */
          <CandlestickSvgChart
            data={formattedData}
            minPrice={minPrice}
            maxPrice={maxPrice}
            decimals={decimals}
            tooltipMode={tooltipMode}
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
 * Institutional-Grade Candlestick SVG Renderer:
 * - Smart Flip & Offset Floating Tooltip (never covers candle or cursor!)
 * - Crisp Wicks & Bodies
 * - Non-obstructive Crosshairs & Axis Price Badges
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
  tooltipMode: 'smart_float' | 'top_hud';
  onHoverIndex: (idx: number | null) => void;
}

const CandlestickSvgChart: React.FC<CandlestickSvgChartProps> = ({
  data,
  minPrice,
  maxPrice,
  decimals,
  tooltipMode,
  onHoverIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(600);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; rawX: number; rawY: number; price: number; itemIndex: number } | null>(null);

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
  const paddingRight = 65;
  const paddingBottom = 26;
  const paddingTop = 15;
  const paddingLeft = 10;

  const chartWidth = Math.max(100, width - paddingLeft - paddingRight);
  const chartHeight = Math.max(100, height - paddingTop - paddingBottom);

  const priceRange = maxPrice - minPrice || 1;
  const getY = (price: number) => {
    const ratio = (price - minPrice) / priceRange;
    return paddingTop + chartHeight * (1 - ratio);
  };

  const getPriceFromY = (y: number) => {
    const ratio = 1 - (y - paddingTop) / chartHeight;
    return minPrice + ratio * priceRange;
  };

  const candleCount = data.length;
  const candleSlotWidth = chartWidth / candleCount;
  const candleBodyWidth = Math.max(2.5, Math.min(11, candleSlotWidth * 0.75));

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

    if (x >= 0 && x <= chartWidth && y >= paddingTop && y <= paddingTop + chartHeight) {
      const idx = Math.floor(x / candleSlotWidth);
      if (idx >= 0 && idx < data.length) {
        const hoverPrice = getPriceFromY(y);
        setHoverPos({
          x: paddingLeft + (idx + 0.5) * candleSlotWidth,
          y,
          rawX: e.clientX - rect.left,
          rawY: y,
          price: hoverPrice,
          itemIndex: idx,
        });
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

  // Calculate clean X-axis step intervals so labels never collide
  const minLabelSpacing = 85;
  const maxLabels = Math.max(2, Math.floor(chartWidth / minLabelSpacing));
  const tickStep = Math.max(1, Math.floor(candleCount / maxLabels));

  // Smart Tooltip Positioning: Flips opposite to mouse to NEVER cover the candle!
  const tooltipWidth = 145;
  const tooltipHeight = 100;
  let tooltipLeft = 0;
  let tooltipTop = 0;

  if (hoverPos) {
    // If mouse is on right half, flip tooltip to LEFT of cursor with 18px margin
    if (hoverPos.rawX > chartWidth / 2) {
      tooltipLeft = hoverPos.x - tooltipWidth - 18;
    } else {
      // If mouse is on left half, flip tooltip to RIGHT of cursor with 18px margin
      tooltipLeft = hoverPos.x + 18;
    }

    // Keep within bounds
    tooltipLeft = Math.max(10, Math.min(width - paddingRight - tooltipWidth - 5, tooltipLeft));

    // Vertical placement (places below or above cursor comfortably)
    if (hoverPos.rawY > chartHeight / 2) {
      tooltipTop = Math.max(15, hoverPos.y - tooltipHeight - 10);
    } else {
      tooltipTop = Math.min(chartHeight - tooltipHeight, hoverPos.y + 15);
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
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
              stroke="rgba(255,255,255,0.05)"
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
          const bodyHeight = Math.max(1.8, Math.abs(yOpen - yClose));
          const color = c.isBullish ? '#10b981' : '#f43f5e';
          const isHovered = hoverPos && hoverPos.itemIndex === i;

          return (
            <g key={i} opacity={hoverPos && !isHovered ? 0.75 : 1} className="transition-opacity">
              {/* Wick Line */}
              <line
                x1={cx}
                y1={yHigh}
                x2={cx}
                y2={yLow}
                stroke={color}
                strokeWidth={isHovered ? 1.8 : 1.2}
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
          opacity={0.85}
        />

        {/* EMA 50 Line Overlay (Amber) */}
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1.5}
          points={ema50Points}
          strokeLinejoin="round"
          opacity={0.85}
        />

        {/* Time X-Axis Ticks (Cleanly spaced) */}
        {data.map((c, i) => {
          if (i % tickStep === 0 || i === candleCount - 1) {
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

        {/* Precise Crosshair Lines & Axis Badges on Hover */}
        {hoverPos && hoveredItem && (
          <g>
            {/* Vertical crosshair */}
            <line
              x1={hoverPos.x}
              y1={paddingTop}
              x2={hoverPos.x}
              y2={paddingTop + chartHeight}
              stroke="rgba(255,255,255,0.35)"
              strokeDasharray="3 3"
            />
            {/* Horizontal crosshair */}
            <line
              x1={paddingLeft}
              y1={hoverPos.y}
              x2={width - paddingRight}
              y2={hoverPos.y}
              stroke="rgba(255,255,255,0.35)"
              strokeDasharray="3 3"
            />

            {/* Y-Axis Price Badge (Right) */}
            <rect
              x={width - paddingRight + 2}
              y={hoverPos.y - 9}
              width={paddingRight - 4}
              height={18}
              fill="#1e293b"
              stroke="#3b82f6"
              rx={3}
            />
            <text
              x={width - paddingRight + 6}
              y={hoverPos.y + 3.5}
              fill="#ffffff"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
            >
              {hoverPos.price.toFixed(decimals)}
            </text>

            {/* X-Axis Date Badge (Bottom) */}
            <rect
              x={hoverPos.x - 45}
              y={paddingTop + chartHeight + 2}
              width={90}
              height={18}
              fill="#1e293b"
              stroke="#3b82f6"
              rx={3}
            />
            <text
              x={hoverPos.x}
              y={paddingTop + chartHeight + 14}
              fill="#ffffff"
              fontSize={9}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {hoveredItem.time}
            </text>
          </g>
        )}
      </svg>

      {/* Smart Flip Floating Tooltip (Only if mode is smart_float, flips away from cursor to NEVER block the candle!) */}
      {tooltipMode === 'smart_float' && hoveredItem && hoverPos && (
        <div
          className="absolute z-30 pointer-events-none bg-[#090e1b]/95 border border-blue-500/40 p-2.5 rounded-lg shadow-2xl text-xs font-mono space-y-1 backdrop-blur-md transition-transform duration-75"
          style={{
            left: tooltipLeft,
            top: tooltipTop,
            width: tooltipWidth,
          }}
        >
          <div className="text-slate-400 text-[10px] font-bold border-b border-white/[0.08] pb-1 flex items-center justify-between">
            <span>{hoveredItem.time}</span>
            <span className={hoveredItem.isBullish ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {hoveredItem.isBullish ? '▲ เขียว' : '▼ แดง'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px] pt-0.5">
            <div className="text-slate-400">O: <span className="text-white font-bold">{hoveredItem.open.toFixed(decimals)}</span></div>
            <div className="text-slate-400">H: <span className="text-emerald-400 font-bold">{hoveredItem.high.toFixed(decimals)}</span></div>
            <div className="text-slate-400">L: <span className="text-rose-400 font-bold">{hoveredItem.low.toFixed(decimals)}</span></div>
            <div className="text-slate-400">C: <span className="text-white font-bold">{hoveredItem.close.toFixed(decimals)}</span></div>
          </div>
          <div className="text-[9.5px] text-blue-300 pt-1 flex justify-between border-t border-white/[0.06]">
            <span>EMA20: {hoveredItem.ema20.toFixed(decimals)}</span>
            <span className="text-amber-400">EMA50: {hoveredItem.ema50.toFixed(decimals)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
