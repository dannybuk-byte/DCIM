import { memo } from 'react';
import {
  Building2, DollarSign, AlertTriangle, CheckCircle, XCircle,
  Activity, Clock, Globe, Target, Zap, TrendingUp, TrendingDown,
  Radio, Users, MapPin, Server, Database, Shield
} from 'lucide-react';
import { ComplianceStats } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { AnimatedNumber, PulsingDot } from './animations';

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

const iconMap = {
  building: Building2,
  dollar: DollarSign,
  alert: AlertTriangle,
  check: CheckCircle,
  x: XCircle,
  activity: Activity,
  clock: Clock,
  globe: Globe,
  target: Target,
  zap: Zap,
  up: TrendingUp,
  down: TrendingDown,
  radio: Radio,
  users: Users,
  map: MapPin,
  server: Server,
  database: Database,
  shield: Shield,
};

export interface MetricItem {
  label: string;
  value: string | number;
  color?: string;
  icon?: keyof typeof iconMap;
  trend?: 'up' | 'down';
  pulsing?: boolean;
  suffix?: string;
}

interface DenseMetricStripProps {
  metrics: MetricItem[];
  className?: string;
}

export const DenseMetricStrip = memo(function DenseMetricStrip({ metrics, className = '' }: DenseMetricStripProps) {
  return (
    <div className={`flex items-center divide-x divide-gray-800 bg-gray-900/60 backdrop-blur border border-gray-800 rounded ${className}`}>
      {metrics.map((metric, i) => {
        const Icon = metric.icon ? iconMap[metric.icon] : null;
        const color = metric.color || COLORS.text;
        return (
          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-gray-800/30 transition-colors cursor-pointer">
            {Icon && <Icon className="w-3 h-3" style={{ color }} />}
            <div>
              <div className="text-[8px] text-gray-500 uppercase tracking-wide">{metric.label}</div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold" style={{ color }}>
                  {typeof metric.value === 'number' ? (
                    <AnimatedNumber value={metric.value} duration={800} />
                  ) : metric.value}
                  {metric.suffix}
                </span>
                {metric.trend && (
                  metric.trend === 'up' 
                    ? <TrendingUp className="w-2.5 h-2.5" style={{ color: COLORS.green }} />
                    : <TrendingDown className="w-2.5 h-2.5" style={{ color: COLORS.red }} />
                )}
                {metric.pulsing && <PulsingDot color={color} size={4} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

interface LiveHeaderBarProps {
  stats: ComplianceStats;
  operatorCount: number;
  stateCount: number;
  className?: string;
}

export const LiveHeaderBar = memo(function LiveHeaderBar({ stats, operatorCount, stateCount, className = '' }: LiveHeaderBarProps) {
  const metrics: MetricItem[] = [
    { label: 'Facilities', value: stats.totalFacilities, icon: 'building', color: COLORS.cyan },
    { label: 'Compliant', value: stats.compliant, icon: 'check', color: COLORS.green },
    { label: 'Non-Compliant', value: stats.nonCompliant, icon: 'x', color: COLORS.red },
    { label: 'At Risk', value: stats.atRisk, icon: 'alert', color: COLORS.yellow },
    { label: 'Total Gap', value: formatCurrency(stats.totalSubsidyGap), icon: 'dollar', color: COLORS.yellow },
    { label: 'Operators', value: operatorCount, icon: 'users', color: COLORS.purple },
    { label: 'States', value: stateCount, icon: 'map', color: COLORS.blue },
  ];

  return (
    <div className={`flex items-center justify-between px-3 py-1.5 bg-gray-900/80 backdrop-blur border-b border-gray-800 ${className}`}>
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold text-white">DCIM Command Center</span>
        <PulsingDot color={COLORS.green} size={6} />
      </div>
      <DenseMetricStrip metrics={metrics} />
      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <Activity className="w-3 h-3 text-green-400" />
        <span className="text-green-400">LIVE</span>
      </div>
    </div>
  );
});

interface QuickStatsSidebarProps {
  stats: ComplianceStats;
  facilityCount: number;
  operatorCount: number;
  stateCount: number;
  issueCount: number;
  overdueCount: number;
  avgDaysSinceAudit: number;
  className?: string;
}

export const QuickStatsSidebar = memo(function QuickStatsSidebar({
  stats, facilityCount, operatorCount, stateCount, issueCount, overdueCount, avgDaysSinceAudit, className = ''
}: QuickStatsSidebarProps) {
  const complianceRate = ((stats.compliant / stats.totalFacilities) * 100).toFixed(1);
  const nonComplianceRate = ((stats.nonCompliant / stats.totalFacilities) * 100).toFixed(1);
  
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg p-2 space-y-2 ${className}`}>
      <div className="flex items-center gap-1.5 pb-1.5 border-b border-gray-800">
        <Zap className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Quick Stats</span>
      </div>
      
      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-1">
        <StatCell label="Total" value={facilityCount.toLocaleString()} color={COLORS.cyan} icon="building" />
        <StatCell label="Gap" value={formatCurrency(stats.totalSubsidyGap)} color={COLORS.yellow} icon="dollar" />
        <StatCell label="Compliant" value={`${complianceRate}%`} color={COLORS.green} icon="check" />
        <StatCell label="Non-Comp" value={`${nonComplianceRate}%`} color={COLORS.red} icon="x" />
        <StatCell label="At Risk" value={stats.atRisk.toLocaleString()} color={COLORS.yellow} icon="alert" />
        <StatCell label="Unknown" value={stats.unknown.toLocaleString()} color={COLORS.textMuted} icon="shield" />
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-800" />

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-1">
        <StatCell label="Operators" value={operatorCount.toLocaleString()} color={COLORS.purple} icon="users" />
        <StatCell label="States" value={stateCount.toLocaleString()} color={COLORS.blue} icon="map" />
        <StatCell label="Issues" value={issueCount.toLocaleString()} color={COLORS.red} icon="alert" />
        <StatCell label="Overdue" value={overdueCount.toLocaleString()} color={COLORS.orange} icon="clock" />
      </div>

      {/* Avg audit */}
      <div className="bg-gray-800/30 rounded p-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-500">Avg Audit Age</span>
          <span className="text-[11px] font-bold" style={{ color: avgDaysSinceAudit > 90 ? COLORS.red : COLORS.green }}>
            {avgDaysSinceAudit}d
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded mt-1 overflow-hidden">
          <div 
            className="h-full rounded transition-all duration-500"
            style={{ 
              width: `${Math.min(100, (avgDaysSinceAudit / 180) * 100)}%`,
              background: avgDaysSinceAudit > 90 ? `linear-gradient(90deg, ${COLORS.orange}, ${COLORS.red})` : COLORS.green
            }}
          />
        </div>
      </div>
    </div>
  );
});

// Internal helper component
const StatCell = memo(function StatCell({ 
  label, value, color, icon 
}: { 
  label: string; value: string; color: string; icon?: keyof typeof iconMap;
}) {
  const Icon = icon ? iconMap[icon] : null;
  return (
    <div className="bg-gray-800/20 rounded p-1.5 hover:bg-gray-800/40 transition-colors cursor-pointer">
      <div className="flex items-center gap-1 mb-0.5">
        {Icon && <Icon className="w-2.5 h-2.5" style={{ color }} />}
        <span className="text-[8px] text-gray-500 uppercase">{label}</span>
      </div>
      <div className="text-[11px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
});

// Compact horizontal stat strip for embedding
interface CompactStatStripProps {
  items: Array<{ label: string; value: string | number; color?: string }>;
  className?: string;
}

export const CompactStatStrip = memo(function CompactStatStrip({ items, className = '' }: CompactStatStripProps) {
  return (
    <div className={`flex items-center gap-3 text-[10px] ${className}`}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="text-gray-500">{item.label}:</span>
          <span className="font-bold" style={{ color: item.color || COLORS.text }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
});

// Dense data row component for tables
interface DenseDataRowProps {
  cells: Array<{
    content: React.ReactNode;
    span?: number;
    align?: 'left' | 'center' | 'right';
    className?: string;
  }>;
  onClick?: () => void;
  highlighted?: boolean;
}

export const DenseDataRow = memo(function DenseDataRow({ cells, onClick, highlighted = false }: DenseDataRowProps) {
  return (
    <div 
      className={`
        grid grid-cols-12 gap-1 px-2 py-1 border-b border-gray-800/30 
        hover:bg-cyan-500/5 cursor-pointer transition-colors text-[11px]
        ${highlighted ? 'bg-cyan-500/10' : ''}
      `}
      onClick={onClick}
    >
      {cells.map((cell, i) => (
        <div 
          key={i} 
          className={`col-span-${cell.span || 1} ${cell.align === 'right' ? 'text-right' : cell.align === 'center' ? 'text-center' : ''} ${cell.className || ''}`}
        >
          {cell.content}
        </div>
      ))}
    </div>
  );
});

