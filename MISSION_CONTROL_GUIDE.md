# 🎯 Mission Control Layout - Quick Visual Guide

## How It Looks

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🎯 MISSION CONTROL | 11,992 🏢 | 2,847 ❌ | 8,945 ⚠️ | $2.48B 💰 | ⏰ 2:47PM ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🔍 Search: [................] Status: [All ▼] [Clear]                 ┃
┣━━━━━━━━┯━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┯━━━━━━━━━━━━━━━━┫
┃ LEFT   │ CENTER (PRIMARY VIEW)                     │ RIGHT          ┃
┃ 15%    │ 60%                                       │ 25%            ┃
┃        │                                           │                ┃
┃ 📊 KPIs│ [Table] [Map] [Analytics] [Network]       │ 🔍 DETAILS     ┃
┃        │                                           │                ┃
┃ 2,847  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │ Switch Michigan┃
┃ ❌ NC  │ ┃Name    State Oper.  Gap    Status ⋮┃  │                ┃
┃ [View] │ ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │ Status: ❌ NC  ┃
┃        │ ┃Switch  MI    State  $48.7M  ❌    ⋮┃◄─┼─Gap: $48.7M    ┃
┃ 8,945  │ ┃AWS VA  VA    AWS    $12.3M  ⚠️    ⋮┃  │ Jobs: 26/1000  ┃
┃ ⚠️ AR  │ ┃MS AZ   AZ    MS     $8.9M   ✅    ⋮┃  │                ┃
┃ [View] │ ┃...                                 ┃  │ [View Report]  ┃
┃        │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │ [Generate FOIA]┃
┃ $2.48B │ Showing 11,992 facilities              │ [Add Watch]    ┃
┃ 💰 Gap │                                           │ [Export]       ┃
┃        │                                           │                ┃
┃ ━━━━━━ │                                           │ 📊 Mini Charts ┃
┃ FILTERS│                                           │ ▂▃▅▇▃▂▁       ┃
┃ State: │                                           │                ┃
┃ [MI ▼] │                                           │                ┃
┃ Oper.: │                                           │                ┃
┃ [All▼] │                                           │                ┃
┃        │                                           │                ┃
┃ 🔔     │                                           │                ┃
┃ 67     │                                           │                ┃
┃ ALERTS │                                           │                ┃
┣━━━━━━━┷━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┷━━━━━━━━━━━━━━━━┫
┃ Data: EPA, BLS, Census | Last: 1/1/26 2:47 PM | [Export ⬇]         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## 🎨 Color Coding

### Status Colors (Compliance)
- ✅ **Green** = Compliant (meeting requirements)
- ⚠️ **Yellow** = At Risk (warning signs)
- ❌ **Red** = Non-Compliant (immediate action required)

### Metric Colors
- 🔵 **Cyan** = Interactive elements, primary actions
- 🟠 **Orange** = Money/subsidy gap
- 🟢 **Green** = Positive status
- 🔴 **Red** = Problems, alerts
- 🟡 **Yellow** = Warnings, at-risk items

## 🖱️ Interaction Guide

### Clicking Behavior
```
┌─────────────────────┐
│ CLICK LEFT PANEL    │
│ KPI Card            │──► Filters data by that metric
└─────────────────────┘

┌─────────────────────┐
│ CLICK TABLE ROW     │──► Opens detail panel on right
└─────────────────────┘    + Highlights row
                            + Shows facility info

┌─────────────────────┐
│ CLICK VIEW BUTTON   │──► Switches center panel view
└─────────────────────┘    (Table/Map/Analytics/Network)

┌─────────────────────┐
│ CLICK CHEVRON ◄►    │──► Collapses/expands panel
└─────────────────────┘    (left or right)
```

## 📊 Information Hierarchy

### Primary (Always Visible)
1. **Status Bar** - Top metrics, never hidden
2. **Center Panel** - Main workspace, largest area
3. **Search Bar** - Quick access to filtering

### Secondary (Collapsible)
1. **Left Panel** - KPIs and filters (toggle with ◄)
2. **Right Panel** - Facility details (toggle with ►)

