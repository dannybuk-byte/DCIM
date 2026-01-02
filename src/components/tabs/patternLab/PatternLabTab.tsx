import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { 
  AlertTriangle, BarChart3, Download, Filter, Pin, RefreshCw, 
  Search, Sparkles, TrendingUp, X, Zap, ChevronDown, ArrowUpDown,
  Target, Shield, AlertCircle, Info
} from 'lucide-react';
import type { Facility } from '../../../types';
import { VirtualList } from '../../shared/VirtualList';
import { ErrorBoundary } from '../../ErrorBoundary';
import { db } from '../../../db/database';
import { usePatternLab } from '../../../hooks/usePatternLab';
import type { PatternFinding, ScenarioSettings } from '../../../analyzers/patternLab/types';
import { defaultScenario } from '../../../analyzers/patternLab/engine';
import { ProgressBar, ProgressRing, Spinner, PulseLoader } from '../../shared/ProgressIndicators';

const COLORS = {
  bg: '#0a0e17',
  bgCard: '#0d1219',
  text: '#e8eef6',
  textMuted: '#5a6d8a',
  red: '#ff4757',
  yellow: '#ffa502',
  green: '#2ed573',
  cyan: '#00d2d3',
  purple: '#a855f7',
};

// Preset scenarios for quick selection
const SCENARIO_PRESETS: { name: string; icon: React.ReactNode; description: string; settings: ScenarioSettings }[] = [
  {
    name: 'Conservative',
    icon: <Shield className="w-4 h-4" />,
    description: 'High thresholds, fewer findings',
    settings: {
      minSubsidyGap: 5_000_000,
      minIssuesCount: 4,
      maxAuditRecencyDays: 90,
      operatorCascadeMinFacilities: 20,
      operatorCascadeMinNonComplianceRate: 0.5,
      sensitivity: 0.35,
    },
  },
  {
    name: 'Balanced',
    icon: <Target className="w-4 h-4" />,
    description: 'Default configuration',
    settings: defaultScenario(),
  },
  {
    name: 'Aggressive',
    icon: <Zap className="w-4 h-4" />,
    description: 'Low thresholds, surface more',
    settings: {
      minSubsidyGap: 250_000,
      minIssuesCount: 1,
      maxAuditRecencyDays: 365,
      operatorCascadeMinFacilities: 5,
      operatorCascadeMinNonComplianceRate: 0.2,
      sensitivity: 0.8,
    },
  },
  {
    name: 'Hyperscaler Focus',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Target large operators',
    settings: {
      minSubsidyGap: 2_000_000,
      minIssuesCount: 2,
      maxAuditRecencyDays: 180,
      operatorCascadeMinFacilities: 50,
      operatorCascadeMinNonComplianceRate: 0.25,
      sensitivity: 0.6,
    },
  },
];

type SortOption = 'score' | 'operator' | 'severity' | 'gap';
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function severityColor(sev: string) {
  if (sev === 'critical') return COLORS.red;
  if (sev === 'high') return COLORS.yellow;
  if (sev === 'medium') return COLORS.cyan;
  return COLORS.textMuted;
}

function downloadJson(obj: any, filename: string) {
  try {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // ignore
  }
}

// Mini horizontal bar chart component
const MiniBarChart = memo(function MiniBarChart({ 
  data, 
  maxBars = 6 
}: { 
  data: { label: string; value: number; color?: string }[]; 
  maxBars?: number;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxBars);
  const maxVal = Math.max(...sorted.map(d => d.value), 1);
  
  return (
    <div className="space-y-1.5">
      {sorted.map((d, i) => (
        <div key={d.label} className="flex items-center gap-2">
          <div className="w-20 text-[10px] text-gray-400 truncate" title={d.label}>
            {d.label}
          </div>
          <div className="flex-1 h-4 bg-gray-800/50 rounded overflow-hidden">
            <div 
              className="h-full rounded transition-all duration-500 ease-out"
              style={{ 
                width: `${(d.value / maxVal) * 100}%`,
                background: d.color || `hsl(${200 + i * 25}, 70%, 50%)`,
              }}
            />
          </div>
          <div className="w-8 text-[10px] text-gray-300 text-right font-mono">
            {d.value}
          </div>
        </div>
      ))}
    </div>
  );
});

