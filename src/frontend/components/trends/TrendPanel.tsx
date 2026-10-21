'use client';

import React from 'react';
import { TrendingUp, Flame, MessageSquare, PlusCircle } from 'lucide-react';

interface TrendItem {
  title: string;
  url: string;
}

interface TrendPanelProps {
  trends: {
    google_trend_score?: number;
    tavily_highlights?: (string | TrendItem)[];
    trending_now?: (string | TrendItem)[];
  } | null;
  destination: string;
}

export default function TrendPanel({ trends, destination }: TrendPanelProps) {
  if (!trends) return null;

  const score = trends.google_trend_score || 0;
  const isHot = score > 70;

  return (
    <div className="bg-[var(--bg-alt)] border border-[var(--border)] rounded-2xl p-5 mb-6 shadow-sm overflow-hidden relative">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
          <TrendingUp size={18} />
        </div>
        <div>
          <h3 className="font-bold text-[var(--text-primary)] text-[15px]">Live Social Intelligence</h3>
          <p className="text-[11px] text-[var(--text-muted)]">Real-time data for {destination}</p>
        </div>
      </div>

      {/* Google Trends Momentum */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
            <Flame size={14} className={isHot ? 'text-orange-500 animate-pulse' : 'text-gray-400'} />
            Search Momentum
          </div>
          <div className="text-[14px] font-bold text-[var(--text-primary)]">
            {score}/100
          </div>
        </div>
        <div className="h-2 w-full bg-[var(--bg-page)] rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${isHot ? 'bg-gradient-to-r from-orange-400 to-rose-500' : 'bg-blue-500'}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Tavily Web Search Highlights */}
      {trends.tavily_highlights && trends.tavily_highlights.length > 0 && (
        <div>
          <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1">
            <MessageSquare size={14} />
            Live Web Intel
          </div>
          <div className="flex flex-col gap-3">
            {trends.tavily_highlights.map((highlight, idx) => {
              const isObject = typeof highlight === 'object' && highlight !== null;
              const title = isObject ? (highlight as any).title : highlight;
              const url = isObject ? (highlight as any).url : null;

              return (
                <a
                  key={idx}
                  href={url || `https://www.google.com/search?q=${encodeURIComponent(title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', display: 'block' }}
                  className="bg-[var(--bg-page)] border border-[var(--border)] rounded-xl p-3 relative group transition-all duration-200 hover:border-[#E87C5A]/40 hover:shadow-sm cursor-pointer"
                >
                  <p className="text-[12px] text-[var(--text-primary)] leading-relaxed pr-8 group-hover:text-[#E87C5A] transition-colors">
                    "{title}"
                  </p>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
