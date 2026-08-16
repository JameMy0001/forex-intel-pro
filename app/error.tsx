'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Boundary Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
      <div className="w-16 h-16 bg-rose-500/10 flex items-center justify-center rounded-full mb-6 border border-rose-500/20">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">ระบบพบข้อผิดพลาดบางอย่าง</h2>
      <p className="text-slate-400 mb-8 max-w-md text-sm leading-relaxed thai-text">
        ขออภัยในความไม่สะดวก เกิดข้อผิดพลาดทางเทคนิคขึ้นในระบบวิเคราะห์ข้อมูล 
        โปรดลองรีเฟรชหน้าเว็บอีกครั้ง หรือติดต่อผู้ดูแลระบบหากปัญหายังคงอยู่
      </p>
      
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-900/20"
        >
          <RefreshCw className="w-4 h-4" />
          <span>ลองใหม่อีกครั้ง</span>
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#1a2333] hover:bg-[#222d42] text-slate-300 font-semibold transition-all border border-slate-700/50"
        >
          กลับสู่หน้าหลัก
        </button>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-black/40 rounded-lg text-left overflow-auto max-w-2xl w-full border border-rose-900/30">
          <p className="text-rose-400 font-mono text-xs font-bold mb-2">Developer Detail:</p>
          <pre className="text-slate-400 font-mono text-[10px] whitespace-pre-wrap break-words">
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </div>
      )}
    </div>
  );
}
