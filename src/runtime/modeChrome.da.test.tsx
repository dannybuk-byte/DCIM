/**
 * Slice D-A — mode-aware chrome + C3 reviewer scaffolding gates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';

const modeState = vi.hoisted(() => ({ demo: false }));

vi.mock('../db/demoMode', () => ({
  LIVE_DB_NAME: 'ComplianceDatabase',
  DEMO_DB_NAME: 'ComplianceDatabase_demo',
  isDemoMode: (): boolean => modeState.demo,
  activeDbName: (): string =>
    modeState.demo ? 'ComplianceDatabase_demo' : 'ComplianceDatabase',
}));

import {
  alertsPanelChromeLabel,
  dashboardTitleChrome,
  deployChipChrome,
  liveFamilyChromeLabel,
  liveMonitoringChromeLabel,
  liveStatusSectionChromeLabel,
  readyModeChromeLabel,
  showReviewerDebugChrome,
} from './modeChrome';
import { SimpleBuildBadge } from '../components/SimpleBuildBadge';
import { LiveIndicator } from '../components/shared/CommandCenterComponents';
import { DeploymentPulse } from '../components/DeploymentPulse';
import { BGP_CONNECTED_CHROME_LABEL } from '../components/shared/BGPRouteMonitor';

/** LIVE-family mode-chrome tokens that must not appear under demo mode. */
function assertNoLiveFamilyModeChrome(text: string): void {
  expect(text).not.toMatch(/\bLIVE\b/);
  expect(text).not.toMatch(/\bLive Dashboard\b/);
  expect(text).not.toMatch(/\bLive Monitoring\b/);
  expect(text).not.toMatch(/\bLive Status\b/);
  // Footer / chip "Live" as a standalone token (not "Live BGP" product copy).
  expect(text).not.toMatch(/(^|[\s>])Live([\s<]|$)/);
}

function ModeChromeHarness(): ReactElement {
  return (
    <div data-testid="mode-chrome-harness">
      <span data-mode-chrome="ready">{readyModeChromeLabel()}</span>
      <span data-mode-chrome="live-family">{liveFamilyChromeLabel()}</span>
      <span data-mode-chrome="alerts">{alertsPanelChromeLabel()}</span>
      <span data-mode-chrome="live-status">{liveStatusSectionChromeLabel()}</span>
      <span data-mode-chrome="monitoring">{liveMonitoringChromeLabel()}</span>
      <span data-mode-chrome="title">{dashboardTitleChrome()}</span>
      <span data-mode-chrome="deploy">{deployChipChrome()}</span>
      <span data-bgp-chrome="connected">{BGP_CONNECTED_CHROME_LABEL}</span>
      <LiveIndicator />
      <SimpleBuildBadge />
      <DeploymentPulse />
    </div>
  );
}

/** Mirrors Omniscient / SecurityOverview: markers only when showReviewerDebugChrome(). */
function ReviewerScaffoldChrome(): ReactElement {
  return (
    <div data-testid="reviewer-scaffold">
      {showReviewerDebugChrome() && (
        <>
          <span data-reviewer-debug-chrome="debug-label">
            DEBUG: REVIEWER MODE FORCED RENDER
          </span>
          <span data-reviewer-debug-chrome="build-marker">
            Build: Reviewer Mode Enabled
          </span>
        </>
      )}
    </div>
  );
}

beforeEach(() => {
  modeState.demo = false;
});

afterEach(() => {
  cleanup();
});

