/**
 * Global UI Density Context
 * 
 * Provides a consistent density setting across the entire app:
 * - compact: Maximum data density (smaller text, tighter spacing)
 * - comfortable: Balanced (default)
 * - spacious: More breathing room (better for accessibility)
 * 
 * Persisted to IndexedDB via settingsPersistence.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getSettings, saveSettings, settingsKey } from '../utils/settingsPersistence';

export type DensityMode = 'compact' | 'comfortable' | 'spacious';

interface DensityTokens {
  // Font sizes
  textXs: string;
  textSm: string;
  textBase: string;
  textLg: string;
  textXl: string;
  // Spacing
  gap1: string;
  gap2: string;
  gap3: string;
  gap4: string;
  // Padding
  px1: string;
  px2: string;
  px3: string;
  px4: string;
  py1: string;
  py2: string;
  py3: string;
  py4: string;
  // Tree/list item heights
  rowHeight: number;
  headerHeight: number;
  // Rounding
  rounded: string;
  roundedLg: string;
}

const DENSITY_TOKENS: Record<DensityMode, DensityTokens> = {
  compact: {
    textXs: 'text-[9px]',
    textSm: 'text-[10px]',
    textBase: 'text-[11px]',
    textLg: 'text-xs',
    textXl: 'text-sm',
    gap1: 'gap-0.5',
    gap2: 'gap-1',
    gap3: 'gap-1.5',
    gap4: 'gap-2',
    px1: 'px-1',
    px2: 'px-1.5',
    px3: 'px-2',
    px4: 'px-3',
    py1: 'py-0.5',
    py2: 'py-1',
    py3: 'py-1.5',
    py4: 'py-2',
    rowHeight: 28,
    headerHeight: 32,
    rounded: 'rounded',
    roundedLg: 'rounded-md',
  },
  comfortable: {
    textXs: 'text-[10px]',
    textSm: 'text-xs',
    textBase: 'text-sm',
    textLg: 'text-base',
    textXl: 'text-lg',
    gap1: 'gap-1',
    gap2: 'gap-2',
    gap3: 'gap-3',
    gap4: 'gap-4',
    px1: 'px-1.5',
    px2: 'px-2',
    px3: 'px-3',
    px4: 'px-4',
    py1: 'py-1',
    py2: 'py-1.5',
    py3: 'py-2',
    py4: 'py-3',
    rowHeight: 36,
    headerHeight: 40,
    rounded: 'rounded-md',
    roundedLg: 'rounded-lg',
  },
  spacious: {
    textXs: 'text-xs',
    textSm: 'text-sm',
    textBase: 'text-base',
    textLg: 'text-lg',
    textXl: 'text-xl',
    gap1: 'gap-1.5',
    gap2: 'gap-3',
    gap3: 'gap-4',
    gap4: 'gap-6',
    px1: 'px-2',
    px2: 'px-3',
    px3: 'px-4',
    px4: 'px-6',
    py1: 'py-1.5',
    py2: 'py-2',
    py3: 'py-3',
    py4: 'py-4',
    rowHeight: 44,
    headerHeight: 48,
    rounded: 'rounded-lg',
    roundedLg: 'rounded-xl',
  },
};

interface DensityContextValue {
  density: DensityMode;
  setDensity: (mode: DensityMode) => void;
  tokens: DensityTokens;
  // Convenience helpers
  cn: (...classes: (string | undefined | false)[]) => string;
}

const DensityContext = createContext<DensityContextValue | null>(null);

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<DensityMode>('compact'); // Default to compact for max data density

  // Load from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const saved = await getSettings<DensityMode>(settingsKey('uiDensity'));
        if (!cancelled && saved && (saved === 'compact' || saved === 'comfortable' || saved === 'spacious')) {
          setDensityState(saved);
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const setDensity = useCallback((mode: DensityMode) => {
    setDensityState(mode);
    saveSettings(settingsKey('uiDensity'), mode).catch(() => {});
  }, []);

  const tokens = useMemo(() => DENSITY_TOKENS[density], [density]);

  // Helper to join classnames (filters out falsy)
  const cn = useCallback((...classes: (string | undefined | false)[]) => {
    return classes.filter(Boolean).join(' ');
  }, []);

  const value = useMemo(() => ({
    density,
    setDensity,
    tokens,
    cn,
  }), [density, setDensity, tokens, cn]);

  return (
    <DensityContext.Provider value={value}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity(): DensityContextValue {
  const ctx = useContext(DensityContext);
  if (!ctx) {
    // Fallback for components rendered outside provider
    return {
      density: 'compact',
      setDensity: () => {},
      tokens: DENSITY_TOKENS.compact,
      cn: (...classes) => classes.filter(Boolean).join(' '),
    };
  }
  return ctx;
}

// Export tokens for use in non-hook contexts
export { DENSITY_TOKENS };

