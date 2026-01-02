import { useState, useMemo, memo } from 'react';
import { Facility, ComplianceStats } from '../../types';
import { calculateStats } from '../../utils/stats';
import { formatCurrency } from '../../utils/formatting';
import { getComplianceBadgeClasses } from '../../utils/classHelpers';
import { Building2, MapPin, TrendingUp, TrendingDown, Minus, ArrowRight, X, Search } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import { NestedTabs } from '../shared/NestedTabs';
import { AutocompleteInput } from '../shared/AutocompleteInput';
import { AutocompleteOption } from '../shared/AutocompleteInput';
import { useNLPSearchSuggestions } from '../../hooks/useNLPSearchSuggestions';
import { recordSearch } from '../../db/searchHistory';

interface ComplianceComparisonTabProps {
  facilities: Facility[];
}

type ComparisonLevel = 'state' | 'facility' | 'regional' | 'local';
type ComparisonItem = {
  id: string;
  label: string;
  level: ComparisonLevel;
  stats: ComplianceStats;
  facilities: Facility[];
};

interface ComparisonMetric {
  label: string;
  getValue: (item: ComparisonItem) => number | string;
  format?: (value: number | string) => string;
  higherIsBetter?: boolean;
}

const ComparisonMetrics: ComparisonMetric[] = [
  {
    label: 'Total Facilities',
    getValue: (item) => item.stats.totalFacilities,
    format: (v) => (typeof v === 'number' ? v.toLocaleString() : v),
  },
  {
    label: 'Compliant',
    getValue: (item) => item.stats.compliant,
    format: (v) => (typeof v === 'number' ? v.toLocaleString() : v),
    higherIsBetter: true,
  },
  {
    label: 'Non-Compliant',
    getValue: (item) => item.stats.nonCompliant,
    format: (v) => (typeof v === 'number' ? v.toLocaleString() : v),
    higherIsBetter: false,
  },
  {
    label: 'At Risk',
    getValue: (item) => item.stats.atRisk,
    format: (v) => (typeof v === 'number' ? v.toLocaleString() : v),
    higherIsBetter: false,
  },
  {
    label: 'Total Subsidy Gap',
    getValue: (item) => item.stats.totalSubsidyGap,
    format: (v) => formatCurrency(typeof v === 'number' ? v : 0),
    higherIsBetter: false,
  },
  {
    label: 'Avg Subsidy Gap per Facility',
    getValue: (item) => item.stats.totalFacilities > 0 ? item.stats.totalSubsidyGap / item.stats.totalFacilities : 0,
    format: (v) => formatCurrency(typeof v === 'number' ? v : 0),
    higherIsBetter: false,
  },
  {
    label: 'Compliance Rate',
    getValue: (item) => item.stats.totalFacilities > 0 ? (item.stats.compliant / item.stats.totalFacilities) * 100 : 0,
    format: (v) => `${(typeof v === 'number' ? v : 0).toFixed(1)}%`,
    higherIsBetter: true,
  },
];