### Tertiary (On Demand)
1. **Filter dropdowns** - Click to expand
2. **Detail sections** - Scroll in right panel
3. **Action buttons** - Click for modal/export

## 🚀 Quick Start Flow

```
START
  │
  ├─► Click Layout button in header
  │   (switches from Tab layout to Mission Control)
  │
  ├─► See all facilities in table (center panel)
  │   - Scan rows quickly
  │   - Status colors jump out
  │
  ├─► Filter if needed
  │   - Type in search bar, OR
  │   - Select status dropdown, OR
  │   - Use left panel filters
  │
  ├─► Click any facility row
  │   - Right panel opens
  │   - Shows all details
  │   - Quick actions available
  │
  ├─► Take action
  │   - View full report
  │   - Generate FOIA
  │   - Export data
  │   - Add to watchlist
  │
  └─► Repeat or switch view
      - Try Map/Analytics views
      - Collapse panels for more space
      - Keep working without context loss
```

## 🎯 Use Cases

### 1. Monitoring Compliance Status
**Goal**: See which facilities are non-compliant

**Steps**:
1. Look at status bar → see 2,847 NC facilities
2. Click "Non-Compliant" status filter
3. Scan table → sorted by gap amount
4. Click high-value facility
5. Review issues in right panel
6. Generate FOIA request

**Time**: < 10 seconds

---

### 2. Analyzing a Specific State
**Goal**: Review all Michigan facilities

**Steps**:
1. Left panel → State filter → type "MI"
2. Table shows 34 MI facilities
3. Click Switch Michigan (top row)
4. Right panel shows $48.7M gap, 26/1000 jobs
5. Export detailed report

**Time**: < 5 seconds

---

### 3. Finding High-Risk Facilities
**Goal**: Identify at-risk facilities before they become non-compliant

**Steps**:
1. Status bar shows 8,945 at-risk
2. Click status dropdown → "At Risk"
3. Table shows all 8,945
4. Click left panel "At Risk" KPI for quick filter
5. Review each facility quickly
6. Add priority ones to watchlist

**Time**: < 30 seconds for 20 facilities

---

### 4. Comparing Facilities
**Goal**: Compare two facilities side-by-side

**Steps**:
1. Click first facility → right panel shows details
2. Remember key metrics
3. Click second facility → right panel updates
4. (Future: multi-select for side-by-side)

**Time**: < 15 seconds

## 💡 Pro Tips

### Maximize Screen Space
- Hide left panel (◄ button) when not filtering
- Hide right panel (► button) when scanning table
- Both panels remember state

### Keyboard Shortcuts (Future)
- `Cmd/Ctrl + F` - Focus search
- `Cmd/Ctrl + [` - Toggle left panel  
- `Cmd/Ctrl + ]` - Toggle right panel
- `Cmd/Ctrl + 1-4` - Switch views (Table/Map/Analytics/Network)
- `Esc` - Deselect facility

### Color-Coded Scanning
- **Red rows** = Non-compliant, check first
- **Yellow rows** = At risk, monitor
- **Green rows** = Compliant, skip unless investigating

### Filter Combinations
Combine filters for precise targeting:
- State: "MI" + Status: "Non-Compliant"
- Operator: "AWS" + Status: "At Risk"
- Search: "Switch" + Gap: > $20M

## 📱 Responsive Behavior (Future)

### Desktop (1920px+)
- All three panels visible
- Full table width
- Side-by-side details

### Laptop (1440px)
- Panels slightly narrower
- Still three-column
- Scrollable if needed

### Tablet (1024px)
- Left panel collapsible by default
- Two-column: Center + Right
- Touch-friendly buttons

### Mobile (768px-)
- Stacked vertically
- One panel at a time
- Swipe between views

## 🔄 Toggle Back to Tab Layout

**When to use Tab Layout instead:**
- Deep analysis in one area (Pattern Lab, Intelligence Hub)
- Prefer guided navigation
- Working on specific detailed task
- Following a workflow

**How to toggle:**
1. Click Layout button in header
2. Instantly switches back
3. No data lost
4. Preference remembered (future)

---

**You're all set! The Mission Control layout is live and ready to use.** 🎉

Click the Layout button to try it, and enjoy 60-70% more data density!

