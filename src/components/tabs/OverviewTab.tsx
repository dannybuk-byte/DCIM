import { useState, useMemo, memo } from 'react';
import { Facility, ComplianceStats } from '../../types';
import { 
  Building2, MapPin, DollarSign, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Activity, Clock, Globe, Target, Users,
  BarChart3, PieChart, Layers, Radio, Zap, Shield, ArrowRight, Eye,
  Cpu, Network, Server, Database, GitBranch, ChevronRight, Download,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatting';
import { getComplianceBadgeClasses } from '../../utils/classHelpers';
import { ConnectographyFeatureSection } from '../shared/ConnectographyFeatureSection';
import { HelpTooltip, GLOSSARY } from '../shared/HelpTooltip';
import {
  AnimatedNumber,
  AnimatedProgressBar,
  Sparkline,
  FadeIn,
  PulsingDot,
} from '../shared/animations';
import {
  CommandHeader,
  StatusCard,
  ActionButton,
  LiveIndicator,
} from '../shared/CommandCenterComponents';
import { MissionHeader, SubsidyGapHero, ComplianceBadge } from '../shared/HumanizedStats';

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
  blue: '#3b82f6',
  orange: '#f97316',
};

interface OverviewTabProps {
  facilities: Facility[];
  stats: ComplianceStats;
}

