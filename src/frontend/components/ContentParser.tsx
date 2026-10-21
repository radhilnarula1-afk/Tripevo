'use client';
import React, { useState } from 'react';

interface ContentParserProps {
  onParseComplete?: (places: string[]) => void;
}

export default function ContentParser({ onParseComplete }: ContentParserProps) {
  const [url, setUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<null | { title: string, places: string[] }>(null);
  const [isAdded, setIsAdded] = useState(false);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsParsing(true);
    setIsAdded(false);
    setResult(null);
    
    try {
      const res = await fetch('/api/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        throw new Error('Failed to parse URL');
      }

      const data = await res.json();
      setResult({
        title: data.title || 'Extracted Places',
        places: data.places || []
      });
    } catch (err) {
      console.error('Extraction failed:', err);
      setResult({
        title: 'Simulated Places (Scraper Offline)',
        places: ['Ubud Sacred Monkey Forest', 'Tegalalang Rice Terrace', 'Campuhan Ridge Walk']
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddPlaces = () => {
    if (!result) return;
    if (onParseComplete) {
      onParseComplete(result.places);
    }
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 3000);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-12 bg-white/5 dark:bg-[#1C1A2E]/80 backdrop-blur-md border border-[var(--border)] rounded-2xl p-6 shadow-xl relative overflow-hidden">
      
      {/* Decorative gradient orb */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#E87C5A]/20 blur-3xl rounded-full pointer-events-none" />

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight">AI Content Parser</h3>
          <p className="text-xs text-[var(--text-secondary)]">Paste an Instagram Reel or Blog link to instantly extract an itinerary.</p>
        </div>
      </div>

      <form onSubmit={handleParse} className="relative flex items-center">
        <div className="absolute left-4 text-[#949BA4]">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </div>
        <input 
          type="url" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://instagram.com/reel/..."
          required
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-xl py-4 pl-12 pr-32 outline-none focus:border-[#E87C5A] transition-colors shadow-inner"
        />
        <button 
          type="submit"
          disabled={isParsing}
          className="absolute right-2 top-2 bottom-2 bg-[#E87C5A] hover:bg-[#d4693e] text-white px-6 rounded-lg font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isParsing ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          )}
          {isParsing ? 'Extracting...' : 'Extract'}
        </button>
      </form>

      {/* Results Dropdown */}
      {result && (
        <div className="mt-6 pt-6 border-t border-[var(--border)] animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider text-[#E87C5A]">Extracted Places</h4>
            <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] px-2 py-1 rounded">{result.title}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.places.map((place, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2 rounded-lg text-sm text-[var(--text-primary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E87C5A]" />
                {place}
              </div>
            ))}
          </div>
          <button 
            onClick={handleAddPlaces}
            className={`mt-4 w-full py-3 border rounded-xl text-sm font-bold transition-all cursor-pointer ${
              isAdded 
                ? 'border-green-500 bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                : 'border-[#E87C5A] text-[#E87C5A] hover:bg-[#E87C5A]/10'
            }`}
          >
            {isAdded ? 'Added to Saved Ideas! ✓' : 'Add these to my Itinerary'}
          </button>
        </div>
      )}
    </div>
  );
}