describe('D-A modeChrome helpers', () => {
  it('live mode: ready/live-family map to LIVE', () => {
    modeState.demo = false;
    expect(readyModeChromeLabel()).toBe('LIVE');
    expect(liveFamilyChromeLabel()).toBe('LIVE');
    expect(dashboardTitleChrome()).toBe('Live Dashboard');
    expect(deployChipChrome()).toBe('Live');
    expect(alertsPanelChromeLabel()).toBe('LIVE ALERTS');
    expect(liveStatusSectionChromeLabel()).toBe('Live Status');
    expect(liveMonitoringChromeLabel()).toBe('Live Monitoring');
  });

  it('demo mode: ready → DEMO · READY; secondary → DEMO; no LIVE labels', () => {
    modeState.demo = true;
    expect(readyModeChromeLabel()).toBe('DEMO · READY');
    expect(liveFamilyChromeLabel()).toBe('DEMO');
    expect(dashboardTitleChrome()).toBe('Demo Dashboard');
    expect(deployChipChrome()).toBe('Demo');
    expect(alertsPanelChromeLabel()).toBe('DEMO ALERTS');
    expect(liveStatusSectionChromeLabel()).toBe('Demo Status');
    expect(liveMonitoringChromeLabel()).toBe('Demo Monitoring');

    const labels = [
      readyModeChromeLabel(),
      liveFamilyChromeLabel(),
      dashboardTitleChrome(),
      deployChipChrome(),
      alertsPanelChromeLabel(),
      liveStatusSectionChromeLabel(),
      liveMonitoringChromeLabel(),
    ].join('\n');
    assertNoLiveFamilyModeChrome(labels);
  });

  it('BGP connected chrome is FEED (not LIVE)', () => {
    expect(BGP_CONNECTED_CHROME_LABEL).toBe('FEED');
    expect(BGP_CONNECTED_CHROME_LABEL).not.toBe('LIVE');
  });

  it('showReviewerDebugChrome matches import.meta.env.DEV (shared C3 gate)', () => {
    expect(showReviewerDebugChrome()).toBe(import.meta.env.DEV === true);
  });
});

describe('D-A rendered chrome surfaces', () => {
  it('demo mode: harness has zero LIVE-family chrome strings (incl. secondary)', () => {
    modeState.demo = true;
    const { container, queryByTestId } = render(<ModeChromeHarness />);
    const harness = queryByTestId('mode-chrome-harness');
    expect(harness).not.toBeNull();
    assertNoLiveFamilyModeChrome(harness?.textContent ?? '');

    expect(container.querySelector('[data-build-badge="title"]')?.textContent).toBe(
      'Demo Dashboard',
    );
    expect(container.querySelector('[data-build-badge="deploy-chip"]')?.textContent).toBe(
      'Demo',
    );
    expect(container.querySelector('[data-mode-chrome="live-family"]')?.textContent).toBe(
      'DEMO',
    );
    expect(container.querySelector('[data-bgp-chrome="connected"]')?.textContent).toBe(
      'FEED',
    );
  });

  it('live mode: harness shows LIVE-family chrome', () => {
    modeState.demo = false;
    const { container } = render(<ModeChromeHarness />);
    expect(container.querySelector('[data-mode-chrome="ready"]')?.textContent).toBe('LIVE');
    expect(container.querySelector('[data-mode-chrome="live-family"]')?.textContent).toBe(
      'LIVE',
    );
    expect(container.querySelector('[data-build-badge="title"]')?.textContent).toBe(
      'Live Dashboard',
    );
    expect(container.querySelector('[data-build-badge="deploy-chip"]')?.textContent).toBe(
      'Live',
    );
  });

  it('reviewer scaffold follows showReviewerDebugChrome()', () => {
    const { queryByTestId } = render(<ReviewerScaffoldChrome />);
    const root = queryByTestId('reviewer-scaffold');
    expect(root).not.toBeNull();
    const text = root?.textContent ?? '';
    if (showReviewerDebugChrome()) {
      expect(text).toMatch(/DEBUG: REVIEWER MODE FORCED RENDER/);
      expect(text).toMatch(/Build: Reviewer Mode Enabled/);
    } else {
      expect(text).not.toMatch(/DEBUG:/);
      expect(text).not.toMatch(/Build: Reviewer Mode Enabled/);
    }
  });
});