// Compact metric cell
const MetricCell = memo(function MetricCell({ 
  label, value, color = COLORS.text, small = false, trend, mono = false 
}: { 
  label: string; value: string | number; color?: string; small?: boolean; trend?: 'up' | 'down'; mono?: boolean;
}) {
  return (
    <div className={`${small ? 'py-0.5' : 'py-1'}`}>
      <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`flex items-center gap-1 ${small ? 'text-xs' : 'text-sm'} font-semibold ${mono ? 'font-mono' : ''}`} style={{ color }}>
        {value}
        {trend && (trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
      </div>
    </div>
  );
});

// Dense stat strip
const StatStrip = memo(function StatStrip({ items }: { items: Array<{ label: string; value: string | number; color?: string }> }) {
  return (
    <div className="flex items-center divide-x divide-gray-800 bg-gray-900/50 rounded border border-gray-800">
      {items.map((item, i) => (
        <div key={i} className="flex-1 px-2 py-1.5 text-center">
          <div className="text-[9px] text-gray-500 uppercase">{item.label}</div>
          <div className="text-sm font-bold" style={{ color: item.color || COLORS.text }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
});

// Mini donut for inline use
const MiniDonut = memo(function MiniDonut({ 
  value, max, color, size = 32 
}: { 
  value: number; max: number; color: string; size?: number;
}) {
  const pct = (value / max) * 100;
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1f2e" strokeWidth={3} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} 
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
});

// Dense operator row
const OperatorRow = memo(function OperatorRow({ 
  rank, name, facilities, nonCompliant, gap, color 
}: { 
  rank: number; name: string; facilities: number; nonCompliant: number; gap: number; color: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 hover:bg-gray-800/30 transition-colors cursor-pointer group">
      <div className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center" 
        style={{ backgroundColor: `${color}20`, color }}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-gray-200 truncate group-hover:text-white">{name}</div>
        <div className="flex items-center gap-2 text-[9px] text-gray-500">
          <span>{facilities} fac</span>
          <span className="text-red-400">{nonCompliant} NC</span>
        </div>
      </div>
      <div className="text-[11px] font-bold text-yellow-400 font-mono">{formatCurrency(gap)}</div>
    </div>
  );
});

// Dense state row
const StateRow = memo(function StateRow({ 
  state, facilities, gap, pct 
}: { 
  state: string; facilities: number; gap: number; pct: number;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="w-8 text-[10px] text-gray-400 font-medium">{state}</div>
      <div className="flex-1 h-3 bg-gray-800 rounded overflow-hidden">
        <div className="h-full rounded" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${COLORS.yellow}, ${COLORS.orange})` }} />
      </div>
      <div className="w-16 text-[10px] text-yellow-400 font-mono text-right">{formatCurrency(gap)}</div>
      <div className="w-8 text-[9px] text-gray-500 text-right">{facilities}</div>
    </div>
  );
});

// Facility type pill
const TypePill = memo(function TypePill({ type, count, color }: { type: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-800/50 rounded-full">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-gray-400">{type}</span>
      <span className="text-[10px] font-bold text-white">{count.toLocaleString()}</span>
    </div>
  );
});

// Main Overview Tab
const OverviewTab = memo(function OverviewTab({ facilities, stats }: OverviewTabProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Calculate all metrics in one pass
  const metrics = useMemo(() => {
    if (!facilities || facilities.length === 0) {
      return {
        byState: [] as Array<{ state: string; count: number; gap: number; pct: number }>,
        byOperator: [] as Array<{ name: string; count: number; gap: number; nonCompliant: number }>,
        byType: {} as Record<string, number>,
        avgGap: 0,
        medianGap: 0,
        maxGap: 0,
        avgDaysSinceAudit: 0,
        overdueCount: 0,
        recentAuditCount: 0,
        issueCount: 0,
        avgIssues: 0,
        stateCount: 0,
        operatorCount: 0,
        cityCount: 0,
        complianceRate: 0,
        atRiskRate: 0,
        unknownRate: 0,
      };
    }

    const stateMap = new Map<string, { count: number; gap: number }>();
    const operatorMap = new Map<string, { count: number; gap: number; nonCompliant: number }>();
    const typeMap: Record<string, number> = {};
    const citySet = new Set<string>();
    let totalGap = 0;
    let totalDays = 0;
    let overdueCount = 0;
    let recentCount = 0;
    let issueCount = 0;
    const gaps: number[] = [];
    const now = Date.now();

    for (const f of facilities) {
      // State aggregation
      const st = stateMap.get(f.state) || { count: 0, gap: 0 };
      st.count++;
      st.gap += f.subsidyGap;
      stateMap.set(f.state, st);

      // Operator aggregation
      const op = operatorMap.get(f.operator) || { count: 0, gap: 0, nonCompliant: 0 };
      op.count++;
      op.gap += f.subsidyGap;
      if (f.complianceStatus === 'Non-Compliant') op.nonCompliant++;
      operatorMap.set(f.operator, op);

      // Type count
      typeMap[f.type] = (typeMap[f.type] || 0) + 1;

      // City tracking
      citySet.add(f.city);

      // Gap metrics
      totalGap += f.subsidyGap;
      if (f.subsidyGap > 0) gaps.push(f.subsidyGap);

      // Audit metrics
      const daysSince = Math.floor((now - new Date(f.lastAuditDate).getTime()) / 86400000);
      totalDays += daysSince;
      if (daysSince > 180) overdueCount++;
      if (daysSince < 30) recentCount++;

      // Issue count
      issueCount += f.issues.length;
    }

    // Sort gaps for median
    gaps.sort((a, b) => a - b);
    const medianGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : 0;
    const maxGap = gaps.length > 0 ? gaps[gaps.length - 1] : 0;

    // Convert to sorted arrays
    const byState = Array.from(stateMap.entries())
      .map(([state, data]) => ({ state, count: data.count, gap: data.gap, pct: 0 }))
      .sort((a, b) => b.gap - a.gap);
    
    const maxStateGap = byState[0]?.gap || 1;
    byState.forEach(s => s.pct = (s.gap / maxStateGap) * 100);

    const byOperator = Array.from(operatorMap.entries())
      .map(([name, data]) => ({ name, count: data.count, gap: data.gap, nonCompliant: data.nonCompliant }))
      .sort((a, b) => b.gap - a.gap);

    return {
      byState: byState.slice(0, 15),
      byOperator: byOperator.slice(0, 10),
      byType: typeMap,
      avgGap: facilities.length > 0 ? totalGap / facilities.length : 0,
      medianGap,
      maxGap,
      avgDaysSinceAudit: facilities.length > 0 ? Math.round(totalDays / facilities.length) : 0,
      overdueCount,
      recentAuditCount: recentCount,
      issueCount,
      avgIssues: facilities.length > 0 ? (issueCount / facilities.length).toFixed(1) : '0',
      stateCount: stateMap.size,
      operatorCount: operatorMap.size,
      cityCount: citySet.size,
      complianceRate: ((stats.compliant / stats.totalFacilities) * 100).toFixed(1),
      atRiskRate: ((stats.atRisk / stats.totalFacilities) * 100).toFixed(1),
      unknownRate: ((stats.unknown / stats.totalFacilities) * 100).toFixed(1),
    };
  }, [facilities, stats]);

  // Generate sparkline data
  const sparklineData = useMemo(() => ({
    gap: Array.from({ length: 12 }, () => Math.random() * stats.totalSubsidyGap),
    facilities: Array.from({ length: 12 }, () => Math.floor(stats.totalFacilities * (0.9 + Math.random() * 0.1))),
  }), [stats]);

  const typeColors: Record<string, string> = {
    'Data Center': COLORS.cyan,
    'Switch': COLORS.purple,
    'POP': COLORS.green,
    'CO': COLORS.yellow,
    'Other': COLORS.textMuted,
  };

  return (
    <div className="p-1 space-y-1.5">
      {/* Mission Header - Humanized for organizers */}
      <MissionHeader 
        title="DCIM Accountability Dashboard"
        subtitle="Exposing Big Tech's Broken Job Promises"
        showPartners={true}
      />

      {/* Two-column hero section: Subsidy Gap + Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        {/* SubsidyGapHero - Prominent display */}
        <SubsidyGapHero
          amount={stats.totalSubsidyGap}
          violatorCount={stats.nonCompliant}
          avgSalary={50000}
        />
        
        {/* Compliance Status Badges - Human-readable */}
        <div className="col-span-2 bg-slate-900 rounded-xl p-3 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Compliance Status
            </h3>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-900/50 border border-green-500 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-300 font-medium">LIVE</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <ComplianceBadge status="Compliant" count={stats.compliant} percentage={Number(metrics.complianceRate)} showHelp size="lg" />
            <ComplianceBadge status="Non-Compliant" count={stats.nonCompliant} percentage={Number(((stats.nonCompliant / stats.totalFacilities) * 100).toFixed(1))} showHelp size="lg" />
            <ComplianceBadge status="At Risk" count={stats.atRisk} percentage={Number(metrics.atRiskRate)} showHelp size="lg" />
            <div className="flex flex-col justify-center items-center bg-slate-800 rounded-lg p-2">
              <span className="text-2xl font-bold text-cyan-300">{stats.totalFacilities.toLocaleString()}</span>
              <span className="text-xs text-slate-400">Total Facilities</span>
              <span className="text-[10px] text-slate-500">{metrics.stateCount} states • {metrics.operatorCount} operators</span>
            </div>
          </div>
        </div>
      </div>

      {/* Original Command Center Header - Retained for refresh/export */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 border border-cyan-500/50 rounded-lg p-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-cyan-200 font-medium">
              📊 Tracking {stats.totalFacilities.toLocaleString()} facilities
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.location.reload()}
              className="px-2 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded flex items-center gap-1 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-1"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
            <button
              onClick={() => console.log('Export dashboard')}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded flex items-center gap-1 transition-all"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
            <div className="text-right">
              <div className="text-[9px] text-cyan-400 font-medium">Last Update</div>
              <div className="text-xs text-cyan-200 font-mono font-bold">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main metrics strip */}
      <div className="grid grid-cols-8 gap-1">
        {[
          { label: 'Total', value: stats.totalFacilities.toLocaleString(), color: COLORS.cyan, icon: Building2 },
          { label: 'Compliant', value: stats.compliant.toLocaleString(), color: COLORS.green, icon: CheckCircle },
          { label: 'Non-Comp', value: stats.nonCompliant.toLocaleString(), color: COLORS.red, icon: XCircle },
          { label: 'At Risk', value: stats.atRisk.toLocaleString(), color: COLORS.yellow, icon: AlertTriangle },
          { label: 'Unknown', value: stats.unknown.toLocaleString(), color: COLORS.textMuted, icon: Eye },
          { label: 'Gap', value: formatCurrency(stats.totalSubsidyGap), color: COLORS.yellow, icon: DollarSign },
          { label: 'Avg Gap', value: formatCurrency(metrics.avgGap), color: COLORS.orange, icon: BarChart3 },
          { label: 'Issues', value: metrics.issueCount.toLocaleString(), color: COLORS.red, icon: AlertTriangle },
        ].map((item, i) => (
          <FadeIn key={i} delay={i * 30} direction="up">
            <div className="bg-gray-900 border border-gray-800 rounded p-2 hover:border-gray-700 transition-colors cursor-pointer group">
              <div className="flex items-center gap-1 mb-1">
                <item.icon className="w-3 h-3 text-gray-500 group-hover:scale-110 transition-transform" style={{ color: item.color }} />
                <span className="text-[8px] text-gray-500 uppercase">{item.label}</span>
              </div>
              <div className="text-sm font-bold" style={{ color: item.color }}>
                <AnimatedNumber value={parseFloat(String(item.value).replace(/[^0-9.-]/g, '')) || 0} duration={1200} />
                {String(item.value).match(/[A-Z%$BMK]+$/)?.[0] || ''}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-6 gap-1">
        <FadeIn delay={100}>
          <div className="bg-gray-900/50 border border-gray-800 rounded p-1.5">
            <div className="flex items-center justify-between">
              <MetricCell label="Compliance Rate" value={`${metrics.complianceRate}%`} color={COLORS.green} small />
              <MiniDonut value={stats.compliant} max={stats.totalFacilities} color={COLORS.green} size={28} />
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={120}>
          <div className="bg-gray-900/50 border border-gray-800 rounded p-1.5">
            <div className="flex items-center justify-between">
              <MetricCell label="At Risk Rate" value={`${metrics.atRiskRate}%`} color={COLORS.yellow} small />
              <MiniDonut value={stats.atRisk} max={stats.totalFacilities} color={COLORS.yellow} size={28} />
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={140}>
          <div className="bg-gray-900/50 border border-gray-800 rounded p-1.5">
            <MetricCell label="Avg Days Since Audit" value={metrics.avgDaysSinceAudit} color={metrics.avgDaysSinceAudit > 90 ? COLORS.red : COLORS.cyan} small />
          </div>
        </FadeIn>
        <FadeIn delay={160}>
          <div className="bg-gray-900/50 border border-gray-800 rounded p-1.5">
            <MetricCell label="Overdue Audits" value={metrics.overdueCount.toLocaleString()} color={COLORS.red} small />
          </div>
        </FadeIn>
        <FadeIn delay={180}>
          <div className="bg-gray-900/50 border border-gray-800 rounded p-1.5">
            <MetricCell label="Median Gap" value={formatCurrency(metrics.medianGap)} color={COLORS.yellow} small mono />
          </div>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="bg-gray-900/50 border border-gray-800 rounded p-1.5">
            <MetricCell label="Max Gap" value={formatCurrency(metrics.maxGap)} color={COLORS.red} small mono />
          </div>
        </FadeIn>
      </div>

      {/* Type distribution strip */}
      <FadeIn delay={220}>
        <div className="flex items-center gap-2 bg-gray-900/30 rounded px-2 py-1.5 border border-gray-800">
          <Layers className="w-4 h-4 text-gray-500" />
          <span className="text-[10px] text-gray-500 mr-2">TYPES:</span>
          {Object.entries(metrics.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <TypePill key={type} type={type} count={count} color={typeColors[type] || COLORS.textMuted} />
          ))}
        </div>
      </FadeIn>

      {/* Main content grid */}
      <div className="grid grid-cols-12 gap-2">
        {/* Left column - States & Trends */}
        <div className="col-span-4 space-y-2">
          {/* State rankings */}
          <FadeIn delay={250}>
            <div className="bg-gray-900 border border-gray-800 rounded p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[11px] font-semibold text-white">Top States by Gap</span>
                </div>
                <span className="text-[9px] text-gray-500">{metrics.stateCount} total</span>
              </div>
              <div className="space-y-0.5">
                {metrics.byState.map((s, i) => (
                  <StateRow key={s.state} state={s.state} facilities={s.count} gap={s.gap} pct={s.pct} />
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Trend sparklines */}
          <FadeIn delay={280}>
            <div className="bg-gray-900 border border-gray-800 rounded p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-semibold text-white">Trends</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-gray-500 mb-1">Subsidy Gap (12mo)</div>
                  <Sparkline data={sparklineData.gap} width={140} height={30} color={COLORS.yellow} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[9px] text-gray-500 mb-1">Facility Count</div>
                  <Sparkline data={sparklineData.facilities} width={140} height={30} color={COLORS.cyan} strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Center column - Operator rankings */}
        <div className="col-span-4">
          <FadeIn delay={300}>
            <div className="bg-gray-900 border border-gray-800 rounded p-2 h-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[11px] font-semibold text-white">Operator Risk Ranking</span>
                </div>
                <span className="text-[9px] text-gray-500">{metrics.operatorCount} total</span>
              </div>
              <div className="divide-y divide-gray-800/50">
                {metrics.byOperator.map((op, i) => (
                  <OperatorRow 
                    key={op.name} 
                    rank={i + 1} 
                    name={op.name} 
                    facilities={op.count} 
                    nonCompliant={op.nonCompliant} 
                    gap={op.gap}
                    color={i === 0 ? COLORS.red : i === 1 ? COLORS.orange : i === 2 ? COLORS.yellow : COLORS.textMuted}
                  />
                ))}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Right column - Compliance breakdown */}
        <div className="col-span-4 space-y-2">
          {/* Compliance donut */}
          <FadeIn delay={320}>
            <div className="bg-gray-900 border border-gray-800 rounded p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-semibold text-white">Compliance Distribution</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20">
                  <svg width={80} height={80} className="-rotate-90">
                    {[
                      { value: stats.compliant, color: COLORS.green },
                      { value: stats.nonCompliant, color: COLORS.red },
                      { value: stats.atRisk, color: COLORS.yellow },
                      { value: stats.unknown, color: COLORS.textMuted },
                    ].reduce((acc, seg, i) => {
                      const total = stats.totalFacilities || 1;
                      const pct = (seg.value / total) * 100;
                      const r = 35;
                      const c = 2 * Math.PI * r;
                      const len = (pct / 100) * c;
                      acc.segments.push(
                        <circle key={i} cx={40} cy={40} r={r} fill="none" stroke={seg.color} strokeWidth={8}
                          strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc.offset} />
                      );
                      acc.offset += len;
                      return acc;
                    }, { segments: [] as JSX.Element[], offset: 0 }).segments}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-white">{stats.totalFacilities.toLocaleString()}</div>
                      <div className="text-[8px] text-gray-500">TOTAL</div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  {[
                    { label: 'Compliant', value: stats.compliant, pct: metrics.complianceRate, color: COLORS.green },
                    { label: 'Non-Compliant', value: stats.nonCompliant, pct: ((stats.nonCompliant / stats.totalFacilities) * 100).toFixed(1), color: COLORS.red },
                    { label: 'At Risk', value: stats.atRisk, pct: metrics.atRiskRate, color: COLORS.yellow },
                    { label: 'Unknown', value: stats.unknown, pct: metrics.unknownRate, color: COLORS.textMuted },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-gray-400 flex-1">{item.label}</span>
                      <span className="text-[10px] font-bold text-white">{item.value.toLocaleString()}</span>
                      <span className="text-[9px] text-gray-500 w-8 text-right">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Quick stats grid */}
          <FadeIn delay={340}>
            <div className="bg-gray-900 border border-gray-800 rounded p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] font-semibold text-white">Quick Metrics</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Avg Issues', value: metrics.avgIssues, icon: AlertTriangle, color: COLORS.red },
                  { label: 'Recent Audits', value: metrics.recentAuditCount, icon: Clock, color: COLORS.green },
                  { label: 'Total Issues', value: metrics.issueCount, icon: Shield, color: COLORS.yellow },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800/30 rounded p-1.5 text-center">
                    <item.icon className="w-3 h-3 mx-auto mb-0.5" style={{ color: item.color }} />
                    <div className="text-sm font-bold text-white">{item.value}</div>
                    <div className="text-[8px] text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Facilities table - dense */}
      <FadeIn delay={360}>
        <div className="bg-gray-900 border border-gray-800 rounded overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-semibold text-white">All Facilities</span>
              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[9px] font-bold">
                {facilities.length.toLocaleString()}
              </span>
            </div>
            <PulsingDot color={COLORS.cyan} size={6} />
          </div>
          
          {/* Table header */}
          <div className="grid grid-cols-12 gap-1 px-2 py-1 bg-gray-900/80 border-b border-gray-800 text-[9px] text-gray-500 uppercase">
            <div className="col-span-3">Facility</div>
            <div className="col-span-2">Operator</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">State</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Gap</div>
            <div className="col-span-1 text-right">Days</div>
            <div className="col-span-1 text-right">Issues</div>
          </div>

          {/* Table body */}
          <div className="max-h-[300px] overflow-y-auto">
            {facilities.slice(0, 150).map((f, i) => (
              <div 
                key={f.id}
                className={`
                  grid grid-cols-12 gap-1 px-2 py-1 border-b border-gray-800/30 
                  hover:bg-cyan-500/5 cursor-pointer transition-colors text-[11px]
                `}
                onMouseEnter={() => setHoveredRow(f.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <div className="col-span-3 text-gray-200 truncate font-medium">{f.name}</div>
                <div className="col-span-2 text-gray-400 truncate">{f.operator}</div>
                <div className="col-span-1 text-gray-500">{f.type.substring(0, 6)}</div>
                <div className="col-span-1 text-gray-500">{f.state}</div>
                <div className="col-span-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${getComplianceBadgeClasses(f.complianceStatus)}`}>
                    {f.complianceStatus}
                  </span>
                </div>
                <div className="col-span-1 text-right text-yellow-400 font-mono">{formatCurrency(f.subsidyGap)}</div>
                <div className="col-span-1 text-right text-gray-500">
                  {Math.floor((Date.now() - new Date(f.lastAuditDate).getTime()) / 86400000)}
                </div>
                <div className="col-span-1 text-right" style={{ color: f.issues.length > 0 ? COLORS.red : COLORS.textMuted }}>
                  {f.issues.length}
                </div>
              </div>
            ))}
            {facilities.length > 150 && (
              <div className="px-2 py-2 text-center text-[10px] text-gray-500 border-t border-gray-800">
                Showing 150 of {facilities.length.toLocaleString()} • Use filters to narrow
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Connectography */}
      <ConnectographyFeatureSection
        facilities={facilities}
        connectographyKeyPrefix="overview"
        metric="subsidyGap"
        subtitle="Connectography lens: global subsidy pressure + operator flows"
        height={400}
      />
    </div>
  );
});

export default OverviewTab;
