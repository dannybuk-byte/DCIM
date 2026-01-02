import { memo, useMemo } from 'react';
import { Facility } from '../../types';
import { calculateStats } from '../../utils/stats';
import { formatCurrency } from '../../utils/formatting';
import { StatCard } from '../shared/StatCard';
import { ErrorBoundary } from '../ErrorBoundary';
import { Map2D } from '../shared/Map2D';
import { Globe3D } from '../shared/Globe3D';
import { TopologyView } from '../shared/TopologyView';

interface GeographicIntelTabProps {
  facilities: Facility[];
  viewMode: '2D' | '3D' | 'Topology';
}

export const GeographicIntelTab = memo(({ facilities, viewMode }: GeographicIntelTabProps) => {
  const countryStats = useMemo(() => {
    const countries = ['US', 'UK', 'Germany', 'Netherlands', 'Singapore', 'Japan'];
    return countries.map(country => {
      const countryFacilities = facilities.filter(f => f.country === country);
      const stats = calculateStats(countryFacilities);
      return { country, facilities: countryFacilities, stats };
    }).filter(item => item.facilities.length > 0);
  }, [facilities]);

  // Filter facilities with coordinates for visualization
  const facilitiesWithCoords = useMemo(() => {
    const filtered = facilities.filter(f => f.latitude !== undefined && f.longitude !== undefined);
    return filtered;
  }, [facilities]);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Geographic Intelligence</h2>
          <p className="text-sm text-gray-400">Global infrastructure mapping and analysis</p>
          {facilitiesWithCoords.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Showing {facilitiesWithCoords.length.toLocaleString()} facilities with coordinates
            </p>
          )}
        </div>

        {/* Map Visualization */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="h-96 relative overflow-hidden rounded">
            {viewMode === '2D' && (
              <Map2D facilities={facilitiesWithCoords} width={800} height={384} />
            )}
            {viewMode === '3D' && (
              <Globe3D facilities={facilitiesWithCoords} width={800} height={384} />
            )}
            {viewMode === 'Topology' && (
              <TopologyView facilities={facilities} width={800} height={384} />
            )}
          </div>
        </div>

        {/* Country Statistics */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Top Countries by Facility Count</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countryStats.map(({ country, facilities: countryFacs, stats }) => (
              <StatCard
                key={country}
                label={country}
                value={countryFacs.length.toLocaleString()}
                subtitle={`${formatCurrency(stats.totalSubsidyGap)} gap`}
                color="cyan"
                glow={true}
              />
            ))}
          </div>
        </div>

        {/* Regional Breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Regional Analysis</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Americas</div>
              <div className="text-xl font-bold text-cyan-400">
                {facilities.filter(f => ['US', 'CA', 'BR', 'MX'].includes(f.country)).length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Europe</div>
              <div className="text-xl font-bold text-cyan-400">
                {facilities.filter(f => ['UK', 'DE', 'NL', 'FR', 'IE'].includes(f.country)).length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Asia-Pacific</div>
              <div className="text-xl font-bold text-cyan-400">
                {facilities.filter(f => ['SG', 'JP', 'AU', 'IN', 'HK', 'KR', 'CN'].includes(f.country)).length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Other</div>
              <div className="text-xl font-bold text-cyan-400">
                {facilities.filter(f => !['US', 'CA', 'BR', 'MX', 'UK', 'DE', 'NL', 'FR', 'IE', 'SG', 'JP', 'AU', 'IN', 'HK', 'KR', 'CN'].includes(f.country)).length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
});

GeographicIntelTab.displayName = 'GeographicIntelTab';

