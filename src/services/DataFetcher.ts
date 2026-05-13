import Dexie from 'dexie';

// Data source types
export type DataSourceType = 
  | 'PeeringDB'
  | 'SEC_EDGAR'
  | 'EPA_ECHO'
  | 'OSHA'
  | 'GoodJobsFirst'
  | 'StateAuditor'
  | 'FOIA'
  | 'CloudflareRadar'
  | 'BGPToolkit'
  | 'SubmarineCableMap'
  | 'CRT_SH'
  | 'Synthetic'
  | 'Estimated';

export interface DataProvenance {
  source: DataSourceType;
  fetchedAt: string;
  url?: string;
  reference?: string;
  verified?: boolean;
}

export interface FacilityDataCache {
  id: string;
  facilityId: number;
  dataType: string;
  data: any;
  provenance: DataProvenance;
  expiresAt: string;
}

// Extended cache database
class DataCacheDatabase extends Dexie {
  cache!: Dexie.Table<FacilityDataCache, string>;

  constructor() {
    super('DataCacheDatabase');
    this.version(1).stores({
      cache: 'id, facilityId, dataType, expiresAt'
    });
  }
}

export const cacheDb = new DataCacheDatabase();

// Cache TTL (Time To Live) in milliseconds
const CACHE_TTL = {
  SEC_EDGAR: 7 * 24 * 60 * 60 * 1000, // 7 days
  EPA_ECHO: 30 * 24 * 60 * 60 * 1000, // 30 days
  OSHA: 30 * 24 * 60 * 60 * 1000, // 30 days
  PeeringDB: 24 * 60 * 60 * 1000, // 1 day
  StateAuditor: 14 * 24 * 60 * 60 * 1000, // 14 days
  default: 24 * 60 * 60 * 1000, // 1 day
};

/** Cloudflare worker (or custom origin) exposing GET /api/sec/* → https://data.sec.gov/* */
function secEdgarProxyBase(): string {
  const raw = import.meta.env.VITE_SEC_EDGAR_PROXY_URL;
  if (raw && String(raw).trim()) return String(raw).replace(/\/$/, '');
  return 'https://dcim-dashboard.dannybuk.workers.dev';
}

function padCikDigits(digits: string): string {
  const n = digits.replace(/\D/g, '');
  if (!n) return '';
  return n.padStart(10, '0');
}

function resolveEdgarCik(operatorName: string, explicitCik?: string | null): string | null {
  const ex = explicitCik?.trim();
  if (ex) return padCikDigits(ex);
  const op = (operatorName || '').trim();
  if (!op) return null;
  if (/^\d{1,12}$/.test(op)) return padCikDigits(op);
  const lower = op.toLowerCase();
  const hints: [RegExp, string][] = [
    [/goldman\s*sachs|^gs$/i, '0000886982'],
    [/amazon|^aws$|amazon\.com/i, '0001018724'],
    [/morgan\s*stanley/i, '0000895421'],
    [/meta\b|facebook/i, '0001326801'],
    [/\bgoogle\b|\balphabet\b/i, '0001652044'],
    [/microsoft/i, '0000789019'],
  ];
  for (const [re, cik] of hints) {
    if (re.test(op) || re.test(lower)) return cik;
  }
  return null;
}

type SecFilingRow = {
  type: string;
  date: string;
  url: string;
  description?: string;
  accessionNumber?: string;
};

