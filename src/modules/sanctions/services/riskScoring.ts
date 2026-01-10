/**
 * OFAC Sanctions Risk Scoring Service
 * Calculates facility-level sanctions risk based on multiple factors
 * 
 * Scoring Factors:
 * - SDN Name Match (50 points max)
 * - Sanctioned Jurisdiction Traffic (40 points max)
 * - Sanctioned AS Peering (35 points max)
 * - Crypto Mining Indicators (25 points max)
 * - Documentation Avoidance (20 points max)
 * - Payment Anomalies (15 points max)
 */

import {
  RiskLevel,
  RiskFactor,
  FacilityRiskScore,
  SDNMatch,
  SDNEntry,
  SanctionedASN,
  CryptoMiningIndicators,
} from '../types/sanctions';
import {
  fetchSDNList,
  normalizeName,
  calculateSimilarity,
} from './sdnService';

// Sanctioned ASNs with known risk
export const SANCTIONED_ASNS: SanctionedASN[] = [
  // Russian state telecom
  { asn: 'AS12389', name: 'Rostelecom', country: 'RU', risk: 'HIGH' },
  { asn: 'AS8402', name: 'OJSC Vimpelcom', country: 'RU', risk: 'HIGH' },
  { asn: 'AS20485', name: 'TransTeleCom (TTK)', country: 'RU', risk: 'HIGH' },
  { asn: 'AS25513', name: 'PJSC MegaFon', country: 'RU', risk: 'HIGH' },
  
  // Iranian networks
  { asn: 'AS44244', name: 'Iran Cell Service', country: 'IR', risk: 'CRITICAL' },
  { asn: 'AS58224', name: 'TIC (Telecommunication Infrastructure Company)', country: 'IR', risk: 'CRITICAL' },
  { asn: 'AS48159', name: 'Telecommunication Kish', country: 'IR', risk: 'CRITICAL' },
  { asn: 'AS197207', name: 'Mobile Communication Company of Iran', country: 'IR', risk: 'CRITICAL' },
  
  // North Korean
  { asn: 'AS131279', name: 'Star JV (DPRK)', country: 'KP', risk: 'CRITICAL' },
  
  // Known bulletproof/malicious hosting
  { asn: 'AS209588', name: 'Flyservers S.A.', country: 'PA', risk: 'HIGH', notes: 'Ransomware hosting' },
  { asn: 'AS49505', name: 'OOO Network of data-centers Selectel', country: 'RU', risk: 'MODERATE' },
];

// Sanctioned jurisdictions
export const SANCTIONED_JURISDICTIONS = [
  { code: 'RU', name: 'Russia', risk: 'HIGH' },
  { code: 'IR', name: 'Iran', risk: 'CRITICAL' },
  { code: 'KP', name: 'North Korea', risk: 'CRITICAL' },
  { code: 'SY', name: 'Syria', risk: 'CRITICAL' },
  { code: 'CU', name: 'Cuba', risk: 'HIGH' },
  { code: 'BY', name: 'Belarus', risk: 'HIGH' },
  // Regions
  { code: 'CRIMEA', name: 'Crimea Region', risk: 'CRITICAL' },
  { code: 'DNR', name: 'Donetsk People\'s Republic', risk: 'CRITICAL' },
  { code: 'LNR', name: 'Luhansk People\'s Republic', risk: 'CRITICAL' },
];

/**
 * Calculate risk level from score
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  if (score >= 10) return 'LOW';
  return 'MINIMAL';
}

/**
 * Get risk level color for UI
 */
export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'CRITICAL': return '#dc2626'; // red-600
    case 'HIGH': return '#ea580c'; // orange-600
    case 'MODERATE': return '#ca8a04'; // yellow-600
    case 'LOW': return '#16a34a'; // green-600
    case 'MINIMAL': return '#64748b'; // slate-500
    default: return '#64748b';
  }
}

/**
 * Fuzzy match tenant names against SDN list
 */
