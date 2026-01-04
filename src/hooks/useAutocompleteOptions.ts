import { useMemo } from 'react';
import { Facility } from '../types';
import { AutocompleteOption } from '../components/shared/AutocompleteInput';

/**
 * Custom hooks to generate autocomplete options from facilities data
 */

export function useFacilityAutocomplete(facilities: Facility[]): AutocompleteOption[] {
  return useMemo(() => {
    return facilities.map(f => ({
      value: f.name,
      label: f.name,
      category: f.type,
      metadata: {
        description: `${f.operator} • ${f.city}, ${f.state}`,
        facility: f,
        id: f.id
      }
    }));
  }, [facilities]);
}

// Combined search for global search - searches across facilities, operators, and locations
export function useGlobalSearchAutocomplete(facilities: Facility[]): AutocompleteOption[] {
  return useMemo(() => {
    const options: AutocompleteOption[] = [];
    
    // Add all facilities
    facilities.forEach(f => {
      options.push({
        value: f.name,
        label: f.name,
        category: 'Facilities',
        metadata: {
          description: `${f.operator} • ${f.city}, ${f.state}`,
          type: 'facility',
          id: f.id,
          facility: f
        }
      });
    });
    
    // Add unique operators
    const operators = [...new Set(facilities.map(f => f.operator))];
    operators.forEach(op => {
      const count = facilities.filter(f => f.operator === op).length;
      options.push({
        value: op,
        label: op,
        category: 'Operators',
        metadata: {
          description: `${count} facilities`,
          type: 'operator'
        }
      });
    });
    
    // Add unique locations (city, state)
    const locations = [...new Set(facilities.map(f => `${f.city}, ${f.state}`))];
    locations.forEach(loc => {
      const count = facilities.filter(f => `${f.city}, ${f.state}` === loc).length;
      options.push({
        value: loc,
        label: loc,
        category: 'Locations',
        metadata: {
          description: `${count} facilities`,
          type: 'location'
        }
      });
    });
    
    return options;
  }, [facilities]);
}

