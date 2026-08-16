'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Send,
  Shield,
  Clock,
  Activity,
  Target,
} from 'lucide-react';

interface SignalHistoryStats {
  totalSignals: number;
  totalAlertsSent: number;
  totalAlertsBlocked: number;
  directionDistribution: Record<string, number>;
  avgWinRateByDirection: Record<string, number>;
  topTickers: { ticker: string; count: number }[];
  periodDays: number;
}

interface AlertEntry {
  ticker: string;
  direction: string;
  probability_score: number;
  status: string;
  sent_at: string;
}

const DIRECTION_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  STRONG_BUY: { label: 'Strong Buy', color: 'text-emerald-400', bg: 'bg-emerald-950/60', border: 'border-emerald-800/60' },
  BUY: { label: 'Buy', color: 'text-emerald-300', bg: 'bg-emerald-950/40', border: 'border-emerald-800/40' },
  NEUTRAL: { label: 'Neutral', color: 'text-amber-300', bg: 'bg-amber-950/40', border: 'border-amber-800/40' },
  SELL: { label: 'Sell', color: 'text-rose-300', bg: 'bg-rose-950/40', border: 'border-rose-800/40' },
  STRONG_SELL: { label: 'Strong Sell', color: 'text-rose-400', bg: 'bg-rose-950/60', border: 'border-rose-800/60' },
};

export default function SignalHistoryPage() {
  const [stats, setStats] = useState<SignalHistoryStats | null>(null);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/signals/history?days=${days}`);
        const json = await res.json();
        if (json.success) {
          setStats(json.stats);
          setAlerts(json.alertHistory || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [days]);

  const totalDir = stats ? Object.values(stats.directionDistribution).reduce((a, b) => a + b, 0) : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-[#0d1320] p-5 rounded-lg border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" />
            <span>SIGNAL HISTORY & PERFORMANCE</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">ประวัติสัญญาณเทรดและสถิติการแจ้งเตือน Telegram</p>
        </div>
        {/* Period selector */}
        <div className="flex rounded-md bg-[#131b2c] p-0.5 border border-slate-800 text-xs">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                days === d ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="terminal-card p-6 h-28 animate-pulse-subtle bg-slate-900/40" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="terminal-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-mono uppercase">
                <Activity className="w-3.5 h-3.5" /> สัญญาณทั้งหมด
              </div>
              <div className="text-3xl font-black text-white font-mono">{stats.totalSignals}</div>
              <div className="text-xs text-slate-500">{days} วันที่ผ่านมา</div>
            </div>

            <div className="terminal-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-mono uppercase">
                <Send className="w-3.5 h-3.5" /> Alert ที่ส่งไป
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono">{stats.totalAlertsSent}</div>
              <div className="text-xs text-slate-500">ส่งถึง Telegram ทั้งหมด</div>
            </div>

            <div className="terminal-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 text-[10px] font-mono uppercase">
                <Shield className="w-3.5 h-3.5" /> Blocked โดย AI
              </div>
              <div className="text-3xl font-black text-amber-400 font-mono">{stats.totalAlertsBlocked}</div>
              <div className="text-xs text-slate-500">ระงับโดย Risk Validator</div>
            </div>

            <div className="terminal-card p-4 space-y-1">
              <div className="flex items-center gap-2 text-blue-400 text-[10px] font-mono uppercase">
                <Target className="w-3.5 h-3.5" /> อัตราผ่าน AI
              </div>
              <div className="text-3xl font-black text-blue-400 font-mono">
                {stats.totalAlertsSent + stats.totalAlertsBlocked > 0
                  ? Math.round((stats.totalAlertsSent / (stats.totalAlertsSent + stats.totalAlertsBlocked)) * 100)
                  : 0}%
              </div>
              <div className="text-xs text-slate-500">ผ่าน Dual-Agent Validation</div>
            </div>
          </div>

          {/* Direction Distribution + Top Tickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Direction Breakdown */}
            <div className="terminal-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-400" /> สัดส่วนทิศทางสัญญาณ
              </h3>
              {Object.entries(stats.directionDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([dir, count]) => {
                  const meta = DIRECTION_META[dir] || DIRECTION_META['NEUTRAL'];
                  const pct = Math.round((count / totalDir) * 100);
                  const avgWR = stats.avgWinRateByDirection[dir] || 50;
                  return (
                    <div key={dir} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${meta.color} ${meta.bg} ${meta.border}`}>
                          {meta.label}
                        </span>
                        <span className="text-slate-300">
                          {count}x · <span className="text-slate-400">avg {avgWR}% win rate</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${dir.includes('BUY') ? 'bg-emerald-500' : dir.includes('SELL') ? 'bg-rose-500' : 'bg-amber-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Top Tickers */}
            <div className="terminal-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> สัญลักษณ์ที่มีสัญญาณมากสุด
              </h3>
              {stats.topTickers.map(({ ticker, count }, idx) => (
                <div key={ticker} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-4">#{idx + 1}</span>
                    <span className="font-bold text-white">{ticker}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.round((count / (stats.topTickers[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-slate-400 w-12 text-right">{count} signals</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert History Log */}
          {alerts.length > 0 && (
            <div className="terminal-card p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-slate-400" /> ประวัติการแจ้งเตือนล่าสุด (Alert Audit Log)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left pb-2 pr-4">เวลา</th>
                      <th className="text-left pb-2 pr-4">Ticker</th>
                      <th className="text-left pb-2 pr-4">ทิศทาง</th>
                      <th className="text-left pb-2 pr-4">Win Rate</th>
                      <th className="text-left pb-2">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {alerts.map((alert, idx) => {
                      const isBuy = alert.direction.includes('BUY');
                      const isSell = alert.direction.includes('SELL');
                      const wr = isSell ? (1 - alert.probability_score) * 100 : isBuy ? alert.probability_score * 100 : 50;
                      const time = new Date(alert.sent_at).toLocaleString('th-TH', {
                        timeZone: 'Asia/Bangkok',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2 pr-4 text-slate-500">{time}</td>
                          <td className="py-2 pr-4 font-bold text-white">{alert.ticker}</td>
                          <td className="py-2 pr-4">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isBuy ? 'text-emerald-400 bg-emerald-950/50' : isSell ? 'text-rose-400 bg-rose-950/50' : 'text-amber-400 bg-amber-950/50'}`}>
                              {alert.direction.replace('_', ' ')}
                            </span>
                          </td>
                          <td className={`py-2 pr-4 font-bold ${wr >= 75 ? 'text-emerald-400' : wr >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {wr.toFixed(1)}%
                          </td>
                          <td className="py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              alert.status === 'sent' ? 'text-emerald-400 bg-emerald-950/50' :
                              alert.status === 'blocked' ? 'text-amber-400 bg-amber-950/50' :
                              'text-rose-400 bg-rose-950/50'
                            }`}>
                              {alert.status === 'sent' ? '✅ ส่งแล้ว' : alert.status === 'blocked' ? '🛡️ ระงับ' : '❌ ผิดพลาด'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="terminal-card p-12 text-center text-xs font-mono text-slate-400">
          ยังไม่มีประวัติสัญญาณในระบบ กรุณารอให้ระบบสแกนตลาดก่อน
        </div>
      )}
    </div>
  );
}
