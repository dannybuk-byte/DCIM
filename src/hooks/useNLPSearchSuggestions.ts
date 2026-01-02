import { useEffect, useMemo, useState } from 'react';
import { Facility } from '../types';
import { AutocompleteOption } from '../components/shared/AutocompleteInput';
import { db, Source } from '../db/database';
import { SearchContext } from '../db/searchHistory';

function uniqByValue(items: AutocompleteOption[]): AutocompleteOption[] {
  const seen = new Set<string>();
  const out: AutocompleteOption[] = [];
  for (const it of items) {
    const key = `${it.category ?? ''}::${it.value}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function intentTemplates(context: SearchContext): AutocompleteOption[] {
  const common: AutocompleteOption[] = [
    { value: 'Show non-compliant facilities in TX', label: 'Non-compliant in TX', category: 'NLP Intents', metadata: { description: 'state + compliance filter' } },
    { value: 'Show facilities with subsidy gap over $10M', label: 'Subsidy gap > $10M', category: 'NLP Intents', metadata: { description: 'high-gap filter' } },
    { value: 'Which operators have the most non-compliance?', label: 'Top non-compliance operators', category: 'NLP Intents', metadata: { description: 'operator aggregation' } },
    { value: 'Generate report for California facilities', label: 'Generate CA report', category: 'NLP Intents', metadata: { description: 'report action' } },
  ];

  if (context === 'network-trace') {
    return [
      { value: '1600 Amphitheatre Parkway, Mountain View, CA', label: 'Google HQ (Mountain View, CA)', category: 'Examples', metadata: { description: 'Address' } },
      { value: '1 Microsoft Way, Redmond, WA', label: 'Microsoft Campus (Redmond, WA)', category: 'Examples', metadata: { description: 'Address' } },
      { value: 'Seattle, WA', label: 'Seattle, WA', category: 'Examples', metadata: { description: 'City' } },
    ];
  }

  if (context === 'map') {
    return [
      { value: "Meta's facilities in NM", label: "Meta's facilities in NM", category: 'NLP Intents', metadata: { description: 'Operator + state' } },
      { value: 'AWS facilities in Texas', label: 'AWS facilities in Texas', category: 'NLP Intents', metadata: { description: 'Operator + state' } },
      { value: 'Equinix data centers in California', label: 'Equinix in California', category: 'NLP Intents', metadata: { description: 'Operator + state' } },
      { value: 'Facilities in New York', label: 'Facilities in New York', category: 'NLP Intents', metadata: { description: 'State filter' } },
      { value: 'Show non-compliant facilities in TX', label: 'Non-compliant in TX', category: 'NLP Intents', metadata: { description: 'State + compliance' } },
      ...common
    ];
  }

  if (context === 'sources') {
    return [
      { value: 'type:PDF', label: 'Filter: PDFs', category: 'NLP Intents', metadata: { description: 'source type' } },
      { value: 'tag:policy', label: 'Filter: tag “policy”', category: 'NLP Intents', metadata: { description: 'tag filter' } },
      ...common
    ];
  }

  if (context === 'osint') {
    return [
      { value: 'Equinix', label: 'Equinix', category: 'Examples', metadata: { description: 'provider/org' } },
      { value: 'Cloudflare', label: 'Cloudflare', category: 'Examples', metadata: { description: 'provider/org' } },
      { value: 'AS13335', label: 'AS13335', category: 'Examples', metadata: { description: 'ASN' } },
    ];
  }

  return common;
}

export function useNLPSearchSuggestions(args: {
  context: SearchContext;
  facilities?: Facility[];
  sources?: Source[];
  includeFacilities?: boolean;
  includeOperators?: boolean;
  includePlaces?: boolean;
  includeSourceTags?: boolean;
  maxHistory?: number;
}): AutocompleteOption[] {
  const {
    context,
    facilities = [],
    sources = [],
    includeFacilities = true,
    includeOperators = true,
    includePlaces = true,
    includeSourceTags = false,
    maxHistory = 30,
  } = args;

  const [history, setHistory] = useState<AutocompleteOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await db.searchHistory
          .where('context')
          .equals(context)
          .reverse()
          .sortBy('lastUsedAt');

        if (cancelled) return;
        setHistory(
          rows
            .slice(0, maxHistory)
            .map((r) => ({
              value: r.query,
              label: r.query,
              category: 'Recent',
              metadata: { count: r.count, lastUsedAt: r.lastUsedAt }
            }))
        );
      } catch {
        if (!cancelled) setHistory([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [context, maxHistory]);

  const facilityOptions = useMemo(() => {
    if (!includeFacilities) return [];
    return facilities.map((f) => ({
      value: f.name,
      label: f.name,
      category: 'Facilities',
      metadata: { description: `${f.operator} • ${f.city}, ${f.state}`, id: f.id }
    })) satisfies AutocompleteOption[];
  }, [facilities, includeFacilities]);

  const operatorOptions = useMemo(() => {
    if (!includeOperators) return [];
    const counts = new Map<string, number>();
    facilities.forEach((f) => counts.set(f.operator, (counts.get(f.operator) || 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 250)
      .map(([op, count]) => ({
        value: op,
        label: op,
        category: 'Operators',
        metadata: { description: `${count} facilities` }
      })) satisfies AutocompleteOption[];
  }, [facilities, includeOperators]);

  const placeOptions = useMemo(() => {
    if (!includePlaces) return [];
    const cityStateCounts = new Map<string, number>();
    facilities.forEach((f) => {
      const key = `${f.city}, ${f.state}`;
      cityStateCounts.set(key, (cityStateCounts.get(key) || 0) + 1);
    });
    return Array.from(cityStateCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 250)
      .map(([cs, count]) => ({
        value: cs,
        label: cs,
        category: 'Places',
        metadata: { description: `${count} facilities` }
      })) satisfies AutocompleteOption[];
  }, [facilities, includePlaces]);

  const sourceTagOptions = useMemo(() => {
    if (!includeSourceTags) return [];
    const tags = new Map<string, number>();
    sources.forEach((s) => (s.tags || []).forEach((t) => tags.set(t, (tags.get(t) || 0) + 1)));
    return Array.from(tags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200)
      .map(([tag, count]) => ({
        value: `tag:${tag}`,
        label: `tag:${tag}`,
        category: 'Tags',
        metadata: { description: `${count} sources` }
      })) satisfies AutocompleteOption[];
  }, [sources, includeSourceTags]);

  const intents = useMemo(() => intentTemplates(context), [context]);

  return useMemo(
    () => uniqByValue([...history, ...intents, ...operatorOptions, ...placeOptions, ...facilityOptions, ...sourceTagOptions]),
    [history, intents, operatorOptions, placeOptions, facilityOptions, sourceTagOptions]
  );
}


