/**
 * AI Infrastructure Intelligence Service
 * 
 * Coalition Weapon Feature: Tracks AI company infrastructure for "Clean Internet" scoring
 * 
 * Features:
 * - AI Company AS Watchlist (OpenAI, Anthropic, Meta AI, Google DeepMind, Mistral)
 * - Crawl-to-Refer Ratio calculation ("Clean Internet Score")
 * - Infrastructure Early Warning via Certificate Transparency
 * - Data Center Origin Classification
 * - STIX 2.1 export for security vendor licensing
 * 
 * Commercial Value: $50K-200K/year per CDN/Security partner
 */

// =============================================================================
// AI COMPANY AS WATCHLIST
// =============================================================================

export interface AICompanyProfile {
  name: string;
  asns: number[];
  ipPrefixes: string[];
  domains: string[];
  certPatterns: RegExp[];
  crawlerUserAgents: string[];
  knownCrawlRatio: number; // crawl:refer ratio (higher = worse)
  publicStatements: string[];
  lastUpdated: string;
}

export const AI_COMPANY_WATCHLIST: AICompanyProfile[] = [
  {
    name: 'OpenAI',
    asns: [395349], // AS395349 - OpenAI OpCo, LLC
    ipPrefixes: [
      '20.168.0.0/16',    // Azure partnership IPs
      '52.167.0.0/16',    // Azure inference
      '40.74.0.0/15',     // Azure training clusters
    ],
    domains: ['openai.com', 'chatgpt.com', 'api.openai.com'],
    certPatterns: [
      /.*\.openai\.com$/i,
      /.*\.chatgpt\.com$/i,
      /openai-.*\./i,
      /gpt-.*\./i,
    ],
    crawlerUserAgents: [
      'GPTBot/1.0',
      'ChatGPT-User',
      'OAI-SearchBot/1.0',
    ],
    knownCrawlRatio: 1500, // 1,500:1 crawl-to-refer ratio
    publicStatements: [
      'OpenAI respects robots.txt (claimed)',
      'Partnership with Microsoft Azure for infrastructure',
    ],
    lastUpdated: '2026-01-06',
  },
  {
    name: 'Anthropic',
    asns: [398324], // Anthropic PBC
    ipPrefixes: [
      '35.192.0.0/12',    // GCP partnership
      '34.64.0.0/10',     // GCP inference
    ],
    domains: ['anthropic.com', 'claude.ai', 'api.anthropic.com'],
    certPatterns: [
      /.*\.anthropic\.com$/i,
      /.*\.claude\.ai$/i,
      /anthropic-.*\./i,
      /claude-.*\./i,
    ],
    crawlerUserAgents: [
      'ClaudeBot/1.0',
      'Claude-Web/1.0',
      'anthropic-ai/1.0',
    ],
    knownCrawlRatio: 60000, // 60,000:1 - worst in industry
    publicStatements: [
      'Anthropic claims to respect robots.txt',
      'Partnership with Google Cloud and Amazon',
    ],
    lastUpdated: '2026-01-06',
  },
  {
    name: 'Meta AI',
    asns: [
      32934,  // Facebook, Inc. (primary)
      63293,  // Facebook Ireland
      54115,  // Facebook Connectivity
    ],
    ipPrefixes: [
      '157.240.0.0/16',   // Meta primary
      '31.13.0.0/16',     // Meta Europe
      '66.220.0.0/16',    // Legacy Facebook
      '69.63.176.0/20',   // Meta data centers
      '102.132.96.0/20',  // Meta Africa
    ],
    domains: ['meta.com', 'facebook.com', 'ai.meta.com', 'llama.meta.com'],
    certPatterns: [
      /.*\.meta\.com$/i,
      /.*\.facebook\.com$/i,
      /llama-.*\./i,
      /meta-ai-.*\./i,
    ],
    crawlerUserAgents: [
      'Meta-ExternalAgent/1.1',
      'Meta-ExternalFetcher/1.1',
      'facebookexternalhit/1.1',
    ],
    knownCrawlRatio: 8500, // 8,500:1
    publicStatements: [
      'Open-sourced Llama models',
      'Data center expansion in New Mexico, Texas, Indiana',
    ],
    lastUpdated: '2026-01-06',
  },
  {
    name: 'Google DeepMind',
    asns: [
      15169,  // Google LLC (primary)
      36040,  // Google Cloud Platform
      396982, // Google Cloud
    ],
    ipPrefixes: [
      '8.8.8.0/24',       // Google Public DNS (reference)
      '35.190.0.0/17',    // GCP
      '35.191.0.0/16',    // GCP
      '34.64.0.0/10',     // GCP global
      '104.196.0.0/14',   // GCP
    ],
    domains: ['deepmind.com', 'deepmind.google.com', 'gemini.google.com'],
    certPatterns: [
      /.*\.deepmind\.com$/i,
      /.*\.gemini\.google\.com$/i,
      /deepmind-.*\./i,
      /gemini-.*\./i,
      /bard-.*\./i,
    ],
    crawlerUserAgents: [
      'Googlebot/2.1',
      'Google-Extended',
      'GoogleOther',
    ],
    knownCrawlRatio: 2200, // 2,200:1
    publicStatements: [
      'Google-Extended allows opt-out from AI training',
      'Gemini powers consumer AI products',
    ],
    lastUpdated: '2026-01-06',
  },
  {
    name: 'Mistral AI',
    asns: [216361], // Mistral AI (French startup)
    ipPrefixes: [
      '185.238.0.0/16',   // European hosting
    ],
    domains: ['mistral.ai', 'chat.mistral.ai', 'api.mistral.ai'],
    certPatterns: [
      /.*\.mistral\.ai$/i,
      /mistral-.*\./i,
    ],
    crawlerUserAgents: [
      'MistralBot/1.0',
    ],
    knownCrawlRatio: 5000, // Estimated
    publicStatements: [
      'European AI leader',
      'Open-weight models (Mixtral)',
    ],
    lastUpdated: '2026-01-06',
  },
  {
    name: 'xAI (Grok)',
    asns: [], // Uses cloud providers
    ipPrefixes: [],
    domains: ['x.ai', 'grok.x.ai'],
    certPatterns: [
      /.*\.x\.ai$/i,
      /grok-.*\./i,
    ],
    crawlerUserAgents: [
      'xAI-Grok',
    ],
    knownCrawlRatio: 10000, // Estimated - aggressive scraping reported
    publicStatements: [
      'Elon Musk\'s AI venture',
      'Training on X/Twitter data',
    ],
    lastUpdated: '2026-01-06',
  },
  {
    name: 'Perplexity AI',
    asns: [], // Uses cloud providers
    ipPrefixes: [],
    domains: ['perplexity.ai', 'api.perplexity.ai'],
    certPatterns: [
      /.*\.perplexity\.ai$/i,
      /perplexity-.*\./i,
    ],
    crawlerUserAgents: [
      'PerplexityBot/1.0',
    ],
    knownCrawlRatio: 50000, // Very aggressive - reported by publishers
    publicStatements: [
      'AI-powered search engine',
      'Controversial scraping practices',
    ],
    lastUpdated: '2026-01-06',
  },
  {
    name: 'ByteDance AI',
    asns: [
      138699, // ByteDance
      398433, // ByteDance US
    ],
    ipPrefixes: [
      '110.242.68.0/22', // China
    ],
    domains: ['bytedance.com', 'doubao.com'],
    certPatterns: [
      /.*\.bytedance\.com$/i,
      /doubao-.*\./i,
    ],
    crawlerUserAgents: [
      'Bytespider',
      'TikTokSpider',
    ],
    knownCrawlRatio: 25000, // Aggressive
    publicStatements: [
      'TikTok parent company',
      'Doubao AI assistant in China',
    ],
    lastUpdated: '2026-01-06',
  },
];

