import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Facility } from '../types';
import type { PatternLabOutput, ScenarioSettings } from '../analyzers/patternLab/types';
import { defaultScenario } from '../analyzers/patternLab/engine';

type WorkerResult =
  | { type: 'result'; requestId: string; result: PatternLabOutput }
  | { type: 'error'; requestId: string; message: string }
  | { type: 'pong'; requestId: string };

export function usePatternLab({
  facilities,
  scenario,
  enabled = true,
}: {
  facilities: Facility[];
  scenario?: ScenarioSettings;
  enabled?: boolean;
}) {
  const [result, setResult] = useState<PatternLabOutput | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const scenarioSafe = useMemo(() => scenario || defaultScenario(), [scenario]);

  const workerRef = useRef<Worker | null>(null);
  const activeRequestRef = useRef<string | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    const w = new Worker(new URL('../workers/patternLab.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;

    w.onmessage = (ev: MessageEvent<WorkerResult>) => {
      const msg = ev.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'pong') return;

      if (msg.requestId && activeRequestRef.current && msg.requestId !== activeRequestRef.current) {
        return; // ignore stale
      }
      if (disposedRef.current) return;

      if (msg.type === 'result') {
        setResult(msg.result);
        setStatus('idle');
        setError(null);
      } else if (msg.type === 'error') {
        setStatus('error');
        setError(msg.message || 'Pattern analysis failed');
      }
    };

    return () => {
      disposedRef.current = true;
      try {
        w.terminate();
      } catch {
        // ignore
      }
      workerRef.current = null;
    };
  }, []);

  const run = useCallback(() => {
    if (!enabled) return;
    const w = workerRef.current;
    if (!w) return;
    setStatus('running');
    setError(null);
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    activeRequestRef.current = requestId;
    w.postMessage({
      type: 'compute',
      requestId,
      facilities,
      scenario: scenarioSafe,
    });
  }, [enabled, facilities, scenarioSafe]);

  return { result, status, error, run };
}


