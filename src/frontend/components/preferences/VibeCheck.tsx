'use client';
import React, { useState, useEffect } from 'react';
import ContentParser from '../ContentParser';
import BudgetSlider from './BudgetSlider';

// ─── SVG Icon Map ───────────────────────────────────────────────
const ICONS: Record<string, React.ReactNode> = {
  compass: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  ),
  mountain: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
    </svg>
  ),
  utensils: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
    </svg>
  ),
  leaf: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
  ),
  moon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  camera: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>
    </svg>
  ),
  temple: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20M4 20V10l8-8 8 8v10M10 20v-5h4v5"/>
    </svg>
  ),
  waves: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    </svg>
  ),
  zap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  heart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  coffee: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  'shopping-bag': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  music: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  boat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 20 9.5 20c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 2v3"/>
    </svg>
  ),
  tent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>
    </svg>
  ),
  binoculars: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 10c0-2.21-1.79-4-4-4S2 7.79 2 10v2c0 2.21 1.79 4 4 4s4-1.79 4-4v-2ZM22 10c0-2.21-1.79-4-4-4s-4 1.79-4 4v2c0 2.21 1.79 4 4 4s4-1.79 4-4v-2Z"/><path d="M10 12h4"/><path d="M6 16v2"/><path d="M18 16v2"/>
    </svg>
  ),
  flame: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  ),
  feather: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>
    </svg>
  ),
  gem: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 18 3 22 9 12 22 2 9"/><path d="M11 3 8 9l4 13 4-13-3-6"/><line x1="2" y1="9" x2="22" y2="9"/>
    </svg>
  ),
};

// Plus icon for unselected state
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// Check icon for selected state
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Types ───────────────────────────────────────────────────────
export interface DestinationVibe {
  id: string;
  icon: string;
  label: string;
  tags: string[];
  activityBias: string;
  category: string;
}

interface VibeCheckProps {
  destination: string;
  onComplete: (selectedIds: string[], mergedTags: string[], budget: string, activityBiases: string[]) => void;
  onSkip: () => void;
  onIdeasExtracted?: (ideas: string[]) => void;
}

const CATEGORY_ORDER = ['Nature', 'Culture', 'Food', 'Wellness', 'Adventure', 'Nightlife', 'Leisure', 'Family', 'Spiritual'];

