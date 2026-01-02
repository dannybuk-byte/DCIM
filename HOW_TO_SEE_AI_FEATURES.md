# How to See Your New AI Features 🎯

## Feature 1: AI Settings ⚙️

### Where to Find It:
```
1. Look at the TOP BAR (always visible)
2. Find the cyan "AI" button next to the fullscreen button
3. Click it!
```

### What You'll See:
- **Modal titled "AI Settings"** with sparkle icon
- **Info banner** explaining AI is optional
- **Provider selection**: None / OpenAI / Anthropic
- **API Key input** with Show/Hide button
- **Model dropdown** (auto-selects best model)
- **Enable toggle** (on/off without deleting key)
- **Usage stats** (if you've made queries)
- **Save/Cancel buttons** at bottom

### Visual:
```
┌─────────────────────────────────────────────────┐
│  ✨ AI Settings                           ✕    │
├─────────────────────────────────────────────────┤
│  ℹ️  AI Features are Optional                   │
│  The dashboard works without AI. Providing...   │
│  • Natural language search                      │
│  • AI-generated summaries                       │
│  • Advanced investigation assistance            │
├─────────────────────────────────────────────────┤
│  AI Provider:                                   │
│  ┌─────┐  ┌────────┐  ┌──────────┐            │
│  │None │  │ OpenAI │  │Anthropic │            │
│  └─────┘  └────────┘  └──────────┘            │
│                                                 │
│  API Key:                                       │
│  ┌─────────────────────────────┐ [Show]        │
│  │ sk-...                      │               │
│  └─────────────────────────────┘               │
│  🔑 Get an API key from OpenAI →               │
│                                                 │
│  Model:                                         │
│  ┌─────────────────────────────┐               │
│  │ gpt-4-turbo-preview   ▼    │               │
│  └─────────────────────────────┘               │
│                                                 │
│  Enable AI Features          [ ●────── ]  ON   │
│                                                 │
│                      [Cancel]  [Save Settings]  │
└─────────────────────────────────────────────────┘
```

---

## Feature 2: Investigation Templates 🎯

### Where to Find It:
```
1. Click "DEEP" view mode button (in top bar)
2. Scroll down to see facility cards
3. Click ANY facility card to expand it
4. Make sure you're on the "OVERVIEW" tab (default)
5. Scroll down past "Basic Information" and "Live Status"
6. You'll see "Quick Investigations" section
```

### What You'll See:
- **Header**: "Quick Investigations" with target icon
- **Description**: "Pre-built queries for [facility name]"
- **3 Categories** (collapsible):
  - **Tracking** (6 templates) - "Largest Subsidy Gaps", "Recently Opened", etc.
  - **Comparison** (3 templates) - "Regional Comparison", "Operator Track Record", etc.
  - **Analysis** (2 templates) - "Highest Gap Per Job", "Recent Non-Compliance"

### Visual (Collapsed):
```
┌─────────────────────────────────────────────────┐
│  🎯 Quick Investigations                        │
│  Pre-built queries for Amazon AWS DC-TX-01      │
├─────────────────────────────────────────────────┤
│  ▶ Tracking (6 templates)                       │
├─────────────────────────────────────────────────┤
│  ▶ Comparison (3 templates)                     │
├─────────────────────────────────────────────────┤
│  ▶ Analysis (2 templates)                       │
└─────────────────────────────────────────────────┘
```

### Visual (Expanded - Tracking Category):
```
┌─────────────────────────────────────────────────┐
│  🎯 Quick Investigations                        │
│  Pre-built queries for Amazon AWS DC-TX-01      │
├─────────────────────────────────────────────────┤
│  ▼ Tracking (6 templates)                       │
│  ┌───────────────────────────────────────────┐  │
│  │ ⚠️  Largest Subsidy Gaps                  │  │
│  │    Top 50 facilities with biggest         │  │
│  │    subsidy shortfalls                     │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ 📅 Recently Opened Facilities             │  │
│  │    Facilities opened in the last 2 years  │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ 📉 Complete Job Failures                  │  │
│  │    Facilities that created <10% of        │  │
│  │    promised jobs                          │  │
│  └───────────────────────────────────────────┘  │
│  ... (3 more templates)                         │
└─────────────────────────────────────────────────┘
```

### After Clicking a Template (Results Modal):
```
┌─────────────────────────────────────────────────┐
│  ⚠️  Largest Subsidy Gaps                  ✕   │
├─────────────────────────────────────────────────┤
│  Found 50 facilities. Total subsidy gap:        │
│  $2.48B. 42 non-compliant (84%)                 │
├─────────────────────────────────────────────────┤
│  #1  🔴 Switch Michigan DC                      │
│      Grand Rapids, MI • Switch                  │
│      $127.3M subsidy gap                        │
│      26/1000 jobs ────────────────────────►     │
│                                                 │
│  #2  🔴 Google DC Iowa-1                        │
│      Council Bluffs, IA • Google                │
│      $94.8M subsidy gap                         │
│      120/800 jobs ────────────────────────►     │
│                                                 │
│  #3  🔴 Amazon AWS Ohio-3                       │
│      Columbus, OH • Amazon                      │
│      $78.2M subsidy gap                         │
│      215/1200 jobs ────────────────────────►    │
│                                                 │
│  ... (47 more)                                  │
│                                                 │
│  Click any facility to view detailed info       │
└─────────────────────────────────────────────────┘
```

---

## Quick Test Workflow 🧪

### Test AI Settings:
```bash
1. Open http://localhost:5173
2. Click cyan "AI" button in top bar
3. Modal opens → you see provider options
4. Click "Cancel" to close
✅ Success!
```

### Test Investigation Templates:
```bash
1. Click "DEEP" button in top bar
2. Wait for facilities to load (11,992 facilities)
3. Click first facility card (anywhere on the card)
4. Facility expands → you see tabs (Overview, Financial, etc.)
5. Scroll down in the Overview tab
6. Look for "Quick Investigations" section
7. Click "▶ Tracking" to expand
8. Click "Largest Subsidy Gaps" template
9. Watch loading animation
10. Results modal opens with 50 facilities
11. Click any facility in results
12. Modal closes, facility expands and scrolls into view
✅ Success!
```

---

## Troubleshooting 🔧

### "I don't see the AI button"
- Make sure dev server is running: `npm run dev`
- Refresh the page (Cmd+R on Mac)
- Check console for errors (Cmd+Option+C → Console tab)

### "I don't see Investigation Templates"
- Make sure you clicked "DEEP" view mode (not OMNI, HUD, etc.)
- Make sure you expanded a facility (click the card)
- Make sure you're on "Overview" tab (should be default)
- Scroll down - it's below "Basic Information" and "Live Status"

### "Templates are loading forever"
- Check browser console for errors
- Make sure IndexedDB has facility data (should seed on first load)
- Try refreshing the page

### "Modal won't close"
- Press Escape key
- Click X in top-right corner of modal
- Click "Cancel" button (AI Settings)

---

## Next Features (Week 2) 🚀

When these are implemented, you'll be able to:

1. **Natural Language Search:**
   - Type: "Show me non-compliant facilities in Texas"
   - Get instant structured results
   - No need to use filters manually

2. **AI Summaries:**
   - Click a facility
   - See AI-generated summary in Overview tab
   - "Amazon AWS Texas-3 is significantly non-compliant..."

3. **Anomaly Detection:**
   - Red warning badges appear automatically
   - "This facility's subsidy gap is 347% above regional average"
   - Statistical outliers highlighted

---

**All working?** ✅ Ready for Week 2!  
**Having issues?** 🐛 Check the console or let me know!

