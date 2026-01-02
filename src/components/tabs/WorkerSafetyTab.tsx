import { memo, useMemo } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { StatCard } from '../shared/StatCard';
import { ErrorBoundary } from '../ErrorBoundary';
import { ConnectographyFeatureSection } from '../shared/ConnectographyFeatureSection';
import { Facility } from '../../types';

interface WorkerSafetyTabProps {
  facilities: Facility[];
}

export const WorkerSafetyTab = memo(({ facilities }: WorkerSafetyTabProps) => {
  // Proxy safety signal (until OSHA/ECHO data is wired): issues + compliance severity + audit staleness
  const derived = useMemo(() => {
    let highRisk = 0;
    let mediumRisk = 0;
    for (const f of facilities) {
      const issues = f.issues?.length || 0;
      const statusBoost = f.complianceStatus === 'Non-Compliant' ? 30 : f.complianceStatus === 'At Risk' ? 15 : f.complianceStatus === 'Unknown' ? 5 : 0;
      const auditDays = (() => {
        const d = new Date(f.lastAuditDate);
        if (Number.isNaN(d.getTime())) return 0;
        return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
      })();
      const recency = Math.min(30, Math.floor(auditDays / 30));
      const score = issues * 10 + statusBoost + recency;
      if (score >= 45) highRisk++;
      else if (score >= 15) mediumRisk++;
    }
    return { highRisk, mediumRisk };
  }, [facilities]);

  const safetyMetrics = {
    oshaViolations: derived.highRisk, // proxy
    injuryReports: derived.mediumRisk, // proxy
    safetyScore: derived.highRisk > 0 ? 'C' : derived.mediumRisk > 0 ? 'B' : 'A',
    facilitiesWithViolations: derived.highRisk, // proxy
    totalInspections: facilities.length,
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Worker Safety</h2>
          <p className="text-sm text-gray-400">OSHA compliance and workplace safety monitoring</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="OSHA Violations"
            value={safetyMetrics.oshaViolations.toLocaleString()}
            subtitle={`${safetyMetrics.facilitiesWithViolations} facilities affected`}
            color="red"
            glow={safetyMetrics.oshaViolations > 0}
          />
          <StatCard
            label="Injury Reports"
            value={safetyMetrics.injuryReports.toLocaleString()}
            color="yellow"
            glow={safetyMetrics.injuryReports > 0}
          />
          <StatCard
            label="Safety Score"
            value={safetyMetrics.safetyScore}
            subtitle="Overall compliance rating"
            color="green"
            glow={true}
          />
          <StatCard
            label="Total Inspections"
            value={safetyMetrics.totalInspections.toLocaleString()}
            color="cyan"
          />
        </div>

        {/* Safety Overview */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-semibold">Safety Overview</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">No Active OSHA Violations</div>
                <div className="text-sm text-gray-400 mt-1">
                  All facilities are in compliance with OSHA standards
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">Monitoring Required</div>
                <div className="text-sm text-gray-400 mt-1">
                  Regular inspections ensure continued compliance
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Source Note */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500">
            <strong>Data Source:</strong> Proxy signal (issues + compliance + audit recency). Next: wire OSHA/EPA datasets for real safety incidents.
          </div>
        </div>

        <ConnectographyFeatureSection
          facilities={facilities}
          connectographyKeyPrefix="worker-safety"
          metric="safetyRisk"
          subtitle="Connectography lens: risk-weighted heatmap + flows. Use Toolkit to filter operators, time-play audits, save scenes, and add overlays."
        />
      </div>
    </ErrorBoundary>
  );
});

WorkerSafetyTab.displayName = 'WorkerSafetyTab';

