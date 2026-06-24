/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'db.json');

app.use(express.json());

// In-memory sessions map
// token -> userId
const sessions = new Map<string, string>();

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
const apiEnvKey = process.env.GEMINI_API_KEY;

if (apiEnvKey && apiEnvKey !== 'MY_GEMINI_API_KEY') {
  try {
    ai = new GoogleGenAI({
      apiKey: apiEnvKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini AI successfully initialized server-side');
  } catch (err) {
    console.error('Failed to initialize Google Gen AI: ', err);
  }
} else {
  console.warn('GEMINI_API_KEY not found in env variables. AI features will run in mock descriptive mode.');
}

// Helper to read database
async function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Default structure if missing
      const baseObj = { users: [], entries: [], quotes: [] };
      await fs.promises.writeFile(DB_PATH, JSON.stringify(baseObj, null, 2), 'utf-8');
      return baseObj;
    }
    const raw = await fs.promises.readFile(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading json db', error);
    return { users: [], entries: [], quotes: [], templates: [] };
  }
}

// Helper to write database
async function writeDB(data: any) {
  try {
    await fs.promises.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing json db', error);
  }
}

// Hash password with native Node.js crypto
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Authentication Middleware
const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required.' });
  }

  const userId = sessions.get(token);
  if (!userId) {
    return res.status(403).json({ error: 'Session is expired or invalid. Please log in again.' });
  }

  // Attach user identity metadata
  (req as any).userId = userId;
  next();
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }

  const db = await readDB();
  const lowerEmail = email.toLowerCase().trim();

  const existing = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const newUser = {
    id: crypto.randomUUID(),
    email: lowerEmail,
    passwordHash: hashPassword(password),
    name: name.trim(),
    avatarUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(name)}`,
    settings: {
      dailyReminderTime: '21:00',
      defaultCategory: 'Daily Reflection',
      pinLocked: false,
      theme: 'lavender',
    },
  };

  db.users.push(newUser);
  await writeDB(db);

  // Generate Token
  const token = crypto.randomUUID();
  sessions.set(token, newUser.id);

  // Exclude passwordHash in output
  const { passwordHash, ...userClean } = newUser;
  res.status(201).json({ token, user: userClean });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = await readDB();
  const lowerEmail = email.toLowerCase().trim();
  const user = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail);

  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  // Session Token
  const token = crypto.randomUUID();
  sessions.set(token, user.id);

  const { passwordHash, ...userClean } = user;
  res.json({ token, user: userClean });
});

// Get User Session / Verify Token
app.get('/api/auth/session', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No session provided.' });
  }

  const userId = sessions.get(token);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  const db = await readDB();
  const user = db.users.find((u: any) => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const { passwordHash, ...userClean } = user;
  res.json({ user: userClean });
});

// Update Settings / Passcode Lock
app.put('/api/auth/settings', authenticateToken, async (req, res) => {
  const userId = (req as any).userId;
  const { settings, name, avatarUrl } = req.body;

  const db = await readDB();
  const userIdx = db.users.findIndex((u: any) => u.id === userId);

  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (settings) {
    db.users[userIdx].settings = {
      ...db.users[userIdx].settings,
      ...settings,
    };
  }

  if (name) db.users[userIdx].name = name;
  if (avatarUrl) db.users[userIdx].avatarUrl = avatarUrl;

  await writeDB(db);

  const { passwordHash, ...userClean } = db.users[userIdx];
  res.json({ user: userClean });
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ==========================================
// JOURNAL ENTRY ENDPOINTS (CRUD & FILTERS)
// ==========================================

// Read journal entries
app.get('/api/entries', authenticateToken, async (req, res) => {
  const userId = (req as any).userId;
  const db = await readDB();

  let userEntries = db.entries.filter((entry: any) => entry.userId === userId);

  // Apply filters
  const { mood, category, search, tag, isFavorite, startDate, endDate } = req.query;

  if (mood) {
    userEntries = userEntries.filter((e: any) => e.mood === mood);
  }
  if (category) {
    userEntries = userEntries.filter((e: any) => e.category === category);
  }
  if (tag) {
    userEntries = userEntries.filter((e: any) => e.tags && e.tags.includes(tag as string));
  }
  if (isFavorite === 'true') {
    userEntries = userEntries.filter((e: any) => e.isFavorite);
  }
  if (startDate) {
    userEntries = userEntries.filter((e: any) => e.date >= (startDate as string));
  }
  if (endDate) {
    userEntries = userEntries.filter((e: any) => e.date <= (endDate as string));
  }
  if (search) {
    const searchLower = (search as string).toLowerCase();
    userEntries = userEntries.filter(
      (e: any) =>
        e.title.toLowerCase().includes(searchLower) ||
        e.text.toLowerCase().includes(searchLower) ||
        (e.tags && e.tags.some((t: string) => t.toLowerCase().includes(searchLower)))
    );
  }

  // Sort by date descending (most recent first)
  userEntries.sort((a: any, b: any) => b.date.localeCompare(a.date));

  res.json(userEntries);
});

// Create entry
app.post('/api/entries', authenticateToken, async (req, res) => {
  const userId = (req as any).userId;
  const { title, text, mood, category, isFavorite, tags, draft, isLocked, passwordHint, date } = req.body;

  if (!title || !mood || !category) {
    return res.status(400).json({ error: 'Title, mood, and category are required variables.' });
  }

  const db = await readDB();
  const entryId = crypto.randomUUID();
  const today = new Date().toISOString().substring(0, 10);

  const newEntry = {
    id: entryId,
    userId,
    date: date || today,
    title: title.trim(),
    text: text ? text.trim() : '',
    mood,
    category,
    isFavorite: !!isFavorite,
    tags: tags ? tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean) : [],
    draft: !!draft,
    isLocked: !!isLocked,
    passwordHint: passwordHint || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.entries.push(newEntry);
  await writeDB(db);

  res.status(201).json(newEntry);
});

// Update entry
app.put('/api/entries/:id', authenticateToken, async (req, res) => {
  const userId = (req as any).userId;
  const entryId = req.params.id;
  const updateData = req.body;

  const db = await readDB();
  const index = db.entries.findIndex((entry: any) => entry.id === entryId && entry.userId === userId);

  if (index === -1) {
    return res.status(404).json({ error: 'Journal entry not found or belongs to another account.' });
  }

  const current = db.entries[index];
  const updated = {
    ...current,
    ...updateData,
    date: updateData.date || current.date,
    title: updateData.title !== undefined ? updateData.title.trim() : current.title,
    text: updateData.text !== undefined ? updateData.text.trim() : current.text,
    mood: updateData.mood !== undefined ? updateData.mood : current.mood,
    category: updateData.category !== undefined ? updateData.category : current.category,
    isFavorite: updateData.isFavorite !== undefined ? !!updateData.isFavorite : current.isFavorite,
    tags: updateData.tags !== undefined ? updateData.tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean) : current.tags,
    draft: updateData.draft !== undefined ? !!updateData.draft : current.draft,
    isLocked: updateData.isLocked !== undefined ? !!updateData.isLocked : current.isLocked,
    passwordHint: updateData.passwordHint !== undefined ? updateData.passwordHint : current.passwordHint,
    updatedAt: new Date().toISOString(),
  };

  db.entries[index] = updated;
  await writeDB(db);

  res.json(updated);
});

// Delete entry
app.delete('/api/entries/:id', authenticateToken, async (req, res) => {
  const userId = (req as any).userId;
  const entryId = req.params.id;

  const db = await readDB();
  const initialLen = db.entries.length;
  db.entries = db.entries.filter((entry: any) => !(entry.id === entryId && entry.userId === userId));

  if (db.entries.length === initialLen) {
    return res.status(404).json({ error: 'Journal entry not found or unauthorized.' });
  }

  await writeDB(db);
  res.json({ success: true, message: 'Journal entry successfully removed.' });
});

// ==========================================
// SYSTEM METADATA ENDPOINTS
// ==========================================

// Get random quote
app.get('/api/quotes', async (req, res) => {
  const db = await readDB();
  const quotes = db.quotes || [];
  if (quotes.length === 0) {
    return res.json({ text: "Write your thoughts out, make them clear and elegant.", author: "Serene Notebook" });
  }
  const randomIdx = Math.floor(Math.random() * quotes.length);
  res.json(quotes[randomIdx]);
});

// Get templates
app.get('/api/templates', async (req, res) => {
  const db = await readDB();
  res.json(db.templates || []);
});

// ==========================================
// AI-POWERED GEMINI ENDPOINTS
// ==========================================

// Generate dynamic AI reflections on a specific entry
app.post('/api/ai/reflect', authenticateToken, async (req, res) => {
  const userId = (req as any).userId;
  const { entryId } = req.body;

  if (!entryId) {
    return res.status(400).json({ error: 'Entry ID is required to generate reflection.' });
  }

  const db = await readDB();
  const entryIdx = db.entries.findIndex((e: any) => e.id === entryId && e.userId === userId);

  if (entryIdx === -1) {
    return res.status(404).json({ error: 'Journal entry not found.' });
  }

  const entry = db.entries[entryIdx];

  if (!entry.text || entry.text.trim().length < 15) {
    return res.status(400).json({ error: 'Please write a bit more (at least 15 characters) before requesting AI analysis.' });
  }

  // Check if AI client is setup
  if (!ai) {
    // Return descriptive simulation mock data if no key is supplied
    console.log('Using mock response because Gemini credentials are not supplied');
    const mockReflections = {
      aiSummary: `Reflecting on your day under the category of ${entry.category}.`,
      aiReflection: "You are practicing self-awareness and validating your daily energy. It shows resilience and emotional honesty to look at your emotions head-on.",
      aiInsights: "Your text reveals clear attention to daily balance. Writing down details about your mood helps externalize feelings, lowering standard day-to-day anxiety stresses.",
      aiEncouragement: `Keep up the mindful writing. Tomorrow is a brand new page to explore and capture memories!`,
    };

    db.entries[entryIdx] = { ...entry, ...mockReflections };
    await writeDB(db);
    return res.json(db.entries[entryIdx]);
  }

  try {
    const prompt = `
      You are Serene Guide, an empathetic, non-judgmental, therapeutic journaling mentor.
      Analyse this journal entry and generate a thoughtful response in standard JSON.
      
      Entry Details:
      - Title: "${entry.title}"
      - Category: "${entry.category}"
      - Declared Mood: "${entry.mood}"
      - Text: "${entry.text}"
      - Date: "${entry.date}"
      
      Requirements:
      1. Summary (aiSummary): A kind, concise, 1-sentence recap of the core theme.
      2. Reflection (aiReflection): A validation, a gentle reframing, or a warm prompt pointing to their strengths and progress (2-3 sentences).
      3. Insights (aiInsights): A psychological/mindful analysis highlighting triggers, cognitive shifts, or self-realizations in their language.
      4. Encouragement (aiEncouragement): A small warm wish or therapeutic mini-question matching their mood (e.g. peaceful, sad, excited). Keep it deeply compassionate.

      Output must be parsed easily. Be concise and human. Avoid clinical jargon or preachy labels.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiSummary: { type: Type.STRING, description: 'Summary of the content' },
            aiReflection: { type: Type.STRING, description: 'Empathetic validation and reflection' },
            aiInsights: { type: Type.STRING, description: 'Mindful insights and triggers observed' },
            aiEncouragement: { type: Type.STRING, description: 'Comforting final reflection or custom encouragement prompt' },
          },
          required: ['aiSummary', 'aiReflection', 'aiInsights', 'aiEncouragement'],
        },
      },
    });

    const outputText = response.text ? response.text.trim() : '';
    if (!outputText) throw new Error('Empty response from model');

    const result = JSON.parse(outputText);

    // Save reflecting details to database
    db.entries[entryIdx] = {
      ...entry,
      aiSummary: result.aiSummary,
      aiReflection: result.aiReflection,
      aiInsights: result.aiInsights,
      aiEncouragement: result.aiEncouragement,
      updatedAt: new Date().toISOString(),
    };

    await writeDB(db);
    res.json(db.entries[entryIdx]);

  } catch (error: any) {
    console.error('Gemini error generating single-entry reflection', error);
    res.status(500).json({ error: 'Failed to generate real AI reflections. Please click retry or make sure secret keys are set.' });
  }
});

