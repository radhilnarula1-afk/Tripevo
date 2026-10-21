'use client';

import React, { useState } from 'react';
import { Globe, FileText, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function VisaRequirementWidget({ destination }: { destination: string }) {
  const [nationality, setNationality] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visaData, setVisaData] = useState<{ status: string; description: string; link: string } | null>(null);

  // Extract country from destination string (e.g. "Bali, Indonesia" -> "Indonesia")
  const destParts = destination.split(',');
  const destCountry = destParts.length > 1 ? destParts[destParts.length - 1].trim() : destination;

  const handleCheck = async () => {
    if (!nationality.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/visa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationality, destination: destCountry }),
      });
      if (response.ok) {
        const data = await response.json();
        setVisaData(data);
      } else {
        console.error('Failed to fetch visa data');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[var(--bg-alt)] border border-[var(--border)] rounded-2xl p-5 mb-6 shadow-sm overflow-hidden relative">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
          <Globe size={18} />
        </div>
        <h3 className="font-bold text-[var(--text-primary)] text-[15px]">VISA & Document Requirements</h3>
      </div>

      {!visaData ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-[13px] text-[var(--text-muted)] mb-3 leading-relaxed">
            Before checking the VISA requirements for <strong className="text-[var(--text-primary)]">{destCountry}</strong>, please confirm your nationality.
          </p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g., United States" 
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              className="flex-1 bg-[var(--bg-page)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[#E87C5A] transition-colors"
            />
            <button 
              onClick={handleCheck}
              disabled={!nationality.trim() || isLoading}
              className="bg-[#E87C5A] text-white px-4 py-2 rounded-lg text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d4693e] transition-colors min-w-[70px]"
            >
              {isLoading ? '...' : 'Check'}
            </button>
          </div>
        </div>
      ) : visaData ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-[13px] font-bold text-[var(--text-primary)] mb-1">
                  {visaData.status} → {destCountry}
                </div>
                <div className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                  {visaData.description}
                </div>
                {visaData.link && (
                  <a href={visaData.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#E87C5A] font-bold mt-2 hover:underline">
                    Official Gov Portal <ChevronRight size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)]">
            <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Required Documents</div>
            
            {/* Document Slabs Illustration */}
            <div className="flex flex-col gap-2 relative">
              <div className="flex items-center gap-3 bg-[var(--bg-page)] border border-[var(--border)] rounded-lg p-3 z-20 shadow-sm transition-transform hover:-translate-y-1">
                <FileText size={16} className="text-blue-500" />
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-[var(--text-primary)]">Passport</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Valid for 6+ months</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[var(--bg-page)] border border-[var(--border)] rounded-lg p-3 z-10 shadow-sm transition-transform hover:-translate-y-1 -mt-1 scale-[0.98]">
                <FileText size={16} className="text-emerald-500" />
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-[var(--text-primary)]">Standard (Adhar / IAN)</div>
                  <div className="text-[11px] text-[var(--text-muted)]">National ID Proof</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
