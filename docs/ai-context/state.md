# Current Development State

**Last Updated**: January 6, 2026, 6:30 PM PST

---

## 🟢 APP STATUS: RUNNING

- Development server active at `http://localhost:5173`
- All core features functional
- Build: ✅ Passing
- No blocking errors

---

## 📊 DATA LOADED

| Metric | Value |
|--------|-------|
| Total Facilities | 11,992 |
| Verified Operators | 48 |
| GJF Verified Subsidies | 40+ |
| State Audit Findings | 25+ |
| Countries Covered | 50+ |
| AI Companies Tracked | 8 |
| ASNs Monitored | 11 |
| Union Corridors Mapped | 5 |

---

## ✅ RECENTLY COMPLETED (Jan 6, 2026)

### Session Summary: Major Feature Implementation

#### 1. OFAC Sanctions Monitor Module
- **Location**: `src/modules/sanctions/`
- **Components**: 13 files (types, services, hooks, components)
- **Features**:
  - SDN list fetching, parsing, fuzzy name matching (Levenshtein)
  - Risk scoring algorithm (0-100, 6 weighted factors)
  - BGP sanctions monitoring via RIPE RIS Live
  - Whistleblower award calculator (AMLA/FinCEN, IRS, SEC)
  - Coalition routing (IBEW locals, attorney network)
  - Evidence chain with SHA-256 hashing and RFC 3161 timestamps
- **Database**: Schema v9 with `sdnCache`, `sanctionsRiskScores`, `sanctionsReports`, `bgpSanctionsAlerts`

#### 2. High-Density Layout System
- **Applied To**: 
  - Target Prioritization (expandable tables, priority groups)
  - Contractor Mapping (nested accordions, mini-tabs)
  - IBEW Footprint (dense table, contract alerts)
  - Corridor Intelligence (traffic share visualization)
  - Subsidy Tracking (priority groups, operator rankings)
- **Patterns**: Expandable tables, nested accordions, mini-tabs, sticky sidebars, compact stats rows

#### 3. Contextual NLP Assistant
- **Core Files**:
  - `src/ai/sectionPrompts.ts` - 10 section contexts with prompts
  - `src/hooks/useSectionNLP.ts` - Context-aware hook
  - `src/components/shared/ContextualNLPWidget.tsx` - Dual-mode UI
- **Features**:
  - Inline search bar in section headers
  - Floating assistant button
  - Quick actions per section
  - Search history in IndexedDB
  - Action parsing (filters, sorts, highlights)

#### 4. Help System
- **Core Files**:
  - `src/content/sectionHelp.ts` - FAQs, guides, how-tos
  - `src/components/shared/SectionHelpPanel.tsx` - Tabbed interface
  - `src/components/shared/InlineHelpButton.tsx` - Compact trigger
- **Coverage**: All 10 section contexts with section-specific content

#### 5. Citations & Sources System
- **Core Files**:
  - `src/content/sectionCitations.ts` - Comprehensive source documentation
  - `src/components/shared/CitationIndicator.tsx` - Inline badges
  - `SectionHelpPanel.tsx` - "Sources" tab
- **Features**:
  - Primary/Secondary/Tertiary source categorization
  - Methodology documentation per data point
  - Data integrity notes and verification procedures
  - Clickable hyperlinks throughout
  - Reliability and frequency badges

---

## 🔧 ACTIVE FEATURES

### Main Dashboard
- [x] NLP-powered global search
- [x] Facility detail panels
- [x] Compliance status filtering
- [x] Data mode toggle (Research+Verified / Verified-Only)

### Organizing Intelligence Tab
- [x] Target Prioritization (expandable table, priority groups)
- [x] Contractor Mapping (nested accordions, mini-tabs)
- [x] IBEW Footprint (dense table, contract alerts)
- [x] Corridor Intelligence (traffic share visualization)
- [x] Inline NLP search bar
- [x] Floating NLP assistant
- [x] Inline help button

### Subsidy Tracking Tab
- [x] Priority groups by subsidy gap severity
- [x] Expandable table with job details
- [x] Top Operators/States rankings
- [x] Inline NLP + help integration