// =============================================================================
// CLEAN INTERNET SCORE CALCULATOR
// =============================================================================

export interface CleanInternetScore {
  company: string;
  crawlToReferRatio: number;
  score: number; // 0-100, higher = cleaner/better
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  explanation: string;
  robotsTxtCompliance: boolean | null;
  referralPercentage: number;
  lastCalculated: string;
}

/**
 * Calculate Clean Internet Score based on crawl-to-refer ratio
 * Score inversely related to extraction behavior
 */
export function calculateCleanInternetScore(
  crawlCount: number,
  referralCount: number,
  robotsTxtCompliant: boolean = true
): CleanInternetScore {
  const ratio = referralCount > 0 ? crawlCount / referralCount : Infinity;
  
  // Score calculation: lower ratio = higher score
  // 1:1 ratio = 100 points, 60000:1 = ~0 points
  let baseScore = Math.max(0, 100 - Math.log10(ratio) * 20);
  
  // Penalty for robots.txt non-compliance
  if (!robotsTxtCompliant) {
    baseScore *= 0.5;
  }
  
  const score = Math.round(Math.max(0, Math.min(100, baseScore)));
  
  // Grade assignment
  let grade: CleanInternetScore['grade'];
  if (score >= 80) grade = 'A';
  else if (score >= 60) grade = 'B';
  else if (score >= 40) grade = 'C';
  else if (score >= 20) grade = 'D';
  else grade = 'F';
  
  // Explanation generation
  let explanation: string;
  if (ratio <= 10) {
    explanation = 'Excellent: Near-equal crawl and referral traffic. Sustainable extraction.';
  } else if (ratio <= 100) {
    explanation = 'Good: Moderate extraction with meaningful referral traffic.';
  } else if (ratio <= 1000) {
    explanation = 'Fair: Significant extraction relative to referrals. Monitor closely.';
  } else if (ratio <= 10000) {
    explanation = 'Poor: High extraction with minimal referral value. Consider blocking.';
  } else {
    explanation = 'Critical: Extreme extraction ratio. Parasitic behavior. Recommend blocking.';
  }
  
  return {
    company: 'Unknown',
    crawlToReferRatio: ratio,
    score,
    grade,
    explanation,
    robotsTxtCompliance: robotsTxtCompliant,
    referralPercentage: referralCount > 0 ? (referralCount / crawlCount) * 100 : 0,
    lastCalculated: new Date().toISOString(),
  };
}

