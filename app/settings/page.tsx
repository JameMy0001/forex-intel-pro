'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Target,
  Key,
  Bell,
  Send,
  Database,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Lock,
  Unlock,
  Sliders,
  Check,
} from 'lucide-react';
import { DEFAULT_SYMBOLS } from '@/lib/constants/defaultSymbols';
import { SymbolInfo } from '@/lib/types';

export default function SettingsPage() {
  const [testingTelegram, setTestingTelegram] = useState<boolean>(false);
  const [telegramStatus, setTelegramStatus] = useState<{ text: string; success: boolean } | null>(null);

  // Focus & Alert Settings State
  const [focusSymbol, setFocusSymbol] = useState<string>('ALL');
  const [minAlertProbability, setMinAlertProbability] = useState<number>(0.70);
  const [telegramEnabled, setTelegramEnabled] = useState<boolean>(true);
  const [activeSymbols, setActiveSymbols] = useState<string[]>(DEFAULT_SYMBOLS.map((s) => s.ticker));
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Load existing settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.settings) {
          setFocusSymbol(json.settings.focus_symbol || 'ALL');
          setMinAlertProbability(json.settings.min_alert_probability || 0.70);
          setTelegramEnabled(json.settings.telegram_enabled !== false);
          if (Array.isArray(json.settings.active_symbols)) {
            setActiveSymbols(json.settings.active_symbols);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (updates: {
    focus_symbol?: string;
    min_alert_probability?: number;
    telegram_enabled?: boolean;
    active_symbols?: string[];
  }) => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus_symbol: updates.focus_symbol !== undefined ? updates.focus_symbol : focusSymbol,
          min_alert_probability: updates.min_alert_probability !== undefined ? updates.min_alert_probability : minAlertProbability,
          telegram_enabled: updates.telegram_enabled !== undefined ? updates.telegram_enabled : telegramEnabled,
          active_symbols: updates.active_symbols !== undefined ? updates.active_symbols : activeSymbols,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveToast('Settings saved & synced with database!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
      setTimeout(() => setSaveToast(null), 3500);
    }
  };

  const handleToggleSymbol = (ticker: string) => {
    let newActive: string[];
    if (activeSymbols.includes(ticker)) {
      newActive = activeSymbols.filter((t) => t !== ticker);
    } else {
      newActive = [...activeSymbols, ticker];
    }
    setActiveSymbols(newActive);
    handleSaveSettings({ active_symbols: newActive });
  };

  const handleSetFocus = (ticker: string) => {
    setFocusSymbol(ticker);
    handleSaveSettings({ focus_symbol: ticker });
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramStatus(null);
    try {
      const res = await fetch('/api/alerts/test', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setTelegramStatus({
          text: '✅ Telegram test alert delivered successfully to your mobile chat!',
          success: true,
        });
      } else {
        setTelegramStatus({
          text: `❌ ${json.error || 'Failed to send Telegram test message'}`,
          success: false,
        });
      }
    } catch (err) {
      setTelegramStatus({
        text: `❌ ${(err as Error).message}`,
        success: false,
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-2xl bg-emerald-950/95 text-emerald-300 border border-emerald-700/80 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Page Title */}
      <div className="bg-[#0d1320] p-5 rounded-lg border border-[#1e293b]">
        <h1 className="text-xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>SYSTEM CONFIGURATION & ALERT LOCK MANAGER</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Lock calculations and alerts to specific pairs (e.g. USD/JPY), adjust trigger sensitivity, and manage live feeds.
        </p>
      </div>

      {/* 1. SYMBOL FOCUS LOCK (NEW: Single Pair Lock Mode) */}
      <div className="terminal-card p-5 space-y-4 border-blue-900/60 bg-[#0c1220]">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
                SYMBOL FOCUS LOCK (โหมดล็อคคู่เงินเฉพาะ)
                {focusSymbol !== 'ALL' && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    LOCKED: {focusSymbol}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                เมื่อล็อคคู่เงิน ระบบจะคำนวณและส่งแจ้งเตือน Telegram **เฉพาะคู่เงินนี้ตัวเดียวเท่านั้น**
              </p>
            </div>
          </div>
        </div>

        {/* Quick Lock Buttons */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 font-mono">Quick Lock Selection:</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <button
              onClick={() => handleSetFocus('USDJPY')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                focusSymbol === 'USDJPY'
                  ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-lg shadow-blue-600/30'
                  : 'bg-[#12192b] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1">
                {focusSymbol === 'USDJPY' ? <Lock className="w-3.5 h-3.5" /> : null}
                <span className="text-sm">USDJPY</span>
              </div>
              <span className="text-[10px] text-slate-300 opacity-80">US Dollar / Yen</span>
            </button>

            <button
              onClick={() => handleSetFocus('EURUSD')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                focusSymbol === 'EURUSD'
                  ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-lg shadow-blue-600/30'
                  : 'bg-[#12192b] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1">
                {focusSymbol === 'EURUSD' ? <Lock className="w-3.5 h-3.5" /> : null}
                <span className="text-sm">EURUSD</span>
              </div>
              <span className="text-[10px] text-slate-300 opacity-80">Euro / US Dollar</span>
            </button>

            <button
              onClick={() => handleSetFocus('XAUUSD')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                focusSymbol === 'XAUUSD'
                  ? 'bg-amber-600 border-amber-400 text-white font-bold shadow-lg shadow-amber-600/30'
                  : 'bg-[#12192b] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1">
                {focusSymbol === 'XAUUSD' ? <Lock className="w-3.5 h-3.5" /> : null}
                <span className="text-sm">XAUUSD</span>
              </div>
              <span className="text-[10px] text-slate-300 opacity-80">Gold Spot</span>
            </button>

            <button
              onClick={() => handleSetFocus('ALL')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                focusSymbol === 'ALL'
                  ? 'bg-emerald-700 border-emerald-400 text-white font-bold shadow-lg shadow-emerald-700/30'
                  : 'bg-[#12192b] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1">
                <Unlock className="w-3.5 h-3.5" />
                <span className="text-sm">ALL PAIRS</span>
              </div>
              <span className="text-[10px] text-slate-300 opacity-80">Full Watchlist</span>
            </button>
          </div>
        </div>

        {/* Custom Symbol Dropdown */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 font-mono">Or select any custom symbol to lock:</span>
          <select
            value={focusSymbol}
            onChange={(e) => handleSetFocus(e.target.value)}
            className="bg-[#12192b] border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">-- Monitor All Active Watchlist --</option>
            {DEFAULT_SYMBOLS.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} ({s.display_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. ALERT THRESHOLD & SENSITIVITY (WIN RATE) */}
      <div className="terminal-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white font-sans uppercase">
              กำหนดเกณฑ์วินเรทขั้นต่ำในการแจ้งเตือน (WIN RATE FILTER)
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 px-2.5 py-1 rounded-full border border-emerald-800/80">
            แจ้งเตือนเมื่อวินเรท &ge; {(minAlertProbability * 100).toFixed(0)}%
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-300 font-sans">
              ระดับอัตราการชนะ (Win Rate) ขั้นต่ำที่ยอมรับให้ส่งเข้า Telegram:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {(minAlertProbability * 100).toFixed(0)}%
              </span>
              <span className="text-xs text-slate-400 font-sans">ขึ้นไป</span>
            </div>
          </div>

          {/* Range Slider */}
          <input
            type="range"
            min="0.60"
            max="0.90"
            step="0.01"
            value={minAlertProbability}
            onChange={(e) => {
              const val = Number(e.target.value);
              setMinAlertProbability(val);
              handleSaveSettings({ min_alert_probability: val });
            }}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { val: 0.70, label: '70% (ค่าแนะนำมาตรฐาน)' },
              { val: 0.75, label: '75% (คัดกรองแม่นยำสูง)' },
              { val: 0.80, label: '80% (ความมั่นใจระดับสถาบัน)' },
              { val: 0.85, label: '85% (Extreme Conviction)' },
            ].map((preset) => (
              <button
                key={preset.val}
                onClick={() => {
                  setMinAlertProbability(preset.val);
                  handleSaveSettings({ min_alert_probability: preset.val });
                }}
                className={`py-2 px-2.5 rounded-lg border text-xs font-mono transition-all text-center ${
                  Math.abs(minAlertProbability - preset.val) < 0.005
                    ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow-md shadow-emerald-600/30'
                    : 'bg-[#0b101c] border-white/[0.08] text-slate-300 hover:border-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 thai-text">
            💡 <b>คำแนะนำ:</b> หากตั้งไว้ที่ <b>70% ขึ้นไป</b> ระบบจะกรองและส่งแจ้งเตือน Telegram เฉพาะจังหวะเทรดที่มีความได้เปรียบทางสถิติสูงเท่านั้น สัญญาณที่วินเรทต่ำกว่าเกณฑ์จะไม่ถูกส่งมารบกวน
          </p>
        </div>
      </div>

      {/* 3. Telegram Bot Status & Test */}
      <div className="terminal-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase">
              TELEGRAM ALERT BOT
            </h2>
          </div>
          <span className="text-xs text-emerald-400 font-mono">Connected & Active</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Alerts will be delivered directly to your Telegram chat. You can test the connection with your mobile phone right now:
        </p>

        {telegramStatus && (
          <div
            className={`p-3 rounded-md text-xs font-mono border ${
              telegramStatus.success
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-rose-800'
            }`}
          >
            {telegramStatus.text}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTestTelegram}
            disabled={testingTelegram}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors disabled:opacity-50"
          >
            {testingTelegram ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{testingTelegram ? 'Sending Test...' : 'Send Test Alert to Telegram'}</span>
          </button>
        </div>
      </div>

      {/* 4. Active Watchlist Symbols Toggles */}
      <div className="terminal-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white font-mono uppercase">
              ACTIVE WATCHLIST SYMBOLS ({activeSymbols.length}/{DEFAULT_SYMBOLS.length} ENABLED)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Click to Enable/Disable</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs font-mono">
          {DEFAULT_SYMBOLS.map((sym) => {
            const isActive = activeSymbols.includes(sym.ticker);
            const isLocked = focusSymbol === sym.ticker;

            return (
              <button
                key={sym.ticker}
                onClick={() => handleToggleSymbol(sym.ticker)}
                className={`p-2.5 rounded border flex items-center justify-between transition-colors text-left ${
                  isLocked
                    ? 'bg-blue-950/80 border-blue-500 text-white'
                    : isActive
                    ? 'bg-[#0b101c] border-[#1a2336] text-white hover:border-slate-600'
                    : 'bg-slate-900/30 border-slate-800/40 text-slate-500 line-through'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <span>{sym.ticker}</span>
                    {isLocked && <Lock className="w-3 h-3 text-blue-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400">{sym.category}</div>
                </div>

                <div
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isActive ? <Check className="w-3 h-3" /> : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
