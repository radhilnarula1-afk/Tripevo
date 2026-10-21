'use client';
import React, { useState, useEffect, useRef } from 'react';

interface DateRangePickerProps {
  onChange: (range: { start: string; end: string }) => void;
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (!startDate || (startDate && endDate)) {
      setStartDate(selectedDate);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (selectedDate < startDate) {
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
        onChange({ 
          start: startDate.toISOString(), 
          end: selectedDate.toISOString() 
        });
        setIsOpen(false);
      }
    }
  };

  const formatDateRange = () => {
    if (!startDate) return "Select dates";
    if (!endDate) return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ...`;
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className={`date-picker-wrap ${className}`} ref={containerRef}>
      <input 
        type="text" 
        readOnly 
        value={formatDateRange()} 
        onClick={() => setIsOpen(!isOpen)}
        placeholder="Add dates"
      />

      {isOpen && (
        <div className="calendar-modal">
          <div className="cal-header">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>&lt;</button>
            <span>{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>&gt;</button>
          </div>
          <div className="cal-grid">
            {Array.from({ length: 31 }).map((_, i) => (
              <div 
                key={i} 
                className={`cal-day ${startDate?.getDate() === i + 1 ? 'active' : ''}`}
                onClick={() => handleDateClick(i + 1)}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .date-picker-wrap { position: relative; }
        input { background: transparent; border: none; color: var(--text-primary); outline: none; width: 100%; cursor: pointer; }
        .calendar-modal {
          position: absolute; top: 120%; left: 0; background: var(--search-bg); border: 1px solid var(--border);
          padding: 20px; border-radius: 20px; z-index: 1000; width: 280px; box-shadow: 0 20px 40px var(--shadow-card);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        }
        .cal-header { display: flex; justify-content: space-between; margin-bottom: 15px; font-weight: 600; color: var(--text-primary); }
        .cal-header button { background: none; border: none; color: var(--text-primary); cursor: pointer; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; color: var(--text-secondary); }
        .cal-day { 
          aspect-ratio: 1; display: flex; align-items: center; justify-content: center; 
          cursor: pointer; border-radius: 8px; font-size: 13px;
        }
        .cal-day:hover { background: var(--tag-bg); color: var(--text-primary); }
        .cal-day.active { background: #E87C5A; color: white !important; font-weight: 700; }
      `}</style>
    </div>
  );
};

export default DateRangePicker;
