/**
 * Slice D-A — demo-vs-live chrome labels.
 * Source of truth: isDemoMode() (VITE_DEMO_MODE). Does not alter consoleStatus.
 */

import { isDemoMode } from '../db/demoMode';

/** Ready-state status pill: LIVE only for non-demo; DEMO · READY in demo. */
export function readyModeChromeLabel(): 'LIVE' | 'DEMO · READY' {
  return isDemoMode() ? 'DEMO · READY' : 'LIVE';
}

/** Secondary LIVE/DEMO badges (no READY nuance). */
export function liveFamilyChromeLabel(): 'LIVE' | 'DEMO' {
  return isDemoMode() ? 'DEMO' : 'LIVE';
}

export function dashboardTitleChrome(): string {
  return isDemoMode() ? 'Demo Dashboard' : 'Live Dashboard';
}

export function deployChipChrome(): string {
  return isDemoMode() ? 'Demo' : 'Live';
}

export function alertsPanelChromeLabel(): string {
  return isDemoMode() ? 'DEMO ALERTS' : 'LIVE ALERTS';
}

export function liveStatusSectionChromeLabel(): string {
  return isDemoMode() ? 'Demo Status' : 'Live Status';
}

export function liveMonitoringChromeLabel(): string {
  return isDemoMode() ? 'Demo Monitoring' : 'Live Monitoring';
}

/**
 * C3 / build-marker scaffolding — production builds always false;
 * local Vite (import.meta.env.DEV) may show for developer usefulness.
 */
export function showReviewerDebugChrome(): boolean {
  return import.meta.env.DEV === true;
}
