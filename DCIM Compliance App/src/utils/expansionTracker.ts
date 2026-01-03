/**
 * Certificate Transparency Log Monitor
 * 
 * Tracks subdomain creation and infrastructure expansion in real-time
 * using Certificate Transparency logs via crt.sh API.
 * 
 * Based on Jason Haddix's TBHM methodology for continuous reconnaissance.
 * 
 * Features:
 * - Real-time subdomain discovery
 * - Infrastructure expansion timeline
 * - New certificate alerts
 * - Pattern-based facility detection
 * - Historical comparison
 */

export interface CertificateEntry {
  issuer_ca_id: number;
  issuer_name: string;
  name_value: string;
  min_cert_id: number;
  min_entry_timestamp: string;
  not_before: string;
  not_after: string;
}

export interface SubdomainDiscovery {
  subdomain: string;
  firstSeen: Date;
  certificateId: number;
  issuer: string;
  pattern: 'datacenter' | 'expansion' | 'infrastructure' | 'service' | 'unknown';
  confidence: number;
}

export interface ExpansionEvent {
  facilityName: string;
  domain: string;
  timestamp: Date;
  newSubdomains: string[];
  pattern: string;
  significance: 'high' | 'medium' | 'low';
}

const CRT_SH_API = 'https://crt.sh';

/**
 * Fetch certificates for a domain from crt.sh
 */
export async function fetchCertificates(domain: string): Promise<CertificateEntry[]> {
  try {
    const response = await fetch(
      `${CRT_SH_API}/?q=%25.${encodeURIComponent(domain)}&output=json`,
      {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`crt.sh returned ${response.status}`);
    }

    const data: CertificateEntry[] = await response.json();
    return data;
  } catch (error) {
    console.error('[CT Monitor] Failed to fetch certificates:', error);
    return [];
  }
}

/**
 * Extract unique subdomains from certificate entries
 */
export function extractSubdomains(certificates: CertificateEntry[]): SubdomainDiscovery[] {
  const subdomainMap = new Map<string, CertificateEntry>();

  for (const cert of certificates) {
    const names = cert.name_value.split('\n');
    
    for (const name of names) {
      const subdomain = name.trim().toLowerCase();
      
      // Skip wildcards and main domain
      if (subdomain.startsWith('*') || !subdomain.includes('.')) {
        continue;
      }

      // Keep most recent certificate for each subdomain
      const existing = subdomainMap.get(subdomain);
      if (!existing || new Date(cert.min_entry_timestamp) > new Date(existing.min_entry_timestamp)) {
        subdomainMap.set(subdomain, cert);
      }
    }
  }

  const discoveries: SubdomainDiscovery[] = [];
  
  for (const [subdomain, cert] of subdomainMap.entries()) {
    const pattern = detectPattern(subdomain);
    const confidence = calculateConfidence(subdomain, pattern);
    
    discoveries.push({
      subdomain,
      firstSeen: new Date(cert.min_entry_timestamp),
      certificateId: cert.min_cert_id,
      issuer: cert.issuer_name,
      pattern,
      confidence,
    });
  }

  return discoveries.sort((a, b) => b.firstSeen.getTime() - a.firstSeen.getTime());
}

/**
 * Detect infrastructure patterns in subdomains
 */
function detectPattern(subdomain: string): SubdomainDiscovery['pattern'] {
  const patterns = {
    datacenter: /\b(dc|datacenter|datacentre|facility|colo)\d*/i,
    expansion: /\b(new|expansion|phase\d+|site\d+)\b/i,
    infrastructure: /\b(core|edge|pop|ix|peering|backbone|network)\d*/i,
    service: /\b(api|app|cdn|storage|compute|db|cache|monitor)\d*/i,
  };

  for (const [type, regex] of Object.entries(patterns)) {
    if (regex.test(subdomain)) {
      return type as SubdomainDiscovery['pattern'];
    }
  }

  return 'unknown';
}

/**
 * Calculate confidence score for infrastructure significance
 */
function calculateConfidence(subdomain: string, pattern: SubdomainDiscovery['pattern']): number {
  let confidence = 50; // Base confidence

  // Pattern-based boost
  const patternBoost = {
    datacenter: 40,
    expansion: 35,
    infrastructure: 30,
    service: 20,
    unknown: 0,
  };
  confidence += patternBoost[pattern];

  // Numeric patterns (dc1, dc2, etc.) indicate scale
  if (/\d+/.test(subdomain)) {
    confidence += 10;
  }

  // Geographic indicators
  if (/\b(us|eu|asia|west|east|central|north|south)\b/i.test(subdomain)) {
    confidence += 10;
  }

  return Math.min(confidence, 100);
}

/**
 * Compare current subdomains with historical baseline
 */
export function detectNewSubdomains(
  current: SubdomainDiscovery[],
  baseline: SubdomainDiscovery[]
): SubdomainDiscovery[] {
  const baselineSet = new Set(baseline.map(d => d.subdomain));
  return current.filter(d => !baselineSet.has(d.subdomain));
}

/**
 * Detect expansion events by analyzing subdomain patterns
 */
