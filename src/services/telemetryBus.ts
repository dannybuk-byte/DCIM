import { db } from '../db/database';
import type { TelemetryEventRecord, TelemetrySeverity, TelemetrySource } from '../db/database';
import { incidentCommand } from './incidentCommand';
import { verificationDegradedMode } from './verificationDegradedMode';

export interface EmitTelemetryEventInput {
  source: TelemetrySource;
  type: string;
  severity: TelemetrySeverity;
  title?: string;
  summary?: string;
  facilityId?: number;
  correlationId?: string;
  /**
   * Optional stable dedup key. If omitted, we generate one from a subset of fields.
   * Keep it small + stable; do not include high-cardinality noise.
   */
  fingerprint?: string;
  payload?: unknown;
  timestamp?: number;
}

export interface TelemetryBusConfig {
  dedupWindowMs: number;
  maxAgeMs: number;
  maxRows: number;
}

const DEFAULT_CONFIG: TelemetryBusConfig = {
  dedupWindowMs: 30_000,
  maxAgeMs: 14 * 24 * 60 * 60 * 1000, // 14 days
  maxRows: 50_000,
};

function makeId(prefix = 'evt'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function hashString(input: string): string {
  // djb2-ish; fast + stable; not cryptographic (we have evidence chain for that).
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = (hash * 33) ^ input.charCodeAt(i);
  // Convert to unsigned 32-bit
  return (hash >>> 0).toString(16);
}

function buildFingerprint(event: EmitTelemetryEventInput): string {
  const stable = JSON.stringify({
    source: event.source,
    type: event.type,
    severity: event.severity,
    facilityId: event.facilityId ?? null,
    correlationId: event.correlationId ?? null,
    title: event.title ?? null,
    summary: event.summary ?? null,
  });
  return hashString(stable);
}

export class TelemetryBus {
  private config: TelemetryBusConfig;
  private compactionInFlight: Promise<void> | null = null;
  private store: typeof db.telemetryEvents;

  constructor(config: Partial<TelemetryBusConfig> = {}, store: typeof db.telemetryEvents = db.telemetryEvents) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.store = store;
  }

  async emit(
    input: EmitTelemetryEventInput,
    options: { skipAutoLink?: boolean } = {},
  ): Promise<{ id: string; stored: boolean }> {
    const timestamp = input.timestamp ?? Date.now();
    const id = makeId('evt');
    const fingerprint = input.fingerprint ?? buildFingerprint(input);

    const existing = await this.store
      .where('fingerprint')
      .equals(fingerprint)
      .and((e) => e.timestamp >= timestamp - this.config.dedupWindowMs)
      .first();

    if (existing) return { id: existing.id, stored: false };

    const record: TelemetryEventRecord = {
      id,
      timestamp,
      source: input.source,
      type: input.type,
      severity: input.severity,
      title: input.title,
      summary: input.summary,
      facilityId: input.facilityId,
      correlationId: input.correlationId,
      fingerprint,
      payload: input.payload,
    };

    await this.store.put(record);

    if (!options.skipAutoLink) {
      // Best-effort only: linking is a convenience, not a source of truth.
      void this.tryAutoLinkToIncident(record);
      // Auto-create incidents for verified+critical anomalies (gated by degraded mode).
      void this.tryAutoCreateIncident(record);
    }

    // Fire-and-forget compaction (idempotent + serialized)
    void this.compact();

    return { id, stored: true };
  }

  async listRecent(options: {
    sinceMs?: number;
    limit?: number;
    facilityId?: number;
    sources?: TelemetrySource[];
  } = {}): Promise<TelemetryEventRecord[]> {
    const sinceMs = options.sinceMs ?? Date.now() - 24 * 60 * 60 * 1000;
    const limit = options.limit ?? 200;

    let coll = this.store.where('timestamp').aboveOrEqual(sinceMs);
    if (options.facilityId !== undefined) {
      coll = this.store.where('[facilityId+timestamp]').between(
        [options.facilityId, sinceMs],
        [options.facilityId, Number.POSITIVE_INFINITY],
      );
    }

    const items = await coll.reverse().limit(limit).toArray();
    if (options.sources && options.sources.length > 0) {
      const set = new Set(options.sources);
      return items.filter((e) => set.has(e.source));
    }
    return items;
  }

  async compact(): Promise<void> {
    if (this.compactionInFlight) return this.compactionInFlight;

    const run = async () => {
      const now = Date.now();
      const cutoff = now - this.config.maxAgeMs;

      // Age-based delete first (fast indexed query on timestamp)
      await this.store.where('timestamp').below(cutoff).delete();

      // Size-based trim (keep newest N)
      const total = await this.store.count();
      const overflow = total - this.config.maxRows;
      if (overflow <= 0) return;

      // Grab oldest IDs to delete
      const oldest = await this.store.orderBy('timestamp').limit(overflow).toArray();
      const ids = oldest.map((e) => e.id);
      await this.store.bulkDelete(ids);
    };

    this.compactionInFlight = run().finally(() => {
      this.compactionInFlight = null;
    });

    return this.compactionInFlight;
  }

  /**
   * Safe-by-default auto-linking:
   * - Never changes incident status
   * - Only links when we have a strict correlationId match
   * - Only targets recently-updated incidents in active statuses
   */
  private async tryAutoLinkToIncident(record: TelemetryEventRecord): Promise<void> {
    // Current conservative scope: BGP anomaly events only
    if (record.source !== 'bgp' || record.type !== 'bgp_anomaly') return;
    if (!record.correlationId || !record.correlationId.startsWith('bgp:')) return;

    try {
      // If the event is already linked to anything, do nothing.
      const alreadyLinked = await db.incidentEventLinks.where('eventId').equals(record.id).first();
      if (alreadyLinked) return;

      // Scan recent incidents (small N) and link to the newest matching one.
      const now = Date.now();
      const cutoff = now - 6 * 60 * 60 * 1000; // 6h window (strict + antifragile)
      const recent = await db.incidents.where('updatedAt').above(cutoff).reverse().limit(200).toArray();

      const target = recent.find(
        (i) =>
          (i.status === 'suspected' || i.status === 'confirmed') &&
          Boolean(i.correlationIds?.includes(record.correlationId!)),
      );
      if (!target) return;

      await db.incidentEventLinks.add({ incidentId: target.id, eventId: record.id, timestamp: now });
      await db.incidents.update(target.id, { updatedAt: now, lastEventAt: Math.max(target.lastEventAt ?? 0, record.timestamp) });

      // Observability: record that an auto-link occurred (no hooks to avoid recursion).
      void this.emit(
        {
          source: 'system',
          type: 'incident_autolinked',
          severity: 'low',
          title: 'Incident auto-linked',
          summary: `Linked ${record.source}:${record.type} into incident ${target.id}`,
          correlationId: record.correlationId,
          payload: { incidentId: target.id, eventId: record.id, linkedAt: now },
          timestamp: now,
          fingerprint: `incident_autolinked:${target.id}:${record.id}`,
        },
        { skipAutoLink: true },
      );
    } catch (error) {
      const now = Date.now();
      void this.emit(
        {
          source: 'system',
          type: 'incident_autolink_failed',
          severity: 'low',
          title: 'Incident auto-link failed',
          summary: `Failed linking ${record.source}:${record.type} (best-effort)`,
          correlationId: record.correlationId,
          payload: { eventId: record.id, error: String(error) },
          timestamp: now,
          fingerprint: `incident_autolink_failed:${record.id}`,
        },
        { skipAutoLink: true },
      );
    }
  }

  private async tryAutoCreateIncident(record: TelemetryEventRecord): Promise<void> {
    // DEGRADED MODE GATE: Never auto-create when verification services are down.
    // This is the critical defensive layer that prevents bad data from being promoted.
    if (verificationDegradedMode.isDegraded()) {
      // Silently skip - telemetry about degraded mode is emitted by the service itself.
      return;
    }

    // Safest scope: only auto-create for strongly-verified, critical BGP anomalies.
    if (record.source !== 'bgp' || record.type !== 'bgp_anomaly') return;
    if (record.severity !== 'critical') return;
    if (!record.correlationId || !record.correlationId.startsWith('bgp:')) return;

    // Verification gate (same standard as manual promote auto-confirm):
    // - RouteViews corroboration = confirmed
    // - RPKI state = valid
    const payload = (() => {
      if (typeof record.payload !== 'object' || record.payload === null) return null;
      return record.payload as Record<string, unknown>;
    })();
    const corroborationStatus = payload?.corroborationStatus;
    const rpkiState = payload?.rpkiState;
    const isVerified = corroborationStatus === 'confirmed' && rpkiState === 'valid';
    if (!isVerified) return;

    try {
      // If already linked, no need to auto-create.
      const alreadyLinked = await db.incidentEventLinks.where('eventId').equals(record.id).first();
      if (alreadyLinked) return;

      // De-dupe by recent incident with same correlationId.
      const now = Date.now();
      const cutoff = now - 6 * 60 * 60 * 1000; // 6h window
      const recent = await db.incidents.where('updatedAt').above(cutoff).reverse().limit(200).toArray();
      const existing = recent.find(
        (i) =>
          (i.status === 'suspected' || i.status === 'confirmed') &&
          Boolean(i.correlationIds?.includes(record.correlationId!)),
      );
      if (existing) return;

      const incident = await incidentCommand.create({
        title: record.title ?? 'Verified critical BGP anomaly',
        severity: record.severity,
        summary: record.summary,
        tags: ['bgp', 'auto', 'verified', 'critical'],
        correlationIds: [record.correlationId],
        initialStatus: 'confirmed',
      });

      await incidentCommand.linkEvent(incident.id, record.id);

      void this.emit(
        {
          source: 'system',
          type: 'incident_autocreated',
          severity: 'low',
          title: 'Incident auto-created',
          summary: `Created incident ${incident.id} from verified critical BGP anomaly`,
          correlationId: record.correlationId,
          payload: { incidentId: incident.id, eventId: record.id, createdAt: now },
          timestamp: now,
          fingerprint: `incident_autocreated:${incident.id}:${record.id}`,
        },
        { skipAutoLink: true },
      );
    } catch (error) {
      const now = Date.now();
      void this.emit(
        {
          source: 'system',
          type: 'incident_autocreate_failed',
          severity: 'low',
          title: 'Incident auto-create failed',
          summary: 'Failed creating incident from verified critical BGP anomaly (best-effort)',
          correlationId: record.correlationId,
          payload: { eventId: record.id, error: String(error) },
          timestamp: now,
          fingerprint: `incident_autocreate_failed:${record.id}`,
        },
        { skipAutoLink: true },
      );
    }
  }
}

export const telemetryBus = new TelemetryBus();

