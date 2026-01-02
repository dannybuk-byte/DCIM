import { memo, useState } from 'react';
import { ViewMode, ViewModeToggle } from './ViewModeToggle';
import { PhotorealisticGisView } from './PhotorealisticGisView';
import { Facility } from '../../types';

export const ConnectographyFeatureSection = memo(function ConnectographyFeatureSection({
  facilities,
  connectographyKeyPrefix,
  metric,
  title = 'Connectography View',
  subtitle,
  height = 520
}: {
  facilities: Facility[];
  connectographyKeyPrefix: string;
  metric: 'subsidyGap' | 'safetyRisk' | 'issuesCount' | 'auditRecencyDays';
  title?: string;
  subtitle?: string;
  height?: number;
}) {
  const [mode, setMode] = useState<ViewMode>('2D');

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-white">{title}</div>
          {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
        </div>
        <ViewModeToggle value={mode} onChange={setMode} />
      </div>

      <div className="w-full border border-gray-800 rounded-lg overflow-hidden">
        <PhotorealisticGisView
          mode={mode}
          facilities={facilities}
          height={height}
          width={1200}
          connectographyKeyPrefix={connectographyKeyPrefix}
          metric={metric}
        />
      </div>
    </div>
  );
});

ConnectographyFeatureSection.displayName = 'ConnectographyFeatureSection';


