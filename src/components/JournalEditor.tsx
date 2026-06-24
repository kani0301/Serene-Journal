/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Save, Trash2, Calendar, Layout, Compass, Tag, Sparkles, Lock, Unlock, 
  Eye, CornerDownLeft, Sparkle, RefreshCw, Star, Download, ChevronLeft, 
  HelpCircle, FileText, Check, AlertTriangle, ArrowLeft 
} from 'lucide-react';
import { JournalEntry, JournalTemplate, MoodType } from '../types';
import { moodMap, categoryMap } from './Dashboard';

interface JournalEditorProps {
  entryId: string | null;
  initialMood?: MoodType;
  initialDate?: string;
  onSaveCompleted: () => void;
  onCancel: () => void;
  token: string;
}

const DEFAULT_CATEGORIES = [
  'Daily Reflection', 'Personal', 'Gratitude', 'Goals',
  'Memories', 'Study', 'Travel', 'Work', 'Creative Writing'
];

export default function JournalEditor({ entryId, initialMood, initialDate, onSaveCompleted, onCancel, token }: JournalEditorProps) {
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Form Fields State
  const [date, setDate] = useState(initialDate || new Date().toISOString().substring(0, 10));
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [mood, setMood] = useState<MoodType>(initialMood || 'peaceful');
  const [category, setCategory] = useState('Daily Reflection');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Tags
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  // Custom draft & passcode lock details
  const [draft, setDraft] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');

  // UI Writing Styling
  const [fontFamily, setFontFamily] = useState<'font-serif' | 'font-sans' | 'font-mono'>('font-sans');
  const [fontSize, setFontSize] = useState<'text-base' | 'text-lg' | 'text-xl'>('text-base');
  const [editorBg, setEditorBg] = useState<'bg-white' | 'bg-amber-50/20' | 'bg-blue-50/20' | 'bg-rose-50/20'>('bg-white');

  // AI reflection values
  const [aiSummary, setAiSummary] = useState('');
  const [aiReflection, setAiReflection] = useState('');
  const [aiInsights, setAiInsights] = useState('');
  const [aiEncouragement, setAiEncouragement] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Templates
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Auto save stats
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  
  // Custom View Mode (Edit vs. Mindful Live Preview)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  // Custom UI alert toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Custom visual confirm overlays
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef({ title, text, mood, category, isFavorite, tags, draft, isLocked, passwordHint, date });

  // Update current state references for autosave triggers
  useEffect(() => {
    stateRef.current = { title, text, mood, category, isFavorite, tags, draft, isLocked, passwordHint, date };
  }, [title, text, mood, category, isFavorite, tags, draft, isLocked, passwordHint, date]);

  // Load existing entry or prep empty form
  useEffect(() => {
    const fetchEntryAndTemplates = async () => {
      setLoading(true);
      try {
        // Fetch journal templates
        const tRes = await fetch('/api/templates');
        if (tRes.ok) {
          const tData = await tRes.json();
          setTemplates(tData);
        }

        if (entryId) {
          const res = await fetch(`/api/entries`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const list: JournalEntry[] = await res.json();
            const item = list.find(e => e.id === entryId);
            if (item) {
              setTitle(item.title);
              setText(item.text);
              setMood(item.mood);
              setIsFavorite(item.isFavorite);
              setTags(item.tags || []);
              setDraft(item.draft);
              setIsLocked(item.isLocked);
              setPasswordHint(item.passwordHint || '');
              setDate(item.date);
              
              if (DEFAULT_CATEGORIES.includes(item.category)) {
                setCategory(item.category);
                setIsCustomCategoryMode(false);
              } else {
                setCategory('Custom');
                setCustomCategory(item.category);
                setIsCustomCategoryMode(true);
              }

              // Load AI fields
              setAiSummary(item.aiSummary || '');
              setAiReflection(item.aiReflection || '');
              setAiInsights(item.aiInsights || '');
              setAiEncouragement(item.aiEncouragement || '');
            } else {
              setNotFound(true);
            }
          } else {
            setNotFound(true);
          }
        }
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchEntryAndTemplates();
  }, [entryId, token]);

  // Handle auto-save cycles
  useEffect(() => {
    // Only schedule auto-saves if we have something written and aren't in first fetch
    if (!title || !entryId) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setSavingStatus('saving');
      const payload = {
        ...stateRef.current,
        category: stateRef.current.category === 'Custom' ? customCategory : stateRef.current.category,
      };

      try {
        const url = `/api/entries/${entryId}`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setSavingStatus('saved');
          setTimeout(() => setSavingStatus('idle'), 2000);
        } else {
          setSavingStatus('failed');
        }
      } catch (e) {
        console.error(e);
        setSavingStatus('failed');
      }
    }, 10000); // Trigger save 10 seconds after typing stops

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, text, mood, category, customCategory, isFavorite, tags, draft, isLocked, passwordHint, date, entryId, token]);

  // Insert Template contents
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;
    const item = templates.find(t => t.id === templateId);
    if (item) {
      const applyTemplate = () => {
        setText(item.placeholder);
      };

      if (!text || text.trim() === '') {
        applyTemplate();
      } else {
        askConfirmation(
          'Overwrite current entry?',
          'Your current text will be replaced with the questions in this template. Would you like to proceed?',
          applyTemplate
        );
      }
    }
  };

  // Add search tags helpers
  const handleAddTag = () => {
    const trimmed = tagsInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagsInput('');
    }
  };

  const handleRemoveTag = (tagIdx: number) => {
    setTags(tags.filter((_, idx) => idx !== tagIdx));
  };

  // Immediate Manuel Save Action
  const handleManuelSave = async (isClosing = false) => {
    if (!title) {
      showToast('Please include a prompt title for this reflection diary.', 'error');
      return;
    }

    setSavingStatus('saving');
    const finalCategory = isCustomCategoryMode ? customCategory : category;

    const payload = {
      title,
      text,
      mood,
      category: finalCategory || 'Daily Reflection',
      isFavorite,
      tags,
      draft,
      isLocked,
      passwordHint,
      date,
    };

    try {
      const url = entryId ? `/api/entries/${entryId}` : '/api/entries';
      const method = entryId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Write request failed.');
      }

      setSavingStatus('saved');
      if (isClosing) {
        onSaveCompleted();
      } else {
        showToast('Reflection logged in the server.', 'success');
        setTimeout(() => setSavingStatus('idle'), 2000);
      }
    } catch (e: any) {
      console.error(e);
      setSavingStatus('failed');
      showToast(`Could not save journal: ${e.message}`, 'error');
    }
  };

  // Delete Entry Action
  const handleDelete = () => {
    askConfirmation(
      'Erase thought record?',
      'Are you absolutely sure you want to remove this journal entry? This thought record cannot be restored.',
      async () => {
        try {
          const res = await fetch(`/api/entries/${entryId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            onSaveCompleted();
          } else {
            showToast('Failed to remove entry from journal.', 'error');
          }
        } catch (e) {
          console.error(e);
          showToast('Failed to connect to directory.', 'error');
        }
      }
    );
  };

  // AI-Powered Reflection request via Gemini API
  const handleTriggerAIReflect = async () => {
    if (!entryId) {
      // Must save first
      if (!title) {
        showToast('Please enter a title for your entry before launching AI analysis.', 'error');
        return;
      }
      showToast('Saving this journal session first, we will immediately reflect afterwards...', 'info');
      await handleManuelSave(false);
      return;
    }

    if (!text || text.trim().length < 15) {
      showToast('Write a slightly longer reflection (more than 15 characters) so Gemini can parse emotional dynamics!', 'info');
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      const res = await fetch('/api/ai/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ entryId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Reflections failed to compute.');
      }

      setAiSummary(data.aiSummary || '');
      setAiReflection(data.aiReflection || '');
      setAiInsights(data.aiInsights || '');
      setAiEncouragement(data.aiEncouragement || '');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Connecting to Gemini services timed out. Please verify API configuration.');
    } finally {
      setAiLoading(false);
    }
  };

  // Download individual entry as formatted txt
  const handleExportEntry = () => {
    const divider = '='.repeat(40);
    const textData = `
SERENE JOURNAL REFLECTION
${divider}
Title: ${title}
Date: ${date}
Mood: ${moodMap[mood]?.label || mood} ${moodMap[mood]?.icon || ''}
Category: ${category === 'Custom' ? customCategory : category}
Tags: ${tags.join(', ') || 'None'}
Status: ${draft ? 'Draft Mode' : 'Reflected & Locked'}
Favorite: ${isFavorite ? 'Yes' : 'No'}
${divider}

ENTRY CONTENT:
${text}

${divider}
GOOGLES GEMINI AI REFLECTIONS:
Summary: ${aiSummary || 'Not generated.'}
Empathetic Reflection: ${aiReflection || 'Not generated.'}
Mindful Insights: ${aiInsights || 'Not generated.'}
Encouragement: ${aiEncouragement || 'Not generated.'}
${divider}
Generated in Serene Journal App © 2026
`;

    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Serene_Journal_${date}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Text Helper Formatter Markup with smart toggleable line formats and word-under-cursor inline formatting
  const appendFormat = (symbol: string) => {
    const input = document.getElementById('journal-text-area') as HTMLTextAreaElement;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const originalText = text;

    // 1. Check for Block-level formatting (H2, Bullet, Quote) which apply to the entire line
    const isBlock = ['h2', 'list', 'quote'].includes(symbol);
    
    if (isBlock) {
      const leftPart = originalText.substring(0, start);
      const lineStart = leftPart.lastIndexOf('\n') + 1;
      
      const rightPart = originalText.substring(start);
      const nextNewline = rightPart.indexOf('\n');
      const lineEnd = start + (nextNewline === -1 ? rightPart.length : nextNewline);
      
      const currentLine = originalText.substring(lineStart, lineEnd);
      let trimmedLine = currentLine.trim();
      let newLine = '';
      
      if (symbol === 'h2') {
        if (trimmedLine.startsWith('## ')) {
          newLine = currentLine.replace(/^(##\s*)/, '');
        } else {
          newLine = `## ${trimmedLine || 'Heading'}`;
        }
      } else if (symbol === 'list') {
        if (trimmedLine.startsWith('- ')) {
          newLine = currentLine.replace(/^(-\s*)/, '');
        } else {
          newLine = `- ${trimmedLine || 'item'}`;
        }
      } else if (symbol === 'quote') {
        if (trimmedLine.startsWith('> ')) {
          newLine = currentLine.replace(/^(>\s*)/, '');
        } else {
          newLine = `> ${trimmedLine || 'quote text'}`;
        }
      }
      
      const newText = originalText.substring(0, lineStart) + newLine + originalText.substring(lineEnd);
      setText(newText);
      
      setTimeout(() => {
        input.focus();
        const newCursor = lineStart + newLine.length;
        input.setSelectionRange(newCursor, newCursor);
      }, 100);
      return;
    }

    // 2. Check for Inline-level formatting (Bold, Italic)
    let selected = originalText.substring(start, end);
    let selectWordStart = start;
    let selectWordEnd = end;

    // If nothing is selected, try to grab the word under the cursor
    if (start === end) {
      const leftPart = originalText.substring(0, start);
      const rightPart = originalText.substring(start);
      
      const leftMatch = leftPart.match(/(\w+)$/);
      const rightMatch = rightPart.match(/^(\w+)/);
      
      let word = '';
      let wordStart = start;
      let wordEnd = start;
      
      if (leftMatch) {
        word += leftMatch[1];
        wordStart -= leftMatch[1].length;
      }
      if (rightMatch) {
        word += rightMatch[1];
        wordEnd += rightMatch[1].length;
      }
      
      if (word) {
        selected = word;
        selectWordStart = wordStart;
        selectWordEnd = wordEnd;
      }
    }

    let replaced = '';
    if (symbol === 'bold') {
      if (selected.startsWith('**') && selected.endsWith('**')) {
        replaced = selected.substring(2, selected.length - 2);
      } else {
        replaced = `**${selected || 'bold text'}**`;
      }
    } else if (symbol === 'italic') {
      if (selected.startsWith('*') && selected.endsWith('*')) {
        replaced = selected.substring(1, selected.length - 1);
      } else {
        replaced = `*${selected || 'italic text'}*`;
      }
    }

    setText(originalText.substring(0, selectWordStart) + replaced + originalText.substring(selectWordEnd));
    
    setTimeout(() => {
      input.focus();
      const newCursor = selectWordStart + replaced.length;
      input.setSelectionRange(newCursor, newCursor);
    }, 100);
  };

  // Calculate stats
  const wordCount = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = text ? text.length : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <LoaderSpinner />
        <p className="text-gray-500 font-serif">Opening your private journal locker...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-white border border-gray-100 p-8 rounded-3xl text-center space-y-4 max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto" />
        <h3 className="text-lg font-serif font-bold text-gray-900">Journal page missing</h3>
        <p className="text-sm text-gray-500 font-sans">
          This reflection is locked or does not exist under your user credentials.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium cursor-pointer"
        >
          Return Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Navigation Headers bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-500"
            title="Cancel and return dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-900">
              {entryId ? 'Update Reflection' : 'Draft Daily Thoughts'}
            </h1>
            <p className="text-xs text-gray-400">
              {savingStatus === 'saving' && 'Syncing changes to vault...'}
              {savingStatus === 'saved' && 'All changes saved inside sanctuary'}
              {savingStatus === 'idle' && 'Sanctuary is offline & secure'}
              {savingStatus === 'failed' && 'Syncing failed (will retry)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {eventIdSaveStatus(savingStatus)}

          <button
            id="editor-btn-export"
            onClick={handleExportEntry}
            className="p-2.5 bg-white text-gray-500 hover:text-gray-700 border border-gray-100 hover:border-gray-250 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold font-sans"
            title="Export formatted text to raw TXT"
          >
            <Download className="w-4 h-4" />
            Export Txt
          </button>

          {entryId && (
            <button
              id="editor-btn-delete"
              onClick={handleDelete}
              className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100/80 rounded-xl transition-all cursor-pointer"
              title="Permanently erase page"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            id="editor-btn-save"
            onClick={() => handleManuelSave(true)}
            className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-purple-700 text-white rounded-xl font-medium text-sm shadow-md cursor-pointer transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save & Exit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Main Canvas Form (Spans 2 grids) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Editor Mode Control row */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between text-xs font-sans text-gray-500">
            <span className="font-semibold text-slate-700">Writing Mode Selection</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-650'
                }`}
              >
                Write Mode
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'preview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-650'
                }`}
              >
                Mindful Preview
              </button>
            </div>
          </div>

          {/* Core metadata inputs: Title, Date, Mood Selection */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest">Entry Heading</label>
                <input
                  id="editor-title-input"
                  type="text"
                  required
                  placeholder="Title your thoughts..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full py-2.5 text-xl font-serif font-bold text-gray-900 focus:outline-none border-b border-transparent focus:border-purple-200 focus:ring-0 placeholder-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest">Calender Date</label>
                <div className="mt-1 flex relative rounded-xl shadow-sm border border-gray-100 bg-gray-55 items-center">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3" />
                  <input
                    id="editor-date-input"
                    type="date"
                    required
                    value={date}
                    max={new Date().toISOString().substring(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-9 pr-2 py-2.5 block w-full border-none rounded-xl text-sm focus:ring-1 focus:ring-purple-500 text-gray-700 focus:outline-none font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Quick Template list */}
            {templates.length > 0 && !entryId && (
              <div className="bg-purple-100/15 p-3 rounded-2xl border border-purple-100/40 text-xs font-sans text-purple-900 flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-purple-600 animate-spin" />
                  Stuck? Prep with a custom layout template:
                </span>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="bg-white border border-purple-200 text-purple-900 rounded-xl px-2.5 py-1 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="">-- Choose Template --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Mood selector list */}
            <div>
              <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest mb-2">Core Energy State</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(moodMap).map(([key, value]) => {
                  const isSelected = mood === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setMood(key as MoodType)}
                      className={`cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold font-sans transition-all duration-150 ${
                        isSelected 
                          ? 'bg-purple-600 text-white ring-2 ring-offset-2 ring-purple-600 scale-105 shadow-md' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg">{value.icon}</span>
                      <span>{value.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Writing Canvas / Textarea */}
          <div className={`relative rounded-3xl border border-gray-100 p-6 min-h-[400px] shadow-sm flex flex-col justify-between ${editorBg} transition-colors duration-200`}>
            {viewMode === 'edit' ? (
              <textarea
                id="journal-text-area"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Start journaling... Let your thoughts land gently without planning or judgment."
                className={`w-full min-h-[350px] border-none focus:outline-none focus:ring-0 placeholder-gray-300 ${fontFamily} ${fontSize} text-slate-800 leading-relaxed resize-none bg-transparent`}
              />
            ) : (
              <div className={`w-full min-h-[350px] overflow-y-auto px-1 py-2 ${fontFamily} ${fontSize} text-slate-800 leading-relaxed`}>
                {(() => {
                  if (!text) return <span className="italic text-slate-400">Your sheet is currently blank. Return to Write Mode to start journaling.</span>;
                  
                  const escapedLines = text.split(/\r?\n/).map(line => {
                    return line
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');
                  });

                  const formattedLines = escapedLines.map(line => {
                    const trimmed = line.trim();
                    
                    const applyInlineFormatting = (str: string) => {
                      let res = str;
                      // Bold syntax: **text** -> <strong>text</strong>
                      res = res.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-950 bg-yellow-50 px-1 rounded">$1</strong>');
                      // Italic syntax: *text* -> <em>text</em>
                      res = res.replace(/\*(.*?)\*/g, '<span class="italic text-slate-900">$1</span>');
                      return res;
                    };

                    // Headings: ## text -> h2
                    if (trimmed.startsWith('##')) {
                      const headingText = trimmed.substring(2).trim();
                      return `<h2 class="text-xl font-serif font-bold text-slate-900 mt-5 mb-2.5">${applyInlineFormatting(headingText)}</h2>`;
                    }
                    
                    // Quote lines: &gt; text -> blockquote
                    if (trimmed.startsWith('&gt;')) {
                      const quoteText = trimmed.substring(4).trim();
                      return `<blockquote class="pl-4 border-l-4 border-purple-300 italic my-3.5 py-1 text-slate-600 bg-slate-50/50 rounded-r-lg">${applyInlineFormatting(quoteText)}</blockquote>`;
                    }

                    // Lists: - text -> bullet points
                    if (trimmed.startsWith('-')) {
                      const listText = trimmed.substring(1).trim();
                      return `<div class="flex items-start gap-1.5 ml-2 my-1 text-slate-700 font-sans"><span class="text-purple-500 select-none">•</span><span>${applyInlineFormatting(listText)}</span></div>`;
                    }

                    return applyInlineFormatting(line);
                  });

                  const htmlLines = formattedLines.join('<br />');

                  return (
                    <div 
                      className="break-words space-y-2 whitespace-normal animate-fade-in"
                      dangerouslySetInnerHTML={{ __html: htmlLines }} 
                    />
                  );
                })()}
              </div>
            )}

            {/* Word counters at raw bottom */}
            <div className="flex justify-between items-center text-xs text-gray-400 font-sans border-t border-gray-100 pt-3 mt-4">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span>{wordCount} words / {charCount} characters</span>
              </span>
              <span className="italic">Press ESC and exit safely anytime</span>
            </div>
          </div>
        </div>

        {/* Sidebar settings: Category selector, draft saving, password locks */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-md font-serif font-bold text-gray-900 border-b border-gray-50 pb-2">Classification</h3>

            {/* Category selection */}
            <div className="space-y-2">
              <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest">Reflection Category</label>
              
              {!isCustomCategoryMode ? (
                <div className="space-y-2">
                  <select
                    id="editor-category-select"
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === 'Custom') {
                        setIsCustomCategoryMode(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-purple-500 focus:outline-none text-gray-800 font-sans cursor-pointer bg-white"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Custom">+ Custom Category...</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      id="editor-custom-category-input"
                      type="text"
                      placeholder="e.g., Deep Meditation"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-purple-500 text-gray-800 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        setIsCustomCategoryMode(false);
                        setCategory('Daily Reflection');
                      }}
                      className="px-2 py-1.5 hover:bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-500 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tags builder */}
            <div className="space-y-2">
              <label className="block text-xs font-sans font-bold text-gray-400 uppercase tracking-widest">Filing Tags</label>
              <div className="flex gap-2">
                <input
                  id="editor-tag-input"
                  type="text"
                  placeholder="stress, work, clarity"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  className="flex-grow rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-purple-500 text-gray-800 focus:outline-none font-sans"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-1 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-xs font-medium text-gray-600 rounded-xl cursor-pointer"
                >
                  Add
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {tags.map((tg, idx) => (
                    <span 
                      key={tg} 
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-purple-50 text-purple-700 font-sans border border-purple-100"
                    >
                      <span>{tg}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(idx)} 
                        className="text-purple-400 hover:text-purple-700 font-bold ml-1 text-[10px]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Draft toggler */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <div>
                <label className="text-sm font-sans font-bold text-gray-800">Draft Mode</label>
                <p className="text-[10px] text-gray-400">Do not include in streak calculations</p>
              </div>
              <input
                id="draft-toggle"
                type="checkbox"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
                className="w-5 h-5 accent-purple-600 border-gray-300 rounded cursor-pointer"
              />
            </div>

            {/* Favorite toggle */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <div>
                <label className="text-sm font-sans font-bold text-gray-800">Mark Favorite</label>
                <p className="text-[10px] text-gray-400">Save inside your favorites panel</p>
              </div>
              <button
                id="favorite-toggle-btn"
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className="p-1 cursor-pointer"
              >
                <Star className={`w-6 h-6 ${isFavorite ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
              </button>
            </div>
          </div>

          {/* Secure Entry locker block */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                <h3 className="text-md font-serif font-bold text-gray-900">Lock diary page</h3>
              </div>
              <input
                id="page-lock-checkbox"
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
              />
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              If locked, this entry will hide its body contents on your main dashboard layout until you click unlock.
            </p>

            {isLocked && (
              <div className="pt-2 animate-fade-in space-y-2">
                <label className="block text-xs font-sans text-gray-500 font-bold">Lock Passcode Hint phrase</label>
                <input
                  id="lock-hint-input"
                  type="text"
                  placeholder="e.g. My childhood cat's name"
                  value={passwordHint}
                  onChange={(e) => setPasswordHint(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:ring-rose-500 focus:outline-none text-gray-800"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Animated Toast Container */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg border text-sm font-medium animate-bounce bg-white border-purple-100 text-purple-950">
          <Sparkle className="w-4 h-4 text-purple-500 animate-pulse" />
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:bg-slate-100 rounded-full p-1 cursor-pointer w-5 h-5 flex items-center justify-center">×</button>
        </div>
      )}

      {/* Dynamic Overlay Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-xl space-y-4">
            <h3 className="text-lg font-serif font-bold text-slate-950">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function LoaderSpinner() {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <div className="absolute w-12 h-12 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin"></div>
    </div>
  );
}

function eventIdSaveStatus(status: string) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        Saving...
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
        <Check className="w-3.5 h-3.5" />
        Synced
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
        <AlertTriangle className="w-3.5 h-3.5" />
        Offline
      </span>
    );
  }
  return null;
}