/**
 * Get pre-calculated scores for known AI companies
 */
export function getKnownAICompanyScores(): CleanInternetScore[] {
  return AI_COMPANY_WATCHLIST.map(company => {
    const baseScore = calculateCleanInternetScore(company.knownCrawlRatio, 1);
    return {
      ...baseScore,
      company: company.name,
    };
  }).sort((a, b) => b.score - a.score); // Best to worst
}

// =============================================================================
// DATA CENTER ORIGIN CLASSIFICATION
// =============================================================================

export interface CloudProviderIPRange {
  provider: string;
  region: string;
  prefix: string;
  service: string;
  lastUpdated: string;
}

// Major cloud provider IP ranges (subset - full list would be fetched from APIs)
export const CLOUD_PROVIDER_IP_RANGES: CloudProviderIPRange[] = [
  // AWS (partial - full list at https://ip-ranges.amazonaws.com/ip-ranges.json)
  { provider: 'AWS', region: 'us-east-1', prefix: '3.0.0.0/8', service: 'EC2', lastUpdated: '2026-01-06' },
  { provider: 'AWS', region: 'us-east-1', prefix: '52.0.0.0/8', service: 'EC2', lastUpdated: '2026-01-06' },
  { provider: 'AWS', region: 'us-west-2', prefix: '44.224.0.0/11', service: 'EC2', lastUpdated: '2026-01-06' },
  
  // Azure (partial - full list at https://www.microsoft.com/en-us/download/details.aspx?id=56519)
  { provider: 'Azure', region: 'eastus', prefix: '20.0.0.0/8', service: 'Compute', lastUpdated: '2026-01-06' },
  { provider: 'Azure', region: 'westus2', prefix: '40.64.0.0/10', service: 'Compute', lastUpdated: '2026-01-06' },
  
  // GCP (partial - full list at https://www.gstatic.com/ipranges/cloud.json)
  { provider: 'GCP', region: 'us-central1', prefix: '34.64.0.0/10', service: 'Compute', lastUpdated: '2026-01-06' },
  { provider: 'GCP', region: 'us-east1', prefix: '35.190.0.0/17', service: 'Compute', lastUpdated: '2026-01-06' },
];

