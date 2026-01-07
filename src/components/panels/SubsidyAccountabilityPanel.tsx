/**
 * Subsidy Accountability Panel
 * 
 * Exposes the gap between subsidy promises and reality.
 * Powered by Good Jobs First research and Subsidy Tracker data.
 * 
 * Key Mission: Help organizers answer "Did they deliver on job promises?"
 */

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  AlertTriangle,
  Users,
  Building2,
  TrendingDown,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  MapPin,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  HelpCircle,
  Target,
  Zap,
} from 'lucide-react';
import {
  KNOWN_SUBSIDIES,
  STATE_SUBSIDY_PROFILES,
  GJF_INTEGRATION_STATUS,
  calculateSubsidyGaps,
  getTotalSubsidiesByCompany,
  getAccountabilityMetrics,
  getStateTransparencyScore,
  type SubsidyRecord,
  type SubsidyGap,
  type StateSubsidyProfile,
} from '../../integrations/goodJobsFirst';

// === Helper Functions ===

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-emerald-400 bg-emerald-500/20';
    case 'B': return 'text-blue-400 bg-blue-500/20';
    case 'C': return 'text-amber-400 bg-amber-500/20';
    case 'D': return 'text-orange-400 bg-orange-500/20';
    case 'F': return 'text-red-400 bg-red-500/20';
    default: return 'text-slate-400 bg-slate-500/20';
  }
}

// === Sub-Components ===

