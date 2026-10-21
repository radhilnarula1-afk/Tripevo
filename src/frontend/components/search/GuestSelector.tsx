import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

interface GuestSelectorProps {
  guests: GuestCounts;
  onChange: (guests: GuestCounts) => void;
}

export default function GuestSelector({ guests, onChange }: GuestSelectorProps) {
  const updateCount = (type: keyof GuestCounts, delta: number) => {
    const newValue = guests[type] + delta;
    if (newValue < 0) return;
    
    // Logic: if adding children/infants/pets and adults is 0, add 1 adult
    let newAdults = guests.adults;
    if (delta > 0 && type !== 'adults' && guests.adults === 0) {
      newAdults = 1;
    }
    // Logic: cannot have 0 adults if there are children/infants/pets
    if (type === 'adults' && newValue === 0 && (guests.children > 0 || guests.infants > 0 || guests.pets > 0)) {
      return;
    }

    onChange({
      ...guests,
      adults: type === 'adults' ? newValue : newAdults,
      [type]: newValue
    });
  };

  const rows = [
    { type: 'adults', label: 'Adults', sub: 'Ages 13 or above' },
    { type: 'children', label: 'Children', sub: 'Ages 2–12' },
    { type: 'infants', label: 'Infants', sub: 'Under 2' },
    { type: 'pets', label: 'Pets', sub: 'Bringing a service animal?' },
  ] as const;

  return (
    <div className="absolute top-[120%] right-0 w-[350px] bg-[var(--bg-glass)] backdrop-blur-2xl border border-[var(--border)] rounded-[32px] p-6 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col gap-6">
        {rows.map((row, idx) => {
          const count = guests[row.type];
          return (
            <div key={row.type} className={`flex items-center justify-between ${idx !== rows.length - 1 ? 'border-b border-[var(--border)] pb-6' : ''}`}>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px] text-[var(--text-primary)]">{row.label}</span>
                <span className="text-[13px] text-[var(--text-muted)] mt-1">{row.sub}</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => updateCount(row.type, -1)}
                  disabled={count === 0 || (row.type === 'adults' && count === 1 && (guests.children > 0 || guests.infants > 0 || guests.pets > 0))}
                  className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Minus size={16} />
                </button>
                <span className="w-4 text-center font-medium text-[var(--text-primary)]">{count}</span>
                <button
                  type="button"
                  onClick={() => updateCount(row.type, 1)}
                  className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
