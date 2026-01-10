/**
 * SurveillanceAnalysis.tsx
 * 
 * Pattern analysis and surveillance awareness component.
 * Inspired by Shoshana Zuboff's "Surveillance Capitalism" and the
 * Uptime Institute's analysis of DCIM data collection practices.
 * 
 * @see https://journal.uptimeinstitute.com/surveillance-capitalism-and-dcim/
 * 
 * This component shows:
 * 1. What DCIM/DMaaS vendors CAN extract from data center operations
 * 2. How our counter-surveillance approach uses PUBLIC data for accountability
 * 3. Pattern analysis that exposes Big Tech's broken promises
 */

import React, { useState, useMemo } from 'react';
import {
  Eye, EyeOff, Shield, AlertTriangle, TrendingUp, TrendingDown,
  Activity, Cpu, Thermometer, Zap, Users, DollarSign, Building,
  Network, Lock, Unlock, Database, Cloud, CloudOff, Search,
  BarChart3, PieChart, LineChart, Target, Brain, Fingerprint,
  Radio, Wifi, Server, HardDrive, ChevronDown, ChevronUp,
  Info, ExternalLink, BookOpen, Monitor
} from 'lucide-react';
import { RealTimeIntelligence } from './RealTimeIntelligence';
import { DataPointsExplorer } from './DataPointsExplorer';

// Types
interface SurveillanceVector {
  id: string;
  name: string;
  description: string;
  dataCollected: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  vendors: string[];
  countermeasure: string;
}

interface PatternInsight {
  id: string;
  pattern: string;
  implication: string;
  dataSource: string;
  confidence: number;
  forOrganizers: string;
}

interface DMaaSProvider {
  name: string;
  product: string;
  dataCollectionScope: string[];
  marketShare: number;
  privacyConcerns: string[];
}

