import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface AdvancedDateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

export default function AdvancedDateRangePicker({ dateRange, onChange }: AdvancedDateRangePickerProps) {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const addMonths = (date: Date, num: number) => {
    const newDate = new Date(date);
    newDate.setMonth(date.getMonth() + num);
    return newDate;
  };

  const nextMonthDate = useMemo(() => addMonths(currentMonthDate, 1), [currentMonthDate]);

  const generateDays = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const handleDateClick = (date: Date) => {
    if (!dateRange.start || (dateRange.start && dateRange.end)) {
      onChange({ start: date, end: null });
    } else if (date < dateRange.start) {
      onChange({ start: date, end: dateRange.start });
    } else {
      onChange({ start: dateRange.start, end: date });
    }
  };

  const isSelected = (date: Date) => {
    if (!date) return false;
    const isStart = dateRange.start && date.getTime() === dateRange.start.getTime();
    const isEnd = dateRange.end && date.getTime() === dateRange.end.getTime();
    return isStart || isEnd;
  };

  const isBetween = (date: Date) => {
    if (!date || !dateRange.start || !dateRange.end) return false;
    return date > dateRange.start && date < dateRange.end;
  };

  const renderMonth = (date: Date) => {
    const days = generateDays(date.getFullYear(), date.getMonth());
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
      <div className="flex-1 w-full min-w-[300px]">
        <div className="text-center font-medium text-[15px] mb-6 text-[var(--text-primary)]">{monthName}</div>
        <div className="grid grid-cols-7 gap-y-2 text-center mb-2">
          {weekDays.map((d, i) => (
            <div key={i} className="text-[12px] font-medium text-[var(--text-muted)] w-10 h-10 flex items-center justify-center mx-auto">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
          {days.map((day, i) => {
            if (!day) return <div key={i} className="w-10 h-10 mx-auto" />;
            const selected = isSelected(day);
            const between = isBetween(day);
            const isStart = dateRange.start && day.getTime() === dateRange.start.getTime();
            const isEnd = dateRange.end && day.getTime() === dateRange.end.getTime();

            return (
              <div 
                key={i} 
                className={`relative w-10 h-10 mx-auto flex items-center justify-center cursor-pointer text-[14px] font-medium transition-all
                  ${between ? 'bg-[rgba(232,124,90,0.15)]' : ''}
                  ${isStart && dateRange.end ? 'bg-gradient-to-r from-transparent to-[rgba(232,124,90,0.15)] rounded-l-full' : ''}
                  ${isEnd ? 'bg-gradient-to-l from-transparent to-[rgba(232,124,90,0.15)] rounded-r-full' : ''}
                `}
                onClick={() => handleDateClick(day)}
              >
                <div className={`w-10 h-10 flex items-center justify-center rounded-full hover:border hover:border-[var(--text-primary)] ${selected ? 'bg-[#E87C5A] text-white shadow-[0_4px_12px_rgba(232,124,90,0.4)]' : 'text-[var(--text-primary)] hover:bg-[var(--card-hover)]'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute top-[120%] left-1/2 -translate-x-1/2 w-[800px] bg-[var(--bg-glass)] backdrop-blur-2xl border border-[var(--border)] rounded-[32px] p-8 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between absolute top-8 left-8 right-8 z-10 pointer-events-none">
        <button 
          onClick={() => setCurrentMonthDate(addMonths(currentMonthDate, -1))}
          className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] pointer-events-auto transition-all bg-[var(--bg-alt)]"
        >
          <ChevronLeft size={18} />
        </button>
        <button 
          onClick={() => setCurrentMonthDate(addMonths(currentMonthDate, 1))}
          className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] pointer-events-auto transition-all bg-[var(--bg-alt)]"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      
      <div className="flex gap-12 mt-2">
        {renderMonth(currentMonthDate)}
        {renderMonth(nextMonthDate)}
      </div>
    </div>
  );
}
