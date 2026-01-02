import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Check } from 'lucide-react';

export interface AutocompleteOption {
  value: string;
  label: string;
  category?: string;
  metadata?: Record<string, any>;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  maxSuggestions?: number;
  minChars?: number;
  allowCustomValue?: boolean;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

/**
 * Reusable autocomplete input component with fuzzy matching and keyboard navigation
 * 
 * Features:
 * - Fuzzy matching with highlighting
 * - Keyboard navigation (↑/↓ to navigate, Enter to select, Esc to close)
 * - Category grouping
 * - Custom value support
 * - Loading states
 * - Accessible (ARIA attributes)
 */
export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  options = [], // Default to empty array
  placeholder = 'Search...',
  className = '',
  disabled = false,
  icon,
  loading = false,
  maxSuggestions = 10,
  minChars = 1,
  allowCustomValue = true,
  id,
  onKeyDown,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fuzzy match scoring
  const fuzzyMatch = useCallback((text: string, query: string): number => {
    if (!query) return 0;
    
    text = text.toLowerCase();
    query = query.toLowerCase();
    
    // Exact match gets highest score
    if (text === query) return 1000;
    
    // Starts with query gets high score
    if (text.startsWith(query)) return 500;
    
    // Contains query gets medium score
    if (text.includes(query)) return 250;
    
    // Fuzzy match - all characters in order
    let score = 0;
    let queryIndex = 0;
    let lastMatchIndex = -1;
    
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        // Bonus for consecutive matches
        score += (lastMatchIndex === i - 1) ? 10 : 5;
        lastMatchIndex = i;
        queryIndex++;
      }
    }
    
    // Return score only if all query characters matched
    return queryIndex === query.length ? score : 0;
  }, []);

  // Filter and sort options
  useEffect(() => {
    if (!value || value.length < minChars) {
      setFilteredOptions([]);
      setIsOpen(false);
      return;
    }

    const scored = options
      .map(option => ({
        option,
        score: Math.max(
          fuzzyMatch(option.label, value),
          fuzzyMatch(option.value, value)
        )
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(item => item.option);

    setFilteredOptions(scored);
    setIsOpen(scored.length > 0);
    setSelectedIndex(-1);
  }, [value, options, fuzzyMatch, maxSuggestions, minChars]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (onKeyDown) onKeyDown(e);
      return;
    }

    // When dropdown is open, handle navigation keys here and stop propagation
    let handled = false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation(); // Prevent global handlers
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        handled = true;
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation(); // Prevent global handlers
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        handled = true;
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation(); // Prevent global handlers
        if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
          handleSelect(filteredOptions[selectedIndex]);
        } else if (allowCustomValue && onKeyDown) {
          onKeyDown(e);
        }
        handled = true;
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation(); // Prevent global handlers
        setIsOpen(false);
        setSelectedIndex(-1);
        handled = true;
        break;
      case 'Tab':
        // Allow Tab to work normally but close dropdown
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        if (onKeyDown) onKeyDown(e);
    }

    // For navigation keys, don't call onKeyDown if handled
    if (!handled && onKeyDown) {
      onKeyDown(e);
    }
  }, [isOpen, selectedIndex, filteredOptions, allowCustomValue, onKeyDown]);

  // Handle option selection
  const handleSelect = useCallback((option: AutocompleteOption) => {
    onChange(option.value);
    if (onSelect) onSelect(option);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  }, [onChange, onSelect]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected option into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const startIndex = lowerText.indexOf(lowerQuery);
    
    if (startIndex === -1) return text;
    
    const endIndex = startIndex + query.length;
    return (
      <>
        {text.substring(0, startIndex)}
        <span className="bg-amber-400/30 text-amber-200 font-semibold">
          {text.substring(startIndex, endIndex)}
        </span>
        {text.substring(endIndex)}
      </>
    );
  };

  // Group options by category
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    const category = option.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(option);
    return acc;
  }, {} as Record<string, AutocompleteOption[]>);

  return (
    <div className="relative w-full">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.length >= minChars && filteredOptions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors ${className}`}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${id}-dropdown`}
          aria-activedescendant={selectedIndex >= 0 ? `${id}-option-${selectedIndex}` : undefined}
        />
        {value && !loading && (
          <button
            onClick={() => {
              onChange('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors z-10"
            tabIndex={-1}
            aria-label="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          id={`${id}-dropdown`}
          className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-80 overflow-y-auto scroll-smooth"
          role="listbox"
        >
          {Object.entries(groupedOptions).map(([category, categoryOptions], categoryIndex) => (
            <div key={category}>
              {Object.keys(groupedOptions).length > 1 && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-gray-900 sticky top-0 z-10 border-b border-gray-700">
                  {category}
                </div>
              )}
              {categoryOptions.map((option, optionIndex) => {
                const globalIndex = filteredOptions.indexOf(option);
                const isSelected = globalIndex === selectedIndex;
                
                return (
                  <button
                    key={`${option.value}-${optionIndex}`}
                    id={`${id}-option-${globalIndex}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {highlightMatch(option.label, value)}
                      </div>
                      {option.metadata?.description && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {option.metadata.description}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 ml-2 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {isOpen && filteredOptions.length === 0 && value.length >= minChars && !loading && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-4 text-center text-gray-400 text-sm">
          No matches found
          {allowCustomValue && (
            <div className="mt-2 text-xs">
              Press <kbd className="px-1 py-0.5 bg-gray-700 rounded">Enter</kbd> to use custom value
            </div>
          )}
        </div>
      )}
    </div>
  );
}

