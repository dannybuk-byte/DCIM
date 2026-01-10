/**
 * Sanctions Monitor Tab
 * Wrapper component for the OFAC Sanctions Monitor module
 * 
 * Integrates with the DCIM Command Center dashboard
 */

import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { SanctionsOverview } from '../../modules/sanctions';
import { Facility } from '../../types';

interface SanctionsMonitorTabProps {
  facilities: Facility[];
}

export const SanctionsMonitorTab: React.FC<SanctionsMonitorTabProps> = ({ facilities }) => {
  return (
    <ErrorBoundary>
      <div className="h-full overflow-y-auto bg-slate-950">
        <SanctionsOverview facilities={facilities} />
      </div>
    </ErrorBoundary>
  );
};

export default SanctionsMonitorTab;

