'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';

interface EconEvent {
  event: string;
  country: string;
  impact: 'high' | 'medium' | 'low';
  date: string;
  actual: number | null;
  estimate: number | null;
  previous: number | null;
  unit: string;
}

const IMPACT_META = {
  high: { label: 'HIGH', color: 'text-rose-400', bg: 'bg-rose-950/60', dot: 'bg-rose-400' },
  medium: { label: 'MED', color: 'text-amber-400', bg: 'bg-amber-950/60', dot: 'bg-amber-400' },
  low: { label: 'LOW', color: 'text-slate-400', bg: 'bg-slate-800/60', dot: 'bg-slate-500' },
};

const FLAG_MAP: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', GB: '🇬🇧', JP: '🇯🇵', CA: '🇨🇦',
  AU: '🇦🇺', CH: '🇨🇭', CN: '🇨🇳', NZ: '🇳🇿', DE: '🇩🇪',
};

export const EconomicCalendarWidget: React.FC = () => {
  const [events, setEvents] = useState<EconEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/calendar');
        const json = await res.json();
        if (json.success) {
          setEvents(json.events || []);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatEventTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr?.split('T')[0] || '—';
    }
  };

  return (
    <div className="terminal-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>ปฏิทินเศรษฐกิจโลก (7 วัน)</span>
        </h3>
        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> เวลาไทย (UTC+7)
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-slate-900/50 animate-pulse-subtle" />
          ))}
        </div>
      ) : error || events.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500 font-mono">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-slate-600" />
          {error ? 'ไม่สามารถโหลดปฏิทินได้' : 'ไม่มีข้อมูลเหตุการณ์ใน 7 วันข้างหน้า'}
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-none pr-1">
          {events.map((ev, idx) => {
            const meta = IMPACT_META[ev.impact] || IMPACT_META.medium;
            const flag = FLAG_MAP[ev.country] || '🌐';
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-2.5 rounded-lg border bg-[#0b101c] border-[#1a2336] hover:border-slate-700 transition-colors`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${meta.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px]">{flag}</span>
                    <span className="text-[10px] font-bold text-white font-mono truncate flex-1">{ev.event}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${meta.color} ${meta.bg}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] font-mono">
                    <span className="text-slate-500">{formatEventTime(ev.date)}</span>
                    {ev.estimate !== null && (
                      <span className="text-slate-400">
                        คาด: <span className="text-white font-bold">{ev.estimate}{ev.unit}</span>
                      </span>
                    )}
                    {ev.actual !== null && (
                      <span className={ev.actual !== null && ev.estimate !== null
                        ? (ev.actual >= ev.estimate ? 'text-emerald-400' : 'text-rose-400')
                        : 'text-slate-400'
                      }>
                        จริง: <span className="font-bold">{ev.actual}{ev.unit}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