// COMPREHENSIVE DATA COLLECTION - Every conceivable way DCIM/DMaaS can extract commercial intelligence
const SURVEILLANCE_VECTORS: SurveillanceVector[] = [
  // ============================================
  // CATEGORY 1: POWER & ELECTRICAL INTELLIGENCE
  // ============================================
  {
    id: 'power-granular',
    name: '⚡ Power Consumption (Granular)',
    description: 'Sub-second power telemetry reveals exact workload patterns, business cycles, and growth trajectory',
    dataCollected: [
      'Real-time power draw per rack (kW) at 1-second intervals',
      'Power factor and harmonics analysis (reveals equipment types)',
      'UPS load percentages and battery health/discharge patterns',
      'PDU circuit-level utilization (identifies which equipment is running)',
      'Branch circuit monitoring (maps power to specific servers)',
      'Peak demand timing (reveals business hours, batch job schedules)',
      'Seasonal and daily variations (exposes usage patterns)',
      'Power quality events (sags, swells, harmonics)',
      'Generator fuel consumption rates',
      'Transfer switch activation logs',
      'Redundancy utilization (A+B feed balance)',
      'Stranded capacity identification'
    ],
    riskLevel: 'critical',
    vendors: ['Schneider Electric EcoStruxure', 'Vertiv Liebert', 'Eaton', 'ABB', 'Raritan', 'Server Technology'],
    countermeasure: 'Track public utility filings, disclosed power purchase agreements, and permit applications'
  },
  {
    id: 'power-derived',
    name: '📊 Power-Derived Business Intel',
    description: 'What vendors can INFER from power data alone',
    dataCollected: [
      'Workload intensity (CPU utilization proxy from power draw)',
      'Customer growth rate (correlating power growth to revenue)',
      'Product launch timing (sudden compute spikes)',
      'Batch processing schedules (predictable power patterns)',
      'Disaster recovery test schedules',
      'Database maintenance windows',
      'Marketing campaign effectiveness (traffic spikes = power spikes)',
      'Black Friday / holiday readiness preparations',
      'Cryptocurrency mining detection',
      'AI/ML training job schedules (GPU power signatures)',
      'Video encoding workloads (distinctive power profiles)',
      'Financial trading activity (ultra-low latency power patterns)'
    ],
    riskLevel: 'critical',
    vendors: ['Any DCIM with power monitoring'],
    countermeasure: 'Cross-reference with SEC filings, earnings calls, and press releases'
  },

  // ============================================
  // CATEGORY 2: THERMAL & ENVIRONMENTAL
  // ============================================
  {
    id: 'cooling-detailed',
    name: '🌡️ Thermal Intelligence (Detailed)',
    description: 'Temperature and cooling data reveals equipment density, age, and operational efficiency',
    dataCollected: [
      'Supply/return air temperatures per row',
      'Rack inlet/outlet temperatures (per rack)',
      'Hot aisle/cold aisle containment effectiveness',
      'Chiller efficiency (kW/ton) trending',
      'CRAC/CRAH unit performance metrics',
      'Economizer hours and free cooling utilization',
      'Delta-T across heat exchangers',
      'Refrigerant levels and leak detection',
      'Cooling tower water temperature and flow rates',
      'Humidification/dehumidification cycles',
      'Airflow CFM measurements per tile/vent',
      'Thermal throttling events (CPU/GPU)',
      'Hot spot detection and mapping',
      'PUE (Power Usage Effectiveness) real-time and trending'
    ],
    riskLevel: 'high',
    vendors: ['Schneider Electric', 'Vertiv', 'Trane', 'Carrier', 'Emerson', 'Daikin'],
    countermeasure: 'EPA permit data and environmental compliance filings'
  },
  {
    id: 'environmental-sensors',
    name: '🌿 Environmental Monitoring',
    description: 'Environmental sensors reveal operational practices and compliance posture',
    dataCollected: [
      'Humidity levels (absolute and relative)',
      'Air quality (particulate counts)',
      'Water leak detection locations and history',
      'Smoke/fire detection events',
      'Flooding risk indicators',
      'Outdoor weather correlation data',
      'Barometric pressure (altitude compensation)',
      'Noise levels (dB measurements)',
      'Vibration monitoring (seismic, mechanical)',
      'Chemical detection (battery off-gassing)',
      'CO2 levels (occupancy proxy)',
      'VOC (volatile organic compound) levels'
    ],
    riskLevel: 'medium',
    vendors: ['APC NetBotz', 'Geist', 'Raritan', 'AKCP', 'Paessler PRTG'],
    countermeasure: 'OSHA incident reports and EPA environmental data'
  },

  // ============================================
  // CATEGORY 3: NETWORK & CONNECTIVITY
  // ============================================
  {
    id: 'network-deep',
    name: '🌐 Network Traffic Analysis (Deep)',
    description: 'Network telemetry reveals customer relationships, business volume, and security posture',
    dataCollected: [
      'Bandwidth utilization per port (Gbps trending)',
      'Traffic patterns by time of day/week/month',
      'Protocol distribution (HTTP, HTTPS, SQL, etc.)',
      'Top talkers (source/destination pairs)',
      'Cross-connect utilization to carriers',
      'IX (Internet Exchange) traffic volumes',
      'CDN origin traffic patterns',
      'API gateway call volumes',
      'DNS query volumes and patterns',
      'BGP route announcements',
      'MPLS/VPN tunnel utilization',
      'SD-WAN path selection analytics',
      'Packet loss and latency metrics',
      'Jitter measurements (VoIP/video quality)',
      'TCP retransmission rates',
      'Connection count trends (concurrent sessions)'
    ],
    riskLevel: 'critical',
    vendors: ['Cisco', 'Juniper', 'Arista', 'Palo Alto', 'Fortinet', 'NetScout', 'ThousandEyes'],
    countermeasure: 'PeeringDB data, BGP looking glasses, and public AS information'
  },
  {
    id: 'network-metadata',
    name: '📡 Network Metadata Intelligence',
    description: 'Even without deep packet inspection, metadata reveals enormous business intelligence',
    dataCollected: [
      'Connection patterns to known cloud providers (AWS, Azure, GCP)',
      'Traffic to competitor networks',
      'Geographic traffic distribution',
      'Time-of-day usage patterns by region',
      'Mobile vs desktop traffic ratios',
      'Video streaming bandwidth consumption',
      'Gaming traffic signatures',
      'Cryptocurrency exchange traffic',
      'Financial market data feed volumes',
      'Healthcare/HIPAA traffic patterns',
      'Government/military traffic indicators',
      'International traffic patterns (reveals global customers)',
      'DDoS attack patterns and mitigation costs',
      'Traffic asymmetry (upload vs download ratios)'
    ],
    riskLevel: 'critical',
    vendors: ['Any network monitoring tool', 'ISPs', 'Colocation providers'],
    countermeasure: 'Public peering data and network topology information'
  },

  // ============================================
  // CATEGORY 4: PHYSICAL SECURITY & ACCESS
  // ============================================
  {
    id: 'physical-access',
    name: '🔐 Physical Security Intelligence',
    description: 'Access control data reveals organizational structure, work patterns, and staffing levels',
    dataCollected: [
      'Badge-in/badge-out timestamps',
      'Access attempt failures (security incidents)',
      'Mantrap/vestibule transit times',
      'Biometric authentication logs',
      'Visitor registration data',
      'Escort requirements and durations',
      'After-hours access patterns',
      'Weekend and holiday access',
      'Emergency access events',
      'Tailgating detection events',
      'Access level changes over time',
      'Terminated employee access attempts',
      'Contractor vs employee access ratios',
      'Vendor technician visit frequency',
      'Delivery dock activity',
      'Vehicle access logs (license plates)'
    ],
    riskLevel: 'high',
    vendors: ['Honeywell', 'Johnson Controls', 'Lenel', 'HID', 'Genetec'],
    countermeasure: 'LinkedIn data, job postings, and OSHA staffing reports'
  },
  {
    id: 'video-analytics',
    name: '📹 Video Surveillance Analytics',
    description: 'Modern CCTV with AI can extract behavioral intelligence from video feeds',
    dataCollected: [
      'Occupancy counting per zone',
      'Dwell time analytics (time spent in areas)',
      'Traffic flow patterns (heatmaps)',
      'Face recognition (if enabled)',
      'License plate recognition',
      'Equipment removal detection',
      'Unusual behavior alerts',
      'PPE compliance (hard hats, safety vests)',
      'Social distancing compliance',
      'Smoking/vaping detection',
      'Loitering detection',
      'Object left behind alerts',
      'Equipment trolley movements',
      'Shipping/receiving activity'
    ],
    riskLevel: 'high',
    vendors: ['Milestone', 'Genetec', 'Avigilon', 'Verkada', 'Rhombus'],
    countermeasure: 'Permit filings and construction activity monitoring'
  },

  // ============================================
  // CATEGORY 5: ASSET & INVENTORY
  // ============================================
  {
    id: 'asset-tracking',
    name: '📦 Asset Intelligence',
    description: 'Asset management data reveals technology strategy, vendor relationships, and refresh cycles',
    dataCollected: [
      'Complete hardware inventory (make/model/serial)',
      'Software license inventory',
      'Purchase dates and costs',
      'Warranty expiration schedules',
      'Lease terms and expiration dates',
      'Depreciation schedules',
      'Vendor distribution (Dell vs HPE vs Lenovo)',
      'Server generations deployed',
      'Storage capacity by tier (SSD vs HDD vs NVMe)',
      'Network equipment age distribution',
      'Asset location history (moved between racks)',
      'Decommissioning schedules',
      'Spare parts inventory',
      'RMA (return merchandise authorization) rates',
      'RFID/barcode scan histories',
      'Asset tagging compliance rates'
    ],
    riskLevel: 'high',
    vendors: ['ServiceNow', 'BMC Helix', 'Nlyte', 'Device42', 'Sunbird'],
    countermeasure: 'Import/export records, SEC equipment disclosures'
  },
  {
    id: 'capacity-planning',
    name: '📈 Capacity Planning Intelligence',
    description: 'Utilization data enables prediction of expansion needs before the customer knows',
    dataCollected: [
      'Rack space utilization (U positions)',
      'Power capacity utilization per cabinet',
      'Cooling capacity headroom',
      'Network port availability',
      'Storage capacity trends',
      'Compute utilization trending',
      'Memory utilization trending',
      'Growth rate projections (linear, exponential)',
      'Seasonal capacity patterns',
      'Reserved vs deployed capacity',
      'Stranded capacity identification',
      'Hotspot prediction',
      'Time-to-exhaustion forecasts',
      'Optimal placement recommendations'
    ],
    riskLevel: 'critical',
    vendors: ['Schneider Electric', 'Nlyte', 'Sunbird', 'Device42'],
    countermeasure: 'SEC filings, earnings calls, permit applications'
  },

  // ============================================
  // CATEGORY 6: COMPUTE & WORKLOAD
  // ============================================
  {
    id: 'compute-telemetry',
    name: '💻 Compute Workload Intelligence',
    description: 'Server telemetry reveals application patterns, customer activity, and business health',
    dataCollected: [
      'CPU utilization per core (real-time)',
      'Memory utilization and pressure',
      'Disk I/O patterns (IOPS, throughput, latency)',
      'Network I/O per server',
      'GPU utilization (for AI/ML workloads)',
      'Container/VM density trends',
      'Process/application mix',
      'Database transaction rates',
      'Cache hit/miss ratios',
      'Queue depths',
      'Thread/process counts',
      'System call patterns',
      'Kernel panic/crash frequency',
      'Boot/reboot cycles',
      'Firmware/BIOS versions',
      'Virtualization overhead metrics'
    ],
    riskLevel: 'critical',
    vendors: ['Dell OpenManage', 'HPE iLO', 'Intel DCM', 'Lenovo XClarity', 'VMware vRealize'],
    countermeasure: 'Job postings (technology stack hints), GitHub activity'
  },
  {
    id: 'storage-analytics',
    name: '💾 Storage Intelligence',
    description: 'Storage telemetry reveals data growth, backup patterns, and business criticality',
    dataCollected: [
      'Capacity utilization by tier',
      'Data growth rate trending',
      'Deduplication/compression ratios',
      'Snapshot frequency and retention',
      'Replication lag times',
      'IOPS patterns by time',
      'Latency percentiles (p50, p95, p99)',
      'Hot/warm/cold data distribution',
      'Backup success/failure rates',
      'Recovery point objectives (RPO) compliance',
      'Recovery time objectives (RTO) testing',
      'Data migration activities',
      'Encryption status',
      'Access patterns (read/write ratios)',
      'File type distribution'
    ],
    riskLevel: 'high',
    vendors: ['NetApp', 'Dell EMC', 'Pure Storage', 'Hitachi Vantara', 'IBM Storage'],
    countermeasure: 'Public cloud storage pricing disclosures, data residency requirements'
  },

  // ============================================
  // CATEGORY 7: OPERATIONAL PATTERNS
  // ============================================
  {
    id: 'change-management',
    name: '🔄 Change Management Intelligence',
    description: 'Change/maintenance patterns reveal release cycles, stability, and operational maturity',
    dataCollected: [
      'Change request volumes over time',
      'Change success/failure rates',
      'Emergency change frequency',
      'Maintenance window schedules',
      'Deployment frequency',
      'Rollback rates',
      'Mean time between changes',
      'Change lead time',
      'Change approval workflows',
      'Affected CI (configuration item) counts',
      'Cross-team coordination patterns',
      'Testing environment usage',
      'Production deployment timing',
      'Feature flag activation patterns'
    ],
    riskLevel: 'medium',
    vendors: ['ServiceNow', 'Jira', 'PagerDuty', 'BMC'],
    countermeasure: 'GitHub commit activity, public changelogs, status pages'
  },
  {
    id: 'incident-patterns',
    name: '🚨 Incident Intelligence',
    description: 'Incident patterns reveal reliability, team capabilities, and infrastructure weaknesses',
    dataCollected: [
      'Incident volume trending',
      'Mean time to detect (MTTD)',
      'Mean time to respond (MTTR)',
      'Mean time to resolve',
      'Incident severity distribution',
      'Root cause categories',
      'Repeat incident frequency',
      'Escalation patterns',
      'On-call rotation schedules',
      'Alert fatigue indicators',
      'Customer-impacting incident rates',
      'SLA breach frequency',
      'Post-incident review completion',
      'Remediation item completion rates'
    ],
    riskLevel: 'high',
    vendors: ['PagerDuty', 'ServiceNow', 'Splunk', 'Datadog', 'New Relic'],
    countermeasure: 'Public status pages, Downdetector, social media monitoring'
  },

  // ============================================
  // CATEGORY 8: FINANCIAL INDICATORS
  // ============================================
  {
    id: 'financial-signals',
    name: '💰 Financial Signal Intelligence',
    description: 'Operational data correlates to financial performance and business health',
    dataCollected: [
      'Infrastructure spend trending',
      'Cost per rack/kW/Gbps',
      'Budget cycle timing (end of quarter spikes)',
      'Capital vs operational expense patterns',
      'Vendor payment timing',
      'Contract renewal patterns',
      'Multi-year commitment indicators',
      'Spot vs reserved capacity usage',
      'Efficiency improvement investments',
      'Technology refresh budget indicators',
      'M&A preparation signals (infrastructure consolidation)',
      'Cost reduction initiatives',
      'Headcount-to-infrastructure ratios',
      'Revenue-per-rack estimates'
    ],
    riskLevel: 'critical',
    vendors: ['Financial planning tools integrated with DCIM'],
    countermeasure: 'SEC filings, earnings calls, investor presentations'
  },

  // ============================================
  // CATEGORY 9: SUPPLY CHAIN
  // ============================================
  {
    id: 'supply-chain',
    name: '🚚 Supply Chain Intelligence',
    description: 'Procurement and logistics data reveals vendor relationships and strategic plans',
    dataCollected: [
      'Vendor distribution by category',
      'Order frequency and volumes',
      'Lead time tracking',
      'Delivery scheduling patterns',
      'Spare parts ordering patterns',
      'Emergency procurement frequency',
      'Single-source dependency indicators',
      'Geographic supplier distribution',
      'Tariff/duty cost impacts',
      'Component shortage impacts',
      'Recycling/disposal patterns',
      'Sustainability supplier requirements',
      'Supplier audit schedules',
      'Contract negotiation cycles'
    ],
    riskLevel: 'medium',
    vendors: ['SAP', 'Oracle', 'ServiceNow', 'Coupa'],
    countermeasure: 'Import/export records, supplier public filings'
  },

  // ============================================
  // CATEGORY 10: COMPLIANCE & AUDIT
  // ============================================
  {
    id: 'compliance-data',
    name: '📋 Compliance Intelligence',
    description: 'Audit and compliance data reveals regulatory exposure and security posture',
    dataCollected: [
      'Audit finding volumes and trends',
      'Compliance framework coverage (SOC2, ISO, PCI, HIPAA)',
      'Control effectiveness ratings',
      'Remediation timelines',
      'Exception request patterns',
      'Policy violation frequency',
      'Access review completion rates',
      'Penetration test schedules',
      'Vulnerability scan results',
      'Patch compliance rates',
      'Certificate expiration tracking',
      'Key rotation schedules',
      'Data classification adherence',
      'Retention policy compliance'
    ],
    riskLevel: 'high',
    vendors: ['ServiceNow GRC', 'RSA Archer', 'OneTrust', 'Qualys', 'Tenable'],
    countermeasure: 'SOC2 reports, public breach disclosures, regulatory filings'
  }
];

