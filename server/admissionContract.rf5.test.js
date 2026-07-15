/**
 * @vitest-environment node
 *
 * R-F5 acceptance — admission contract AHEAD of the raw count.
 *
 * The floor itself (MIN_SOURCES_FOR_SCORES = 2, raw count of the counted
 * list) is UNCHANGED; these tests prove the contract gates what enters that
 * list:
 *   A1  annotation + one evidence row no longer crosses the two-source floor
 *   A2  duplicate source ids are counted once and no longer cross the floor
 *   A3  malformed candidates fail closed (suppressed, never thrown/scored)
 *   A4  annotations are stored outside the counted list (partition visible)
 *   A5  floor semantics unchanged: two admissible unique evidence rows score
 *   A6  rows without admissible identity (id/type) are rejected
 */
import { describe, expect, it } from 'vitest';
import {
  admitCandidateSources,
  buildAdmissionSummary,
  isAnnotationRow,
} from './admissionContract.js';
import { scoreCompany, scoreCompanyForPeriod } from './scoringEngine.js';

const REF = new Date('2026-06-01T12:00:00Z');

const EVIDENCE_A = {
  id: 'ev-a',
  type: 'earnings_call',
  date: '2025-03-01',
  ai_attribution_tier: 'strong',
};
const EVIDENCE_B = {
  id: 'ev-b',
  type: 'warn_filing',
  date: '2025-04-01',
  workers_affected: 200,
  ai_disclosed_in_warn: false,
};
const ANNOTATION = {
  id: 'note-1',
  type: 'disclosure_gap_annotation',
  date: '2025-04-15',
  excerpt: 'Disclosure gap: verification incomplete.',
};

describe('A1 — annotation + evidence no longer crosses the floor', () => {
  it('one evidence row plus one annotation is suppressed', () => {
    const s = scoreCompany({ id: 'a1', sources: [EVIDENCE_A, ANNOTATION] }, REF);
    expect(s.scores_suppressed).toBe(true);
    expect(s.aas).toBe(null);
    expect(s.source_count).toBe(1);
    expect(s.admission.annotation_count).toBe(1);
    expect(s.warnings.some(w => w.includes('VALIDATION'))).toBe(true);
  });

  it('one evidence row plus many annotations is still suppressed', () => {
    const annotations = [1, 2, 3].map(n => ({
      ...ANNOTATION,
      id: `note-${n}`,
    }));
    const s = scoreCompany({ id: 'a1b', sources: [EVIDENCE_A, ...annotations] }, REF);
    expect(s.scores_suppressed).toBe(true);
    expect(s.source_count).toBe(1);
    expect(s.admission.annotation_count).toBe(3);
  });
});

describe('A2 — duplicate source ids counted once', () => {
  it('the same source twice does not cross the floor', () => {
    const s = scoreCompany({ id: 'a2', sources: [EVIDENCE_A, { ...EVIDENCE_A }] }, REF);
    expect(s.scores_suppressed).toBe(true);
    expect(s.source_count).toBe(1);
    expect(s.admission.duplicate_ids).toEqual(['ev-a']);
    expect(s.warnings.some(w => w.includes('Duplicate source ids'))).toBe(true);
  });

  it('a duplicated id among three raw rows counts as two admissible rows', () => {
    const s = scoreCompany(
      { id: 'a2b', sources: [EVIDENCE_A, { ...EVIDENCE_A }, EVIDENCE_B] },
      REF,
    );
    expect(s.scores_suppressed).toBe(false);
    expect(s.source_count).toBe(2);
    expect(s.admission.duplicate_ids).toEqual(['ev-a']);
  });
});

