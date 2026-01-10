# DCIM Data Source Integrations

## Scraper Expansion Roadmap

This document outlines all available and planned data sources for the DCIM Compliance App.

---

## ✅ CURRENTLY IMPLEMENTED

### Government APIs
| Source | API | Status | CORS | Data Type |
|--------|-----|--------|------|-----------|
| **SEC EDGAR** | data.sec.gov | ✅ Working | ✅ Allowed | Financial filings, subsidy disclosures |
| **EPA ECHO** | echo.epa.gov | ⚠️ Sample | ❌ Blocked | Environmental violations, permits |
| **BLS** | api.bls.gov | ⚠️ Sample | ❌ Blocked | Employment data, wages |

### Decentralized Storage
| Source | Protocol | Status | Use Case |
|--------|----------|--------|----------|
| **IPFS** | ipfs.io gateway | ✅ Working | Decentralized file storage |
| **Nostr** | NIP-01 | ✅ Working | Censorship-resistant publishing |

---

## 🚀 EXPANSION PRIORITIES

### Tier 1: High-Value Government Sources (Free, No Auth)

#### 1. OSHA (Occupational Safety & Health Administration)
- **API**: api.dol.gov/V1/Safety
- **Data**: Workplace injuries, violations, inspections
- **Value**: Worker safety tracking at data centers
- **CORS**: Blocked (needs proxy or sample data)

#### 2. Census Bureau
- **API**: api.census.gov
- **Data**: Demographics, economic data by county
- **Value**: Community impact analysis
- **CORS**: ✅ Allowed

#### 3. FEMA Risk Index
- **API**: hazards.fema.gov/nri/
- **Data**: Natural hazard risk scores
- **Value**: Infrastructure resilience assessment
- **CORS**: ✅ Allowed

#### 4. FERC (Federal Energy Regulatory Commission)
- **API**: elibrary.ferc.gov
- **Data**: Energy infrastructure, power purchase agreements
- **Value**: Data center power consumption patterns
- **CORS**: Blocked

#### 5. OpenFEC (Campaign Finance)
- **API**: api.open.fec.gov
- **Data**: Campaign contributions, lobbying
- **Value**: Track Big Tech political influence
- **CORS**: ✅ Allowed (requires free API key)

### Tier 2: Infrastructure & Real Estate

#### 6. OpenStreetMap / Overpass
- **API**: overpass-api.de
- **Data**: Building footprints, infrastructure mapping
- **Value**: Identify unreported data center locations
- **CORS**: ✅ Allowed

#### 7. Permits & Construction (Open Cities)
- **API**: Various city open data portals
- **Data**: Building permits, zoning changes
- **Value**: Track expansion projects
- **CORS**: Varies

#### 8. PeeringDB
- **API**: peeringdb.com/api
- **Data**: Internet exchange points, network facilities
- **Value**: Map network infrastructure
- **CORS**: ✅ Allowed

### Tier 3: Corporate Intelligence

#### 9. OpenCorporates
- **API**: api.opencorporates.com
- **Data**: Company registrations, officers, filings
- **Value**: Corporate structure analysis
- **CORS**: ✅ Allowed (rate limited)

#### 10. USASpending
- **API**: api.usaspending.gov
- **Data**: Federal contracts, grants, subsidies
- **Value**: Track government contracts to Big Tech
- **CORS**: ✅ Allowed

#### 11. Subsidy Tracker (Good Jobs First)
- **Source**: goodjobsfirst.org
- **Data**: State/local subsidies database
- **Value**: THE primary source for subsidy tracking
- **Method**: Scraping (no API)

### Tier 4: News & Media Intelligence

#### 12. GDELT Project
- **API**: api.gdeltproject.org
- **Data**: Global news mentions, sentiment
- **Value**: Track media coverage of labor issues
- **CORS**: ✅ Allowed

#### 13. MediaCloud
- **API**: mediacloud.org
- **Data**: News coverage analysis
- **Value**: Track narrative around data centers
- **CORS**: Requires auth

### Tier 5: Environmental & Climate

#### 14. EIA (Energy Information Administration)
- **API**: api.eia.gov
- **Data**: Energy consumption, power plants
- **Value**: Data center energy usage patterns
- **CORS**: ✅ Allowed (requires free API key)

#### 15. EPA AirNow
- **API**: airnowapi.org
- **Data**: Air quality by location
- **Value**: Environmental impact monitoring
- **CORS**: ✅ Allowed (requires free API key)

#### 16. WRI Water Aqueduct
- **API**: wri.org/aqueduct
- **Data**: Water stress by basin
- **Value**: Data center water usage impact
- **CORS**: ✅ Allowed

### Tier 6: Job & Labor Market

#### 17. Indeed/Glassdoor (Adversarial)
- **Method**: Scraping
- **Data**: Job postings, salaries, reviews
- **Value**: Actual hiring vs promises
- **Risk**: Terms of Service violation

#### 18. H1B Salary Database
- **API**: h1bdata.info (unofficial)
- **Data**: H1B visa filings, salaries
- **Value**: Tech worker wage analysis
- **CORS**: Varies

#### 19. LinkedIn (Adversarial)
- **Method**: Browser extension or scraping
- **Data**: Employee counts, job postings
- **Value**: Track hiring promises vs reality
- **Risk**: ToS violation, rate limiting

---

## IMPLEMENTATION PRIORITY

### Phase 1: Quick Wins (CORS-Friendly)
1. ✅ SEC EDGAR (done)
2. Census Bureau API
3. USASpending Federal Contracts
4. OpenCorporates
5. PeeringDB

### Phase 2: High-Value (Needs Proxy)
1. OSHA Workplace Safety
2. EIA Energy Data
3. FEMA Risk Index
4. Good Jobs First Subsidy Tracker

### Phase 3: Advanced Intelligence
1. GDELT News Intelligence
2. OpenStreetMap Infrastructure
3. OpenFEC Campaign Finance

### Phase 4: Adversarial Interoperability
1. LinkedIn Alt-Client
2. Glassdoor Scraper
3. Indeed Job Tracker

---

## TECHNICAL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    DCIM Scraper Engine                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Direct APIs  │  │ Proxy APIs   │  │ Adversarial  │      │
│  │ (CORS OK)    │  │ (CORS Block) │  │ (Scrapers)   │      │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤      │
│  │ • SEC EDGAR  │  │ • EPA ECHO   │  │ • LinkedIn   │      │
│  │ • Census     │  │ • BLS        │  │ • Glassdoor  │      │
│  │ • USASpending│  │ • OSHA       │  │ • Indeed     │      │
│  │ • PeeringDB  │  │ • EIA        │  │ • Crunchbase │      │
│  │ • GDELT      │  │ • FERC       │  │              │      │
│  │ • OpenCorp   │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                │                   │              │
│         └────────────────┼───────────────────┘              │
│                          ▼                                  │
│              ┌─────────────────────┐                        │
│              │  Circuit Breaker    │                        │
│              │  + Rate Limiter     │                        │
│              └─────────────────────┘                        │
│                          │                                  │
│                          ▼                                  │
│              ┌─────────────────────┐                        │
│              │  IndexedDB Storage  │                        │
│              │  (Local-First)      │                        │
│              └─────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## NEXT STEPS

See individual integration files in this directory for implementation details.