export function VibeCheck({ destination, onComplete, onSkip, onIdeasExtracted }: VibeCheckProps) {
  const [vibes, setVibes] = useState<DestinationVibe[]>([]);
  const [destinationSummary, setDestinationSummary] = useState('');
  const [loadingVibes, setLoadingVibes] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [budget, setBudget] = useState('Premium Luxury');
  const [budgetAmount, setBudgetAmount] = useState<number>(5000);
  const [budgetRec, setBudgetRec] = useState<any>(null);
  const [showBudget, setShowBudget] = useState(false);

  const handleBudgetChange = (amount: number, tierLabel: string) => {
    setBudgetAmount(amount);
    setBudget(tierLabel);
  };

  // Fetch destination-specific vibes from AI
  useEffect(() => {
    if (!destination) return;
    setLoadingVibes(true);
    setSelectedIds([]);
    setShowBudget(false);

    fetch('/api/destination-vibes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination })
    })
      .then(r => r.json())
      .then(data => {
        if (data.vibes) {
          setVibes(data.vibes);
          setDestinationSummary(data.destination_summary || '');
          if (data.budget_recommendation) {
            setBudgetRec(data.budget_recommendation);
            const recVal = data.budget_recommendation.recommended_daily;
            setBudgetAmount(recVal);
            const ranges = data.budget_recommendation.tier_ranges;
            if (recVal <= ranges.budget[1]) {
              setBudget('Backpacker');
            } else if (recVal <= ranges.comfort[1]) {
              setBudget('Balanced');
            } else {
              setBudget('Premium Luxury');
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingVibes(false));
  }, [destination]);

  const toggleVibe = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleProceed = () => {
    if (selectedIds.length === 0) return;
    const selected = vibes.filter(v => selectedIds.includes(v.id));
    const allTags = Array.from(new Set(selected.flatMap(v => v.tags)));
    const activityBiases = selected.map(v => v.activityBias);
    onComplete(selectedIds, allTags, budget, activityBiases);
  };

  // Group vibes by category for display
  const groupedVibes = CATEGORY_ORDER.reduce<Record<string, DestinationVibe[]>>((acc, cat) => {
    const items = vibes.filter(v => v.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '60px 24px 80px',
      background: 'var(--bg-page)',
    }}>
      {/* Header */}
      <div style={{ maxWidth: '700px', width: '100%', textAlign: 'center', marginBottom: '40px' }}>
        <span style={{
          display: 'inline-block',
          background: 'rgba(232,124,90,0.12)',
          color: '#E87C5A',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          padding: '5px 14px',
          borderRadius: '30px',
          marginBottom: '16px'
        }}>
          Personalise Your Trip
        </span>

        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(26px, 5vw, 38px)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.15,
          marginBottom: '12px'
        }}>
          What do you want to do in <em style={{ color: '#E87C5A', fontStyle: 'italic' }}>{destination}</em>?
        </h2>

        {destinationSummary && !loadingVibes && (
          <p style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            maxWidth: '520px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            {destinationSummary}
          </p>
        )}

        {selectedIds.length > 0 && (
          <div style={{
            marginTop: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(232,124,90,0.10)',
            border: '1px solid rgba(232,124,90,0.25)',
            borderRadius: '30px',
            padding: '6px 14px',
            fontSize: '12px',
            color: '#E87C5A',
            fontWeight: 600
          }}>
            <CheckIcon />
            {selectedIds.length} experience{selectedIds.length !== 1 ? 's' : ''} selected — pick as many as you like
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loadingVibes && (
        <div style={{ maxWidth: '800px', width: '100%' }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
            color: 'var(--text-muted)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E87C5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Analysing {destination}...
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{
                height: '44px',
                width: `${120 + (i % 3) * 20}px`,
                borderRadius: '100px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Vibe Pills grouped by category */}
      {!loadingVibes && vibes.length > 0 && (
        <div style={{ maxWidth: '860px', width: '100%' }}>
          {Object.entries(groupedVibes).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '28px' }}>
              {/* Category label */}
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '12px',
                paddingLeft: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '1px',
                  background: 'var(--border)'
                }} />
                {category}
              </div>

              {/* Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {items.map(vibe => {
                  const isSelected = selectedIds.includes(vibe.id);
                  return (
                    <button
                      key={vibe.id}
                      onClick={() => toggleVibe(vibe.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '10px 18px',
                        borderRadius: '100px',
                        border: `1.5px solid ${isSelected ? '#E87C5A' : 'var(--border)'}`,
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(232,124,90,0.18) 0%, rgba(212,168,83,0.14) 100%)'
                          : 'var(--bg-glass)',
                        color: isSelected ? '#E87C5A' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 500,
                        letterSpacing: '0.01em',
                        backdropFilter: 'blur(8px)',
                        transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                        boxShadow: isSelected
                          ? '0 0 0 1px rgba(232,124,90,0.3), 0 4px 16px rgba(232,124,90,0.15)'
                          : 'none',
                        outline: 'none',
                      }}
                    >
                      {/* Icon */}
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: isSelected ? '#E87C5A' : 'var(--text-muted)',
                        flexShrink: 0
                      }}>
                        {ICONS[vibe.icon] || ICONS['compass']}
                      </span>

                      {/* Label */}
                      <span>{vibe.label}</span>

                      {/* + / check indicator */}
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: isSelected ? '#E87C5A' : 'var(--border)',
                        color: isSelected ? '#fff' : 'var(--text-muted)',
                        flexShrink: 0,
                        marginLeft: '2px',
                        transition: 'all 0.18s ease',
                      }}>
                        {isSelected ? <CheckIcon /> : <PlusIcon />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Budget selector — shown when at least 1 vibe selected */}
          {selectedIds.length > 0 && (
            <BudgetSlider 
              destination={destination}
              recommendation={budgetRec}
              value={budgetAmount}
              onChange={handleBudgetChange}
            />
          )}

          {/* AI Content Parser Integration */}
          <div style={{ marginTop: '32px', width: '100%' }}>
            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              Have something already in mind?
            </h3>
            <p style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              If you have a travel blog post, Instagram reel, or a list of places you want to visit, paste it below. We will extract them and save them as custom ideas!
            </p>
            <ContentParser onParseComplete={onIdeasExtracted} />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '40px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={onSkip}
          style={{
            padding: '12px 28px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            outline: 'none',
          }}
        >
          Skip to custom planner
        </button>

        {selectedIds.length > 0 && (
          <button
            onClick={() => setSelectedIds([])}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              outline: 'none',
            }}
          >
            Clear all
          </button>
        )}

        <button
          onClick={handleProceed}
          disabled={selectedIds.length === 0}
          style={{
            padding: '13px 32px',
            borderRadius: '12px',
            border: 'none',
            background: selectedIds.length > 0
              ? 'linear-gradient(135deg, #E87C5A 0%, #D4A853 100%)'
              : 'var(--bg-card)',
            color: selectedIds.length > 0 ? '#fff' : 'var(--text-muted)',
            fontSize: '14px',
            fontWeight: 700,
            cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.22s ease',
            opacity: selectedIds.length > 0 ? 1 : 0.5,
            transform: selectedIds.length > 0 ? 'scale(1.02)' : 'scale(1)',
            boxShadow: selectedIds.length > 0
              ? '0 8px 24px rgba(232,124,90,0.35)'
              : 'none',
            outline: 'none',
          }}
        >
          {selectedIds.length > 0
            ? `Build My ${destination} Itinerary →`
            : 'Select at least one experience'}
        </button>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </section>
  );
}
