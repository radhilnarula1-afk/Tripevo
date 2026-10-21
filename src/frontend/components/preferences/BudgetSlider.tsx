'use client';
import React, { useState, useEffect } from 'react';

interface BudgetSliderProps {
  destination: string;
  recommendation: {
    currency: string;
    recommended_daily: number;
    min_daily: number;
    max_daily: number;
    tier_ranges: {
      budget: [number, number];
      comfort: [number, number];
      luxury: [number, number];
    };
  } | null;
  value: number;
  onChange: (value: number, tierLabel: string) => void;
}

export default function BudgetSlider({ destination, recommendation, value, onChange }: BudgetSliderProps) {
  // If recommendation is loading or null, use default values
  const defaultRec = {
    currency: 'INR',
    recommended_daily: 5000,
    min_daily: 1500,
    max_daily: 18000,
    tier_ranges: {
      budget: [1500, 3500] as [number, number],
      comfort: [3500, 9000] as [number, number],
      luxury: [9000, 18000] as [number, number]
    }
  };

  const rec = recommendation || defaultRec;
  const { min_daily, max_daily, recommended_daily, tier_ranges } = rec;

  const formatCurrency = (val: number) => {
    return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val)}`;
  };

  // Determine current active tier based on the current value
  const getActiveTier = (val: number): 'budget' | 'comfort' | 'luxury' => {
    if (val <= tier_ranges.budget[1]) return 'budget';
    if (val <= tier_ranges.comfort[1]) return 'comfort';
    return 'luxury';
  };

  const activeTier = getActiveTier(value);

  // Convert internal tier key to external tier label for backward compatibility
  const getTierLabel = (tier: 'budget' | 'comfort' | 'luxury'): string => {
    if (tier === 'budget') return 'Backpacker';
    if (tier === 'comfort') return 'Balanced';
    return 'Premium Luxury';
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const tier = getActiveTier(val);
    onChange(val, getTierLabel(tier));
  };

  // Snap to the midpoint of the selected tier's range
  const handleTierClick = (tier: 'budget' | 'comfort' | 'luxury') => {
    const range = tier_ranges[tier];
    const midpoint = Math.round((range[0] + range[1]) / 2);
    onChange(midpoint, getTierLabel(tier));
  };

  // Calculate percentage positions for the slider elements
  const getPct = (val: number) => {
    const pct = ((val - min_daily) / (max_daily - min_daily)) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const aiRecommendedPct = getPct(recommended_daily);
  const currentPct = getPct(value);

  return (
    <div style={{
      marginTop: '12px',
      padding: '24px',
      borderRadius: '20px',
      border: '1px solid var(--border)',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      animation: 'fadeInUp 0.35s ease',
      color: 'var(--text-primary)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '0.01em',
            margin: 0
          }}>
            Set your daily budget for {destination || 'your trip'}
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Drag to customize, or select a tier below to snap.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#E87C5A' }}>
            {formatCurrency(value)}
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}> / day</span>
          </div>
        </div>
      </div>

      {/* Slider Track Container */}
      <div style={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        {/* Customized Track Background with Color Gradient */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '6px',
          borderRadius: '3px',
          background: `linear-gradient(to right, 
            #10B981 0%, 
            #10B981 ${getPct(tier_ranges.budget[1])}%, 
            #F59E0B ${getPct(tier_ranges.budget[1])}%, 
            #F59E0B ${getPct(tier_ranges.comfort[1])}%, 
            #E87C5A ${getPct(tier_ranges.comfort[1])}%, 
            #E87C5A 100%)`,
          opacity: 0.85
        }} />

        {/* Selected filled portion */}
        <div style={{
          position: 'absolute',
          left: 0,
          width: `${currentPct}%`,
          height: '6px',
          borderRadius: '3px 0 0 3px',
          background: 'rgba(255, 255, 255, 0.15)',
          pointerEvents: 'none'
        }} />

        {/* AI Recommended Marker Indicator */}
        <div style={{
          position: 'absolute',
          left: `${aiRecommendedPct}%`,
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
          top: '-4px',
          zIndex: 10
        }}>
          {/* Small downward triangle indicator */}
          <div style={{
            width: '0',
            height: '0',
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '6px solid #FFD700',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          {/* Small line through track */}
          <div style={{
            width: '2px',
            height: '14px',
            background: '#FFD700',
            marginTop: '2px'
          }} />
          {/* Small Recommended Label */}
          <div style={{
            position: 'absolute',
            top: '-22px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 215, 0, 0.4)',
            color: '#FFD700',
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            letterSpacing: '0.05em'
          }}>
            AI RECOMMENDED: {formatCurrency(recommended_daily)}
          </div>
        </div>

        {/* HTML5 Range Input overlay */}
        <input
          type="range"
          min={min_daily}
          max={max_daily}
          value={value}
          onChange={handleSliderChange}
          style={{
            width: '100%',
            background: 'transparent',
            WebkitAppearance: 'none',
            appearance: 'none',
            cursor: 'pointer',
            height: '100%',
            position: 'relative',
            zIndex: 20,
            outline: 'none'
          }}
          className="budget-range-slider"
        />
      </div>

      {/* Min/Max value indicators */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '-16px', marginBottom: '24px' }}>
        <span>Min: {formatCurrency(min_daily)}</span>
        <span>Max: {formatCurrency(max_daily)}</span>
      </div>

      {/* Clickable Snaps for Budget, Comfort, and Luxury */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Budget snap button */}
        <button
          onClick={() => handleTierClick('budget')}
          style={{
            flex: '1',
            padding: '12px 14px',
            borderRadius: '12px',
            border: `1.5px solid ${activeTier === 'budget' ? '#10B981' : 'var(--border)'}`,
            background: activeTier === 'budget' ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
            color: activeTier === 'budget' ? '#10B981' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Budget</span>
          <span style={{ fontSize: '10px', opacity: 0.8 }}>
            {formatCurrency(tier_ranges.budget[0])}–{formatCurrency(tier_ranges.budget[1])}
          </span>
        </button>

        {/* Comfort/Balanced snap button */}
        <button
          onClick={() => handleTierClick('comfort')}
          style={{
            flex: '1',
            padding: '12px 14px',
            borderRadius: '12px',
            border: `1.5px solid ${activeTier === 'comfort' ? '#F59E0B' : 'var(--border)'}`,
            background: activeTier === 'comfort' ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
            color: activeTier === 'comfort' ? '#F59E0B' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Comfort</span>
          <span style={{ fontSize: '10px', opacity: 0.8 }}>
            {formatCurrency(tier_ranges.comfort[0])}–{formatCurrency(tier_ranges.comfort[1])}
          </span>
        </button>

        {/* Luxury snap button */}
        <button
          onClick={() => handleTierClick('luxury')}
          style={{
            flex: '1',
            padding: '12px 14px',
            borderRadius: '12px',
            border: `1.5px solid ${activeTier === 'luxury' ? '#E87C5A' : 'var(--border)'}`,
            background: activeTier === 'luxury' ? 'rgba(232, 124, 90, 0.08)' : 'transparent',
            color: activeTier === 'luxury' ? '#E87C5A' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Luxury</span>
          <span style={{ fontSize: '10px', opacity: 0.8 }}>
            {formatCurrency(tier_ranges.luxury[0])}–{formatCurrency(tier_ranges.luxury[1])}
          </span>
        </button>
      </div>

      {/* Styled Range Input slider styles block */}
      <style jsx global>{`
        /* Webkit slider thumb styling override */
        .budget-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #E87C5A;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          transition: transform 0.1s ease, border-color 0.1s ease;
          position: relative;
          z-index: 30;
        }

        .budget-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }

        .budget-range-slider::-webkit-slider-thumb:active {
          transform: scale(0.95);
          background: #E87C5A;
          border-color: #ffffff;
        }

        /* Firefox slider thumb styling override */
        .budget-range-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #E87C5A;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          transition: transform 0.1s ease;
          position: relative;
          z-index: 30;
        }

        .budget-range-slider::-moz-range-thumb:hover {
          transform: scale(1.15);
        }
      `}</style>
    </div>
  );
}