export async function fuzzyMatchSDN(
  tenantName: string,
  threshold = 0.85
): Promise<{ exact: SDNMatch[]; fuzzy: SDNMatch[] }> {
  const sdnList = await fetchSDNList();
  const results: { exact: SDNMatch[]; fuzzy: SDNMatch[] } = {
    exact: [],
    fuzzy: [],
  };

  const normalizedTenant = normalizeName(tenantName);

  for (const sdnEntry of sdnList) {
    // Check primary name
    const normalizedSDN = normalizeName(sdnEntry.lastName);

    if (normalizedTenant === normalizedSDN) {
      results.exact.push({
        tenant: tenantName,
        sdnEntry,
        matchType: 'EXACT',
        confidence: 1.0,
      });
      continue;
    }

    // Fuzzy match on primary name
    const similarity = calculateSimilarity(normalizedTenant, normalizedSDN);
    if (similarity >= threshold) {
      results.fuzzy.push({
        tenant: tenantName,
        sdnEntry,
        matchType: 'FUZZY',
        confidence: similarity,
      });
      continue;
    }

    // Check AKA names
    for (const aka of sdnEntry.akas) {
      const normalizedAKA = normalizeName(aka.lastName);
      const akaSimilarity = calculateSimilarity(normalizedTenant, normalizedAKA);
      if (akaSimilarity >= threshold) {
        results.fuzzy.push({
          tenant: tenantName,
          sdnEntry,
          matchedName: aka.lastName,
          matchType: 'AKA_FUZZY',
          confidence: akaSimilarity,
        });
        break; // Only add once per SDN entry
      }
    }
  }

  return results;
}

/**
 * Check if ASN is sanctioned
 */
export function checkASNSanctioned(asn: string): SanctionedASN | undefined {
  const normalized = asn.toUpperCase().startsWith('AS') ? asn.toUpperCase() : `AS${asn}`;
  return SANCTIONED_ASNS.find((s) => s.asn === normalized);
}

/**
 * Check if country code is sanctioned
 */
export function isCountrySanctioned(countryCode: string): boolean {
  const normalized = countryCode.toUpperCase();
  return SANCTIONED_JURISDICTIONS.some((j) => j.code === normalized);
}

/**
 * Detect crypto mining indicators
 */
export function detectCryptoMining(facilityData: {
  powerUsage?: { pattern: string; kwh?: number };
  equipment?: string[];
  gpuDensity?: string;
}): CryptoMiningIndicators {
  const indicators: CryptoMiningIndicators = {
    confirmed: false,
    suspected: false,
  };

  // Check for high-density GPU installations
  if (facilityData.gpuDensity === 'HIGH') {
    indicators.suspected = true;
    indicators.gpuDensity = 'HIGH';
  }

  // Check for constant high power draw (no diurnal pattern)
  if (facilityData.powerUsage?.pattern === 'CONSTANT') {
    indicators.suspected = true;
    indicators.powerPattern = 'CONSTANT';
  }

  // Check for mining equipment
  const miningEquipment = ['ASIC', 'GPU Rig', 'Mining Rig', 'Antminer', 'Whatsminer'];
  if (facilityData.equipment?.some((e) => miningEquipment.some((m) => e.toUpperCase().includes(m.toUpperCase())))) {
    indicators.confirmed = true;
    indicators.equipmentType = facilityData.equipment.filter((e) =>
      miningEquipment.some((m) => e.toUpperCase().includes(m.toUpperCase()))
    );
  }

  return indicators;
}

interface FacilityRiskInput {
  facilityId: string;
  tenants?: string[];
  connectedASNs?: string[];
  trafficCountries?: string[];
  powerUsage?: { pattern: string; kwh?: number };
  equipment?: string[];
  gpuDensity?: string;
  documentationFlags?: { avoidance: string[] };
  paymentFlags?: { suspicious: string[] };
}

/**
 * Calculate comprehensive facility sanctions risk score
 */
