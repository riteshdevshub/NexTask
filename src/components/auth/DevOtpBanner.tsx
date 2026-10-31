import React, { useState } from 'react';
import { KeyRound, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface DevOtpBannerProps {
  onSelectCode?: (code: string, email?: string) => void;
}

export function DevOtpBanner({ onSelectCode }: DevOtpBannerProps) {
  const { activeDevOtps, refreshDevOtps } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  if (activeDevOtps.length === 0) return null;

  const handleCopy = (code: string, email?: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (onSelectCode) onSelectCode(code, email);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="w-full bg-indigo-950/90 text-indigo-100 border-b border-indigo-500/30 px-4 py-2 backdrop-blur-sm z-30 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-semibold text-white">Dev OTP Inspector:</span>
          <span className="text-indigo-200">
            Active verification codes ({activeDevOtps.length})
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-indigo-300 hover:text-white p-0.5 ml-1 transition-colors"
            title="Toggle OTP list"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isExpanded && (
          <div className="flex flex-wrap items-center gap-3">
            {activeDevOtps.slice(0, 3).map((otp) => {
              const remainingSec = Math.max(0, Math.round((otp.expiresAt - Date.now()) / 1000));
              return (
                <div
                  key={`${otp.email}_${otp.code}`}
                  className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded border border-indigo-500/40 text-slate-200"
                >
                  <span className="text-[11px] text-slate-400 max-w-[120px] truncate">{otp.email}:</span>
                  <span className="font-mono font-bold tracking-widest text-indigo-300 text-xs">{otp.code}</span>
                  <span className="text-[10px] text-slate-400 font-mono tabular-nums">{remainingSec}s</span>
                  <button
                    onClick={() => handleCopy(otp.code, otp.email)}
                    className="p-1 hover:text-white text-indigo-300 transition-colors flex items-center gap-1"
                    title="Copy & Auto-fill code"
                  >
                    {copiedCode === otp.code ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span className="text-[10px] underline">Fill</span>
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => refreshDevOtps()}
              className="text-indigo-300 hover:text-white text-[11px] underline ml-1"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
