# DCIM API Integration Plan

## Questions for Clarification

Before implementing, I need to understand your priorities:

1. **Infrastructure Detail Level**: How granular do you want the data?
   - [ ] Building/Facility level (current)
   - [ ] Server room/floor level
   - [ ] Rack level
   - [ ] Individual server/device level

2. **Visualization Requirements**: What types of visualizations do you need?
   - [ ] Network topology graphs
   - [ ] Geographic maps (3D globe, heatmaps)
   - [ ] Rack diagrams
   - [ ] Power/energy dashboards
   - [ ] Network routing visualizations
   - [ ] Ownership/relationship graphs

3. **Real-time vs Historical**: 
   - Real-time monitoring (BGP, network status)?
   - Historical trends?
   - Both?

4. **Data Refresh Frequency**:
   - How often should each API be queried?
   - Which APIs need real-time updates vs. daily/weekly?

5. **Priority APIs**: Which of these are most important to start with?

---

## Proposed Free/Open-Source APIs for DCIM

### Network & Infrastructure Discovery
1. **PeeringDB** ✅ (Already integrated)
   - Network facilities, IXPs, interconnection data
   - Free, no auth required
   - API: https://www.peeringdb.com/apidocs/

2. **RIPE RIS Live WebSocket**
   - Real-time BGP routing data
   - WebSocket streaming
   - Free, no auth required
   - Docs: https://ris-live.ripe.net/manual/

3. **Hurricane Electric BGP Toolkit**
   - ASN information, IP geolocation
   - Free tier available
   - API: https://bgp.he.net/

4. **crt.sh Certificate Transparency** ✅ (Already integrated)
   - Domain discovery, SSL certificates
   - Free, no auth required
   - API: https://crt.sh/?q=example.com&output=json

5. **Cloudflare Radar API**
   - Edge locations, network insights
   - Free tier available
   - API: https://developers.cloudflare.com/radar/

6. **Submarine Cable Map API**
   - Undersea cable routes
   - Free, public dataset
   - API: https://www.submarinecablemap.com/api/

### Infrastructure & Location
7. **OpenStreetMap Nominatim**
   - Geocoding, reverse geocoding
   - Free, rate-limited
   - API: https://nominatim.org/release-docs/develop/api/Overview/

8. **Data Center Map APIs**
   - Facility locations (various providers have free tiers)
   - DatacenterMap.com, ColoCrossing, etc.

9. **Power Grid APIs**
   - US Energy Information Administration (EIA)
   - Free, no auth required
   - API: https://www.eia.gov/opendata/

10. **IP Geolocation** (Free tiers)
    - ipapi.co (free: 1k/month)
    - ip-api.com (free: 45 req/min)
    - ipgeolocation.io (free tier)

### Business & Ownership
11. **SEC EDGAR** ✅ (Already integrated)
    - Company filings, ownership
    - Free, no auth required
    - API: https://www.sec.gov/edgar/sec-api-documentation

12. **GLEIF (Global Legal Entity Identifier)**
    - Legal entity identification
    - Free, no auth required
    - API: https://www.gleif.org/en/market-data/gleif-golden-copy-download-the-lei-data-file

13. **USASpending.gov**
    - Government contracts, subsidies
    - Free, no auth required
    - API: https://api.usaspending.gov/

14. **Good Jobs First** ✅ (Already integrated concept)
    - Subsidy tracker
    - May need scraping or manual data

### Environmental & Compliance
15. **EPA ECHO** ✅ (Already integrated)
    - Environmental compliance
    - Free, no auth required
    - API: https://echo.epa.gov/tools/web-services

16. **OSHA API** ✅ (Already integrated)
    - Safety violations
    - Free, may require FOIA requests for detailed data

17. **EPA AirNow API**
    - Air quality data
    - Free, no auth required
    - API: https://www.airnow.gov/technical-information/

### Network Analytics
18. **RIPE Stat API**
    - Network statistics, ASN information
    - Free, no auth required
    - API: https://stat.ripe.net/docs/data_api

19. **CAIDA AS Rank**
    - Autonomous System rankings
    - Free, public dataset
    - API: https://asrank.caida.org/

20. **ASN Lookup APIs**
    - Various free services
    - ipinfo.io (free tier)
    - whoisxmlapi.com (free tier)

### Visualization & Mapping
21. **Leaflet/OpenStreetMap**
    - Interactive maps (already available via libraries)
    - Free, open-source

22. **deck.gl**
    - 3D visualizations (you mentioned this)
    - Free, open-source

23. **Cytoscape.js** ✅ (You mentioned)
    - Network graphs
    - Free, open-source

---

## Integration Architecture Proposal

### 1. Unified API Service Layer
```typescript
interface APIConfig {
  name: string;
  baseUrl: string;
  authType?: 'none' | 'api_key' | 'bearer';
  rateLimit?: { requests: number; period: number };
  cacheTTL: number;
}

class UnifiedAPIService {
  // Unified interface for all APIs
  // Handles rate limiting, caching, error handling
  // Provides consistent data format
}
```

### 2. Data Aggregation Service
```typescript
class DataAggregator {
  // Combines data from multiple APIs
  // Resolves relationships (facility → operator → ASN → IP ranges)
  // Creates unified data models
}
```

### 3. Interactive Visualization Layer
```typescript
class VisualizationEngine {
  // Network topology graphs (Cytoscape)
  // 3D globe (deck.gl)
  // Geographic maps (Leaflet)
  // Rack diagrams (Canvas/SVG)
  // Power dashboards (Recharts)
}
```

### 4. Real-time Data Streaming
```typescript
class StreamManager {
  // WebSocket connections (RIPE RIS Live)
  // Polling for APIs that don't support streaming
  // Event-driven updates to visualizations
}
```

---

## Questions for You:

1. **Which detail level do you need most urgently?**
   - Facility level (current) ✓
   - Rack level?
   - Device level?

2. **Which visualizations are highest priority?**
   - Network topology graphs?
   - Geographic maps?
   - Rack layouts?
   - Power/energy charts?

3. **Real-time requirements?**
   - Need live BGP routing data?
   - Need real-time network status?
   - Or is daily/weekly updates sufficient?

4. **Start with which APIs?**
   - Network discovery (PeeringDB, RIPE RIS, HE BGP)?
   - Infrastructure details (racks, devices)?
   - Business data (ownership, contracts)?
   - Environmental (power, cooling)?

5. **Budget/limits?**
   - Any paid API services you want to include?
   - Or strictly free/open-source only?

Once you answer these, I'll implement the integration framework and start with your highest-priority APIs!

