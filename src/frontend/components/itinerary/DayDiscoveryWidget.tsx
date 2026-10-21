'use client';
import React, { useState } from 'react';
import {
  buildBookingURL,
  buildGoibiboURL,
  buildGetYourGuideURL,
  buildZomatoURL,
  buildGoogleMapsURL,
  estimateHotelNightlyRate,
  inferTravelerType
} from '@/backend/utils/affiliates';

interface DayItinerary {
  day: number;
  title: string;
  desc: string;
  activities: string[];
  weather_emoji?: string;
  day_budget_est?: string;
}

interface DayDiscoveryWidgetProps {
  activeDayIdx: number;
  dayData: DayItinerary;
  destination: string;
  dateRange: { start: string; end: string };
  travelers: string;
  budgetLevel: string;
  onAffiliateClick: (partnerName: string, type: string, url: string) => void;
}

type TabType = 'hotels' | 'experiences' | 'cafes';

export default function DayDiscoveryWidget({
  activeDayIdx,
  dayData,
  destination,
  dateRange,
  travelers,
  budgetLevel,
  onAffiliateClick
}: DayDiscoveryWidgetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('hotels');

  if (!dayData) return null;

  const profile = inferTravelerType(travelers);
  const checkIn = dateRange?.start || new Date().toISOString().split('T')[0];
  const checkOut = dateRange?.end || new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  const bookingUrl = buildBookingURL(destination, checkIn, checkOut, profile);
  const goibiboUrl = buildGoibiboURL(destination, checkIn, checkOut, profile.adults, profile.children);
  const nightlyRate = estimateHotelNightlyRate(budgetLevel);

  return (
    <div className="w-full bg-white/5 dark:bg-[#1C1A2E]/80 backdrop-blur-md border border-[var(--border)] rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E87C5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Day {dayData.day ?? (activeDayIdx + 1)} Discovery Suggestions
        </h3>
      </div>

      {/* Tabs list */}
      <div className="flex bg-[var(--bg-alt)] p-1 rounded-xl gap-1 mb-4 border border-[var(--border)]">
        <button
          onClick={() => setActiveTab('hotels')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'hotels'
              ? 'bg-[#E87C5A] text-white shadow-md'
              : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Hotels
        </button>
        <button
          onClick={() => setActiveTab('experiences')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'experiences'
              ? 'bg-[#E87C5A] text-white shadow-md'
              : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Experiences
        </button>
        <button
          onClick={() => setActiveTab('cafes')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'cafes'
              ? 'bg-[#E87C5A] text-white shadow-md'
              : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Cafes
        </button>
      </div>

      {/* Tab content */}
      <div className="min-h-[160px]">
        {activeTab === 'hotels' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-3 hover:border-blue-500 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">Booking.com Special</span>
                <span className="text-[11px] font-bold text-[#D4A853]">~₹{nightlyRate.toLocaleString('en-IN')}/night</span>
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1 leading-snug">Luxury properties matched for {profile.travelerType}</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mb-3 leading-normal">
                Curated romantic and upscale hotels in {destination} tailored to your {budgetLevel} profile.
              </p>
              <button
                onClick={() => onAffiliateClick('Booking.com', 'hotel', bookingUrl)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border-none cursor-pointer"
              >
                Book on Booking.com
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-3 hover:border-[#E87C5A]/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#E87C5A] bg-[#E87C5A]/10 px-2 py-0.5 rounded">Goibibo Direct</span>
                <span className="text-[11px] font-bold text-[var(--text-muted)]">CPA Tracked</span>
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1 leading-snug">Local premium hotels for {destination}</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mb-3 leading-normal">
                Direct booking link with VCommission tracking for local luxury resorts and stays.
              </p>
              <button
                onClick={() => onAffiliateClick('Goibibo', 'hotel', goibiboUrl)}
                className="w-full py-2 bg-transparent hover:bg-[#E87C5A]/10 text-[#E87C5A] border border-[#E87C5A]/40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                View on Goibibo
              </button>
            </div>
          </div>
        )}

        {activeTab === 'experiences' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-200">
            {dayData.activities.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-8">No activities scheduled for this day.</p>
            ) : (
              dayData.activities.map((act, idx) => {
                const gygUrl = buildGetYourGuideURL(act, destination);
                return (
                  <div key={idx} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-[#E87C5A]">Activity {idx + 1}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">GetYourGuide Verified</span>
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">{act}</h4>
                    <button
                      onClick={() => onAffiliateClick('GetYourGuide', 'experience', gygUrl)}
                      className="mt-1 self-start py-1.5 px-3 bg-[#E87C5A]/10 hover:bg-[#E87C5A]/25 text-[#E87C5A] rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1"
                    >
                      Book Ticket
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'cafes' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-200">
            {dayData.activities.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-8">Explore cafes around the city center.</p>
            ) : (
              dayData.activities.slice(0, 2).map((act, idx) => {
                const zomatoUrl = buildZomatoURL(destination);
                const mapsUrl = buildGoogleMapsURL('cafes', act + ' ' + destination);
                return (
                  <div key={idx} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-[#E84D1E]">Near Activity {idx + 1}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{act.substring(0, 24)}...</span>
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">Culinary & Coffee Gems</h4>
                    <p className="text-[10px] text-[var(--text-muted)] leading-normal">
                      Discover local dining spots and cozy cafes near this location.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAffiliateClick('Zomato', 'food', zomatoUrl)}
                        className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1"
                      >
                        Zomato Reviews
                      </button>
                      <button
                        onClick={() => window.open(mapsUrl, '_blank')}
                        className="flex-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1"
                      >
                        Google Maps
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border)] text-[9px] text-[var(--text-muted)] text-center leading-normal">
        * TripEvo earns commissions on verified bookings at no additional cost to you.
      </div>
    </div>
  );
}
