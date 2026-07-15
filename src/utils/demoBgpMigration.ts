/**
 * R-F10 — demo BGP migration isolation.
 *
 * Demo BGP metrics live ONLY in the demo namespace ('ComplianceDatabase_demo',
 * R-F1). These helpers mirror the ComplianceDatabase v9/v10 upgrade logic as
 * pure functions so migration fixtures can exercise them without IndexedDB:
 *
 *   - backfill (demo namespace only): fill missing demo fields, idempotent;
 *   - strip (live namespace): remove any demo fields that the historical,
 *     un-gated v9 backfill persisted onto real facility rows.
 */

import type { Facility } from '../types';
import { computeDemoBgpFields } from './bgpDemo';

/** The six demo-only fields the v9 migration wrote onto facility rows. */
export const DEMO_BGP_FIELD_NAMES = [
  'bgpRiskScore',
  'asnCount',
  'routeChangeRate',
  'latencyAnomalyScore',
  'transitDependency',
  'infrastructureAccountabilityRisk',
] as const;

export type DemoBgpFieldName = (typeof DEMO_BGP_FIELD_NAMES)[number];

/** True when a row carries any demo BGP field (live-row pollution detector). */
export function hasAnyDemoBgpField(facility: Facility): boolean {
  return DEMO_BGP_FIELD_NAMES.some(
    (name) => (facility as Record<string, unknown>)[name] !== undefined,
  );
}

/**
 * Demo-namespace backfill: apply demo BGP fields only when missing (same
 * guard as the Dexie v9 `.upgrade`). Second application leaves values
 * unchanged (idempotent). Pure — returns a new object.
 */
export function applyV9DemoBgpBackfill(facility: Facility): Facility {
  if (
    facility.bgpRiskScore != null &&
    facility.infrastructureAccountabilityRisk != null
  ) {
    return facility;
  }
  const bgp = computeDemoBgpFields(
    facility.id,
    facility.subsidyGap ?? 0,
    facility.complianceStatus,
  );
  return {
    ...facility,
    bgpRiskScore: bgp.bgpRiskScore,
    asnCount: bgp.asnCount,
    routeChangeRate: bgp.routeChangeRate,
    latencyAnomalyScore: bgp.latencyAnomalyScore,
    transitDependency: bgp.transitDependency,
    infrastructureAccountabilityRisk: bgp.infrastructureAccountabilityRisk,
  };
}

/** In-place variant for Dexie `.modify` inside the demo-namespace upgrade. */
export function backfillDemoBgpInPlace(facility: Facility): void {
  Object.assign(facility, applyV9DemoBgpBackfill(facility));
}

/**
 * Live-namespace cleanup: remove every demo BGP field from a row. Pure —
 * returns a new object without the fields; idempotent by construction.
 */
export function stripDemoBgpFields(facility: Facility): Facility {
  const cleaned = { ...facility } as Record<string, unknown>;
  for (const name of DEMO_BGP_FIELD_NAMES) {
    delete cleaned[name];
  }
  return cleaned as unknown as Facility;
}

/**
 * In-place variant for Dexie `.modify` inside the live-namespace upgrade.
 * Returns true when the row was polluted (any field removed).
 */
export function stripDemoBgpFieldsInPlace(facility: Facility): boolean {
  const polluted = hasAnyDemoBgpField(facility);
  const row = facility as Record<string, unknown>;
  for (const name of DEMO_BGP_FIELD_NAMES) {
    delete row[name];
  }
  return polluted;
}
