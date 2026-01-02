import { createContext, memo, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '../../db/database';

type ProvenanceModeContextValue = {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
};

const ProvenanceModeContext = createContext<ProvenanceModeContextValue | null>(null);

export const ProvenanceModeProvider = memo(function ProvenanceModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get('provenanceMode');
        const v = Boolean(row?.value);
        if (!cancelled) setEnabledState(v);
      } catch {
        if (!cancelled) setEnabledState(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    db.settings.put({ key: 'provenanceMode', value: next }).catch(() => {});
  }, []);

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);

  return <ProvenanceModeContext.Provider value={value}>{children}</ProvenanceModeContext.Provider>;
});

export function useProvenanceMode(): ProvenanceModeContextValue {
  const ctx = useContext(ProvenanceModeContext);
  if (!ctx) {
    return { enabled: false, setEnabled: () => {} };
  }
  return ctx;
}


