import { describe, expect, it } from 'vitest';

import type { TelemetryEventRecord } from '../db/database';
import { TelemetryBus } from './telemetryBus';

type WhereOp = {
  equals: (value: string) => WhereOp;
  and: (predicate: (e: TelemetryEventRecord) => boolean) => WhereOp;
  first: () => Promise<TelemetryEventRecord | undefined>;
  aboveOrEqual: (value: number) => ListOp;
  below: (value: number) => { delete: () => Promise<void> };
  between: (lower: [number, number], upper: [number, number]) => ListOp;
};

type ListOp = {
  reverse: () => ListOp;
  limit: (n: number) => ListOp;
  toArray: () => Promise<TelemetryEventRecord[]>;
};

class FakeTelemetryEventsStore {
  private rows: TelemetryEventRecord[] = [];

  seed(records: TelemetryEventRecord[]) {
    this.rows = [...records];
  }

  async put(record: TelemetryEventRecord): Promise<void> {
    const idx = this.rows.findIndex((r) => r.id === record.id);
    if (idx >= 0) this.rows[idx] = record;
    else this.rows.push(record);
  }

  async count(): Promise<number> {
    return this.rows.length;
  }

  async bulkDelete(ids: string[]): Promise<void> {
    const set = new Set(ids);
    this.rows = this.rows.filter((r) => !set.has(r.id));
  }

  orderBy(field: 'timestamp') {
    return {
      limit: (n: number) => ({
        toArray: async () =>
          [...this.rows].sort((a, b) => (a[field] ?? 0) - (b[field] ?? 0)).slice(0, n),
      }),
    };
  }

  where(index: string): WhereOp {
    const store = this;

    const listFrom = (items: TelemetryEventRecord[]): ListOp => {
      let current = [...items];
      const api: ListOp = {
        reverse: () => {
          current = current.slice().reverse();
          return api;
        },
        limit: (n: number) => {
          current = current.slice(0, n);
          return api;
        },
        toArray: async () => current,
      };
      return api;
    };

    const op: WhereOp = {
      equals: (_value: string) => op,
      and: (_predicate: (e: TelemetryEventRecord) => boolean) => op,
      first: async () => undefined,
      aboveOrEqual: (_value: number) => listFrom([]),
      below: (_value: number) => ({ delete: async () => undefined }),
      between: (_lower: [number, number], _upper: [number, number]) => listFrom([]),
    };

    if (index === 'fingerprint') {
      // Use a dedicated query object to avoid closure edge cases
      class FingerprintQuery implements WhereOp {
        private equalsValue: string | null = null;
        private predicate: ((e: TelemetryEventRecord) => boolean) | null = null;

        equals(value: string): WhereOp {
          this.equalsValue = value;
          return this;
        }
        and(pred: (e: TelemetryEventRecord) => boolean): WhereOp {
          this.predicate = pred;
          return this;
        }
        async first(): Promise<TelemetryEventRecord | undefined> {
          const filtered = store.rows.filter((r) => r.fingerprint === this.equalsValue);
          const further = this.predicate ? filtered.filter(this.predicate) : filtered;
          return further.sort((a, b) => b.timestamp - a.timestamp)[0];
        }
        aboveOrEqual(_value: number): ListOp {
          return listFrom([]);
        }
        below(_value: number): { delete: () => Promise<void> } {
          return { delete: async () => undefined };
        }
        between(_lower: [number, number], _upper: [number, number]): ListOp {
          return listFrom([]);
        }
      }

      return new FingerprintQuery();
    }

    if (index === 'timestamp') {
      op.aboveOrEqual = (value: number) => listFrom(store.rows.filter((r) => r.timestamp >= value).sort((a, b) => a.timestamp - b.timestamp));
      op.below = (value: number) => ({
        delete: async () => {
          store.rows = store.rows.filter((r) => r.timestamp >= value);
        },
      });
      return op;
    }

    if (index === '[facilityId+timestamp]') {
      op.between = (lower: [number, number], upper: [number, number]) => {
        const [facilityId, since] = lower;
        const until = upper[1];
        return listFrom(
          store.rows
            .filter((r) => r.facilityId === facilityId && r.timestamp >= since && r.timestamp <= until)
            .sort((a, b) => a.timestamp - b.timestamp),
        );
      };
      return op;
    }

    return op;
  }

  // Helpers for assertions
  all(): TelemetryEventRecord[] {
    return [...this.rows];
  }
}

describe('TelemetryBus', () => {
  it('dedups events within dedupWindowMs by fingerprint', async () => {
    const store = new FakeTelemetryEventsStore();
    // Disable age-based compaction side effects for deterministic unit tests
    const bus = new TelemetryBus({ dedupWindowMs: 60_000, maxAgeMs: Number.MAX_SAFE_INTEGER, maxRows: 1_000_000 }, store as any);

    const a = await bus.emit({
      source: 'bgp',
      type: 'anomaly',
      severity: 'high',
      title: 'BGP hijack',
      summary: 'test',
      fingerprint: 'fp1',
      timestamp: 1_000_000,
    });
    expect(a.stored).toBe(true);

    const b = await bus.emit({
      source: 'bgp',
      type: 'anomaly',
      severity: 'high',
      title: 'BGP hijack',
      summary: 'test',
      fingerprint: 'fp1',
      timestamp: 1_000_100,
    });
    expect(b.stored).toBe(false);
    expect(b.id).toBe(a.id);
  });

  it('compacts by age (maxAgeMs)', async () => {
    const store = new FakeTelemetryEventsStore();
    store.seed([
      { id: 'old', timestamp: 0, source: 'bgp', type: 'anomaly', severity: 'low', fingerprint: 'f1' },
      { id: 'new', timestamp: 10_000, source: 'ct', type: 'alert', severity: 'medium', fingerprint: 'f2' },
    ]);

    const now = 10_000;
    const bus = new TelemetryBus({ maxAgeMs: 5_000 }, store as any);

    const realNow = Date.now;
    // Force deterministic cutoff
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Date as any).now = () => now;
    await bus.compact();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Date as any).now = realNow;

    const ids = store.all().map((r) => r.id);
    expect(ids).toEqual(['new']);
  });

  it('compacts by size (maxRows)', async () => {
    const store = new FakeTelemetryEventsStore();
    store.seed([
      { id: 'a', timestamp: 1, source: 'bgp', type: 'change', severity: 'low', fingerprint: 'a' },
      { id: 'b', timestamp: 2, source: 'bgp', type: 'change', severity: 'low', fingerprint: 'b' },
      { id: 'c', timestamp: 3, source: 'bgp', type: 'change', severity: 'low', fingerprint: 'c' },
    ]);

    const bus = new TelemetryBus({ maxRows: 2, maxAgeMs: 999_999_999 }, store as any);

    const realNow = Date.now;
    // Keep cutoff below our tiny test timestamps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Date as any).now = () => 10;
    await bus.compact();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Date as any).now = realNow;

    const remaining = store.all().sort((x, y) => x.timestamp - y.timestamp).map((r) => r.id);
    expect(remaining).toEqual(['b', 'c']);
  });
});

