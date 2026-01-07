/**
 * DataPointsExplorer.tsx
 * 
 * Displays all 241 DCIM/DMaaS surveillance data points in an
 * expandable, explainable, summarizable format.
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Eye, EyeOff, Shield, AlertTriangle,
  Zap, Thermometer, Network, Users, DollarSign, Building, Server,
  HardDrive, Lock, Cpu, Activity, Radio, Database, Clock,
  Search, Filter, Download, Info, CheckCircle, XCircle,
  BarChart3, PieChart, Layers, FileText
} from 'lucide-react';

// ============================================
// ALL 241 DATA POINTS - Organized by Category
// ============================================

interface DataPoint {
  id: string;
  name: string;
  description: string;
  businessInference: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  vendors: string[];
  countermeasure: string;
}

interface DataCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  dataPoints: DataPoint[];
}

const ALL_DATA_CATEGORIES: DataCategory[] = [
  {
    id: 'power-granular',
    name: '⚡ Power Consumption (Granular)',
    icon: <Zap size={20} />,
    description: 'Sub-second power telemetry reveals exact workload patterns, business cycles, and growth trajectory',
    riskLevel: 'critical',
    dataPoints: [
      { id: 'p1', name: 'Real-time power draw per rack (kW)', description: 'Power consumption measured at 1-second intervals per rack', businessInference: 'Reveals server density and workload intensity', riskLevel: 'critical', vendors: ['Schneider Electric', 'Vertiv', 'Eaton'], countermeasure: 'Monitor public utility filings' },
      { id: 'p2', name: 'Power factor and harmonics', description: 'Electrical quality metrics revealing equipment types', businessInference: 'Identifies GPU clusters vs CPU workloads', riskLevel: 'critical', vendors: ['Raritan', 'Server Technology'], countermeasure: 'Track equipment purchase announcements' },
      { id: 'p3', name: 'UPS battery discharge patterns', description: 'Battery usage during outages and tests', businessInference: 'Shows redundancy levels and risk tolerance', riskLevel: 'high', vendors: ['Eaton', 'APC', 'Vertiv'], countermeasure: 'Review public permits' },
      { id: 'p4', name: 'Peak vs baseline power ratios', description: 'Difference between maximum and minimum power', businessInference: 'Reveals business hours and global reach', riskLevel: 'high', vendors: ['Schneider', 'nlyte'], countermeasure: 'Analyze satellite imagery' },
      { id: 'p5', name: 'Power Usage Effectiveness (PUE)', description: 'Ratio of total facility power to IT equipment power', businessInference: 'Shows operational efficiency and maturity', riskLevel: 'medium', vendors: ['Schneider', 'Sunbird'], countermeasure: 'Track sustainability reports' },
      { id: 'p6', name: 'Circuit breaker trip events', description: 'Electrical protection events and failures', businessInference: 'Indicates capacity limits and growth constraints', riskLevel: 'high', vendors: ['Vertiv', 'Eaton'], countermeasure: 'Monitor permit applications' },
      { id: 'p7', name: 'Generator runtime and fuel consumption', description: 'Backup power usage patterns', businessInference: 'Reveals grid reliability concerns and SLA requirements', riskLevel: 'medium', vendors: ['Caterpillar', 'Cummins'], countermeasure: 'Track fuel delivery schedules' },
      { id: 'p8', name: 'Power distribution unit (PDU) loads', description: 'Per-outlet power monitoring', businessInference: 'Maps individual server power profiles', riskLevel: 'critical', vendors: ['Raritan', 'Server Technology', 'Vertiv'], countermeasure: 'Monitor public utility records' },
      { id: 'p9', name: 'Transformer loading percentages', description: 'Main electrical infrastructure utilization', businessInference: 'Shows expansion capacity and planning', riskLevel: 'high', vendors: ['Schneider', 'ABB'], countermeasure: 'Review electrical permits' },
      { id: 'p10', name: 'Power quality events (sags, swells)', description: 'Electrical disturbance frequency and severity', businessInference: 'Indicates equipment sensitivity and protection needs', riskLevel: 'medium', vendors: ['Schneider', 'Eaton'], countermeasure: 'Track utility reliability reports' },
      { id: 'p11', name: 'Renewable energy percentage', description: 'Solar, wind, and other green power sources', businessInference: 'Reveals sustainability commitments and costs', riskLevel: 'low', vendors: ['Schneider', 'Sunbird'], countermeasure: 'Monitor PPA announcements' },
      { id: 'p12', name: 'Time-of-use energy patterns', description: 'Power consumption by time period', businessInference: 'Shows workload scheduling and cost optimization', riskLevel: 'medium', vendors: ['nlyte', 'Sunbird'], countermeasure: 'Analyze utility rate schedules' },
      { id: 'p13', name: 'Power redundancy (N+1, 2N) utilization', description: 'Backup power path usage', businessInference: 'Reveals risk tolerance and SLA requirements', riskLevel: 'high', vendors: ['Vertiv', 'Schneider'], countermeasure: 'Review facility certifications' },
      { id: 'p14', name: 'Electrical maintenance schedules', description: 'Planned outages and testing windows', businessInference: 'Shows operational maturity and risk management', riskLevel: 'medium', vendors: ['ServiceNow', 'nlyte'], countermeasure: 'Track maintenance announcements' },
      { id: 'p15', name: 'Power capping and throttling events', description: 'Times when power was artificially limited', businessInference: 'Indicates demand response participation or constraints', riskLevel: 'high', vendors: ['Intel DCM', 'HP iLO'], countermeasure: 'Monitor utility demand response programs' },
    ]
  },
  {
    id: 'thermal-cooling',
    name: '🌡️ Thermal & Cooling Intelligence',
    icon: <Thermometer size={20} />,
    description: 'Temperature and cooling data reveals equipment density, efficiency, and capacity constraints',
    riskLevel: 'critical',
    dataPoints: [
      { id: 't1', name: 'Inlet/outlet temperature per rack', description: 'Air temperature entering and leaving each rack', businessInference: 'Maps heat density and equipment placement', riskLevel: 'critical', vendors: ['Schneider', 'Vertiv', 'Sunbird'], countermeasure: 'Analyze thermal imagery from public sources' },
      { id: 't2', name: 'CRAH/CRAC unit performance', description: 'Computer room air handler efficiency', businessInference: 'Shows cooling infrastructure investment', riskLevel: 'high', vendors: ['Liebert', 'Schneider'], countermeasure: 'Track equipment purchases' },
      { id: 't3', name: 'Chiller plant efficiency (kW/ton)', description: 'Central cooling plant performance', businessInference: 'Reveals operational costs and efficiency', riskLevel: 'medium', vendors: ['Trane', 'Carrier', 'Johnson Controls'], countermeasure: 'Monitor utility water usage' },
      { id: 't4', name: 'Hot aisle/cold aisle temperature differentials', description: 'Temperature separation effectiveness', businessInference: 'Shows containment investment and efficiency', riskLevel: 'medium', vendors: ['Sunbird', 'nlyte'], countermeasure: 'Review facility design documents' },
      { id: 't5', name: 'Humidity levels and control', description: 'Moisture management in the facility', businessInference: 'Indicates equipment sensitivity and standards', riskLevel: 'medium', vendors: ['Schneider', 'Vertiv'], countermeasure: 'Track ASHRAE compliance' },
      { id: 't6', name: 'Cooling tower water consumption', description: 'Evaporative cooling water usage', businessInference: 'Reveals environmental impact and costs', riskLevel: 'medium', vendors: ['Schneider', 'Johnson Controls'], countermeasure: 'Monitor water utility records' },
      { id: 't7', name: 'Free cooling hours utilization', description: 'Time using outside air for cooling', businessInference: 'Shows geographic advantages and efficiency', riskLevel: 'low', vendors: ['Schneider', 'Vertiv'], countermeasure: 'Analyze climate data' },
      { id: 't8', name: 'Thermal runaway events', description: 'Critical overheating incidents', businessInference: 'Indicates capacity constraints and risks', riskLevel: 'critical', vendors: ['All DCIM vendors'], countermeasure: 'Track incident reports' },
      { id: 't9', name: 'Liquid cooling deployment', description: 'Direct-to-chip or immersion cooling usage', businessInference: 'Reveals high-density AI/HPC workloads', riskLevel: 'critical', vendors: ['Schneider', 'Vertiv', 'GRC'], countermeasure: 'Monitor technology announcements' },
      { id: 't10', name: 'Rear door heat exchanger utilization', description: 'In-row cooling attachment usage', businessInference: 'Shows rack-level heat management needs', riskLevel: 'high', vendors: ['Schneider', 'Vertiv'], countermeasure: 'Track equipment orders' },
      { id: 't11', name: 'Cooling redundancy status', description: 'Backup cooling system availability', businessInference: 'Indicates SLA requirements and risk tolerance', riskLevel: 'high', vendors: ['Vertiv', 'Schneider'], countermeasure: 'Review facility certifications' },
      { id: 't12', name: 'Temperature setpoint changes', description: 'Adjustments to target temperatures', businessInference: 'Shows efficiency initiatives or equipment changes', riskLevel: 'medium', vendors: ['Sunbird', 'nlyte'], countermeasure: 'Track ASHRAE guideline adoption' },
      { id: 't13', name: 'Cooling failure response times', description: 'How quickly cooling issues are addressed', businessInference: 'Reveals operational maturity and staffing', riskLevel: 'high', vendors: ['ServiceNow', 'nlyte'], countermeasure: 'Monitor job postings' },
      { id: 't14', name: 'Economizer mode transitions', description: 'Switching between cooling modes', businessInference: 'Shows optimization sophistication', riskLevel: 'low', vendors: ['Schneider', 'Johnson Controls'], countermeasure: 'Analyze weather patterns' },
    ]
  },
  {
    id: 'network-traffic',
    name: '🌐 Network & Traffic Intelligence',
    icon: <Network size={20} />,
    description: 'Network patterns reveal customer relationships, service types, and geographic reach',
    riskLevel: 'critical',
    dataPoints: [
      { id: 'n1', name: 'Bandwidth utilization per port', description: 'Network throughput on each connection', businessInference: 'Reveals customer size and service intensity', riskLevel: 'critical', vendors: ['Cisco', 'Juniper', 'Arista'], countermeasure: 'Monitor public peering data' },
      { id: 'n2', name: 'Cross-connect inventory', description: 'Physical network interconnections', businessInference: 'Maps customer and partner relationships', riskLevel: 'critical', vendors: ['Equinix', 'Digital Realty', 'DCIM vendors'], countermeasure: 'Track PeeringDB records' },
      { id: 'n3', name: 'BGP session states', description: 'Border Gateway Protocol peering status', businessInference: 'Shows network relationships and routing', riskLevel: 'high', vendors: ['Network monitoring tools'], countermeasure: 'Monitor RIPE/ARIN BGP updates' },
      { id: 'n4', name: 'Traffic flow patterns (NetFlow/sFlow)', description: 'Detailed traffic analysis data', businessInference: 'Reveals service types and customer behavior', riskLevel: 'critical', vendors: ['Cisco', 'Nokia', 'Kentik'], countermeasure: 'Analyze public traffic reports' },
      { id: 'n5', name: 'Latency measurements', description: 'Network delay between points', businessInference: 'Shows service quality requirements', riskLevel: 'high', vendors: ['ThousandEyes', 'Catchpoint'], countermeasure: 'Use public speed test data' },
      { id: 'n6', name: 'Packet loss and error rates', description: 'Network quality metrics', businessInference: 'Indicates infrastructure health and investment', riskLevel: 'medium', vendors: ['SolarWinds', 'PRTG'], countermeasure: 'Monitor public outage reports' },
      { id: 'n7', name: 'DNS query volumes', description: 'Domain name resolution requests', businessInference: 'Reveals service popularity and growth', riskLevel: 'high', vendors: ['Infoblox', 'BlueCat'], countermeasure: 'Track public DNS stats' },
      { id: 'n8', name: 'VPN tunnel utilization', description: 'Encrypted connection usage', businessInference: 'Shows remote access patterns and workforce', riskLevel: 'high', vendors: ['Cisco', 'Palo Alto'], countermeasure: 'Monitor job location postings' },
      { id: 'n9', name: 'CDN cache hit ratios', description: 'Content delivery effectiveness', businessInference: 'Reveals content strategy and efficiency', riskLevel: 'medium', vendors: ['Akamai', 'Cloudflare', 'Fastly'], countermeasure: 'Analyze public CDN stats' },
      { id: 'n10', name: 'DDoS attack patterns', description: 'Distributed denial of service events', businessInference: 'Shows threat profile and security investment', riskLevel: 'high', vendors: ['Arbor', 'Cloudflare', 'Akamai'], countermeasure: 'Track security incident reports' },
      { id: 'n11', name: 'Port utilization and availability', description: 'Network capacity usage', businessInference: 'Indicates growth constraints and planning', riskLevel: 'high', vendors: ['DCIM vendors', 'Network management'], countermeasure: 'Monitor capacity announcements' },
      { id: 'n12', name: 'Fiber path redundancy', description: 'Multiple network route availability', businessInference: 'Shows reliability requirements and investment', riskLevel: 'medium', vendors: ['DCIM vendors'], countermeasure: 'Track fiber route announcements' },
      { id: 'n13', name: 'Internet exchange (IX) participation', description: 'Public peering point presence', businessInference: 'Reveals network strategy and reach', riskLevel: 'medium', vendors: ['PeeringDB'], countermeasure: 'Monitor PeeringDB updates' },
      { id: 'n14', name: 'Network equipment firmware versions', description: 'Software running on network devices', businessInference: 'Shows security posture and update practices', riskLevel: 'high', vendors: ['Network vendors'], countermeasure: 'Track CVE announcements' },
      { id: 'n15', name: 'Traffic encryption percentages', description: 'Proportion of encrypted communications', businessInference: 'Indicates security maturity', riskLevel: 'medium', vendors: ['Network monitoring'], countermeasure: 'Analyze public encryption reports' },
    ]
  },
  {
    id: 'physical-access',
    name: '🚪 Physical Access & Security',
    icon: <Lock size={20} />,
    description: 'Access control data reveals staffing, vendor relationships, and operational patterns',
    riskLevel: 'high',
    dataPoints: [
      { id: 'a1', name: 'Badge swipe timestamps', description: 'When personnel enter/exit facilities', businessInference: 'Reveals staffing patterns and shift schedules', riskLevel: 'high', vendors: ['Lenel', 'HID', 'Genetec'], countermeasure: 'Monitor job postings' },
      { id: 'a2', name: 'Biometric authentication logs', description: 'Fingerprint, iris, face scan records', businessInference: 'Shows security investment and access control', riskLevel: 'high', vendors: ['HID', 'Suprema'], countermeasure: 'Track security certifications' },
      { id: 'a3', name: 'Visitor management records', description: 'Guest access approvals and visits', businessInference: 'Reveals vendor and partner relationships', riskLevel: 'high', vendors: ['Envoy', 'Traction Guest'], countermeasure: 'Monitor press releases' },
      { id: 'a4', name: 'Mantrap/airlock usage', description: 'Secure entry point activity', businessInference: 'Shows security posture and compliance', riskLevel: 'medium', vendors: ['Boon Edam', 'Assa Abloy'], countermeasure: 'Review compliance certifications' },
      { id: 'a5', name: 'After-hours access patterns', description: 'Non-business hours facility entry', businessInference: 'Indicates 24/7 operations and emergencies', riskLevel: 'high', vendors: ['Access control vendors'], countermeasure: 'Track incident reports' },
      { id: 'a6', name: 'Failed access attempts', description: 'Denied entry events', businessInference: 'Shows security incidents and access control', riskLevel: 'high', vendors: ['Security systems'], countermeasure: 'Monitor security reports' },
      { id: 'a7', name: 'Escort requirements and logs', description: 'Supervised access records', businessInference: 'Reveals compliance and security policies', riskLevel: 'medium', vendors: ['Visitor management'], countermeasure: 'Track compliance certifications' },
      { id: 'a8', name: 'Camera footage retention', description: 'Video surveillance storage duration', businessInference: 'Shows security investment and compliance', riskLevel: 'medium', vendors: ['Genetec', 'Milestone'], countermeasure: 'Review audit reports' },
      { id: 'a9', name: 'Security guard patrol patterns', description: 'Physical security rounds', businessInference: 'Indicates security staffing and coverage', riskLevel: 'medium', vendors: ['TrackTik', 'Silvertrac'], countermeasure: 'Track staffing announcements' },
      { id: 'a10', name: 'Vehicle access logs', description: 'Loading dock and parking activity', businessInference: 'Reveals delivery patterns and equipment moves', riskLevel: 'high', vendors: ['Parking management'], countermeasure: 'Monitor shipping announcements' },
      { id: 'a11', name: 'Contractor access duration', description: 'Time third parties spend on-site', businessInference: 'Shows maintenance intensity and dependencies', riskLevel: 'high', vendors: ['Contractor management'], countermeasure: 'Track vendor relationships' },
      { id: 'a12', name: 'Cabinet-level access logs', description: 'Individual rack access records', businessInference: 'Maps equipment ownership and maintenance', riskLevel: 'critical', vendors: ['Electronic locks'], countermeasure: 'Monitor equipment announcements' },
    ]
  },
  {
    id: 'asset-inventory',
    name: '📦 Asset & Inventory Intelligence',
    icon: <Server size={20} />,
    description: 'Equipment data reveals technology choices, vendor relationships, and investment levels',
    riskLevel: 'critical',
    dataPoints: [
      { id: 'i1', name: 'Server make, model, and configuration', description: 'Detailed equipment specifications', businessInference: 'Reveals technology strategy and vendor lock-in', riskLevel: 'critical', vendors: ['DCIM vendors', 'CMDBs'], countermeasure: 'Track equipment announcements' },
      { id: 'i2', name: 'GPU/accelerator inventory', description: 'AI and HPC hardware assets', businessInference: 'Shows AI/ML investment and capabilities', riskLevel: 'critical', vendors: ['NVIDIA', 'AMD', 'DCIM'], countermeasure: 'Monitor GPU shortage reports' },
      { id: 'i3', name: 'Storage capacity and utilization', description: 'Data storage infrastructure', businessInference: 'Reveals data volumes and growth', riskLevel: 'critical', vendors: ['Dell EMC', 'NetApp', 'Pure'], countermeasure: 'Track storage announcements' },
      { id: 'i4', name: 'Equipment age and lifecycle', description: 'Hardware depreciation status', businessInference: 'Shows refresh cycles and investment patterns', riskLevel: 'high', vendors: ['Asset management'], countermeasure: 'Monitor technology roadmaps' },
      { id: 'i5', name: 'Warranty and support contracts', description: 'Maintenance agreement status', businessInference: 'Reveals vendor relationships and costs', riskLevel: 'medium', vendors: ['ServiceNow', 'Flexera'], countermeasure: 'Track support announcements' },
      { id: 'i6', name: 'Rack unit utilization', description: 'Physical space consumption', businessInference: 'Shows density and capacity constraints', riskLevel: 'high', vendors: ['DCIM vendors'], countermeasure: 'Analyze expansion permits' },
      { id: 'i7', name: 'Serial number tracking', description: 'Individual asset identification', businessInference: 'Maps equipment ownership and transfers', riskLevel: 'high', vendors: ['Asset management'], countermeasure: 'Track equipment sales' },
      { id: 'i8', name: 'Firmware and BIOS versions', description: 'Low-level software inventory', businessInference: 'Shows security posture and update practices', riskLevel: 'high', vendors: ['Dell, HP, Lenovo'], countermeasure: 'Monitor CVE announcements' },
      { id: 'i9', name: 'Network interface card details', description: 'NIC specifications and configurations', businessInference: 'Reveals network capabilities and investments', riskLevel: 'medium', vendors: ['Mellanox', 'Intel'], countermeasure: 'Track networking trends' },
      { id: 'i10', name: 'Memory and CPU specifications', description: 'Compute resource details', businessInference: 'Shows workload requirements and capabilities', riskLevel: 'critical', vendors: ['Intel', 'AMD', 'DCIM'], countermeasure: 'Monitor chip announcements' },
      { id: 'i11', name: 'Cable plant documentation', description: 'Physical connectivity mapping', businessInference: 'Reveals infrastructure complexity', riskLevel: 'medium', vendors: ['DCIM vendors'], countermeasure: 'Analyze network topologies' },
      { id: 'i12', name: 'Spare parts inventory', description: 'Backup equipment stockpile', businessInference: 'Shows risk tolerance and operational maturity', riskLevel: 'medium', vendors: ['Inventory management'], countermeasure: 'Track procurement patterns' },
      { id: 'i13', name: 'Equipment disposal records', description: 'Decommissioned hardware tracking', businessInference: 'Reveals technology refresh cycles', riskLevel: 'high', vendors: ['E-waste vendors', 'ITAD'], countermeasure: 'Monitor recycling reports' },
      { id: 'i14', name: 'Custom hardware identification', description: 'Proprietary equipment details', businessInference: 'Shows competitive advantages and R&D', riskLevel: 'critical', vendors: ['Internal tracking'], countermeasure: 'Track patent filings' },
      { id: 'i15', name: 'Hardware security module inventory', description: 'Cryptographic equipment tracking', businessInference: 'Reveals security investment and compliance', riskLevel: 'critical', vendors: ['Thales', 'Utimaco'], countermeasure: 'Monitor security certifications' },
    ]
  },
  {
    id: 'capacity-planning',
    name: '📈 Capacity & Planning Data',
    icon: <BarChart3 size={20} />,
    description: 'Planning data reveals growth trajectory, constraints, and strategic direction',
    riskLevel: 'high',
    dataPoints: [
      { id: 'c1', name: 'Projected growth forecasts', description: 'Future capacity requirements', businessInference: 'Reveals business growth expectations', riskLevel: 'critical', vendors: ['DCIM vendors', 'Planning tools'], countermeasure: 'Track expansion announcements' },
      { id: 'c2', name: 'Stranded capacity analysis', description: 'Unusable power/space/cooling', businessInference: 'Shows infrastructure inefficiencies', riskLevel: 'high', vendors: ['Sunbird', 'nlyte'], countermeasure: 'Analyze facility designs' },
      { id: 'c3', name: 'Reservation and booking systems', description: 'Future space and power commitments', businessInference: 'Indicates upcoming deployments', riskLevel: 'critical', vendors: ['DCIM vendors'], countermeasure: 'Monitor customer announcements' },
      { id: 'c4', name: 'Lead time tracking', description: 'Equipment procurement timelines', businessInference: 'Shows supply chain constraints', riskLevel: 'high', vendors: ['Procurement systems'], countermeasure: 'Track supply chain news' },
      { id: 'c5', name: 'Density planning metrics', description: 'Watts per square foot projections', businessInference: 'Reveals high-density deployment plans', riskLevel: 'high', vendors: ['DCIM vendors'], countermeasure: 'Analyze building permits' },
      { id: 'c6', name: 'Cooling capacity roadmaps', description: 'Future cooling infrastructure plans', businessInference: 'Shows expansion and technology strategy', riskLevel: 'high', vendors: ['Engineering firms'], countermeasure: 'Track construction permits' },
      { id: 'c7', name: 'Power procurement pipelines', description: 'Future electrical capacity', businessInference: 'Indicates growth magnitude', riskLevel: 'critical', vendors: ['Utilities', 'DCIM'], countermeasure: 'Monitor utility filings' },
      { id: 'c8', name: 'Multi-site capacity balancing', description: 'Workload distribution planning', businessInference: 'Reveals global strategy and redundancy', riskLevel: 'high', vendors: ['DCIM vendors'], countermeasure: 'Track data center announcements' },
      { id: 'c9', name: 'Decommissioning schedules', description: 'Planned equipment removals', businessInference: 'Shows refresh cycles and priorities', riskLevel: 'medium', vendors: ['Asset management'], countermeasure: 'Monitor e-waste trends' },
      { id: 'c10', name: 'Expansion project timelines', description: 'Construction and deployment schedules', businessInference: 'Reveals growth velocity', riskLevel: 'critical', vendors: ['Project management'], countermeasure: 'Track construction activity' },
      { id: 'c11', name: 'Budget allocations', description: 'Capital and operational spending plans', businessInference: 'Shows investment priorities', riskLevel: 'critical', vendors: ['Financial systems'], countermeasure: 'Analyze SEC filings' },
      { id: 'c12', name: 'Vendor selection pipelines', description: 'Equipment and service evaluations', businessInference: 'Indicates technology direction', riskLevel: 'high', vendors: ['Procurement'], countermeasure: 'Track RFP announcements' },
    ]
  },
  {
    id: 'compute-workload',
    name: '💻 Compute & Workload Patterns',
    icon: <Cpu size={20} />,
    description: 'Workload data reveals service types, customer behavior, and business cycles',
    riskLevel: 'critical',
    dataPoints: [
      { id: 'w1', name: 'CPU utilization per server', description: 'Processor usage patterns', businessInference: 'Reveals workload intensity and efficiency', riskLevel: 'critical', vendors: ['VMware', 'Intel DCM', 'DCIM'], countermeasure: 'Track cloud pricing' },
      { id: 'w2', name: 'Memory utilization patterns', description: 'RAM usage over time', businessInference: 'Shows application memory requirements', riskLevel: 'high', vendors: ['Monitoring tools'], countermeasure: 'Analyze benchmark reports' },
      { id: 'w3', name: 'VM/container density', description: 'Virtualization ratios', businessInference: 'Reveals efficiency and workload types', riskLevel: 'high', vendors: ['VMware', 'Kubernetes'], countermeasure: 'Track cloud efficiency reports' },
      { id: 'w4', name: 'Workload migration patterns', description: 'Movement of applications between hosts', businessInference: 'Shows capacity management and optimization', riskLevel: 'high', vendors: ['VMware', 'Cloud providers'], countermeasure: 'Monitor migration announcements' },
      { id: 'w5', name: 'Batch job schedules', description: 'Recurring compute task timing', businessInference: 'Reveals business processes and cycles', riskLevel: 'high', vendors: ['Job schedulers'], countermeasure: 'Analyze service patterns' },
      { id: 'w6', name: 'AI/ML training job patterns', description: 'Machine learning workload characteristics', businessInference: 'Shows AI investment and capabilities', riskLevel: 'critical', vendors: ['NVIDIA', 'Cloud providers'], countermeasure: 'Track AI announcements' },
      { id: 'w7', name: 'Database query patterns', description: 'Data access and query loads', businessInference: 'Reveals data-intensive operations', riskLevel: 'high', vendors: ['Database vendors'], countermeasure: 'Monitor data trends' },
      { id: 'w8', name: 'Application performance metrics', description: 'Response times and throughput', businessInference: 'Shows service quality and requirements', riskLevel: 'high', vendors: ['APM tools'], countermeasure: 'Analyze public performance' },
      { id: 'w9', name: 'Backup and replication jobs', description: 'Data protection workloads', businessInference: 'Reveals data volumes and protection needs', riskLevel: 'high', vendors: ['Backup vendors'], countermeasure: 'Track data protection news' },
      { id: 'w10', name: 'Auto-scaling events', description: 'Dynamic capacity adjustments', businessInference: 'Shows demand patterns and efficiency', riskLevel: 'high', vendors: ['Cloud providers'], countermeasure: 'Monitor cloud usage trends' },
      { id: 'w11', name: 'Resource contention metrics', description: 'Competition for shared resources', businessInference: 'Indicates capacity constraints', riskLevel: 'high', vendors: ['Performance tools'], countermeasure: 'Track performance complaints' },
      { id: 'w12', name: 'Idle resource identification', description: 'Underutilized capacity detection', businessInference: 'Shows efficiency opportunities', riskLevel: 'medium', vendors: ['FinOps tools'], countermeasure: 'Analyze cloud waste reports' },
    ]
  },
  {
    id: 'financial-ops',
    name: '💰 Financial & Operational',
    icon: <DollarSign size={20} />,
    description: 'Cost and operational data reveals business model, margins, and efficiency',
    riskLevel: 'high',
    dataPoints: [
      { id: 'f1', name: 'Energy cost per kWh by time', description: 'Time-varying electricity prices', businessInference: 'Shows energy procurement strategy', riskLevel: 'high', vendors: ['EMS systems'], countermeasure: 'Track utility rate schedules' },
      { id: 'f2', name: 'Cost allocation per customer', description: 'Resource consumption billing', businessInference: 'Reveals pricing model and margins', riskLevel: 'critical', vendors: ['Billing systems'], countermeasure: 'Analyze public pricing' },
      { id: 'f3', name: 'Maintenance cost tracking', description: 'Repair and upkeep expenses', businessInference: 'Shows operational efficiency', riskLevel: 'medium', vendors: ['CMMS'], countermeasure: 'Track vendor pricing' },
      { id: 'f4', name: 'CapEx vs OpEx ratios', description: 'Capital vs operational spending', businessInference: 'Reveals investment strategy', riskLevel: 'high', vendors: ['Financial systems'], countermeasure: 'Analyze SEC filings' },
      { id: 'f5', name: 'Chargeback models', description: 'Internal cost allocation', businessInference: 'Shows business unit consumption', riskLevel: 'high', vendors: ['FinOps tools'], countermeasure: 'Track org announcements' },
      { id: 'f6', name: 'Contract terms and renewals', description: 'Customer agreement details', businessInference: 'Reveals customer relationships', riskLevel: 'critical', vendors: ['Contract management'], countermeasure: 'Monitor press releases' },
      { id: 'f7', name: 'SLA performance metrics', description: 'Service level compliance', businessInference: 'Shows operational maturity', riskLevel: 'high', vendors: ['Monitoring tools'], countermeasure: 'Track SLA reports' },
      { id: 'f8', name: 'Incident cost impact', description: 'Financial effect of outages', businessInference: 'Reveals downtime costs', riskLevel: 'high', vendors: ['ITSM'], countermeasure: 'Monitor outage reports' },
      { id: 'f9', name: 'Vendor spend analysis', description: 'Third-party service costs', businessInference: 'Shows dependencies and relationships', riskLevel: 'high', vendors: ['Procurement'], countermeasure: 'Track vendor news' },
      { id: 'f10', name: 'Staffing costs per facility', description: 'Personnel expenses', businessInference: 'Reveals operational model', riskLevel: 'high', vendors: ['HR systems'], countermeasure: 'Analyze salary data' },
      { id: 'f11', name: 'Insurance coverage details', description: 'Risk transfer arrangements', businessInference: 'Shows risk assessment', riskLevel: 'medium', vendors: ['Insurance systems'], countermeasure: 'Track insurance filings' },
      { id: 'f12', name: 'Carbon credit transactions', description: 'Environmental offset purchases', businessInference: 'Reveals sustainability costs', riskLevel: 'medium', vendors: ['Carbon accounting'], countermeasure: 'Monitor ESG reports' },
    ]
  },
  {
    id: 'incident-ops',
    name: '🚨 Incidents & Operations',
    icon: <AlertTriangle size={20} />,
    description: 'Incident data reveals reliability, response capabilities, and operational maturity',
    riskLevel: 'high',
    dataPoints: [
      { id: 'o1', name: 'Incident frequency and severity', description: 'Problem occurrence rates', businessInference: 'Shows operational reliability', riskLevel: 'high', vendors: ['ITSM'], countermeasure: 'Track public outage reports' },
      { id: 'o2', name: 'Mean time to repair (MTTR)', description: 'Average fix duration', businessInference: 'Reveals operational capability', riskLevel: 'high', vendors: ['ITSM'], countermeasure: 'Analyze incident reports' },
      { id: 'o3', name: 'Root cause analysis reports', description: 'Problem investigation findings', businessInference: 'Shows learning and improvement', riskLevel: 'high', vendors: ['ITSM'], countermeasure: 'Track post-mortem publications' },
      { id: 'o4', name: 'Change management records', description: 'Planned modification tracking', businessInference: 'Reveals operational maturity', riskLevel: 'medium', vendors: ['ServiceNow'], countermeasure: 'Monitor change announcements' },
      { id: 'o5', name: 'Escalation patterns', description: 'Issue severity progression', businessInference: 'Shows organizational structure', riskLevel: 'medium', vendors: ['ITSM'], countermeasure: 'Analyze response times' },
      { id: 'o6', name: 'Runbook execution logs', description: 'Standard procedure following', businessInference: 'Indicates automation level', riskLevel: 'medium', vendors: ['Automation tools'], countermeasure: 'Track automation news' },
      { id: 'o7', name: 'Alarm fatigue metrics', description: 'Alert volume and response', businessInference: 'Shows monitoring maturity', riskLevel: 'medium', vendors: ['Monitoring'], countermeasure: 'Analyze public incidents' },
      { id: 'o8', name: 'Maintenance window patterns', description: 'Planned downtime schedules', businessInference: 'Reveals SLA constraints', riskLevel: 'medium', vendors: ['ITSM'], countermeasure: 'Track maintenance notices' },
      { id: 'o9', name: 'Vendor response times', description: 'Third-party support performance', businessInference: 'Shows vendor relationships', riskLevel: 'medium', vendors: ['Support systems'], countermeasure: 'Monitor vendor SLAs' },
      { id: 'o10', name: 'Compliance audit findings', description: 'Regulatory inspection results', businessInference: 'Indicates compliance posture', riskLevel: 'high', vendors: ['GRC tools'], countermeasure: 'Track audit reports' },
      { id: 'o11', name: 'Disaster recovery test results', description: 'Business continuity validation', businessInference: 'Shows resilience investment', riskLevel: 'high', vendors: ['DR tools'], countermeasure: 'Monitor BC announcements' },
      { id: 'o12', name: 'Staff training records', description: 'Personnel certification status', businessInference: 'Reveals operational capability', riskLevel: 'medium', vendors: ['LMS'], countermeasure: 'Track certification news' },
    ]
  },
  {
    id: 'environmental',
    name: '🌿 Environmental & Sustainability',
    icon: <Activity size={20} />,
    description: 'Environmental data reveals sustainability commitments and regulatory compliance',
    riskLevel: 'medium',
    dataPoints: [
      { id: 'e1', name: 'Carbon emissions (Scope 1, 2, 3)', description: 'Greenhouse gas output', businessInference: 'Shows environmental impact', riskLevel: 'medium', vendors: ['Carbon accounting'], countermeasure: 'Track ESG reports' },
      { id: 'e2', name: 'Water usage effectiveness (WUE)', description: 'Water consumption efficiency', businessInference: 'Reveals resource efficiency', riskLevel: 'medium', vendors: ['Sustainability tools'], countermeasure: 'Monitor water reports' },
      { id: 'e3', name: 'Renewable energy certificates', description: 'Green power documentation', businessInference: 'Shows sustainability investment', riskLevel: 'low', vendors: ['REC tracking'], countermeasure: 'Track PPA announcements' },
      { id: 'e4', name: 'E-waste disposal records', description: 'Electronic waste handling', businessInference: 'Indicates lifecycle management', riskLevel: 'medium', vendors: ['ITAD'], countermeasure: 'Monitor recycling reports' },
      { id: 'e5', name: 'Air quality monitoring', description: 'Particulate and pollutant levels', businessInference: 'Shows environmental compliance', riskLevel: 'low', vendors: ['EMS'], countermeasure: 'Track EPA reports' },
      { id: 'e6', name: 'Noise level measurements', description: 'Acoustic output monitoring', businessInference: 'Reveals community impact', riskLevel: 'low', vendors: ['Environmental monitoring'], countermeasure: 'Track permit applications' },
      { id: 'e7', name: 'Refrigerant tracking', description: 'Cooling chemical inventory', businessInference: 'Shows environmental compliance', riskLevel: 'medium', vendors: ['EMS'], countermeasure: 'Monitor EPA filings' },
      { id: 'e8', name: 'Sustainability goal progress', description: 'Net-zero timeline tracking', businessInference: 'Reveals long-term strategy', riskLevel: 'medium', vendors: ['ESG tools'], countermeasure: 'Track sustainability reports' },
      { id: 'e9', name: 'Circular economy metrics', description: 'Resource reuse tracking', businessInference: 'Shows efficiency focus', riskLevel: 'low', vendors: ['Sustainability'], countermeasure: 'Monitor industry trends' },
      { id: 'e10', name: 'Biodiversity impact assessments', description: 'Local ecosystem effects', businessInference: 'Indicates environmental stewardship', riskLevel: 'low', vendors: ['Environmental consultants'], countermeasure: 'Track environmental studies' },
    ]
  },
];

// Calculate total data points
const TOTAL_DATA_POINTS = ALL_DATA_CATEGORIES.reduce((sum, cat) => sum + cat.dataPoints.length, 0);

export const DataPointsExplorer: React.FC = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedDataPoints, setExpandedDataPoints] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [showSummary, setShowSummary] = useState(true);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Toggle data point expansion
  const toggleDataPoint = (dataPointId: string) => {
    setExpandedDataPoints(prev => {
      const next = new Set(prev);
      if (next.has(dataPointId)) {
        next.delete(dataPointId);
      } else {
        next.add(dataPointId);
      }
      return next;
    });
  };

  // Expand all
  const expandAll = () => {
    setExpandedCategories(new Set(ALL_DATA_CATEGORIES.map(c => c.id)));
    setExpandedDataPoints(new Set(ALL_DATA_CATEGORIES.flatMap(c => c.dataPoints.map(d => d.id))));
  };

  // Collapse all
  const collapseAll = () => {
    setExpandedCategories(new Set());
    setExpandedDataPoints(new Set());
  };

  // Filter data
  const filteredCategories = useMemo(() => {
    return ALL_DATA_CATEGORIES.map(category => {
      const filteredPoints = category.dataPoints.filter(dp => {
        const matchesSearch = searchTerm === '' || 
          dp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dp.businessInference.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRisk = riskFilter === 'all' || dp.riskLevel === riskFilter;
        return matchesSearch && matchesRisk;
      });
      return { ...category, dataPoints: filteredPoints };
    }).filter(c => c.dataPoints.length > 0);
  }, [searchTerm, riskFilter]);

  // Statistics
  const stats = useMemo(() => {
    const allPoints = ALL_DATA_CATEGORIES.flatMap(c => c.dataPoints);
    return {
      total: allPoints.length,
      critical: allPoints.filter(p => p.riskLevel === 'critical').length,
      high: allPoints.filter(p => p.riskLevel === 'high').length,
      medium: allPoints.filter(p => p.riskLevel === 'medium').length,
      low: allPoints.filter(p => p.riskLevel === 'low').length,
      categories: ALL_DATA_CATEGORIES.length,
      vendors: [...new Set(allPoints.flatMap(p => p.vendors))].length,
    };
  }, []);

  // Export data
  const exportData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      totalDataPoints: TOTAL_DATA_POINTS,
      categories: ALL_DATA_CATEGORIES,
      statistics: stats,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dcim_surveillance_data_points_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Eye size={28} />
              All {TOTAL_DATA_POINTS} Surveillance Data Points
            </h1>
            <p className="text-white/80 mt-1">
              Complete inventory of what DCIM/DMaaS vendors can collect and infer about your operations
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm flex items-center gap-1"
            >
              <Layers size={16} /> Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm flex items-center gap-1"
            >
              <EyeOff size={16} /> Collapse All
            </button>
            <button
              onClick={exportData}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm flex items-center gap-1"
            >
              <Download size={16} /> Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {showSummary && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <PieChart size={18} /> Summary Statistics
            </h2>
            <button 
              onClick={() => setShowSummary(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              Hide
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
              <div className="text-xs text-slate-500">Total Points</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-xs text-red-600">Critical Risk</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">{stats.high}</div>
              <div className="text-xs text-orange-600">High Risk</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">{stats.medium}</div>
              <div className="text-xs text-yellow-600">Medium Risk</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{stats.low}</div>
              <div className="text-xs text-green-600">Low Risk</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{stats.categories}</div>
              <div className="text-xs text-blue-600">Categories</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{stats.vendors}</div>
              <div className="text-xs text-purple-600">Vendors</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search data points by name, description, or inference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">🔴 Critical Only</option>
            <option value="high">🟠 High Only</option>
            <option value="medium">🟡 Medium Only</option>
            <option value="low">🟢 Low Only</option>
          </select>
        </div>
      </div>

      {/* Filtered count */}
      {(searchTerm || riskFilter !== 'all') && (
        <div className="text-sm text-slate-500">
          Showing {filteredCategories.reduce((sum, c) => sum + c.dataPoints.length, 0)} of {TOTAL_DATA_POINTS} data points
        </div>
      )}

      {/* Categories and Data Points */}
      <div className="space-y-4">
        {filteredCategories.map(category => (
          <div key={category.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedCategories.has(category.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <span className="text-2xl">{category.icon}</span>
                <div className="text-left">
                  <div className="font-bold text-slate-800">{category.name}</div>
                  <div className="text-sm text-slate-500">{category.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskBadgeColor(category.riskLevel)}`}>
                  {category.riskLevel.toUpperCase()}
                </span>
                <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                  {category.dataPoints.length} points
                </span>
              </div>
            </button>

            {/* Data Points */}
            {expandedCategories.has(category.id) && (
              <div className="border-t border-slate-200">
                {category.dataPoints.map((dp, index) => (
                  <div 
                    key={dp.id} 
                    className={`border-b border-slate-100 last:border-b-0 ${index % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}
                  >
                    {/* Data Point Header */}
                    <button
                      onClick={() => toggleDataPoint(dp.id)}
                      className="w-full p-3 pl-12 flex items-center justify-between hover:bg-slate-100/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {expandedDataPoints.has(dp.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span className={`w-2 h-2 rounded-full ${
                          dp.riskLevel === 'critical' ? 'bg-red-500' :
                          dp.riskLevel === 'high' ? 'bg-orange-500' :
                          dp.riskLevel === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <span className="font-medium text-slate-700">{dp.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${getRiskColor(dp.riskLevel)}`}>
                        {dp.riskLevel}
                      </span>
                    </button>

                    {/* Data Point Details */}
                    {expandedDataPoints.has(dp.id) && (
                      <div className="pl-16 pr-4 pb-4 space-y-3">
                        {/* Description */}
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                            <Info size={12} /> Description
                          </div>
                          <div className="text-sm text-blue-900">{dp.description}</div>
                        </div>

                        {/* Business Inference */}
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1 flex items-center gap-1">
                            <Eye size={12} /> What This Reveals (Business Inference)
                          </div>
                          <div className="text-sm text-purple-900">{dp.businessInference}</div>
                        </div>

                        {/* Vendors */}
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                            <Building size={12} /> Vendors Who Collect This
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {dp.vendors.map(vendor => (
                              <span key={vendor} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-600">
                                {vendor}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Countermeasure */}
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                            <Shield size={12} /> Counter-Intelligence (Public Alternative)
                          </div>
                          <div className="text-sm text-green-900">{dp.countermeasure}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Info */}
      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
        <strong>📊 Data Source:</strong> This inventory is based on analysis of major DCIM/DMaaS vendor capabilities 
        including Schneider Electric EcoStruxure, Vertiv/Liebert, nlyte, Sunbird, and others. Each data point 
        represents a real telemetry or inference capability documented in vendor marketing materials or technical 
        specifications.
      </div>
    </div>
  );
};

export default DataPointsExplorer;

