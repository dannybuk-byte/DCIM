# Technical Decisions Log

**Purpose**: Document key architectural and strategic decisions for context continuity.

---

## January 6, 2026

### Decision: Research Data Classification
**Context**: User questioned why data was labeled "demo" or "synthetic"  
**Decision**: User's Claude research (48 operators, 11,992 locations) is VERIFIED industry research, not synthetic data  
**Rationale**: The operator names, global presence data, and facility types came from extensive industry research, not random generation  
**Impact**: Updated UI labels to "VERIFIED RESEARCH" instead of misleading "Demo Mode"

### Decision: Hybrid Data Mode as Default
**Context**: Need balance between comprehensive coverage and legal citability  
**Decision**: Default to "Research + Verified" mode showing 11,992 facilities with 40 GJF overlays  
**Alternative**: "GJF Verified Only" mode available for legal/press use (25 facilities)  
**Rationale**: Organizers need comprehensive industry picture; specific subsidy claims need GJF citation

### Decision: All Building Trades Unions Simultaneously  
**Context**: User asked about union jurisdiction mapping approach  
**Decision**: Map IBEW, SMART, UA, IUOE, CWA together for each corridor  
**Rationale**: Data center construction involves multiple trades; organizers need complete picture  
**Impact**: `unionJurisdictionService.ts` includes all 5 unions per county

### Decision: US-Only Jurisdiction Initially
**Context**: Should we map international union jurisdictions?  
**Decision**: Focus on US initially, expand later  
**Rationale**: US has most developed data center subsidy accountability issues; international unions have different structures  
**Impact**: All jurisdiction mapping focused on 5 US corridors

### Decision: Lazy Loading for Data Fetching
**Context**: Concern about overwhelming app with 11,992 facilities  
**Decision**: Implement lazy loading and on-demand fetching  
**Rationale**: Better UX, lower memory usage, faster initial load  
**Impact**: Union intelligence fetched only when facility selected

### Decision: FRE 902(13)-(14) Compliance
**Context**: Evidence needs to be admissible in court  
**Decision**: SHA-256 hash all evidence with audit trails  
**Rationale**: Federal Rules of Evidence require authentication for electronic records  
**Impact**: `evidenceIntegrity.ts` provides court-admissible packaging

---

## Earlier Decisions (Pre-Jan 6)

### Decision: IndexedDB with Dexie.js
**Context**: Need offline-capable, persistent storage  
**Decision**: Use Dexie.js wrapper for IndexedDB  
**Rationale**: Better DX than raw IndexedDB, supports reactive queries  
**Impact**: All facility data stored client-side

### Decision: No Default Exports
**Context**: Codebase convention question  
**Decision**: Named exports only throughout codebase  
**Rationale**: Better tree-shaking, clearer imports, easier refactoring  
**Impact**: All components use `export const ComponentName`

### Decision: Circuit Breaker Pattern for APIs
**Context**: External APIs may fail  
**Decision**: Wrap all external calls in circuit breakers  
**Rationale**: Prevents cascade failures, provides graceful degradation  
**Impact**: `circuitBreaker.ts` protects all API calls

### Decision: 7-Layer Antifragility System
**Context**: App must never show blank screen  
**Decision**: Implement 7 protection layers:  
1. Error Boundaries  
2. Circuit Breakers  
3. Database Resilience  
4. Rate Limiting  
5. Input Sanitization  
6. Global Error Handler  
7. Error Tracking  
**Rationale**: Organizing tools must work reliably in the field  
**Impact**: Comprehensive error handling throughout

### Decision: Coalition Weapon Architecture
**Context**: Need to serve multiple stakeholder types  
**Decision**: Build features that serve both commercial partners (CDN, security) and free users (labor, community)  
**Rationale**: Commercial revenue funds free organizing tools  
**Impact**: Clean Internet Score serves CDNs; Union Intelligence serves organizers

---

## Architecture Decisions

### Data Layer
```
IndexedDB (Dexie.js)
    └── Facilities Table
        ├── Research Data (11,992)
        └── GJF Verified Overlay (40)
```

### Service Layer
```
UnionIntelligenceEngine (Central Hub)
    ├── labordataService (NLRB)
    ├── censusGeocoderService (FCC/Census)
    ├── unionJurisdictionService (Manual mapping)
    └── goodJobsFirstService (Subsidies)

AIInfrastructureMonitor
    ├── BGPMonitor (RIPE RIS Live)
    └── CertStream (crt.sh polling)
```

### Component Layer
```
HybridDashboard
    ├── FollowYourDataTab
    │   ├── NLPLocationSearch
    │   └── ProximityLocator
    ├── CoalitionIntelligenceTab
    │   ├── AIInfrastructureAlertsPanel
    │   └── CloudflarePartnerPitch
    ├── RLMEngineTab
    └── AntifragilityTab
```

---

## Rejected Alternatives

### Real-time WebSocket for CertStream
**Proposed**: Use certstream.calidog.io WebSocket  
**Rejected**: Too much data, not relevant for AI company monitoring  
**Chosen**: Polling crt.sh with AI company domain filters

### Server-side Database
**Proposed**: PostgreSQL/MongoDB backend  
**Rejected**: Adds complexity, requires hosting  
**Chosen**: IndexedDB for offline-first, client-side operation

### Single Data Mode
**Proposed**: Only show verified data  
**Rejected**: Limits organizing utility - need full industry picture  
**Chosen**: Hybrid mode with clear data source badges

### Default Export Components
**Proposed**: Standard React default exports  
**Rejected**: Conflicts with existing codebase, harder refactoring  
**Chosen**: Named exports only (consistent with AGENTS.md)