export interface IPClassificationResult {
  ip: string;
  isDataCenter: boolean;
  provider: string | null;
  region: string | null;
  service: string | null;
  aiCompany: string | null;
  riskLevel: 'high' | 'medium' | 'low' | 'unknown';
  recommendation: string;
}

/**
 * Classify an IP address by origin
 * Used for bot traffic detection and fraud prevention
 */
export function classifyIP(ip: string): IPClassificationResult {
  // Check AI company direct IPs first
  for (const company of AI_COMPANY_WATCHLIST) {
    for (const prefix of company.ipPrefixes) {
      if (ipInPrefix(ip, prefix)) {
        return {
          ip,
          isDataCenter: true,
          provider: null,
          region: null,
          service: 'AI Infrastructure',
          aiCompany: company.name,
          riskLevel: 'high',
          recommendation: `AI crawler source. Crawl-to-refer ratio: ${company.knownCrawlRatio}:1. Consider blocking or rate-limiting.`,
        };
      }
    }
  }
  
  // Check cloud provider ranges
  for (const range of CLOUD_PROVIDER_IP_RANGES) {
    if (ipInPrefix(ip, range.prefix)) {
      return {
        ip,
        isDataCenter: true,
        provider: range.provider,
        region: range.region,
        service: range.service,
        aiCompany: null,
        riskLevel: 'medium',
        recommendation: `Cloud provider origin. May be legitimate or bot traffic. Verify user-agent and behavior.`,
      };
    }
  }
  
  // Not classified as data center
  return {
    ip,
    isDataCenter: false,
    provider: null,
    region: null,
    service: null,
    aiCompany: null,
    riskLevel: 'low',
    recommendation: 'Appears to be residential/ISP IP. Lower fraud risk.',
  };
}

// Simple IP prefix check (for demo - production would use proper CIDR library)
function ipInPrefix(ip: string, prefix: string): boolean {
  const [prefixIP, bits] = prefix.split('/');
  const prefixParts = prefixIP.split('.').map(Number);
  const ipParts = ip.split('.').map(Number);
  const mask = parseInt(bits);
  
  // Only check first octet for demo (production would do full CIDR math)
  if (mask <= 8) {
    return ipParts[0] === prefixParts[0];
  }
  return ipParts[0] === prefixParts[0] && ipParts[1] >= prefixParts[1];
}

// =============================================================================
// CERTIFICATE TRANSPARENCY EARLY WARNING
// =============================================================================

export interface CertificateAlert {
  domain: string;
  company: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  significance: 'critical' | 'high' | 'medium' | 'low';
  interpretation: string;
  detectedAt: string;
}

/**
 * Check if a certificate domain matches known AI company patterns
 */
export function detectAICertificate(
  domain: string,
  issuer: string,
  notBefore: string
): CertificateAlert | null {
  for (const company of AI_COMPANY_WATCHLIST) {
    for (const pattern of company.certPatterns) {
      if (pattern.test(domain)) {
        // Determine significance based on domain pattern
        let significance: CertificateAlert['significance'] = 'medium';
        let interpretation = `New certificate for ${company.name} infrastructure.`;
        
        if (domain.includes('api.') || domain.includes('inference')) {
          significance = 'critical';
          interpretation = `New API/inference endpoint detected for ${company.name}. Indicates capacity expansion.`;
        } else if (domain.includes('train') || domain.includes('cluster')) {
          significance = 'high';
          interpretation = `Training infrastructure expansion detected for ${company.name}.`;
        } else if (domain.includes('test') || domain.includes('dev') || domain.includes('staging')) {
          significance = 'low';
          interpretation = `Development/staging infrastructure for ${company.name}. Early indicator of future deployment.`;
        }
        
        return {
          domain,
          company: company.name,
          issuer,
          notBefore,
          notAfter: '', // Would be filled from actual cert data
          significance,
          interpretation,
          detectedAt: new Date().toISOString(),
        };
      }
    }
  }
  
  return null;
}

