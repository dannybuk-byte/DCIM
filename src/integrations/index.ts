/**
 * Real API Integrations Index
 * 
 * All integrations are REAL and connect to actual APIs.
 * Some use sample data when CORS prevents direct browser access.
 * 
 * Categories:
 * - Government APIs: SEC, EPA, BLS, OSHA, Census, USASpending
 * - Infrastructure: PeeringDB (network facilities)
 * - Corporate Intelligence: OpenCorporates
 * - Decentralized: IPFS, Nostr
 */

// ============================================
// GOVERNMENT APIS
// ============================================

// SEC EDGAR - Financial filings (✅ CORS OK)
export { secEdgarApi, BIG_TECH_CIKS } from './secEdgar';
export type { SECFiling, SubsidyDisclosure } from './secEdgar';

// EPA ECHO - Environmental compliance (⚠️ CORS blocked, has sample data)
export { epaEchoApi, DATA_CENTER_NAICS } from './epaEcho';
export type { EchoFacility, EchoSearchParams, EchoViolation, EchoInspection } from './epaEcho';

// BLS - Employment data (⚠️ CORS blocked, has sample data)
export { blsApi, BLS_SERIES, STATE_CODES } from './blsApi';
export type { BLSDataPoint, BLSSeriesData, EmploymentData } from './blsApi';

// OSHA - Workplace safety (⚠️ CORS blocked, has sample data)
export { oshaApi } from './oshaApi';
export type { OshaInspection, OshaViolation } from './oshaApi';

// Census Bureau - Demographics & economics (✅ CORS OK)
export { censusApi, STATE_FIPS, DATA_CENTER_COUNTIES } from './censusApi';
export type { CountyDemographics, EconomicIndicators } from './censusApi';

// USASpending - Federal contracts (✅ CORS OK)
export { usaSpendingApi, BIG_TECH_RECIPIENTS } from './usaSpending';
export type { FederalContract, SpendingSearchParams, AgencySpending } from './usaSpending';

// ============================================
// INFRASTRUCTURE APIs
// ============================================

// PeeringDB - Network facilities & IX points (✅ CORS OK)
export { peeringDbApi, BIG_TECH_ASNS } from './peeringDb';
export type { NetworkFacility, InternetExchange, Network, NetworkAtFacility } from './peeringDb';

// ============================================
// CORPORATE INTELLIGENCE
// ============================================

// OpenCorporates - Company registrations (✅ CORS OK, rate limited)
export { openCorporatesApi, BIG_TECH_SEARCHES } from './openCorporates';
export type { Company, Officer, CompanySearchResult, FilingEvent } from './openCorporates';

// ============================================
// DECENTRALIZED STORAGE
// ============================================

// IPFS - Content-addressed storage
export { ipfsStorage } from './ipfsStorage';
export type { IPFSConfig, IPFSUploadResult } from './ipfsStorage';

// Nostr - Censorship-resistant publishing
export { nostrRelay, DEFAULT_RELAYS } from './nostrRelay';
export type { NostrEvent, NostrKeyPair, RelayConnection } from './nostrRelay';

// ============================================
// INTEGRATION SUMMARY
// ============================================

/**
 * Quick reference for all available integrations:
 * 
 * | Integration      | CORS    | Auth     | Best For                          |
 * |-----------------|---------|----------|-----------------------------------|
 * | SEC EDGAR       | ✅ OK   | None     | Financial filings, subsidies      |
 * | EPA ECHO        | ❌ Block| None     | Environmental violations          |
 * | BLS             | ❌ Block| Free key | Employment statistics             |
 * | OSHA            | ❌ Block| None     | Workplace safety violations       |
 * | Census          | ✅ OK   | Free key | Demographics, economic data       |
 * | USASpending     | ✅ OK   | None     | Federal contracts, grants         |
 * | PeeringDB       | ✅ OK   | None     | Network facilities, IX points     |
 * | OpenCorporates  | ✅ OK   | Free key | Corporate structures              |
 * | IPFS            | ✅ OK   | None     | Decentralized file storage        |
 * | Nostr           | ✅ OK   | None     | Censorship-resistant publishing   |
 */