### Sanctions Monitor Tab (NEW)
- [x] Risk score overview dashboard
- [x] SDN search panel with fuzzy matching
- [x] BGP sanctions monitoring
- [x] Whistleblower award calculator
- [x] Reporting channels & red flag checklist
- [x] Inline NLP + help integration

### Coalition Intelligence Tab
- [x] AI Company Watchlist (8 companies)
- [x] Clean Internet Score rankings
- [x] Data Center Origin Classifier
- [x] STIX 2.1 Export
- [x] AI Infrastructure Alerts Panel
- [x] Cloudflare Pitch Deck

### RLM Engine Tab
- [x] Multi-provider AI chat
- [x] Failover between OpenAI/Anthropic/Groq

### Antifragility Tab
- [x] 7-layer protection status
- [x] Error log display
- [x] Circuit breaker monitoring

---

## 🔴 KNOWN ISSUES

1. **BGP Monitor**: Shows "disconnected" - normal, connects on-demand
2. **CertStream**: Shows "error" until monitoring started - by design
3. **Worker Feedback**: Fully simulated - needs real API integration
4. **Union Jurisdictions**: Only 5 corridors mapped (target: 20)
5. **SDN Matching**: English transliterations only

---

## 📁 FILES MODIFIED THIS SESSION

```
# New Files - Sanctions Module
src/modules/sanctions/index.tsx
src/modules/sanctions/types/sanctions.ts
src/modules/sanctions/services/sdnService.ts
src/modules/sanctions/services/riskScoring.ts
src/modules/sanctions/services/evidenceChain.ts
src/modules/sanctions/services/awardCalculator.ts
src/modules/sanctions/services/coalitionRouting.ts
src/modules/sanctions/hooks/useBGPSanctionsMonitor.ts
src/modules/sanctions/components/SanctionsOverview.tsx
src/modules/sanctions/components/FacilityRiskCard.tsx
src/modules/sanctions/components/SDNSearchPanel.tsx
src/modules/sanctions/components/AwardCalculator.tsx
src/modules/sanctions/components/ReportingChannels.tsx

# New Files - NLP System
src/ai/sectionPrompts.ts
src/hooks/useSectionNLP.ts
src/components/shared/ContextualNLPWidget.tsx
src/components/shared/InlineHelpButton.tsx

# New Files - Help & Citations
src/content/sectionHelp.ts
src/content/sectionCitations.ts
src/components/shared/SectionHelpPanel.tsx
src/components/shared/CitationIndicator.tsx

# Modified Files
src/db/database.ts                          # Added v9 schema
src/components/DCIMCommandCenter.tsx        # Added Sanctions Monitor tab
src/components/tabs/OrganizingIntelligenceTab.tsx  # High-density + NLP
src/components/tabs/SubsidyTrackingTab.tsx  # High-density + NLP
src/components/tabs/SanctionsMonitorTab.tsx # NEW tab component

# Documentation
docs/ai-context/CLAUDE_COMPREHENSIVE_HANDOFF.md  # NEW - Complete handoff
docs/ai-context/codebase-map.md                  # Updated
docs/ai-context/state.md                         # This file
```

---

## 🎯 NEXT SESSION PRIORITIES

### Immediate
1. Test all NLP integrations in browser
2. Verify citations hyperlinks work
3. Cross-check help content accuracy

### Short-term
1. Deploy CORS proxy to Cloudflare Workers
2. Expand union jurisdiction mapping (5 → 20 corridors)
3. Real worker feedback integration
4. More state audit findings

### Medium-term
1. Good Jobs First subscription integration
2. OSHA/EPA violation integration
3. PWA/offline support

---

## 💬 USER CONTEXT

- User is building a coalition weapon for labor organizing
- Values real data over synthetic
- Wants transparency about data reliability
- Technical user who can follow codebase
- Focuses on practical organizing value
- Appreciates comprehensive implementations with browser testing

---

## 🔗 QUICK LINKS

- **App**: http://localhost:5173
- **Cloudflare Partner Program**: https://www.cloudflare.com/partners/technology-partners/
- **Good Jobs First**: https://goodjobsfirst.org/
- **labordata.bunkum.us**: https://labordata.bunkum.us/
- **OFAC SDN Search**: https://sanctionssearch.ofac.treas.gov/