// =============================================================================
// STIX 2.1 EXPORT
// =============================================================================

export interface STIXBundle {
  type: 'bundle';
  id: string;
  objects: STIXObject[];
}

export interface STIXObject {
  type: string;
  spec_version: '2.1';
  id: string;
  created: string;
  modified: string;
  [key: string]: unknown;
}

/**
 * Convert AI infrastructure detection to STIX 2.1 format
 * For threat intelligence sharing with security vendors
 */
export function exportToSTIX(
  detections: CertificateAlert[],
  classifications: IPClassificationResult[]
): STIXBundle {
  const objects: STIXObject[] = [];
  const now = new Date().toISOString();
  
  // Create infrastructure objects for AI companies
  for (const company of AI_COMPANY_WATCHLIST) {
    objects.push({
      type: 'infrastructure',
      spec_version: '2.1',
      id: `infrastructure--${crypto.randomUUID()}`,
      created: now,
      modified: now,
      name: `${company.name} AI Infrastructure`,
      description: `AI training and inference infrastructure operated by ${company.name}`,
      infrastructure_types: ['hosting', 'botnet'],
      aliases: company.domains,
    });
  }
  
  // Create indicators for high-risk IPs
  for (const classification of classifications.filter(c => c.riskLevel === 'high')) {
    objects.push({
      type: 'indicator',
      spec_version: '2.1',
      id: `indicator--${crypto.randomUUID()}`,
      created: now,
      modified: now,
      name: `AI Crawler IP: ${classification.ip}`,
      description: classification.recommendation,
      pattern: `[ipv4-addr:value = '${classification.ip}']`,
      pattern_type: 'stix',
      valid_from: now,
      labels: ['malicious-activity', 'ai-crawler'],
    });
  }
  
  // Create sightings for certificate alerts
  for (const alert of detections) {
    objects.push({
      type: 'sighting',
      spec_version: '2.1',
      id: `sighting--${crypto.randomUUID()}`,
      created: now,
      modified: now,
      first_seen: alert.detectedAt,
      last_seen: alert.detectedAt,
      count: 1,
      description: alert.interpretation,
      sighting_of_ref: `infrastructure--${alert.company.toLowerCase().replace(/\s+/g, '-')}`,
    });
  }
  
  return {
    type: 'bundle',
    id: `bundle--${crypto.randomUUID()}`,
    objects,
  };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export function getAllAICompanyASNs(): number[] {
  return AI_COMPANY_WATCHLIST.flatMap(c => c.asns);
}

export function getAllAICompanyDomains(): string[] {
  return AI_COMPANY_WATCHLIST.flatMap(c => c.domains);
}

export function getAllAICrawlerUserAgents(): string[] {
  return AI_COMPANY_WATCHLIST.flatMap(c => c.crawlerUserAgents);
}

export function getCompanyByASN(asn: number): AICompanyProfile | undefined {
  return AI_COMPANY_WATCHLIST.find(c => c.asns.includes(asn));
}

export function getCompanyByDomain(domain: string): AICompanyProfile | undefined {
  const normalized = domain.toLowerCase();
  return AI_COMPANY_WATCHLIST.find(c => 
    c.domains.some(d => normalized.includes(d.toLowerCase()))
  );
}

export function getCompanyByCrawler(userAgent: string): AICompanyProfile | undefined {
  const normalized = userAgent.toLowerCase();
  return AI_COMPANY_WATCHLIST.find(c =>
    c.crawlerUserAgents.some(ua => normalized.includes(ua.toLowerCase()))
  );
}

