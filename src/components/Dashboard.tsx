/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Heart, Calendar, Clock, ArrowRight, Lightbulb, 
  Smile, Flame, Award, Tag, Sparkles, AlertCircle, Quote as QuoteIcon 
} from 'lucide-react';
import { JournalEntry, Quote, MoodType } from '../types';

interface DashboardProps {
  entries: JournalEntry[];
  onCreateEntry: (mood?: MoodType) => void;
  onEditEntry: (id: string) => void;
  user: { name: string };
  themeStyles: any;
}

// Mood Configuration mapper
export const moodMap: Record<MoodType, { icon: string; label: string; color: string; bg: string; text: string }> = {
  excited: { icon: '🤩', label: 'Excited', color: '#8B5CF6', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  happy: { icon: '😊', label: 'Happy', color: '#FDBA74', bg: 'bg-orange-50', text: 'text-orange-700' },
  peaceful: { icon: '😌', label: 'Peaceful', color: '#86EFAC', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  tired: { icon: '🥱', label: 'Tired', color: '#7DD3FC', bg: 'bg-sky-50', text: 'text-sky-700' },
  sad: { icon: '😢', label: 'Sad', color: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-700' },
  stressed: { icon: '😰', label: 'Stressed', color: '#FB7185', bg: 'bg-rose-50', text: 'text-rose-700' },
};

// Category styling mapper
export const categoryMap: Record<string, { bg: string; text: string; border: string }> = {
  'Personal': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  'Daily Reflection': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  'Gratitude': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
  'Goals': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Memories': { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
  'Study': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  'Travel': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  'Work': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'Creative Writing': { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
};

export default function Dashboard({ entries, onCreateEntry, onEditEntry, user, themeStyles }: DashboardProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [streak, setStreak] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Fetch calming quote
  const fetchQuote = async () => {
    setQuoteLoading(true);
    try {
      const res = await fetch('/api/quotes');
      if (res.ok) {
        const data = await res.json();
        setQuote(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, []);

  // Calculate Streak dynamically based on entries list
  useEffect(() => {
    if (entries.length === 0) {
      setStreak(0);
      return;
    }

    // Filter non-draft entries, normalize unique dates
    const uniqueDates = Array.from(
      new Set(
        entries
          .filter((e) => !e.draft)
          .map((e) => e.date)
      )
    ).sort((a, b) => b.localeCompare(a)); // Newest first

    if (uniqueDates.length === 0) {
      setStreak(0);
      return;
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().substring(0, 10);

    const newestDate = uniqueDates[0];
    if (newestDate !== todayStr && newestDate !== yesterdayStr) {
      setStreak(0);
      return;
    }

    let continuousStreak = 1;
    let currentRefDate = new Date(newestDate);

    for (let i = 1; i < uniqueDates.length; i++) {
      const nextDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(currentRefDate.getTime() - nextDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        continuousStreak++;
        currentRefDate = nextDate;
      } else if (diffDays === 0) {
        // Same day, skipped
        continue;
      } else {
        break;
      }
    }

    setStreak(continuousStreak);
  }, [entries]);

  // Statistics
  const nonDrafts = entries.filter((e) => !e.draft);
  const totalEntries = entries.length;
  const recentEntries = entries.slice(0, 3);

  // Frequent mood
  const getFrequentMood = () => {
    if (nonDrafts.length === 0) return 'None';
    const counts: Record<string, number> = {};
    nonDrafts.forEach((e) => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as MoodType;
  };

  const favoriteCount = entries.filter((e) => e.isFavorite).length;
  const draftCount = entries.filter((e) => e.draft).length;
  const freqMood = getFrequentMood();

  return (
    <div className="space-y-8 pb-16">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-subtle border border-slate-100">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 font-sans">Welcome Back</span>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mt-1">
            Hello, {user.name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            How are your thoughts flowing today? Capture a moment of pause inside your sanctuary.
          </p>
        </div>
        <button
          id="dash-new-entry-btn"
          onClick={() => onCreateEntry()}
          className="cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-medium shadow-md font-sans transition-all duration-150 transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Write Today's Log
        </button>
      </div>

      {/* Bento Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-sans text-slate-500 font-medium">Writing Streak</span>
            <div className="p-2.5 bg-orange-50 rounded-xl">
              <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900 font-mono">{streak}</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              {streak > 0 ? `${streak} consecutive active days!` : 'Write today to start a streak!'}
            </p>
          </div>
        </div>

        {/* Total stats card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-sans text-slate-500 font-medium">Total Entries</span>
            <div className="p-2.5 bg-purple-50 rounded-xl">
              <BookOpen className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900 font-mono">{totalEntries}</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              {draftCount > 0 ? `${draftCount} drafts currently saved` : 'Every thought is archived safely'}
            </p>
          </div>
        </div>

        {/* Frequent Mood */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-sans text-slate-500 font-medium">Frequent Mood</span>
            <div className="p-2.5 bg-pink-50 rounded-xl">
              <Smile className="w-5 h-5 text-pink-500" />
            </div>
          </div>
          <div className="mt-4">
            {freqMood !== 'None' ? (
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold font-sans text-slate-900 leading-none">
                  {moodMap[freqMood as MoodType]?.icon}
                </span>
                <span className="text-lg font-serif font-semibold text-slate-800">
                  {moodMap[freqMood as MoodType]?.label}
                </span>
              </div>
            ) : (
              <h3 className="text-xl font-serif text-slate-400 mt-1">No Entries yet</h3>
            )}
            <p className="text-xs text-slate-400 mt-1 font-sans">Your primary emotional reflection</p>
          </div>
        </div>

        {/* Saved Favorites */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-sans text-slate-500 font-medium">Favorites</span>
            <div className="p-2.5 bg-[#FFF1F2] rounded-xl">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900 font-mono">{favoriteCount}</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">Highly-valued personal milestones</p>
          </div>
        </div>
      </div>

      {/* Daily Quote banner */}
      {quote && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#FFFDF8] via-white to-orange-50/20 p-6 md:p-8 rounded-3xl border border-orange-100/30 shadow-subtle">
          <div className="absolute right-4 top-4 opacity-10">
            <QuoteIcon className="w-24 h-24 text-orange-400" />
          </div>
          <div className="flex items-start gap-4 flex-col sm:flex-row">
            <div className="hidden sm:flex p-3 bg-orange-100/60 rounded-2xl text-orange-600 justify-center items-center shrink-0">
              <Lightbulb className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-2">
              <p className="text-slate-700 italic font-serif text-base leading-relaxed">
                "{quote.text}"
              </p>
              <p className="text-slate-500 text-xs font-sans font-medium">— {quote.author}</p>
            </div>
          </div>
          <button
            onClick={fetchQuote}
            className="absolute bottom-4 right-4 text-xs text-[#8B5CF6] hover:underline font-medium cursor-pointer"
            disabled={quoteLoading}
          >
            {quoteLoading ? 'Refreshing...' : 'Next Quote'}
          </button>
        </div>
      )}

      {/* Launch by Mood selection bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900">How is your spirit right now?</h2>
          <p className="text-xs text-slate-500">Pick an energy state to instantly prep your custom layout entry.</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-2">
          {Object.entries(moodMap).map(([key, value]) => (
            <button
              key={key}
              onClick={() => onCreateEntry(key as MoodType)}
              className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-purple-50/60 hover:ring-2 hover:ring-[#8B5CF6]/30 border border-transparent rounded-2xl transition-all cursor-pointer group"
            >
              <span className="text-3xl group-hover:scale-115 transition-transform">{value.icon}</span>
              <span className="text-xs font-semibold text-slate-600 mt-2 font-sans">{value.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout Divided Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Recent Entries (2 columns span) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xl font-serif font-bold text-slate-900">Recent Reflections</h2>
            {entries.length > 3 && (
              <p className="text-xs text-purple-600 hover:underline cursor-pointer">
                Scroll past to view your full journal archive in search filtering
              </p>
            )}
          </div>

          {entries.length === 0 ? (
            /* Beautiful empty state */
            <div id="dashboard-empty-state" className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-purple-50 rounded-full text-purple-600 mb-2">
                <BookOpen className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-serif font-bold text-slate-900">Your journal is waiting</h3>
              <p className="text-slate-500 text-sm max-w-sm font-sans mx-auto">
                Take five minutes today to step back and reflect. Capture your first entry and begin your journaling journey!
              </p>
              <button
                onClick={() => onCreateEntry()}
                className="cursor-pointer inline-flex items-center gap-2 py-3 px-5 bg-[#8B5CF6] hover:bg-purple-700 text-white font-medium rounded-xl text-sm transition-colors"
              >
                Create First Entry
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentEntries.map((entry) => {
                const currentMood = moodMap[entry.mood];
                const catStyle = categoryMap[entry.category] || { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' };

                return (
                  <div
                    key={entry.id}
                    onClick={() => onEditEntry(entry.id)}
                    className="group relative bg-white p-6 rounded-3xl border border-slate-100 hover:border-purple-250 hover:shadow-subtle transition-all duration-150 cursor-pointer"
                  >
                    {entry.isFavorite && (
                      <div className="absolute top-4 right-4">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-sans mb-3">
                      <div className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{entry.date}</span>
                      </div>
                      <span className="text-slate-350">•</span>
                      <div className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {entry.draft && (
                        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Draft
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-serif font-bold text-slate-900 group-hover:text-purple-650 transition-colors">
                      {entry.title}
                    </h3>

                    <p className="text-sm font-sans text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {entry.text || <span className="italic text-slate-400">No content documented... Click to write.</span>}
                    </p>

                    {/* Footer labels */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {/* Mood label */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold font-sans ${currentMood?.bg} ${currentMood?.text}`}>
                        <span>{currentMood?.icon}</span>
                        <span>{currentMood?.label}</span>
                      </span>

                      {/* Category tag */}
                      <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold font-sans border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                        {entry.category}
                      </span>

                      {/* Tags */}
                      {entry.tags && entry.tags.slice(0, 3).map((tg) => (
                        <span key={tg} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs bg-slate-50 text-slate-500 border border-slate-100 font-sans">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {tg}
                        </span>
                      ))}

                      <span className="ml-auto flex items-center text-xs font-semibold font-sans text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                        View Reflection
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side component: Timeline tracker */}
        <div className="space-y-4">
          <div className="px-2">
            <h2 className="text-xl font-serif font-bold text-slate-900">Mental Map</h2>
            <p className="text-xs text-slate-500">Timeline of entries mood states</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle">
            {nonDrafts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm italic font-sans flex flex-col items-center justify-center">
                <AlertCircle className="w-5 h-5 text-slate-300 mb-2" />
                Nothing logged here yet.
              </div>
            ) : (
              <div className="flow-root">
                <ul className="-mb-8">
                  {nonDrafts.slice(0, 6).map((item, idx) => {
                    const isLast = idx === Math.min(nonDrafts.length, 6) - 1;
                    const moodDetail = moodMap[item.mood];

                    return (
                      <li key={item.id}>
                        <div className="relative pb-8">
                          {!isLast && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                                {moodDetail?.icon}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <p className="text-xs text-slate-500 font-mono">{item.date}</p>
                              <p
                                onClick={() => onEditEntry(item.id)}
                                className="text-sm font-sans font-medium text-slate-800 hover:text-purple-650 cursor-pointer mt-0.5 line-clamp-1"
                              >
                                {item.title}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
