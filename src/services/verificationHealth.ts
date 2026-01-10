import { apiUrl, getApiBaseUrl } from '../config/apiBase';
import { telemetryBus } from './telemetryBus';

export type VerificationHealthStatus = 'unknown' | 'ok' | 'down';

export interface VerificationHealthSnapshot {
  status: VerificationHealthStatus;
  checkedAt: number;
  message?: string;
}

/**
 * Best-effort health check for the verification proxy (Cloudflare Worker).
 *
 * IMPORTANT:
 * - Never throw: monitoring must not crash the app.
 * - Treat failures as signal: emit telemetry so Incident Command can see outages.
 */
export async function checkVerificationProxyHealth(): Promise<VerificationHealthSnapshot> {
  const checkedAt = Date.now();
  const base = getApiBaseUrl();
  if (!base) {
    return { status: 'unknown', checkedAt, message: 'No VITE_API_BASE_URL configured (using same-origin /api)' };
  }

  try {
    const res = await fetch(apiUrl('/api/health'), { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      const msg = `health endpoint returned ${res.status}`;
      void emitVerificationFailureTelemetry(msg, checkedAt);
      return { status: 'down', checkedAt, message: msg };
    }

    // We don't need the full payload; if it parses, great.
    await res.json().catch(() => undefined);
    return { status: 'ok', checkedAt };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    void emitVerificationFailureTelemetry(msg, checkedAt);
    return { status: 'down', checkedAt, message: msg };
  }
}

async function emitVerificationFailureTelemetry(message: string, checkedAt: number): Promise<void> {
  try {
    await telemetryBus.emit({
      source: 'api',
      type: 'verification_proxy_health_failed',
      severity: 'medium',
      title: 'Verification proxy health check failed',
      summary: message,
      payload: {
        checkedAt,
        baseUrl: getApiBaseUrl(),
      },
      fingerprint: ['verification_proxy_health_failed', getApiBaseUrl(), message].filter(Boolean).join('|'),
      timestamp: checkedAt,
    });
  } catch {
    // swallow
  }
}

