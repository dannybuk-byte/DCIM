import { CLAIM_COMPARISON_FIELDS } from './fieldWarrants.js';

function state(row, field) {
  return Object.hasOwn(row, field) ? Object.freeze({ presence: 'present', value: row[field] }) : Object.freeze({ presence: 'missing' });
}

export function compareDartClaims(left, right) {
  const differences = [];
  const fields = CLAIM_COMPARISON_FIELDS.map(field => {
    const leftState = state(left, field);
    const rightState = state(right, field);
    const equal = leftState.presence === rightState.presence && (leftState.presence === 'missing' || Object.is(leftState.value, rightState.value));
    const comparison = Object.freeze({ field, left: leftState, right: rightState, equal });
    if (!equal) differences.push(comparison);
    return comparison;
  });
  return Object.freeze({ equal: differences.length === 0, compared_field_count: CLAIM_COMPARISON_FIELDS.length, compared_fields: CLAIM_COMPARISON_FIELDS, fields: Object.freeze(fields), differences: Object.freeze(differences) });
}
