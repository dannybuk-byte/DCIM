import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MissionTabHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: 'red' | 'purple' | 'blue' | 'green' | 'orange' | 'indigo';
  stats?: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
  children?: React.ReactNode;
}

const gradientClasses = {
  red: 'from-red-900 via-orange-900 to-amber-900 border-red-500/30',
  purple: 'from-purple-900 via-indigo-900 to-blue-900 border-purple-500/30',
  blue: 'from-blue-900 via-indigo-900 to-slate-900 border-blue-500/30',
  green: 'from-emerald-900 via-teal-900 to-cyan-900 border-emerald-500/30',
  orange: 'from-orange-900 via-amber-900 to-yellow-900 border-orange-500/30',
  indigo: 'from-indigo-900 via-purple-900 to-pink-900 border-indigo-500/30',
};

const iconGradientClasses = {
  red: 'from-red-500 to-orange-500 shadow-red-500/30',
  purple: 'from-purple-500 to-pink-500 shadow-purple-500/30',
  blue: 'from-blue-500 to-cyan-500 shadow-blue-500/30',
  green: 'from-emerald-500 to-teal-500 shadow-emerald-500/30',
  orange: 'from-orange-500 to-amber-500 shadow-orange-500/30',
  indigo: 'from-indigo-500 to-purple-500 shadow-indigo-500/30',
};

const textClasses = {
  red: 'text-orange-200',
  purple: 'text-purple-200',
  blue: 'text-blue-200',
  green: 'text-emerald-200',
  orange: 'text-amber-200',
  indigo: 'text-indigo-200',
};

export const MissionTabHeader: React.FC<MissionTabHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  gradient,
  stats,
  children,
}) => {
  return (
    <div className={`bg-gradient-to-r ${gradientClasses[gradient]} rounded-xl m-3 p-4 shadow-xl border`}>
      <div className="flex items-center justify-between">
        {/* Left: Title and Mission */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${iconGradientClasses[gradient]} flex items-center justify-center shadow-lg`}>
            <Icon size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {title}
            </h1>
            <p className={`${textClasses[gradient]} text-sm`}>
              {subtitle}
            </p>
          </div>
        </div>
        
        {/* Right: Stats */}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className={`text-2xl font-bold ${stat.color || 'text-white'}`}>
                  {stat.value}
                </div>
                <div className={`${textClasses[gradient]} text-xs`}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Optional controls row */}
      {children && (
        <div className="mt-3 pt-3 border-t border-white/10">
          {children}
        </div>
      )}
    </div>
  );
};

// Pre-configured mission headers for common tabs
export const OrganizingHeader: React.FC<{ stats?: any }> = ({ stats }) => (
  <MissionTabHeader
    title="Organizing Intelligence"
    subtitle="Strategic targets for labor organizing • 'Docks to Data Centers'"
    icon={require('lucide-react').Target}
    gradient="red"
    stats={stats ? [
      { label: 'IBEW Workers', value: stats.ibew || 0, color: 'text-yellow-400' },
      { label: 'Potential Targets', value: stats.potential || 0, color: 'text-green-400' },
      { label: 'Corridors', value: stats.corridors || 0, color: 'text-cyan-400' },
      { label: 'Priority', value: stats.priority || 0, color: 'text-red-400' },
    ] : undefined}
  />
);

export const CoalitionHeader: React.FC = () => (
  <MissionTabHeader
    title="Coalition Tools"
    subtitle="Build power through Community Benefits Agreements & accountability"
    icon={require('lucide-react').Users}
    gradient="purple"
    stats={[
      { label: 'CBA Provisions', value: '19', color: 'text-blue-400' },
      { label: 'Report Channels', value: '5', color: 'text-yellow-400' },
      { label: 'P&I Scoring', value: 'A-F', color: 'text-green-400' },
    ]}
  />
);

export const FacilitiesHeader: React.FC<{ stats?: any }> = ({ stats }) => (
  <MissionTabHeader
    title="Facility Database"
    subtitle="Track and investigate Big Tech's data centers"
    icon={require('lucide-react').Database}
    gradient="blue"
    stats={stats ? [
      { label: 'Total', value: stats.total?.toLocaleString() || 0, color: 'text-white' },
      { label: 'Non-Compliant', value: stats.nonCompliant?.toLocaleString() || 0, color: 'text-red-400' },
      { label: 'Subsidy Gap', value: `$${((stats.subsidyGap || 0) / 1e9).toFixed(2)}B`, color: 'text-yellow-400' },
    ] : undefined}
  />
);

export const SubsidyHeader: React.FC<{ stats?: any }> = ({ stats }) => (
  <MissionTabHeader
    title="Subsidy Accountability"
    subtitle="Exposing billions in broken job promises • Good Jobs First data"
    icon={require('lucide-react').DollarSign}
    gradient="orange"
    stats={stats ? [
      { label: 'Total Gap', value: `$${((stats.totalGap || 0) / 1e9).toFixed(2)}B`, color: 'text-red-400' },
      { label: 'Records', value: stats.records?.toLocaleString() || 0, color: 'text-white' },
      { label: 'States', value: stats.states || 0, color: 'text-cyan-400' },
    ] : undefined}
  />
);

