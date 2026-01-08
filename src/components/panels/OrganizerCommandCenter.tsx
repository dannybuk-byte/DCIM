/**
 * Organizer Command Center
 * 
 * HIGH-DENSITY comprehensive dashboard for labor organizing intelligence.
 * Maximum data per pixel - scrollable cards, minimal spacing.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText, AlertTriangle, Users, Building2, Scale,
  Map, Handshake, Gavel, Bell, ChevronRight, Plus,
  Download, Search, Filter, Clock, Target, Zap,
  CheckCircle2, XCircle, AlertCircle, Briefcase,
  MapPin, DollarSign, TrendingUp, Shield, FileSearch,
  ChevronDown, ExternalLink
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

  // Navigation tabs - compact
  const tabs: { id: ActiveTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'overview', label: 'Overview', icon: Target, color: 'text-blue-400' },
    { id: 'foia', label: 'FOIA', icon: FileSearch, color: 'text-purple-400' },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle, color: 'text-red-400' },
    { id: 'contractors', label: 'Contractors', icon: Briefcase, color: 'text-orange-400' },
    { id: 'cba', label: 'CBA', icon: Scale, color: 'text-green-400' },
    { id: 'legislative', label: 'Bills', icon: Gavel, color: 'text-yellow-400' },
    { id: 'corridors', label: 'Union Map', icon: Map, color: 'text-cyan-400' },
    { id: 'coalition', label: 'Coalition', icon: Handshake, color: 'text-pink-400' },
  ];

  // === Scrollable Card Component ===
  const ScrollCard: React.FC<{
    title: string;
    icon: React.ElementType;
    color: string;
    count?: number;
    height?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
  }> = ({ title, icon: Icon, color, count, height = 'h-48', children, actions }) => (
    <div className={`bg-[#161b22] rounded border border-[#30363d] flex flex-col min-h-0 overflow-hidden ${height.includes('flex-1') ? 'flex-1' : ''} ${height.includes('shrink-0') ? 'shrink-0' : ''}`}>
      <div className="flex items-center justify-between px-2 py-1 border-b border-[#30363d] bg-[#0d1117] shrink-0">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-xs font-medium text-white">{title}</span>
          {count !== undefined && (
            <span className="text-[10px] text-gray-500">({count})</span>
          )}
        </div>
        {actions}
      </div>
      <div className={`${height.replace('flex-1', '').replace('shrink-0', '').trim() || 'h-48'} overflow-y-auto overflow-x-hidden min-h-0 flex-1`}>
        {children}
      </div>
    </div>
  );

  // === Render Functions ===

  const renderOverview = () => (
    <div className="grid grid-cols-12 gap-2 h-full overflow-hidden">
      {/* Left Column - Stats + Quick Actions */}
      <div className="col-span-3 flex flex-col gap-2 min-h-0 overflow-hidden">
        {/* Key Metrics - Compact Grid */}
        <div className="grid grid-cols-2 gap-1 shrink-0">
          <MiniMetric label="FOIA Active" value={foiaRequests.filter(r => !['completed', 'denied'].includes(r.status)).length} color="purple" />
          <MiniMetric label="Incidents" value={incidents.length} color="red" />
          <MiniMetric label="CBAs" value={cbas.length} color="green" />
          <MiniMetric label="Bills" value={bills.length} color="yellow" />
          <MiniMetric label="Corridors" value={DATA_CENTER_CORRIDORS.length} color="cyan" />
          <MiniMetric label="Partners" value={partners.length} color="pink" />
        </div>

        {/* Quick Actions - Scrollable */}
        <ScrollCard title="Quick Actions" icon={Zap} color="text-yellow-400" height="h-32">
          <div className="p-1 space-y-1">
            {[
              { label: 'New FOIA', icon: Plus, tab: 'foia' as ActiveTab },
              { label: 'Report Incident', icon: AlertCircle, tab: 'incidents' as ActiveTab },
              { label: 'Track Bill', icon: FileText, tab: 'legislative' as ActiveTab },
              { label: 'Add Partner', icon: Handshake, tab: 'coalition' as ActiveTab },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => setActiveTab(action.tab)}
                className="w-full flex items-center gap-2 px-2 py-1 bg-[#21262d] rounded text-xs text-white hover:bg-[#30363d] transition-colors"
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        </ScrollCard>

        {/* Organizing Targets - Scrollable - takes remaining space */}
        <ScrollCard title="Top Targets" icon={Target} color="text-blue-400" height="min-h-0 flex-1">
          <div className="p-1 space-y-1">
            {contractors
              .filter(c => c.organizingPriority === 'high')
              .slice(0, 10)
              .map(contractor => (
                <div key={contractor.id} className="flex items-center justify-between px-1.5 py-1 bg-[#0d1117] rounded text-xs">
                  <div className="truncate flex-1">
                    <div className="text-white truncate">{contractor.name}</div>
                    <div className="text-[10px] text-gray-500">{contractor.type}</div>
                  </div>
                  <span className={`ml-1 px-1 py-0.5 text-[9px] rounded ${
                    contractor.unionStatus === 'non-union' 
                      ? 'bg-red-900/30 text-red-400'
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {contractor.unionStatus === 'non-union' ? 'NON' : 'MIX'}
                  </span>
                </div>
              ))}
          </div>
        </ScrollCard>
      </div>

      {/* Center Column - Main Content */}
      <div className="col-span-6 flex flex-col gap-2 min-h-0 overflow-hidden">
        {/* Corridors Grid - fixed height */}
        <ScrollCard title="Data Center Corridors" icon={Map} color="text-cyan-400" height="h-36 shrink-0" count={DATA_CENTER_CORRIDORS.length}>
          <div className="grid grid-cols-2 gap-1 p-1">
            {DATA_CENTER_CORRIDORS.map(corridor => (
              <div key={corridor.id} className="p-1.5 bg-[#0d1117] rounded border border-[#21262d]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white font-medium truncate">{corridor.name}</span>
                  <span className={`px-1 py-0.5 text-[9px] rounded ${
                    corridor.organizingPriority === 'high' ? 'bg-red-900/30 text-red-400' :
                    corridor.organizingPriority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-green-900/30 text-green-400'
                  }`}>
                    {corridor.organizingPriority.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  <div><span className="text-gray-500">Fac:</span> <span className="text-white">{corridor.facilityCount}</span></div>
                  <div><span className="text-gray-500">Wkrs:</span> <span className="text-white">{(corridor.totalWorkers/1000).toFixed(0)}k</span></div>
                  <div><span className="text-gray-500">Union:</span> <span className="text-white">{corridor.unionDensity}%</span></div>
                  <div><span className="text-gray-500">IBEW:</span> <span className="text-white">{corridor.ibewLocals[0]}</span></div>
                </div>
              </div>
            ))}
          </div>
        </ScrollCard>

        {/* Bills + CBAs Side by Side - takes remaining space */}
        <div className="grid grid-cols-2 gap-2 min-h-0 flex-1">
          {/* Legislative Alerts */}
          <ScrollCard title="Active Bills" icon={Gavel} color="text-yellow-400" height="h-full min-h-0" count={bills.length}>
            <div className="p-1 space-y-1">
              {bills.map(bill => (
                <div key={bill.id} className="p-1.5 bg-[#0d1117] rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{bill.billNumber}</span>
                    <span className="text-[10px] text-gray-500">{bill.state}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">{bill.title}</div>
                  <div className="flex gap-1 mt-1">
                    {bill.category.slice(0, 2).map(cat => (
                      <span key={cat} className="px-1 py-0.5 bg-[#21262d] text-[9px] text-gray-400 rounded">{cat}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollCard>

          {/* CBA Monitor */}
          <ScrollCard title="CBA Compliance" icon={Scale} color="text-green-400" height="h-full min-h-0" count={cbas.length}>
            <div className="p-1 space-y-1">
              {cbas.map(cba => (
                <div key={cba.id} className="p-1.5 bg-[#0d1117] rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium truncate">{cba.company}</span>
                    <span className={`px-1 py-0.5 text-[9px] rounded ${
                      cba.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-gray-900/30 text-gray-400'
                    }`}>{cba.status}</span>
                  </div>
                  <div className="text-[10px] text-gray-400">{cba.city}, {cba.state}</div>
                  <div className="text-[10px] text-gray-500">{cba.commitments.length} commitments</div>
                </div>
              ))}
            </div>
          </ScrollCard>
        </div>
      </div>

      {/* Right Column - Alerts & Partners */}
      <div className="col-span-3 flex flex-col gap-2 min-h-0 overflow-hidden">
        {/* Priority Alerts - fixed height */}
        <ScrollCard title="Priority Alerts" icon={Bell} color="text-red-400" height="h-32 shrink-0">
          <div className="p-1 space-y-1">
            {corridorStats && corridorStats.corridors
              .filter(c => c.organizingPriority === 'high')
              .map(corridor => (
                <div key={corridor.id} className="p-1.5 bg-[#0d1117] rounded border-l-2 border-yellow-500">
                  <div className="text-xs text-white">{corridor.name}</div>
                  <div className="text-[10px] text-gray-400">{corridor.unionDensity}% density • {corridor.facilityCount} facilities</div>
                </div>
              ))}
            {bills.filter(b => b.status === 'in-committee').slice(0, 2).map(bill => (
              <div key={bill.id} className="p-1.5 bg-[#0d1117] rounded border-l-2 border-blue-500">
                <div className="text-xs text-white">{bill.billNumber} - {bill.state}</div>
                <div className="text-[10px] text-gray-400 truncate">{bill.title}</div>
              </div>
            ))}
          </div>
        </ScrollCard>

        {/* IBEW Locals - fixed height */}
        <ScrollCard title="IBEW Locals" icon={Zap} color="text-yellow-400" height="h-28 shrink-0" count={IBEW_LOCALS.filter(l => l.dataCenterExperience).length}>
          <div className="p-1 space-y-1">
            {IBEW_LOCALS.filter(l => l.dataCenterExperience).slice(0, 8).map(local => (
              <div key={local.localNumber} className="flex items-center justify-between px-1.5 py-1 bg-[#0d1117] rounded text-xs">
                <div>
                  <span className="text-white">Local {local.localNumber}</span>
                  <span className="text-[10px] text-gray-500 ml-1">{local.jurisdiction[0]}</span>
                </div>
                {local.memberCount && <span className="text-[10px] text-gray-400">{(local.memberCount/1000).toFixed(1)}k</span>}
              </div>
            ))}
          </div>
        </ScrollCard>

        {/* Coalition Partners - takes remaining space */}
        <ScrollCard title="Coalition Partners" icon={Handshake} color="text-pink-400" height="min-h-0 flex-1" count={partners.length}>
          <div className="p-1 space-y-1">
            {partners.map(partner => (
              <div key={partner.id} className="p-1.5 bg-[#0d1117] rounded text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium truncate">{partner.shortName || partner.name}</span>
                  <span className={`px-1 py-0.5 text-[9px] rounded ${
                    partner.engagementStatus === 'active-partner' ? 'bg-green-900/30 text-green-400' :
                    partner.engagementStatus === 'data-sharing' ? 'bg-blue-900/30 text-blue-400' :
                    'bg-gray-900/30 text-gray-400'
                  }`}>{partner.type}</span>
                </div>
                <div className="text-[10px] text-gray-500 truncate">{partner.focusAreas.slice(0, 2).join(', ')}</div>
              </div>
            ))}
          </div>
        </ScrollCard>
      </div>
    </div>
  );

  const renderFOIA = () => (
    <div className="grid grid-cols-12 gap-2 h-full">
      {/* State Templates */}
      <div className="col-span-4">
        <ScrollCard title="State Templates" icon={FileSearch} color="text-purple-400" height="h-full" count={STATE_FOIA_TEMPLATES.length}
          actions={<button className="text-[10px] text-purple-400 hover:text-purple-300">+ New</button>}>
          <div className="p-1 space-y-1">
            {STATE_FOIA_TEMPLATES.map(template => (
              <div key={template.id} className="p-1.5 bg-[#0d1117] rounded border border-[#21262d] hover:border-purple-500 cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white font-medium">{template.state}</span>
                  <span className="text-[10px] text-gray-500">{template.responseDeadline}d</span>
                </div>
                <div className="text-[10px] text-gray-400 truncate">{template.lawName}</div>
                <div className="flex gap-1 mt-1">
                  {template.feeWaiverAvailable && <span className="px-1 py-0.5 bg-green-900/30 text-green-400 text-[9px] rounded">Fee Waiver</span>}
                  {template.electronicSubmission && <span className="px-1 py-0.5 bg-blue-900/30 text-blue-400 text-[9px] rounded">E-File</span>}
                </div>
              </div>
            ))}
          </div>
        </ScrollCard>
      </div>

      {/* Active Requests */}
      <div className="col-span-8">
        <ScrollCard title="Active Requests" icon={Clock} color="text-blue-400" height="h-full" count={foiaRequests.length}
          actions={
            <div className="flex gap-1">
              <button className="text-[10px] text-blue-400 hover:text-blue-300">Export</button>
            </div>
          }>
          {foiaRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileSearch className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs">No FOIA requests yet</span>
            </div>
          ) : (
            <div className="p-1">
              <table className="w-full text-xs">
                <thead className="bg-[#0d1117] sticky top-0">
                  <tr className="text-gray-500">
                    <th className="text-left p-1">Subject</th>
                    <th className="text-left p-1">State</th>
                    <th className="text-left p-1">Agency</th>
                    <th className="text-left p-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {foiaRequests.map(request => (
                    <tr key={request.id} className="border-t border-[#21262d] hover:bg-[#21262d]">
                      <td className="p-1 text-white truncate max-w-[200px]">{request.subject}</td>
                      <td className="p-1 text-gray-400">{request.state}</td>
                      <td className="p-1 text-gray-400 truncate max-w-[150px]">{request.agency}</td>
                      <td className="p-1"><StatusBadge status={request.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ScrollCard>
      </div>
    </div>
  );

  const renderIncidents = () => (
    <div className="grid grid-cols-12 gap-2 h-full">
      {/* Incident Types */}
      <div className="col-span-4">
        <ScrollCard title="Incident Types" icon={AlertTriangle} color="text-red-400" height="h-full"
          actions={<button className="text-[10px] text-red-400 hover:text-red-300">+ Report</button>}>
          <div className="p-1 space-y-1">
            {Object.entries(INCIDENT_TYPES).map(([type, info]) => (
              <div key={type} className="p-1.5 bg-[#0d1117] rounded text-xs hover:bg-[#21262d] cursor-pointer">
                <div className="text-white font-medium">{info.label}</div>
                <div className="text-[10px] text-gray-500 line-clamp-2">{info.description}</div>
              </div>
            ))}
          </div>
        </ScrollCard>
      </div>

      {/* Recent Incidents */}
      <div className="col-span-8">
        <ScrollCard title="Recent Reports" icon={FileText} color="text-orange-400" height="h-full" count={incidents.length}>
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs">No incidents reported</span>
            </div>
          ) : (
            <div className="p-1">
              <table className="w-full text-xs">
                <thead className="bg-[#0d1117] sticky top-0">
                  <tr className="text-gray-500">
                    <th className="text-left p-1">Title</th>
                    <th className="text-left p-1">Type</th>
                    <th className="text-left p-1">Location</th>
                    <th className="text-left p-1">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(incident => (
                    <tr key={incident.id} className="border-t border-[#21262d] hover:bg-[#21262d]">
                      <td className="p-1 text-white truncate max-w-[200px]">{incident.title}</td>
                      <td className="p-1 text-gray-400">{INCIDENT_TYPES[incident.incidentType]?.label}</td>
                      <td className="p-1 text-gray-400">{incident.facility?.city}, {incident.facility?.state}</td>
                      <td className="p-1">
                        <span className={`px-1 py-0.5 text-[9px] rounded ${
                          incident.severity === 'critical' ? 'bg-red-900/30 text-red-400' :
                          incident.severity === 'high' ? 'bg-orange-900/30 text-orange-400' :
                          'bg-yellow-900/30 text-yellow-400'
                        }`}>{incident.severity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ScrollCard>
      </div>
    </div>
  );

  const renderContractors = () => (
    <div className="h-full">
      <ScrollCard title="Contractor Intelligence" icon={Briefcase} color="text-orange-400" height="h-full" count={contractors.length}
        actions={
          <div className="flex gap-2 items-center">
            <select className="text-[10px] bg-[#21262d] border-none text-gray-400 rounded px-1">
              <option>All Types</option>
              <option>Staffing</option>
              <option>Electrical</option>
              <option>GC</option>
            </select>
            <select className="text-[10px] bg-[#21262d] border-none text-gray-400 rounded px-1">
              <option>Union Status</option>
              <option>Non-Union</option>
              <option>Mixed</option>
              <option>Union</option>
            </select>
          </div>
        }>
        <table className="w-full text-xs">
          <thead className="bg-[#0d1117] sticky top-0">
            <tr className="text-gray-500">
              <th className="text-left p-1.5">Contractor</th>
              <th className="text-left p-1.5">Type</th>
              <th className="text-left p-1.5">Location</th>
              <th className="text-left p-1.5">Union</th>
              <th className="text-left p-1.5">Projects</th>
              <th className="text-left p-1.5">Priority</th>
            </tr>
          </thead>
          <tbody>
            {contractors.map(contractor => (
              <tr key={contractor.id} className="border-t border-[#21262d] hover:bg-[#21262d]">
                <td className="p-1.5">
                  <div className="text-white">{contractor.name}</div>
                </td>
                <td className="p-1.5 text-gray-400">{contractor.type}</td>
                <td className="p-1.5 text-gray-400">{contractor.headquarters?.city}, {contractor.headquarters?.state}</td>
                <td className="p-1.5">
                  <span className={`px-1 py-0.5 text-[9px] rounded ${
                    contractor.unionStatus === 'fully-union' ? 'bg-green-900/30 text-green-400' :
                    contractor.unionStatus === 'mixed' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-red-900/30 text-red-400'
                  }`}>{contractor.unionStatus}</span>
                </td>
                <td className="p-1.5 text-gray-400">{contractor.operatorRelationships.reduce((s, r) => s + r.projectCount, 0)}</td>
                <td className="p-1.5">
                  <span className={`px-1 py-0.5 text-[9px] rounded ${
                    contractor.organizingPriority === 'high' ? 'bg-red-900/30 text-red-400' :
                    contractor.organizingPriority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-green-900/30 text-green-400'
                  }`}>{contractor.organizingPriority}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollCard>
    </div>
  );

  const renderCBA = () => (
    <div className="grid grid-cols-12 gap-2 h-full">
      {/* Stats Row */}
      <div className="col-span-12 grid grid-cols-4 gap-1">
        {cbaStats && (
          <>
            <MiniMetric label="Total CBAs" value={cbaStats.total} color="green" />
            <MiniMetric label="Avg Compliance" value={`${cbaStats.averageComplianceScore}%`} color="blue" />
            <MiniMetric label="At Risk" value={cbaStats.atRiskCount} color="yellow" />
            <MiniMetric label="Failed" value={cbaStats.failedCount} color="red" />
          </>
        )}
      </div>
      
      {/* CBA List */}
      <div className="col-span-12">
        <ScrollCard title="Community Benefits Agreements" icon={Scale} color="text-green-400" height="h-[calc(100%-40px)]" count={cbas.length}
          actions={<button className="text-[10px] text-green-400 hover:text-green-300">+ Add CBA</button>}>
          <table className="w-full text-xs">
            <thead className="bg-[#0d1117] sticky top-0">
              <tr className="text-gray-500">
                <th className="text-left p-1.5">Company</th>
                <th className="text-left p-1.5">Facility</th>
                <th className="text-left p-1.5">Location</th>
                <th className="text-left p-1.5">Partners</th>
                <th className="text-left p-1.5">Commitments</th>
                <th className="text-left p-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {cbas.map(cba => (
                <tr key={cba.id} className="border-t border-[#21262d] hover:bg-[#21262d]">
                  <td className="p-1.5 text-white">{cba.company}</td>
                  <td className="p-1.5 text-gray-400 truncate max-w-[150px]">{cba.facilityName}</td>
                  <td className="p-1.5 text-gray-400">{cba.city}, {cba.state}</td>
                  <td className="p-1.5 text-gray-400">{cba.communityPartners.length}</td>
                  <td className="p-1.5 text-gray-400">{cba.commitments.length}</td>
                  <td className="p-1.5">
                    <span className={`px-1 py-0.5 text-[9px] rounded ${
                      cba.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-gray-900/30 text-gray-400'
                    }`}>{cba.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollCard>
      </div>
    </div>
  );

  const renderLegislative = () => (
    <div className="grid grid-cols-12 gap-2 h-full">
      {/* Stats Row */}
      <div className="col-span-12 grid grid-cols-4 gap-1">
        {legislativeStats && (
          <>
            <MiniMetric label="Bills Tracked" value={legislativeStats.totalTracked} color="yellow" />
            <MiniMetric label="Deadlines" value={legislativeStats.upcomingDeadlines} color="orange" />
            <MiniMetric label="Pro-Worker" value={legislativeStats.positiveImpact} color="green" />
            <MiniMetric label="Anti-Worker" value={legislativeStats.negativeImpact} color="red" />
          </>
        )}
      </div>

      {/* Bills Table */}
      <div className="col-span-12">
        <ScrollCard title="Tracked Bills" icon={Gavel} color="text-yellow-400" height="h-[calc(100%-40px)]" count={bills.length}
          actions={<button className="text-[10px] text-yellow-400 hover:text-yellow-300">+ Track Bill</button>}>
          <table className="w-full text-xs">
            <thead className="bg-[#0d1117] sticky top-0">
              <tr className="text-gray-500">
                <th className="text-left p-1.5">Bill</th>
                <th className="text-left p-1.5">State</th>
                <th className="text-left p-1.5">Title</th>
                <th className="text-left p-1.5">Categories</th>
                <th className="text-left p-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(bill => (
                <tr key={bill.id} className="border-t border-[#21262d] hover:bg-[#21262d]">
                  <td className="p-1.5 text-white font-medium">{bill.billNumber}</td>
                  <td className="p-1.5 text-gray-400">{bill.state}</td>
                  <td className="p-1.5 text-gray-400 truncate max-w-[250px]">{bill.title}</td>
                  <td className="p-1.5">
                    <div className="flex gap-0.5 flex-wrap">
                      {bill.category.slice(0, 2).map(cat => (
                        <span key={cat} className="px-1 py-0.5 bg-[#21262d] text-[9px] text-gray-400 rounded">{cat}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-1.5">
                    <span className={`px-1 py-0.5 text-[9px] rounded ${
                      bill.status === 'signed' ? 'bg-green-900/30 text-green-400' :
                      bill.status === 'in-committee' ? 'bg-blue-900/30 text-blue-400' :
                      'bg-gray-900/30 text-gray-400'
                    }`}>{bill.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollCard>
      </div>
    </div>
  );

  const renderCorridors = () => (
    <div className="grid grid-cols-12 gap-2 h-full">
      {/* Stats Row */}
      <div className="col-span-12 grid grid-cols-4 gap-1">
        {corridorStats && (
          <>
            <MiniMetric label="Facilities" value={corridorStats.totalFacilities} color="blue" />
            <MiniMetric label="Workers" value={`${(corridorStats.totalWorkers/1000).toFixed(0)}k`} color="green" />
            <MiniMetric label="Avg Union" value={`${corridorStats.avgUnionDensity}%`} color="cyan" />
            <MiniMetric label="High Priority" value={corridorStats.highPriorityCount} color="red" />
          </>
        )}
      </div>

      {/* Split View */}
      <div className="col-span-8">
        <ScrollCard title="Data Center Corridors" icon={Map} color="text-cyan-400" height="h-[calc(100%-40px)]" count={DATA_CENTER_CORRIDORS.length}>
          <table className="w-full text-xs">
            <thead className="bg-[#0d1117] sticky top-0">
              <tr className="text-gray-500">
                <th className="text-left p-1.5">Corridor</th>
                <th className="text-left p-1.5">Facilities</th>
                <th className="text-left p-1.5">Workers</th>
                <th className="text-left p-1.5">Union %</th>
                <th className="text-left p-1.5">IBEW</th>
                <th className="text-left p-1.5">Priority</th>
              </tr>
            </thead>
            <tbody>
              {DATA_CENTER_CORRIDORS.map(corridor => (
                <tr key={corridor.id} className="border-t border-[#21262d] hover:bg-[#21262d]">
                  <td className="p-1.5 text-white">{corridor.name}</td>
                  <td className="p-1.5 text-gray-400">{corridor.facilityCount}</td>
                  <td className="p-1.5 text-gray-400">{corridor.totalWorkers.toLocaleString()}</td>
                  <td className="p-1.5 text-gray-400">{corridor.unionDensity}%</td>
                  <td className="p-1.5 text-gray-400">Local {corridor.ibewLocals.join(', ')}</td>
                  <td className="p-1.5">
                    <span className={`px-1 py-0.5 text-[9px] rounded ${
                      corridor.organizingPriority === 'high' ? 'bg-red-900/30 text-red-400' :
                      corridor.organizingPriority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-green-900/30 text-green-400'
                    }`}>{corridor.organizingPriority}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollCard>
      </div>

      {/* IBEW Locals */}
      <div className="col-span-4">
        <ScrollCard title="IBEW Locals" icon={Zap} color="text-yellow-400" height="h-[calc(100%-40px)]" count={IBEW_LOCALS.filter(l => l.dataCenterExperience).length}>
          <div className="p-1 space-y-1">
            {IBEW_LOCALS.filter(l => l.dataCenterExperience).map(local => (
              <div key={local.localNumber} className="p-1.5 bg-[#0d1117] rounded text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Local {local.localNumber}</span>
                  {local.memberCount && <span className="text-[10px] text-gray-500">{local.memberCount.toLocaleString()} mbrs</span>}
                </div>
                <div className="text-[10px] text-gray-400 truncate">{local.jurisdiction.join(', ')}</div>
                {local.notes && <div className="text-[9px] text-gray-500 mt-0.5 line-clamp-1">{local.notes}</div>}
              </div>
            ))}
          </div>
        </ScrollCard>
      </div>
    </div>
  );

  const renderCoalition = () => (
    <div className="grid grid-cols-12 gap-2 h-full">
      {/* Stats Row */}
      <div className="col-span-12 grid grid-cols-4 gap-1">
        {coalitionStats && (
          <>
            <MiniMetric label="Partners" value={coalitionStats.totalPartners} color="pink" />
            <MiniMetric label="Watchlists" value={coalitionStats.activeWatchlists} color="blue" />
            <MiniMetric label="Campaigns" value={coalitionStats.activeCampaigns} color="yellow" />
            <MiniMetric label="Data Sharing" value={coalitionStats.byEngagement['data-sharing'] || 0} color="green" />
          </>
        )}
      </div>

      {/* Partners Table */}
      <div className="col-span-12">
        <ScrollCard title="Coalition Partners" icon={Handshake} color="text-pink-400" height="h-[calc(100%-40px)]" count={partners.length}
          actions={<button className="text-[10px] text-pink-400 hover:text-pink-300">+ Add Partner</button>}>
          <table className="w-full text-xs">
            <thead className="bg-[#0d1117] sticky top-0">
              <tr className="text-gray-500">
                <th className="text-left p-1.5">Organization</th>
                <th className="text-left p-1.5">Type</th>
                <th className="text-left p-1.5">Focus Areas</th>
                <th className="text-left p-1.5">Scope</th>
                <th className="text-left p-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {partners.map(partner => (
                <tr key={partner.id} className="border-t border-[#21262d] hover:bg-[#21262d]">
                  <td className="p-1.5">
                    <div className="text-white">{partner.name}</div>
                    <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{partner.description}</div>
                  </td>
                  <td className="p-1.5 text-gray-400">{partner.type}</td>
                  <td className="p-1.5">
                    <div className="flex gap-0.5 flex-wrap">
                      {partner.focusAreas.slice(0, 2).map(area => (
                        <span key={area} className="px-1 py-0.5 bg-[#21262d] text-[9px] text-gray-400 rounded">{area}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-1.5 text-gray-400 text-[10px]">{partner.geographicScope}</td>
                  <td className="p-1.5">
                    <span className={`px-1 py-0.5 text-[9px] rounded ${
                      partner.engagementStatus === 'active-partner' ? 'bg-green-900/30 text-green-400' :
                      partner.engagementStatus === 'data-sharing' ? 'bg-blue-900/30 text-blue-400' :
                      'bg-gray-900/30 text-gray-400'
                    }`}>{partner.engagementStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollCard>
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
      <div className="h-full bg-[#0d1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0d1117] flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-3 py-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-bold text-white">Organizer Command Center</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 bg-[#21262d] text-white rounded text-xs flex items-center gap-1 hover:bg-[#30363d]">
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* Compact Navigation Tabs */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-2 shrink-0">
        <div className="flex gap-0.5 py-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#21262d] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#21262d]/50'
              }`}
            >
              <tab.icon className={`w-3 h-3 ${activeTab === tab.id ? tab.color : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content - Takes remaining space */}
      <div className="flex-1 p-2 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};

// === Helper Components ===

const MiniMetric: React.FC<{
  label: string;
  value: number | string;
  color: string;
}> = ({ label, value, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
    pink: 'text-pink-400',
  };

  return (
    <div className="bg-[#161b22] rounded border border-[#30363d] px-2 py-1.5 flex items-center justify-between">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className={`text-sm font-bold ${colorClasses[color]}`}>{value}</span>
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
    <span className={`px-1 py-0.5 text-[9px] rounded ${statusStyles[status]}`}>
      {status}
    </span>
  );
};
