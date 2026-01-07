import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Facility } from '../types';
import { 
  ChevronDown, 
  ChevronRight, 
  Activity, 
  Server, 
  Zap, 
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Building,
  Cpu,
  HardDrive,
  Wifi,
  Database,
  GitBranch,
  BarChart3,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Layers,
  Box,
  Package,
  Info,
  HelpCircle
} from 'lucide-react';
import { InvestigationTemplates, InvestigationResults } from './InvestigationTemplates';
import { type InvestigationTemplate } from '../utils/investigationTemplates';
import EmployeeDetailModal from './EmployeeDetailModal';

interface DeepDiveViewProps {
  facilities: Facility[];
  isFullscreen?: boolean;
}

// Simple Tooltip Component
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-[#00d2d3] rounded text-xs text-white whitespace-nowrap z-50 shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#00d2d3]" />
        </div>
      )}
    </div>
  );
};

// Info badge component for explanations
const InfoBadge: React.FC<{ title: string; description: string }> = ({ title, description }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div 
      className="relative inline-block ml-1"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle size={12} className="text-[#00d2d3] cursor-help" />
      {show && (
        <div className="absolute bottom-full right-0 mb-2 w-64 px-3 py-2 bg-black border border-[#00d2d3] rounded text-xs text-white z-50 shadow-lg">
          <div className="font-bold text-[#00d2d3] mb-1">{title}</div>
          <div className="text-gray-300">{description}</div>
          <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-[#00d2d3]" />
        </div>
      )}
    </div>
  );
};

// Nested tab types
type TabId = 'overview' | 'financial' | 'technical' | 'compliance' | 'workforce' | 'timeline';
type SubTabId = 'subsidies' | 'revenue' | 'costs' | 'roi' | 'infrastructure' | 'capacity' | 'network' | 'energy' | 'racks' | 'servers' | 'components' | 'environment' | 'customers' | 'incidents' | 'transactions' | 'employees';

interface ExpandedState {
  [facilityId: number]: {
    expanded: boolean;
    activeTab: TabId;
    activeSubTab: SubTabId;
    expandedSections: {
      [key: string]: boolean;
    };
  };
}

