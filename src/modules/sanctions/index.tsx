/**
 * OFAC Sanctions Monitor Module
 * Network Hygiene Enforcement Dashboard v1.0
 * 
 * Enforcement Pathway: Treasury Department OFAC + FinCEN
 * Legal Basis: International Emergency Economic Powers Act (IEEPA)
 * Liability Standard: STRICT (no knowledge/intent required)
 * Whistleblower Awards: 10-30% of sanctions > $1M (AMLA)
 * Penalties: $350K/violation civil; $1M corporate criminal; 20 years
 */

// Re-export types
export * from './types/sanctions';

// Re-export services
export * from './services/sdnService';
export * from './services/riskScoring';
export * from './services/evidenceChain';
export * from './services/awardCalculator';
export * from './services/coalitionRouting';

// Re-export hooks
export { useBGPSanctionsMonitor, isASNSanctioned, getSanctionedASNsByCountry, getSanctionedASNsByRisk } from './hooks/useBGPSanctionsMonitor';

// Re-export components
export { SanctionsOverview } from './components/SanctionsOverview';
export { FacilityRiskCard } from './components/FacilityRiskCard';
export { SDNSearchPanel } from './components/SDNSearchPanel';
export { AwardCalculator } from './components/AwardCalculator';
export { ReportingChannels } from './components/ReportingChannels';

