/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  BarChart, Sparkles, TrendingUp, Calendar, AlertCircle, Quote, 
  HelpCircle, RefreshCw, BarChart2, Heart, PieChart, Star, Flame, Loader2 
} from 'lucide-react';
import { JournalEntry, AIInsightsReport, MoodType } from '../types';
import { moodMap, categoryMap } from './Dashboard';

interface AnalyticsViewProps {
  entries: JournalEntry[];
  token: string;
}

export default function AnalyticsView({ entries, token }: AnalyticsViewProps) {
  const [aiReport, setAiReport] = useState<AIInsightsReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  // Fetch AI global growth pattern reports
  const fetchAIReport = async () => {
    setReportLoading(true);
    setReportError('');
    try {
      const res = await fetch('/api/ai/growth-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to capture trends.');
      }
      setAiReport(data);
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || 'Connecting to Gemini analytics failed.');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    // Generate initially if there are enough entries
    const nonDraftsLength = entries.filter(e => !e.draft).length;
    if (nonDraftsLength >= 2) {
      fetchAIReport();
    }
  }, [entries]);

  // Calculations for charts
  const nonDrafts = [...entries]
    .filter(e => !e.draft)
    .sort((a, b) => a.date.localeCompare(b.date)); // Oldest to newest for progression charts

  const totalLines = entries.length;
  const favoriteEntriesCount = entries.filter(e => e.isFavorite).length;

  // Mood counting
  const moodCounts: Record<MoodType, number> = {
    excited: 0, happy: 0, peaceful: 0, tired: 0, sad: 0, stressed: 0
  };
  nonDrafts.forEach(e => {
    if (moodCounts[e.mood] !== undefined) {
      moodCounts[e.mood]++;
    }
  });

  // Category counting
  const categoryCounts: Record<string, number> = {};
  nonDrafts.forEach(e => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });

  // Chart variables maps
  const moodScoreMap: Record<MoodType, number> = {
    stressed: 1, sad: 2, tired: 3, peaceful: 4, happy: 5, excited: 6
  };
  const moodScoresReverse: Record<number, MoodType> = {
    1: 'stressed', 2: 'sad', 3: 'tired', 4: 'peaceful', 5: 'happy', 6: 'excited'
  };

  // Convert last 8 entries for Spline Plotting
  const trendData = nonDrafts.slice(-8);

  // SVG Chart path calculation (Spline)
  let svgPoints = '';
  let trendLabels: Array<{ x: number; y: number; title: string; mood: MoodType }> = [];
  if (trendData.length > 1) {
    const width = 600;
    const height = 200;
    const padding = 40;
    const stepX = (width - padding * 2) / (trendData.length - 1);
    
    const points = trendData.map((d, index) => {
      const score = moodScoreMap[d.mood] || 3;
      const x = padding + index * stepX;
      // score of 1 maps near height, 6 maps near top padding (lower pixel numbers!)
      const y = height - padding - ((score - 1) * (height - padding * 2) / 5);
      return { x, y, title: d.title, mood: d.mood };
    });

    // Generate spline commands using Catmull-Rom or simple bézier
    svgPoints = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + stepX / 2;
      const cpY1 = p0.y;
      const cpX2 = p1.x - stepX / 2;
      const cpY2 = p1.y;
      svgPoints += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    trendLabels = points;
  }

  // Get weekday activity grid calculation
  const getWeekdayActivity = () => {
    // Days indexes Map (0=Sunday to 6=Saturday)
    const weekdayActivityCounts = Array(7).fill(0);
    nonDrafts.forEach(entry => {
      const dateObj = new Date(entry.date + 'T00:00:00');
      const day = dateObj.getDay();
      weekdayActivityCounts[day]++;
    });
    return weekdayActivityCounts;
  };
  const weekdaysLabelStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayCountsArray = getWeekdayActivity();
  const maxDayCount = Math.max(...weekdayCountsArray, 1);

  return (
    <div className="space-y-8 pb-16">
      {/* Title */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <BarChart className="w-6 h-6 text-purple-600" />
            Emotional Insights & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Study your journaling frequency, mood landscapes, and emotional evolutions over time.
          </p>
        </div>
      </div>

      {nonDrafts.length < 2 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-200 space-y-4 max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-purple-300 mx-auto" />
          <h3 className="text-lg font-serif font-bold text-slate-800">Growth analysis locked</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto font-sans">
            Write at least <span className="font-semibold text-purple-600">2 journal logs</span> to unlock interactive trends charts and frequency maps! Current count: {nonDrafts.length}.
          </p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 1. Mood trends Curve (Span 2 grids) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
              <div>
                <h3 className="text-[15px] font-bold font-sans text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Emotional Core Progression (8 Latest Reflections)
                </h3>
                <p className="text-xs text-slate-500">Bézier flow of recorded moods over past reflections.</p>
              </div>

              {trendData.length > 1 ? (
                <div className="relative overflow-x-auto">
                  <div className="min-w-[600px] h-[220px]">
                    <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
                      {/* Grid guidelines */}
                      {[1, 2, 3, 4, 5, 6].map(level => {
                        const scoreMood = moodScoresReverse[level];
                        const labelItem = moodMap[scoreMood];
                        const offsetHeight = 200 - 40 - ((level - 1) * (200 - 4 * 20) / 5);
                        return (
                          <g key={level}>
                            <text x="35" y={offsetHeight + 4} className="text-[10px] font-sans font-medium fill-slate-400 text-right" textAnchor="end">
                              {labelItem?.icon} {labelItem?.label}
                            </text>
                            <line x1="45" y1={offsetHeight} x2="570" y2={offsetHeight} stroke="#F1F5F9" strokeDasharray="3 3" />
                          </g>
                        );
                      })}

                      {/* Smooth Area Gradient */}
                      {trendLabels.length > 0 && (
                        <>
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.00" />
                            </linearGradient>
                          </defs>
                          <path 
                            d={`${svgPoints} L ${trendLabels[trendLabels.length-1].x} 160 L ${trendLabels[0].x} 160 Z`}
                            fill="url(#chartGradient)"
                          />
                        </>
                      )}

                      {/* The Line curve path */}
                      <path 
                        d={svgPoints} 
                        fill="none" 
                        stroke="#8B5CF6" 
                        strokeWidth="3.5" 
                        strokeLinecap="round"
                        className="animate-draw"
                      />

                      {/* Plotting points */}
                      {trendLabels.map((p, idx) => (
                        <g key={idx} className="group cursor-pointer">
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="6" 
                            fill="#FFFFFF" 
                            stroke="#8B5CF6" 
                            strokeWidth="3.5"
                            className="transition-all hover:r-8 hover:fill-purple-600"
                          />
                          {/* Tooltip trigger bubble */}
                          <foreignObject x={p.x - 45} y={p.y - 35} width="90" height="28" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-slate-900/90 text-white text-[9px] text-center px-1 py-1.5 rounded-lg shadow font-sans truncate">
                              {p.title}
                            </div>
                          </foreignObject>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 italic text-slate-400 text-xs text-sans">Need more data segments dynamically...</div>
              )}
            </div>

            {/* 2. Mood metrics Distribution (Pie / Bar list format) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
              <div>
                <h3 className="text-[15px] font-bold font-sans text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-pink-500" />
                  Emotional Spectrum (Total)
                </h3>
                <p className="text-xs text-slate-500">Percentage share of each logged energy condition.</p>
              </div>

              <div className="space-y-3.5 pt-2">
                {Object.entries(moodCounts).map(([moodKey, count]) => {
                  const details = moodMap[moodKey as MoodType];
                  const percentage = totalLines > 0 ? Math.round((count / nonDrafts.length) * 100) : 0;
                  return (
                    <div key={moodKey} className="space-y-1 font-sans">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-750 flex items-center gap-1">
                          <span>{details?.icon}</span>
                          <span>{details?.label}</span>
                        </span>
                        <span className="text-slate-405 font-mono font-medium">{count} logs ({percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: details?.color || '#D1D5DB' 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>          {/* Next Row: Categories Bento Bar chart & Consistency calendar map */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Category bento */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
              <div>
                <h3 className="text-[15px] font-bold font-sans text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-[#8B5CF6]" />
                  Category distribution
                </h3>
                <p className="text-xs text-slate-500">Distribution analysis across primary journal themes.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                {Object.entries(categoryCounts).map(([catName, count]) => {
                  const style = categoryMap[catName] || { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' };
                  return (
                    <div key={catName} className={`p-4 rounded-2xl border ${style.bg} ${style.border} flex flex-col justify-between font-sans`}>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${style.text}`}>{catName}</span>
                      <div className="mt-4">
                        <span className="text-3xl font-serif font-bold text-slate-800 font-mono">{count}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">notes</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Consistency weekly chart */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
              <div>
                <h3 className="text-[15px] font-bold font-sans text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  Journaling consistency Map
                </h3>
                <p className="text-xs text-slate-500">Weekly activity distribution of recorded logs.</p>
              </div>

              <div className="grid grid-cols-7 gap-2 pt-4">
                {weekdayCountsArray.map((count, index) => {
                  const countPercent = Math.min((count / maxDayCount) * 100, 100);
                  return (
                    <div key={index} className="flex flex-col items-center justify-between h-[100px] font-sans">
                      {/* Count bubble */}
                      <span className="text-[9px] font-bold font-mono text-slate-400">{count}</span>
                      {/* Bar columns */}
                      <div className="w-5 h-[65px] bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex flex-col-reverse">
                        <div 
                          className="w-full bg-[#8B5CF6]/85 transition-all duration-300 rounded-t-sm"
                          style={{ height: `${countPercent}%` }}
                        />
                      </div>
                      {/* label */}
                      <span className="text-[10px] text-slate-505 mt-2">{weekdaysLabelStr[index]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