// Periodic/global growth patterns across multiple entries
app.post('/api/ai/growth-analysis', authenticateToken, async (req, res) => {
  const userId = (req as any).userId;
  const db = await readDB();

  // Pick up to past 10 entries for user
  const entries = db.entries
    .filter((e: any) => e.userId === userId && !e.draft)
    .sort((a: any, b: any) => b.date.localeCompare(a.date))
    .slice(0, 10);

  if (entries.length < 2) {
    return res.status(400).json({
      error: 'Write at least 2 non-draft journal entries to enable growth trend calculations. The AI needs historic content to extract reflections!',
    });
  }

  // Base metadata summarizing user entries for AI input
  const summarizedList = entries.map((e: any) => ({
    date: e.date,
    title: e.title,
    category: e.category,
    mood: e.mood,
    tags: e.tags,
    wordCount: e.text ? e.text.split(/\s+/).length : 0,
    snippet: e.text ? e.text.slice(0, 150) + '...' : '',
  }));

  if (!ai) {
    // Standard descriptive mock returned when no key
    console.log('Using mock response because Gemini API Key is missing for global analytics');
    return res.json({
      patternAnalysis: `You show steady participation across ${summarizedList.length} recent sessions. Your moods fluctuate naturally with activities, reflecting high emotional authenticity.`,
      growthInsights: `Your journals point to strong self-investigation in categories like "${summarizedList[0].category}". Keeping track of external triggers protects mental focus over time.`,
      suggestedPrompts: [
        `Looking back at your recent journal "${summarizedList[0].title}", what is one learning that sticks with you today?`,
        "If you could write a supportive note to yourself describing last week, what would it say?",
        "What micro-habit helped you maintain peace of mind during your recent reflective cycles?",
      ],
      moodEncouragement: "Your journal writing is a dynamic mirror. Continue setting goals and breathing deeply. You are growing inside every sentence.",
    });
  }

  try {
    const prompt = `
      You are Serene Guide. Analyze the user's recent ${summarizedList.length} journal entry snapshots.
      Provide a comprehensive JSON report on their recent emotional progress, resilience patterns, and growth trends.
      
      Entries snapshots (newest first):
      ${JSON.stringify(summarizedList, null, 2)}
      
      JSON Scheme response required:
      - patternAnalysis: A description of mood transitions, streak frequency trends, and category distribution patterns over time relative to their mood.
      - growthInsights: Specific, uplifting feedback identifying triggers or positive shifts. Praise their consistency.
      - suggestedPrompts: Exactly 3 future reflection prompts customized to their current themes to help them dive deeper.
      - moodEncouragement: A warm, motivational quote or wish tailored to their overall state. Keep it serene and beautifully worded.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patternAnalysis: { type: Type.STRING },
            growthInsights: { type: Type.STRING },
            suggestedPrompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            moodEncouragement: { type: Type.STRING },
          },
          required: ['patternAnalysis', 'growthInsights', 'suggestedPrompts', 'moodEncouragement'],
        },
      },
    });

    const rawResult = response.text ? response.text.trim() : '';
    if (!rawResult) throw new Error('AI produced empty content');

    const result = JSON.parse(rawResult);
    res.json(result);

  } catch (error) {
    console.error('Gemini error generating overall growth analysis', error);
    res.status(500).json({ error: 'AI Growth Report generation failed. Please try again later.' });
  }
});

// ==========================================
// VITE CLIENT INTEGRATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Start Vite development server as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serene Journal running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