describe('A3 — malformed candidates fail closed', () => {
  it('sources not an array admits nothing and suppresses', () => {
    const s = scoreCompany({ id: 'a3', sources: 'not-an-array' }, REF);
    expect(s.scores_suppressed).toBe(true);
    expect(s.source_count).toBe(0);
    expect(s.admission.malformed).toBe(true);
    expect(s.admission.malformed_reason).toBe('sources_not_an_array');
    expect(s.warnings.some(w => w.includes('ADMISSION'))).toBe(true);
  });

  it('missing sources key admits nothing and suppresses (no throw)', () => {
    const s = scoreCompany({ id: 'a3b' }, REF);
    expect(s.scores_suppressed).toBe(true);
    expect(s.source_count).toBe(0);
  });

  it('non-object rows are rejected, not counted', () => {
    const s = scoreCompany(
      { id: 'a3c', sources: [EVIDENCE_A, null, 'string-row', 42, [EVIDENCE_B]] },
      REF,
    );
    expect(s.scores_suppressed).toBe(true);
    expect(s.source_count).toBe(1);
    expect(s.admission.rejected_rows).toHaveLength(4);
    expect(s.admission.rejected_rows.every(r => r.reason === 'row_not_an_object')).toBe(true);
  });

  it('scoreCompanyForPeriod fails a malformed candidate closed too', () => {
    const s = scoreCompanyForPeriod({ id: 'a3d', sources: { rogue: true } }, REF, {
      from: '2025-01-01',
      to: '2025-12-31',
    });
    expect(s.scores_suppressed).toBe(true);
    expect(s.admission.malformed).toBe(true);
  });
});

describe('A4 — annotations stored outside the counted list', () => {
  it('admitCandidateSources partitions annotations away from counted', () => {
    const admission = admitCandidateSources([EVIDENCE_A, ANNOTATION, EVIDENCE_B]);
    expect(admission.counted.map(s => s.id)).toEqual(['ev-a', 'ev-b']);
    expect(admission.annotations.map(s => s.id)).toEqual(['note-1']);
    expect(admission.counted.some(isAnnotationRow)).toBe(false);
  });

  it('the scored payload reports the partition without counting annotations', () => {
    const s = scoreCompany({ id: 'a4', sources: [EVIDENCE_A, EVIDENCE_B, ANNOTATION] }, REF);
    expect(s.scores_suppressed).toBe(false);
    expect(s.source_count).toBe(2);
    expect(s.admission.admitted_source_count).toBe(2);
    expect(s.admission.annotation_count).toBe(1);
    expect(s.admission.annotation_ids).toEqual(['note-1']);
    // The annotation contributes to no axis and no type census.
    expect(s.source_types_present).not.toContain('disclosure_gap_annotation');
  });
});

describe('A5 — floor value and raw-count semantics unchanged', () => {
  it('two admissible unique evidence rows still cross the floor', () => {
    const s = scoreCompany({ id: 'a5', sources: [EVIDENCE_A, EVIDENCE_B] }, REF);
    expect(s.scores_suppressed).toBe(false);
    expect(s.source_count).toBe(2);
    expect(s.aas).toBe(25);
    expect(s.lss).toBe(15 + 2);
  });

  it('exactly one admissible row is below the floor (raw count, no weighting)', () => {
    const s = scoreCompany({ id: 'a5b', sources: [EVIDENCE_A] }, REF);
    expect(s.scores_suppressed).toBe(true);
  });
});

describe('A6 — unique source identity required for admission', () => {
  it('rows missing an id are rejected', () => {
    const noId = { type: 'earnings_call', date: '2025-03-01', ai_attribution_tier: 'strong' };
    const admission = admitCandidateSources([noId, { ...noId, id: '' }, { ...noId, id: '   ' }]);
    expect(admission.counted).toHaveLength(0);
    expect(admission.rejected.every(r => r.reason === 'missing_or_empty_id')).toBe(true);
  });

  it('rows missing a type are rejected', () => {
    const admission = admitCandidateSources([
      { id: 'x1', date: '2025-03-01' },
      { id: 'x2', type: '', date: '2025-03-01' },
    ]);
    expect(admission.counted).toHaveLength(0);
    expect(admission.rejected.every(r => r.reason === 'missing_or_empty_type')).toBe(true);
  });

  it('buildAdmissionSummary is serializable and faithful', () => {
    const admission = admitCandidateSources([EVIDENCE_A, { ...EVIDENCE_A }, ANNOTATION, null]);
    const summary = buildAdmissionSummary(admission);
    expect(summary).toEqual({
      admitted_source_count: 1,
      annotation_count: 1,
      annotation_ids: ['note-1'],
      rejected_rows: [
        { index: 1, id: 'ev-a', reason: 'duplicate_source_id' },
        { index: 3, id: null, reason: 'row_not_an_object' },
      ],
      duplicate_ids: ['ev-a'],
      malformed: false,
    });
    expect(() => JSON.stringify(summary)).not.toThrow();
  });
});
