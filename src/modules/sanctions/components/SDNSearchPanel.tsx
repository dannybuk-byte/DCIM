/**
 * SDN Search Panel Component
 * Search the OFAC Specially Designated Nationals list
 * 
 * Features:
 * - Fuzzy name matching
 * - Filter by program (RUSSIA, CYBER2, etc.)
 * - Filter by country
 * - View entity details
 */

import React, { useState, useCallback } from 'react';
import {
  Search,
  AlertTriangle,
  Globe,
  Building2,
  User,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { SDNEntry } from '../types/sanctions';
import { 
  searchSDN, 
  getSDNByProgram, 
  getSDNByCountry,
  fetchSDNList,
  getSDNStats,
} from '../services/sdnService';

export const SDNSearchPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SDNEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'name' | 'program' | 'country'>('name');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.7);
  const [stats, setStats] = useState<{
    totalEntries: number;
    byProgram: Record<string, number>;
    byCountry: Record<string, number>;
  } | null>(null);

  // Load stats on mount
  React.useEffect(() => {
    getSDNStats().then(setStats);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      let searchResults: SDNEntry[] = [];

      switch (searchType) {
        case 'name':
          searchResults = await searchSDN(searchQuery, threshold);
          break;
        case 'program':
          searchResults = await getSDNByProgram(searchQuery);
          break;
        case 'country':
          searchResults = await getSDNByCountry(searchQuery);
          break;
      }

      setResults(searchResults);
    } catch (error) {
      console.error('SDN search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchType, threshold]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getTypeIcon = (type: SDNEntry['sdnType']) => {
    switch (type) {
      case 'Individual':
        return <User className="w-4 h-4" />;
      case 'Entity':
        return <Building2 className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getProgramColor = (program: string): string => {
    if (program.includes('RUSSIA')) return 'bg-red-900/50 text-red-300 border-red-700';
    if (program.includes('CYBER')) return 'bg-purple-900/50 text-purple-300 border-purple-700';
    if (program.includes('IRAN')) return 'bg-orange-900/50 text-orange-300 border-orange-700';
    if (program.includes('KOREA') || program.includes('DPRK')) return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Type */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as typeof searchType)}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
            >
              <option value="name">Search by Name</option>
              <option value="program">Filter by Program</option>
              <option value="country">Filter by Country</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                searchType === 'name' ? 'Enter entity or individual name...' :
                searchType === 'program' ? 'Enter program code (e.g., RUSSIA, CYBER2)...' :
                'Enter country name...'
              }
              className="w-full bg-slate-800 border border-slate-700 rounded pl-10 pr-4 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Threshold Slider (for name search) */}
          {searchType === 'name' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">Match: {Math.round(threshold * 100)}%</span>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-24"
              />
            </div>
          )}

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </div>

        {/* Quick Program Filters */}
        {stats && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-slate-400">Quick filters:</span>
            {Object.entries(stats.byProgram)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([program, count]) => (
                <button
                  key={program}
                  onClick={() => {
                    setSearchType('program');
                    setSearchQuery(program);
                    setTimeout(handleSearch, 100);
                  }}
                  className={`px-2 py-1 text-xs rounded border ${getProgramColor(program)} hover:opacity-80 transition-opacity`}
                >
                  {program} ({count})
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {results.length > 0 && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">
              {results.length} Result{results.length !== 1 ? 's' : ''} Found
            </h3>
            <div className="text-xs text-slate-500">
              SDN List: {stats?.totalEntries.toLocaleString()} entries
            </div>
          </div>
        )}

        {results.map((entry) => (
          <div
            key={entry.uid}
            className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
          >
            {/* Entry Header */}
            <button
              onClick={() => setExpandedEntry(expandedEntry === entry.uid ? null : entry.uid)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-900/30 rounded">
                  {getTypeIcon(entry.sdnType)}
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    {entry.lastName}
                    {entry.firstName && `, ${entry.firstName}`}
                    <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">
                      {entry.sdnType}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.programs.slice(0, 3).map((program) => (
                      <span
                        key={program}
                        className={`text-xs px-2 py-0.5 rounded border ${getProgramColor(program)}`}
                      >
                        {program}
                      </span>
                    ))}
                    {entry.programs.length > 3 && (
                      <span className="text-xs text-slate-500">
                        +{entry.programs.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {expandedEntry === entry.uid ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Expanded Details */}
            {expandedEntry === entry.uid && (
              <div className="px-4 pb-4 space-y-4 border-t border-slate-800">
                {/* UID */}
                <div className="pt-3">
                  <div className="text-xs text-slate-500">OFAC UID</div>
                  <div className="text-sm font-mono">{entry.uid}</div>
                </div>

                {/* Programs */}
                <div>
                  <div className="text-xs text-slate-500 mb-1">Sanctions Programs</div>
                  <div className="flex flex-wrap gap-1">
                    {entry.programs.map((program) => (
                      <span
                        key={program}
                        className={`text-xs px-2 py-1 rounded border ${getProgramColor(program)}`}
                      >
                        {program}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Addresses */}
                {entry.addresses.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Known Addresses</div>
                    <div className="space-y-1">
                      {entry.addresses.map((addr, idx) => (
                        <div key={idx} className="text-sm text-slate-300 flex items-center gap-2">
                          <Globe className="w-3 h-3 text-slate-500" />
                          {[addr.address1, addr.city, addr.stateProvince, addr.country]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* IDs */}
                {entry.ids.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Identification Numbers</div>
                    <div className="space-y-1">
                      {entry.ids.map((id, idx) => (
                        <div key={idx} className="text-sm text-slate-300">
                          <span className="text-slate-500">{id.idType}:</span> {id.idNumber}
                          {id.idCountry && <span className="text-slate-500"> ({id.idCountry})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AKAs */}
                {entry.akas.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Also Known As</div>
                    <div className="flex flex-wrap gap-2">
                      {entry.akas.map((aka, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-700"
                        >
                          {aka.lastName}{aka.firstName && `, ${aka.firstName}`}
                          <span className="text-slate-500 ml-1">({aka.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                {entry.remarks && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Remarks</div>
                    <div className="text-sm text-slate-300 p-2 bg-slate-800 rounded">
                      {entry.remarks}
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="p-3 bg-red-900/30 border border-red-800 rounded flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-300">
                    <strong>OFAC Sanctions Warning:</strong> Transactions with this entity may violate U.S. sanctions law.
                    Data center operators face strict liability for hosting sanctioned entities even without knowledge or intent.
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {results.length === 0 && searchQuery && !loading && (
          <div className="text-center py-8 text-slate-400">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No results found for &quot;{searchQuery}&quot;</p>
            <p className="text-xs mt-1">Try adjusting your search or lowering the match threshold</p>
          </div>
        )}
      </div>
    </div>
  );
};

