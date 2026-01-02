import { useState, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ProvenanceBadge } from './shared/ProvenanceBadge';
import { Tooltip } from './shared/Tooltip';
import { ExpandableSection } from './shared/ExpandableSection';
import { detectLaborSignature } from '../detectors/laborRhythm';
import { detectEnergySignature } from '../detectors/energySignature';
import { detectMunicipalSignature } from '../detectors/municipalImpact';
import { calculateLocalMultiplier } from '../detectors/economicFlow';
import { db } from '../db/database';
import { Facility } from '../types';
import { formatCurrency } from '../utils/formatting';
import { getSignatureBadgeClasses } from '../utils/classHelpers';
import { Users, Zap, Droplet, DollarSign, Info } from 'lucide-react';

interface LocalSignatureDashboardProps {
  facilityId: number;
}

export function LocalSignatureDashboard({ facilityId }: LocalSignatureDashboardProps) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [signatures, setSignatures] = useState({
    labor: null as any,
    energy: null as any,
    municipal: null as any,
    lm3: null as any
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadSignatures() {
      try {
        setLoading(true);
        
        // Load facility
        const facilityData = await db.facilities.get(facilityId);
        if (!facilityData || !isMounted) {
          setLoading(false);
          return;
        }
        setFacility(facilityData);

        // Get facility opening date (would come from subsidy agreement or facility data)
        const agreement = await db.subsidyAgreements.where('facilityId').equals(facilityId).first();
        const openDate = agreement?.permitDate || '2020-01-01'; // Default if not available

        // Extract county FIPS (would come from facility data - using placeholder)
        const countyFips = '51107'; // Would be from facility.countyFips
        const zip = '20148'; // Would be from facility data

        // Call all signature detectors in parallel
        const [labor, energy, municipal, lm3] = await Promise.allSettled([
          detectLaborSignature(countyFips, openDate),
          detectEnergySignature(facilityId, 'PJM', 'zone1'), // Would use actual grid operator
          detectMunicipalSignature(facilityData.city + ', ' + facilityData.state, countyFips, zip),
          calculateLocalMultiplier(facilityId, countyFips)
        ]);

        setSignatures({
          labor: labor.status === 'fulfilled' ? labor.value : null,
          energy: energy.status === 'fulfilled' ? energy.value : null,
          municipal: municipal.status === 'fulfilled' ? municipal.value : null,
          lm3: lm3.status === 'fulfilled' ? lm3.value : null
        });

        // Collect errors
        const errorMap: Record<string, string> = {};
        if (labor.status === 'rejected') errorMap.labor = labor.reason?.message || 'Unknown error';
        if (energy.status === 'rejected') errorMap.energy = energy.reason?.message || 'Unknown error';
        if (municipal.status === 'rejected') errorMap.municipal = municipal.reason?.message || 'Unknown error';
        if (lm3.status === 'rejected') errorMap.lm3 = lm3.reason?.message || 'Unknown error';
        setErrors(errorMap);

      } catch (error) {
        if (isMounted) {
          console.error('Error loading signatures:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSignatures();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [facilityId]);

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Local Data Signatures</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-gray-900 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!facility) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="text-sm text-gray-400">Facility not found</div>
        </div>
      </ErrorBoundary>
    );
  }

  // Generate signature summary
  const summary = generateSignatureSummary(signatures);

  return (
    <ErrorBoundary>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-200">Local Data Signatures</h3>
          <Tooltip content="These are patterns that show how this facility actually operates in its local community. Like a fingerprint, each facility has a unique 'signature' based on employment patterns, energy use, and economic impact.">
            <Info className="w-4 h-4 text-gray-400" />
          </Tooltip>
        </div>

        {/* Signature Summary */}
        {summary && (
          <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <div className="text-sm font-medium text-gray-200 mb-2">Local Signature Summary</div>
            <div className="text-sm text-gray-300">{summary}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Labor Signature */}
          <ExpandableSection
            title={
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>Labor Rhythm</span>
                <Tooltip content="This shows the employment pattern over time. 'Construction cliff' means lots of jobs during building, then very few permanent jobs. 'Gradual decline' means jobs slowly decreased. 'Sustained employment' means jobs stayed steady.">
                  <Info className="w-3 h-3 text-gray-400" />
                </Tooltip>
                {signatures.labor && (
                  <span className={`px-2 py-0.5 rounded text-xs ${getSignatureBadgeClasses(signatures.labor.signature)}`}>
                    {signatures.labor.signature.replace('_', ' ')}
                  </span>
                )}
              </div>
            }
            icon={<Users className="w-4 h-4" />}
          >
            {signatures.labor ? (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Peak Employment</div>
                    <div className="text-gray-200">{signatures.labor.peakEmployment.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Steady State</div>
                    <div className="text-gray-200">{signatures.labor.steadyStateEmployment.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                      Drop Percentage
                      <Tooltip content="How much employment dropped from the peak construction period to steady operations. 80%+ means almost all construction jobs disappeared.">
                        <Info className="w-3 h-3" />
                      </Tooltip>
                    </div>
                    <div className="text-red-400">{signatures.labor.dropPercentage.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                      Confidence
                      <Tooltip content="How reliable this analysis is. HIGH = lots of data. MEDIUM = some data. LOW = limited data.">
                        <Info className="w-3 h-3" />
                      </Tooltip>
                    </div>
                    <div className="text-gray-200">{signatures.labor.confidence}</div>
                  </div>
                </div>
                <ProvenanceBadge
                  sourceType="GOV"
                  sourceDescription={signatures.labor.dataSource}
                  lastUpdated={new Date().toISOString()}
                  collectionMethod="BLS QCEW quarterly employment data"
                />
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-400">
                {errors.labor || 'Labor signature data unavailable'}
              </div>
            )}
          </ExpandableSection>

          {/* Energy Signature */}
          <ExpandableSection
            title={
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span>Energy Pattern</span>
                {signatures.energy && (
                  <span className="px-2 py-0.5 rounded text-xs bg-yellow-900/50 text-yellow-200">
                    {signatures.energy.signature.replace('_', ' ')}
                  </span>
                )}
              </div>
            }
            icon={<Zap className="w-4 h-4" />}
          >
            {signatures.energy ? (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Baseload</div>
                    <div className="text-gray-200">{signatures.energy.baseloadMW} MW</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Peak</div>
                    <div className="text-gray-200">{signatures.energy.peakMW} MW</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Annual Consumption</div>
                    <div className="text-gray-200">{signatures.energy.annualConsumptionMWh.toLocaleString()} MWh</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Peak Months</div>
                    <div className="text-gray-200">{signatures.energy.peakMonths.join(', ')}</div>
                  </div>
                </div>
                <ProvenanceBadge
                  sourceType="GOV"
                  sourceDescription={signatures.energy.dataSource}
                  lastUpdated={new Date().toISOString()}
                  collectionMethod="Grid operator LMP data"
                />
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-400">
                {errors.energy || 'Energy signature data unavailable'}
              </div>
            )}
          </ExpandableSection>

          {/* Municipal Impact */}
          <ExpandableSection
            title={
              <div className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-cyan-400" />
                <span>Municipal Impact</span>
                {signatures.municipal && (
                  <span className={`px-2 py-0.5 rounded text-xs ${getSignatureBadgeClasses(signatures.municipal.signature)}`}>
                    {signatures.municipal.signature.replace('_', ' ')}
                  </span>
                )}
              </div>
            }
            icon={<Droplet className="w-4 h-4" />}
          >
            {signatures.municipal ? (
              <div className="p-4 space-y-3">
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Water Consumption</div>
                    <div className="text-gray-200">
                      {signatures.municipal.waterConsumption.gallonsPerYear
                        ? `${signatures.municipal.waterConsumption.gallonsPerYear.toLocaleString()} gal/year`
                        : 'Not disclosed'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Wastewater Permits</div>
                    <div className="text-gray-200">
                      {signatures.municipal.wastewater.npdesPermitId || 'None found'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Air Permits</div>
                    <div className="text-gray-200">{signatures.municipal.airPermits.count}</div>
                  </div>
                </div>
                <ProvenanceBadge
                  sourceType="GOV"
                  sourceDescription={signatures.municipal.dataSource}
                  lastUpdated={new Date().toISOString()}
                  collectionMethod="EPA ECHO facility database"
                />
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-400">
                {errors.municipal || 'Municipal impact data unavailable'}
              </div>
            )}
          </ExpandableSection>

          {/* LM3 Economic Flow */}
          <ExpandableSection
            title={
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span>Economic Flow (LM3)</span>
                {signatures.lm3 && (
                  <span className={`px-2 py-0.5 rounded text-xs ${getSignatureBadgeClasses(signatures.lm3.signature)}`}>
                    {signatures.lm3.signature.replace('_', ' ')}
                  </span>
                )}
              </div>
            }
            icon={<DollarSign className="w-4 h-4" />}
          >
            {signatures.lm3 ? (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                      LM3 Score
                      <Tooltip content="Local Multiplier 3 score. Shows how much money stays in the local community. Score of 1.5 means $1 spent creates $1.50 in local economic activity. Higher is better - it means more money circulates locally instead of leaving the area.">
                        <Info className="w-3 h-3" />
                      </Tooltip>
                    </div>
                    <div className="text-lg font-semibold text-gray-200">{signatures.lm3.lm3Score}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                      Leakage
                      <Tooltip content="The percentage of money that leaves the local community instead of staying and circulating. Lower is better - it means more money stays local.">
                        <Info className="w-3 h-3" />
                      </Tooltip>
                    </div>
                    <div className="text-gray-200">{signatures.lm3.leakagePercentage.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Total Local Impact</div>
                    <div className="text-gray-200">{formatCurrency(signatures.lm3.totalLocalImpact)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Confidence</div>
                    <div className="text-gray-200">{signatures.lm3.confidence}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  <div className="font-medium mb-1">Assumptions:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {signatures.lm3.assumptions.slice(0, 3).map((assumption: { name: string; value: number | string; source: string }, i: number) => (
                      <li key={i}>{assumption.name}: {typeof assumption.value === 'number' ? assumption.value.toFixed(2) : assumption.value}</li>
                    ))}
                  </ul>
                </div>
                <ProvenanceBadge
                  sourceType="CALC"
                  sourceDescription="Calculated using New Economics Foundation LM3 methodology"
                  lastUpdated={new Date().toISOString()}
                  collectionMethod="Economic flow calculation"
                  limitations={['Based on estimated values', 'Assumes default spending rates']}
                />
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-400">
                {errors.lm3 || 'LM3 calculation unavailable'}
              </div>
            )}
          </ExpandableSection>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function generateSignatureSummary(signatures: any): string | null {
  const parts: string[] = [];
  
  if (signatures.labor) {
    parts.push(`[${signatures.labor.rhythmType.replace('_', ' ')}] employment`);
  }
  if (signatures.municipal) {
    parts.push(`[${signatures.municipal.signature.replace('_', ' ')}] of municipal resources`);
  }
  if (signatures.lm3) {
    parts.push(`[${signatures.lm3.signature.replace('_', ' ')}] economic patterns`);
  }

  if (parts.length === 0) return null;

  return `This facility shows ${parts.join(' with ')}.`;
}