// Severity donut chart component
const SeverityDonut = memo(function SeverityDonut({ 
  critical, 
  high, 
  medium, 
  low,
  size = 80 
}: { 
  critical: number; 
  high: number; 
  medium: number; 
  low: number;
  size?: number;
}) {
  const total = critical + high + medium + low || 1;
  const segments = [
    { value: critical, color: COLORS.red, label: 'Critical' },
    { value: high, color: COLORS.yellow, label: 'High' },
    { value: medium, color: COLORS.cyan, label: 'Medium' },
    { value: low, color: COLORS.textMuted, label: 'Low' },
  ].filter(s => s.value > 0);
  
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {segments.map((seg, i) => {
          const segmentLength = (seg.value / total) * circumference;
          const segment = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={12}
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-offset}
              className="transition-all duration-500 ease-out"
            />
          );
          offset += segmentLength;
          return segment;
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{total}</div>
          <div className="text-[9px] text-gray-500">findings</div>
        </div>
      </div>
    </div>
  );
});

// Filter chip component
const FilterChip = memo(function FilterChip({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200
        flex items-center gap-1.5 border
        ${active 
          ? 'border-transparent' 
          : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:bg-gray-800/50'
        }
      `}
      style={active ? { 
        background: `${color}22`, 
        color: color,
        borderColor: `${color}44`,
        boxShadow: `0 0 12px ${color}22`,
      } : undefined}
    >
      <span>{label}</span>
      <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${active ? 'bg-white/10' : 'bg-gray-800'}`}>
        {count}
      </span>
    </button>
  );
});

// Enhanced animated status indicator with progress ring
const StatusPulse = memo(function StatusPulse({ status, progress }: { status: 'idle' | 'running' | 'error' | 'ready'; progress?: number }) {
  const colors: Record<string, string> = {
    idle: COLORS.textMuted,
    running: COLORS.cyan,
    error: COLORS.red,
    ready: COLORS.green,
  };
  const labels: Record<string, string> = {
    idle: 'Idle',
    running: 'Analyzing…',
    error: 'Error',
    ready: 'Ready',
  };
  
  return (
    <div className="flex items-center gap-2">
      {status === 'running' ? (
        <div className="flex items-center gap-2">
          <ProgressRing 
            value={progress ?? 50} 
            size={20} 
            strokeWidth={2} 
            color={COLORS.cyan}
            showLabel={false}
          />
          <PulseLoader size="sm" color={COLORS.cyan} />
          <span className="text-[11px] text-cyan-400">
            Analyzing patterns...
          </span>
        </div>
      ) : (
        <>
          <div className="relative">
            <div 
              className="w-2 h-2 rounded-full transition-colors duration-300"
              style={{ background: colors[status] }}
            />
          </div>
          <span className="text-[11px]" style={{ color: colors[status] }}>
            {labels[status]}
          </span>
        </>
      )}
    </div>
  );
});