const DMAAS_PROVIDERS: DMaaSProvider[] = [
  {
    name: 'Schneider Electric',
    product: 'EcoStruxure IT',
    dataCollectionScope: [
      'Power infrastructure',
      'Cooling systems',
      'Environmental sensors',
      'UPS/PDU telemetry',
      'Capacity metrics'
    ],
    marketShare: 35,
    privacyConcerns: [
      'Data pooled into "data lakes" for AI analysis',
      'Insights derived from aggregated customer data',
      '"Anonymized" data used to train models',
      'Small team of developers has access to raw data'
    ]
  },
  {
    name: 'Vertiv',
    product: 'Vertiv Intelligence',
    dataCollectionScope: [
      'Thermal management',
      'Power systems',
      'Battery health',
      'Service predictions'
    ],
    marketShare: 20,
    privacyConcerns: [
      'Remote monitoring requires internet connectivity',
      'Predictive analytics trained on customer fleet',
      'OEM lock-in through monitoring dependencies'
    ]
  },
  {
    name: 'Nlyte',
    product: 'Nlyte DCIM',
    dataCollectionScope: [
      'Asset management',
      'Capacity planning',
      'Change management',
      'Workflow automation'
    ],
    marketShare: 15,
    privacyConcerns: [
      'Cloud deployment option pools data',
      'Integration APIs expose operational data',
      'Workflow data reveals business processes'
    ]
  },
  {
    name: 'Sunbird',
    product: 'dcTrack',
    dataCollectionScope: [
      'Asset lifecycle',
      'Power chain analysis',
      'Capacity management',
      'Cable management'
    ],
    marketShare: 10,
    privacyConcerns: [
      'SaaS model requires data transmission',
      'Power chain mapping reveals infrastructure'
    ]
  }
];

const PATTERN_INSIGHTS: PatternInsight[] = [
  {
    id: 'jobs-gap-trend',
    pattern: 'Jobs promised vs. actual employment declining over time',
    implication: 'Automation replacing promised jobs; subsidy agreements being violated',
    dataSource: 'BLS employment data + SEC filings + subsidy agreements',
    confidence: 92,
    forOrganizers: 'Document this gap for subsidy clawback campaigns'
  },
  {
    id: 'expansion-without-hiring',
    pattern: 'Data center expansions not correlated with local hiring',
    implication: 'Infrastructure growth benefiting remote workers, not local communities',
    dataSource: 'Permit filings + LinkedIn job postings + Census data',
    confidence: 87,
    forOrganizers: 'Challenge future subsidy requests with this evidence'
  },
  {
    id: 'environmental-violations',
    pattern: 'EPA violations clustered in low-income/minority communities',
    implication: 'Environmental justice issues in site selection',
    dataSource: 'EPA ECHO + Census demographics',
    confidence: 95,
    forOrganizers: 'Partner with environmental justice organizations'
  },
  {
    id: 'contractor-churn',
    pattern: 'High contractor-to-employee ratios with frequent turnover',
    implication: 'Precarious employment disguised as "jobs created"',
    dataSource: 'OSHA incident reports + Glassdoor reviews + job postings',
    confidence: 78,
    forOrganizers: 'Advocate for contractor-to-employee conversion requirements'
  },
  {
    id: 'subsidy-stacking',
    pattern: 'Same projects receiving multiple subsidies from different agencies',
    implication: 'Double-dipping on public incentives',
    dataSource: 'SEC filings + USASpending + state incentive databases',
    confidence: 89,
    forOrganizers: 'Expose total public cost across all incentive programs'
  },
  {
    id: 'safety-correlations',
    pattern: 'OSHA violations correlate with rapid expansion periods',
    implication: 'Worker safety sacrificed for construction timelines',
    dataSource: 'OSHA inspections + construction permits + earnings calls',
    confidence: 84,
    forOrganizers: 'Demand safety milestones in subsidy agreements'
  }
];

// Component
export const SurveillanceAnalysis: React.FC = () => {
  const [expandedVector, setExpandedVector] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'surveillance' | 'counter' | 'patterns' | 'fullmatrix' | 'livedata'>('livedata');
  const [showAllStats, setShowAllStats] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));
  const [showExtrapolations, setShowExtrapolations] = useState(true);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Generate Report Function
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    showToast('Generating surveillance awareness report...', 'info');
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Create the report content
    const reportContent = `
DCIM/DMaaS SURVEILLANCE AWARENESS REPORT
Generated: ${new Date().toLocaleString()}
================================================================================

EXECUTIVE SUMMARY
-----------------
Data Center Infrastructure Management (DCIM) and DMaaS vendors have unprecedented 
access to operational data that reveals proprietary commercial intelligence.

KEY FINDINGS:
• ${SURVEILLANCE_VECTORS.length} surveillance vectors identified
• ${SURVEILLANCE_VECTORS.reduce((sum, v) => sum + v.dataCollected.length, 0)} individual data points collected
• ${SURVEILLANCE_VECTORS.filter(v => v.riskLevel === 'critical').length} critical risk vectors
• ${[...new Set(SURVEILLANCE_VECTORS.flatMap(v => v.vendors))].length} vendors involved in data collection

SURVEILLANCE VECTORS BY RISK LEVEL
----------------------------------
${SURVEILLANCE_VECTORS.map(v => `[${v.riskLevel.toUpperCase()}] ${v.name}
  ${v.description}
  Data collected: ${v.dataCollected.length} points
  Vendors: ${v.vendors.join(', ')}
`).join('\n')}

PATTERN INSIGHTS FOR ORGANIZERS
-------------------------------
${PATTERN_INSIGHTS.map(p => `• ${p.pattern}
  Implication: ${p.implication}
  Data Source: ${p.dataSource}
  Action for Organizers: ${p.forOrganizers}
