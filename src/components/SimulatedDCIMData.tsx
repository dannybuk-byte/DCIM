/**
 * SimulatedDCIMData.tsx
 * 
 * Generates realistic simulated DCIM/DMaaS data to show users exactly
 * what vendors can see. This helps prep counter-responses and fix vulnerabilities.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap, Thermometer, Network, Shield, Server, HardDrive,
  Activity, Users, DollarSign, Clock, AlertTriangle, Eye,
  RefreshCw, Download, ChevronDown, ChevronUp, Cpu, Database,
  BarChart3, TrendingUp, TrendingDown, Wifi, Lock, Calendar,
  Building, MapPin, Globe
} from 'lucide-react';

// Generate realistic random data
const generatePowerData = () => {
  const now = new Date();
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now);
    hour.setHours(now.getHours() - 23 + i);
    const baseLoad = 850 + Math.random() * 200;
    const businessHours = hour.getHours() >= 9 && hour.getHours() <= 18;
    const load = businessHours ? baseLoad * 1.3 : baseLoad * 0.85;
    return {
      time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      kW: Math.round(load),
      pf: (0.92 + Math.random() * 0.06).toFixed(2),
      upsLoad: Math.round(45 + Math.random() * 30),
    };
  });
  return hours;
};

const generateThermalData = () => {
  return Array.from({ length: 12 }, (_, i) => ({
    rack: `R${String(i + 1).padStart(2, '0')}`,
    inlet: Math.round(18 + Math.random() * 4),
    outlet: Math.round(28 + Math.random() * 8),
    delta: Math.round(10 + Math.random() * 8),
    hotspot: Math.random() > 0.8,
    density: ['Low', 'Medium', 'High', 'Ultra-High'][Math.floor(Math.random() * 4)],
  }));
};

const generateNetworkData = () => {
  const protocols = ['HTTPS', 'HTTP', 'SQL', 'SSH', 'API', 'gRPC', 'WebSocket'];
  const destinations = ['AWS', 'Azure', 'GCP', 'Cloudflare', 'Akamai', 'Internal', 'Customer'];
  return {
    bandwidth: {
      ingress: Math.round(2.4 + Math.random() * 1.5),
      egress: Math.round(8.2 + Math.random() * 3),
      peak: Math.round(12 + Math.random() * 5),
    },
    protocols: protocols.map(p => ({
      name: p,
      percentage: Math.round(Math.random() * 30 + 5),
      gbps: (Math.random() * 2).toFixed(2),
    })),
    topDestinations: destinations.map(d => ({
      name: d,
      traffic: (Math.random() * 500 + 100).toFixed(0),
      connections: Math.round(Math.random() * 10000 + 1000),
    })),
    patterns: {
      peakHour: '14:00-15:00',
      quietHour: '03:00-04:00',
      weekendDrop: '42%',
      monthlyGrowth: '+8.3%',
    }
  };
};

const generateAccessData = () => {
  const names = ['John D.', 'Sarah M.', 'Mike R.', 'Emily K.', 'Alex T.', 'Contractor #1', 'Contractor #2', 'Vendor Tech'];
  const areas = ['Server Hall A', 'Server Hall B', 'Network Room', 'Power Room', 'Security Office', 'Loading Dock'];
  const now = new Date();
  return Array.from({ length: 20 }, (_, i) => {
    const time = new Date(now);
    time.setMinutes(now.getMinutes() - Math.random() * 480);
    return {
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      name: names[Math.floor(Math.random() * names.length)],
      area: areas[Math.floor(Math.random() * areas.length)],
      type: Math.random() > 0.7 ? 'Contractor' : 'Employee',
      duration: Math.round(Math.random() * 120 + 5) + ' min',
      afterHours: Math.random() > 0.85,
    };
  }).sort((a, b) => b.time.localeCompare(a.time));
};

const generateAssetData = () => {
  const vendors = ['Dell', 'HPE', 'Lenovo', 'Cisco', 'Juniper', 'NetApp', 'Pure'];
  const types = ['Server', 'Switch', 'Router', 'Storage', 'UPS', 'PDU'];
  return {
    summary: {
      totalAssets: 847,
      avgAge: 2.8,
      warrantyExpiring: 23,
      refreshDue: 156,
    },
    byVendor: vendors.map(v => ({
      name: v,
      count: Math.round(Math.random() * 200 + 50),
      spend: '$' + (Math.random() * 2 + 0.5).toFixed(1) + 'M',
    })),
    byType: types.map(t => ({
      type: t,
      count: Math.round(Math.random() * 150 + 20),
      utilization: Math.round(Math.random() * 40 + 50) + '%',
    })),
    recentPurchases: [
      { item: 'Dell R750xs (x24)', date: '2 weeks ago', cost: '$480K' },
      { item: 'Cisco Nexus 9300', date: '1 month ago', cost: '$125K' },
      { item: 'NetApp AFF A400', date: '6 weeks ago', cost: '$890K' },
    ],
  };
};

const generateCapacityData = () => ({
  power: { used: 2.4, total: 4.0, trend: '+5.2%/mo' },
  cooling: { used: 85, total: 120, trend: '+3.1%/mo' },
  space: { used: 312, total: 400, trend: '+2.8%/mo' },
  network: { used: 78, total: 100, trend: '+8.5%/mo' },
  predictions: {
    powerExhaustion: '14 months',
    coolingExhaustion: '18 months',
    spaceExhaustion: '22 months',
    recommendedAction: 'Begin capacity planning Q3 2026',
  },
});

const generateComputeData = () => ({
  clusters: [
    { name: 'Production', cpu: 72, memory: 68, vms: 245, trend: 'stable' },
    { name: 'AI/ML Training', cpu: 94, memory: 87, vms: 12, trend: 'growing' },
    { name: 'Development', cpu: 34, memory: 42, vms: 89, trend: 'stable' },
    { name: 'DR/Backup', cpu: 8, memory: 15, vms: 245, trend: 'stable' },
  ],
  workloadSignatures: [
    { type: 'Database', pattern: 'High I/O, consistent CPU', percentage: 35 },
    { type: 'AI/ML', pattern: 'GPU bursts, high memory', percentage: 22 },
    { type: 'Web Serving', pattern: 'Network heavy, low CPU', percentage: 28 },
    { type: 'Batch Processing', pattern: 'Scheduled peaks', percentage: 15 },
  ],
  anomalies: [
    { time: '14:23', event: 'Unusual GPU activity spike', severity: 'medium' },
    { time: '03:45', event: 'After-hours batch job', severity: 'low' },
  ],
});

const generateFinancialSignals = () => ({
  patterns: [
    { signal: 'End-of-quarter spending spike', implication: 'Fiscal year ends March', confidence: 92 },
    { signal: 'Delayed hardware refresh', implication: 'Budget constraints or M&A', confidence: 78 },
    { signal: 'Multi-year contract signed', implication: 'Long-term commitment, stable', confidence: 95 },
    { signal: 'Spot capacity usage up 40%', implication: 'Unexpected growth or poor planning', confidence: 85 },
  ],
  costPerUnit: {
    perRack: '$8,450/mo',
    perKW: '$125/mo',
    perGbps: '$450/mo',
  },
  trends: {
    infrastructureSpend: '+12% YoY',
    efficiencyImprovement: '-8% cost/workload',
    cloudMigration: '23% hybrid',
  },
});

const generateIncidentData = () => ({
  recent: [
    { time: '2 hours ago', type: 'Network', desc: 'BGP flap on upstream', severity: 'P2', mttr: '12 min' },
    { time: '1 day ago', type: 'Power', desc: 'UPS transfer test', severity: 'P4', mttr: 'Planned' },
    { time: '3 days ago', type: 'Cooling', desc: 'CRAH unit fault', severity: 'P3', mttr: '45 min' },
    { time: '1 week ago', type: 'Security', desc: 'Failed access attempt', severity: 'P3', mttr: '5 min' },
  ],
  metrics: {
    mttr: '23 min',
    mttd: '4 min',
    incidentsThisMonth: 12,
    slaBreaches: 0,
  },
  patterns: {
    peakIncidentTime: 'Tuesdays 10-11 AM',
    commonCause: 'Network (45%)',
    correlatedWith: 'Deployment windows',
  },
});

interface SimulatedDataProps {
  onClose?: () => void;
}

export const SimulatedDCIMData: React.FC<SimulatedDataProps> = () => {
  const [activeCategory, setActiveCategory] = useState<string>('power');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all']));

  // Generate all data
  const [data, setData] = useState(() => ({
    power: generatePowerData(),
    thermal: generateThermalData(),
    network: generateNetworkData(),
    access: generateAccessData(),
    assets: generateAssetData(),
    capacity: generateCapacityData(),
    compute: generateComputeData(),
    financial: generateFinancialSignals(),
    incidents: generateIncidentData(),
  }));

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setData({
        power: generatePowerData(),
        thermal: generateThermalData(),
        network: generateNetworkData(),
        access: generateAccessData(),
        assets: generateAssetData(),
        capacity: generateCapacityData(),
        compute: generateComputeData(),
        financial: generateFinancialSignals(),
        incidents: generateIncidentData(),
      });
      setLastRefresh(new Date());
      setIsRefreshing(false);
    }, 500);
  };

  const categories = [
    { id: 'power', label: '⚡ Power', icon: Zap, color: 'yellow' },
    { id: 'thermal', label: '🌡️ Thermal', icon: Thermometer, color: 'red' },
    { id: 'network', label: '🌐 Network', icon: Network, color: 'blue' },
    { id: 'access', label: '🔐 Access', icon: Lock, color: 'purple' },
    { id: 'assets', label: '📦 Assets', icon: Server, color: 'green' },
    { id: 'capacity', label: '📈 Capacity', icon: BarChart3, color: 'indigo' },
    { id: 'compute', label: '💻 Compute', icon: Cpu, color: 'cyan' },
    { id: 'financial', label: '💰 Financial', icon: DollarSign, color: 'emerald' },
    { id: 'incidents', label: '🚨 Incidents', icon: AlertTriangle, color: 'orange' },
  ];

  const toggleSection = (id: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSections(newSet);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Eye size={28} />
              <h1 className="text-2xl font-bold">🔴 LIVE DCIM/DMaaS Data View</h1>
            </div>
            <p className="text-white/80">
              This is what vendors SEE about your operations. Use this to identify vulnerabilities and prep counter-responses.
            </p>
          </div>
          <div className="text-right">
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh Data
            </button>
            <div className="text-xs text-white/60 mt-2">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeCategory === cat.id
                ? `bg-${cat.color}-100 text-${cat.color}-800 border-2 border-${cat.color}-400`
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <cat.icon size={16} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Data Display */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white font-mono text-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-400">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span>LIVE FEED - {categories.find(c => c.id === activeCategory)?.label} Telemetry</span>
        </div>

        {/* POWER DATA */}
        {activeCategory === 'power' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-yellow-400 font-bold mb-3">📊 24-Hour Power Consumption</h3>
              <div className="grid grid-cols-6 gap-2 text-xs">
                <div className="text-slate-500">TIME</div>
                <div className="text-slate-500">kW</div>
                <div className="text-slate-500">PF</div>
                <div className="text-slate-500">UPS %</div>
                <div className="text-slate-500">PATTERN</div>
                <div className="text-slate-500">INFERENCE</div>
                {data.power.slice(-12).map((row, i) => (
                  <React.Fragment key={i}>
                    <div className="text-slate-300">{row.time}</div>
                    <div className={row.kW > 1000 ? 'text-red-400' : 'text-green-400'}>{row.kW}</div>
                    <div className="text-slate-300">{row.pf}</div>
                    <div className="text-slate-300">{row.upsLoad}%</div>
                    <div className="text-yellow-400">{row.kW > 1000 ? '📈 Peak' : '📉 Off-peak'}</div>
                    <div className="text-purple-400 text-xs">{row.kW > 1000 ? 'Business hours' : 'Low activity'}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <h4 className="text-red-400 font-bold mb-2">⚠️ VENDOR CAN INFER:</h4>
              <ul className="space-y-1 text-red-300">
                <li>• Business hours: 9 AM - 6 PM (30% higher load)</li>
                <li>• Workload type: Consistent draw = database/storage heavy</li>
                <li>• Growth rate: +5.2% monthly = expansion within 14 months</li>
                <li>• Budget cycle: Q4 spending patterns visible</li>
              </ul>
            </div>
          </div>
        )}

        {/* THERMAL DATA */}
        {activeCategory === 'thermal' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-red-400 font-bold mb-3">🌡️ Rack Temperature Matrix</h3>
              <div className="grid grid-cols-6 gap-2 text-xs">
                <div className="text-slate-500">RACK</div>
                <div className="text-slate-500">INLET °C</div>
                <div className="text-slate-500">OUTLET °C</div>
                <div className="text-slate-500">DELTA</div>
                <div className="text-slate-500">DENSITY</div>
                <div className="text-slate-500">STATUS</div>
                {data.thermal.map((row, i) => (
                  <React.Fragment key={i}>
                    <div className="text-slate-300">{row.rack}</div>
                    <div className="text-blue-400">{row.inlet}°</div>
                    <div className={row.outlet > 32 ? 'text-red-400' : 'text-green-400'}>{row.outlet}°</div>
                    <div className="text-yellow-400">{row.delta}°</div>
                    <div className="text-purple-400">{row.density}</div>
                    <div>{row.hotspot ? '🔥 HOT' : '✅ OK'}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <h4 className="text-red-400 font-bold mb-2">⚠️ VENDOR CAN INFER:</h4>
              <ul className="space-y-1 text-red-300">
                <li>• High-density racks = GPU/AI workloads (R03, R07)</li>
                <li>• Equipment age: Higher deltas = older servers</li>
                <li>• Capacity constraints: Hot spots indicate limit</li>
                <li>• PUE trending: Can calculate efficiency</li>
              </ul>
            </div>
          </div>
        )}

        {/* NETWORK DATA */}
        {activeCategory === 'network' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-blue-400 font-bold mb-3">🌐 Network Traffic Analysis</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">INGRESS</div>
                  <div className="text-2xl text-green-400">{data.network.bandwidth.ingress} Gbps</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">EGRESS</div>
                  <div className="text-2xl text-blue-400">{data.network.bandwidth.egress} Gbps</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">PEAK</div>
                  <div className="text-2xl text-yellow-400">{data.network.bandwidth.peak} Gbps</div>
                </div>
              </div>
              <h4 className="text-slate-400 mb-2">Top Destinations:</h4>
              <div className="space-y-1">
                {data.network.topDestinations.map((dest, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-300">{dest.name}</span>
                    <span className="text-purple-400">{dest.traffic} GB/hr</span>
                    <span className="text-slate-500">{dest.connections.toLocaleString()} conn</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <h4 className="text-red-400 font-bold mb-2">⚠️ VENDOR CAN INFER:</h4>
              <ul className="space-y-1 text-red-300">
                <li>• Cloud strategy: Heavy AWS traffic = AWS-first</li>
                <li>• Customer base: Egress &gt; Ingress = content provider</li>
                <li>• Business health: Traffic growth = revenue growth</li>
                <li>• Peak hours reveal customer timezone distribution</li>
              </ul>
            </div>
          </div>
        )}

        {/* ACCESS DATA */}
        {activeCategory === 'access' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-purple-400 font-bold mb-3">🔐 Access Log Feed</h3>
              <div className="grid grid-cols-6 gap-2 text-xs">
                <div className="text-slate-500">TIME</div>
                <div className="text-slate-500">NAME</div>
                <div className="text-slate-500">AREA</div>
                <div className="text-slate-500">TYPE</div>
                <div className="text-slate-500">DURATION</div>
                <div className="text-slate-500">FLAG</div>
                {data.access.slice(0, 10).map((row, i) => (
                  <React.Fragment key={i}>
                    <div className="text-slate-300">{row.time}</div>
                    <div className="text-slate-300">{row.name}</div>
                    <div className="text-blue-400">{row.area}</div>
                    <div className={row.type === 'Contractor' ? 'text-yellow-400' : 'text-green-400'}>{row.type}</div>
                    <div className="text-slate-300">{row.duration}</div>
                    <div>{row.afterHours ? '🌙 After-hrs' : ''}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <h4 className="text-red-400 font-bold mb-2">⚠️ VENDOR CAN INFER:</h4>
              <ul className="space-y-1 text-red-300">
                <li>• Staffing levels: Actual headcount visible</li>
                <li>• Contractor ratio: 40% = reliance on contract labor</li>
                <li>• Work patterns: After-hours = crunch or on-call burden</li>
                <li>• Org structure: Who accesses what reveals hierarchy</li>
              </ul>
            </div>
          </div>
        )}

        {/* ASSETS DATA */}
        {activeCategory === 'assets' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-green-400 font-bold mb-3">📦 Asset Inventory Intelligence</h3>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">TOTAL ASSETS</div>
                  <div className="text-2xl text-green-400">{data.assets.summary.totalAssets}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">AVG AGE (YRS)</div>
                  <div className="text-2xl text-yellow-400">{data.assets.summary.avgAge}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">WARRANTY EXPIRING</div>
                  <div className="text-2xl text-orange-400">{data.assets.summary.warrantyExpiring}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">REFRESH DUE</div>
                  <div className="text-2xl text-red-400">{data.assets.summary.refreshDue}</div>
                </div>
              </div>
              <h4 className="text-slate-400 mb-2">By Vendor:</h4>
              <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                {data.assets.byVendor.map((v, i) => (
                  <div key={i} className="flex justify-between bg-slate-700 p-2 rounded">
                    <span className="text-slate-300">{v.name}</span>
                    <span className="text-purple-400">{v.count} units</span>
                    <span className="text-green-400">{v.spend}</span>
                  </div>
                ))}
              </div>
              <h4 className="text-slate-400 mb-2">Recent Purchases:</h4>
              {data.assets.recentPurchases.map((p, i) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-700">
                  <span className="text-slate-300">{p.item}</span>
                  <span className="text-slate-500">{p.date}</span>
                  <span className="text-green-400">{p.cost}</span>
                </div>
              ))}
            </div>
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <h4 className="text-red-400 font-bold mb-2">⚠️ VENDOR CAN INFER:</h4>
              <ul className="space-y-1 text-red-300">
                <li>• Tech strategy: Dell-heavy = standardized, diverse = shopping</li>
                <li>• Budget timing: 156 refresh due = Q2 spend incoming</li>
                <li>• Financial health: Recent $1.5M purchases = funded</li>
                <li>• Vendor lock-in: Single-vendor = negotiating weakness</li>
              </ul>
            </div>
          </div>
        )}

        {/* CAPACITY DATA */}
        {activeCategory === 'capacity' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-indigo-400 font-bold mb-3">📈 Capacity & Growth Predictions</h3>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">POWER</div>
                  <div className="text-xl text-yellow-400">{data.capacity.power.used}/{data.capacity.power.total} MW</div>
                  <div className="text-xs text-green-400">{data.capacity.power.trend}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">COOLING</div>
                  <div className="text-xl text-blue-400">{data.capacity.cooling.used}/{data.capacity.cooling.total} tons</div>
                  <div className="text-xs text-green-400">{data.capacity.cooling.trend}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">SPACE</div>
                  <div className="text-xl text-purple-400">{data.capacity.space.used}/{data.capacity.space.total} racks</div>
                  <div className="text-xs text-green-400">{data.capacity.space.trend}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">NETWORK</div>
                  <div className="text-xl text-cyan-400">{data.capacity.network.used}/{data.capacity.network.total} Gbps</div>
                  <div className="text-xs text-green-400">{data.capacity.network.trend}</div>
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded">
                <h4 className="text-orange-400 mb-2">🔮 Vendor Predictions:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Power exhaustion: <span className="text-red-400">{data.capacity.predictions.powerExhaustion}</span></div>
                  <div>Cooling exhaustion: <span className="text-yellow-400">{data.capacity.predictions.coolingExhaustion}</span></div>
                  <div>Space exhaustion: <span className="text-green-400">{data.capacity.predictions.spaceExhaustion}</span></div>
                  <div className="col-span-2 text-purple-400">{data.capacity.predictions.recommendedAction}</div>
                </div>
              </div>
            </div>
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <h4 className="text-red-400 font-bold mb-2">⚠️ VENDOR CAN INFER:</h4>
              <ul className="space-y-1 text-red-300">
                <li>• Expansion timeline: VENDOR KNOWS BEFORE YOU DO</li>
                <li>• Sales opportunity: Will pitch you services in 10 months</li>
                <li>• Negotiating position: Near capacity = less leverage</li>
                <li>• Growth rate directly correlates to revenue</li>
              </ul>
            </div>
          </div>
        )}

        {/* COMPUTE DATA */}
        {activeCategory === 'compute' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-cyan-400 font-bold mb-3">💻 Compute Workload Intelligence</h3>
              <h4 className="text-slate-400 mb-2">Cluster Utilization:</h4>
              <div className="space-y-2 mb-4">
                {data.compute.clusters.map((c, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 text-xs bg-slate-700 p-2 rounded">
                    <span className="text-slate-300">{c.name}</span>
                    <span className="text-yellow-400">CPU: {c.cpu}%</span>
                    <span className="text-purple-400">MEM: {c.memory}%</span>
                    <span className="text-slate-400">{c.vms} VMs</span>
                    <span className={c.trend === 'growing' ? 'text-green-400' : 'text-slate-500'}>📈 {c.trend}</span>
                  </div>
                ))}
              </div>
              <h4 className="text-slate-400 mb-2">Workload Signatures Detected:</h4>
              {data.compute.workloadSignatures.map((w, i) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-700">
                  <span className="text-cyan-400">{w.type}</span>
                  <span className="text-slate-400">{w.pattern}</span>
                  <span className="text-purple-400">{w.percentage}%</span>
                </div>
              ))}
            </div>
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <h4 className="text-red-400 font-bold mb-2">⚠️ VENDOR CAN INFER:</h4>
              <ul className="space-y-1 text-red-300">
                <li>• AI/ML investment: 22% GPU workload = AI company</li>
                <li>• Tech stack: Database patterns reveal architecture</li>
                <li>• Customer activity: Compute correlates to users</li>
                <li>• Competitive intel: What technologies you're using</li>
              </ul>
            </div>
          </div>
        )}

        {/* FINANCIAL DATA */}
        {activeCategory === 'financial' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-emerald-400 font-bold mb-3">💰 Financial Signal Intelligence</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">COST/RACK</div>
                  <div className="text-xl text-green-400">{data.financial.costPerUnit.perRack}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">COST/kW</div>
                  <div className="text-xl text-yellow-400">{data.financial.costPerUnit.perKW}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">COST/Gbps</div>
                  <div className="text-xl text-blue-400">{data.financial.costPerUnit.perGbps}</div>
                </div>
              </div>
              <h4 className="text-slate-400 mb-2">Detected Financial Patterns:</h4>
              {data.financial.patterns.map((p, i) => (
                <div key={i} className="bg-slate-700 p-3 rounded mb-2">
                  <div className="flex justify-between">
                    <span className="text-emerald-400">{p.signal}</span>
                    <span className="text-purple-400">{p.confidence}% confidence</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">→ {p.implication}</div>
                </div>
              ))}
            </div>
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <h4 className="text-red-400 font-bold mb-2">⚠️ VENDOR CAN INFER:</h4>
              <ul className="space-y-1 text-red-300">
                <li>• Fiscal year timing from spending patterns</li>
                <li>• Budget constraints from delayed refreshes</li>
                <li>• M&A activity from consolidation patterns</li>
                <li>• Revenue estimates from infrastructure spend</li>
              </ul>
            </div>
          </div>
        )}

        {/* INCIDENTS DATA */}
        {activeCategory === 'incidents' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-orange-400 font-bold mb-3">🚨 Incident Intelligence</h3>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">MTTR</div>
                  <div className="text-xl text-green-400">{data.incidents.metrics.mttr}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">MTTD</div>
                  <div className="text-xl text-blue-400">{data.incidents.metrics.mttd}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">THIS MONTH</div>
                  <div className="text-xl text-yellow-400">{data.incidents.metrics.incidentsThisMonth}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-slate-400 text-xs">SLA BREACHES</div>
                  <div className="text-xl text-green-400">{data.incidents.metrics.slaBreaches}</div>
                </div>
              </div>
              <h4 className="text-slate-400 mb-2">Recent Incidents:</h4>
              {data.incidents.recent.map((inc, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 text-xs bg-slate-700 p-2 rounded mb-1">
                  <span className="text-slate-400">{inc.time}</span>
                  <span className="text-cyan-400">{inc.type}</span>
                  <span className="text-slate-300">{inc.desc}</span>
                  <span className={inc.severity === 'P2' ? 'text-red-400' : 'text-yellow-400'}>{inc.severity}</span>
                  <span className="text-green-400">MTTR: {inc.mttr}</span>
                </div>
              ))}
            </div>
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
              <h4 className="text-red-400 font-bold mb-2">⚠️ VENDOR CAN INFER:</h4>
              <ul className="space-y-1 text-red-300">
                <li>• Team capability from response times</li>
                <li>• Infrastructure weaknesses from incident types</li>
                <li>• Staffing adequacy from after-hours responses</li>
                <li>• Operational maturity from MTTR trends</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-800">Export Vulnerability Report</h4>
          <p className="text-sm text-slate-600">Download all simulated data to review offline</p>
        </div>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dcim_vulnerability_report_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
          }}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 hover:bg-slate-700"
        >
          <Download size={18} />
          Export JSON
        </button>
      </div>
    </div>
  );
};

export default SimulatedDCIMData;