export const DeepDiveView: React.FC<DeepDiveViewProps> = ({ facilities, isFullscreen = false }) => {
  const [expandedState, setExpandedState] = useState<ExpandedState>({});
  const [scrollOffset, setScrollOffset] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState<{ [key: number]: any }>({});
  const [investigationResults, setInvestigationResults] = useState<{
    results: Facility[];
    template: InvestigationTemplate;
    facility?: Facility;
  } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  // Infinite scroll - load more as you scroll
  const visibleCount = useMemo(() => {
    return Math.min(facilities.length, 50 + Math.floor(scrollOffset / 1000) * 20);
  }, [scrollOffset, facilities.length]);

  // Real-time data simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => {
        const updated = { ...prev };
        facilities.slice(0, visibleCount).forEach(f => {
          updated[f.id] = {
            cpuUsage: Math.random() * 100,
            memoryUsage: 60 + Math.random() * 30,
            networkThroughput: Math.random() * 10000, // Mbps
            powerDraw: 500 + Math.random() * 1500, // kW
            temperature: 18 + Math.random() * 8, // Celsius
            uptime: 99.5 + Math.random() * 0.5, // Percentage
            activeConnections: Math.floor(Math.random() * 50000),
            requestsPerSecond: Math.floor(Math.random() * 100000),
            lastUpdated: new Date().toISOString()
          };
        });
        return updated;
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [facilities, visibleCount]);

  // Handle scroll for infinite loading
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      setScrollOffset(target.scrollTop);
    };

    const container = document.getElementById('deep-dive-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const toggleFacility = useCallback((facilityId: number) => {
    setExpandedState(prev => ({
      ...prev,
      [facilityId]: {
        ...(prev[facilityId] || {
          activeTab: 'overview',
          activeSubTab: 'subsidies',
          expandedSections: {}
        }),
        expanded: !prev[facilityId]?.expanded
      }
    }));
  }, []);

  const setActiveTab = useCallback((facilityId: number, tab: TabId) => {
    setExpandedState(prev => ({
      ...prev,
      [facilityId]: {
        ...prev[facilityId],
        activeTab: tab
      }
    }));
  }, []);

  const setActiveSubTab = useCallback((facilityId: number, subTab: SubTabId) => {
    setExpandedState(prev => ({
      ...prev,
      [facilityId]: {
        ...prev[facilityId],
        activeSubTab: subTab
      }
    }));
  }, []);

  const toggleSection = useCallback((facilityId: number, section: string) => {
    setExpandedState(prev => ({
      ...prev,
      [facilityId]: {
        ...prev[facilityId],
        expandedSections: {
          ...prev[facilityId]?.expandedSections,
          [section]: !prev[facilityId]?.expandedSections?.[section]
        }
      }
    }));
  }, []);

  // Generate ULTRA-granular data for a facility
  const generateDeepData = (facility: Facility) => {
    const metrics = liveMetrics[facility.id] || {};
    
    // Generate rack-level data
    const rackCount = Math.floor(100 + Math.random() * 900);
    const racks = Array.from({ length: Math.min(rackCount, 50) }, (_, i) => ({
      id: i + 1,
      location: `Row ${String.fromCharCode(65 + Math.floor(i / 10))}-${(i % 10) + 1}`,
      capacity: 42, // Standard rack units
      used: Math.floor(20 + Math.random() * 22),
      powerDraw: Math.floor(3 + Math.random() * 12), // kW
      temperature: 20 + Math.random() * 6,
      servers: Array.from({ length: Math.floor(5 + Math.random() * 15) }, (_, j) => ({
        id: `SRV-${i + 1}-${j + 1}`,
        hostname: `server${i + 1}-${j + 1}.${facility.operator.toLowerCase().replace(/\s+/g, '')}.local`,
        type: ['Compute', 'Storage', 'Network', 'Database'][Math.floor(Math.random() * 4)],
        cpu: `Intel Xeon ${['Gold', 'Platinum', 'Silver'][Math.floor(Math.random() * 3)]} ${Math.floor(4000 + Math.random() * 4000)}`,
        cores: [16, 24, 32, 48, 64][Math.floor(Math.random() * 5)],
        ram: [64, 128, 256, 512, 1024][Math.floor(Math.random() * 5)],
        storage: `${[1, 2, 4, 8, 16][Math.floor(Math.random() * 5)]}TB`,
        os: ['Ubuntu 22.04', 'RHEL 9', 'Windows Server 2022', 'CentOS 8'][Math.floor(Math.random() * 4)],
        uptime: Math.floor(1 + Math.random() * 365),
        cpuUsage: Math.random() * 100,
        memUsage: 40 + Math.random() * 50,
        networkIn: Math.floor(Math.random() * 1000),
        networkOut: Math.floor(Math.random() * 1000),
        processes: Math.floor(100 + Math.random() * 400)
      }))
    }));

    // Generate employee data (anonymized)
    const employees = Array.from({ length: Math.floor(50 + Math.random() * 200) }, (_, i) => ({
      id: `EMP-${10000 + i}`,
      role: ['Data Center Technician', 'Network Engineer', 'Security Guard', 'Facilities Manager', 'System Administrator', 'Help Desk'][Math.floor(Math.random() * 6)],
      level: ['Junior', 'Mid', 'Senior', 'Lead'][Math.floor(Math.random() * 4)],
      startDate: `${2018 + Math.floor(Math.random() * 7)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
      salary: Math.floor(45000 + Math.random() * 100000),
      certifications: Math.floor(Math.random() * 5),
      localResident: Math.random() > 0.3,
      shiftSchedule: ['Day', 'Night', 'Swing'][Math.floor(Math.random() * 3)],
      performanceScore: 60 + Math.random() * 40
    }));

    // Generate transaction-level subsidy data
    const subsidyTransactions = Array.from({ length: 20 }, (_, i) => ({
      id: `TXN-${facility.id}-${i + 1}`,
      date: new Date(2020 + Math.floor(i / 5), (i % 12), 1).toISOString().split('T')[0],
      type: ['Tax Abatement', 'Energy Credit', 'Job Creation Credit', 'Infrastructure Grant', 'Training Grant'][Math.floor(Math.random() * 5)],
      amount: Math.floor(10000 + Math.random() * 500000),
      recipient: facility.operator,
      grantor: ['State Commerce Dept', 'County Tax Authority', 'Utility Company', 'Federal DOE'][Math.floor(Math.random() * 4)],
      status: ['Received', 'Pending', 'Under Review', 'Disputed'][Math.floor(Math.random() * 4)],
      contractClause: `Section ${Math.floor(1 + Math.random() * 10)}.${Math.floor(1 + Math.random() * 5)}`,
      conditions: ['Job creation milestone', 'Capital investment threshold', 'Local hiring requirement', 'Energy efficiency target'][Math.floor(Math.random() * 4)]
    }));

    // Generate infrastructure components
    const infrastructureComponents = {
      ups: Array.from({ length: Math.floor(4 + Math.random() * 8) }, (_, i) => ({
        id: `UPS-${i + 1}`,
        manufacturer: ['APC', 'Eaton', 'Vertiv', 'Schneider'][Math.floor(Math.random() * 4)],
        capacity: `${[500, 750, 1000, 1500][Math.floor(Math.random() * 4)]}kVA`,
        batteryHealth: 70 + Math.random() * 30,
        load: 40 + Math.random() * 50,
        lastMaintenance: `${Math.floor(Math.random() * 180)} days ago`,
        nextService: `${Math.floor(30 + Math.random() * 60)} days`
      })),
      generators: Array.from({ length: Math.floor(2 + Math.random() * 4) }, (_, i) => ({
        id: `GEN-${i + 1}`,
        type: 'Diesel',
        capacity: `${[1, 2, 3, 5][Math.floor(Math.random() * 4)]}MW`,
        fuelLevel: 60 + Math.random() * 40,
        runtime: `${Math.floor(12 + Math.random() * 36)} hours`,
        lastTest: `${Math.floor(Math.random() * 30)} days ago`,
        testResult: ['Pass', 'Pass with warnings', 'Maintenance Required'][Math.floor(Math.random() * 3)]
      })),
      coolingUnits: Array.from({ length: Math.floor(10 + Math.random() * 30) }, (_, i) => ({
        id: `CRAC-${i + 1}`,
        type: ['CRAC', 'CRAH', 'Chiller'][Math.floor(Math.random() * 3)],
        capacity: `${[50, 100, 150, 200][Math.floor(Math.random() * 4)]} tons`,
        efficiency: 2 + Math.random() * 2, // COP
        load: 50 + Math.random() * 40,
        supplyTemp: 15 + Math.random() * 5,
        returnTemp: 25 + Math.random() * 5
      })),
      networkSwitches: Array.from({ length: Math.floor(20 + Math.random() * 80) }, (_, i) => ({
        id: `SW-${i + 1}`,
        model: ['Cisco Nexus', 'Arista', 'Juniper QFX', 'Dell PowerSwitch'][Math.floor(Math.random() * 4)],
        ports: [48, 96, 128][Math.floor(Math.random() * 3)],
        portsUsed: Math.floor(20 + Math.random() * 100),
        throughput: Math.floor(Math.random() * 10000), // Mbps
        errors: Math.floor(Math.random() * 10),
        uptime: 99.5 + Math.random() * 0.5
      }))
    };

    // Generate customer/tenant data
    const customers = Array.from({ length: Math.floor(20 + Math.random() * 100) }, (_, i) => ({
      id: `CUST-${1000 + i}`,
      name: `Customer ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26)}`,
      type: ['Colocation', 'Dedicated', 'Cloud', 'Hybrid'][Math.floor(Math.random() * 4)],
      rackCount: Math.floor(1 + Math.random() * 20),
      powerAllocation: Math.floor(5 + Math.random() * 100), // kW
      bandwidth: `${[1, 10, 100][Math.floor(Math.random() * 3)]}Gbps`,
      contractStart: `${2018 + Math.floor(Math.random() * 7)}-01-01`,
      contractEnd: `${2025 + Math.floor(Math.random() * 5)}-12-31`,
      monthlyRevenue: Math.floor(5000 + Math.random() * 50000),
      sla: [99.9, 99.95, 99.99, 99.999][Math.floor(Math.random() * 4)]
    }));

    // Generate granular incident log
    const incidentLog = Array.from({ length: Math.floor(10 + Math.random() * 30) }, (_, i) => {
      const date = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
      return {
        id: `INC-${facility.id}-${i + 1}`,
        timestamp: date.toISOString(),
        type: ['Power Failure', 'Cooling Alert', 'Network Outage', 'Security Breach', 'Hardware Failure', 'Software Error'][Math.floor(Math.random() * 6)],
        severity: ['Critical', 'High', 'Medium', 'Low'][Math.floor(Math.random() * 4)],
        affectedSystems: Math.floor(1 + Math.random() * 50),
        responseTime: `${Math.floor(1 + Math.random() * 30)} minutes`,
        resolutionTime: `${Math.floor(10 + Math.random() * 300)} minutes`,
        rootCause: 'Analysis pending',
        assignedTo: `Tech Team ${Math.floor(1 + Math.random() * 5)}`,
        status: ['Resolved', 'In Progress', 'Investigating'][Math.floor(Math.random() * 3)]
      };
    });

    // Generate environmental data by zone
    const environmentalZones = Array.from({ length: Math.floor(5 + Math.random() * 15) }, (_, i) => ({
      zone: `Zone ${String.fromCharCode(65 + i)}`,
      temperature: 18 + Math.random() * 8,
      humidity: 40 + Math.random() * 15,
      airflow: Math.floor(1000 + Math.random() * 5000), // CFM
      pressureDiff: (Math.random() * 0.1).toFixed(3), // inches of water
      particleCount: Math.floor(Math.random() * 1000),
      co2Level: Math.floor(400 + Math.random() * 200) // ppm
    }));
    
    return {
      // Ultra-granular data
      racks,
      employees,
      subsidyTransactions,
      infrastructureComponents,
      customers,
      incidentLog,
      environmentalZones,
      
      // Original data
      overview: {
        basicInfo: {
          name: facility.name,
          operator: facility.operator,
          type: facility.type,
          city: facility.city,
          state: facility.state,
          address: `${Math.floor(Math.random() * 9999)} ${['Main St', 'Tech Blvd', 'Data Center Way', 'Cloud Avenue'][Math.floor(Math.random() * 4)]}`,
          zip: `${Math.floor(10000 + Math.random() * 89999)}`,
          coordinates: { lat: 35 + Math.random() * 15, lon: -120 + Math.random() * 50 },
          established: `${2010 + Math.floor(Math.random() * 14)}`,
          tier: ['Tier II', 'Tier III', 'Tier IV'][Math.floor(Math.random() * 3)],
          certifications: ['ISO 27001', 'SOC 2 Type II', 'PCI DSS', 'HIPAA'].filter(() => Math.random() > 0.5)
        },
        liveStatus: {
          operational: true,
          uptime: metrics.uptime || 99.9,
          lastIncident: `${Math.floor(Math.random() * 180)} days ago`,
          maintenanceWindow: 'Sunday 2-6 AM PST',
          activeAlerts: Math.floor(Math.random() * 5),
          cpuUsage: metrics.cpuUsage || 0,
          memoryUsage: metrics.memoryUsage || 0,
          storageUsage: 65 + Math.random() * 25
        }
      },
      financial: {
        subsidies: {
          total: facility.subsidyGap,
          breakdown: [
            { year: '2020', amount: facility.subsidyGap * 0.15, type: 'Property Tax Abatement', status: 'Received' },
            { year: '2021', amount: facility.subsidyGap * 0.20, type: 'Energy Credit', status: 'Received' },
            { year: '2022', amount: facility.subsidyGap * 0.25, type: 'Job Creation Credit', status: 'Under Review' },
            { year: '2023', amount: facility.subsidyGap * 0.40, type: 'Infrastructure Grant', status: 'Pending' }
          ],
          conditions: [
            { condition: 'Create 500 jobs by 2025', progress: '43%', status: 'Behind' },
            { condition: 'Maintain 85% local hiring', progress: '67%', status: 'Non-compliant' },
            { condition: '$100M capital investment', progress: '92%', status: 'On Track' }
          ]
        },
        revenue: {
          annual: (facility.subsidyGap * 50 * (1 + Math.random())),
          quarterly: [
            { q: 'Q1 2024', revenue: facility.subsidyGap * 12, growth: '+8%' },
            { q: 'Q2 2024', revenue: facility.subsidyGap * 13, growth: '+12%' },
            { q: 'Q3 2024', revenue: facility.subsidyGap * 14, growth: '+15%' },
            { q: 'Q4 2024', revenue: facility.subsidyGap * 15, growth: '+18%' }
          ],
          clients: Math.floor(50 + Math.random() * 200),
          contractValue: facility.subsidyGap * 3
        },
        costs: {
          operational: {
            energy: facility.subsidyGap * 8,
            staffing: facility.subsidyGap * 12,
            maintenance: facility.subsidyGap * 3,
            security: facility.subsidyGap * 2,
            insurance: facility.subsidyGap * 1.5
          },
          breakdown: [
            { category: 'Energy', monthly: facility.subsidyGap * 0.67, trend: 'up' },
            { category: 'Labor', monthly: facility.subsidyGap * 1.0, trend: 'stable' },
            { category: 'Cooling', monthly: facility.subsidyGap * 0.33, trend: 'down' },
            { category: 'Network', monthly: facility.subsidyGap * 0.25, trend: 'up' }
          ]
        }
      },
      technical: {
        infrastructure: {
          rackCount: Math.floor(100 + Math.random() * 900),
          serverCount: Math.floor(1000 + Math.random() * 9000),
          totalCapacity: `${Math.floor(5 + Math.random() * 45)} MW`,
          usedCapacity: `${Math.floor(3 + Math.random() * 30)} MW`,
          coolingSystem: ['Air-cooled', 'Liquid-cooled', 'Hybrid'][Math.floor(Math.random() * 3)],
          redundancy: 'N+1',
          floorSpace: `${Math.floor(50000 + Math.random() * 450000)} sq ft`,
          cageCount: Math.floor(20 + Math.random() * 180)
        },
        capacity: {
          compute: {
            total: Math.floor(10000 + Math.random() * 90000),
            used: Math.floor(6000 + Math.random() * 50000),
            available: Math.floor(4000 + Math.random() * 40000),
            reserved: Math.floor(1000 + Math.random() * 10000)
          },
          storage: {
            total: `${Math.floor(100 + Math.random() * 900)} PB`,
            used: `${Math.floor(60 + Math.random() * 500)} PB`,
            type: 'SSD/HDD Hybrid',
            iops: `${Math.floor(100000 + Math.random() * 900000)}`
          },
          network: {
            bandwidth: `${Math.floor(10 + Math.random() * 90)} Gbps`,
            throughput: metrics.networkThroughput || 0,
            latency: `${(Math.random() * 5).toFixed(2)} ms`,
            uplinks: Math.floor(4 + Math.random() * 12),
            peers: Math.floor(10 + Math.random() * 90)
          }
        },
        realtime: {
          cpuUsage: metrics.cpuUsage || 0,
          memoryUsage: metrics.memoryUsage || 0,
          networkIn: Math.floor(Math.random() * 5000),
          networkOut: Math.floor(Math.random() * 5000),
          powerDraw: metrics.powerDraw || 0,
          temperature: metrics.temperature || 22,
          humidity: 40 + Math.random() * 10,
          activeVMs: Math.floor(1000 + Math.random() * 9000),
          activeConnections: metrics.activeConnections || 0,
          requestsPerSecond: metrics.requestsPerSecond || 0
        }
      },
      compliance: {
        status: facility.complianceStatus,
        score: facility.complianceStatus === 'Compliant' ? 85 + Math.random() * 15 : Math.random() * 60,
        history: [
          { date: '2024-12', status: 'Compliant', score: 92 },
          { date: '2024-11', status: 'Compliant', score: 89 },
          { date: '2024-10', status: 'At Risk', score: 78 },
          { date: '2024-09', status: 'Non-Compliant', score: 65 }
        ],
        violations: [
          { type: 'Job Creation Shortfall', severity: 'High', date: '2024-10-15', fine: facility.subsidyGap * 0.1 },
          { type: 'Local Hiring Below Threshold', severity: 'Medium', date: '2024-09-22', fine: facility.subsidyGap * 0.05 }
        ],
        audits: [
          { date: '2024-08-01', type: 'Quarterly Review', result: 'Pass', auditor: 'State Commerce Dept' },
          { date: '2024-05-01', type: 'Quarterly Review', result: 'Pass with Warnings', auditor: 'State Commerce Dept' },
          { date: '2024-02-01', type: 'Quarterly Review', result: 'Fail', auditor: 'State Commerce Dept' }
        ]
      },
      workforce: {
        current: {
          total: facility.jobsCreated || Math.floor(50 + Math.random() * 450),
          promised: facility.jobsPromised || Math.floor(500 + Math.random() * 1500),
          shortfall: (facility.jobsPromised || 1000) - (facility.jobsCreated || 200),
          fulfillment: ((facility.jobsCreated || 200) / (facility.jobsPromised || 1000) * 100).toFixed(1)
        },
        breakdown: [
          { role: 'Data Center Technicians', count: Math.floor(30 + Math.random() * 100), avg_salary: '$65,000' },
          { role: 'Network Engineers', count: Math.floor(10 + Math.random() * 40), avg_salary: '$95,000' },
          { role: 'Security Personnel', count: Math.floor(15 + Math.random() * 50), avg_salary: '$55,000' },
          { role: 'Facilities Management', count: Math.floor(20 + Math.random() * 60), avg_salary: '$75,000' },
          { role: 'Administrative', count: Math.floor(10 + Math.random() * 30), avg_salary: '$50,000' }
        ],
        demographics: {
          localHiring: `${Math.floor(40 + Math.random() * 50)}%`,
          diversity: `${Math.floor(30 + Math.random() * 40)}%`,
          avgTenure: `${(1 + Math.random() * 4).toFixed(1)} years`,
          turnoverRate: `${Math.floor(10 + Math.random() * 20)}%`
        },
        training: [
          { program: 'Cisco Network Certification', participants: Math.floor(10 + Math.random() * 30) },
          { program: 'Safety & Compliance', participants: Math.floor(50 + Math.random() * 150) },
          { program: 'Energy Management', participants: Math.floor(20 + Math.random() * 60) }
        ]
      },
      timeline: {
        milestones: [
          { date: '2015-03-01', event: 'Site acquisition', status: 'Complete' },
          { date: '2016-01-15', event: 'Construction begins', status: 'Complete' },
          { date: '2017-06-30', event: 'Phase 1 operational', status: 'Complete' },
          { date: '2019-12-01', event: 'Phase 2 expansion', status: 'Complete' },
          { date: '2022-08-15', event: 'Phase 3 planning', status: 'In Progress' },
          { date: '2025-Q4', event: 'Phase 3 completion target', status: 'Planned' }
        ],
        incidents: [
          { date: '2024-11-12', type: 'Power Outage', duration: '45 minutes', impact: 'Medium' },
          { date: '2024-08-03', type: 'Cooling System Failure', duration: '2 hours', impact: 'High' },
          { date: '2024-05-22', type: 'Network Disruption', duration: '15 minutes', impact: 'Low' }
        ],
        expansions: [
          { year: '2018', investment: '$50M', capacity: '+5 MW' },
          { year: '2020', investment: '$75M', capacity: '+8 MW' },
          { year: '2023', investment: '$100M', capacity: '+12 MW' }
        ]
      }
    };
  };

  const renderExpandableSection = (
    facilityId: number,
    sectionKey: string,
    title: string,
    icon: React.ReactNode,
    content: React.ReactNode,
    infoText?: string
  ) => {
    const isExpanded = expandedState[facilityId]?.expandedSections?.[sectionKey];
    
    return (
      <div className="border border-[#00d2d3]/20 rounded mt-2">
        <button
          onClick={() => toggleSection(facilityId, sectionKey)}
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[#00d2d3]">
            {icon}
            {title}
            {infoText && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400 ml-1">
                (click to {isExpanded ? 'collapse' : 'expand'})
              </span>
            )}
          </div>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {isExpanded && (
          <div className="p-3 border-t border-[#00d2d3]/20 bg-black/30">
            {infoText && (
              <div className="mb-2 p-2 bg-[#00d2d3]/10 border border-[#00d2d3]/20 rounded text-xs text-gray-300 flex items-start gap-2">
                <Info size={14} className="text-[#00d2d3] flex-shrink-0 mt-0.5" />
                <span>{infoText}</span>
              </div>
            )}
            {content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      id="deep-dive-container"
      className={`h-full overflow-auto ${isFullscreen ? 'p-2' : 'p-4'}`}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 border-b border-[#00d2d3]/20 p-3 mb-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold text-[#00d2d3]">DEEP DIVE MODE</div>
              <InfoBadge 
                title="What is Deep Dive Mode?"
                description="See the most detailed information about each data center facility, including individual servers, employees, equipment, and financial transactions. Click any facility below to explore."
              />
            </div>
            <div className="text-xs text-gray-400">
              Maximum granularity • Real-time updates • Infinite scroll
            </div>
            <div className="mt-2 p-2 bg-[#00d2d3]/10 border border-[#00d2d3]/20 rounded text-xs text-gray-300 flex items-start gap-2">
              <Info size={14} className="text-[#00d2d3] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">How to use:</span> Click any facility name to expand it. 
                Use the tabs (Overview, Financial, Technical, etc.) to explore different aspects. 
                Click section headers to reveal detailed data. Hover over items for explanations.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Activity size={12} className="text-[#00d2d3] animate-pulse" />
              <span className="text-gray-400">LIVE</span>
            </div>
            <div className="text-gray-400">
              Showing {visibleCount} of {facilities.length}
            </div>
          </div>
        </div>
      </div>

      {/* Facility List with Infinite Scroll */}
      <div className="space-y-3">
        {facilities.slice(0, visibleCount).map((facility) => {
          const isExpanded = expandedState[facility.id]?.expanded;
          const activeTab = expandedState[facility.id]?.activeTab || 'overview';
          const activeSubTab = expandedState[facility.id]?.activeSubTab || 'subsidies';
          const deepData = generateDeepData(facility);
          const metrics = liveMetrics[facility.id] || {};

          return (
            <div
              key={facility.id}
              id={`facility-${facility.id}`}
              className="border border-[#00d2d3]/30 rounded-lg bg-gradient-to-br from-black to-[#0a0e17] hover:border-[#00d2d3]/60 transition-all"
            >
              {/* Collapsed Header */}
              <div
                onClick={() => toggleFacility(facility.id)}
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-white/5 transition-colors group"
                title="Click to expand and see detailed information"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Tooltip text={
                    facility.complianceStatus === 'Compliant' ? 'Meeting job creation goals' :
                    facility.complianceStatus === 'At Risk' ? 'Job creation falling behind targets' :
                    'Significantly under job creation promises'
                  }>
                    <div className={`w-3 h-3 rounded-full ${
                      facility.complianceStatus === 'Compliant' ? 'bg-[#2ed573]' :
                      facility.complianceStatus === 'At Risk' ? 'bg-[#ffa502]' :
                      'bg-[#ff4757]'
                    } animate-pulse`} />
                  </Tooltip>
                  
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm">{facility.name}</div>
                    <div className="text-xs text-gray-400">
                      {facility.city}, {facility.state} • {facility.operator}
                    </div>
                  </div>

                  {/* Live metrics preview */}
                  {metrics.cpuUsage !== undefined && (
                    <div className="flex items-center gap-3 text-xs">
                      <Tooltip text="CPU usage across all servers">
                        <div className="flex items-center gap-1">
                          <Cpu size={12} className="text-[#00d2d3]" />
                          <span className="text-white">{metrics.cpuUsage.toFixed(1)}%</span>
                        </div>
                      </Tooltip>
                      <Tooltip text="Current power consumption">
                        <div className="flex items-center gap-1">
                          <Zap size={12} className="text-[#ffa502]" />
                          <span className="text-white">{metrics.powerDraw.toFixed(0)}kW</span>
                        </div>
                      </Tooltip>
                      <Tooltip text="System uptime percentage">
                        <div className="flex items-center gap-1">
                          <Activity size={12} className="text-[#2ed573]" />
                          <span className="text-white">{metrics.uptime.toFixed(2)}%</span>
                        </div>
                      </Tooltip>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isExpanded ? 'Click to collapse' : 'Click to expand'}
                  </span>
                  {isExpanded ? <ChevronDown size={20} className="text-[#00d2d3]" /> : <ChevronRight size={20} className="text-[#00d2d3]" />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-[#00d2d3]/20 p-4 bg-black/40">
                  {/* Main Tabs */}
                  <div className="flex items-center gap-2 mb-4 border-b border-[#00d2d3]/20 pb-2 overflow-x-auto">
                    {[
                      { id: 'overview', label: 'Overview', icon: <Target size={14} />, tooltip: 'Basic facility information and live status' },
                      { id: 'financial', label: 'Financial', icon: <DollarSign size={14} />, tooltip: 'Subsidies, revenue, costs, and customer data' },
                      { id: 'technical', label: 'Technical', icon: <Server size={14} />, tooltip: 'Infrastructure, servers, racks, and equipment' },
                      { id: 'compliance', label: 'Compliance', icon: <FileText size={14} />, tooltip: 'Job creation promises vs. actual performance' },
                      { id: 'workforce', label: 'Workforce', icon: <Users size={14} />, tooltip: 'Employee data, roles, and demographics' },
                      { id: 'timeline', label: 'Timeline', icon: <Calendar size={14} />, tooltip: 'Project milestones and incident history' }
                    ].map(tab => (
                      <Tooltip key={tab.id} text={tab.tooltip}>
                        <button
                          onClick={() => setActiveTab(facility.id, tab.id as TabId)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                            activeTab === tab.id
                              ? 'bg-[#00d2d3] text-black'
                              : 'bg-white/10 text-[#00d2d3] hover:bg-white/20'
                          }`}
                        >
                          {tab.icon}
                          {tab.label}
                        </button>
                      </Tooltip>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-3">
                    {activeTab === 'overview' && (
                      <>
                        {renderExpandableSection(
                          facility.id,
                          'basicInfo',
                          'Basic Information',
                          <Building size={16} />,
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {Object.entries(deepData.overview.basicInfo).map(([key, value]) => (
                              <div key={key}>
                                <div className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                                <div className="text-white font-semibold">
                                  {Array.isArray(value) ? value.join(', ') : 
                                   typeof value === 'object' ? JSON.stringify(value) : 
                                   value}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {renderExpandableSection(
                          facility.id,
                          'liveStatus',
                          'Live Status',
                          <Activity size={16} className="animate-pulse" />,
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-black/50 p-2 rounded border border-[#00d2d3]/20">
                                <div className="text-[10px] text-gray-400">CPU Usage</div>
                                <div className="text-lg font-bold text-[#00d2d3]">
                                  {deepData.overview.liveStatus.cpuUsage.toFixed(1)}%
                                </div>
                                <div className="w-full bg-gray-700 h-1 rounded mt-1">
                                  <div 
                                    className="bg-[#00d2d3] h-1 rounded transition-all duration-500"
                                    style={{ width: `${deepData.overview.liveStatus.cpuUsage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="bg-black/50 p-2 rounded border border-[#ffa502]/20">
                                <div className="text-[10px] text-gray-400">Memory</div>
                                <div className="text-lg font-bold text-[#ffa502]">
                                  {deepData.overview.liveStatus.memoryUsage.toFixed(1)}%
                                </div>
                                <div className="w-full bg-gray-700 h-1 rounded mt-1">
                                  <div 
                                    className="bg-[#ffa502] h-1 rounded transition-all duration-500"
                                    style={{ width: `${deepData.overview.liveStatus.memoryUsage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="bg-black/50 p-2 rounded border border-[#2ed573]/20">
                                <div className="text-[10px] text-gray-400">Storage</div>
                                <div className="text-lg font-bold text-[#2ed573]">
                                  {deepData.overview.liveStatus.storageUsage.toFixed(1)}%
                                </div>
                                <div className="w-full bg-gray-700 h-1 rounded mt-1">
                                  <div 
                                    className="bg-[#2ed573] h-1 rounded transition-all duration-500"
                                    style={{ width: `${deepData.overview.liveStatus.storageUsage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-400">Uptime:</span>
                                <span className="text-white ml-2 font-semibold">{deepData.overview.liveStatus.uptime.toFixed(3)}%</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Active Alerts:</span>
                                <span className="text-white ml-2 font-semibold">{deepData.overview.liveStatus.activeAlerts}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Last Incident:</span>
                                <span className="text-white ml-2 font-semibold">{deepData.overview.liveStatus.lastIncident}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Maintenance:</span>
                                <span className="text-white ml-2 font-semibold">{deepData.overview.liveStatus.maintenanceWindow}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Investigation Templates */}
                        <div className="mt-3">
                          <InvestigationTemplates
                            facility={facility}
                            onResults={(results, template) => {
                              setInvestigationResults({ results, template, facility });
                            }}
                          />
                        </div>
                      </>
                    )}

                    {activeTab === 'financial' && (
                      <>
                        {/* Sub-tabs for Financial */}
                        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto">
                          {[
                            { id: 'subsidies', label: 'Subsidies', icon: <DollarSign size={12} /> },
                            { id: 'transactions', label: 'Transactions', icon: <FileText size={12} /> },
                            { id: 'revenue', label: 'Revenue', icon: <TrendingUp size={12} /> },
                            { id: 'customers', label: 'Customers', icon: <Users size={12} /> },
                            { id: 'costs', label: 'Costs', icon: <TrendingDown size={12} /> },
                            { id: 'roi', label: 'ROI', icon: <BarChart3 size={12} /> }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveSubTab(facility.id, tab.id as SubTabId)}
                              className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap ${
                                activeSubTab === tab.id
                                  ? 'bg-[#00d2d3]/20 text-[#00d2d3] border border-[#00d2d3]'
                                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                              }`}
                            >
                              {tab.icon}
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {activeSubTab === 'subsidies' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'subsidyBreakdown',
                              'Subsidy Breakdown',
                              <DollarSign size={16} />,
                              <div className="space-y-2">
                                <div className="text-2xl font-bold text-[#00d2d3]">
                                  ${(deepData.financial.subsidies.total / 1e6).toFixed(2)}M
                                </div>
                                {deepData.financial.subsidies.breakdown.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                    <div>
                                      <div className="text-xs font-semibold text-white">{item.type}</div>
                                      <div className="text-[10px] text-gray-400">{item.year} • {item.status}</div>
                                    </div>
                                    <div className="text-sm font-bold text-[#00d2d3]">
                                      ${(item.amount / 1e6).toFixed(2)}M
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {renderExpandableSection(
                              facility.id,
                              'subsidyConditions',
                              'Subsidy Conditions',
                              <FileText size={16} />,
                              <div className="space-y-2">
                                {deepData.financial.subsidies.conditions.map((cond, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-xs font-semibold text-white">{cond.condition}</div>
                                      <div className={`text-xs font-bold ${
                                        cond.status === 'On Track' ? 'text-[#2ed573]' :
                                        cond.status === 'Behind' ? 'text-[#ffa502]' :
                                        'text-[#ff4757]'
                                      }`}>
                                        {cond.status}
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mb-1">Progress: {cond.progress}</div>
                                    <div className="w-full bg-gray-700 h-2 rounded">
                                      <div 
                                        className={`h-2 rounded transition-all duration-500 ${
                                          cond.status === 'On Track' ? 'bg-[#2ed573]' :
                                          cond.status === 'Behind' ? 'bg-[#ffa502]' :
                                          'bg-[#ff4757]'
                                        }`}
                                        style={{ width: cond.progress }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {activeSubTab === 'revenue' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'annualRevenue',
                              'Annual Revenue',
                              <TrendingUp size={16} />,
                              <div className="space-y-2">
                                <div className="text-3xl font-bold text-[#2ed573]">
                                  ${(deepData.financial.revenue.annual / 1e6).toFixed(1)}M
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-400">Clients:</span>
                                    <span className="text-white ml-2 font-semibold">{deepData.financial.revenue.clients}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Avg Contract:</span>
                                    <span className="text-white ml-2 font-semibold">
                                      ${(deepData.financial.revenue.contractValue / 1e6).toFixed(1)}M
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {renderExpandableSection(
                              facility.id,
                              'quarterlyRevenue',
                              'Quarterly Performance',
                              <BarChart3 size={16} />,
                              <div className="space-y-1">
                                {deepData.financial.revenue.quarterly.map((q, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 bg-black/50 rounded border border-[#2ed573]/20">
                                    <div className="text-xs text-gray-400">{q.q}</div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-sm font-bold text-white">
                                        ${(q.revenue / 1e6).toFixed(1)}M
                                      </div>
                                      <div className="text-xs font-semibold text-[#2ed573]">{q.growth}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {activeSubTab === 'costs' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'operationalCosts',
                              'Operational Costs Breakdown',
                              <TrendingDown size={16} />,
                              <div className="space-y-1">
                                {Object.entries(deepData.financial.costs.operational).map(([key, value]) => (
                                  <div key={key} className="flex items-center justify-between p-2 bg-black/50 rounded border border-[#ff4757]/20">
                                    <div className="text-xs text-white capitalize">{key}</div>
                                    <div className="text-sm font-bold text-[#ff4757]">
                                      ${(value / 1e6).toFixed(2)}M
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {renderExpandableSection(
                              facility.id,
                              'monthlyTrends',
                              'Monthly Cost Trends',
                              <BarChart3 size={16} />,
                              <div className="space-y-1">
                                {deepData.financial.costs.breakdown.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 bg-black/50 rounded border border-[#ffa502]/20">
                                    <div>
                                      <div className="text-xs font-semibold text-white">{item.category}</div>
                                      <div className="text-[10px] text-gray-400">Monthly average</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-bold text-white">
                                        ${(item.monthly / 1e6).toFixed(2)}M
                                      </div>
                                      {item.trend === 'up' && <TrendingUp size={12} className="text-[#ff4757]" />}
                                      {item.trend === 'down' && <TrendingDown size={12} className="text-[#2ed573]" />}
                                      {item.trend === 'stable' && <div className="w-3 h-0.5 bg-gray-400" />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {activeSubTab === 'transactions' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'subsidyTransactions',
                              `Transaction History (${deepData.subsidyTransactions.length} transactions)`,
                              <FileText size={16} />,
                              <div className="space-y-1 max-h-96 overflow-y-auto">
                                {deepData.subsidyTransactions.map((txn, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <div>
                                        <div className="text-xs font-semibold text-white">{txn.id}</div>
                                        <div className="text-[10px] text-gray-400">{txn.date}</div>
                                      </div>
                                      <div className={`text-xs px-2 py-0.5 rounded ${
                                        txn.status === 'Received' ? 'bg-[#2ed573]/20 text-[#2ed573]' :
                                        txn.status === 'Pending' ? 'bg-[#ffa502]/20 text-[#ffa502]' :
                                        'bg-gray-500/20 text-gray-400'
                                      }`}>
                                        {txn.status}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] mb-1">
                                      <div>
                                        <span className="text-gray-400">Type:</span>
                                        <span className="text-white ml-1">{txn.type}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Amount:</span>
                                        <span className="text-[#00d2d3] ml-1 font-bold">
                                          ${(txn.amount / 1000).toFixed(1)}K
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Grantor:</span>
                                        <span className="text-white ml-1">{txn.grantor}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Clause:</span>
                                        <span className="text-white ml-1">{txn.contractClause}</span>
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 italic">
                                      Condition: {txn.conditions}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {activeSubTab === 'customers' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'customerList',
                              `Customer Base (${deepData.customers.length} customers)`,
                              <Users size={16} />,
                              <div className="space-y-1 max-h-96 overflow-y-auto">
                                {deepData.customers.map((cust, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded border border-[#2ed573]/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <div>
                                        <div className="text-xs font-semibold text-white">{cust.id} - {cust.name}</div>
                                        <div className="text-[10px] text-gray-400">{cust.type}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs font-bold text-[#2ed573]">
                                          ${(cust.monthlyRevenue / 1000).toFixed(1)}K/mo
                                        </div>
                                        <div className="text-[10px] text-gray-400">SLA: {cust.sla}%</div>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                                      <div>
                                        <span className="text-gray-400">Racks:</span>
                                        <span className="text-white ml-1">{cust.rackCount}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Power:</span>
                                        <span className="text-white ml-1">{cust.powerAllocation}kW</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Bandwidth:</span>
                                        <span className="text-white ml-1">{cust.bandwidth}</span>
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">
                                      Contract: {cust.contractStart} → {cust.contractEnd}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {activeTab === 'technical' && (
                      <>
                        {/* Sub-tabs for Technical */}
                        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto">
                          {[
                            { id: 'infrastructure', label: 'Infrastructure', icon: <Building size={12} /> },
                            { id: 'racks', label: 'Racks', icon: <Box size={12} /> },
                            { id: 'servers', label: 'Servers', icon: <Server size={12} /> },
                            { id: 'components', label: 'Components', icon: <Cpu size={12} /> },
                            { id: 'capacity', label: 'Capacity', icon: <Database size={12} /> },
                            { id: 'network', label: 'Network', icon: <Wifi size={12} /> },
                            { id: 'environment', label: 'Environment', icon: <Activity size={12} /> }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveSubTab(facility.id, tab.id as SubTabId)}
                              className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap ${
                                activeSubTab === tab.id
                                  ? 'bg-[#00d2d3]/20 text-[#00d2d3] border border-[#00d2d3]'
                                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                              }`}
                            >
                              {tab.icon}
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {activeSubTab === 'infrastructure' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'infraOverview',
                              'Infrastructure Overview',
                              <Server size={16} />,
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(deepData.technical.infrastructure).map(([key, value]) => (
                                  <div key={key} className="p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                    <div className="text-gray-400 capitalize text-[10px]">
                                      {key.replace(/([A-Z])/g, ' $1')}
                                    </div>
                                    <div className="text-white font-bold">{value}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {activeSubTab === 'capacity' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'computeCapacity',
                              'Compute Capacity',
                              <Cpu size={16} />,
                              <div className="space-y-2">
                                {Object.entries(deepData.technical.capacity.compute).map(([key, value]) => (
                                  <div key={key} className="flex items-center justify-between p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                    <div className="text-xs text-gray-400 capitalize">{key}</div>
                                    <div className="text-sm font-bold text-[#00d2d3]">{value.toLocaleString()}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {renderExpandableSection(
                              facility.id,
                              'storageCapacity',
                              'Storage Capacity',
                              <HardDrive size={16} />,
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(deepData.technical.capacity.storage).map(([key, value]) => (
                                  <div key={key} className="p-2 bg-black/50 rounded border border-[#ffa502]/20">
                                    <div className="text-gray-400 capitalize text-[10px]">{key}</div>
                                    <div className="text-white font-bold">{value}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {renderExpandableSection(
                              facility.id,
                              'networkCapacity',
                              'Network Capacity',
                              <Wifi size={16} />,
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(deepData.technical.capacity.network).map(([key, value]) => (
                                  <div key={key} className="p-2 bg-black/50 rounded border border-[#2ed573]/20">
                                    <div className="text-gray-400 capitalize text-[10px]">
                                      {key.replace(/([A-Z])/g, ' $1')}
                                    </div>
                                    <div className="text-white font-bold">
                                      {typeof value === 'number' ? value.toFixed(2) : value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {activeSubTab === 'network' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'realtimeMetrics',
                              'Real-Time Metrics',
                              <Activity size={16} className="animate-pulse text-[#00d2d3]" />,
                              <div className="grid grid-cols-3 gap-2">
                                {Object.entries(deepData.technical.realtime).slice(0, 12).map(([key, value]) => (
                                  <div key={key} className="p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                    <div className="text-[10px] text-gray-400 capitalize">
                                      {key.replace(/([A-Z])/g, ' $1')}
                                    </div>
                                    <div className="text-sm font-bold text-[#00d2d3]">
                                      {typeof value === 'number' ? value.toFixed(1) : value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {activeSubTab === 'racks' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'racksList',
                              `Rack Inventory (${deepData.racks.length} racks)`,
                              <Box size={16} />,
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {deepData.racks.map((rack, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-xs font-semibold text-white">Rack {rack.id} - {rack.location}</div>
                                      <div className="text-[10px] text-gray-400">{rack.servers.length} servers</div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[10px]">
                                      <div>
                                        <span className="text-gray-400">Capacity:</span>
                                        <span className="text-white ml-1">{rack.capacity}U</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Used:</span>
                                        <span className="text-white ml-1">{rack.used}U</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Power:</span>
                                        <span className="text-white ml-1">{rack.powerDraw}kW</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Temp:</span>
                                        <span className="text-white ml-1">{rack.temperature.toFixed(1)}°C</span>
                                      </div>
                                    </div>
                                    <div className="mt-1">
                                      <div className="w-full bg-gray-700 h-1.5 rounded">
                                        <div 
                                          className="bg-[#00d2d3] h-1.5 rounded transition-all"
                                          style={{ width: `${(rack.used / rack.capacity) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {activeSubTab === 'servers' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'serversList',
                              `Server Inventory (${deepData.racks.reduce((sum, r) => sum + r.servers.length, 0)} servers)`,
                              <Server size={16} />,
                              <div className="space-y-1 max-h-96 overflow-y-auto">
                                {deepData.racks.slice(0, 10).flatMap(rack => rack.servers).map((server, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <div>
                                        <div className="text-xs font-semibold text-white">{server.id}</div>
                                        <div className="text-[10px] text-gray-400">{server.hostname}</div>
                                      </div>
                                      <div className="text-[10px] px-2 py-0.5 rounded bg-[#00d2d3]/20 text-[#00d2d3]">
                                        {server.type}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 text-[10px] mb-1">
                                      <div>
                                        <span className="text-gray-400">CPU:</span>
                                        <span className="text-white ml-1">{server.cpuUsage.toFixed(1)}%</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">RAM:</span>
                                        <span className="text-white ml-1">{server.memUsage.toFixed(1)}%</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Cores:</span>
                                        <span className="text-white ml-1">{server.cores}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Memory:</span>
                                        <span className="text-white ml-1">{server.ram}GB</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Storage:</span>
                                        <span className="text-white ml-1">{server.storage}</span>
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400">
                                      {server.cpu} • {server.os} • Uptime: {server.uptime}d
                                    </div>
                                  </div>
                                ))}
                                {deepData.racks.reduce((sum, r) => sum + r.servers.length, 0) > deepData.racks.slice(0, 10).flatMap(r => r.servers).length && (
                                  <div className="text-center text-xs text-gray-400 py-2">
                                    + {deepData.racks.reduce((sum, r) => sum + r.servers.length, 0) - deepData.racks.slice(0, 10).flatMap(r => r.servers).length} more servers
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {activeSubTab === 'components' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'upsSystems',
                              `UPS Systems (${deepData.infrastructureComponents.ups.length})`,
                              <Zap size={16} />,
                              <div className="space-y-1">
                                {deepData.infrastructureComponents.ups.map((ups, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded border border-[#ffa502]/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-xs font-semibold text-white">{ups.id} - {ups.manufacturer}</div>
                                      <div className="text-[10px] text-white">{ups.capacity}</div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                                      <div>
                                        <span className="text-gray-400">Battery:</span>
                                        <span className={`ml-1 ${ups.batteryHealth > 80 ? 'text-[#2ed573]' : 'text-[#ffa502]'}`}>
                                          {ups.batteryHealth.toFixed(0)}%
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Load:</span>
                                        <span className="text-white ml-1">{ups.load.toFixed(0)}%</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Next Service:</span>
                                        <span className="text-white ml-1">{ups.nextService}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {renderExpandableSection(
                              facility.id,
                              'generators',
                              `Backup Generators (${deepData.infrastructureComponents.generators.length})`,
                              <Zap size={16} />,
                              <div className="space-y-1">
                                {deepData.infrastructureComponents.generators.map((gen, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded border border-[#ff4757]/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-xs font-semibold text-white">{gen.id} - {gen.type}</div>
                                      <div className="text-[10px] text-white">{gen.capacity}</div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                                      <div>
                                        <span className="text-gray-400">Fuel:</span>
                                        <span className="text-white ml-1">{gen.fuelLevel.toFixed(0)}%</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Runtime:</span>
                                        <span className="text-white ml-1">{gen.runtime}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Status:</span>
                                        <span className={`ml-1 ${gen.testResult === 'Pass' ? 'text-[#2ed573]' : 'text-[#ffa502]'}`}>
                                          {gen.testResult}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {renderExpandableSection(
                              facility.id,
                              'coolingUnits',
                              `Cooling Units (${deepData.infrastructureComponents.coolingUnits.length})`,
                              <Activity size={16} />,
                              <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
                                {deepData.infrastructureComponents.coolingUnits.map((unit, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                    <div className="text-xs font-semibold text-white mb-1">{unit.id}</div>
                                    <div className="text-[10px] space-y-0.5">
                                      <div><span className="text-gray-400">Type:</span> <span className="text-white">{unit.type}</span></div>
                                      <div><span className="text-gray-400">Load:</span> <span className="text-white">{unit.load.toFixed(0)}%</span></div>
                                      <div><span className="text-gray-400">Supply:</span> <span className="text-white">{unit.supplyTemp.toFixed(1)}°C</span></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {renderExpandableSection(
                              facility.id,
                              'networkSwitches',
                              `Network Switches (${deepData.infrastructureComponents.networkSwitches.length})`,
                              <Wifi size={16} />,
                              <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
                                {deepData.infrastructureComponents.networkSwitches.slice(0, 20).map((sw, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded border border-[#2ed573]/20">
                                    <div className="text-xs font-semibold text-white mb-1">{sw.id}</div>
                                    <div className="text-[10px] space-y-0.5">
                                      <div><span className="text-gray-400">Model:</span> <span className="text-white">{sw.model}</span></div>
                                      <div><span className="text-gray-400">Ports:</span> <span className="text-white">{sw.portsUsed}/{sw.ports}</span></div>
                                      <div><span className="text-gray-400">Traffic:</span> <span className="text-white">{sw.throughput}Mbps</span></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {activeSubTab === 'environment' && (
                          <>
                            {renderExpandableSection(
                              facility.id,
                              'environmentalZones',
                              `Environmental Monitoring (${deepData.environmentalZones.length} zones)`,
                              <Activity size={16} />,
                              <div className="space-y-1">
                                {deepData.environmentalZones.map((zone, i) => (
                                  <div key={i} className="p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                    <div className="text-xs font-semibold text-white mb-1">{zone.zone}</div>
                                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                                      <div>
                                        <span className="text-gray-400">Temp:</span>
                                        <span className="text-white ml-1">{zone.temperature.toFixed(1)}°C</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Humidity:</span>
                                        <span className="text-white ml-1">{zone.humidity.toFixed(0)}%</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Airflow:</span>
                                        <span className="text-white ml-1">{zone.airflow}CFM</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Pressure:</span>
                                        <span className="text-white ml-1">{zone.pressureDiff}"</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Particles:</span>
                                        <span className="text-white ml-1">{zone.particleCount}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">CO₂:</span>
                                        <span className="text-white ml-1">{zone.co2Level}ppm</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {activeTab === 'compliance' && (
                      <>
                        {renderExpandableSection(
                          facility.id,
                          'complianceScore',
                          'Compliance Score',
                          <Target size={16} />,
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-3xl font-bold text-[#00d2d3]">
                                {deepData.compliance.score.toFixed(1)}
                              </div>
                              <div className={`px-3 py-1 rounded text-sm font-bold ${
                                deepData.compliance.status === 'Compliant' ? 'bg-[#2ed573]/20 text-[#2ed573]' :
                                deepData.compliance.status === 'At Risk' ? 'bg-[#ffa502]/20 text-[#ffa502]' :
                                'bg-[#ff4757]/20 text-[#ff4757]'
                              }`}>
                                {deepData.compliance.status}
                              </div>
                            </div>
                            <div className="w-full bg-gray-700 h-3 rounded">
                              <div 
                                className={`h-3 rounded transition-all duration-500 ${
                                  deepData.compliance.score >= 80 ? 'bg-[#2ed573]' :
                                  deepData.compliance.score >= 60 ? 'bg-[#ffa502]' :
                                  'bg-[#ff4757]'
                                }`}
                                style={{ width: `${deepData.compliance.score}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {renderExpandableSection(
                          facility.id,
                          'complianceHistory',
                          'Compliance History',
                          <Calendar size={16} />,
                          <div className="space-y-1">
                            {deepData.compliance.history.map((item, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                <div className="text-xs text-gray-400">{item.date}</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs font-semibold text-white">{item.score}</div>
                                  <div className={`text-[10px] px-2 py-0.5 rounded ${
                                    item.status === 'Compliant' ? 'bg-[#2ed573]/20 text-[#2ed573]' :
                                    item.status === 'At Risk' ? 'bg-[#ffa502]/20 text-[#ffa502]' :
                                    'bg-[#ff4757]/20 text-[#ff4757]'
                                  }`}>
                                    {item.status}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {renderExpandableSection(
                          facility.id,
                          'violations',
                          'Violations & Penalties',
                          <AlertCircle size={16} />,
                          <div className="space-y-2">
                            {deepData.compliance.violations.map((viol, i) => (
                              <div key={i} className="p-2 bg-black/50 rounded border border-[#ff4757]/20">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-xs font-semibold text-white">{viol.type}</div>
                                  <div className={`text-[10px] px-2 py-0.5 rounded ${
                                    viol.severity === 'High' ? 'bg-[#ff4757]/20 text-[#ff4757]' :
                                    'bg-[#ffa502]/20 text-[#ffa502]'
                                  }`}>
                                    {viol.severity}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <div className="text-gray-400">{viol.date}</div>
                                  <div className="text-[#ff4757] font-bold">
                                    Fine: ${(viol.fine / 1e6).toFixed(2)}M
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {renderExpandableSection(
                          facility.id,
                          'audits',
                          'Audit History',
                          <FileText size={16} />,
                          <div className="space-y-1">
                            {deepData.compliance.audits.map((audit, i) => (
                              <div key={i} className="p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-xs font-semibold text-white">{audit.type}</div>
                                    <div className="text-[10px] text-gray-400">{audit.date} • {audit.auditor}</div>
                                  </div>
                                  <div className={`text-xs px-2 py-0.5 rounded ${
                                    audit.result === 'Pass' ? 'bg-[#2ed573]/20 text-[#2ed573]' :
                                    audit.result === 'Pass with Warnings' ? 'bg-[#ffa502]/20 text-[#ffa502]' :
                                    'bg-[#ff4757]/20 text-[#ff4757]'
                                  }`}>
                                    {audit.result}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === 'workforce' && (
                      <>
                        {renderExpandableSection(
                          facility.id,
                          'jobMetrics',
                          'Job Creation Metrics',
                          <Users size={16} />,
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-3 bg-black/50 rounded border border-[#00d2d3]/20">
                                <div className="text-[10px] text-gray-400">Current</div>
                                <div className="text-2xl font-bold text-[#00d2d3]">
                                  {deepData.workforce.current.total}
                                </div>
                              </div>
                              <div className="p-3 bg-black/50 rounded border border-[#ffa502]/20">
                                <div className="text-[10px] text-gray-400">Promised</div>
                                <div className="text-2xl font-bold text-[#ffa502]">
                                  {deepData.workforce.current.promised}
                                </div>
                              </div>
                              <div className="p-3 bg-black/50 rounded border border-[#ff4757]/20">
                                <div className="text-[10px] text-gray-400">Shortfall</div>
                                <div className="text-2xl font-bold text-[#ff4757]">
                                  {deepData.workforce.current.shortfall}
                                </div>
                              </div>
                              <div className="p-3 bg-black/50 rounded border border-[#2ed573]/20">
                                <div className="text-[10px] text-gray-400">Fulfillment</div>
                                <div className="text-2xl font-bold text-[#2ed573]">
                                  {deepData.workforce.current.fulfillment}%
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {renderExpandableSection(
                          facility.id,
                          'jobBreakdown',
                          'Job Breakdown by Role',
                          <Layers size={16} />,
                          <div className="space-y-1">
                            {deepData.workforce.breakdown.map((role, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                <div>
                                  <div className="text-xs font-semibold text-white">{role.role}</div>
                                  <div className="text-[10px] text-gray-400">Avg: {role.avg_salary}</div>
                                </div>
                                <div className="text-sm font-bold text-[#00d2d3]">{role.count}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {renderExpandableSection(
                          facility.id,
                          'demographics',
                          'Workforce Demographics',
                          <BarChart3 size={16} />,
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(deepData.workforce.demographics).map(([key, value]) => (
                              <div key={key} className="p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                <div className="text-gray-400 capitalize text-[10px]">
                                  {key.replace(/([A-Z])/g, ' $1')}
                                </div>
                                <div className="text-white font-bold">{value}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {renderExpandableSection(
                          facility.id,
                          'training',
                          'Training Programs',
                          <Package size={16} />,
                          <div className="space-y-1">
                            {deepData.workforce.training.map((prog, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-black/50 rounded border border-[#2ed573]/20">
                                <div className="text-xs text-white">{prog.program}</div>
                                <div className="text-sm font-bold text-[#2ed573]">
                                  {prog.participants} enrolled
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {renderExpandableSection(
                          facility.id,
                          'employeeList',
                          `Employee Records (${deepData.employees.length} employees)`,
                          <Users size={16} />,
                          <div className="space-y-1 max-h-96 overflow-y-auto">
                            {deepData.employees.slice(0, 50).map((emp, i) => (
                              <div 
                                key={i} 
                                className="p-2 bg-black/50 rounded border border-[#00d2d3]/20 cursor-pointer hover:bg-[#00d2d3]/10 hover:border-[#00d2d3]/40 transition-all"
                                onClick={() => setSelectedEmployee(emp)}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div>
                                    <div className="text-xs font-semibold text-white">{emp.id}</div>
                                    <div className="text-[10px] text-gray-400">{emp.level} {emp.role}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-bold text-[#2ed573]">
                                      ${(emp.salary / 1000).toFixed(0)}K
                                    </div>
                                    <div className="text-[10px] text-gray-400">Score: {emp.performanceScore.toFixed(0)}</div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-[10px]">
                                  <div>
                                    <span className="text-gray-400">Started:</span>
                                    <span className="text-white ml-1">{emp.startDate}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Shift:</span>
                                    <span className="text-white ml-1">{emp.shiftSchedule}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Local:</span>
                                    <span className={emp.localResident ? 'text-[#2ed573] ml-1' : 'text-[#ff4757] ml-1'}>
                                      {emp.localResident ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Certs:</span>
                                    <span className="text-white ml-1">{emp.certifications}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {deepData.employees.length > 50 && (
                              <div className="text-center text-xs text-gray-400 py-2">
                                + {deepData.employees.length - 50} more employees
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === 'timeline' && (
                      <>
                        {renderExpandableSection(
                          facility.id,
                          'milestones',
                          'Project Milestones',
                          <Calendar size={16} />,
                          <div className="space-y-2">
                            {deepData.timeline.milestones.map((milestone, i) => (
                              <div key={i} className="flex items-start gap-3 p-2 bg-black/50 rounded border border-[#00d2d3]/20">
                                <div className={`w-3 h-3 rounded-full mt-1 ${
                                  milestone.status === 'Complete' ? 'bg-[#2ed573]' :
                                  milestone.status === 'In Progress' ? 'bg-[#ffa502]' :
                                  'bg-gray-500'
                                }`} />
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-white">{milestone.event}</div>
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="text-[10px] text-gray-400">{milestone.date}</div>
                                    <div className={`text-[10px] px-2 py-0.5 rounded ${
                                      milestone.status === 'Complete' ? 'bg-[#2ed573]/20 text-[#2ed573]' :
                                      milestone.status === 'In Progress' ? 'bg-[#ffa502]/20 text-[#ffa502]' :
                                      'bg-gray-500/20 text-gray-400'
                                    }`}>
                                      {milestone.status}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {renderExpandableSection(
                          facility.id,
                          'incidents',
                          'Incident History',
                          <AlertCircle size={16} />,
                          <div className="space-y-1">
                            {deepData.timeline.incidents.map((incident, i) => (
                              <div key={i} className="p-2 bg-black/50 rounded border border-[#ff4757]/20">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-xs font-semibold text-white">{incident.type}</div>
                                  <div className={`text-[10px] px-2 py-0.5 rounded ${
                                    incident.impact === 'High' ? 'bg-[#ff4757]/20 text-[#ff4757]' :
                                    incident.impact === 'Medium' ? 'bg-[#ffa502]/20 text-[#ffa502]' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {incident.impact} Impact
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <div className="text-gray-400">{incident.date}</div>
                                  <div className="text-gray-400">Duration: {incident.duration}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {renderExpandableSection(
                          facility.id,
                          'granularIncidentLog',
                          `Detailed Incident Log (${deepData.incidentLog.length} incidents)`,
                          <Activity size={16} />,
                          <div className="space-y-1 max-h-96 overflow-y-auto">
                            {deepData.incidentLog.map((inc, i) => (
                              <div key={i} className="p-2 bg-black/50 rounded border border-[#ff4757]/20">
                                <div className="flex items-center justify-between mb-1">
                                  <div>
                                    <div className="text-xs font-semibold text-white">{inc.id}</div>
                                    <div className="text-[10px] text-gray-400">
                                      {new Date(inc.timestamp).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className={`text-[10px] px-2 py-0.5 rounded ${
                                    inc.severity === 'Critical' ? 'bg-[#ff4757]/20 text-[#ff4757]' :
                                    inc.severity === 'High' ? 'bg-[#ffa502]/20 text-[#ffa502]' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {inc.severity}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] mb-1">
                                  <div>
                                    <span className="text-gray-400">Type:</span>
                                    <span className="text-white ml-1">{inc.type}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Status:</span>
                                    <span className={`ml-1 ${
                                      inc.status === 'Resolved' ? 'text-[#2ed573]' : 'text-[#ffa502]'
                                    }`}>
                                      {inc.status}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Affected:</span>
                                    <span className="text-white ml-1">{inc.affectedSystems} systems</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Response:</span>
                                    <span className="text-white ml-1">{inc.responseTime}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Resolution:</span>
                                    <span className="text-white ml-1">{inc.resolutionTime}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Assigned:</span>
                                    <span className="text-white ml-1">{inc.assignedTo}</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-gray-400 italic">
                                  Root cause: {inc.rootCause}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}


                        {renderExpandableSection(
                          facility.id,
                          'expansions',
                          'Expansion History',
                          <TrendingUp size={16} />,
                          <div className="space-y-1">
                            {deepData.timeline.expansions.map((exp, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-black/50 rounded border border-[#2ed573]/20">
                                <div>
                                  <div className="text-xs font-semibold text-white">Phase {i + 1}</div>
                                  <div className="text-[10px] text-gray-400">{exp.year}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-[#2ed573]">{exp.investment}</div>
                                  <div className="text-[10px] text-gray-400">{exp.capacity}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Infinite scroll loader */}
        {visibleCount < facilities.length && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Activity size={16} className="inline animate-spin mr-2" />
            Loading more... ({visibleCount} of {facilities.length})
          </div>
        )}

        {visibleCount >= facilities.length && facilities.length > 50 && (
          <div className="text-center py-8 text-[#00d2d3] text-sm font-semibold">
            ✓ All {facilities.length} facilities loaded
          </div>
        )}
      </div>

      {/* Investigation Results Modal */}
      {investigationResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            <InvestigationResults
              results={investigationResults.results}
              template={investigationResults.template}
              facility={investigationResults.facility}
              onClose={() => setInvestigationResults(null)}
              onFacilityClick={(facility) => {
                // Expand the clicked facility
                setExpandedState(prev => ({
                  ...prev,
                  [facility.id]: {
                    expanded: true,
                    activeTab: 'overview',
                    activeSubTab: 'subsidies',
                    expandedSections: {}
                  }
                }));
                // Close the modal
                setInvestigationResults(null);
                // Scroll to the facility
                setTimeout(() => {
                  const element = document.getElementById(`facility-${facility.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 100);
              }}
            />
          </div>
        </div>
      )}
      
      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
};

