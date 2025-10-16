// components/CalendarView.tsx
// Month calendar view with day selection and month navigation.
// LOC: ~180

"use client";

import { useMemo, useState } from "react";

interface CalendarViewProps {
  selectedDate: string; // ISO format YYYY-MM-DD
  onSelectDate: (dateISO: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseISOToDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map((chunk) => Number(chunk));
  return new Date(y, (m || 1) - 1, d || 1);
};

export default function CalendarView({ selectedDate, onSelectDate, onClose }: CalendarViewProps) {
  const [viewDate, setViewDate] = useState<Date>(() => parseISOToDate(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean; iso: string }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date: d, isCurrentMonth: false, iso: toISODate(d) });
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      days.push({ date: d, isCurrentMonth: true, iso: toISODate(d) });
    }

    // Next month padding to fill grid (6 weeks max)
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      days.push({ date: d, isCurrentMonth: false, iso: toISODate(d) });
    }

    return days;
  }, [year, month]);

  const goToPrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setViewDate(today);
    onSelectDate(toISODate(today));
  };

  const handleDayClick = (iso: string) => {
    onSelectDate(iso);
    onClose();
  };

  const todayISO = toISODate(new Date());

  return (
    <div className="w-full max-w-md mx-auto bg-[var(--surface-1)] rounded-lg border border-[var(--border)] shadow-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--fg)]">
          {MONTHS[month]} {year}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]/80 hover:bg-[var(--surface-2)]/80 flex items-center justify-center"
          aria-label="Close calendar"
        >
          ✕
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="h-8 px-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]/80 text-sm"
          aria-label="Previous month"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={goToToday}
          className="h-8 px-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]/80 text-sm font-medium"
        >
          Today
        </button>
        <button
          type="button"
          onClick={goToNextMonth}
          className="h-8 px-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]/80 text-sm"
          aria-label="Next month"
        >
          Next →
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-[var(--fg)]/60 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const isSelected = day.iso === selectedDate;
          const isToday = day.iso === todayISO;
          const dayNum = day.date.getDate();

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(day.iso)}
              className={`
                h-10 rounded-md text-sm transition
                ${day.isCurrentMonth 
                  ? "text-[var(--fg)] hover:bg-[var(--surface-2)]" 
                  : "text-[var(--fg)]/30 hover:bg-[var(--surface-2)]/50"
                }
                ${isSelected 
                  ? "bg-blue-600/20 border border-blue-500/60 font-semibold" 
                  : "border border-transparent"
                }
                ${isToday && !isSelected 
                  ? "border-emerald-500/60 font-semibold" 
                  : ""
                }
              `}
              aria-label={`Select ${day.iso}`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[var(--fg)]/60">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded border border-emerald-500/60" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-blue-600/20 border border-blue-500/60" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