export function useOperatorAutocomplete(facilities: Facility[]): AutocompleteOption[] {
  return useMemo(() => {
    const operatorCounts = facilities.reduce((acc, f) => {
      acc[f.operator] = (acc[f.operator] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueOperators = [...new Set(facilities.map(f => f.operator))];
    
    return uniqueOperators
      .sort((a, b) => operatorCounts[b] - operatorCounts[a])
      .map(operator => ({
        value: operator,
        label: operator,
        category: 'Operators',
        metadata: {
          description: `${operatorCounts[operator]} facilities`
        }
      }));
  }, [facilities]);
}

export function useStateAutocomplete(facilities: Facility[]): AutocompleteOption[] {
  return useMemo(() => {
    const stateCounts = facilities.reduce((acc, f) => {
      acc[f.state] = (acc[f.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stateNames: Record<string, string> = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
      'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
      'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
      'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
      'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
      'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
    };

    const uniqueStates = [...new Set(facilities.map(f => f.state))];
    
    return uniqueStates
      .sort((a, b) => stateCounts[b] - stateCounts[a])
      .map(state => ({
        value: state,
        label: stateNames[state] || state,
        category: 'States',
        metadata: {
          description: `${state} • ${stateCounts[state]} facilities`
        }
      }));
  }, [facilities]);
}

export function useCityAutocomplete(facilities: Facility[]): AutocompleteOption[] {
  return useMemo(() => {
    const cityCounts = facilities.reduce((acc, f) => {
      const cityState = `${f.city}, ${f.state}`;
      acc[cityState] = (acc[cityState] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueCities = [...new Set(facilities.map(f => `${f.city}, ${f.state}`))];
    
    return uniqueCities
      .sort((a, b) => cityCounts[b] - cityCounts[a])
      .map(cityState => ({
        value: cityState.split(', ')[0], // Just the city name
        label: cityState,
        category: 'Cities',
        metadata: {
          description: `${cityCounts[cityState]} facilities`
        }
      }));
  }, [facilities]);
}

export function useCountryAutocomplete(facilities: Facility[]): AutocompleteOption[] {
  return useMemo(() => {
    const countryCounts = facilities.reduce((acc, f) => {
      acc[f.country] = (acc[f.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueCountries = [...new Set(facilities.map(f => f.country))];
    
    return uniqueCountries
      .sort((a, b) => countryCounts[b] - countryCounts[a])
      .map(country => ({
        value: country,
        label: country,
        category: 'Countries',
        metadata: {
          description: `${countryCounts[country]} facilities`
        }
      }));
  }, [facilities]);
}

// Common US addresses for Network Trace autocomplete
export function useAddressAutocomplete(): AutocompleteOption[] {
  return useMemo(() => [
    {
      value: '1600 Amphitheatre Parkway, Mountain View, CA',
      label: 'Google Headquarters',
      category: 'Tech Companies',
      metadata: { description: 'Mountain View, CA' }
    },
    {
      value: '1 Infinite Loop, Cupertino, CA',
      label: 'Apple Park',
      category: 'Tech Companies',
      metadata: { description: 'Cupertino, CA' }
    },
    {
      value: '1 Microsoft Way, Redmond, WA',
      label: 'Microsoft Campus',
      category: 'Tech Companies',
      metadata: { description: 'Redmond, WA' }
    },
    {
      value: '410 Terry Avenue North, Seattle, WA',
      label: 'Amazon HQ',
      category: 'Tech Companies',
      metadata: { description: 'Seattle, WA' }
    },
    {
      value: '1 Hacker Way, Menlo Park, CA',
      label: 'Meta Headquarters',
      category: 'Tech Companies',
      metadata: { description: 'Menlo Park, CA' }
    },
    {
      value: 'New York, NY',
      label: 'New York City',
      category: 'Major Cities',
      metadata: { description: 'New York' }
    },
    {
      value: 'Los Angeles, CA',
      label: 'Los Angeles',
      category: 'Major Cities',
      metadata: { description: 'California' }
    },
    {
      value: 'Chicago, IL',
      label: 'Chicago',
      category: 'Major Cities',
      metadata: { description: 'Illinois' }
    },
    {
      value: 'Houston, TX',
      label: 'Houston',
      category: 'Major Cities',
      metadata: { description: 'Texas' }
    },
    {
      value: 'Phoenix, AZ',
      label: 'Phoenix',
      category: 'Major Cities',
      metadata: { description: 'Arizona' }
    },
    {
      value: 'San Francisco, CA',
      label: 'San Francisco',
      category: 'Major Cities',
      metadata: { description: 'California' }
    },
    {
      value: 'Seattle, WA',
      label: 'Seattle',
      category: 'Major Cities',
      metadata: { description: 'Washington' }
    },
    {
      value: 'Austin, TX',
      label: 'Austin',
      category: 'Major Cities',
      metadata: { description: 'Texas' }
    },
    {
      value: 'Boston, MA',
      label: 'Boston',
      category: 'Major Cities',
      metadata: { description: 'Massachusetts' }
    },
    {
      value: 'Bronx, NY',
      label: 'Bronx',
      category: 'Major Cities',
      metadata: { description: 'New York' }
    }
  ], []);
}

// AI search suggestions
export function useAISearchSuggestions(): AutocompleteOption[] {
  return useMemo(() => [
    {
      value: 'Show me non-compliant facilities in Texas',
      label: 'Non-compliant facilities in Texas',
      category: 'Compliance Queries',
      metadata: { description: 'Filter by state and status' }
    },
    {
      value: "What's the total subsidy gap by state?",
      label: 'Total subsidy gap by state',
      category: 'Financial Queries',
      metadata: { description: 'Aggregate financial data' }
    },
    {
      value: 'Which operators have the most compliance issues?',
      label: 'Operators with compliance issues',
      category: 'Compliance Queries',
      metadata: { description: 'Analyze by operator' }
    },
    {
      value: 'Generate a report for California facilities',
      label: 'California facilities report',
      category: 'Reports',
      metadata: { description: 'Create custom report' }
    },
    {
      value: 'Show facilities with subsidy gap over $1M',
      label: 'High subsidy gap facilities',
      category: 'Financial Queries',
      metadata: { description: 'Filter by amount' }
    },
    {
      value: 'Compare compliance rates across states',
      label: 'State compliance comparison',
      category: 'Analysis',
      metadata: { description: 'Cross-state analysis' }
    },
    {
      value: 'Worker safety violations in Michigan',
      label: 'Michigan safety violations',
      category: 'Safety Queries',
      metadata: { description: 'State-specific safety data' }
    },
    {
      value: 'List all Amazon facilities',
      label: 'Amazon facilities',
      category: 'Operator Queries',
      metadata: { description: 'Filter by operator' }
    }
  ], []);
}

