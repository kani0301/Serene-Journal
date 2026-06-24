/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, Lock, Sparkles, Bell, Download, Trash2, Check, ShieldAlert, KeyRound, Save 
} from 'lucide-react';
import { User as UserType } from '../types';

interface SettingsViewProps {
  user: UserType;
  onSettingsUpdated: (updatedUser: UserType) => void;
  entries: any[];
  token: string;
}

export default function SettingsView({ user, onSettingsUpdated, entries, token }: SettingsViewProps) {
  const [name, setName] = useState(user.name);
  const [avatarSeed, setAvatarSeed] = useState(user.email.split('@')[0]);
  const [theme, setTheme] = useState(user.settings.theme || 'lavender');
  const [dailyReminderTime, setDailyReminderTime] = useState(user.settings.dailyReminderTime || '21:00');
  const [defaultCategory, setDefaultCategory] = useState(user.settings.defaultCategory || 'Daily Reflection');
  
  // PIN lock variables
  const [pinLocked, setPinLocked] = useState(user.settings.pinLocked || false);
  const [pinCode, setPinCode] = useState(user.settings.pinCode || '');
  
  // Status notifies
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const themesList = [
    { key: 'lavender', name: 'Lavender Breeze 💜', primary: '#8B5CF6' },
    { key: 'peach', name: 'Golden Apricot 🧡', primary: '#FDBA74' },
    { key: 'rose', name: 'Warm Crimson ❤️', primary: '#FB7185' },
    { key: 'mint', name: 'Sage Meadow 💚', primary: '#86EFAC' },
    { key: 'sky', name: 'Vibrant Sea 💙', primary: '#7DD3FC' },
    { key: 'bold_twilight', name: 'Twilight Aurora 🌌', primary: '#6366F1' },
    { key: 'bold_sunset', name: 'Sunset Horizon 🌇', primary: '#F43F5E' },
  ];

  const handleThemeSelect = (selectedKey: any) => {
    setTheme(selectedKey);
    onSettingsUpdated({
      ...user,
      settings: {
        ...user.settings,
        theme: selectedKey
      }
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    if (pinLocked && (!pinCode || pinCode.length !== 4)) {
      setErrorMsg('Password locks require exactly a 4-digit numeric code to protect your diary.');
      setLoading(false);
      return;
    }

    const payload = {
      name,
      avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(avatarSeed)}`,
      settings: {
        theme,
        dailyReminderTime,
        defaultCategory,
        pinLocked,
        pinCode: pinLocked ? pinCode : '',
      }
    };

    try {
      const res = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        onSettingsUpdated(data.user);
        setSuccessMsg('Your journaling sanctuary settings were successfully hardened!');
        setErrorMsg('');
        setTimeout(() => setSuccessMsg(''), 4550);
      } else {
        setErrorMsg('Could not update profile configs on the master directory.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('An unexpected error prevented synchronization.');
    } finally {
      setLoading(false);
    }
  };

  // Export full archives JSON
  const handleExportAll = () => {
    const backupContents = {
      profile: {
        name: user.name,
        email: user.email,
        theme: user.settings.theme,
      },
      exportedAt: new Date().toISOString(),
      reflectionsCount: entries.length,
      entries: entries,
    };

    const blob = new Blob([JSON.stringify(backupContents, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `serene_journal_backup_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-slate-900">Sanctuary Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize aesthetics, lock access with passcode shield, and manage offline data records.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-sm flex items-center gap-2 animate-fade-in">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-sm flex items-center gap-2 animate-fade-in">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* Row 1: Profile & Themes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User profiles config */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
            <h3 className="text-md font-serif font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-purple-600" />
              Journalist Profile
            </h3>

            <div>
              <label className="block text-xs font-sans font-bold text-slate-400 uppercase tracking-widest">Pen Name</label>
              <input
                id="settings-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-sans font-bold text-slate-400 uppercase tracking-widest">Avatar Generator Seed</label>
              <div className="flex gap-2 items-center mt-1">
                <input
                  id="settings-avatar-seed"
                  type="text"
                  value={avatarSeed}
                  onChange={(e) => setAvatarSeed(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800"
                />
                <img 
                  src={`https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(avatarSeed)}`}
                  alt="Avatar preview"
                  className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          {/* Alarm Reminders */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
            <h3 className="text-md font-serif font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Bell className="w-4 h-4 text-purple-600" />
              Mindfulness Reminders
            </h3>

            <div>
              <label className="block text-xs font-sans font-bold text-slate-400 uppercase tracking-widest">Daily Alert Clock</label>
              <input
                id="settings-reminder-clock"
                type="time"
                value={dailyReminderTime}
                onChange={(e) => setDailyReminderTime(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 font-sans"
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                Generates a helpful mindfulness widget and customized positive trigger cards dynamically.
              </p>
            </div>

            <div>
              <label className="block text-xs font-sans font-bold text-slate-400 uppercase tracking-widest">Default Reflection Category</label>
              <select
                id="settings-default-tag"
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 font-sans"
              >
                <option value="Daily Reflection">Daily Reflection</option>
                <option value="Personal">Personal</option>
                <option value="Gratitude">Gratitude</option>
                <option value="Goals">Goals</option>
                <option value="Memories">Memories</option>
              </select>
            </div>
          </div>
        </div>

        {/* Theme Selections */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
          <h3 className="text-md font-serif font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1">
            <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
            Vibe Theme Selection
          </h3>
          <p className="text-xs text-slate-400">Transform background structures and button shapes to fit your headspace.</p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-2">
            {themesList.map((tm) => (
              <button
                key={tm.key}
                type="button"
                onClick={() => handleThemeSelect(tm.key)}
                className={`flex flex-col items-center justify-center p-4 border rounded-2xl cursor-pointer transition-all ${
                  theme === tm.key 
                    ? 'border-purple-600 ring-2 ring-purple-600/35 bg-purple-50/10' 
                    : 'border-slate-100 hover:border-purple-200'
                }`}
              >
                <div className="h-6 w-6 rounded-full" style={{ backgroundColor: tm.primary }} />
                <span className="text-xs font-semibold text-slate-700 mt-2 text-center leading-none">{tm.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lock entire application with PIN */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500 animate-bounce" />
              <h3 className="text-md font-serif font-bold text-slate-900">Passcode Protection Locker</h3>
            </div>
            <input
              id="settings-lock-toggle"
              type="checkbox"
              checked={pinLocked}
              onChange={(e) => setPinLocked(e.target.checked)}
              className="w-5 h-5 accent-purple-600 cursor-pointer"
            />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            If enabled, Serene Journal requires inputting your secret 4-digit PIN every single time you sign in to decrypt memory archives.
          </p>

          {pinLocked && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-fade-in">
              <div>
                <label className="block text-xs font-sans text-slate-500 font-bold">New secret 4-digit PIN</label>
                <input
                  id="settings-lock-pin"
                  type="password"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="e.g., 2026"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="mt-1 block w-md rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 font-mono tracking-widest text-center"
                />
              </div>
            </div>
          )}
        </div>

        {/* Save updates control bar */}
        <div className="flex items-center justify-end">
          <button
            id="settings-submit-btn"
            type="submit"
            disabled={loading}
            className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-purple-700 text-white rounded-2xl font-semibold shadow-subtle transition-all font-sans"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Securing settings...' : 'Apply Configurations'}
          </button>
        </div>
      </form>

      {/* Export data control area */}
      <div className="bg-rose-100/10 p-6 rounded-3xl border border-rose-150 shadow-subtle space-y-4">
        <div>
          <h3 className="text-md font-serif font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            Backup & Vault Operations
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-normal text-justify">
            Your reflections are saved server-side but fully belong to you. We strongly recommend downloading copies to keep inside your local physical hardware backups.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 pt-2">
          <button
            id="settings-btn-backup"
            onClick={handleExportAll}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold font-sans inline-flex items-center gap-1.5 cursor-pointer shadow-subtle animate-fade-in"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            Export Entire Vault (.json)
          </button>
        </div>
      </div>
    </div>
  );
}
