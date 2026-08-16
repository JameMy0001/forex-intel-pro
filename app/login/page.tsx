'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่านเพื่อเข้าใช้งาน');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, rememberMe }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(redirectPath);
        router.refresh();
      } else {
        setErrorMsg(data.error || 'รหัสผ่านไม่ถูกต้อง');
        triggerShake();
      }
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div
        className={`w-full max-w-md bg-[#0e131f]/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-7 sm:p-9 shadow-2xl shadow-blue-950/40 relative overflow-hidden transition-transform duration-200 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Top Glow Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-600/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 right-0 w-48 h-32 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-7 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 shadow-lg shadow-blue-600/30 mb-3.5">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            NEXUS <span className="text-emerald-400 font-mono text-xs px-2 py-0.5 bg-emerald-950/80 border border-emerald-700/60 rounded">PRO 2.0</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            เข้าสู่ระบบเพื่อเข้าถึงแดชบอร์ดและสัญญาณเทรด
          </p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-2 bg-[#141b2d]/90 border border-blue-500/20 rounded-xl px-3.5 py-2.5 mb-6 text-xs text-slate-300">
          <KeyRound className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>ระบบรักษาความปลอดภัย 24/7 (Restricted Terminal)</span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
              Master Passcode (รหัสผ่านเข้าเว็บ)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านของคุณ..."
                className="w-full bg-[#080b11]/90 border border-white/[0.12] rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-[#080b11] border-white/[0.2] text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>จดจำการเข้าสู่ระบบ 30 วัน</span>
            </label>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5 text-xs text-rose-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 px-4 text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all transform active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                กำลังตรวจสอบสิทธิ์...
              </span>
            ) : (
              <>
                <span>ปลดล็อกเข้าสู่ระบบ</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] text-center text-[11px] text-slate-400">
          <p>Nexus Intel Pro • Institutional Quantitative Intelligence</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
