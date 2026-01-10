import { db } from '../db/database';
import type { IncidentRecord, IncidentStatus, TelemetryEventRecord, TelemetrySeverity } from '../db/database';
import { captureIncidentCreatedSnapshot } from './auditSnapshot';

function makeId(prefix = 'inc'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type BgpCorroborationStatus = 'confirmed' | 'pending' | 'unconfirmed' | 'error';
type BgpRpkiState = 'valid' | 'invalid' | 'not_found' | 'unsupported' | 'error';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
}

function parseBgpCorroborationStatus(value: unknown): BgpCorroborationStatus | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === 'confirmed' || value === 'pending' || value === 'unconfirmed' || value === 'error') return value;
  return undefined;
}

function parseBgpRpkiState(value: unknown): BgpRpkiState | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === 'valid' || value === 'invalid' || value === 'not_found' || value === 'unsupported' || value === 'error') return value;
  return undefined;
}

function getBgpVerificationFromTelemetry(
  event: TelemetryEventRecord,
): { corroborationStatus?: BgpCorroborationStatus; rpkiState?: BgpRpkiState } | null {
  if (event.source !== 'bgp' || event.type !== 'bgp_anomaly') return null;
  const payload = asRecord(event.payload);
  if (!payload) return { corroborationStatus: undefined, rpkiState: undefined };
  return {
    corroborationStatus: parseBgpCorroborationStatus(payload.corroborationStatus),
    rpkiState: parseBgpRpkiState(payload.rpkiState),
  };
}

export interface CreateIncidentInput {
  title: string;
  severity: TelemetrySeverity;
  summary?: string;
  openedBy?: string;
  tags?: string[];
  relatedFacilityIds?: number[];
  correlationIds?: string[];
  /**
   * Defaults to 'suspected'. Use sparingly and only for strong corroboration.
   */
  initialStatus?: IncidentStatus;
}

export class IncidentCommandService {
  async create(input: CreateIncidentInput): Promise<IncidentRecord> {
    const now = Date.now();
    const incident: IncidentRecord = {
      id: makeId('inc'),
      title: input.title,
      status: input.initialStatus ?? 'suspected',
      severity: input.severity,
      createdAt: now,
      updatedAt: now,
      lastEventAt: undefined,
      summary: input.summary,
      openedBy: input.openedBy,
      tags: input.tags,
      relatedFacilityIds: input.relatedFacilityIds,
      correlationIds: input.correlationIds,
    };

    await db.incidents.put(incident);

    // Capture audit snapshot for decision trail (best-effort, non-blocking)
    const wasAutoCreated = input.tags?.includes('auto') ?? false;
    const wasAutoConfirmed = input.initialStatus === 'confirmed' && wasAutoCreated;
    void captureIncidentCreatedSnapshot(incident.id, wasAutoCreated, wasAutoConfirmed);

    return incident;
  }

  async listRecent(options: { limit?: number; status?: IncidentStatus[] } = {}): Promise<IncidentRecord[]> {
    const limit = options.limit ?? 100;
    const incidents = await db.incidents.orderBy('updatedAt').reverse().limit(limit).toArray();
    if (options.status && options.status.length > 0) {
      const set = new Set(options.status);
      return incidents.filter((i) => set.has(i.status));
    }
    return incidents;
  }

  async get(id: string): Promise<IncidentRecord | undefined> {
    return db.incidents.get(id);
  }

  async update(
    id: string,
    patch: Partial<Omit<IncidentRecord, 'id' | 'createdAt'>> & { status?: IncidentStatus },
  ): Promise<void> {
    const now = Date.now();
    await db.incidents.update(id, { ...patch, updatedAt: now });
  }

  async setStatus(id: string, status: IncidentStatus): Promise<void> {
    await this.update(id, { status });
  }

  async assign(id: string, assignedTo: string | undefined): Promise<void> {
    await this.update(id, { assignedTo });
  }

  async addTag(id: string, tag: string): Promise<void> {
    const incident = await db.incidents.get(id);
    if (!incident) return;
    const tags = Array.from(new Set([...(incident.tags ?? []), tag]));
    await this.update(id, { tags });
  }

  async linkEvent(incidentId: string, eventId: string): Promise<void> {
    const now = Date.now();
    await db.incidentEventLinks.add({ incidentId, eventId, timestamp: now });

    const incident = await db.incidents.get(incidentId);
    if (incident) {
      await db.incidents.update(incidentId, { updatedAt: now, lastEventAt: now });
    }
  }

  async createFromTelemetryEvent(eventId: string): Promise<IncidentRecord | undefined> {
    const event = await db.telemetryEvents.get(eventId);
    if (!event) return undefined;

    // Conservative auto-confirmation gate:
    // - Only applies to BGP anomaly telemetry.
    // - Requires BOTH:
    //   - RouteViews corroboration = confirmed
    //   - RPKI state = valid
    const bgp = getBgpVerificationFromTelemetry(event);
    const corroborationStatus = bgp?.corroborationStatus;
    const rpkiState = bgp?.rpkiState;

    const shouldAutoConfirm =
      event.source === 'bgp' &&
      event.type === 'bgp_anomaly' &&
      corroborationStatus === 'confirmed' &&
      rpkiState === 'valid';

    const incident = await this.create({
      title: event.title ?? `${event.source.toUpperCase()} ${event.type}`,
      severity: event.severity,
      summary: event.summary,
      relatedFacilityIds: event.facilityId !== undefined ? [event.facilityId] : undefined,
      correlationIds: event.correlationId ? [event.correlationId] : undefined,
      tags: [event.source, event.type, shouldAutoConfirm ? 'verified' : 'unverified'].filter(Boolean),
      initialStatus: shouldAutoConfirm ? 'confirmed' : 'suspected',
    });

    await this.linkEvent(incident.id, eventId);
    return incident;
  }

  async getTimeline(incidentId: string, limit = 500): Promise<TelemetryEventRecord[]> {
    const links = await db.incidentEventLinks
      .where('[incidentId+timestamp]')
      .between([incidentId, 0], [incidentId, Number.POSITIVE_INFINITY])
      .limit(limit)
      .toArray();

    const eventIds = links.map((l) => l.eventId);
    const events = await db.telemetryEvents.bulkGet(eventIds);

    const byId = new Map<string, TelemetryEventRecord>();
    for (const e of events) if (e) byId.set(e.id, e);

    return links
      .map((l) => byId.get(l.eventId))
      .filter((e): e is TelemetryEventRecord => Boolean(e))
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}

export const incidentCommand = new IncidentCommandService();