export function detectExpansionEvents(
  facilityName: string,
  domain: string,
  newSubdomains: SubdomainDiscovery[]
): ExpansionEvent[] {
  const events: ExpansionEvent[] = [];

  // Group by time windows (weekly)
  const weeklyGroups = new Map<string, SubdomainDiscovery[]>();
  
  for (const subdomain of newSubdomains) {
    const weekKey = getWeekKey(subdomain.firstSeen);
    if (!weeklyGroups.has(weekKey)) {
      weeklyGroups.set(weekKey, []);
    }
    weeklyGroups.get(weekKey)!.push(subdomain);
  }

  // Analyze each week for expansion patterns
  for (const [weekKey, subdomains] of weeklyGroups.entries()) {
    if (subdomains.length < 2) continue; // Require multiple subdomains

    const avgConfidence = subdomains.reduce((sum, s) => sum + s.confidence, 0) / subdomains.length;
    const hasDatacenterPattern = subdomains.some(s => s.pattern === 'datacenter');
    const hasExpansionPattern = subdomains.some(s => s.pattern === 'expansion');

    let significance: ExpansionEvent['significance'];
    if (avgConfidence >= 70 || hasDatacenterPattern) {
      significance = 'high';
    } else if (avgConfidence >= 50 || hasExpansionPattern) {
      significance = 'medium';
    } else {
      significance = 'low';
    }

    // Describe the pattern
    const patterns = [...new Set(subdomains.map(s => s.pattern))];
    const patternDescription = patterns
      .filter(p => p !== 'unknown')
      .join(', ') || 'general infrastructure';

    events.push({
      facilityName,
      domain,
      timestamp: subdomains[0].firstSeen,
      newSubdomains: subdomains.map(s => s.subdomain),
      pattern: patternDescription,
      significance,
    });
  }

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get week key for grouping (YYYY-WW format)
 */
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const daysSinceStart = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((daysSinceStart + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Monitor a facility's domain for new subdomains (polling)
 */
export async function monitorFacilityExpansion(
  facilityName: string,
  domain: string,
  baseline?: SubdomainDiscovery[]
): Promise<{
  allSubdomains: SubdomainDiscovery[];
  newSubdomains: SubdomainDiscovery[];
  expansionEvents: ExpansionEvent[];
}> {
  const certificates = await fetchCertificates(domain);
  const allSubdomains = extractSubdomains(certificates);
  
  const newSubdomains = baseline 
    ? detectNewSubdomains(allSubdomains, baseline)
    : allSubdomains;

  const expansionEvents = detectExpansionEvents(facilityName, domain, newSubdomains);

  return {
    allSubdomains,
    newSubdomains,
    expansionEvents,
  };
}

/**
 * Batch monitor multiple facilities
 */
export async function monitorMultipleFacilities(
  facilities: Array<{ name: string; domain: string; baseline?: SubdomainDiscovery[] }>
): Promise<Map<string, {
  allSubdomains: SubdomainDiscovery[];
  newSubdomains: SubdomainDiscovery[];
  expansionEvents: ExpansionEvent[];
}>> {
  const results = new Map();

  for (const facility of facilities) {
    const result = await monitorFacilityExpansion(
      facility.name,
      facility.domain,
      facility.baseline
    );
    results.set(facility.domain, result);
    
    // Rate limiting - be respectful to crt.sh
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

/**
 * Generate organizer-friendly insights
 */
export function generateExpansionInsights(
  facilityName: string,
  newSubdomains: SubdomainDiscovery[],
  expansionEvents: ExpansionEvent[]
): string[] {
  const insights: string[] = [];

  if (newSubdomains.length === 0) {
    insights.push('✅ No new infrastructure detected - stable configuration');
    return insights;
  }

  insights.push(`🚨 ${newSubdomains.length} new subdomain${newSubdomains.length > 1 ? 's' : ''} detected!`);

  const highConfidence = newSubdomains.filter(s => s.confidence >= 70);
  if (highConfidence.length > 0) {
    insights.push(`⚠️ ${highConfidence.length} high-confidence infrastructure expansion${highConfidence.length > 1 ? 's' : ''}`);
  }

  const datacenterSubdomains = newSubdomains.filter(s => s.pattern === 'datacenter');
  if (datacenterSubdomains.length > 0) {
    insights.push(`🏢 ${datacenterSubdomains.length} new data center subdomain${datacenterSubdomains.length > 1 ? 's' : ''} - possible facility expansion`);
  }

  const highSignificance = expansionEvents.filter(e => e.significance === 'high');
  if (highSignificance.length > 0) {
    insights.push(`📈 ${highSignificance.length} high-significance expansion event${highSignificance.length > 1 ? 's' : ''} detected`);
  }

  // Most recent activity
  if (newSubdomains.length > 0) {
    const mostRecent = newSubdomains[0];
    const daysSince = Math.floor((Date.now() - mostRecent.firstSeen.getTime()) / (24 * 60 * 60 * 1000));
    insights.push(`🕐 Most recent: ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`);
  }

  insights.push(`💡 Compare with job creation promises to verify compliance`);

  return insights;
}

