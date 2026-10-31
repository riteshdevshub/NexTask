import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showWordmark = true, className = '' }: LogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base font-bold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-bold',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Geometric productivity mark */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <defs>
            <linearGradient id="nxtGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id="nxtAccent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Base rounded square */}
          <rect width="36" height="36" rx="9" fill="#0F172A" className="dark:fill-[#1E293B]" />

          {/* Geometric layered workflows */}
          {/* Top layer (Notion / document foundation) */}
          <path
            d="M9 11.5C9 10.67 9.67 10 10.5 10H25.5C26.33 10 27 10.67 27 11.5C27 12.33 26.33 13 25.5 13H10.5C9.67 13 9 12.33 9 11.5Z"
            fill="url(#nxtGradient)"
          />
          {/* Middle layer (Todoist / active execution stream) */}
          <path
            d="M9 18C9 17.17 9.67 16.5 10.5 16.5H21C21.83 16.5 22.5 17.17 22.5 18C22.5 18.83 21.83 19.5 21 19.5H10.5C9.67 19.5 9 18.83 9 18Z"
            fill="url(#nxtGradient)"
            fillOpacity="0.8"
          />
          {/* Bottom layer (Drive / storage anchor) */}
          <path
            d="M9 24.5C9 23.67 9.67 23 10.5 23H16.5C17.33 23 18 23.67 18 24.5C18 25.33 17.33 26 16.5 26H10.5C9.67 26 9 25.33 9 24.5Z"
            fill="url(#nxtGradient)"
            fillOpacity="0.6"
          />

          {/* Focus completion anchor (Emerald precision dot) */}
          <circle cx="26" cy="23.5" r="3" fill="url(#nxtAccent)" />
        </svg>
      </div>

      {showWordmark && (
        <span className={`${textSizes[size]} tracking-tight font-display text-slate-900 dark:text-white`}>
          Nex<span className="text-indigo-600 dark:text-indigo-400">Task</span>
        </span>
      )}
    </div>
  );
}
