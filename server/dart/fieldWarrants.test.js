import { describe, expect, it } from 'vitest';
import { CLAIM_COMPARISON_FIELDS, DATASET_FIELD_WARRANTS, FIELD_WARRANTS, SYSTEM_FIELD_WARRANTS, getFieldWarrant } from './fieldWarrants.js';

describe('DART field-warrant registry', () => {
  it('is complete and freezes the deterministic 26-field comparison set', () => {
    expect(SYSTEM_FIELD_WARRANTS).toHaveLength(4);
    expect(DATASET_FIELD_WARRANTS).toHaveLength(26);
    expect(FIELD_WARRANTS).toHaveLength(30);
    expect(CLAIM_COMPARISON_FIELDS).toHaveLength(26);
    expect(new Set(CLAIM_COMPARISON_FIELDS).size).toBe(26);
    expect(CLAIM_COMPARISON_FIELDS).not.toContain(':id');
    expect(CLAIM_COMPARISON_FIELDS).toContain('permit_expration_date');
    expect(CLAIM_COMPARISON_FIELDS).toContain('enivronmental_justice');
    for (const warrant of FIELD_WARRANTS) {
      expect(warrant).toEqual(expect.objectContaining({ raw_field_name: expect.any(String), author_source_authority: expect.any(String), bounded_established_meaning: expect.any(String), prohibited_inference: expect.any(String), internal_preservation_name: expect.any(String), warrant_status: expect.any(String), display_privacy_condition: expect.any(String) }));
    }
  });

  it('marks unknown fields unwarranted without assigning a meaning', () => {
    expect(getFieldWarrant('future_source_field')).toMatchObject({ raw_field_name: 'future_source_field', warrant_status: 'UNKNOWN_FIELD_UNWARRANTED' });
  });

  it('maps both platform timestamps only to the adopted snapshot load clock', () => {
    expect(getFieldWarrant(':created_at').internal_preservation_name).toBe('snapshot_loaded_at');
    expect(getFieldWarrant(':updated_at').internal_preservation_name).toBe('snapshot_loaded_at');
    expect(FIELD_WARRANTS.some(warrant => warrant.internal_preservation_name === 'snapshot_updated_at')).toBe(false);
    expect(getFieldWarrant(':updated_at').prohibited_inference).toContain('Incremental-change clock');
  });
});
