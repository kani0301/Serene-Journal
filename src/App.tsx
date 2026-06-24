/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, BookOpen, Search, Calendar, BarChart2, Settings, LogOut, 
  ChevronRight, Delete, CheckCircle, ShieldAlert, KeyRound, Clock, Heart, Tag, Sparkle
} from 'lucide-react';
import { User, JournalEntry, MoodType } from './types';

// Importing our modular sub-views
import AuthPage from './components/AuthPage';
import Dashboard, { moodMap } from './components/Dashboard';
import JournalEditor from './components/JournalEditor';
import AnalyticsView from './components/AnalyticsView';
import JournalCalendar from './components/JournalCalendar';
import ArchiveView from './components/ArchiveView';
import SettingsView from './components/SettingsView';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('serene_token'));
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Router screen navigation
  // 'dashboard' | 'archive' | 'calendar' | 'analytics' | 'settings' | 'editor'
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'archive' | 'calendar' | 'analytics' | 'settings' | 'editor'>('dashboard');
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [activeEditorInitialMood, setActiveEditorInitialMood] = useState<MoodType | undefined>(undefined);
  const [activeEditorInitialDate, setActiveEditorInitialDate] = useState<string | undefined>(undefined);

  // Lock status variables
  const [isAppPinLocked, setIsAppPinLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Recover session on load
  useEffect(() => {
    const checkTokenSession = async () => {
      const activeToken = localStorage.getItem('serene_token');
      if (activeToken) {
        try {
          const res = await fetch('/api/auth/session', {
            headers: { 'Authorization': `Bearer ${activeToken}` },
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setToken(activeToken);

            // Turn on active PIN key locks screen if requested
            if (data.user.settings?.pinLocked && data.user.settings?.pinCode) {
              setIsAppPinLocked(true);
            }
          } else {
            // Token expired
            localStorage.removeItem('serene_token');
            setToken(null);
            setUser(null);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setSessionLoading(false);
    };

    checkTokenSession();
  }, []);

  // Sync journal database logs given active session token
  const refreshJournalEntries = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/entries', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        setEntries(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      refreshJournalEntries();
    }
  }, [token, currentScreen]);

  // Authorization outcomes handler
  const handleAuthSuccess = (newToken: string, loggedUser: User) => {
    localStorage.setItem('serene_token', newToken);
    setToken(newToken);
    setUser(loggedUser);
    
    // Check if passcode pin locks requested
    if (loggedUser.settings?.pinLocked && loggedUser.settings?.pinCode) {
      setIsAppPinLocked(true);
    } else {
      setIsAppPinLocked(false);
    }
    
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    if (window.confirm('Would you like to sign out from your private journaling sanctuary?')) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem('serene_token');
      setToken(null);
      setUser(null);
      setEntries([]);
      setIsAppPinLocked(false);
      setPinInput('');
    }
  };

  const handleSettingsUpdated = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // Screen layout launchers
  const handleCreateNewEntry = (customMood?: MoodType) => {
    setActiveEntryId(null);
    setActiveEditorInitialMood(customMood);
    setActiveEditorInitialDate(undefined);
    setCurrentScreen('editor');
  };

  const handleEditExistingEntry = (id: string) => {
    setActiveEntryId(id);
    setActiveEditorInitialMood(undefined);
    setActiveEditorInitialDate(undefined);
    setCurrentScreen('editor');
  };

  const handleCreateNewWithDate = (dateStr: string) => {
    setActiveEntryId(null);
    setActiveEditorInitialMood('peaceful');
    setActiveEditorInitialDate(dateStr);
    setCurrentScreen('editor');
  };

  // Keyboard keypad PIN validator
  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (user && user.settings?.pinCode === pinInput) {
      setIsAppPinLocked(false);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleKeypadPress = (num: string) => {
    if (pinInput.length < 4) {
      const nextInput = pinInput + num;
      setPinInput(nextInput);
      // Auto-submit on reaching 4 digits
      if (nextInput.length === 4 && user && user.settings?.pinCode === nextInput) {
        setIsAppPinLocked(false);
        setPinInput('');
        setPinError(false);
      } else if (nextInput.length === 4) {
        setTimeout(() => {
          setPinError(true);
          setPinInput('');
          setTimeout(() => setPinError(false), 1500);
        }, 300);
      }
    }
  };

  const handleKeypadClear = () => {
    setPinInput('');
  };

  // Settings/themes visual styles mapping definitions
  const activeTheme = user?.settings?.theme || 'lavender';
  
  const themeVarsMap: Record<string, {
    isDark: boolean;
    bodyBg: string;
    sidebarBg: string;
    cardBg: string;
    textMain: string;
    textMuted: string;
    textTitle: string;
    borderColor: string;
    activeIndicator: string;
    primaryBtn: string;
    textAccent: string;
  }> = {
    lavender: { 
      isDark: false,
      bodyBg: 'bg-gradient-to-br from-[#F5F3FF] via-[#EDE9FE] to-[#DDD6FE]', 
      sidebarBg: 'bg-white border-slate-100',
      cardBg: 'bg-white border-slate-100/80',
      textMain: 'text-slate-800',
      textMuted: 'text-slate-500',
      textTitle: 'text-slate-900',
      borderColor: 'border-slate-100',
      activeIndicator: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-l-4 border-[#8B5CF6]',
      primaryBtn: 'bg-[#8B5CF6] hover:bg-purple-700',
      textAccent: 'text-[#8B5CF6]'
    },
    peach: { 
      isDark: false,
      bodyBg: 'bg-gradient-to-br from-[#FFF7ED] via-[#FFEDD5] to-[#FED7AA]', 
      sidebarBg: 'bg-white border-slate-100',
      cardBg: 'bg-white border-slate-100/80',
      textMain: 'text-slate-800',
      textMuted: 'text-slate-500',
      textTitle: 'text-slate-900',
      borderColor: 'border-slate-100',
      activeIndicator: 'bg-orange-100 text-orange-900 border-l-4 border-orange-500',
      primaryBtn: 'bg-orange-500 hover:bg-orange-600',
      textAccent: 'text-orange-700'
    },
    rose: { 
      isDark: false,
      bodyBg: 'bg-gradient-to-br from-[#FFF1F2] via-[#FFE4E6] to-[#FECDD3]', 
      sidebarBg: 'bg-white border-slate-100',
      cardBg: 'bg-white border-slate-100/80',
      textMain: 'text-slate-800',
      textMuted: 'text-slate-500',
      textTitle: 'text-slate-900',
      borderColor: 'border-slate-100',
      activeIndicator: 'bg-rose-100 text-rose-900 border-l-4 border-[#FB7185]',
      primaryBtn: 'bg-[#FB7185] hover:bg-[#F43F5E]',
      textAccent: 'text-rose-700'
    },
    mint: { 
      isDark: false,
      bodyBg: 'bg-gradient-to-br from-[#F0FDF4] via-[#DCFCE7] to-[#C6F6D5]', 
      sidebarBg: 'bg-white border-slate-100',
      cardBg: 'bg-white border-slate-100/80',
      textMain: 'text-slate-800',
      textMuted: 'text-slate-500',
      textTitle: 'text-slate-900',
      borderColor: 'border-slate-100',
      activeIndicator: 'bg-emerald-100 text-emerald-950 border-l-4 border-emerald-500',
      primaryBtn: 'bg-[#10B981] hover:bg-[#059669]',
      textAccent: 'text-[#059669]'
    },
    sky: { 
      isDark: false,
      bodyBg: 'bg-gradient-to-br from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD]', 
      sidebarBg: 'bg-white border-slate-100',
      cardBg: 'bg-white border-slate-100/80',
      textMain: 'text-slate-800',
      textMuted: 'text-slate-500',
      textTitle: 'text-slate-900',
      borderColor: 'border-slate-100',
      activeIndicator: 'bg-sky-100 text-sky-950 border-l-4 border-sky-500',
      primaryBtn: 'bg-[#0EA5E9] hover:bg-[#0284C7]',
      textAccent: 'text-[#0EA5E9]'
    },
    bold_twilight: {
      isDark: true,
      bodyBg: 'bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#311042]',
      sidebarBg: 'bg-slate-900 border-slate-800',
      cardBg: 'bg-slate-900/80 border-slate-800/80 shadow-slate-950/40',
      textMain: 'text-slate-200',
      textMuted: 'text-slate-450',
      textTitle: 'text-white',
      borderColor: 'border-slate-800',
      activeIndicator: 'bg-indigo-500/20 text-indigo-300 border-l-4 border-indigo-400',
      primaryBtn: 'bg-indigo-600 hover:bg-indigo-700',
      textAccent: 'text-indigo-400'
    },
    bold_sunset: {
      isDark: true,
      bodyBg: 'bg-gradient-to-br from-[#1E1B4B] via-[#431407] to-[#500724]',
      sidebarBg: 'bg-stone-900 border-stone-800',
      cardBg: 'bg-stone-900/80 border-stone-800/80 shadow-stone-950/40',
      textMain: 'text-stone-200',
      textMuted: 'text-stone-450',
      textTitle: 'text-white',
      borderColor: 'border-stone-800',
      activeIndicator: 'bg-rose-500/20 text-rose-300 border-l-4 border-rose-400',
      primaryBtn: 'bg-rose-600 hover:bg-rose-700',
      textAccent: 'text-rose-400'
    }
  };

  const currentThemeStyles = themeVarsMap[activeTheme] || themeVarsMap.lavender;

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF8] flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-r-2 border-purple-600"></div>
        <p className="text-gray-500 font-serif animate-pulse">Entering Serene Journal Sanctuary...</p>
      </div>
    );
  }

  // Not logged in -> Render Auth Forms
  if (!token || !user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Passcode keypad Shield check (Lock entire app requested)
  if (isAppPinLocked) {
    return (
      <div className="min-h-screen bg-[#FFFDF8] flex flex-col justify-center items-center py-12 px-4 select-none">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl border border-gray-100 shadow-xl text-center space-y-6">
          <div className="inline-flex items-center justify-center p-4 bg-rose-50 rounded-full text-rose-500 animate-pulse">
            <KeyRound className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-gray-900">Vault Decryption Required</h2>
            <p className="text-xs text-gray-500 mt-1 font-sans">
              Enter your secure 4-digit PIN to access private memory archives.
            </p>
          </div>

          <div className="flex justify-center gap-3 py-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4.5 h-4.5 rounded-full border border-gray-200 transition-all ${
                  pinInput.length > idx 
                    ? 'bg-rose-500 border-rose-500 scale-110 shadow-sm' 
                    : pinError 
                      ? 'bg-rose-100 border-rose-300 animate-shake' 
                      : 'bg-gray-50'
                }`}
              />
            ))}
          </div>

          {pinError && (
            <p className="text-xs text-rose-600 font-sans font-semibold animate-shake">
              Password Lock check failed. Try again.
            </p>
          )}

          {/* Keypad numbers grids */}
          <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto font-sans pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="py-3 bg-gray-50 hover:bg-gray-100/80 active:bg-gray-150 rounded-xl text-md font-bold text-gray-700 transition-colors cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadClear}
              className="py-3 bg-gray-50 hover:bg-red-50 text-xs font-semibold text-rose-500 rounded-xl cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-3 bg-gray-50 hover:bg-gray-100/80 rounded-xl text-md font-bold text-gray-700 cursor-pointer"
            >
              0
            </button>
            <button
              onClick={() => handleLogout()}
              className="py-3 bg-gray-50 hover:bg-gray-100 text-[10px] font-bold text-gray-400 rounded-xl cursor-pointer"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${currentThemeStyles.bodyBg} flex flex-col md:flex-row font-sans ${currentThemeStyles.isDark ? 'text-slate-200 is-dark' : 'text-slate-800'} transition-colors duration-250`}>
      {/* Side left rail Navigation Menu (Wide Screens) */}
      <aside className={`w-full md:w-64 ${currentThemeStyles.isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border-r flex flex-col justify-between shrink-0 shadow-subtle p-6 space-y-8 select-none`}>
        <div className="space-y-6">
          {/* Logo */}
          <div className={`flex items-center gap-2.5 pb-2 border-b ${currentThemeStyles.isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <span className="p-2 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-xl">
              <BookOpen className="w-5 h-5 text-purple-600 animate-pulse" />
            </span>
            <span className={`text-xl font-serif font-black tracking-tight ${currentThemeStyles.isDark ? 'text-white' : 'text-slate-900'}`}>
              Serene
            </span>
          </div>

          {/* Nav list paths */}
          <nav className="space-y-1">
            <button
              id="nav-dash-btn"
              onClick={() => setCurrentScreen('dashboard')}
              className={`w-full text-left py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                currentScreen === 'dashboard' ? currentThemeStyles.activeIndicator : (currentThemeStyles.isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')
              }`}
            >
              <Sparkle className="w-4 h-4 text-purple-500 shrink-0" />
              Sanctuary Hub
            </button>

            <button
              id="nav-archive-btn"
              onClick={() => setCurrentScreen('archive')}
              className={`w-full text-left py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                currentScreen === 'archive' ? currentThemeStyles.activeIndicator : (currentThemeStyles.isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')
              }`}
            >
              <Search className="w-4 h-4 text-amber-500 shrink-0" />
              Vault Archive
            </button>

            <button
              id="nav-calendar-btn"
              onClick={() => setCurrentScreen('calendar')}
              className={`w-full text-left py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                currentScreen === 'calendar' ? currentThemeStyles.activeIndicator : (currentThemeStyles.isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')
              }`}
            >
              <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
              Mood Calendar
            </button>

            <button
              id="nav-analytics-btn"
              onClick={() => setCurrentScreen('analytics')}
              className={`w-full text-left py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                currentScreen === 'analytics' ? currentThemeStyles.activeIndicator : (currentThemeStyles.isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')
              }`}
            >
              <BarChart2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Growth Charts
            </button>

            <button
              id="nav-settings-btn"
              onClick={() => setCurrentScreen('settings')}
              className={`w-full text-left py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                currentScreen === 'settings' ? currentThemeStyles.activeIndicator : (currentThemeStyles.isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')
              }`}
            >
              <Settings className="w-4 h-4 text-sky-500 shrink-0" />
              Settings
            </button>
          </nav>
        </div>

        {/* User profile capsule bottom */}
        <div className={`border-t ${currentThemeStyles.isDark ? 'border-slate-800' : 'border-slate-100'} pt-4 space-y-4`}>
          <div className="flex items-center gap-2">
            <img 
              src={user.avatarUrl || `https://api.dicebear.com/7.x/micah/svg?seed=serene`}
              alt="Author profile avatar" 
              className="w-10 h-10 rounded-full bg-purple-50/50 border border-purple-100"
              referrerPolicy="no-referrer"
            />
            <div className="text-xs font-sans min-w-0">
              <p className={`font-bold ${currentThemeStyles.isDark ? 'text-white' : 'text-slate-900'} truncate leading-none mb-0.5`}>{user.name}</p>
              <p className="text-slate-455 truncate leading-none">{user.email}</p>
            </div>
          </div>

          <button
            id="nav-logout-btn"
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 border ${currentThemeStyles.isDark ? 'border-none bg-rose-500/10 text-rose-350 hover:bg-rose-500/15' : 'border-rose-100 text-rose-600 hover:bg-rose-50/70'} text-xs font-semibold rounded-xl cursor-pointer transition-colors`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Lock Sanctuary
          </button>
        </div>
      </aside>

      {/* Main content display blocks */}
      <main className="flex-grow p-6 md:p-8 lg:p-12 overflow-y-auto max-w-7xl mx-auto w-full">
        {currentScreen === 'dashboard' && (
          <Dashboard 
            entries={entries} 
            onCreateEntry={handleCreateNewEntry} 
            onEditEntry={handleEditExistingEntry} 
            user={user}
            themeStyles={currentThemeStyles}
          />
        )}

        {currentScreen === 'archive' && (
          <ArchiveView 
            entries={entries}
            onEditEntry={handleEditExistingEntry}
            onRefreshEntries={refreshJournalEntries}
            token={token}
          />
        )}

        {currentScreen === 'calendar' && (
          <JournalCalendar 
            entries={entries} 
            onEditEntry={handleEditExistingEntry} 
            onCreateEntryWithDate={handleCreateNewWithDate}
          />
        )}

        {currentScreen === 'analytics' && (
          <AnalyticsView 
            entries={entries} 
            token={token}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsView 
            user={user} 
            onSettingsUpdated={handleSettingsUpdated} 
            entries={entries}
            token={token}
          />
        )}

        {currentScreen === 'editor' && (
          <JournalEditor 
            entryId={activeEntryId} 
            initialMood={activeEditorInitialMood}
            initialDate={activeEditorInitialDate}
            onSaveCompleted={() => {
              refreshJournalEntries();
              setCurrentScreen('dashboard');
            }}
            onCancel={() => {
              setCurrentScreen('dashboard');
            }}
            token={token}
          />
        )}
      </main>
    </div>
  );
}
