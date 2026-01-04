import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader, AlertCircle, Sparkles, ChevronRight, X, TrendingUp, TrendingDown, MapPin, Building2, DollarSign } from 'lucide-react';
import { useNaturalLanguageSearch, useSearchSuggestions } from '../hooks/useNaturalLanguageSearch';
import { getRecentSearches } from '../utils/queryCache';
import type { Facility } from '../types';

interface NaturalLanguageSearchProps {
  onResults: (facilities: Facility[]) => void;
  onFacilityClick: (facility: Facility) => void;
}

export const NaturalLanguageSearch: React.FC<NaturalLanguageSearchProps> = ({
  onResults,
  onFacilityClick
}) => {
  const [searchState, { search, clear }] = useNaturalLanguageSearch();
  const suggestions = useSearchSuggestions();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches(5));
  }, [searchState.results]); // Reload when search completes
  
  // Update parent with results
  useEffect(() => {
    if (searchState.results.length > 0) {
      onResults(searchState.results);
    }
  }, [searchState.results, onResults]);
  
  const handleSearch = async (query?: string) => {
    const queryToSearch = query || inputValue;
    if (!queryToSearch.trim()) return;
    
    setShowSuggestions(false);
    await search(queryToSearch);
  };
  
  const handleClear = () => {
    setInputValue('');
    clear();
    inputRef.current?.focus();
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    handleSearch(suggestion);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };
  
  return (
    <div className="natural-language-search">
      {/* Search Input */}
      <div className="relative">
        {/* HOVER ME Badge */}
        {!inputValue && !searchState.isLoading && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10 animate-pulse">
            <div className="bg-gradient-to-r from-[#00d2d3] to-[#ffa502] text-black font-bold px-6 py-2 rounded-full text-sm shadow-lg shadow-[#00d2d3]/50">
              ⬇️ HOVER ME - Interactive! ⬇️
            </div>
          </div>
        )}
        
        <div className="relative flex items-center">
          {/* Icon */}
          <div className="absolute left-4 flex items-center gap-2">
            {searchState.isLoading ? (
              <Loader size={20} className="text-[#00d2d3] animate-spin" />
            ) : (
              <Search size={20} className="text-[#00d2d3]" />
            )}
            <Sparkles size={16} className="text-[#ffa502]" />
          </div>
          
          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Ask anything: 'Show me non-compliant facilities in Texas'"
            className="w-full pl-20 pr-24 py-4 bg-[#0a0e17] border-2 border-[#00d2d3]/30 
                       rounded-lg text-white placeholder-gray-500 
                       focus:border-[#00d2d3] focus:outline-none transition-all text-sm
                       hover:border-[#00d2d3]/70 hover:shadow-lg hover:shadow-[#00d2d3]/30 hover:scale-[1.02]
                       hover:bg-[#0f1421] transition-all duration-300"
            disabled={searchState.isLoading}
          />
          
          {/* Action Buttons */}
          <div className="absolute right-2 flex items-center gap-2">
            {inputValue && (
              <button
                onClick={handleClear}
                className="p-2 hover:bg-white/10 rounded transition-colors"
                title="Clear"
              >
                <X size={16} className="text-gray-400" />
              </button>
            )}
            <button
              onClick={() => handleSearch()}
              disabled={!inputValue.trim() || searchState.isLoading}
              className="px-4 py-2 bg-[#00d2d3] hover:bg-[#00d2d3]/80 text-black 
                         font-semibold rounded-lg transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed text-sm"
            >
              Search
            </button>
          </div>
        </div>
        
        {/* Suggestions Dropdown */}
        {showSuggestions && !searchState.isLoading && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0d1219] border border-[#00d2d3]/30 
                          rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="p-3 border-b border-[#00d2d3]/20">
                <div className="text-xs font-semibold text-gray-400 mb-2">Recent Searches</div>
                {recentSearches.map((recent, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(recent)}
                    className="w-full text-left p-2 hover:bg-[#00d2d3]/10 rounded text-sm text-white
                               transition-colors flex items-center gap-2 group"
                  >
                    <Search size={14} className="text-gray-400 group-hover:text-[#00d2d3]" />
                    <span className="flex-1 truncate">{recent}</span>
                    <ChevronRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
            
            {/* Example Queries */}
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-400 mb-2">Example Queries</div>
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-2 hover:bg-[#00d2d3]/10 rounded text-sm text-white
                             transition-colors flex items-center gap-2 group"
                >
                  <Sparkles size={14} className="text-[#ffa502] group-hover:scale-110 transition-transform" />
                  <span className="flex-1">{suggestion}</span>
                  <ChevronRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Status Messages */}
      {searchState.conversionMethod && !searchState.error && (
        <div className={`mt-3 p-3 rounded-lg border ${
          searchState.conversionMethod === 'api' 
            ? 'bg-[#2ed573]/10 border-[#2ed573]/30' 
            : searchState.conversionMethod === 'cached'
            ? 'bg-[#00d2d3]/10 border-[#00d2d3]/30'
            : 'bg-[#ffa502]/10 border-[#ffa502]/30'
        }`}>
          <div className="flex items-start gap-2">
            <Sparkles size={16} className={
              searchState.conversionMethod === 'api' ? 'text-[#2ed573]' :
              searchState.conversionMethod === 'cached' ? 'text-[#00d2d3]' :
              'text-[#ffa502]'
            } />
            <div className="flex-1">
              <div className="text-xs font-semibold text-white mb-1">
                {searchState.conversionMethod === 'api' && 'AI-Powered Search'}
                {searchState.conversionMethod === 'cached' && 'Cached Search'}
                {searchState.conversionMethod === 'keywords' && 'Keyword Search'}
              </div>
              <div className="text-xs text-gray-300">
                {searchState.queryDescription}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Warning */}
      {searchState.warning && (
        <div className="mt-3 p-3 bg-[#ffa502]/10 border border-[#ffa502]/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-[#ffa502] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#ffa502]">{searchState.warning}</p>
          </div>
        </div>
      )}
      
      {/* Error */}
      {searchState.error && (
        <div className="mt-3 p-3 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-[#ff4757] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#ff4757]">{searchState.error}</p>
          </div>
        </div>
      )}
      
      {/* Results Summary */}
      {searchState.stats && !searchState.error && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 bg-[#00d2d3]/10 border border-[#00d2d3]/20 rounded-lg">
            <div className="text-xs text-gray-400">Total Results</div>
            <div className="text-2xl font-bold text-[#00d2d3] mt-1">
              {searchState.stats.total.toLocaleString()}
            </div>
          </div>
          
          <div className="p-3 bg-[#2ed573]/10 border border-[#2ed573]/20 rounded-lg">
            <div className="text-xs text-gray-400">Compliant</div>
            <div className="text-2xl font-bold text-[#2ed573] mt-1">
              {searchState.stats.compliant.toLocaleString()}
            </div>
          </div>
          
          <div className="p-3 bg-[#ff4757]/10 border border-[#ff4757]/20 rounded-lg">
            <div className="text-xs text-gray-400">Non-Compliant</div>
            <div className="text-2xl font-bold text-[#ff4757] mt-1">
              {searchState.stats.nonCompliant.toLocaleString()}
            </div>
          </div>
          
          <div className="p-3 bg-[#ffa502]/10 border border-[#ffa502]/20 rounded-lg">
            <div className="text-xs text-gray-400">Total Gap</div>
            <div className="text-xl font-bold text-[#ffa502] mt-1">
              {'$'}{(searchState.stats.totalSubsidyGap / 1e9).toFixed(2)}B
            </div>
          </div>
          
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="text-xs text-gray-400">Avg Job Rate</div>
            <div className="text-xl font-bold text-white mt-1 flex items-center gap-1">
              {(searchState.stats.avgJobFulfillment * 100).toFixed(0)}%
              {searchState.stats.avgJobFulfillment >= 0.8 ? (
                <TrendingUp size={16} className="text-[#2ed573]" />
              ) : (
                <TrendingDown size={16} className="text-[#ff4757]" />
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Results List */}
      {searchState.results.length > 0 && !searchState.error && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">
              Results ({searchState.results.length.toLocaleString()})
            </h3>
            <button
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear Results
            </button>
          </div>
          
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {searchState.results.map((facility) => (
              <button
                key={facility.id}
                onClick={() => onFacilityClick(facility)}
                className="w-full p-4 bg-[#0d1219] border border-[#00d2d3]/20 hover:border-[#00d2d3]
                           rounded-lg transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Facility Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        facility.complianceStatus === 'Compliant' ? 'bg-[#2ed573]' :
                        facility.complianceStatus === 'At Risk' ? 'bg-[#ffa502]' :
                        'bg-[#ff4757]'
                      }`} />
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-[#00d2d3] transition-colors">
                        {facility.name}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        {facility.city}, {facility.state}
                      </div>
                      {facility.operator && (
                        <div className="flex items-center gap-1">
                          <Building2 size={12} />
                          {facility.operator}
                        </div>
                      )}
                    </div>
                    
                    {facility.jobsPromised && (
                      <div className="text-xs text-gray-500">
                        Jobs: {facility.jobsCreated || 0} / {facility.jobsPromised} 
                        ({((facility.jobsCreated || 0) / facility.jobsPromised * 100).toFixed(0)}%)
                      </div>
                    )}
                  </div>
                  
                  {/* Right: Key Metrics */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-sm font-bold text-[#ff4757]">
                      <DollarSign size={14} />
                      {(facility.subsidyGap / 1e6).toFixed(1)}M
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">subsidy gap</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!searchState.isLoading && !searchState.results.length && !searchState.error && inputValue && (
        <div className="mt-8 text-center py-12">
          <Search size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No results found. Try a different query.</p>
        </div>
      )}
    </div>
  );
};