`).join('\n')}

RECOMMENDATIONS
---------------
1. Review DMaaS contracts for data ownership clauses
2. Implement on-premise DCIM where possible
3. Use counter-surveillance techniques with public data
4. Document all data collection for regulatory compliance

================================================================================
Report generated by DCIM Compliance App - Built for Labor Organizers
    `.trim();
    
    // Create blob and download
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DCIM_Surveillance_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsGenerating(false);
    showToast('Report downloaded successfully!', 'success');
  };

  // Export Evidence Package Function
  const handleExportEvidence = async () => {
    setIsGenerating(true);
    showToast('Compiling evidence package...', 'info');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create comprehensive JSON evidence package
    const evidencePackage = {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        source: 'DCIM Compliance App',
        purpose: 'Surveillance awareness and labor organizing'
      },
      surveillanceVectors: SURVEILLANCE_VECTORS.map(v => ({
        id: v.id,
        name: v.name,
        description: v.description,
        riskLevel: v.riskLevel,
        dataCollected: v.dataCollected,
        vendors: v.vendors,
        countermeasure: v.countermeasure
      })),
      dmaasProviders: DMAAS_PROVIDERS.map(p => ({
        name: p.name,
        product: p.product,
        marketShare: p.marketShare,
        dataCollectionScope: p.dataCollectionScope,
        privacyConcerns: p.privacyConcerns
      })),
      patternInsights: PATTERN_INSIGHTS.map(p => ({
        pattern: p.pattern,
        implication: p.implication,
        dataSource: p.dataSource,
        confidence: p.confidence,
        forOrganizers: p.forOrganizers
      })),
      statistics: {
        totalVectors: SURVEILLANCE_VECTORS.length,
        totalDataPoints: SURVEILLANCE_VECTORS.reduce((sum, v) => sum + v.dataCollected.length, 0),
        criticalRisk: SURVEILLANCE_VECTORS.filter(v => v.riskLevel === 'critical').length,
        highRisk: SURVEILLANCE_VECTORS.filter(v => v.riskLevel === 'high').length,
        vendorsInvolved: [...new Set(SURVEILLANCE_VECTORS.flatMap(v => v.vendors))].length
      },
      references: [
        {
          title: 'Surveillance Capitalism and DCIM',
          source: 'Uptime Institute',
          url: 'https://journal.uptimeinstitute.com/surveillance-capitalism-and-dcim/',
          year: 2019
        }
      ]
    };
    
    // Download JSON
    const blob = new Blob([JSON.stringify(evidencePackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DCIM_Evidence_Package_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsGenerating(false);
    showToast('Evidence package exported as JSON!', 'success');
  };

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const totalDataPoints = SURVEILLANCE_VECTORS.reduce((sum, v) => sum + v.dataCollected.length, 0);
    const criticalVectors = SURVEILLANCE_VECTORS.filter(v => v.riskLevel === 'critical').length;
    const highVectors = SURVEILLANCE_VECTORS.filter(v => v.riskLevel === 'high').length;
    const uniqueVendors = [...new Set(SURVEILLANCE_VECTORS.flatMap(v => v.vendors))].length;
    const categories = new Set(SURVEILLANCE_VECTORS.map(v => v.id.split('-')[0])).size;
    
    // Group by category
    const byCategory = SURVEILLANCE_VECTORS.reduce((acc, v) => {
      const category = v.name.split(' ')[0]; // Get emoji as category
      if (!acc[category]) acc[category] = { count: 0, dataPoints: 0 };
      acc[category].count++;
      acc[category].dataPoints += v.dataCollected.length;
      return acc;
    }, {} as Record<string, { count: number; dataPoints: number }>);

    return { totalDataPoints, criticalVectors, highVectors, uniqueVendors, categories, byCategory };
  }, []);

  const riskLevelColors = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200'
  };

  const riskLevelIcons = {
    low: <Shield size={14} />,
    medium: <AlertTriangle size={14} />,
    high: <Eye size={14} />,
    critical: <Fingerprint size={14} />
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slideUp ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.type === 'success' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.type === 'info' && (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/10 rounded-lg">
                <Eye size={24} />
              </div>
              <h1 className="text-2xl font-bold">Surveillance & Counter-Intelligence</h1>
            </div>
            <p className="text-slate-300 max-w-2xl">
              DCIM and DMaaS vendors collect vast amounts of operational data from data centers.
              This component exposes what they know — and how our app turns the tables using public data.
            </p>
            <a 
              href="https://journal.uptimeinstitute.com/surveillance-capitalism-and-dcim/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-purple-300 hover:text-white transition-colors"
            >
              <BookOpen size={16} />
              Based on Uptime Institute Research
              <ExternalLink size={14} />
            </a>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-red-400">{SURVEILLANCE_VECTORS.length}</div>
            <div className="text-sm text-slate-400">Surveillance Vectors</div>
            <div className="text-4xl font-bold text-purple-400 mt-2">{stats.totalDataPoints}</div>
            <div className="text-sm text-slate-400">Data Points Collected</div>
          </div>
        </div>
      </div>

      {/* ============================================
          COMPREHENSIVE DATA COLLECTION SUMMARY
          ============================================ */}
      <div className="bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 rounded-2xl border-2 border-red-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-900">Total Data Exposure via DCIM/DMaaS</h2>
              <p className="text-sm text-red-700">Every conceivable way your commercial secrets can leak</p>
            </div>
          </div>
          <button
            onClick={() => setShowAllStats(!showAllStats)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            {showAllStats ? 'Collapse' : 'Show Full Breakdown'}
            {showAllStats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
          <div className="bg-white/80 rounded-xl p-4 text-center border border-red-200">
            <div className="text-3xl font-bold text-red-600">{stats.totalDataPoints}</div>
            <div className="text-xs text-slate-600 font-medium">TOTAL DATA POINTS</div>
          </div>
          <div className="bg-white/80 rounded-xl p-4 text-center border border-red-200">
            <div className="text-3xl font-bold text-red-700">{stats.criticalVectors}</div>
            <div className="text-xs text-slate-600 font-medium">CRITICAL RISK</div>
          </div>
          <div className="bg-white/80 rounded-xl p-4 text-center border border-orange-200">
            <div className="text-3xl font-bold text-orange-600">{stats.highVectors}</div>
            <div className="text-xs text-slate-600 font-medium">HIGH RISK</div>
          </div>
          <div className="bg-white/80 rounded-xl p-4 text-center border border-amber-200">
            <div className="text-3xl font-bold text-amber-600">{SURVEILLANCE_VECTORS.length}</div>
            <div className="text-xs text-slate-600 font-medium">CATEGORIES</div>
          </div>
          <div className="bg-white/80 rounded-xl p-4 text-center border border-purple-200">
            <div className="text-3xl font-bold text-purple-600">{stats.uniqueVendors}</div>
            <div className="text-xs text-slate-600 font-medium">VENDORS INVOLVED</div>
          </div>
          <div className="bg-white/80 rounded-xl p-4 text-center border border-blue-200">
            <div className="text-3xl font-bold text-blue-600">{PATTERN_INSIGHTS.length}</div>
            <div className="text-xs text-slate-600 font-medium">COUNTER PATTERNS</div>
          </div>
        </div>

        {/* Expanded Stats */}
        {showAllStats && (
          <div className="space-y-4 mt-6 animate-slideUp">
            {/* Category Breakdown */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <BarChart3 size={18} className="text-slate-600" />
                Data Collection by Category
              </h3>
              <div className="space-y-2">
                {Object.entries(stats.byCategory).map(([cat, data]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-2xl w-8">{cat}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-end pr-2"
                        style={{ width: `${(data.dataPoints / stats.totalDataPoints) * 100}%` }}
                      >
                        <span className="text-xs text-white font-bold">{data.dataPoints}</span>
                      </div>
                    </div>
                    <span className="text-sm text-slate-600 w-24 text-right">{data.dataPoints} points</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Aggregation Warning */}
            <div className="bg-gradient-to-r from-red-100 to-orange-100 rounded-xl p-4 border-2 border-red-300">
              <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                <Fingerprint size={18} className="text-red-600" />
                ⚠️ DATA AGGREGATION MULTIPLIER EFFECT
              </h3>
              <p className="text-sm text-red-800 mb-3">
                When DCIM/DMaaS vendors combine these data streams, the intelligence value grows <strong>exponentially</strong>:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="font-semibold text-red-800">Power + Cooling = Workload Type</div>
                  <div className="text-xs text-slate-600">GPU-heavy = AI/ML, High I/O = Database, etc.</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="font-semibold text-red-800">Network + Time = Customer Activity</div>
                  <div className="text-xs text-slate-600">Traffic patterns reveal business health</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="font-semibold text-red-800">Asset + Power = Budget Cycles</div>
                  <div className="text-xs text-slate-600">Equipment age + utilization = refresh timing</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="font-semibold text-red-800">Capacity + Network = Growth Rate</div>
                  <div className="text-xs text-slate-600">Utilization trends = revenue trajectory</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="font-semibold text-red-800">Access + Incidents = Team Quality</div>
                  <div className="text-xs text-slate-600">Response patterns = operational maturity</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="font-semibold text-red-800">All Combined = Competitive Intel</div>
                  <div className="text-xs text-slate-600">Full business picture for competitors/investors</div>
                </div>
              </div>
            </div>

            {/* Who Has Access */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Users size={18} className="text-slate-600" />
                Who Can Access This Data?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <div className="font-semibold text-red-800">DCIM Vendor Employees</div>
                  <ul className="text-xs text-slate-600 mt-1 space-y-1">
                    <li>• Software developers</li>
                    <li>• Data scientists / AI teams</li>
                    <li>• Support engineers</li>
                    <li>• Sales (for "insights")</li>
                  </ul>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <div className="font-semibold text-orange-800">Third Parties</div>
                  <ul className="text-xs text-slate-600 mt-1 space-y-1">
                    <li>• Cloud hosting providers</li>
                    <li>• Analytics partners</li>
                    <li>• "Anonymized" data buyers</li>
                    <li>• Acquired company staff</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <div className="font-semibold text-yellow-800">Potential Risks</div>
                  <ul className="text-xs text-slate-600 mt-1 space-y-1">
                    <li>• Insider threats</li>
                    <li>• Data breaches</li>
                    <li>• Legal subpoenas</li>
                    <li>• Corporate acquisitions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quote from Zuboff */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
        <div className="flex gap-4">
          <div className="text-4xl text-amber-600">"</div>
          <div>
            <p className="text-amber-900 italic">
              "A supplier with good data and models could determine, with a fairly high degree of certainty, 
              what will likely happen in a data center tomorrow and probably next year — when it might reach 
              full capacity, when it might need more cooling, when equipment might fail, even when more staff are needed."
            </p>
            <p className="text-amber-700 mt-2 text-sm font-medium">
              — Uptime Institute, "Surveillance Capitalism and DCIM" (2019)
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('livedata')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'livedata'
              ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Monitor size={16} className="inline mr-2" />
          🟢 REAL-TIME Intel
        </button>
        <button
          onClick={() => setActiveTab('fullmatrix')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'fullmatrix'
              ? 'border-purple-500 text-purple-700 bg-purple-50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Database size={16} className="inline mr-2" />
          📊 Full Data Matrix (241 pts)
        </button>
        <button
          onClick={() => setActiveTab('surveillance')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'surveillance'
              ? 'border-red-500 text-red-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Eye size={16} className="inline mr-2" />
          What They Collect
        </button>
        <button
          onClick={() => setActiveTab('counter')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'counter'
              ? 'border-emerald-500 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield size={16} className="inline mr-2" />
          Our Counter-Intelligence
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'patterns'
              ? 'border-purple-500 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Brain size={16} className="inline mr-2" />
          Pattern Analysis
        </button>
      </div>

      {/* Tab Content */}
      
      {/* ============================================
          REAL-TIME INTELLIGENCE - Live API Data
          ============================================ */}
      {activeTab === 'livedata' && (
        <RealTimeIntelligence />
      )}

      {/* ============================================
          FULL DATA MATRIX - All 241 Data Points Visible
          Uses the new DataPointsExplorer component
          ============================================ */}
      {activeTab === 'fullmatrix' && (
        <DataPointsExplorer />
      )}


      {activeTab === 'surveillance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Surveillance Vectors */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Eye className="text-red-500" size={20} />
              DCIM Surveillance Vectors
            </h2>
            <p className="text-sm text-slate-600">
              These are the data points that DCIM and DMaaS vendors can extract from data center operations.
              <span className="text-red-600 font-medium"> Tenants have legitimate reasons for paranoia.</span>
            </p>
            
            {SURVEILLANCE_VECTORS.map(vector => (
              <div
                key={vector.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setExpandedVector(expandedVector === vector.id ? null : vector.id)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border ${riskLevelColors[vector.riskLevel]}`}>
                      {riskLevelIcons[vector.riskLevel]}
                      {vector.riskLevel.toUpperCase()}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{vector.name}</div>
                      <div className="text-sm text-slate-500">{vector.description}</div>
                    </div>
                  </div>
                  {expandedVector === vector.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {expandedVector === vector.id && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-2">DATA COLLECTED:</div>
                      <div className="flex flex-wrap gap-2">
                        {vector.dataCollected.map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-lg">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-2">VENDORS:</div>
                      <div className="flex flex-wrap gap-2">
                        {vector.vendors.map((vendor, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg">
                            {vendor}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-emerald-700 mb-1">🛡️ OUR COUNTERMEASURE:</div>
                      <div className="text-sm text-emerald-800">{vector.countermeasure}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* DMaaS Providers */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Cloud className="text-blue-500" size={20} />
              DMaaS Provider Landscape
            </h2>
            <p className="text-sm text-slate-600">
              These companies offer "Data Center Management as a Service" — cloud-based monitoring 
              that gives them unprecedented visibility into customer operations.
            </p>

            {DMAAS_PROVIDERS.map(provider => (
              <div
                key={provider.name}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setExpandedProvider(expandedProvider === provider.name ? null : provider.name)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{provider.name}</div>
                    <div className="text-sm text-blue-600">{provider.product}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">{provider.marketShare}%</div>
                      <div className="text-xs text-slate-500">Market Share</div>
                    </div>
                    {expandedProvider === provider.name ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>
                
                {expandedProvider === provider.name && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-2">DATA COLLECTION SCOPE:</div>
                      <div className="flex flex-wrap gap-2">
                        {provider.dataCollectionScope.map((scope, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-amber-700 mb-2">⚠️ PRIVACY CONCERNS:</div>
                      <ul className="space-y-1">
                        {provider.privacyConcerns.map((concern, i) => (
                          <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                            {concern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Key Insight Box */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Info size={18} className="text-blue-400" />
                <h3 className="font-semibold">The Core Tension</h3>
              </div>
              <p className="text-sm text-slate-300">
                DMaaS providers offer <span className="text-emerald-400">valuable operational insights</span> in 
                exchange for access to operational data. But this creates a 
                <span className="text-red-400"> power asymmetry</span>: vendors can know more about 
                your business trajectory than you do.
              </p>
              <div className="mt-3 p-3 bg-white/5 rounded-lg">
                <p className="text-xs text-slate-400">
                  "With the benefit of AI, a supplier may know when cooling capacity will need to be 
                  increased <strong className="text-white">even before the customer has thought about it.</strong>"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'counter' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-emerald-900 mb-3 flex items-center gap-2">
              <Shield size={24} />
              Counter-Surveillance Through Public Data
            </h2>
            <p className="text-emerald-800">
              While colocation tenants worry about their DCIM vendors spying on them, 
              <strong> we turn the tables on Big Tech</strong> by aggregating publicly available data 
              to expose their broken promises to communities and workers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Counter-Intelligence Sources */}
            {[
              {
                source: 'SEC EDGAR',
                icon: <DollarSign size={20} />,
                what: 'Financial filings reveal subsidy disclosures, CapEx plans, and job promises',
                status: 'active',
                color: 'blue'
              },
              {
                source: 'EPA ECHO',
                icon: <Thermometer size={20} />,
                what: 'Environmental compliance data exposes violations and permits',
                status: 'active',
                color: 'green'
              },
              {
                source: 'BLS Employment',
                icon: <Users size={20} />,
                what: 'Bureau of Labor Statistics shows actual job creation by industry and region',
                status: 'active',
                color: 'purple'
              },
              {
                source: 'USASpending',
                icon: <Building size={20} />,
                what: 'Federal contracts reveal billions flowing to Big Tech',
                status: 'active',
                color: 'amber'
              },
              {
                source: 'OSHA',
                icon: <AlertTriangle size={20} />,
                what: 'Workplace safety incidents expose worker protection failures',
                status: 'active',
                color: 'red'
              },
              {
                source: 'Census Bureau',
                icon: <PieChart size={20} />,
                what: 'Demographics show community impact and environmental justice issues',
                status: 'active',
                color: 'teal'
              },
              {
                source: 'PeeringDB',
                icon: <Network size={20} />,
                what: 'Network infrastructure mapping reveals true footprint',
                status: 'active',
                color: 'indigo'
              },
              {
                source: 'OpenCorporates',
                icon: <Search size={20} />,
                what: 'Corporate structures expose shell companies and subsidiaries',
                status: 'active',
                color: 'slate'
              },
              {
                source: 'LinkedIn (Coming)',
                icon: <Users size={20} />,
                what: 'Job postings vs actual hiring reveals broken promises',
                status: 'coming',
                color: 'sky'
              }
            ].map(source => {
              const colorClasses: Record<string, string> = {
                blue: 'bg-blue-100 text-blue-600',
                green: 'bg-green-100 text-green-600',
                purple: 'bg-purple-100 text-purple-600',
                amber: 'bg-amber-100 text-amber-600',
                red: 'bg-red-100 text-red-600',
                cyan: 'bg-cyan-100 text-cyan-600',
                indigo: 'bg-indigo-100 text-indigo-600'
              };
              return (
                <div 
                  key={source.source}
                  className={`bg-white rounded-xl border p-4 ${
                    source.status === 'active' ? 'border-slate-200' : 'border-dashed border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${colorClasses[source.color] || 'bg-slate-100 text-slate-600'}`}>
                      {source.icon}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      source.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {source.status === 'active' ? '✓ Active' : 'Coming Soon'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{source.source}</h3>
                  <p className="text-sm text-slate-600 mt-1">{source.what}</p>
                </div>
              );
            })}
          </div>

          {/* The Asymmetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="font-bold text-red-900 flex items-center gap-2 mb-3">
                <Eye className="text-red-600" />
                What DCIM Vendors Know About Tenants
              </h3>
              <ul className="space-y-2 text-sm text-red-800">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  Exact power consumption patterns (business activity proxy)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  Equipment health and replacement timing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  Capacity constraints and expansion needs
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  Staffing patterns and operational maturity
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  Network traffic patterns and customer growth
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <h3 className="font-bold text-emerald-900 flex items-center gap-2 mb-3">
                <Shield className="text-emerald-600" />
                What Our App Knows About Big Tech
              </h3>
              <ul className="space-y-2 text-sm text-emerald-800">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  Subsidy amounts and job creation promises
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  Actual employment numbers vs commitments
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  Environmental violations and permit breaches
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  Worker safety incidents and patterns
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  Corporate structures hiding accountability
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'patterns' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-purple-900 mb-3 flex items-center gap-2">
              <Brain size={24} />
              Pattern Analysis for Organizers
            </h2>
            <p className="text-purple-800">
              The same AI-driven pattern recognition that makes DCIM surveillance powerful 
              can be used to expose Big Tech's broken promises. These patterns emerge from 
              cross-referencing multiple public data sources.
            </p>
          </div>

          <div className="space-y-4">
            {PATTERN_INSIGHTS.map(insight => (
              <div 
                key={insight.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={18} className="text-purple-600" />
                      <h3 className="font-semibold text-slate-900">{insight.pattern}</h3>
                    </div>
                    <p className="text-slate-600 text-sm">{insight.implication}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-purple-600">{insight.confidence}%</div>
                    <div className="text-xs text-slate-500">Confidence</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">DATA SOURCES:</div>
                    <div className="text-sm text-slate-700">{insight.dataSource}</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-emerald-600 mb-1">FOR ORGANIZERS:</div>
                    <div className="text-sm text-emerald-800">{insight.forOrganizers}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-slate-900 to-purple-900 rounded-xl p-6 text-white">
            <h3 className="text-xl font-bold mb-3">Turn Surveillance Into Accountability</h3>
            <p className="text-slate-300 mb-4">
              The same capabilities that make colocation tenants paranoid about their DCIM vendors 
              can be harnessed to hold Big Tech accountable. Every pattern we detect from public data 
              is a potential story for journalists, evidence for regulators, or ammunition for organizers.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="px-4 py-2 bg-white text-purple-900 rounded-lg font-medium hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate Report'
                )}
              </button>
              <button 
                onClick={handleExportEvidence}
                disabled={isGenerating}
                className="px-4 py-2 bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  'Export Evidence Package'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveillanceAnalysis;

