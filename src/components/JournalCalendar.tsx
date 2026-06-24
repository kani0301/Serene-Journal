/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, BookOpen, Clock, Tag } from 'lucide-react';
import { JournalEntry, MoodType } from '../types';
import { moodMap } from './Dashboard';

interface JournalCalendarProps {
  entries: JournalEntry[];
  onEditEntry: (id: string) => void;
  onCreateEntryWithDate: (date: string) => void;
}

export default function JournalCalendar({ entries, onEditEntry, onCreateEntryWithDate }: JournalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // helper list for monthly dates
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 6 is Saturday

  const prevMonthDays = getDaysInMonth(year, month - 1);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Map entries date format YYYY-MM-DD
  const getEntryForDay = (day: number) => {
    const paddedMonth = String(month + 1).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    const targetDateStr = `${year}-${paddedMonth}-${paddedDay}`;
    return entries.find(e => e.date === targetDateStr && !e.draft);
  };

  const daysArray = [];

  // Prefix days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({
      dayNumber: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`
    });
  }

  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const paddedMonth = String(month + 1).padStart(2, '0');
    const paddedDay = String(i).padStart(2, '0');
    daysArray.push({
      dayNumber: i,
      isCurrentMonth: true,
      dateStr: `${year}-${paddedMonth}-${paddedDay}`
    });
  }

  // Fill calendar cell grid multiples of 7
  const totalCells = Math.ceil(daysArray.length / 7) * 7;
  const nextMonthFill = totalCells - daysArray.length;
  for (let i = 1; i <= nextMonthFill; i++) {
    daysArray.push({
      dayNumber: i,
      isCurrentMonth: false,
      dateStr: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-8 pb-16">
      {/* Upper header controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600 animate-pulse" />
            Mood Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Map energy conditions across calender grids. Click any day to read notes or open a draft.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2.5 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-lg font-serif font-bold text-slate-800 min-w-[140px] text-center select-none">
            {monthsList[month]} {year}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-2.5 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-slate-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar visual tiles (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle">
          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center font-sans font-bold text-xs text-slate-400 uppercase tracking-widest pb-4 border-b border-slate-100">
            {weekdays.map(d => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Grid list cells */}
          <div className="grid grid-cols-7 gap-2 pt-4">
            {daysArray.map((cell, idx) => {
              const matchesEntry = cell.isCurrentMonth ? getEntryForDay(cell.dayNumber) : null;
              const moodDetails = matchesEntry ? moodMap[matchesEntry.mood] : null;
              const isToday = cell.dateStr === new Date().toISOString().substring(0, 10);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (matchesEntry) {
                      onEditEntry(matchesEntry.id);
                    } else if (cell.isCurrentMonth) {
                      onCreateEntryWithDate(cell.dateStr);
                    }
                  }}
                  className={`min-h-[75px] md:min-h-[85px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    cell.isCurrentMonth 
                      ? 'bg-white border-slate-100 hover:border-purple-300 hover:shadow-subtle' 
                      : 'bg-slate-50/50 border-transparent text-slate-350 pointer-events-none'
                  } ${isToday ? 'ring-2 ring-[#8B5CF6]/50 border-purple-500' : ''}`}
                >
                  <div className="flex justify-between items-center select-none">
                    <span className={`text-xs font-semibold ${cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-350'}`}>
                      {cell.dayNumber}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" title="Today"></span>
                    )}
                  </div>

                  {/* Icon emoji represent block */}
                  {matchesEntry && moodDetails ? (
                    <div className="flex flex-col items-center justify-center py-1 bg-purple-50/50 rounded-xl border border-purple-100/40 relative group-hover:scale-105 transition-transform">
                      <span className="text-xl md:text-2xl leading-none select-none">{moodDetails.icon}</span>
                      <span className="hidden md:block text-[9px] font-bold uppercase tracking-wider text-purple-700 mt-0.5 max-w-[50px] truncate leading-none">
                        {moodDetails.label}
                      </span>
                    </div>
                  ) : cell.isCurrentMonth ? (
                    <div className="opacity-0 group-hover:opacity-100 flex justify-center py-1 transition-opacity">
                      <span className="text-xs text-purple-400 font-sans font-medium">+ Write</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Highlights list */}
        <div className="space-y-4">
          <div className="px-2">
            <h2 className="text-xl font-serif font-bold text-slate-900">Month Summary</h2>
            <p className="text-xs text-slate-500">Reflective indexes for this cycle</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
            {entries.filter(e => {
              const parts = e.date.split('-');
              return parts[0] === String(year) && parts[1] === String(month + 1).padStart(2, '0') && !e.draft;
            }).length === 0 ? (
              <div className="text-center py-10 font-sans italic text-slate-400 text-sm">
                No active reflections logged under {monthsList[month]}.
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {entries
                  .filter(e => {
                    const parts = e.date.split('-');
                    return parts[0] === String(year) && parts[1] === String(month + 1).padStart(2, '0') && !e.draft;
                  })
                  .map(entry => {
                    const moodDetail = moodMap[entry.mood];
                    return (
                      <div
                        key={entry.id}
                        onClick={() => onEditEntry(entry.id)}
                        className="p-3 bg-slate-50/60 hover:bg-purple-50/35 border border-transparent hover:border-purple-200/40 rounded-xl transition-all cursor-pointer flex items-start gap-2.5"
                      >
                        <span className="text-xl">{moodDetail?.icon}</span>
                        <div className="text-xs font-sans min-w-0">
                          <p className="font-bold text-slate-800 line-clamp-1">{entry.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{entry.date}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
