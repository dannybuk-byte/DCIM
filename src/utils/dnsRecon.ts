/**
 * DNS-over-HTTPS Reconnaissance Engine
 * 
 * Uses Cloudflare and Google DoH APIs for comprehensive DNS reconnaissance.
 * Fully browser-native with CORS support.
 * 
 * Based on Jason Haddix's TBHM (The Bug Hunter's Methodology)
 * 
 * Features:
 * - All DNS record types (A, AAAA, MX, TXT, NS, SOA, CAA, CNAME, etc.)
 * - DNSSEC validation
 * - Team Cymru IP-to-ASN mapping via DoH
 * - Subdomain enumeration patterns
 * - No authentication required
 * 
 * Antifragility:
 * - Fallback from Cloudflare to Google DoH
 * - Comprehensive error handling
 * - Request timeout protection
 * - Response validation
 */

export type DNSRecordType = 
  | 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'SOA' 
  | 'CAA' | 'CNAME' | 'PTR' | 'SRV' | 'DNSKEY' | 'DS';

export interface DNSRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

export interface DNSResponse {
  Status: number; // 0 = NOERROR, 2 = SERVFAIL, 3 = NXDOMAIN
  TC: boolean; // Truncated
  RD: boolean; // Recursion Desired
  RA: boolean; // Recursion Available
  AD: boolean; // Authenticated Data (DNSSEC)
  CD: boolean; // Checking Disabled
  Question: Array<{
    name: string;
    type: number;
  }>;
  Answer?: DNSRecord[];
  Authority?: DNSRecord[];
  Comment?: string;
}

export interface FacilityDNSInfo {
  domain: string;
  hasIPv4: boolean;
  hasIPv6: boolean;
  ipAddresses: string[];
  mailServers: string[];
  nameServers: string[];
  txtRecords: string[];
  dnssecEnabled: boolean;
  certificateAuthorities: string[];
  asn?: {
    number: string;
    name: string;
    country: string;
  };
}

/**
 * Query DNS via Cloudflare DoH API
 * Fully CORS-enabled, no authentication required
 */
async function queryCloudflare(domain: string, type: DNSRecordType): Promise<DNSResponse | null> {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}&do=true`,
      {
        headers: {
          'Accept': 'application/dns-json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`Cloudflare DoH returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[DoH] Cloudflare query failed:', error);
    return null;
  }
}

/**
 * Query DNS via Google DoH API (fallback)
 */
async function queryGoogle(domain: string, type: DNSRecordType): Promise<DNSResponse | null> {
  try {
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}&do=true`,
      {
        headers: {
          'Accept': 'application/dns-json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`Google DoH returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[DoH] Google query failed:', error);
    return null;
  }
}

/**
 * Query DNS with automatic fallback
 */
export async function queryDNS(domain: string, type: DNSRecordType): Promise<DNSResponse | null> {
  // Try Cloudflare first (faster, more reliable)
  let result = await queryCloudflare(domain, type);
  
  // Fallback to Google if Cloudflare fails
  if (!result || result.Status !== 0) {
    console.log('[DoH] Falling back to Google DNS...');
    result = await queryGoogle(domain, type);
  }

  return result;
}

/**
 * Get A records (IPv4 addresses)
 */
export async function getIPv4Addresses(domain: string): Promise<string[]> {
  const response = await queryDNS(domain, 'A');
  if (!response || !response.Answer) return [];
  
  return response.Answer
    .filter(record => record.type === 1) // A record
    .map(record => record.data);
}

/**
 * Get AAAA records (IPv6 addresses)
 */
export async function getIPv6Addresses(domain: string): Promise<string[]> {
  const response = await queryDNS(domain, 'AAAA');
  if (!response || !response.Answer) return [];
  
  return response.Answer
    .filter(record => record.type === 28) // AAAA record
    .map(record => record.data);
}

/**
 * Get MX records (mail servers)
 */
export async function getMailServers(domain: string): Promise<string[]> {
  const response = await queryDNS(domain, 'MX');
  if (!response || !response.Answer) return [];
  
  return response.Answer
    .filter(record => record.type === 15) // MX record
    .map(record => record.data.split(' ')[1]) // Format: "10 mail.example.com."
    .filter(Boolean);
}

/**
 * Get NS records (name servers)
 */
export async function getNameServers(domain: string): Promise<string[]> {
  const response = await queryDNS(domain, 'NS');
  if (!response || !response.Answer) return [];
  
  return response.Answer
    .filter(record => record.type === 2) // NS record
    .map(record => record.data);
}

/**
 * Get TXT records (includes SPF, DMARC, verification tokens)
 */
export async function getTXTRecords(domain: string): Promise<string[]> {
  const response = await queryDNS(domain, 'TXT');
  if (!response || !response.Answer) return [];
  
  return response.Answer
    .filter(record => record.type === 16) // TXT record
    .map(record => record.data.replace(/^"|"$/g, '')); // Remove quotes
}

/**
 * Get CAA records (Certificate Authority Authorization)
 */
export async function getCertificateAuthorities(domain: string): Promise<string[]> {
  const response = await queryDNS(domain, 'CAA');
  if (!response || !response.Answer) return [];
  
  return response.Answer
    .filter(record => record.type === 257) // CAA record
    .map(record => {
      // Format: "0 issue letsencrypt.org"
      const parts = record.data.split(' ');
      return parts[2] || record.data;
    })
    .filter(Boolean);
}

/**
 * Check DNSSEC validation
 */
