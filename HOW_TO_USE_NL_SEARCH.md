# How to Use Natural Language Search 🔍

## Where Is It?

**Location**: Omniscient View (OMNI button) - Top of page

```
┌──────────────────────────────────────────────────────────┐
│ DCIM OMNISCIENT      [OMNI][DEEP][HUD][TIME]...      AI  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ✨ Natural Language Search              [Show/Hide]     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🔍✨ Ask anything: 'Show me non-compliant...     │  │
│  │                                           [Search] │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  [Facility Grid Below]                                   │
└──────────────────────────────────────────────────────────┘
```

---

## Step-by-Step: Your First Search

### **Step 1: Type Your Query**

Click in the search box and type naturally:

```
"Show me non-compliant facilities in Texas"
```

### **Step 2: Press Enter (or click Search)**

The system will:
1. Show loading spinner (🔄)
2. Convert your query to structured filters
3. Search IndexedDB (11,992 facilities)
4. Display results in <2 seconds

### **Step 3: View Results**

You'll see:

```
┌──────────────────────────────────────────────────────┐
│ ✅ AI-Powered Search                                 │
│    Facilities where states: TX, status: Non-Compliant│
├──────────────────────────────────────────────────────┤
│ Results Summary:                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐   │
│  │ 147     │ │ 0       │ │ 147     │ │ $243M    │   │
│  │ Total   │ │ ✓       │ │ ✗       │ │ Gap      │   │
│  └─────────┘ └─────────┘ └─────────┘ └──────────┘   │
├──────────────────────────────────────────────────────┤
│ Results (147):                     [Clear Results]   │
│                                                       │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 🔴 Switch Michigan DC               $127.3M gap  │ │
│ │    Grand Rapids, MI • Switch                     │ │
│ │    Jobs: 26 / 1000 (3%)                          │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 🔴 Google DC Texas-5                 $94.8M gap  │ │
│ │    Austin, TX • Google                           │ │
│ │    Jobs: 120 / 800 (15%)                         │ │
│ └──────────────────────────────────────────────────┘ │
│ ... (145 more)                                       │
└──────────────────────────────────────────────────────┘
```

### **Step 4: Click a Facility**

Click any result card → facility details open

---

## Example Queries (Try These!)

### **Compliance Tracking:**
```
✓ "Show me non-compliant facilities in Texas"
✓ "Which facilities created fewer than 100 jobs?"
✓ "Find facilities with over $50M subsidy gap"
✓ "Non-compliant facilities opened after 2020"
```

### **Operator Research:**
```
✓ "Show me Google facilities with over $50M in subsidies"
✓ "Find Amazon data centers opened after 2020"
✓ "All Microsoft facilities in California"
✓ "Switch facilities that are non-compliant"
```

### **Geographic:**
```
✓ "Facilities in California or New York with high subsidy gaps"
✓ "Show me all data centers in Texas"
✓ "Find facilities in the Midwest"
```

### **Technical:**
```
✓ "Hyperscale facilities with capacity over 50 MW"
✓ "Show me colocation data centers"
✓ "Find edge computing facilities"
```

---

## Suggestions Dropdown

Click in the search box to see:

```
┌────────────────────────────────────────────────────┐
│ Recent Searches                                     │
│  🔍 Show me non-compliant facilities in Texas      │
│  🔍 Google facilities with over $50M                │
│  🔍 Which facilities created fewer than 100 jobs?   │
│                                                     │
│ Example Queries                                     │
│  ✨ Show me non-compliant facilities in Texas      │
│  ✨ Find Google facilities with over $50M...       │
│  ✨ Which facilities created fewer than 100 jobs?  │
│  ✨ Show me Amazon data centers opened after 2020  │
│  ✨ Facilities in California with high subsidy gaps│
│  ✨ Find hyperscale facilities with capacity...    │
└────────────────────────────────────────────────────┘
```

Click any suggestion to run instantly!

---

## Status Badges

After search, you'll see a badge indicating the method:

### **✅ AI-Powered Search** (Green)
```
Your API key was used
OpenAI GPT-4 parsed your query
Best accuracy (~95%)
Cost: ~$0.005 per query
```

