/**
 * R-F4 — entity ≠ facility enforcement.
 *
 * Certificate-Transparency (CT) and BGP/DNS observations are properties of a
 * DOMAIN / network ENTITY, not of a physical FACILITY. Rendering them as
 * facility claims requires two things the taskbrief makes mandatory:
 *
 *   1. a VERIFIED facility-to-domain linkage (never a name-derived guess), and
 *   2. a PERSISTED prior baseline to diff against (so "new"/"expansion" means
 *      something relative to a real earlier observation).
 *
 * Without both, an observation may still be shown — but only as an ENTITY
 * ANNOTATION, explicitly labelled and stripped of facility-claim language.
 * A guessed domain can therefore never surface as a facility claim.
 */

import type { Facility } from '../types';

export type DomainLinkageMethod =
  | 'verified-record'
  | 'provided-unverified'
  | 'name-heuristic'
  | 'none';

export interface DomainLinkage {
  domain: string | null;
  /** True ONLY for a verified facility-to-domain record; never for guesses. */
  verified: boolean;
  method: DomainLinkageMethod;
  /** Human-readable reason the linkage is (not) trusted. */
  rationale: string;
}

export type ObservationScope = 'facility-claim' | 'entity-annotation';

/**
 * Name-derived domain guess (the historical heuristic, centralized). This is
 * explicitly NOT a verified linkage — it exists only so unverified entity
 * annotations can still be attempted, clearly labelled as guesses.
 */
export function deriveHeuristicDomain(name: string): string | null {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) return null;
  return `${slug}.com`;
}

/**
 * A facility carries a verified domain linkage when it has a dataSources entry
 * for the 'domain' field marked verified with a concrete reference, or an
 * explicit verifiedDomain string. Anything else is unverified.
 */
export function resolveFacilityDomainLinkage(
  facility: Pick<Facility, 'name' | 'dataSources'> & { verifiedDomain?: string },
  providedDomain?: string,
): DomainLinkage {
  const verifiedRecord = (facility.dataSources ?? []).find(
    (s) => s.field === 'domain' && s.verified === true && Boolean(s.reference),
  );
  if (verifiedRecord?.reference) {
    return {
      domain: verifiedRecord.reference,
      verified: true,
      method: 'verified-record',
      rationale: 'Verified facility-to-domain linkage on record.',
    };
  }
  if (typeof facility.verifiedDomain === 'string' && facility.verifiedDomain.trim()) {
    return {
      domain: facility.verifiedDomain.trim(),
      verified: true,
      method: 'verified-record',
      rationale: 'Verified facility-to-domain linkage on record.',
    };
  }

  if (typeof providedDomain === 'string' && providedDomain.trim()) {
    return {
      domain: providedDomain.trim(),
      verified: false,
      method: 'provided-unverified',
      rationale: 'Domain supplied without a verified facility linkage — treated as entity annotation.',
    };
  }

  const guessed = deriveHeuristicDomain(facility.name);
  if (guessed) {
    return {
      domain: guessed,
      verified: false,
      method: 'name-heuristic',
      rationale: 'Domain guessed from facility name — not a verified linkage; entity annotation only.',
    };
  }

  return {
    domain: null,
    verified: false,
    method: 'none',
    rationale: 'No domain available for this facility.',
  };
}

/**
 * The single gate: a facility expansion claim is permitted ONLY with a
 * verified linkage AND a persisted prior baseline.
 */
export function canClaimFacilityExpansion(
  linkage: DomainLinkage,
  hasPersistedBaseline: boolean,
): boolean {
  return linkage.verified && hasPersistedBaseline;
}

/** Resolve the scope any CT/BGP/DNS observation may be rendered at. */
export function observationScope(
  linkage: DomainLinkage,
  hasPersistedBaseline: boolean,
): ObservationScope {
  return canClaimFacilityExpansion(linkage, hasPersistedBaseline)
    ? 'facility-claim'
    : 'entity-annotation';
}

/**
 * Why an observation is confined to an entity annotation (empty when it
 * legitimately qualifies as a facility claim).
 */
export function annotationCaveats(
  linkage: DomainLinkage,
  hasPersistedBaseline: boolean,
): string[] {
  const caveats: string[] = [];
  if (!linkage.verified) {
    caveats.push(
      linkage.method === 'name-heuristic'
        ? 'Domain is guessed from the facility name — not a verified facility-to-domain linkage.'
        : 'Domain is not backed by a verified facility linkage.',
    );
  }
  if (!hasPersistedBaseline) {
    caveats.push('No persisted prior baseline yet — first observation establishes the baseline.');
  }
  if (caveats.length > 0) {
    caveats.push('Shown as an entity/network annotation, not a facility claim.');
  }
  return caveats;
}
