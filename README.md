# Serene Journal 🌸

An elegant, secure, full-stack digital journaling platform designed to help you capture daily thoughts, track moods, visualize emotional trends, and reflect with a premium, distraction-free interface.

---

## 🌟 Overview

**Serene Journal** provides a warm, personal, offline-ready sanctuary for daily introspections. Built with a premium, light-themed, modern glassmorphic interface, it avoids sterile dashboards in favor of a soothing design using lavenders, soft peaches, warm crimson tones, and gentle mint offsets. 

Equipped with a secure double-lock system (passcode lock for specific notes OR a global keypad shield for the entire application) and dynamic templates (like Morning Gratitude ☀️ or Evening Reflection 🌙), it helps you explore self-awareness over writer's block.

---

## ✨ Features

- **🔒 Double-Armor Security**:
  - **Global application shield**: Set a 4-digit PIN in Settings. Locks your entire journal on refresh/session initialization.
  - **Individual page lock**: Lock specific notes with separate custom password hint strings. Hide body contents from the main list.
- **📊 Interactive Custom SVG Analytics**:
  - **Mood progression Bézier line**: Visualizes natural shifts over your last 8 entries.
  - **Theme bento grids**: Categorizes distributions across your primary themes.
  - **Consistency activity grids**: Tracks your weekly logs consistency.
- **📝 Clean Writing Canvas**:
  - Intuitive workspace with automatic draft saving, real-time word counters, and automatic category filters.
- **🎨 Visual Space Customizer**:
  - Shift between 5 curated themes (Lavender Breeze 💜, Golden Apricot 🧡, Warm Crimson ❤️, Sage Meadow 💚, Vibrant Sea 💙).
- **📂 Vault Archiving**:
  - Real-time text search, favorite flags filters, category selectors, and custom calendar ranges.
  - Backup/Export your entire journal vault as a downloadable `.json` file or download individual pages as custom `.txt` files.

---

## 🛠️ Tech Stack

### Frontend
- **React 19**
- **TypeScript**
- **Tailwind CSS** (v4 integration)
- **Lucide Icons**

### Backend
- **Node.js** & **Express**
- **Local JSON-based DB with native File-System locking read/write cycles**
- **SHA-256 secure password hashing** and crypto random session identifiers

---

## 📂 Project Structure

```
├── .env.example              # Documented secrets and endpoint URLs
├── package.json              # Script directives and full packaging lists
├── server.ts                 # Full-stack Node/Express server and Vite API middleware
├── db.json                   # Mock persistent storage layout, default quotes & templates
├── src/
│   ├── main.tsx              # Application client entry module
│   ├── index.css             # Tailwind v4 CSS imports
│   ├── types.ts              # Share-ready full-stack TS interfaces
│   ├── App.tsx               # Primary Orchestrator React router, locks, and nav rails
│   └── components/
│       ├── AuthPage.tsx      # Sign-in/Registration forms with layout animations
│       ├── Dashboard.tsx     # Central hub, streak, quick launches, recent notes list
│       ├── JournalEditor.tsx # Formatters, canvas customize, auto-save
│       ├── ArchiveView.tsx   # Query criteria text search & locks decryption input
│       ├── JournalCalendar.tsx # Monthly calendar showing daily mood emoji indicators
│       ├── AnalyticsView.tsx # Custom Bézier charts
│       └── SettingsView.tsx  # Profiles customizers, theme settings, PIN keypad toggle
```

---

## 🚀 Installation & Launch

To run the application locally:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

The application will bind to port `3000`. Open `http://localhost:3000` in your web browser to start using Serene Journal!

---

## ✍️ License

Licensed under the Apache-2.0 License.