### **💾 Cached Search** (Cyan)
```
Query was cached from previous search
Instant results (<100ms)
No API cost
Same as AI accuracy
```

### **🔤 Keyword Search** (Yellow)
```
No API key configured OR API failed
Used keyword matching fallback
Good accuracy (~70%)
Free, works offline
```

---

## Results Summary Cards

After each search, see 5 stat cards:

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 147      │ │ 0        │ │ 147      │ │ $243M    │ │ 15% ↓    │
│ Total    │ │ Compliant│ │ Non-     │ │ Total    │ │ Avg Job  │
│ Results  │ │          │ │ Compliant│ │ Gap      │ │ Rate     │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

- **Total Results**: Count of facilities matching query
- **Compliant**: Facilities meeting job promises
- **Non-Compliant**: Facilities failing to meet promises
- **Total Gap**: Sum of all subsidy gaps in results
- **Avg Job Rate**: Average job fulfillment % (↑ good, ↓ bad)

---

## Tips for Best Results

### ✅ **DO:**
- Be specific: "non-compliant Texas" > "Texas problems"
- Use numbers: "$50M" > "high subsidies"  
- Mention operators: "Google" > "search company"
- Include dates: "after 2020" > "recent"
- Try examples: Click suggestion dropdown

### ❌ **DON'T:**
- Too vague: "show me stuff"
- Misspellings: "Googel" (though AI will fix it!)
- Too complex: "Show me all facilities except..."
- Empty search: Type something first!

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Execute search |
| **Escape** | Close suggestions dropdown |
| **Click in input** | Show suggestions |
| **Clear button** | Reset search |

---

## Troubleshooting

### **"AI features not configured"**
→ Click AI button (top bar) → Add your OpenAI API key  
→ OR: Use keyword fallback (works without API)

### **"No results found"**
→ Try broader query: "Texas" instead of "Texas non-compliant"  
→ Check spelling  
→ Try an example query

### **"Rate limit exceeded"**
→ Wait 1 minute  
→ Or: Close & reopen browser to reset  
→ Queries are cached, so repeats are free

### **Slow performance**
→ First query after page load is slower (API call)  
→ Subsequent queries are cached (instant)  
→ Clear cache if needed: AI Settings → [hidden button]

---

## How It Works (Behind the Scenes)

```
1. USER TYPES: "Show me non-compliant facilities in Texas"
              ↓
2. SYSTEM:    Check cache → not found
              ↓
3. OPENAI:    Convert to structured query
              { states: ['TX'], complianceStatuses: ['Non-Compliant'], ... }
              ↓
4. DATABASE:  Query IndexedDB (11,992 facilities)
              Filter: state = 'TX' AND status = 'Non-Compliant'
              ↓
5. RESULTS:   147 facilities, $243M total gap
              ↓
6. CACHE:     Store for 24 hours (future queries instant)
              ↓
7. DISPLAY:   Show results with stats cards
```

---

## API Cost Breakdown

**With Your OpenAI API Key:**

| Activity | Tokens | Cost | Cached |
|----------|--------|------|--------|
| First query | ~500 | $0.005 | No |
| Repeat query | 0 | $0.000 | Yes (24h) |
| 100 unique queries | 50,000 | $0.50 | N/A |
| 100 queries (60% cache) | 20,000 | $0.20 | Yes |

**Estimated Monthly Cost:**
- Light use (10 queries): $0.05
- Moderate use (50 queries): $0.25
- Heavy use (200 queries): $1.00
- Power use (1000 queries): $5.00

**Without API Key:**
- All queries: $0.00 (keyword fallback)
- Accuracy: ~70% vs. 95%

---

## What's Next?

Try these power user features (coming soon):

1. **Advanced Filters** - Refine results after search
2. **Export Results** - Download CSV of search results
3. **Save Searches** - Bookmark favorite queries
4. **Alerts** - Get notified when new facilities match query

---

**Ready to search?** 🚀

Open http://localhost:5173 and try:  
**"Show me non-compliant facilities in Texas"**