const ComplianceComparisonTab = memo(function ComplianceComparisonTab({ facilities }: ComplianceComparisonTabProps) {
  const [comparisonLevel, setComparisonLevel] = useState<ComparisonLevel>('state');
  const [selectedItems, setSelectedItems] = useState<ComparisonItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Generate comparison items based on level
  const availableItems = useMemo(() => {
    const items: ComparisonItem[] = [];

    if (comparisonLevel === 'state') {
      const stateMap = new Map<string, Facility[]>();
      facilities.forEach(f => {
        if (!stateMap.has(f.state)) {
          stateMap.set(f.state, []);
        }
        stateMap.get(f.state)!.push(f);
      });

      stateMap.forEach((stateFacilities, state) => {
        items.push({
          id: `state-${state}`,
          label: state,
          level: 'state',
          stats: calculateStats(stateFacilities),
          facilities: stateFacilities,
        });
      });
    } else if (comparisonLevel === 'facility') {
      facilities.slice(0, 100).forEach(facility => {
        items.push({
          id: `facility-${facility.id}`,
          label: facility.name,
          level: 'facility',
          stats: calculateStats([facility]),
          facilities: [facility],
        });
      });
    } else if (comparisonLevel === 'regional') {
      // Regional = multi-state regions (e.g., Northeast, West Coast, etc.)
      const regions: Record<string, string[]> = {
        'Northeast': ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'],
        'Southeast': ['DE', 'MD', 'VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'AR', 'LA'],
        'Midwest': ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
        'Southwest': ['TX', 'OK', 'NM', 'AZ'],
        'West': ['CO', 'WY', 'MT', 'ID', 'UT', 'NV', 'CA', 'OR', 'WA', 'AK', 'HI'],
      };

      Object.entries(regions).forEach(([regionName, states]) => {
        const regionFacilities = facilities.filter(f => states.includes(f.state));
        if (regionFacilities.length > 0) {
          items.push({
            id: `region-${regionName}`,
            label: regionName,
            level: 'regional',
            stats: calculateStats(regionFacilities),
            facilities: regionFacilities,
          });
        }
      });
    } else if (comparisonLevel === 'local') {
      // Local = city-level
      const cityMap = new Map<string, Facility[]>();
      facilities.forEach(f => {
        const key = `${f.city}, ${f.state}`;
        if (!cityMap.has(key)) {
          cityMap.set(key, []);
        }
        cityMap.get(key)!.push(f);
      });

      cityMap.forEach((cityFacilities, city) => {
        if (cityFacilities.length >= 3) { // Only show cities with 3+ facilities
          items.push({
            id: `local-${city}`,
            label: city,
            level: 'local',
            stats: calculateStats(cityFacilities),
            facilities: cityFacilities,
          });
        }
      });
    }

    // Sort by total subsidy gap (descending)
    return items.sort((a, b) => b.stats.totalSubsidyGap - a.stats.totalSubsidyGap);
  }, [facilities, comparisonLevel]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return availableItems;
    const query = searchQuery.toLowerCase();
    return availableItems.filter(item => item.label.toLowerCase().includes(query));
  }, [availableItems, searchQuery]);
  
  // Convert available items to autocomplete options
  const searchOptions = useMemo((): AutocompleteOption[] => {
    return availableItems.map(item => ({
      value: item.label,
      label: item.label,
      category: comparisonLevel === 'state' ? 'States' : 
                comparisonLevel === 'regional' ? 'Regions' :
                comparisonLevel === 'local' ? 'Cities' : 
                'Facilities',
      metadata: {
        description: `${item.stats.totalFacilities} facilities • ${formatCurrency(item.stats.totalSubsidyGap)} gap`,
        item
      }
    }));
  }, [availableItems, comparisonLevel]);

  const nlpOptions = useNLPSearchSuggestions({
    context: 'table',
    facilities,
    includeFacilities: true,
    includeOperators: true,
    includePlaces: true,
  });

  const combinedSearchOptions = useMemo(() => {
    // prefer local comparison items first, then global NLP suggestions
    return [...searchOptions, ...nlpOptions];
  }, [nlpOptions, searchOptions]);

  const handleItemToggle = (item: ComparisonItem) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      } else if (prev.length < 4) {
        return [...prev, item];
      }
      return prev; // Max 4 items
    });
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Calculate differences between selected items
  const comparisonData = useMemo(() => {
    if (selectedItems.length < 2) return null;

    const data = ComparisonMetrics.map(metric => {
      const values = selectedItems.map(item => {
        const value = metric.getValue(item);
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      });
      const max = Math.max(...values);
      const min = Math.min(...values);
      const diff = max - min;
      const percentDiff = min > 0 ? (diff / min) * 100 : 0;

      return {
        metric,
        values,
        diff,
        percentDiff,
        bestIndex: metric.higherIsBetter ? values.indexOf(max) : values.indexOf(min),
        worstIndex: metric.higherIsBetter ? values.indexOf(min) : values.indexOf(max),
      };
    });

    return data;
  }, [selectedItems]);

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Compliance Data Comparison</h2>
          <p className="text-sm text-gray-400">
            Compare and contrast compliance metrics across states, facilities, regions, or local areas
          </p>
        </div>

        {/* Level Selection */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium text-gray-300">Comparison Level:</span>
            <div className="flex gap-2">
              {(['state', 'facility', 'regional', 'local'] as ComparisonLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => {
                    setComparisonLevel(level);
                    setSelectedItems([]);
                    setSearchQuery('');
                  }}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    comparisonLevel === level
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <AutocompleteInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSelect={(option) => {
                recordSearch(option.value, 'table');
                // Auto-add selected item to comparison
                if (option.metadata?.item) {
                  const item = option.metadata.item as ComparisonItem;
                  handleItemToggle(item);
                }
              }}
              options={combinedSearchOptions}
              placeholder={`Search ${comparisonLevel}...`}
              icon={<Search className="w-4 h-4" />}
              minChars={1}
              maxSuggestions={10}
              id="comparison-search"
              className="w-full text-sm text-gray-200 placeholder-gray-500"
            />
          </div>

          {/* Available Items List */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredItems.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">
                No {comparisonLevel} items found
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedItems.some(s => s.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemToggle(item)}
                    className={`w-full text-left px-4 py-3 rounded border transition-colors ${
                      isSelected
                        ? 'bg-amber-900/30 border-amber-600 text-amber-200'
                        : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {item.stats.totalFacilities} facilities • {formatCurrency(item.stats.totalSubsidyGap)} gap
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-4 px-2 py-1 bg-amber-600 text-white rounded text-xs font-medium">
                          Selected
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">
                  Selected ({selectedItems.length}/4):
                </span>
                <button
                  onClick={clearSelection}
                  className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map(item => (
                  <div
                    key={item.id}
                    className="px-3 py-1.5 bg-amber-900/30 border border-amber-600 rounded text-sm text-amber-200 flex items-center gap-2"
                  >
                    <span>{item.label}</span>
                    <button
                      onClick={() => handleItemToggle(item)}
                      className="hover:text-amber-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comparison Table */}
        {selectedItems.length >= 2 && comparisonData && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold">Side-by-Side Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Metric</th>
                    {selectedItems.map((item) => (
                      <th key={item.id} className="px-6 py-3 text-center text-sm font-medium text-gray-300 min-w-[200px]">
                        {item.label}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-center text-sm font-medium text-gray-300">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, rowIdx) => {
                    const { metric, values, percentDiff, bestIndex, worstIndex } = row;
                    return (
                      <tr key={rowIdx} className="border-b border-gray-700/50 hover:bg-gray-900/50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-200">{metric.label}</td>
                        {values.map((value, idx) => {
                          const isBest = idx === bestIndex && metric.higherIsBetter !== undefined;
                          const isWorst = idx === worstIndex && metric.higherIsBetter !== undefined;
                          return (
                            <td key={idx} className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-sm text-gray-200">
                                  {metric.format ? metric.format(value) : String(value)}
                                </span>
                                {isBest && (
                                  <TrendingUp className="w-4 h-4 text-green-400" />
                                )}
                                {isWorst && (
                                  <TrendingDown className="w-4 h-4 text-red-400" />
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-sm">
                            {percentDiff > 0 ? (
                              <>
                                <span className={percentDiff > 50 ? 'text-red-400' : 'text-yellow-400'}>
                                  {percentDiff.toFixed(1)}%
                                </span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                              </>
                            ) : (
                              <Minus className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Facility Lists */}
        {selectedItems.length >= 2 && (
          <NestedTabs
            tabs={selectedItems.map(item => ({
              id: item.id,
              label: item.label,
              icon: comparisonLevel === 'state' ? <MapPin className="w-4 h-4" /> : <Building2 className="w-4 h-4" />,
              badge: item.stats.totalFacilities,
              content: (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-900 rounded">
                      <div className="text-xs text-gray-400 mb-1">Total Facilities</div>
                      <div className="text-lg font-semibold text-gray-200">
                        {item.stats.totalFacilities.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-900 rounded">
                      <div className="text-xs text-gray-400 mb-1">Compliant</div>
                      <div className="text-lg font-semibold text-green-400">
                        {item.stats.compliant.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-900 rounded">
                      <div className="text-xs text-gray-400 mb-1">Non-Compliant</div>
                      <div className="text-lg font-semibold text-red-400">
                        {item.stats.nonCompliant.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-900 rounded">
                      <div className="text-xs text-gray-400 mb-1">Total Subsidy Gap</div>
                      <div className="text-lg font-semibold text-yellow-400">
                        {formatCurrency(item.stats.totalSubsidyGap)}
                      </div>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {item.facilities.slice(0, 50).map(facility => (
                        <div
                          key={facility.id}
                          className="p-3 bg-gray-900 rounded border border-gray-800 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-200">{facility.name}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {facility.type} • {facility.city}, {facility.state}
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <div className="text-sm font-semibold text-yellow-400">
                              {formatCurrency(facility.subsidyGap)}
                            </div>
                            <div className="mt-1">
                              <span
                                className={`px-2 py-1 rounded text-xs ${getComplianceBadgeClasses(facility.complianceStatus)}`}
                              >
                                {facility.complianceStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {item.facilities.length > 50 && (
                        <div className="text-center text-sm text-gray-400 py-2">
                          Showing first 50 of {item.facilities.length} facilities
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ),
            }))}
          />
        )}

        {selectedItems.length < 2 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
            <div className="text-gray-400 mb-2">Select 2-4 items above to compare</div>
            <div className="text-sm text-gray-500">
              Choose items from the list and click to add them to your comparison
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});

export default ComplianceComparisonTab;

