/**
 * Enhanced Search Bar with FlexSearch
 * 
 * Features:
 * - Instant autocomplete with debouncing
 * - Highlighted matching text
 * - Recent searches (React state)
 * - Filter chips
 * - Keyboard navigation
 */

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, MapPin, Building2, Server, Clock } from 'lucide-react';
import { searchFacilities, getSuggestions, isIndexReady } from '../search/SearchEngine';
import type { Facility } from '../types';

interface SearchBarProps {
  onSelect: (facility: { id: number; name: string }) => void;
  onSearch: (query: string) => void;
  className?: string;
}

interface SearchResult {
  id: number;
  name: string;
  provider: string;
  city: string;
  state: string;
  type: 'facility' | 'city' | 'provider';
}

const SearchBar: React.FC<SearchBarProps> = memo(({ onSelect, onSearch, className = '' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Debounced search
  const performSearch = useCallback((searchQuery: string) => {
    if (!isIndexReady()) {
      console.warn('[SearchBar] FlexSearch index not ready');
      return;
    }

    if (!searchQuery.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const facilityResults = searchFacilities(searchQuery, { limit: 20 });
    
    const formattedResults: SearchResult[] = facilityResults.map(f => ({
      id: f.id,
      name: f.name,
      provider: f.provider,
      city: f.city,
      state: f.state,
      type: 'facility' as const,
    }));

    setResults(formattedResults);
    setShowDropdown(true);
    setSelectedIndex(0);
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setQuery(value);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(value);
      onSearch(value);
    }, 300);
  };

  // Handle result selection
  const handleSelect = (result: SearchResult) => {
    onSelect({ id: result.id, name: result.name });
    setQuery(result.name);
    setShowDropdown(false);
    
    // Add to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== result.name);
      return [result.name, ...filtered].slice(0, 10);
    });
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) {
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setActiveFilter(null);
    onSearch('');
    inputRef.current?.focus();
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const filters = [
    { id: 'provider', label: 'Provider' },
    { id: 'state', label: 'State' },
    { id: 'status', label: 'Status' },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'facility':
        return <Building2 className="w-4 h-4 text-blue-400" />;
      case 'city':
        return <MapPin className="w-4 h-4 text-green-400" />;
      case 'provider':
        return <Server className="w-4 h-4 text-purple-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-cyan-500/30 text-cyan-300 font-semibold">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setShowDropdown(true)}
          placeholder="Search facilities, cities, or providers..."
          className="w-full pl-11 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-400 hover:text-white" />
          </button>
        )}
        
        {/* Result Count Badge */}
        {results.length > 0 && showDropdown && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded-md">
            <span className="text-xs font-mono text-cyan-400">{results.length}</span>
          </div>
        )}
      </div>

      {/* Filter Chips */}
      {!showDropdown && (
        <div className="mt-2 flex gap-2">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeFilter === filter.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (results.length > 0 || recentSearches.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto"
        >
          {/* Results */}
          {results.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-slate-400 px-2 py-1 font-medium">Results</div>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    index === selectedIndex
                      ? 'bg-cyan-500/20 border border-cyan-500/30'
                      : 'hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {highlightMatch(result.name, query)}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {result.city}, {result.state} • {result.provider}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : recentSearches.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-slate-400 px-2 py-1 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleInputChange(search)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-700 transition-colors"
                >
                  <div className="text-sm text-slate-300">{search}</div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;

