/**
 * R-F4 acceptance (reviewer falsifier): a guessed-domain CT/BGP observation can
 * never render as a facility claim. Facility-expansion claims require BOTH a
 * verified facility-to-domain linkage AND a persisted prior baseline; otherwise
 * observations are confined to entity annotations with explicit caveats.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveFacilityDomainLinkage,
  canClaimFacilityExpansion,
  observationScope,
  annotationCaveats,
  deriveHeuristicDomain,
} from './entityFacilityLinkage';
import { generateExpansionInsights, type SubdomainDiscovery } from './expansionTracker';
import type { Facility } from '../types';

function facility(overrides: Partial<Facility> = {}): Facility {
  return {
    id: 1,
    name: 'Prince William Cluster DC',
    type: 'Data Center',
    operator: 'BigTech',
    country: 'US',
    state: 'VA',
    city: 'Manassas',
    complianceStatus: 'Non-Compliant',
    subsidyGap: 5_000_000,
    lastAuditDate: '2026-01-01',
    issues: [],
    ...overrides,
  } as Facility;
}

const dcSubdomain: SubdomainDiscovery = {
  subdomain: 'dc1.example.com',
  firstSeen: new Date('2026-07-10'),
  certificateId: 1,
  issuer: 'Test CA',
  pattern: 'datacenter',
  confidence: 90,
};

describe('R-F4 linkage resolution', () => {
  it('name-only facility yields an UNVERIFIED name-heuristic linkage', () => {
    const linkage = resolveFacilityDomainLinkage(facility());
    expect(linkage.verified).toBe(false);
    expect(linkage.method).toBe('name-heuristic');
    expect(linkage.domain).toBe('prince-william-cluster-dc.com');
  });

  it('a caller-provided domain without a record is UNVERIFIED', () => {
    const linkage = resolveFacilityDomainLinkage(facility(), 'given.example');
    expect(linkage.verified).toBe(false);
    expect(linkage.method).toBe('provided-unverified');
    expect(linkage.domain).toBe('given.example');
  });

  it('a verified domain dataSource record is VERIFIED', () => {
    const linkage = resolveFacilityDomainLinkage(
      facility({
        dataSources: [
          { type: 'PeeringDB', field: 'domain', verified: true, reference: 'bigtech.com' } as never,
        ],
      }),
    );
    expect(linkage.verified).toBe(true);
    expect(linkage.method).toBe('verified-record');
    expect(linkage.domain).toBe('bigtech.com');
  });

  it('an UNverified domain dataSource record is not trusted', () => {
    const linkage = resolveFacilityDomainLinkage(
      facility({
        dataSources: [
          { type: 'PeeringDB', field: 'domain', verified: false, reference: 'guess.com' } as never,
        ],
      }),
    );
    expect(linkage.verified).toBe(false);
    // Falls through to the name heuristic, still unverified.
    expect(linkage.method).toBe('name-heuristic');
  });

  it('deriveHeuristicDomain is a pure slug (documented guess)', () => {
    expect(deriveHeuristicDomain('Foo Bar!!')).toBe('foo-bar.com');
    expect(deriveHeuristicDomain('   ')).toBeNull();
  });
});

describe('R-F4 facility-claim gate', () => {
  const verified = resolveFacilityDomainLinkage(
    facility({
      dataSources: [
        { type: 'PeeringDB', field: 'domain', verified: true, reference: 'bigtech.com' } as never,
      ],
    }),
  );
  const guessed = resolveFacilityDomainLinkage(facility());

  it('guessed domain can NEVER claim expansion, regardless of baseline', () => {
    expect(canClaimFacilityExpansion(guessed, false)).toBe(false);
    expect(canClaimFacilityExpansion(guessed, true)).toBe(false);
    expect(observationScope(guessed, true)).toBe('entity-annotation');
  });

  it('verified domain WITHOUT a baseline is still only an entity annotation', () => {
    expect(canClaimFacilityExpansion(verified, false)).toBe(false);
    expect(observationScope(verified, false)).toBe('entity-annotation');
  });

  it('verified domain WITH a persisted baseline may be a facility claim', () => {
    expect(canClaimFacilityExpansion(verified, true)).toBe(true);
    expect(observationScope(verified, true)).toBe('facility-claim');
    expect(annotationCaveats(verified, true)).toEqual([]);
  });

  it('caveats explain each missing precondition', () => {
    const caveats = annotationCaveats(guessed, false);
    expect(caveats.some(c => /guessed from the facility name/i.test(c))).toBe(true);
    expect(caveats.some(c => /no persisted prior baseline/i.test(c))).toBe(true);
    expect(caveats.some(c => /not a facility claim/i.test(c))).toBe(true);
  });
});

describe('R-F4 insight language is gated by scope', () => {
  it('entity-annotation scope never emits facility-claim language', () => {
    const insights = generateExpansionInsights('Prince William Cluster DC', [dcSubdomain], [], 'entity-annotation');
    const joined = insights.join(' ');
    expect(joined).not.toMatch(/possible facility expansion/i);
    expect(joined).not.toMatch(/verify compliance/i);
    expect(joined).toMatch(/entity annotation — not a facility claim/i);
    expect(joined).toMatch(/corroborate with facility-specific evidence/i);
  });

  it('default scope (no arg) is entity-annotation (safe by default)', () => {
    const insights = generateExpansionInsights('Prince William Cluster DC', [dcSubdomain], []);
    expect(insights.join(' ')).not.toMatch(/possible facility expansion/i);
  });

  it('facility-claim scope emits the compliance-comparison language', () => {
    const insights = generateExpansionInsights('Prince William Cluster DC', [dcSubdomain], [], 'facility-claim');
    const joined = insights.join(' ');
    expect(joined).toMatch(/possible facility expansion/i);
    expect(joined).toMatch(/verify compliance/i);
  });
});
