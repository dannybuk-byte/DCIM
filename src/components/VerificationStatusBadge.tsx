/**
 * VerificationStatusBadge
 * 
 * Displays verification system health status with clear visual indicators.
 * Shows green when healthy, red when degraded, yellow when checking.
 */

import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { useVerificationDegraded } from '../hooks/useVerificationDegraded';

export interface VerificationStatusBadgeProps {
  /** Show compact version (icon only) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({
  compact = false,
  className = '',
}) => {
  const { isDegraded, reason, lastCheck, forceCheck } = useVerificationDegraded();

  const isChecking = lastCheck === 0;
  const lastCheckTime = lastCheck > 0 ? new Date(lastCheck).toLocaleTimeString() : 'Never';

  // Determine visual state
  const getStateConfig = () => {
    if (isChecking) {
      return {
        Icon: Loader2,
        iconClass: 'animate-spin text-slate-500',
        bgClass: 'bg-slate-100 border-slate-200',
        textClass: 'text-slate-700',
        label: 'Checking...',
      };
    }
    if (isDegraded) {
      return {
        Icon: ShieldAlert,
        iconClass: 'text-rose-600',
        bgClass: 'bg-rose-50 border-rose-200',
        textClass: 'text-rose-700',
        label: 'Verification Down',
      };
    }
    return {
      Icon: ShieldCheck,
      iconClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50 border-emerald-200',
      textClass: 'text-emerald-700',
      label: 'Verification OK',
    };
  };

  const config = getStateConfig();
  const { Icon, iconClass, bgClass, textClass, label } = config;

  if (compact) {
    return (
      <button
        onClick={() => void forceCheck()}
        title={`${label}\n${reason}\nLast check: ${lastCheckTime}\nClick to refresh`}
        className={`p-1.5 rounded border ${bgClass} hover:opacity-80 transition-opacity ${className}`}
      >
        <Icon size={16} className={iconClass} />
      </button>
    );
  }

  return (
    <button
      onClick={() => void forceCheck()}
      title={`${reason}\nLast check: ${lastCheckTime}\nClick to refresh`}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border ${bgClass} hover:opacity-80 transition-opacity ${className}`}
    >
      <Icon size={14} className={iconClass} />
      <span className={`text-xs font-medium ${textClass}`}>{label}</span>
      {isDegraded && (
        <span className="text-xs text-rose-500">(auto-confirm suspended)</span>
      )}
    </button>
  );
};

export default VerificationStatusBadge;
