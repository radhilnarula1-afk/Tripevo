'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import LocationPicker from './LocationPicker';
import GuestSelector, { GuestCounts } from './GuestSelector';
import AdvancedDateRangePicker, { DateRange } from './AdvancedDateRangePicker';

interface SearchBarProps {
  onSearch?: (destination: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [activeTab, setActiveTab] = useState<'location' | 'dates' | 'guests' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [destination, setDestination] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [guests, setGuests] = useState<GuestCounts>({ adults: 0, children: 0, infants: 0, pets: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveTab(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalGuests = guests.adults + guests.children;
  const guestLabel = totalGuests > 0 ? `${totalGuests} guest${totalGuests > 1 ? 's' : ''}${guests.pets > 0 ? ', pets' : ''}` : 'Add guests';

  const formatDates = () => {
    if (!dateRange.start) return 'Add dates';
    const startStr = dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!dateRange.end) return startStr;
    const endStr = dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const handleSearch = () => {
    console.log('Searching...', { destination, dateRange, guests });
    if (onSearch) {
      onSearch(destination);
    }
    setActiveTab(null);
  };

  return (
    <div className="relative w-full max-w-[850px] mx-auto z-50" ref={containerRef}>
      <div style={{ backgroundColor: 'var(--search-bg)' }} className={`flex items-center backdrop-blur-xl border border-[var(--border)] rounded-full h-[66px] shadow-lg transition-all ${activeTab ? 'border-[#E87C5A]' : ''}`}>
        
        {/* WHERE */}
        <div 
          onClick={() => setActiveTab('location')}
          style={activeTab === 'location' ? { backgroundColor: 'var(--card-hover)' } : {}}
          className={`flex-1 flex flex-col justify-center pl-8 pr-4 h-full rounded-full transition-all text-left cursor-text ${activeTab === 'location' ? 'shadow-md' : 'hover:bg-[var(--card-bg)]'}`}
        >
          <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-primary)]">Where</span>
          <input
            id="main-destination-input"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search destinations"
            className="text-[14px] truncate mt-0.5 bg-transparent border-none outline-none focus:ring-0 p-0 text-[var(--text-primary)] placeholder-[var(--text-muted)] font-medium w-full"
          />
        </div>

        <div className="w-[1px] h-8 bg-[var(--border)]"></div>

        {/* WHEN */}
        <button 
          onClick={() => setActiveTab('dates')}
          style={activeTab === 'dates' ? { backgroundColor: 'var(--card-hover)' } : {}}
          className={`flex-1 flex flex-col justify-center px-6 h-full rounded-full transition-all text-left ${activeTab === 'dates' ? 'shadow-md' : 'hover:bg-[var(--card-bg)]'}`}
        >
          <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-primary)]">When</span>
          <span className={`text-[14px] truncate mt-0.5 ${dateRange.start ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
            {formatDates()}
          </span>
        </button>

        <div className="w-[1px] h-8 bg-[var(--border)]"></div>

        {/* WHO */}
        <div 
          onClick={() => setActiveTab('guests')}
          style={activeTab === 'guests' ? { backgroundColor: 'var(--card-hover)' } : {}}
          className={`flex-[1.2] flex items-center justify-between pl-6 pr-2 h-full rounded-full transition-all cursor-pointer ${activeTab === 'guests' ? 'shadow-md' : 'hover:bg-[var(--card-bg)]'}`}
        >
          <div className="flex flex-col justify-center text-left">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-primary)]">Who</span>
            <span className={`text-[14px] truncate mt-0.5 ${totalGuests > 0 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
              {guestLabel}
            </span>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); handleSearch(); }}
            className="h-12 px-6 ml-2 bg-gradient-to-br from-[#E87C5A] to-[#d4693e] text-white rounded-full flex items-center gap-2 font-medium text-[15px] shadow-[0_4px_14px_rgba(232,124,90,0.4)] hover:scale-105 transition-all"
          >
            <Search size={18} strokeWidth={2.5} />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* POPOVERS */}
      {activeTab === 'location' && (
        <LocationPicker 
          destination={destination} 
          onSelect={(loc) => { setDestination(loc); setActiveTab('dates'); }} 
        />
      )}

      {activeTab === 'dates' && (
        <AdvancedDateRangePicker 
          dateRange={dateRange}
          onChange={(range) => {
            setDateRange(range);
            if (range.start && range.end) setActiveTab('guests');
          }}
        />
      )}

      {activeTab === 'guests' && (
        <GuestSelector 
          guests={guests}
          onChange={setGuests}
        />
      )}
    </div>
  );
}
