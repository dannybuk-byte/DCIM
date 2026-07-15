/**
 * R-F1: demo/seed namespace selection.
 *
 * Demo data lives in its own IndexedDB database and is only active when
 * explicitly selected via the VITE_DEMO_MODE env flag. The live database
 * ('ComplianceDatabase') is never seeded, cleared, or overwritten by
 * startup code; the demo namespace is the only seeding target.
 */

export const LIVE_DB_NAME = 'ComplianceDatabase';
export const DEMO_DB_NAME = 'ComplianceDatabase_demo';

/** True only when demo mode was explicitly selected at build/run time. */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

/** Name of the IndexedDB database the app opens in the current mode. */
export function activeDbName(): string {
  return isDemoMode() ? DEMO_DB_NAME : LIVE_DB_NAME;
}
