/**
 * Organizer Command Center
 * 
 * Comprehensive dashboard for labor organizing intelligence.
 * Combines all organizing tools into a unified interface.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText, AlertTriangle, Users, Building2, Scale,
  Map, Handshake, Gavel, Bell, ChevronRight, Plus,
  Download, Search, Filter, Clock, Target, Zap,
  CheckCircle2, XCircle, AlertCircle, Briefcase,
  MapPin, DollarSign, TrendingUp, Shield, FileSearch
} from 'lucide-react';

// Services
import { 
  FOIARequest, FOIAStatus, getRequests, getStateSuccessRates,
  STATE_FOIA_TEMPLATES, generateCampaignPacket
} from '../../services/foiaGenerator';
import { 
  WorkerIncident, getIncidents, getIncidentStats,
  detectPatterns, INCIDENT_TYPES
} from '../../services/workerIncidents';
import { 
  Contractor, getContractors, getOrganizingTargets,
  getContractorStats
} from '../../services/contractorIntelligence';
import {
  CommunityBenefitsAgreement, getCBAs, getCBAStats,
  checkCBAAlerts, generateCBAReport
} from '../../services/cbaCompliance';
import {
  Bill, getTrackedBills, getActiveAlerts as getLegislativeAlerts,
  getLegislativeStats
} from '../../services/legislativeAlerts';
import {
  DATA_CENTER_CORRIDORS, IBEW_LOCALS, getCorridorStats,
  identifyOrganizingTargets
} from '../../services/unionDensityMap';
import {
  CoalitionPartner, getPartners, getCoalitionStats,
  getNotifications
} from '../../services/coalitionHub';

// === Types ===

type ActiveTab = 
  | 'overview'
  | 'foia'
  | 'incidents'
  | 'contractors'
  | 'cba'
  | 'legislative'
  | 'corridors'
  | 'coalition';

// === Component ===

export const OrganizerCommandCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [loading, setLoading] = useState(true);
  
  // Data state
  const [foiaRequests, setFoiaRequests] = useState<FOIARequest[]>([]);
  const [incidents, setIncidents] = useState<WorkerIncident[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [cbas, setCBAs] = useState<CommunityBenefitsAgreement[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [partners, setPartners] = useState<CoalitionPartner[]>([]);
  
  // Stats
  const [incidentStats, setIncidentStats] = useState<Awaited<ReturnType<typeof getIncidentStats>> | null>(null);
  const [cbaStats, setCBAStats] = useState<Awaited<ReturnType<typeof getCBAStats>> | null>(null);
  const [legislativeStats, setLegislativeStats] = useState<Awaited<ReturnType<typeof getLegislativeStats>> | null>(null);
  const [corridorStats, setCorridorStats] = useState<Awaited<ReturnType<typeof getCorridorStats>> | null>(null);
  const [coalitionStats, setCoalitionStats] = useState<Awaited<ReturnType<typeof getCoalitionStats>> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        foiaData,
        incidentData,
        contractorData,
        cbaData,
        billData,
        partnerData,
        incidentStatsData,
        cbaStatsData,
        legislativeStatsData,
        corridorStatsData,
        coalitionStatsData,
      ] = await Promise.all([
        getRequests(),
        getIncidents(),
        getContractors(),
        getCBAs(),
        getTrackedBills(),
        getPartners(),
        getIncidentStats(),
        getCBAStats(),
        getLegislativeStats(),
        getCorridorStats(),
        getCoalitionStats(),
      ]);
      
      setFoiaRequests(foiaData);
      setIncidents(incidentData);
      setContractors(contractorData);
      setCBAs(cbaData);
      setBills(billData);
      setPartners(partnerData);
      setIncidentStats(incidentStatsData);
      setCBAStats(cbaStatsData);
      setLegislativeStats(legislativeStatsData);
      setCorridorStats(corridorStatsData);
      setCoalitionStats(coalitionStatsData);
    } catch (error) {
      console.error('Error loading organizer data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation tabs
  const tabs: { id: ActiveTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'overview', label: 'Overview', icon: Target, color: 'text-blue-400' },
    { id: 'foia', label: 'FOIA Requests', icon: FileSearch, color: 'text-purple-400' },
    { id: 'incidents', label: 'Worker Incidents', icon: AlertTriangle, color: 'text-red-400' },
    { id: 'contractors', label: 'Contractors', icon: Briefcase, color: 'text-orange-400' },
    { id: 'cba', label: 'CBA Monitor', icon: Scale, color: 'text-green-400' },
    { id: 'legislative', label: 'Legislation', icon: Gavel, color: 'text-yellow-400' },
    { id: 'corridors', label: 'Union Map', icon: Map, color: 'text-cyan-400' },
    { id: 'coalition', label: 'Coalition', icon: Handshake, color: 'text-pink-400' },
  ];

  // === Render Functions ===

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active FOIA Requests"
          value={foiaRequests.filter(r => !['completed', 'denied'].includes(r.status)).length}
          icon={FileSearch}
          color="purple"
        />
        <MetricCard
          label="Incident Reports"
          value={incidents.length}
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          label="CBAs Tracked"
          value={cbas.length}
          icon={Scale}
          color="green"
        />
        <MetricCard
          label="Bills Monitored"
          value={bills.length}
          icon={Gavel}
          color="yellow"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionButton
            label="New FOIA Request"
            icon={Plus}
            onClick={() => setActiveTab('foia')}
          />
          <QuickActionButton
            label="Report Incident"
            icon={AlertCircle}
            onClick={() => setActiveTab('incidents')}
          />
          <QuickActionButton
            label="Track Bill"
            icon={FileText}
            onClick={() => setActiveTab('legislative')}
          />
          <QuickActionButton
            label="Add Partner"
            icon={Handshake}
            onClick={() => setActiveTab('coalition')}
          />
        </div>
      </div>

      {/* Priority Alerts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* High Priority Items */}
        <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-400" />
            Priority Alerts
          </h3>
          <div className="space-y-3">
            {corridorStats && corridorStats.corridors
              .filter(c => c.organizingPriority === 'high')
              .slice(0, 3)
              .map(corridor => (
                <AlertItem
                  key={corridor.id}
                  title={`${corridor.name} - Low Union Density`}
                  description={`${corridor.unionDensity}% density, ${corridor.facilityCount} facilities`}
                  type="warning"
                />
              ))}
            {bills.filter(b => b.status === 'in-committee').slice(0, 2).map(bill => (
              <AlertItem
                key={bill.id}
                title={`${bill.billNumber} - ${bill.state}`}
                description={bill.title}
                type="info"
              />
            ))}
          </div>
        </div>

        {/* Organizing Targets */}
        <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Top Organizing Targets
          </h3>
          <div className="space-y-3">
            {contractors
              .filter(c => c.organizingPriority === 'high')
              .slice(0, 4)
              .map(contractor => (
                <div
                  key={contractor.id}
                  className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg"
                >
                  <div>
                    <div className="text-white font-medium">{contractor.name}</div>
                    <div className="text-sm text-gray-400">{contractor.type}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    contractor.unionStatus === 'non-union' 
                      ? 'bg-red-900/30 text-red-400'
                      : contractor.unionStatus === 'mixed'
                      ? 'bg-yellow-900/30 text-yellow-400'
                      : 'bg-green-900/30 text-green-400'
                  }`}>
                    {contractor.unionStatus}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Data Center Corridors Summary */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Map className="w-5 h-5 text-cyan-400" />
          Data Center Corridors
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {DATA_CENTER_CORRIDORS.map(corridor => (
            <div
              key={corridor.id}
              className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{corridor.name}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  corridor.organizingPriority === 'high'
                    ? 'bg-red-900/30 text-red-400'
                    : corridor.organizingPriority === 'medium'
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : 'bg-green-900/30 text-green-400'
                }`}>
                  {corridor.organizingPriority}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">
                  Facilities: <span className="text-white">{corridor.facilityCount}</span>
                </div>
                <div className="text-gray-400">
                  Workers: <span className="text-white">{corridor.totalWorkers.toLocaleString()}</span>
                </div>
                <div className="text-gray-400">
                  Union: <span className="text-white">{corridor.unionDensity}%</span>
                </div>
                <div className="text-gray-400">
                  IBEW: <span className="text-white">Local {corridor.ibewLocals.join(', ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFOIA = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">FOIA Request Generator & Tracker</h3>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-purple-500">
            <Plus className="w-4 h-4" />
            New Request
          </button>
          <button className="px-3 py-1.5 bg-[#21262d] text-white rounded-lg text-sm flex items-center gap-2 hover:bg-[#30363d]">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* State Templates */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
        <h4 className="text-white font-medium mb-3">Available State Templates</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {STATE_FOIA_TEMPLATES.map(template => (
            <div
              key={template.id}
              className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] hover:border-purple-500 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{template.state}</span>
                <span className="text-xs text-gray-400">{template.responseDeadline} day response</span>
              </div>
              <div className="text-sm text-gray-400">{template.lawName}</div>
              <div className="flex gap-2 mt-2">
                {template.feeWaiverAvailable && (
                  <span className="px-1.5 py-0.5 bg-green-900/30 text-green-400 text-xs rounded">
                    Fee Waiver
                  </span>
                )}
                {template.electronicSubmission && (
                  <span className="px-1.5 py-0.5 bg-blue-900/30 text-blue-400 text-xs rounded">
                    Electronic
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Requests */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
        <h4 className="text-white font-medium mb-3">Active Requests ({foiaRequests.length})</h4>
        {foiaRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileSearch className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No FOIA requests yet. Create your first request to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {foiaRequests.map(request => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg"
              >
                <div>
                  <div className="text-white font-medium">{request.subject}</div>
                  <div className="text-sm text-gray-400">
                    {request.state} • {request.agency}
                  </div>
                </div>
                <StatusBadge status={request.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderIncidents = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Worker Incident Reports</h3>
        <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-red-500">
          <Plus className="w-4 h-4" />
          Report Incident
        </button>
      </div>

      {/* Incident Type Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(INCIDENT_TYPES).slice(0, 6).map(([type, info]) => (
          <div
            key={type}
            className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]"
          >
            <div className="text-white font-medium mb-1">{info.label}</div>
            <div className="text-sm text-gray-400 mb-3">{info.description}</div>
            <div className="text-xs text-gray-500">
              {info.filingAgencies.length > 0 && (
                <span>File with: {info.filingAgencies.join(', ')}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Incidents */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
        <h4 className="text-white font-medium mb-3">Recent Reports ({incidents.length})</h4>
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No incidents reported yet. Help protect workers by reporting issues.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incidents.map(incident => (
              <div
                key={incident.id}
                className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg"
              >
                <div>
                  <div className="text-white font-medium">{incident.title}</div>
                  <div className="text-sm text-gray-400">
                    {INCIDENT_TYPES[incident.incidentType]?.label} • {incident.facility?.city}, {incident.facility?.state}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  incident.severity === 'critical' ? 'bg-red-900/30 text-red-400' :
                  incident.severity === 'high' ? 'bg-orange-900/30 text-orange-400' :
                  incident.severity === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-blue-900/30 text-blue-400'
                }`}>
                  {incident.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderContractors = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Contractor Intelligence Network</h3>
        <div className="flex gap-2">
          <select className="px-3 py-1.5 bg-[#21262d] text-white rounded-lg text-sm border border-[#30363d]">
            <option value="all">All Types</option>
            <option value="staffing">Staffing Agencies</option>
            <option value="electrical">Electrical</option>
            <option value="general">General Contractors</option>
          </select>
          <select className="px-3 py-1.5 bg-[#21262d] text-white rounded-lg text-sm border border-[#30363d]">
            <option value="all">Union Status</option>
            <option value="non-union">Non-Union</option>
            <option value="mixed">Mixed</option>
            <option value="fully-union">Fully Union</option>
          </select>
        </div>
      </div>

      {/* Contractor List */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#30363d]">
                <th className="text-left p-3 text-gray-400 font-medium">Contractor</th>
                <th className="text-left p-3 text-gray-400 font-medium">Type</th>
                <th className="text-left p-3 text-gray-400 font-medium">Union Status</th>
                <th className="text-left p-3 text-gray-400 font-medium">Projects</th>
                <th className="text-left p-3 text-gray-400 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {contractors.map(contractor => (
                <tr key={contractor.id} className="border-b border-[#30363d]/50 hover:bg-[#21262d]">
                  <td className="p-3">
                    <div className="text-white font-medium">{contractor.name}</div>
                    <div className="text-sm text-gray-400">{contractor.headquarters?.city}, {contractor.headquarters?.state}</div>
                  </td>
                  <td className="p-3 text-gray-300 text-sm">{contractor.type}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      contractor.unionStatus === 'fully-union' ? 'bg-green-900/30 text-green-400' :
                      contractor.unionStatus === 'mixed' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {contractor.unionStatus}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300 text-sm">
                    {contractor.operatorRelationships.reduce((sum, r) => sum + r.projectCount, 0)}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      contractor.organizingPriority === 'high' ? 'bg-red-900/30 text-red-400' :
                      contractor.organizingPriority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-green-900/30 text-green-400'
                    }`}>
                      {contractor.organizingPriority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCBA = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Community Benefits Agreement Monitor</h3>
        <button className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-green-500">
          <Plus className="w-4 h-4" />
          Add CBA
        </button>
      </div>

      {/* CBA Summary Stats */}
      {cbaStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total CBAs" value={cbaStats.total} icon={Scale} color="green" />
          <MetricCard label="Avg Compliance" value={`${cbaStats.averageComplianceScore}%`} icon={CheckCircle2} color="blue" />
          <MetricCard label="At Risk" value={cbaStats.atRiskCount} icon={AlertTriangle} color="yellow" />
          <MetricCard label="Failed" value={cbaStats.failedCount} icon={XCircle} color="red" />
        </div>
      )}

      {/* CBA List */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
        <h4 className="text-white font-medium mb-3">Tracked Agreements ({cbas.length})</h4>
        <div className="space-y-3">
          {cbas.map(cba => (
            <div
              key={cba.id}
              className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-white font-medium">{cba.title}</div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  cba.status === 'active' ? 'bg-green-900/30 text-green-400' :
                  cba.status === 'expired' ? 'bg-gray-900/30 text-gray-400' :
                  'bg-yellow-900/30 text-yellow-400'
                }`}>
                  {cba.status}
                </span>
              </div>
              <div className="text-sm text-gray-400 mb-3">
                {cba.company} • {cba.city}, {cba.state}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">
                  Commitments: <span className="text-white">{cba.commitments.length}</span>
                </span>
                <span className="text-gray-400">
                  Partners: <span className="text-white">{cba.communityPartners.length}</span>
                </span>
                <button className="text-blue-400 hover:text-blue-300">View Report</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLegislative = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Legislative Alert System</h3>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-yellow-500">
            <Plus className="w-4 h-4" />
            Track Bill
          </button>
        </div>
      </div>

      {/* Legislative Stats */}
      {legislativeStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Bills Tracked" value={legislativeStats.totalTracked} icon={Gavel} color="yellow" />
          <MetricCard label="Upcoming Deadlines" value={legislativeStats.upcomingDeadlines} icon={Clock} color="orange" />
          <MetricCard label="Pro-Worker Bills" value={legislativeStats.positiveImpact} icon={TrendingUp} color="green" />
          <MetricCard label="Anti-Worker Bills" value={legislativeStats.negativeImpact} icon={AlertTriangle} color="red" />
        </div>
      )}

      {/* Bills List */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
        <h4 className="text-white font-medium mb-3">Tracked Bills ({bills.length})</h4>
        <div className="space-y-3">
          {bills.map(bill => (
            <div
              key={bill.id}
              className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{bill.billNumber}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-400">{bill.state}</span>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  bill.status === 'signed' ? 'bg-green-900/30 text-green-400' :
                  bill.status === 'in-committee' ? 'bg-blue-900/30 text-blue-400' :
                  'bg-gray-900/30 text-gray-400'
                }`}>
                  {bill.status}
                </span>
              </div>
              <div className="text-white mb-2">{bill.title}</div>
              <div className="text-sm text-gray-400 mb-2">{bill.summary}</div>
              <div className="flex flex-wrap gap-2">
                {bill.category.map(cat => (
                  <span key={cat} className="px-2 py-0.5 bg-[#21262d] text-gray-300 text-xs rounded">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCorridors = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Union Density Heatmap</h3>
      </div>

      {/* Corridor Stats */}
      {corridorStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Facilities" value={corridorStats.totalFacilities} icon={Building2} color="blue" />
          <MetricCard label="Total Workers" value={corridorStats.totalWorkers.toLocaleString()} icon={Users} color="green" />
          <MetricCard label="Avg Union Density" value={`${corridorStats.avgUnionDensity}%`} icon={Shield} color="cyan" />
          <MetricCard label="High Priority" value={corridorStats.highPriorityCount} icon={Target} color="red" />
        </div>
      )}

      {/* IBEW Locals */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
        <h4 className="text-white font-medium mb-3">IBEW Locals with Data Center Experience</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {IBEW_LOCALS.filter(l => l.dataCenterExperience).map(local => (
            <div
              key={local.localNumber}
              className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Local {local.localNumber}</span>
                {local.memberCount && (
                  <span className="text-gray-400 text-sm">{local.memberCount.toLocaleString()} members</span>
                )}
              </div>
              <div className="text-sm text-gray-400">{local.jurisdiction.join(', ')}</div>
              {local.notes && (
                <div className="text-xs text-gray-500 mt-2">{local.notes}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCoalition = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Coalition Coordination Hub</h3>
        <button className="px-3 py-1.5 bg-pink-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-pink-500">
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>

      {/* Coalition Stats */}
      {coalitionStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Partners" value={coalitionStats.totalPartners} icon={Handshake} color="pink" />
          <MetricCard label="Watchlists" value={coalitionStats.activeWatchlists} icon={Target} color="blue" />
          <MetricCard label="Campaigns" value={coalitionStats.activeCampaigns} icon={Zap} color="yellow" />
          <MetricCard 
            label="Data Sharing" 
            value={coalitionStats.byEngagement['data-sharing'] || 0} 
            icon={Shield} 
            color="green" 
          />
        </div>
      )}

      {/* Partners List */}
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
        <h4 className="text-white font-medium mb-3">Coalition Partners ({partners.length})</h4>
        <div className="space-y-3">
          {partners.map(partner => (
            <div
              key={partner.id}
              className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-white font-medium">{partner.name}</div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  partner.engagementStatus === 'active-partner' ? 'bg-green-900/30 text-green-400' :
                  partner.engagementStatus === 'data-sharing' ? 'bg-blue-900/30 text-blue-400' :
                  'bg-gray-900/30 text-gray-400'
                }`}>
                  {partner.engagementStatus}
                </span>
              </div>
              <div className="text-sm text-gray-400 mb-2">{partner.description}</div>
              <div className="flex flex-wrap gap-2">
                {partner.focusAreas.map(area => (
                  <span key={area} className="px-2 py-0.5 bg-[#21262d] text-gray-300 text-xs rounded">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'foia': return renderFOIA();
      case 'incidents': return renderIncidents();
      case 'contractors': return renderContractors();
      case 'cba': return renderCBA();
      case 'legislative': return renderLegislative();
      case 'corridors': return renderCorridors();
      case 'coalition': return renderCoalition();
      default: return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Organizer Command Center</h1>
              <p className="text-sm text-gray-400">Labor intelligence & campaign coordination</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 bg-[#21262d] text-white rounded-lg text-sm flex items-center gap-2 hover:bg-[#30363d]">
              <Download className="w-4 h-4" />
              Export All
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-6">
        <div className="flex gap-1 overflow-x-auto py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#21262d] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#21262d]/50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderContent()}
      </div>
    </div>
  );
};

// === Helper Components ===

const MetricCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}> = ({ label, value, icon: Icon, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-900/20',
    green: 'text-green-400 bg-green-900/20',
    red: 'text-red-400 bg-red-900/20',
    yellow: 'text-yellow-400 bg-yellow-900/20',
    orange: 'text-orange-400 bg-orange-900/20',
    purple: 'text-purple-400 bg-purple-900/20',
    cyan: 'text-cyan-400 bg-cyan-900/20',
    pink: 'text-pink-400 bg-pink-900/20',
  };

  return (
    <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-sm text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
};

const QuickActionButton: React.FC<{
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}> = ({ label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-3 bg-[#21262d] rounded-lg text-white text-sm hover:bg-[#30363d] transition-colors"
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const AlertItem: React.FC<{
  title: string;
  description: string;
  type: 'warning' | 'info' | 'error';
}> = ({ title, description, type }) => {
  const typeStyles = {
    warning: 'border-l-yellow-500',
    info: 'border-l-blue-500',
    error: 'border-l-red-500',
  };

  return (
    <div className={`p-3 bg-[#0d1117] rounded-lg border-l-4 ${typeStyles[type]}`}>
      <div className="text-white font-medium text-sm">{title}</div>
      <div className="text-gray-400 text-xs">{description}</div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: FOIAStatus }> = ({ status }) => {
  const statusStyles: Record<FOIAStatus, string> = {
    draft: 'bg-gray-900/30 text-gray-400',
    submitted: 'bg-blue-900/30 text-blue-400',
    acknowledged: 'bg-cyan-900/30 text-cyan-400',
    processing: 'bg-yellow-900/30 text-yellow-400',
    'partial-response': 'bg-orange-900/30 text-orange-400',
    completed: 'bg-green-900/30 text-green-400',
    denied: 'bg-red-900/30 text-red-400',
    appealed: 'bg-purple-900/30 text-purple-400',
    litigation: 'bg-pink-900/30 text-pink-400',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${statusStyles[status]}`}>
      {status}
    </span>
  );
};

