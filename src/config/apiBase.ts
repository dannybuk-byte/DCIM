/**
 * API base URL helper.
 *
 * Use this for calling the Cloudflare Worker (or same-origin /api routes).
 *
 * Configure:
 * - VITE_API_BASE_URL="" (default)   -> same-origin
 * - VITE_API_BASE_URL="http://127.0.0.1:8787" -> wrangler dev
 * - VITE_API_BASE_URL="https://<your-worker>.workers.dev" -> deployed worker
 */

function normalizeBaseUrl(base: string): string {
  return base.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
  return raw ? normalizeBaseUrl(raw) : '';
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