export async function calculateSanctionsRiskScore(
  facility: FacilityRiskInput
): Promise<FacilityRiskScore> {
  let score = 0;
  const factors: RiskFactor[] = [];
  const sdnMatches: SDNMatch[] = [];

  // Factor 1: SDN Name Match (50 points max)
  if (facility.tenants && facility.tenants.length > 0) {
    for (const tenant of facility.tenants) {
      const matches = await fuzzyMatchSDN(tenant);
      
      if (matches.exact.length > 0) {
        score += 50;
        sdnMatches.push(...matches.exact);
        factors.push({
          factor: 'SDN_EXACT_MATCH',
          points: 50,
          details: matches.exact,
          description: `Exact match found for tenant: ${tenant}`,
        });
        break; // Max out on exact match
      } else if (matches.fuzzy.length > 0) {
        const fuzzyScore = Math.min(matches.fuzzy.length * 10, 30);
        score += fuzzyScore;
        sdnMatches.push(...matches.fuzzy);
        factors.push({
          factor: 'SDN_FUZZY_MATCH',
          points: fuzzyScore,
          details: matches.fuzzy,
          description: `Fuzzy matches found for tenant: ${tenant}`,
        });
      }
    }
  }

  // Factor 2: Sanctioned Jurisdiction Traffic (40 points max)
  if (facility.trafficCountries && facility.trafficCountries.length > 0) {
    const sanctionedCountries = facility.trafficCountries.filter(isCountrySanctioned);
    const criticalCountries = sanctionedCountries.filter((c) =>
      SANCTIONED_JURISDICTIONS.find((j) => j.code === c)?.risk === 'CRITICAL'
    );

    if (criticalCountries.length > 0) {
      score += 40;
      factors.push({
        factor: 'CRITICAL_JURISDICTION_TRAFFIC',
        points: 40,
        details: criticalCountries,
        description: `Traffic detected to critical sanctioned jurisdictions: ${criticalCountries.join(', ')}`,
      });
    } else if (sanctionedCountries.length > 0) {
      score += 25;
      factors.push({
        factor: 'HIGH_RISK_JURISDICTION_TRAFFIC',
        points: 25,
        details: sanctionedCountries,
        description: `Traffic detected to sanctioned jurisdictions: ${sanctionedCountries.join(', ')}`,
      });
    }
  }

  // Factor 3: Sanctioned AS Peering (35 points max)
  if (facility.connectedASNs && facility.connectedASNs.length > 0) {
    const sanctionedPeers = facility.connectedASNs
      .map(checkASNSanctioned)
      .filter((s): s is SanctionedASN => s !== undefined);

    if (sanctionedPeers.length > 0) {
      score += 35;
      factors.push({
        factor: 'SANCTIONED_AS_PEERING',
        points: 35,
        details: sanctionedPeers,
        description: `Peering with sanctioned ASNs: ${sanctionedPeers.map((s) => s.name).join(', ')}`,
      });
    }
  }

  // Factor 4: Crypto Mining Indicators (25 points max)
  const cryptoIndicators = detectCryptoMining(facility);
  if (cryptoIndicators.confirmed) {
    score += 25;
    factors.push({
      factor: 'CRYPTO_MINING_CONFIRMED',
      points: 25,
      details: cryptoIndicators,
      description: 'Confirmed cryptocurrency mining activity detected',
    });
  } else if (cryptoIndicators.suspected) {
    score += 15;
    factors.push({
      factor: 'CRYPTO_MINING_SUSPECTED',
      points: 15,
      details: cryptoIndicators,
      description: 'Suspected cryptocurrency mining activity',
    });
  }

  // Factor 5: Documentation Avoidance (20 points max)
  if (facility.documentationFlags?.avoidance && facility.documentationFlags.avoidance.length > 0) {
    score += 20;
    factors.push({
      factor: 'DOCUMENTATION_AVOIDANCE',
      points: 20,
      details: facility.documentationFlags.avoidance,
      description: `Documentation avoidance flags: ${facility.documentationFlags.avoidance.join(', ')}`,
    });
  }

  // Factor 6: Payment Anomalies (15 points max)
  if (facility.paymentFlags?.suspicious && facility.paymentFlags.suspicious.length > 0) {
    score += 15;
    factors.push({
      factor: 'PAYMENT_ANOMALIES',
      points: 15,
      details: facility.paymentFlags.suspicious,
      description: `Payment anomalies detected: ${facility.paymentFlags.suspicious.join(', ')}`,
    });
  }

  // Cap score at 100
  const finalScore = Math.min(score, 100);

  return {
    facilityId: facility.facilityId,
    score: finalScore,
    riskLevel: getRiskLevel(finalScore),
    factors,
    timestamp: new Date().toISOString(),
    sdnMatches: sdnMatches.length > 0 ? sdnMatches : undefined,
  };
}

/**
 * Batch calculate risk scores for multiple facilities
 */
export async function batchCalculateRiskScores(
  facilities: FacilityRiskInput[]
): Promise<FacilityRiskScore[]> {
  // Pre-fetch SDN list once
  await fetchSDNList();

  // Calculate in parallel with limited concurrency
  const batchSize = 10;
  const results: FacilityRiskScore[] = [];

  for (let i = 0; i < facilities.length; i += batchSize) {
    const batch = facilities.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((f) => calculateSanctionsRiskScore(f))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Get high-risk facilities summary
 */
export function getHighRiskFacilities(
  riskScores: FacilityRiskScore[],
  minRiskLevel: RiskLevel = 'HIGH'
): FacilityRiskScore[] {
  const riskOrder: RiskLevel[] = ['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
  const minIndex = riskOrder.indexOf(minRiskLevel);

  return riskScores
    .filter((r) => riskOrder.indexOf(r.riskLevel) >= minIndex)
    .sort((a, b) => b.score - a.score);
}

