import type { Facility } from '../types';
import type { PatternLabOutput, ScenarioSettings } from '../analyzers/patternLab/types';
import { computePatternLab, defaultScenario } from '../analyzers/patternLab/engine';

type WorkerRequest =
  | {
      type: 'compute';
      requestId: string;
      facilities: Facility[];
      scenario?: ScenarioSettings;
    }
  | { type: 'ping'; requestId: string };

type WorkerResponse =
  | { type: 'pong'; requestId: string }
  | { type: 'result'; requestId: string; result: PatternLabOutput }
  | { type: 'error'; requestId: string; message: string };

function post(msg: WorkerResponse) {
  (self as any).postMessage(msg);
}

(self as any).onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'ping') {
    post({ type: 'pong', requestId: msg.requestId });
    return;
  }

  if (msg.type === 'compute') {
    try {
      const scenario = msg.scenario || defaultScenario();
      const result = computePatternLab(msg.facilities || [], scenario);
      post({ type: 'result', requestId: msg.requestId, result });
    } catch (e: any) {
      post({ type: 'error', requestId: msg.requestId, message: e?.message || 'Pattern worker failed' });
    }
  }
};