export async function checkDNSSEC(domain: string): Promise<boolean> {
  const response = await queryDNS(domain, 'A');
  return response?.AD || false; // AD flag indicates authenticated data
}

/**
 * Get ASN information via Team Cymru using DoH
 * Query format: {reversed-ip}.origin.asn.cymru.com TXT
 */
export async function getASNForIP(ip: string): Promise<{
  asn: string;
  prefix: string;
  country: string;
  registry: string;
  name?: string;
} | null> {
  try {
    // Reverse IP octets
    const reversed = ip.split('.').reverse().join('.');
    const query = `${reversed}.origin.asn.cymru.com`;
    
    const response = await queryDNS(query, 'TXT');
    if (!response || !response.Answer || response.Answer.length === 0) {
      return null;
    }

    // Format: "ASN | IP/Prefix | Country | Registry | Allocated"
    // Example: "15169 | 8.8.8.0/24 | US | arin | 1992-12-01"
    const data = response.Answer[0].data.replace(/^"|"$/g, '');
    const parts = data.split('|').map(p => p.trim());

    if (parts.length < 4) return null;

    return {
      asn: parts[0],
      prefix: parts[1],
      country: parts[2],
      registry: parts[3],
    };
  } catch (error) {
    console.error('[DoH] ASN lookup failed:', error);
    return null;
  }
}

/**
 * Get ASN name via Team Cymru
 * Query format: AS{number}.asn.cymru.com TXT
 */
export async function getASNName(asn: string): Promise<string | null> {
  try {
    const query = `AS${asn}.asn.cymru.com`;
    const response = await queryDNS(query, 'TXT');
    
    if (!response || !response.Answer || response.Answer.length === 0) {
      return null;
    }

    // Format: "ASN | Country | Registry | Allocated | ASName"
    const data = response.Answer[0].data.replace(/^"|"$/g, '');
    const parts = data.split('|').map(p => p.trim());
    
    return parts[4] || null; // ASName is the 5th field
  } catch (error) {
    console.error('[DoH] ASN name lookup failed:', error);
    return null;
  }
}

/**
 * Comprehensive facility DNS reconnaissance
 */
export async function getFacilityDNSInfo(domain: string): Promise<FacilityDNSInfo> {
  try {
    // Run all queries in parallel for speed
    const [
      ipv4Addresses,
      ipv6Addresses,
      mailServers,
      nameServers,
      txtRecords,
      certificateAuthorities,
      dnssecEnabled,
    ] = await Promise.all([
      getIPv4Addresses(domain),
      getIPv6Addresses(domain),
      getMailServers(domain),
      getNameServers(domain),
      getTXTRecords(domain),
      getCertificateAuthorities(domain),
      checkDNSSEC(domain),
    ]);

    // Get ASN for first IPv4 address
    let asn: FacilityDNSInfo['asn'];
    if (ipv4Addresses.length > 0) {
      const asnInfo = await getASNForIP(ipv4Addresses[0]);
      if (asnInfo) {
        const asnName = await getASNName(asnInfo.asn);
        asn = {
          number: asnInfo.asn,
          name: asnName || 'Unknown',
          country: asnInfo.country,
        };
      }
    }

    return {
      domain,
      hasIPv4: ipv4Addresses.length > 0,
      hasIPv6: ipv6Addresses.length > 0,
      ipAddresses: [...ipv4Addresses, ...ipv6Addresses],
      mailServers,
      nameServers,
      txtRecords,
      dnssecEnabled,
      certificateAuthorities,
      asn,
    };
  } catch (error) {
    console.error('[DoH] Facility DNS reconnaissance failed:', error);
    
    // Return minimal info on error
    return {
      domain,
      hasIPv4: false,
      hasIPv6: false,
      ipAddresses: [],
      mailServers: [],
      nameServers: [],
      txtRecords: [],
      dnssecEnabled: false,
      certificateAuthorities: [],
    };
  }
}

/**
 * Detect data center patterns in DNS records
 * Based on Haddix methodology
 */
export function detectDataCenterPatterns(dnsInfo: FacilityDNSInfo): {
  hasDataCenterIndicators: boolean;
  patterns: string[];
  insights: string[];
} {
  const patterns: string[] = [];
  const insights: string[] = [];

  // Check for data center naming patterns
  const dcPatterns = [
    /dc\d+/i,
    /datacenter/i,
    /datacentre/i,
    /colo/i,
    /facility/i,
    /pop\d+/i,
  ];

  // Check domain and nameservers
  const allNames = [dnsInfo.domain, ...dnsInfo.nameServers];
  for (const name of allNames) {
    for (const pattern of dcPatterns) {
      if (pattern.test(name)) {
        patterns.push(`Data center pattern in: ${name}`);
      }
    }
  }

  // Check for cloud provider indicators in TXT records
  const cloudProviders = ['aws', 'azure', 'google-cloud', 'cloudflare'];
  for (const txt of dnsInfo.txtRecords) {
    for (const provider of cloudProviders) {
      if (txt.toLowerCase().includes(provider)) {
        insights.push(`Cloud provider indicator: ${provider}`);
      }
    }
  }

  // Check for DNSSEC (indicates security maturity)
  if (dnsInfo.dnssecEnabled) {
    insights.push('DNSSEC enabled - good security posture');
  }

  // Check for missing IPv6 (outdated infrastructure)
  if (dnsInfo.hasIPv4 && !dnsInfo.hasIPv6) {
    insights.push('No IPv6 support - potentially outdated infrastructure');
  }

  return {
    hasDataCenterIndicators: patterns.length > 0,
    patterns,
    insights,
  };
}