const MetricCard: React.FC<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
  highlight?: 'danger' | 'warning' | 'success' | 'info';
}> = ({ icon, value, label, sublabel, highlight }) => {
  const highlightStyles = {
    danger: 'border-red-500/30 bg-red-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    success: 'border-emerald-500/30 bg-emerald-500/5',
    info: 'border-cyan-500/30 bg-cyan-500/5',
  };

  return (
    <div className={`p-3 rounded-lg border ${highlight ? highlightStyles[highlight] : 'border-slate-700/50 bg-slate-800/30'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-500">{icon}</span>
        <span className="text-[10px] text-slate-500 uppercase">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sublabel && <div className="text-[10px] text-slate-500 mt-0.5">{sublabel}</div>}
    </div>
  );
};

const SubsidyRecordCard: React.FC<{
  record: SubsidyRecord;
  expanded: boolean;
  onToggle: () => void;
}> = ({ record, expanded, onToggle }) => {
  const gap = record.jobs.promised && record.jobs.actual !== undefined
    ? record.jobs.promised - record.jobs.actual
    : null;
  
  const hasComplianceIssue = gap !== null && gap > 0;

  return (
    <div className={`border rounded-lg overflow-hidden ${
      hasComplianceIssue ? 'border-red-500/30' : 'border-slate-700/50'
    }`}>
      <button
        onClick={onToggle}
        className="w-full p-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{record.company}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                record.compliance.status === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' :
                record.compliance.status === 'non-compliant' ? 'bg-red-500/20 text-red-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {record.compliance.status.toUpperCase()}
              </span>
              {hasComplianceIssue && (
                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px] font-medium flex items-center gap-1">
                  <AlertTriangle size={10} />
                  GAP: -{gap} jobs
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-2">
              <span>{record.subsidy.state}</span>
              <span>•</span>
              <span>{record.subsidy.program}</span>
              <span>•</span>
              <span>{record.subsidy.year}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-cyan-400 font-mono font-bold">{formatCurrency(record.subsidy.amount)}</div>
          <div className="text-[10px] text-slate-500">{record.subsidy.type}</div>
        </div>
      </button>

      {expanded && (
        <div className="p-3 border-t border-slate-700/50 bg-slate-900/50 space-y-3">
          {/* Job Details */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-1">Jobs Promised</div>
              <div className="text-white font-mono">
                {record.jobs.promised?.toLocaleString() || '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-1">Jobs Actual</div>
              <div className={`font-mono ${
                record.jobs.actual !== undefined 
                  ? (record.jobs.actual < (record.jobs.promised || 0) ? 'text-red-400' : 'text-emerald-400')
                  : 'text-slate-500'
              }`}>
                {record.jobs.actual?.toLocaleString() || 'Not disclosed'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-1">Cost Per Job</div>
              <div className="text-amber-400 font-mono">
                {record.jobs.promised 
                  ? formatCurrency(record.subsidy.amount / record.jobs.promised)
                  : '—'}
              </div>
            </div>
          </div>

          {/* Wage Info */}
          {(record.jobs.wagePromise || record.jobs.actualWage) && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/50">
              <div>
                <div className="text-[10px] text-slate-500 uppercase mb-1">Wage Promise</div>
                <div className="text-white font-mono">
                  {record.jobs.wagePromise ? `$${record.jobs.wagePromise}/hr` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase mb-1">Actual Wage</div>
                <div className={`font-mono ${
                  record.jobs.actualWage && record.jobs.wagePromise && record.jobs.actualWage < record.jobs.wagePromise
                    ? 'text-red-400' : 'text-white'
                }`}>
                  {record.jobs.actualWage ? `$${record.jobs.actualWage}/hr` : 'Not disclosed'}
                </div>
              </div>
            </div>
          )}

          {/* Source */}
          <div className="pt-2 border-t border-slate-700/50 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Source: {record.source.agency}</span>
              {record.source.url && (
                <a
                  href={record.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  View Source <ExternalLink size={10} />
                </a>
              )}
            </div>
            {record.source.notes && (
              <p className="text-amber-400/80 mt-1 text-[10px]">⚠️ {record.source.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StateTransparencyCard: React.FC<{
  profile: StateSubsidyProfile;
  expanded: boolean;
  onToggle: () => void;
}> = ({ profile, expanded, onToggle }) => {
  const { score, grade, factors } = getStateTransparencyScore(profile.state);

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-slate-500" />
            <span className="font-medium text-white">{profile.state}</span>
            <span className={`px-2 py-0.5 rounded font-bold text-xs ${getGradeColor(grade)}`}>
              {grade}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {profile.estimatedAnnualCost && (
            <span className="text-amber-400 font-mono text-sm">
              {formatCurrency(profile.estimatedAnnualCost)}/yr
            </span>
          )}
          <div className="flex items-center gap-1">
            {profile.disclosesRecipients ? <Eye size={12} className="text-emerald-400" /> : <EyeOff size={12} className="text-red-400" />}
            {profile.disclosesActualJobs ? <CheckCircle size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}
            {profile.disclosesWages ? <DollarSign size={12} className="text-emerald-400" /> : <DollarSign size={12} className="text-red-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="p-3 border-t border-slate-700/50 bg-slate-900/50 space-y-3">
          {/* Transparency Checklist */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 uppercase mb-2">Transparency Checklist</div>
            {factors.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {f.met ? (
                  <CheckCircle size={12} className="text-emerald-400" />
                ) : (
                  <XCircle size={12} className="text-red-400" />
                )}
                <span className={f.met ? 'text-slate-300' : 'text-slate-500'}>{f.factor}</span>
              </div>
            ))}
          </div>

          {/* Programs */}
          {profile.programs.length > 0 && (
            <div className="pt-2 border-t border-slate-700/50">
              <div className="text-[10px] text-slate-500 uppercase mb-2">Programs</div>
              {profile.programs.map((p, i) => (
                <div key={i} className="p-2 bg-slate-800/50 rounded mb-2 text-xs">
                  <div className="font-medium text-white">{p.name}</div>
                  <div className="text-slate-400 mt-1">{p.description}</div>
                  {p.jobRequirements && (
                    <div className="flex gap-2 mt-2">
                      {p.jobRequirements.minimumJobs && (
                        <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                          Min {p.jobRequirements.minimumJobs} jobs
                        </span>
                      )}
                      {p.jobRequirements.wageThreshold && (
                        <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                          ${p.jobRequirements.wageThreshold}/hr threshold
                        </span>
                      )}
                      {p.jobRequirements.clawbackProvisions && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 rounded text-emerald-400">
                          Has clawback
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Compliance Gaps */}
          {profile.complianceGaps.length > 0 && (
            <div className="pt-2 border-t border-slate-700/50">
              <div className="text-[10px] text-slate-500 uppercase mb-2">Compliance Gaps</div>
              <ul className="space-y-1">
                {profile.complianceGaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-400">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// === Main Component ===

type TabId = 'overview' | 'subsidies' | 'states' | 'gaps';

export const SubsidyAccountabilityPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [expandedState, setExpandedState] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const metrics = useMemo(() => getAccountabilityMetrics(), []);
  const gaps = useMemo(() => calculateSubsidyGaps(), []);
  const companyTotals = useMemo(() => getTotalSubsidiesByCompany(), []);

  // Filter subsidies
  const filteredSubsidies = useMemo(() => {
    return KNOWN_SUBSIDIES.filter(s => {
      const matchesSearch = searchQuery === '' ||
        s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subsidy.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subsidy.program.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesState = stateFilter === 'all' || s.subsidy.state === stateFilter;
      const matchesCompany = companyFilter === 'all' || 
        s.company === companyFilter || 
        s.parentCompany === companyFilter;
      return matchesSearch && matchesState && matchesCompany;
    });
  }, [searchQuery, stateFilter, companyFilter]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Target size={12} /> },
    { id: 'subsidies', label: 'Subsidies', icon: <DollarSign size={12} /> },
    { id: 'states', label: 'States', icon: <MapPin size={12} /> },
    { id: 'gaps', label: 'Gaps', icon: <AlertTriangle size={12} /> },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-red-500/20">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Subsidy Accountability</h2>
              <p className="text-xs text-slate-500">Powered by Good Jobs First research</p>
            </div>
          </div>
          <a
            href="https://www.goodjobsfirst.org/subsidy-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs flex items-center gap-1.5"
          >
            <FileText size={12} />
            Subsidy Tracker
            <ExternalLink size={10} />
          </a>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-5 gap-3">
          <MetricCard
            icon={<DollarSign size={14} />}
            value={formatCurrency(metrics.totalSubsidyAmount)}
            label="Total Tracked"
            highlight="info"
          />
          <MetricCard
            icon={<Users size={14} />}
            value={`$${(metrics.averageCostPerJob / 1000000).toFixed(1)}M`}
            label="Cost/Job"
            sublabel="Avg subsidy per job"
            highlight="warning"
          />
          <MetricCard
            icon={<Building2 size={14} />}
            value={`${metrics.statesDisclosing}/${metrics.statesWithPrograms}`}
            label="Disclose"
            sublabel="States disclosing"
          />
          <MetricCard
            icon={<AlertTriangle size={14} />}
            value={metrics.gapsIdentified}
            label="Gaps Found"
            sublabel="Verified shortfalls"
            highlight="danger"
          />
          <MetricCard
            icon={<Zap size={14} />}
            value={metrics.totalTracked}
            label="Records"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-amber-500 bg-slate-800/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Key Finding Alert */}
            <div className="p-4 bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-red-500/30 rounded-lg">
              <h3 className="font-medium text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} />
                Critical Finding from Good Jobs First (March 2025)
              </h3>
              <ul className="space-y-1 text-sm text-white">
                <li>• <strong>NO state</strong> reports both promised AND actual jobs created</li>
                <li>• Texas & Virginia lose <strong>~$1B/year each</strong> in foregone revenue</li>
                <li>• Subsidies average <strong>$1.4-2M per permanent job</strong></li>
                <li>• States lose <strong>52-70 cents on every dollar</strong> subsidized</li>
                <li>• Only Nevada discloses wages: <strong>~$31/hr</strong> (below industry claims)</li>
              </ul>
            </div>

            {/* Company Totals */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-slate-500 uppercase">Top Subsidy Recipients</h3>
              {Object.entries(companyTotals)
                .sort(([, a], [, b]) => b.total - a.total)
                .slice(0, 5)
                .map(([company, data]) => (
                  <div key={company} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <div>
                      <div className="font-medium text-white">{company}</div>
                      <div className="text-[10px] text-slate-500">
                        {data.count} subsidies • {data.states.join(', ')}
                      </div>
                    </div>
                    <div className="text-cyan-400 font-mono font-bold">
                      {formatCurrency(data.total)}
                    </div>
                  </div>
                ))}
            </div>

            {/* Integration Status */}
            <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
              <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Integration Status</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Data Source</span>
                  <span className="text-white">{GJF_INTEGRATION_STATUS.dataSource}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Records Tracked</span>
                  <span className="text-white">{GJF_INTEGRATION_STATUS.recordsTracked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Updated</span>
                  <span className="text-white">{GJF_INTEGRATION_STATUS.lastUpdated}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subsidies' && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search subsidies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none"
              >
                <option value="all">All States</option>
                {[...new Set(KNOWN_SUBSIDIES.map(s => s.subsidy.state))].sort().map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {/* Subsidy List */}
            <div className="space-y-2">
              {filteredSubsidies.map(record => (
                <SubsidyRecordCard
                  key={record.id}
                  record={record}
                  expanded={expandedRecord === record.id}
                  onToggle={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'states' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-4">
              State transparency grades based on disclosure requirements and accountability mechanisms.
            </p>
            {STATE_SUBSIDY_PROFILES.map(profile => (
              <StateTransparencyCard
                key={profile.state}
                profile={profile}
                expanded={expandedState === profile.state}
                onToggle={() => setExpandedState(expandedState === profile.state ? null : profile.state)}
              />
            ))}
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-4">
              Identified gaps between subsidy promises and verified outcomes.
            </p>
            
            {gaps.filter(g => g.status === 'verified-gap').length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-red-400 uppercase flex items-center gap-2">
                  <AlertTriangle size={12} />
                  Verified Gaps
                </h3>
                {gaps.filter(g => g.status === 'verified-gap').map((gap, i) => (
                  <div key={i} className="p-3 bg-red-500/5 border border-red-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{gap.company}</span>
                      <span className="text-red-400 font-mono">
                        -{gap.gapAmount} jobs ({gap.gapPercentage?.toFixed(0)}% shortfall)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Subsidy:</span>{' '}
                        <span className="text-white">{formatCurrency(gap.subsidyAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Promised:</span>{' '}
                        <span className="text-white">{gap.jobsPromised}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Actual:</span>{' '}
                        <span className="text-red-400">{gap.jobsActual}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-red-500/20 text-xs text-amber-400">
                      Real cost per job: {formatCurrency(gap.costPerJob!)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-medium text-amber-400 uppercase flex items-center gap-2">
                <HelpCircle size={12} />
                Data Unavailable (Suspected Gaps)
              </h3>
              {gaps.filter(g => g.status === 'data-unavailable').map((gap, i) => (
                <div key={i} className="p-3 bg-amber-500/5 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{gap.company} ({gap.state})</span>
                    <span className="text-amber-400 text-xs">No actual job data disclosed</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Subsidy: {formatCurrency(gap.subsidyAmount)} • Promised: {gap.jobsPromised} jobs
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubsidyAccountabilityPanel;

