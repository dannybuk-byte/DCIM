import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Plus, Shield, XCircle } from 'lucide-react';

import { ErrorBoundary } from '../ErrorBoundary';
import { VerificationStatusBadge } from '../VerificationStatusBadge';
import { db } from '../../db/database';
import type { IncidentRecord, IncidentStatus, TelemetryEventRecord, TelemetrySeverity } from '../../db/database';
import { useDexieLiveQuery } from '../../hooks/useDexieLiveQuery';
import { incidentCommand } from '../../services/incidentCommand';

const STATUS_OPTIONS: IncidentStatus[] = ['suspected', 'confirmed', 'mitigated', 'dismissed'];
const SEVERITY_OPTIONS: TelemetrySeverity[] = ['low', 'medium', 'high', 'critical'];

function severityBadge(sev: TelemetrySeverity): string {
  if (sev === 'critical') return 'bg-rose-100 text-rose-800 border-rose-200';
  if (sev === 'high') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (sev === 'medium') return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

function statusBadge(status: IncidentStatus): { label: string; className: string; icon: React.ReactNode } {
  switch (status) {
    case 'confirmed':
      return { label: 'Confirmed', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: <AlertTriangle size={12} /> };
    case 'mitigated':
      return { label: 'Mitigated', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> };
    case 'dismissed':
      return { label: 'Dismissed', className: 'bg-slate-50 text-slate-700 border-slate-200', icon: <XCircle size={12} /> };
    default:
      return { label: 'Suspected', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock size={12} /> };
  }
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
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

function getBgpAnomalyVerification(
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

function isVerifiedForAutoConfirm(event: TelemetryEventRecord): boolean {
  const v = getBgpAnomalyVerification(event);
  return v?.corroborationStatus === 'confirmed' && v?.rpkiState === 'valid';
}

function rpkiBadge(state: BgpRpkiState | undefined): { label: string; className: string } {
  if (state === 'valid') return { label: 'RPKI valid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (state === 'invalid') return { label: 'RPKI invalid', className: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (state === 'not_found') return { label: 'RPKI not found', className: 'bg-slate-50 text-slate-700 border-slate-200' };
  if (state === 'unsupported') return { label: 'RPKI unsupported', className: 'bg-slate-50 text-slate-700 border-slate-200' };
  if (state === 'error') return { label: 'RPKI error', className: 'bg-rose-50 text-rose-700 border-rose-200' };
  return { label: 'RPKI —', className: 'bg-slate-50 text-slate-700 border-slate-200' };
}

function routeViewsBadge(status: BgpCorroborationStatus | undefined): { label: string; className: string } {
  if (status === 'confirmed')
    return { label: 'RouteViews confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (status === 'pending') return { label: 'RouteViews pending', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (status === 'unconfirmed') return { label: 'RouteViews unconfirmed', className: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (status === 'error') return { label: 'RouteViews error', className: 'bg-rose-50 text-rose-700 border-rose-200' };
  return { label: 'RouteViews —', className: 'bg-slate-50 text-slate-700 border-slate-200' };
}

export const IncidentCommandTab: React.FC = () => {
  const sinceMs = useMemo(() => Date.now() - 24 * 60 * 60 * 1000, []);

  const { data: incidents, isLoading: incidentsLoading, error: incidentsError } = useDexieLiveQuery<IncidentRecord[]>(
    async () => db.incidents.orderBy('updatedAt').reverse().limit(200).toArray(),
    [],
    [],
  );

  const { data: recentEvents } = useDexieLiveQuery<TelemetryEventRecord[]>(
    async () => db.telemetryEvents.where('timestamp').aboveOrEqual(sinceMs).reverse().limit(200).toArray(),
    [sinceMs],
    [],
  );

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const selectedIncident = useMemo(
    () => (selectedIncidentId ? incidents.find((i) => i.id === selectedIncidentId) : undefined),
    [incidents, selectedIncidentId],
  );

  const { data: timeline } = useDexieLiveQuery<TelemetryEventRecord[]>(
    async () => {
      if (!selectedIncidentId) return [];
      return incidentCommand.getTimeline(selectedIncidentId, 500);
    },
    [selectedIncidentId],
    [],
  );

  const [createTitle, setCreateTitle] = useState('');
  const [createSeverity, setCreateSeverity] = useState<TelemetrySeverity>('medium');
  const [createSummary, setCreateSummary] = useState('');

  const handleCreate = async () => {
    const title = createTitle.trim();
    if (!title) return;
    const incident = await incidentCommand.create({ title, severity: createSeverity, summary: createSummary.trim() || undefined });
    setSelectedIncidentId(incident.id);
    setCreateTitle('');
    setCreateSummary('');
  };

  const handleCreateFromEvent = async (eventId: string) => {
    const incident = await incidentCommand.createFromTelemetryEvent(eventId);
    if (incident) setSelectedIncidentId(incident.id);
  };

  const handleStatusChange = async (status: IncidentStatus) => {
    if (!selectedIncidentId) return;
    await incidentCommand.setStatus(selectedIncidentId, status);
  };

  return (
    <ErrorBoundary>
      <div className="h-full overflow-y-auto bg-slate-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Incident Command</h2>
            <p className="text-sm text-slate-600">
              Triage signals into incidents, build timelines, and preserve evidence.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <VerificationStatusBadge />
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Shield size={14} className="text-slate-700" />
              Offline-first • Append-only telemetry • Dedup + retention
            </div>
          </div>
        </div>

        {incidentsError && (
          <div className="mb-4 p-3 border border-rose-200 bg-rose-50 text-rose-800 rounded">
            Failed to load incidents: {String(incidentsError)}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Create + Incident list */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-slate-900">Create incident</div>
                <Plus size={16} className="text-slate-500" />
              </div>

              <div className="space-y-2">
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Title (e.g., Suspected route leak affecting VA corridor)"
                  className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                />
                <textarea
                  value={createSummary}
                  onChange={(e) => setCreateSummary(e.target.value)}
                  placeholder="Short summary (optional)"
                  className="w-full px-3 py-2 border border-slate-200 rounded text-sm min-h-[80px]"
                />
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={createSeverity}
                    onChange={(e) => setCreateSeverity(e.target.value as TelemetrySeverity)}
                    className="px-2 py-2 border border-slate-200 rounded text-sm"
                  >
                    {SEVERITY_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreate}
                    className="flex-1 px-3 py-2 bg-slate-900 text-white rounded text-sm hover:bg-slate-800"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <div className="font-semibold text-slate-900">
                  Incidents {incidentsLoading ? '(loading…)': `(${incidents.length})`}
                </div>
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {incidents.length === 0 ? (
                  <div className="p-3 text-sm text-slate-600">No incidents yet. Create one, or promote a telemetry signal.</div>
                ) : (
                  incidents.map((inc) => {
                    const sb = statusBadge(inc.status);
                    const selected = inc.id === selectedIncidentId;
                    return (
                      <button
                        key={inc.id}
                        onClick={() => setSelectedIncidentId(inc.id)}
                        className={`w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 ${
                          selected ? 'bg-slate-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{inc.title}</div>
                            <div className="text-xs text-slate-500 truncate">{inc.summary ?? '—'}</div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${sb.className}`}>
                            {sb.icon}
                            {sb.label}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded border text-xs ${severityBadge(inc.severity)}`}>{inc.severity}</span>
                          <span className="text-xs text-slate-500">Updated: {formatTime(inc.updatedAt)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Middle: Selected incident */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              {!selectedIncident ? (
                <div className="text-sm text-slate-600">Select an incident to view timeline and manage status.</div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-slate-900">{selectedIncident.title}</div>
                      <div className="text-sm text-slate-600">{selectedIncident.summary ?? '—'}</div>
                      <div className="text-xs text-slate-500 mt-1">Created: {formatTime(selectedIncident.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedIncident.status}
                        onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
                        className="px-2 py-2 border border-slate-200 rounded text-sm"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <span className={`px-2 py-1 rounded border text-xs ${severityBadge(selectedIncident.severity)}`}>
                        {selectedIncident.severity}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="font-semibold text-slate-900 mb-2">Timeline</div>
                    {timeline.length === 0 ? (
                      <div className="text-sm text-slate-600">No linked telemetry yet. Promote a signal from “Recent telemetry”.</div>
                    ) : (
                      <div className="space-y-2">
                        {timeline.map((e) => (
                          <div key={e.id} className="p-2 border border-slate-200 rounded bg-slate-50">
                            {(() => {
                              const v = getBgpAnomalyVerification(e);
                              if (!v) return null;
                              const rb = routeViewsBadge(v.corroborationStatus);
                              const pb = rpkiBadge(v.rpkiState);
                              return (
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded border text-xs ${rb.className}`}>{rb.label}</span>
                                  <span className={`px-2 py-0.5 rounded border text-xs ${pb.className}`}>{pb.label}</span>
                                </div>
                              );
                            })()}
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium text-slate-900">
                                [{e.source}] {e.title ?? e.type}
                              </div>
                              <span className={`px-2 py-0.5 rounded border text-xs ${severityBadge(e.severity)}`}>{e.severity}</span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">{e.summary ?? '—'}</div>
                            <div className="text-xs text-slate-500 mt-1">{formatTime(e.timestamp)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <div className="font-semibold text-slate-900">Recent telemetry (last 24h)</div>
                <div className="text-xs text-slate-500">{recentEvents.length} events</div>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {recentEvents.length === 0 ? (
                  <div className="p-3 text-sm text-slate-600">No telemetry yet. Once monitors emit signals, they’ll appear here.</div>
                ) : (
                  recentEvents.map((e) => (
                    <div key={e.id} className="p-3 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            [{e.source}] {e.title ?? e.type}
                          </div>
                          <div className="text-xs text-slate-600 truncate">{e.summary ?? '—'}</div>
                          <div className="text-xs text-slate-500 mt-1">{formatTime(e.timestamp)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {e.source === 'bgp' && e.type === 'bgp_anomaly' && (
                            <>
                              {(() => {
                                const v = getBgpAnomalyVerification(e);
                                const rb = routeViewsBadge(v?.corroborationStatus);
                                const pb = rpkiBadge(v?.rpkiState);
                                return (
                                  <>
                                    <span className={`px-2 py-0.5 rounded border text-xs ${rb.className}`}>{rb.label}</span>
                                    <span className={`px-2 py-0.5 rounded border text-xs ${pb.className}`}>{pb.label}</span>
                                  </>
                                );
                              })()}
                              <span
                                className={`px-2 py-0.5 rounded border text-xs ${
                                  isVerifiedForAutoConfirm(e)
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                                title={
                                  isVerifiedForAutoConfirm(e)
                                    ? 'Verified: RouteViews confirmed + RPKI valid (will auto-confirm on Promote)'
                                    : 'Unverified: will stay Suspected unless manually confirmed'
                                }
                              >
                                {isVerifiedForAutoConfirm(e) ? 'Verified' : 'Unverified'}
                              </span>
                            </>
                          )}
                          <span className={`px-2 py-0.5 rounded border text-xs ${severityBadge(e.severity)}`}>{e.severity}</span>
                          <button
                            onClick={() => handleCreateFromEvent(e.id)}
                            className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50"
                          >
                            Promote
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default IncidentCommandTab;

