'use client';
import React from 'react';
import SearchBar from './search/SearchBar';

interface HeroSectionProps {
  onSearch?: (destination: string) => void;
}

export default function HeroSection({ onSearch }: HeroSectionProps) {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center bg-transparent">
      {/* Animated Background Orbs & Grid */}
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />
      <div className="orb orb4" />
      <div className="hero-grid" />
      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center mt-20">
        <div className="inline-flex items-center gap-2 bg-[var(--bg-glass)] border border-[var(--border)] backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.15em] text-[#D4A853] uppercase mb-8 shadow-2xl">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse"></span>
          AI-Powered Intelligence
        </div>

        <h1 className="font-['Playfair_Display'] text-5xl md:text-7xl lg:text-[84px] leading-[1.05] font-bold text-[var(--text-primary)] mb-6 drop-shadow-2xl">
          <span className="text-[#E87C5A]">Redefine</span> how you <br />
          <em className="text-[#E87C5A] italic pr-2">experience</em> the world.
        </h1>

        <p className="text-[17px] md:text-[19px] text-[var(--text-secondary)] max-w-2xl mx-auto font-light leading-relaxed mb-12 drop-shadow-md">
          Create your personalized itinerary with your side quests and your personalization.
        </p>

        {/* Modular Search Bar (Airbnb style) */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
          <SearchBar onSearch={onSearch} />
        </div>
      </div>
    </section>
  );
}
