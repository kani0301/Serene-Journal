/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Search, Calendar, Heart, SlidersHorizontal, Tag, EyeOff, Lock, Eye, CheckCircle 
} from 'lucide-react';
import { JournalEntry, MoodType } from '../types';
import { moodMap, categoryMap } from './Dashboard';

interface ArchiveViewProps {
  entries: JournalEntry[];
  onEditEntry: (id: string) => void;
  onRefreshEntries: () => void;
  token: string;
}

export default function ArchiveView({ entries, onEditEntry, onRefreshEntries, token }: ArchiveViewProps) {
  const [search, setSearch] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isFavoriteOnly, setIsFavoriteOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Local filtered list
  const [filtered, setFiltered] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Password-lock disclosure variables
  const [unlockedPasswords, setUnlockedPasswords] = useState<Record<string, boolean>>({});

  const fetchFilteredEntries = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (selectedMood) queryParams.append('mood', selectedMood);
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (isFavoriteOnly) queryParams.append('isFavorite', 'true');
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await fetch(`/api/entries?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiltered(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredEntries();
  }, [search, selectedMood, selectedCategory, isFavoriteOnly, startDate, endDate, entries, token]);

  const uniqueCategories = [
    'Daily Reflection', 'Personal', 'Gratitude', 'Goals',
    'Memories', 'Study', 'Travel', 'Work', 'Creative Writing'
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Search and Filters Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">Vault Archive Search</h1>
          <p className="text-xs text-slate-500 mt-1">
            Leverage multi-criteria queries to easily retrieve previous reflections, draft logs, or key memories.
          </p>
        </div>

        {/* Input selectors */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Keyword Text */}
          <div className="relative flex items-center md:col-span-2 border border-slate-200 rounded-xl px-3 bg-slate-50/20">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              id="archive-search-keyword"
              type="text"
              placeholder="Search by keywords or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-2 block w-full py-2.5 text-sm bg-transparent border-none text-slate-805 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Categories select */}
          <select
            id="archive-category-query"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none text-slate-700 font-sans cursor-pointer"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Mood Selector list */}
          <select
            id="archive-mood-query"
            value={selectedMood}
            onChange={(e) => setSelectedMood(e.target.value as MoodType || '')}
            className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none text-slate-700 font-sans cursor-pointer"
          >
            <option value="">All Moods</option>
            {Object.entries(moodMap).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>

        {/* Date Ranges & Favorite Toggles row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs font-sans text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Start:</span>
              <input
                id="archive-startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span>End:</span>
              <input
                id="archive-endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {(startDate || endDate || selectedCategory || selectedMood || search || isFavoriteOnly) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedMood('');
                  setSelectedCategory('');
                  setIsFavoriteOnly(false);
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-purple-600 font-semibold hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>

          <button
            id="archive-favorite-toggle"
            onClick={() => setIsFavoriteOnly(!isFavoriteOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
              isFavoriteOnly 
                ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm' 
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavoriteOnly ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
            Favorites Only
          </button>
        </div>
      </div>

      {/* Grid records area */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-r-2 border-purple-500"></div>
          <p className="mt-2 text-slate-500 font-serif">Cataloging documents...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-100 shadow-subtle max-w-md mx-auto space-y-3">
          <SlidersHorizontal className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-lg font-serif font-bold text-slate-800">No matching reflections</h3>
          <p className="text-xs text-slate-500 font-sans max-w-xs mx-auto text-center">
            Adjust your keyword filters or choose another calendar interval to find archived notes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(entry => {
            const moodStyle = moodMap[entry.mood];
            const catStyle = categoryMap[entry.category] || { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' };
            const isEntryPasscodeLocked = entry.isLocked && !unlockedPasswords[entry.id];

            return (
              <div
                key={entry.id}
                onClick={() => {
                  if (!isEntryPasscodeLocked) {
                    onEditEntry(entry.id);
                  }
                }}
                className={`group relative bg-white p-6 rounded-3xl border border-slate-100 hover:border-purple-200 hover:shadow-subtle transition-all duration-150 flex flex-col justify-between ${
                  isEntryPasscodeLocked ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                {entry.isFavorite && (
                  <div className="absolute top-4 right-4 text-rose-500 fill-rose-500">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-sans mb-3 select-none">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{entry.date}</span>
                    {entry.draft && (
                      <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Draft
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-serif font-bold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-1">
                    {entry.title}
                  </h3>

                  {isEntryPasscodeLocked ? (
                    <div className="mt-3 p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50 flex flex-col items-center justify-center space-y-2 py-6">
                      <Lock className="w-6 h-6 text-rose-500" />
                      <p className="text-xs text-slate-500 font-sans font-semibold">Locked Reflection Page</p>
                      {entry.passwordHint && (
                        <p className="text-[10px] text-slate-400 italic">Hint: "{entry.passwordHint}"</p>
                      )}
                      
                      {/* Unlock input box */}
                      <div className="flex gap-1 pt-2 w-full max-w-[200px]">
                        <input
                          id={`unlock-entry-pass-${entry.id}`}
                          type="password"
                          placeholder="Passcode..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const inputEl = document.getElementById(`unlock-entry-pass-${entry.id}`) as HTMLInputElement;
                              if (inputEl.value) {
                                // For entries we bypass immediately since this mock client storage, 
                                // but we validate if they submit anything. In production we'd encrypt or compare with user lock PIN.
                                setUnlockedPasswords(p => ({ ...p, [entry.id]: true }));
                              }
                            }
                          }}
                          className="w-full text-center py-1 bg-white text-xs rounded-lg border border-slate-200 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            setUnlockedPasswords(p => ({ ...p, [entry.id]: true }));
                          }}
                          className="px-2 py-1 bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer pointer-events-auto"
                        >
                          Unlock
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-sans text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {entry.text || <span className="italic text-slate-400">Blank page. Click to write.</span>}
                    </p>
                  )}
                </div>

                {/* Footer specs */}
                <div className="mt-4 flex flex-wrap gap-2 items-center text-xs pt-3 border-t border-slate-100">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold font-sans ${moodStyle?.bg} ${moodStyle?.text} select-none`}>
                    <span>{moodStyle?.icon}</span>
                    <span>{moodStyle?.label}</span>
                  </span>

                  <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold font-sans border ${catStyle.bg} ${catStyle.text} ${catStyle.border} select-none`}>
                    {entry.category}
                  </span>

                  {entry.tags && entry.tags.map(tg => (
                    <span key={tg} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs bg-slate-50 text-slate-500 border border-slate-100 font-sans select-none">
                      <Tag className="w-3 h-3 text-slate-400" />
                      {tg}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