export const PatternLabTab = memo(function PatternLabTab({ facilities }: { facilities: Facility[] }) {
  const [isPending, startTransition] = useTransition();
  const [scenario, setScenario] = useState<ScenarioSettings>(defaultScenario());
  const [selected, setSelected] = useState<PatternFinding | null>(null);
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [showPresets, setShowPresets] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Load/persist scenario (IndexedDB via Dexie settings)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get('patternLab:scenario');
        const v = row?.value as any;
        if (cancelled || !v || typeof v !== 'object') return;
        setScenario((prev) => ({
          minSubsidyGap: typeof v.minSubsidyGap === 'number' ? v.minSubsidyGap : prev.minSubsidyGap,
          minIssuesCount: typeof v.minIssuesCount === 'number' ? v.minIssuesCount : prev.minIssuesCount,
          maxAuditRecencyDays: typeof v.maxAuditRecencyDays === 'number' ? v.maxAuditRecencyDays : prev.maxAuditRecencyDays,
          operatorCascadeMinFacilities:
            typeof v.operatorCascadeMinFacilities === 'number' ? v.operatorCascadeMinFacilities : prev.operatorCascadeMinFacilities,
          operatorCascadeMinNonComplianceRate:
            typeof v.operatorCascadeMinNonComplianceRate === 'number'
              ? v.operatorCascadeMinNonComplianceRate
              : prev.operatorCascadeMinNonComplianceRate,
          sensitivity: typeof v.sensitivity === 'number' ? v.sensitivity : prev.sensitivity,
        }));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    db.settings.put({ key: 'patternLab:scenario', value: scenario }).catch(() => {});
  }, [scenario]);

  const { result, status, error, run } = usePatternLab({
    facilities,
    scenario,
    enabled: facilities.length > 0,
  });

  // Auto-run with debounce when inputs change
  useEffect(() => {
    if (facilities.length === 0) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => run(), 180);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    };
  }, [facilities.length, run, scenario]);

  // Compute severity counts
  const severityCounts = useMemo(() => {
    const fs = result?.findings || [];
    return {
      all: fs.length,
      critical: fs.filter(f => f.severity === 'critical').length,
      high: fs.filter(f => f.severity === 'high').length,
      medium: fs.filter(f => f.severity === 'medium').length,
      low: fs.filter(f => f.severity === 'low').length,
    };
  }, [result?.findings]);

  // Compute unique operators from findings
  const operatorOptions = useMemo(() => {
    const fs = result?.findings || [];
    const ops = new Set<string>();
    fs.forEach(f => f.affectedOperators.forEach(op => ops.add(op)));
    return ['all', ...Array.from(ops).sort()];
  }, [result?.findings]);

  // Operator breakdown for chart
  const operatorChartData = useMemo(() => {
    const topOps = result?.summary.topOperators || [];
    return topOps.slice(0, 8).map((op, i) => ({
      label: op.operator.length > 12 ? op.operator.slice(0, 12) + '…' : op.operator,
      value: op.findings,
      color: [COLORS.red, COLORS.yellow, COLORS.cyan, COLORS.purple, COLORS.green][i % 5],
    }));
  }, [result?.summary.topOperators]);

  // Filtered and sorted findings
  const filteredFindings = useMemo(() => {
    let fs = result?.findings || [];
    
    // Text search
    const q = query.trim().toLowerCase();
    if (q) {
      fs = fs.filter((f) => 
        (f.title + ' ' + f.description + ' ' + f.affectedOperators.join(' ')).toLowerCase().includes(q)
      );
    }
    
    // Severity filter
    if (severityFilter !== 'all') {
      fs = fs.filter(f => f.severity === severityFilter);
    }
    
    // Operator filter
    if (operatorFilter !== 'all') {
      fs = fs.filter(f => f.affectedOperators.includes(operatorFilter));
    }
    
    // Sorting
    const sorted = [...fs];
    switch (sortBy) {
      case 'score':
        sorted.sort((a, b) => b.score - a.score);
        break;
      case 'operator':
        sorted.sort((a, b) => a.affectedOperators[0]?.localeCompare(b.affectedOperators[0] || '') || 0);
        break;
      case 'severity':
        const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        sorted.sort((a, b) => (sevOrder[a.severity as keyof typeof sevOrder] || 4) - (sevOrder[b.severity as keyof typeof sevOrder] || 4));
        break;
    }
    
    return sorted;
  }, [query, result?.findings, severityFilter, operatorFilter, sortBy]);

  const pinFinding = useCallback(async (f: PatternFinding) => {
    try {
      await db.researchNotes.add({
        title: `[PatternLab] ${f.title}`,
        content: JSON.stringify(
          {
            createdAt: f.createdAt,
            type: f.type,
            severity: f.severity,
            score: f.score,
            description: f.description,
            evidence: f.evidence,
            explain: f.explain,
            recommendations: f.recommendations,
            limitations: f.limitations,
          },
          null,
          2
        ),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['pattern-lab', 'finding', f.type, f.severity],
        relatedFacilities: f.affectedFacilities,
        category: 'compliance',
      });
    } catch {
      // ignore
    }
  }, []);

  const setScenarioPartial = (patch: Partial<ScenarioSettings>) => {
    startTransition(() => setScenario((prev) => ({ ...prev, ...patch })));
  };

  const applyPreset = (preset: typeof SCENARIO_PRESETS[0]) => {
    startTransition(() => setScenario(preset.settings));
    setShowPresets(false);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-1.5 p-1">
        {/* Header - Ultra-compact */}
        <div className="flex items-center justify-between gap-2 bg-gray-900/50 rounded px-2 py-1 border border-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">🔬</span>
            <span className="text-[11px] font-bold text-white">Pattern Lab</span>
            <StatusPulse status={status === 'running' ? 'running' : status === 'error' ? 'error' : result ? 'ready' : 'idle'} />
            <span className="text-[9px] text-gray-500">• {facilities.length.toLocaleString()} fac</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="px-2 py-1 rounded text-[10px] font-semibold border border-purple-500/40 bg-gray-900 text-purple-300 hover:bg-gray-800 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Presets
                <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
              </button>
              {showPresets && (
                <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-50 overflow-hidden">
                  {SCENARIO_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="w-full px-2 py-1.5 text-left hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-purple-400 text-[10px]">{preset.icon}</span>
                        <span className="text-[11px] font-semibold text-white">{preset.name}</span>
                      </div>
                      <div className="text-[9px] text-gray-500">{preset.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => downloadJson(result, 'dcim-patternlab-results.json')}
              disabled={!result}
              className="px-2 py-1 rounded text-[10px] font-semibold border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
          </div>
        </div>

        {/* Ultra-Dense Analytics Strip */}
        <div className="grid grid-cols-6 gap-1">
          {/* Severity Donut - Compact */}
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-2 flex items-center gap-2">
            <SeverityDonut 
              critical={severityCounts.critical}
              high={severityCounts.high}
              medium={severityCounts.medium}
              low={severityCounts.low}
              size={56}
            />
            <div className="space-y-0.5 text-[10px]">
              {[
                { label: 'Crit', count: severityCounts.critical, color: COLORS.red },
                { label: 'High', count: severityCounts.high, color: COLORS.yellow },
                { label: 'Med', count: severityCounts.medium, color: COLORS.cyan },
                { label: 'Low', count: severityCounts.low, color: COLORS.textMuted },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-gray-500">{s.label}</span>
                  <span className="font-bold text-white">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Operator Breakdown - Denser */}
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-2 col-span-2">
            <div className="flex items-center gap-1 mb-1">
              <BarChart3 className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-semibold text-white">Top Operators</span>
            </div>
            {operatorChartData.length > 0 ? (
              <MiniBarChart data={operatorChartData} maxBars={5} />
            ) : (
              <div className="text-[10px] text-gray-500 py-2 text-center">No data</div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-2">
            <div className="text-[10px] font-semibold text-white mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              Summary
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              <span className="text-gray-500">Avg Score</span>
              <span className="font-bold text-white text-right">
                {result?.findings?.length ? Math.round((result.findings.reduce((a, f) => a + f.score, 0) / result.findings.length) * 100) : '—'}
              </span>
              <span className="text-gray-500">Operators</span>
              <span className="font-bold text-white text-right">{result?.summary.topOperators?.length ?? '—'}</span>
              <span className="text-gray-500">Corr</span>
              <span className="font-bold text-green-400 text-right">{result?.correlations?.filter(c => c.actionable).length ?? '—'}</span>
            </div>
          </div>

          {/* Type Breakdown Mini */}
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-2">
            <div className="text-[10px] font-semibold text-white mb-1">By Type</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
              {result?.findings?.reduce((acc, f) => {
                acc[f.type] = (acc[f.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>) && Object.entries(
                result?.findings?.reduce((acc, f) => {
                  acc[f.type] = (acc[f.type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>) || {}
              ).slice(0, 4).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-gray-500 truncate">{type.replace(/_/g, ' ').slice(0, 10)}</span>
                  <span className="font-bold text-cyan-400">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence Distribution */}
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-2">
            <div className="text-[10px] font-semibold text-white mb-1">Confidence</div>
            {result?.findings?.length ? (
              <div className="space-y-0.5 text-[9px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">High (&gt;80%)</span>
                  <span className="font-bold text-green-400">
                    {result.findings.filter(f => f.confidence > 0.8).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Med (50-80%)</span>
                  <span className="font-bold text-yellow-400">
                    {result.findings.filter(f => f.confidence > 0.5 && f.confidence <= 0.8).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Low (&lt;50%)</span>
                  <span className="font-bold text-gray-400">
                    {result.findings.filter(f => f.confidence <= 0.5).length}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-gray-500 text-center py-1">—</div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded border border-red-700/60 bg-red-950/40 px-2 py-1 text-[10px] text-red-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-semibold">Error:</span>
            <span className="text-red-200/80 truncate">{error}</span>
          </div>
        )}

        {/* Filter Bar - Ultra-compact */}
        <div className="flex items-center gap-1 flex-wrap bg-gray-900/30 rounded px-2 py-1 border border-gray-800">
          <Filter className="w-3 h-3 text-gray-500" />
          <FilterChip label="All" count={severityCounts.all} active={severityFilter === 'all'} color={COLORS.cyan} onClick={() => setSeverityFilter('all')} />
          <FilterChip label="Crit" count={severityCounts.critical} active={severityFilter === 'critical'} color={COLORS.red} onClick={() => setSeverityFilter('critical')} />
          <FilterChip label="High" count={severityCounts.high} active={severityFilter === 'high'} color={COLORS.yellow} onClick={() => setSeverityFilter('high')} />
          <FilterChip label="Med" count={severityCounts.medium} active={severityFilter === 'medium'} color={COLORS.cyan} onClick={() => setSeverityFilter('medium')} />
          <div className="h-3 w-px bg-gray-700" />
          <select value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)} className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700 text-[10px] text-gray-200 max-w-[120px]">
            <option value="all">All Operators</option>
            {operatorOptions.slice(1).map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          <div className="flex items-center gap-1 ml-auto">
            <ArrowUpDown className="w-2.5 h-2.5 text-gray-500" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700 text-[10px] text-gray-200">
              <option value="score">Score</option>
              <option value="operator">Operator</option>
              <option value="severity">Severity</option>
            </select>
          </div>
        </div>

        {/* Controls + Results - Tighter grid */}
        <div className="grid grid-cols-12 gap-1.5">
          {/* Scenario - Narrow column */}
          <div className="col-span-3 rounded-lg border border-gray-800 bg-gray-950 p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-white">Scenario</span>
              <button onClick={() => setScenario(defaultScenario())} className="p-0.5 rounded text-gray-400 hover:text-white" title="Reset">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div>
                <div className="flex items-center justify-between text-[9px] text-gray-500">
                  <span>Min Gap</span>
                  <span className="text-white font-bold">${Math.round(scenario.minSubsidyGap / 1_000_000)}M</span>
                </div>
                <input type="range" min={0} max={25_000_000} step={250_000} value={scenario.minSubsidyGap} onChange={(e) => setScenarioPartial({ minSubsidyGap: Number(e.target.value) })} className="w-full h-1 accent-cyan-500" />
              </div>

              <div>
                <div className="flex items-center justify-between text-[9px] text-gray-500">
                  <span>Min Issues</span>
                  <span className="text-white font-bold">{scenario.minIssuesCount}</span>
                </div>
                <input type="range" min={0} max={12} step={1} value={scenario.minIssuesCount} onChange={(e) => setScenarioPartial({ minIssuesCount: Number(e.target.value) })} className="w-full h-1 accent-cyan-500" />
              </div>

              <div>
                <div className="flex items-center justify-between text-[9px] text-gray-500">
                  <span>Audit Days</span>
                  <span className="text-white font-bold">{scenario.maxAuditRecencyDays}</span>
                </div>
                <input type="range" min={30} max={720} step={10} value={scenario.maxAuditRecencyDays} onChange={(e) => setScenarioPartial({ maxAuditRecencyDays: Number(e.target.value) })} className="w-full h-1 accent-cyan-500" />
              </div>

              <div className="pt-1.5 border-t border-gray-800">
                <div className="text-[9px] font-semibold text-gray-500 mb-1">Cascade</div>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex items-center justify-between text-[9px] text-gray-500">
                      <span>Min Fac</span>
                      <span className="text-white font-bold">{scenario.operatorCascadeMinFacilities}</span>
                    </div>
                    <input type="range" min={3} max={40} step={1} value={scenario.operatorCascadeMinFacilities} onChange={(e) => setScenarioPartial({ operatorCascadeMinFacilities: Number(e.target.value) })} className="w-full h-1 accent-purple-500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[9px] text-gray-500">
                      <span>Min NC%</span>
                      <span className="text-white font-bold">{Math.round(scenario.operatorCascadeMinNonComplianceRate * 100)}%</span>
                    </div>
                    <input type="range" min={0.05} max={0.9} step={0.05} value={scenario.operatorCascadeMinNonComplianceRate} onChange={(e) => setScenarioPartial({ operatorCascadeMinNonComplianceRate: Number(e.target.value) })} className="w-full h-1 accent-purple-500" />
                  </div>
                </div>
              </div>

              <div className="pt-1.5 border-t border-gray-800">
                <div className="flex items-center justify-between text-[9px] text-gray-500">
                  <span>Sensitivity</span>
                  <span className="text-yellow-400 font-bold">{Math.round(scenario.sensitivity * 100)}%</span>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={scenario.sensitivity} onChange={(e) => setScenarioPartial({ sensitivity: clamp01(Number(e.target.value)) })} className="w-full h-1 accent-yellow-500" />
              </div>
              {isPending && <div className="text-[9px] text-yellow-400">Updating…</div>}
            </div>
          </div>

          {/* Findings list - Wider column */}
          <div className="col-span-5 rounded-lg border border-gray-800 bg-gray-950 p-2">
            <div className="flex items-center justify-between mb-1 gap-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-white">Findings</span>
                <span className="px-1.5 py-0.5 rounded-full bg-gray-800 text-[9px] text-gray-300">{filteredFindings.length}</span>
              </div>
              <div className="relative">
                <Search className="w-3 h-3 text-gray-500 absolute left-1.5 top-1/2 -translate-y-1/2" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="pl-6 pr-6 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-200 w-32 focus:border-cyan-500/50" />
                {query && <button onClick={() => setQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"><X className="w-3 h-3" /></button>}
              </div>
            </div>

            <div className="h-[400px]">
              {filteredFindings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 text-[10px]">
                  <AlertCircle className="w-6 h-6 mb-1" />
                  <div>No findings match</div>
                </div>
              ) : (
                <VirtualList
                  items={filteredFindings}
                  height={400}
                  itemHeight={56}
                  renderItem={(f) => (
                    <button
                      type="button"
                      onClick={() => setSelected(f)}
                      className={`w-full text-left px-2 py-1 rounded border transition-all ${selected?.id === f.id ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-800 bg-gray-900/40 hover:bg-gray-800/60'}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-white truncate">{f.title}</div>
                          <div className="text-[9px] truncate text-gray-500">{f.affectedOperators.slice(0, 2).join(', ')}{f.affectedOperators.length > 2 ? ` +${f.affectedOperators.length - 2}` : ''}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="px-1 py-0.5 rounded text-[8px] font-semibold" style={{ background: `${severityColor(f.severity)}18`, color: severityColor(f.severity) }}>{f.severity.slice(0, 4)}</span>
                          <span className="text-[9px] font-mono text-gray-500">{Math.round(f.score * 100)}</span>
                        </div>
                      </div>
                      <div className="mt-0.5 text-[9px] text-gray-400 line-clamp-1">{f.description}</div>
                    </button>
                  )}
                />
              )}
            </div>
          </div>

          {/* Detail - Remaining space */}
          <div className="col-span-4 rounded-lg border border-gray-800 bg-gray-950 p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-white">Detail</span>
              {selected && (
                <div className="flex items-center gap-1">
                  <button onClick={() => downloadJson(selected, `patternlab-${selected.id}.json`)} className="p-0.5 rounded text-gray-400 hover:text-white" title="Export"><Download className="w-3 h-3" /></button>
                  <button onClick={() => pinFinding(selected)} className="p-0.5 rounded text-cyan-400 hover:text-cyan-300" title="Pin"><Pin className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            {!selected ? (
              <div className="rounded border border-gray-800 bg-gray-900/40 p-4 text-center text-[10px] text-gray-500">
                <AlertCircle className="w-5 h-5 mx-auto mb-1" />
                Select a finding
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto">
                <div className="rounded border border-gray-800 bg-gray-900/40 p-1.5">
                  <div className="text-[10px] font-semibold text-white truncate">{selected.title}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="px-1 py-0.5 rounded text-[8px] font-semibold" style={{ background: `${severityColor(selected.severity)}18`, color: severityColor(selected.severity) }}>{selected.severity}</span>
                    <span className="text-[8px] text-gray-500">{selected.type} • {Math.round(selected.confidence * 100)}%</span>
                  </div>
                  <div className="text-[9px] text-gray-400 mt-1 line-clamp-2">{selected.description}</div>
                </div>

                <div className="rounded border border-gray-800 bg-gray-900/40 p-1.5">
                  <div className="text-[9px] font-semibold text-white mb-1">Evidence</div>
                  <div className="space-y-0.5">
                    {selected.evidence.slice(0, 4).map((e) => (
                      <div key={e.metric} className="flex items-center justify-between gap-1 text-[9px]">
                        <span className="text-gray-400 truncate">{e.metric}</span>
                        <span className="text-white font-mono">{Number.isFinite(e.facilityValue) ? e.facilityValue.toLocaleString() : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded border border-gray-800 bg-gray-900/40 p-1.5">
                  <div className="text-[9px] font-semibold text-white mb-1">Z-scores</div>
                  <div className="space-y-0.5">
                    {selected.explain.slice(0, 4).map((x, idx) => (
                      <div key={`${x.feature}-${idx}`} className="flex items-center justify-between gap-1 text-[9px]">
                        <span className="text-gray-400 truncate">{x.feature}</span>
                        <span className="font-mono font-bold" style={{ color: Math.abs(x.robustZ) > 3 ? COLORS.red : Math.abs(x.robustZ) > 2 ? COLORS.yellow : COLORS.green }}>z={x.robustZ.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded border border-gray-800 bg-gray-900/40 p-1.5">
                  <div className="text-[9px] font-semibold text-white mb-0.5">Actions</div>
                  <ul className="space-y-0.5 text-[9px] text-gray-300">
                    {selected.recommendations.slice(0, 3).map((r) => (
                      <li key={r} className="flex items-start gap-1"><span className="text-cyan-400">→</span><span className="line-clamp-1">{r}</span></li>
                    ))}
                  </ul>
                </div>

                <div className="rounded border border-gray-800 bg-gray-900/40 p-1.5">
                  <div className="text-[9px] font-semibold text-white mb-0.5">Limits</div>
                  <ul className="space-y-0.5 text-[9px] text-gray-500">
                    {selected.limitations.slice(0, 2).map((r) => (
                      <li key={r} className="flex items-start gap-1"><span className="text-yellow-500">!</span><span className="line-clamp-1">{r}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Correlations - Compact */}
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-semibold text-white">Correlations</span>
              <span className="text-[8px] px-1 py-0.5 rounded bg-gray-800 text-gray-500">{result?.correlations?.length || 0}</span>
            </div>
            <button onClick={() => downloadJson(result?.correlations || [], 'dcim-patternlab-correlations.json')} disabled={!result} className="p-0.5 rounded text-gray-400 hover:text-white disabled:opacity-50"><Download className="w-3 h-3" /></button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {(result?.correlations || []).slice(0, 6).map((c) => (
              <div key={c.id} className={`rounded border p-1.5 ${c.actionable ? 'border-green-500/30 bg-green-500/5' : 'border-gray-800 bg-gray-900/40'}`}>
                <div className="text-[9px] font-semibold text-white truncate">{c.metric1} ↔ {c.metric2}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-sm font-bold font-mono" style={{ color: Math.abs(c.correlation) > 0.5 ? COLORS.green : Math.abs(c.correlation) > 0.3 ? COLORS.yellow : COLORS.textMuted }}>r={c.correlation.toFixed(2)}</span>
                  <span className="text-[8px] text-gray-500">n={c.sampleSize}</span>
                  {c.actionable && <span className="px-0.5 py-0.5 rounded text-[7px] bg-green-500/20 text-green-400">✓</span>}
                </div>
                <div className="text-[8px] mt-0.5 text-gray-400 line-clamp-1">{c.interpretation}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
});

PatternLabTab.displayName = 'PatternLabTab';
