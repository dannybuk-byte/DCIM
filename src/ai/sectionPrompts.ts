/**
 * Section-Specific AI Prompts for Contextual NLP
 * 
 * Each section of the dashboard gets a tailored AI prompt that understands
 * the specific data, terminology, and actions available in that context.
 */

export type SectionContext =
  | 'global'
  | 'sanctions'
  | 'organizing'
  | 'subsidies'
  | 'contractors'
  | 'corridors'
  | 'ibew-footprint'
  | 'target-prioritization'
  | 'network-security'
  | 'compliance-overview';

export interface SectionPromptConfig {
  systemPrompt: string;
  exampleQueries: string[];
  quickActions: QuickAction[];
  entityTypes: string[];
  keywords: string[];
}

export interface QuickAction {
  label: string;
  query: string;
  icon: string;
  description: string;
}

export const SECTION_PROMPTS: Record<SectionContext, SectionPromptConfig> = {
  global: {
    systemPrompt: `You are an AI assistant for a labor organizing dashboard that tracks data center compliance.
You help organizers find facilities, analyze subsidies, and identify organizing opportunities.
Available data: 11,992 facilities, $2.48B subsidy gap, compliance status, job creation metrics.
Be concise and action-oriented. Suggest next steps when relevant.`,
    exampleQueries: [
      'Show me non-compliant facilities in Texas',
      'Which operators have the largest subsidy gaps?',
      'Find facilities with over 500 jobs promised',
      'Generate a compliance report for California',
    ],
    quickActions: [
      { label: 'Top Violators', query: 'Show top 10 facilities by subsidy gap', icon: '🚨', description: 'Worst compliance offenders' },
      { label: 'High Priority', query: 'Show critical priority organizing targets', icon: '🎯', description: 'Best organizing opportunities' },
    ],
    entityTypes: ['facility', 'operator', 'state', 'compliance_status'],
    keywords: ['facility', 'operator', 'subsidy', 'jobs', 'compliance', 'gap'],
  },

  sanctions: {
    systemPrompt: `You are analyzing OFAC sanctions risk for data center facilities.
Context: SDN (Specially Designated Nationals) list, sanctioned AS Numbers, cryptocurrency addresses.
Risk scores range 0-100: CRITICAL (80+), HIGH (60-79), MODERATE (40-59), LOW (20-39), MINIMAL (<20).
Help identify: high-risk tenants, suspicious BGP peering, SDN name matches, reporting opportunities.
Whistleblower awards: 10-30% of sanctions over $1M. OFAC enforces strict liability.`,
    exampleQueries: [
      'Show facilities with risk score above 70',
      'Search SDN list for tenant name matches',
      'Which facilities have sanctioned AS peering?',
      'Calculate potential whistleblower award for $5M violation',
      'Find crypto mining indicators',
    ],
    quickActions: [
      { label: 'High Risk', query: 'Show all CRITICAL and HIGH risk facilities', icon: '⚠️', description: 'Risk score 60+' },
      { label: 'SDN Search', query: 'Search SDN list for current tenants', icon: '🔍', description: 'Fuzzy name matching' },
      { label: 'BGP Alerts', query: 'Show active BGP sanctions alerts', icon: '🌐', description: 'Sanctioned ASN peering' },
      { label: 'Report', query: 'Generate sanctions risk report', icon: '📋', description: 'Full compliance report' },
    ],
    entityTypes: ['facility', 'tenant', 'sdn_entity', 'asn', 'risk_level'],
    keywords: ['sanctions', 'OFAC', 'SDN', 'risk', 'BGP', 'ASN', 'whistleblower', 'crypto', 'Iran', 'Russia', 'Cuba', 'DPRK'],
  },

  organizing: {
    systemPrompt: `You are assisting labor organizers targeting Big Tech data center operations.
Context: Target prioritization scores, IBEW local coverage, contractor relationships, union campaigns.
Goal: Help organizers identify the best opportunities to build worker power.
Coalition partners: Tech Workers Coalition, CODE-CWA, UPROSE, IBEW locals.
Key metrics: Organizing score, union potential, contractor risk, worker count.`,
    exampleQueries: [
      'Show critical priority targets in Texas',
      'Which IBEW locals cover California facilities?',
      'Find facilities with high union potential scores',
      'What contractors are used at Meta facilities?',
      'Show recent organizing wins',
    ],
    quickActions: [
      { label: 'Hot Targets', query: 'Show top 20 organizing targets by priority score', icon: '🔥', description: 'Best opportunities' },
      { label: 'IBEW Map', query: 'Show IBEW local coverage for all facilities', icon: '⚡', description: 'Union jurisdiction' },
      { label: 'Campaign Intel', query: 'Show active union campaigns', icon: '✊', description: 'Current organizing' },
    ],
    entityTypes: ['facility', 'operator', 'ibew_local', 'contractor', 'campaign'],
    keywords: ['organize', 'union', 'IBEW', 'workers', 'campaign', 'priority', 'target', 'contractor'],
  },

  subsidies: {
    systemPrompt: `You are analyzing taxpayer subsidies given to Big Tech data centers vs actual job creation.
Context: Jobs promised vs delivered, subsidy amounts, compliance status, clawback eligibility.
Total tracked: $2.48B+ in broken promises (subsidy gap).
Help identify: Worst offenders, clawback opportunities, pattern analysis, accountability targets.
Compliance status: Compliant, At Risk, Non-Compliant.`,
    exampleQueries: [
      'Show facilities with subsidy gaps over $10M',
      'Which operator has the worst job fulfillment rate?',
      'Find facilities eligible for subsidy clawback',
      'Compare promised vs actual jobs by state',
      'Show non-compliant facilities receiving tax breaks',
    ],
    quickActions: [
      { label: 'Biggest Gaps', query: 'Top 10 facilities by subsidy gap', icon: '💰', description: 'Worst offenders' },
      { label: 'Clawback', query: 'Show clawback-eligible facilities', icon: '🔄', description: 'Recovery opportunities' },
      { label: 'By State', query: 'Subsidy gaps grouped by state', icon: '🗺️', description: 'Geographic analysis' },
      { label: 'Report', query: 'Generate subsidy accountability report', icon: '📊', description: 'Full analysis' },
    ],
    entityTypes: ['facility', 'operator', 'state', 'subsidy_program'],
    keywords: ['subsidy', 'gap', 'jobs', 'promised', 'created', 'clawback', 'tax break', 'incentive'],
  },

  contractors: {
    systemPrompt: `You are analyzing contractor relationships at data center facilities for joint employer liability.
Context: Staffing agencies, subcontractors, joint employer probability, NLRB precedents.
Goal: Identify organizing opportunities through contractor workforce.
Key factors: Worker count, turnover rate, wage data, safety incidents, joint employer indicators.
NLRB standard: Control over essential terms and conditions of employment.`,
    exampleQueries: [
      'Which contractors have high joint employer risk?',
      'Show facilities using staffing agencies',
      'Find contractors with recent NLRB cases',
      'What is the joint employer probability for Amazon facilities?',
      'Show contractor wage comparisons',
    ],
    quickActions: [
      { label: 'High Risk', query: 'Show contractors with joint employer probability > 70%', icon: '⚖️', description: 'Legal exposure' },
      { label: 'NLRB Cases', query: 'Show recent NLRB contractor cases', icon: '📜', description: 'Legal precedents' },
      { label: 'Wage Intel', query: 'Compare contractor wages by facility', icon: '💵', description: 'Pay analysis' },
    ],
    entityTypes: ['contractor', 'facility', 'operator', 'nlrb_case'],
    keywords: ['contractor', 'staffing', 'joint employer', 'NLRB', 'temp', 'agency', 'subcontractor'],
  },

  corridors: {
    systemPrompt: `You are analyzing data center corridors and network chokepoints.
Context: Geographic clusters, fiber routes, power infrastructure, strategic locations.
Goal: Identify critical infrastructure leverage points for organizing.
Key metrics: Traffic share, facility density, redundancy level, regional importance.
Chokepoints: Locations where work stoppage would have outsized impact.`,
    exampleQueries: [
      'Show chokepoint facilities',
      'Which corridors have highest traffic concentration?',
      'Find strategic facilities with low redundancy',
      'Map fiber routes through Virginia corridor',
      'Show facilities controlling > 10% traffic share',
    ],
    quickActions: [
      { label: 'Chokepoints', query: 'Show critical chokepoint facilities', icon: '🎯', description: 'Maximum leverage' },
      { label: 'Corridors', query: 'List major data center corridors', icon: '🛤️', description: 'Geographic clusters' },
      { label: 'Traffic', query: 'Show facilities by traffic share', icon: '📡', description: 'Network importance' },
    ],
    entityTypes: ['corridor', 'facility', 'fiber_route', 'power_grid'],
    keywords: ['corridor', 'chokepoint', 'traffic', 'fiber', 'strategic', 'redundancy', 'cluster'],
  },

  'ibew-footprint': {
    systemPrompt: `You are analyzing IBEW (International Brotherhood of Electrical Workers) coverage of data center facilities.
Context: Local union jurisdictions, worker counts, contract expirations, expansion opportunities.
Goal: Help IBEW locals identify growth opportunities and coordinate organizing.
Key data: Jurisdiction maps, member counts, contract dates, facility worker estimates.`,
    exampleQueries: [
      'Which IBEW local covers Dallas area facilities?',
      'Show contracts expiring in next 6 months',
      'Find expansion opportunities for Local 569',
      'How many workers are in IBEW-covered facilities?',
      'Show facilities with no current IBEW representation',
    ],
    quickActions: [
      { label: 'Expiring', query: 'Show contracts expiring within 90 days', icon: '⏰', description: 'Upcoming negotiations' },
      { label: 'Expansion', query: 'Show non-union facilities in IBEW jurisdictions', icon: '📈', description: 'Growth opportunities' },
      { label: 'By Local', query: 'Show facility counts by IBEW local', icon: '⚡', description: 'Coverage analysis' },
    ],
    entityTypes: ['ibew_local', 'facility', 'contract', 'jurisdiction'],
    keywords: ['IBEW', 'local', 'union', 'contract', 'jurisdiction', 'expansion', 'workers'],
  },

  'target-prioritization': {
    systemPrompt: `You are helping labor organizers prioritize data center facilities for union campaigns.
Context: Multi-factor scoring based on worker count, conditions, operator, location, momentum.
Score components: Worker density, wage data, safety record, community support, legal factors.
Priority levels: CRITICAL (90+), HIGH (70-89), MEDIUM (50-69), LOW (<50).
Goal: Focus resources on highest-probability wins.`,
    exampleQueries: [
      'Show critical priority facilities in California',
      'What factors make AWS facilities high priority?',
      'Compare organizing scores across operators',
      'Find facilities with recent safety violations',
      'Show targets with strong community support',
    ],
    quickActions: [
      { label: 'Critical', query: 'Show CRITICAL priority targets', icon: '🔴', description: 'Top opportunities' },
      { label: 'By Operator', query: 'Show priority scores by operator', icon: '🏢', description: 'Company analysis' },
      { label: 'Hot States', query: 'Which states have most high-priority targets?', icon: '🗺️', description: 'Geographic focus' },
    ],
    entityTypes: ['facility', 'operator', 'state', 'priority_level'],
    keywords: ['priority', 'score', 'target', 'opportunity', 'critical', 'high', 'organize'],
  },

  'network-security': {
    systemPrompt: `You are analyzing network security and infrastructure of data center facilities.
Context: BGP routing, AS numbers, peering relationships, traffic patterns, security indicators.
Integration: RIPE RIS Live for real-time BGP monitoring.
Goal: Identify security anomalies and network dependencies.`,
    exampleQueries: [
      'Show facilities with BGP anomalies',
      'Which AS numbers peer with sanctioned networks?',
      'Find facilities with unusual traffic patterns',
      'Map peering relationships for major operators',
    ],
    quickActions: [
      { label: 'Anomalies', query: 'Show recent BGP anomalies', icon: '🔴', description: 'Security alerts' },
      { label: 'Peering', query: 'Show peering relationships', icon: '🔗', description: 'Network topology' },
    ],
    entityTypes: ['facility', 'asn', 'peering', 'route'],
    keywords: ['BGP', 'ASN', 'peering', 'route', 'security', 'anomaly', 'traffic'],
  },

  'compliance-overview': {
    systemPrompt: `You are providing an overview of data center compliance across all tracked facilities.
Context: 11,992 facilities, compliance with job creation promises, subsidy accountability.
Metrics: Compliant, At Risk, Non-Compliant status; job fulfillment rates; subsidy gaps.
Goal: Provide high-level insights and identify trends.`,
    exampleQueries: [
      'What percentage of facilities are non-compliant?',
      'Show compliance trends over time',
      'Which states have worst compliance rates?',
      'Compare compliance across operators',
    ],
    quickActions: [
      { label: 'Summary', query: 'Show compliance summary statistics', icon: '📊', description: 'Overview' },
      { label: 'Trends', query: 'Show compliance trends', icon: '📈', description: 'Over time' },
      { label: 'By State', query: 'Compare compliance by state', icon: '🗺️', description: 'Geographic' },
    ],
    entityTypes: ['facility', 'operator', 'state', 'compliance_status'],
    keywords: ['compliance', 'compliant', 'at risk', 'non-compliant', 'trend', 'rate'],
  },
};

/**
 * Get section-specific prompt configuration
 */
export function getSectionPrompt(context: SectionContext): SectionPromptConfig {
  return SECTION_PROMPTS[context] || SECTION_PROMPTS.global;
}

/**
 * Generate AI system prompt for a section with current data context
 */
export function generateContextualPrompt(
  context: SectionContext,
  dataContext?: {
    itemCount?: number;
    filters?: Record<string, unknown>;
    selectedItems?: string[];
  }
): string {
  const config = getSectionPrompt(context);
  let prompt = config.systemPrompt;

  if (dataContext) {
    prompt += '\n\nCurrent context:';
    if (dataContext.itemCount !== undefined) {
      prompt += `\n- Viewing ${dataContext.itemCount} items`;
    }
    if (dataContext.filters && Object.keys(dataContext.filters).length > 0) {
      prompt += `\n- Active filters: ${JSON.stringify(dataContext.filters)}`;
    }
    if (dataContext.selectedItems && dataContext.selectedItems.length > 0) {
      prompt += `\n- Selected items: ${dataContext.selectedItems.join(', ')}`;
    }
  }

  return prompt;
}

/**
 * Check if a query matches section keywords (for routing)
 */
export function detectQuerySection(query: string): SectionContext | null {
  const lower = query.toLowerCase();
  
  // Check each section's keywords
  for (const [section, config] of Object.entries(SECTION_PROMPTS)) {
    const matchCount = config.keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
    if (matchCount >= 2) {
      return section as SectionContext;
    }
  }
  
  return null;
}

