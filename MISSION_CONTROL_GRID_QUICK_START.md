# Mission Control Grid - Quick Start Guide

## 🚀 Launching the New Architecture

The Mission Control Grid is now live! To use it:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **The new interface loads automatically** (controlled in `App.tsx`)

3. **To toggle back to old dashboard:**
   ```typescript
   // In src/App.tsx, line 18:
   const [useNewArchitecture, setUseNewArchitecture] = useState(true);
   
   // Change to false to use old DCIMCommandCenter
   ```

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` or `Ctrl+K` | Open command palette |
| `Esc` | Close any modal |
| Type in search | Real-time filter facilities |

## 🎯 Common Workflows

### Find Non-Compliant Facilities

**Method 1: Quick Filter**
1. Click the **Compliance** dropdown
2. Select "Non-compliant"
3. Results filter instantly

**Method 2: Command Palette**
1. Press `⌘K`
2. Type "non-compliant"
3. Press Enter

### Compare Facilities Side-by-Side

1. Click the **Dual Pane** button (▢▢ icon)
2. Click any facility in the left pane
3. Details appear in right pane
4. Enable **Sync Scroll** (🔗 icon) to scroll both panes together

### Create a Saved Filter Preset

1. Set your filters (e.g., Region: West, Compliance: Non-compliant)
2. Click **Save** button in filter bar
3. Enter a name like "West Coast Non-Compliant"
4. Access later from **Presets** dropdown

### View Geographic Breakdown

1. Click **Quad View** (▢▢▢▢ icon)
2. Bottom-left pane shows states ranked by subsidy gap
3. Click any state to see facilities

## 📊 Layout Modes

### Single Pane (▢)
- **Best for:** List browsing, searching
- **Shows:** Full-width facility list with search

### Dual Pane (▢▢)
- **Best for:** Reviewing individual facilities
- **Shows:** 60% list + 40% detail panel
- **Bonus:** Toggle synchronized scrolling with 🔗 button

### Quad View (▢▢▢▢)
- **Best for:** Comprehensive analysis
- **Shows:** 
  - Top-left: Facility list
  - Top-right: Selected facility details
  - Bottom-left: Geographic state breakdown
  - Bottom-right: Compliance timeline

## 🔍 Search & Filter

### Search Box
Full-text search across:
- Facility name
- Operator
- City
- State

### Quick Filters
- **Status:** Active/Inactive
- **Region:** Northeast, Midwest, South, West
- **Compliance:** Compliant, Non-compliant, Under Review

### Filter Presets
Save your most-used filter combinations:
1. Configure filters
2. Click "Save"
3. Name your preset
4. Load anytime from "Presets" dropdown

## 🎨 Visual Indicators

### Compliance Status Dots
- 🟢 Green = Compliant (≥90% jobs created)
- 🟡 Yellow = Under Review (50-89%)
- 🔴 Red = Non-compliant (<50%)

### Card States
- **Blue border** = Selected facility
- **Hover** = Border turns cyan
- **Expanded** = Shows 4 detailed metrics

## 🛠️ Technical Features

### Performance
- **Virtual scrolling** handles 11,992 facilities
- **Debounced search** prevents lag
- **React.memo** optimizes rendering
- **IndexedDB** for offline access

### Data Persistence
- Filter presets saved to `localStorage`
- Survives page refreshes
- Syncs across browser tabs

### Accessibility
- Full keyboard navigation
- ARIA labels on all controls
- Screen reader compatible
- High contrast mode support

## 🐛 Troubleshooting

### "No facilities match the current filters"
- Click **Clear** in the filter bar
- Check if data is loaded (run seed script if needed)

### Command palette not opening
- Check keyboard: Try both `⌘K` (Mac) and `Ctrl+K` (Windows/Linux)
- Browser shortcut conflict? Close other tabs

### Sync scroll not working
- Only available in **Dual Pane** mode
- Toggle off/on with 🔗 button
- Check both panes are scrollable

### Filters not persisting
- Check browser localStorage is enabled
- Private/Incognito mode doesn't persist
- Try exporting/importing data

## 📚 Next Steps

- Read full architecture docs: `MISSION_CONTROL_GRID_ARCHITECTURE.md`
- Customize color scheme in component constants
- Add custom filter presets for your workflow
- Explore command palette commands

## 💡 Pro Tips

1. **Use command palette for everything** - Press `⌘K` and type what you want
2. **Save presets for recurring queries** - Michigan non-compliant, West Coast review, etc.
3. **Quad view for presentations** - All key metrics in one screen
4. **Sync scroll for comparisons** - Perfect for before/after analysis
5. **Search by operator** - Find all facilities by a specific company

---

**What's Your Move?**

The new Mission Control Grid gives you instant access to 11,992 facilities with:
- 3 layout modes
- Real-time filtering
- Saved presets
- Command palette navigation
- Geographic analysis

**Start holding data centers accountable at scale.**