function filingsFromCompanySubmissions(json: Record<string, unknown>): SecFilingRow[] {
  const filingsObj = json?.filings as { recent?: Record<string, string[]> } | undefined;
  const rec = filingsObj?.recent;
  if (!rec || !Array.isArray(rec.form)) return [];
  const forms = rec.form;
  const allow = new Set(['10-K', '10-Q', '8-K', '20-F', '40-F']);
  const cikRaw = String(json.cik ?? '').replace(/\D/g, '') || '0';
  const out: SecFilingRow[] = [];
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    if (!form || !allow.has(form)) continue;
    const filingDate = rec.filingDate?.[i];
    const accessionNumber = rec.accessionNumber?.[i];
    const primaryDocument = rec.primaryDocument?.[i];
    const primaryDocDescription = rec.primaryDocDescription?.[i];
    if (!filingDate) continue;
    const accN = typeof accessionNumber === 'string' ? accessionNumber.replace(/-/g, '') : '';
    const url =
      accN && primaryDocument
        ? `https://www.sec.gov/Archives/edgar/data/${cikRaw}/${accN}/${primaryDocument}`
        : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${padCikDigits(cikRaw)}&type=${encodeURIComponent(form)}`;
    out.push({
      type: form,
      date: filingDate,
      url,
      description: typeof primaryDocDescription === 'string' ? primaryDocDescription : undefined,
      accessionNumber,
    });
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out.slice(0, 30);
}

class DataFetcher {
  constructor() {
    // API keys and baseUrl can be added here when needed
  }

  // Generic cache getter
  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await cacheDb.cache.get(key);
      if (cached && new Date(cached.expiresAt) > new Date()) {
        return cached.data as T;
      }
      if (cached) {
        // Expired, delete it
        await cacheDb.cache.delete(key);
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  // Generic cache setter
  private async setCache(
    key: string, 
    facilityId: number, 
    dataType: string, 
    data: any, 
    provenance: DataProvenance,
    ttl: number = CACHE_TTL.default
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl).toISOString();
      await cacheDb.cache.put({
        id: key,
        facilityId,
        dataType,
        data,
        provenance,
        expiresAt,
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  // PeeringDB API - Get facility interconnection data
  async fetchPeeringDBData(facilityId: number, facilityName: string) {
    const cacheKey = `peeringdb_${facilityId}`;
    const cached = await this.getCached(cacheKey);
    if (cached) return { data: cached, provenance: (await cacheDb.cache.get(cacheKey))?.provenance };

    try {
      // PeeringDB search API
      const searchUrl = `https://peeringdb.com/api/net?name__contains=${encodeURIComponent(facilityName)}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) throw new Error(`PeeringDB API error: ${response.status}`);
      
      const result = await response.json();
      const data = result.data?.[0] || null;

      const provenance: DataProvenance = {
        source: 'PeeringDB',
        fetchedAt: new Date().toISOString(),
        url: searchUrl,
        reference: `PeeringDB Net ID: ${data?.id}`,
        verified: true,
      };

      await this.setCache(cacheKey, facilityId, 'peeringdb', data, provenance, CACHE_TTL.PeeringDB);
      
      return { data, provenance };
    } catch (error) {
      console.error('PeeringDB fetch error:', error);
      // Return cached data even if expired as fallback
      const expired = await cacheDb.cache.get(cacheKey);
      if (expired) {
        return { 
          data: expired.data, 
          provenance: expired.provenance,
          warning: 'Using expired cached data'
        };
      }
      return { data: null, provenance: null };
    }
  }

  // SEC EDGAR API — company submissions via Cloudflare /api/sec proxy (browser-safe)
  async fetchSECFilings(facilityId: number, operatorName: string, explicitCik?: string | null) {
    const cacheKey = `sec_v2_${facilityId}_${operatorName}_${explicitCik ?? 'none'}`;
    const cached = await this.getCached(cacheKey);
    if (cached) return { data: cached, provenance: (await cacheDb.cache.get(cacheKey))?.provenance };

    const cik10 = resolveEdgarCik(operatorName, explicitCik);
    if (!cik10) {
      const data = {
        filings: [] as SecFilingRow[],
        note: 'No CIK resolved for this operator. Add facility.secCik or extend operator→CIK hints in DataFetcher.',
      };
      const provenance: DataProvenance = {
        source: 'SEC_EDGAR',
        fetchedAt: new Date().toISOString(),
        url: operatorName,
        reference: `SEC EDGAR (no CIK for operator: ${operatorName})`,
        verified: false,
      };
      await this.setCache(cacheKey, facilityId, 'sec', data, provenance, CACHE_TTL.SEC_EDGAR);
      return { data, provenance };
    }

    const proxyBase = secEdgarProxyBase();
    const path = `submissions/CIK${cik10}.json`;
    const fetchUrl = `${proxyBase}/api/sec/${path}`;

    try {
      const response = await fetch(fetchUrl, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`SEC proxy HTTP ${response.status}`);
      }
      const json = (await response.json()) as Record<string, unknown>;
      const filings = filingsFromCompanySubmissions(json);
      const name = typeof json.name === 'string' ? json.name : operatorName;
      const first10k = filings.find(f => f.type === '10-K');
      const recentFilingSummary = first10k
        ? `${name} — ${first10k.type} (${first10k.date}): review Item 1A / MD&A for AI & workforce risk narratives — ${first10k.url}`
        : filings[0]
          ? `${name} — ${filings[0].type} (${filings[0].date}) — ${filings[0].url}`
          : `${name} — no recent 10-K / 10-Q / 8-K rows in submissions index`;

      const data = {
        filings,
        companyName: name,
        cik: cik10,
        recentFilingSummary,
        ...(filings.length ? {} : { note: 'Submissions JSON returned no periodic filing rows in the parsed window.' }),
      };

      const provenance: DataProvenance = {
        source: 'SEC_EDGAR',
        fetchedAt: new Date().toISOString(),
        url: fetchUrl,
        reference: `SEC company submissions CIK${cik10}`,
        verified: true,
      };

      await this.setCache(cacheKey, facilityId, 'sec', data, provenance, CACHE_TTL.SEC_EDGAR);

      return { data, provenance };
    } catch (error) {
      console.error('SEC EDGAR fetch error:', error);
      return { data: null, provenance: null };
    }
  }

  // EPA ECHO API - Environmental compliance data
  async fetchEPAECHOData(facilityId: number, facilityName: string, city: string, state: string) {
    // city and state parameters reserved for future API integration
    void city;
    void state;
    const cacheKey = `epa_${facilityId}`;
    const cached = await this.getCached(cacheKey);
    if (cached) return { data: cached, provenance: (await cacheDb.cache.get(cacheKey))?.provenance };

    try {
      // EPA ECHO API endpoint
      const searchUrl = `https://echodata.epa.gov/echo/echo_rest_services.get_facilities?p_st=${state}&p_ct=${city}&p_fn=${encodeURIComponent(facilityName)}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) throw new Error(`EPA ECHO API error: ${response.status}`);
      
      const result = await response.json();
      const data = result.Results || null;

      const provenance: DataProvenance = {
        source: 'EPA_ECHO',
        fetchedAt: new Date().toISOString(),
        url: searchUrl,
        reference: `EPA ECHO Facility ID: ${data?.FacilityID}`,
        verified: true,
      };

      await this.setCache(cacheKey, facilityId, 'epa', data, provenance, CACHE_TTL.EPA_ECHO);
      
      return { data, provenance };
    } catch (error) {
      console.error('EPA ECHO fetch error:', error);
      const expired = await cacheDb.cache.get(cacheKey);
      if (expired) {
        return { 
          data: expired.data, 
          provenance: expired.provenance,
          warning: 'Using expired cached data'
        };
      }
      return { data: null, provenance: null };
    }
  }

  // OSHA API - Safety violation data
  async fetchOSHAData(facilityId: number, facilityName: string, state: string) {
    // state parameter reserved for future API integration
    void state;
    const cacheKey = `osha_${facilityId}`;
    const cached = await this.getCached(cacheKey);
    if (cached) return { data: cached, provenance: (await cacheDb.cache.get(cacheKey))?.provenance };

    try {
      // OSHA Establishment Search API (requires proper endpoint)
      // Placeholder implementation
      const data = {
        violations: [],
        note: 'OSHA API integration requires proper endpoint and authentication',
      };

      const provenance: DataProvenance = {
        source: 'OSHA',
        fetchedAt: new Date().toISOString(),
        reference: `OSHA Establishment Search: ${facilityName}`,
        verified: true,
      };

      await this.setCache(cacheKey, facilityId, 'osha', data, provenance, CACHE_TTL.OSHA);
      
      return { data, provenance };
    } catch (error) {
      console.error('OSHA fetch error:', error);
      return { data: null, provenance: null };
    }
  }

  // Good Jobs First - Subsidy tracker (web scraping or API if available)
  async fetchSubsidyData(facilityId: number, operatorName: string, state: string) {
    void operatorName;
    void state;
    const cacheKey = `subsidy_${facilityId}`;
    const cached = await this.getCached(cacheKey);
    if (cached) return { data: cached, provenance: (await cacheDb.cache.get(cacheKey))?.provenance };

    try {
      // Good Jobs First doesn't have a public API, would need scraping or their data export
      const data = {
        subsidies: [],
        note: 'Good Jobs First data requires web scraping or data export',
      };

      const provenance: DataProvenance = {
        source: 'GoodJobsFirst',
        fetchedAt: new Date().toISOString(),
        reference: `GJF Subsidy Tracker: ${operatorName} in ${state}`,
        verified: false, // May require verification
      };

      await this.setCache(cacheKey, facilityId, 'subsidy', data, provenance, CACHE_TTL.default);
      
      return { data, provenance };
    } catch (error) {
      console.error('Subsidy data fetch error:', error);
      return { data: null, provenance: null };
    }
  }

  // Cloudflare Radar - Edge locations
  async fetchCloudflareRadarData(facilityId: number, city: string, state: string) {
    // city and state parameters reserved for future API integration
    void city;
    void state;
    const cacheKey = `cloudflare_${facilityId}`;
    const cached = await this.getCached(cacheKey);
    if (cached) return { data: cached, provenance: (await cacheDb.cache.get(cacheKey))?.provenance };

    try {
      // Cloudflare Radar API (if available)
      const data = {
        edgeLocations: [],
        note: 'Cloudflare Radar API integration',
      };

      const provenance: DataProvenance = {
        source: 'CloudflareRadar',
        fetchedAt: new Date().toISOString(),
        verified: true,
      };

      await this.setCache(cacheKey, facilityId, 'cloudflare', data, provenance, CACHE_TTL.default);
      
      return { data, provenance };
    } catch (error) {
      console.error('Cloudflare Radar fetch error:', error);
      return { data: null, provenance: null };
    }
  }

  // CRT.SH - Certificate transparency for domain/IP discovery
  async fetchCRTSHData(facilityId: number, facilityName: string) {
    void facilityName;
    const cacheKey = `crtsh_${facilityId}`;
    const cached = await this.getCached(cacheKey);
    if (cached) return { data: cached, provenance: (await cacheDb.cache.get(cacheKey))?.provenance };

    try {
      // CRT.SH API - Search by domain pattern
      const domain = facilityName.toLowerCase().replace(/\s+/g, '');
      const searchUrl = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) throw new Error(`CRT.SH API error: ${response.status}`);
      
      const data = await response.json();

      const provenance: DataProvenance = {
        source: 'CRT_SH',
        fetchedAt: new Date().toISOString(),
        url: searchUrl,
        verified: true,
      };

      await this.setCache(cacheKey, facilityId, 'crtsh', data, provenance, CACHE_TTL.default);
      
      return { data, provenance };
    } catch (error) {
      console.error('CRT.SH fetch error:', error);
      return { data: null, provenance: null };
    }
  }

  // Aggregate all data sources for a facility
  async fetchAllFacilityData(facilityId: number, facility: any) {
    const [peeringDB, secFilings, epaEcho, osha, subsidy, cloudflare, crtsh] = await Promise.allSettled([
      this.fetchPeeringDBData(facilityId, facility.name),
      this.fetchSECFilings(facilityId, facility.operator, facility.secCik),
      this.fetchEPAECHOData(facilityId, facility.name, facility.city, facility.state),
      this.fetchOSHAData(facilityId, facility.name, facility.state),
      this.fetchSubsidyData(facilityId, facility.operator, facility.state),
      this.fetchCloudflareRadarData(facilityId, facility.city, facility.state),
      this.fetchCRTSHData(facilityId, facility.name),
    ]);

    return {
      peeringDB: peeringDB.status === 'fulfilled' ? peeringDB.value : null,
      secFilings: secFilings.status === 'fulfilled' ? secFilings.value : null,
      epaEcho: epaEcho.status === 'fulfilled' ? epaEcho.value : null,
      osha: osha.status === 'fulfilled' ? osha.value : null,
      subsidy: subsidy.status === 'fulfilled' ? subsidy.value : null,
      cloudflare: cloudflare.status === 'fulfilled' ? cloudflare.value : null,
      crtsh: crtsh.status === 'fulfilled' ? crtsh.value : null,
    };
  }

  // Get provenance for cached data
  async getProvenance(facilityId: number, dataType: string): Promise<DataProvenance | null> {
    try {
      const cached = await cacheDb.cache
        .where('[facilityId+dataType]')
        .equals([facilityId, dataType])
        .first();
      return cached?.provenance || null;
    } catch (error) {
      return null;
    }
  }

  // Clear expired cache entries
  async clearExpiredCache(): Promise<void> {
    try {
      const now = new Date().toISOString();
      await cacheDb.cache.where('expiresAt').below(now).delete();
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }
}

export const dataFetcher = new DataFetcher();

