export const DART_SOURCE_EVENT_FIELDS = Object.freeze([
  'date_received',
  'enb_publication_date',
  'written_comments_due',
  'permit_effective_date',
  'permit_expration_date',
]);

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(nested => deepFreeze(nested, seen));
  return Object.freeze(value);
}

function valueState(raw, field) {
  return Object.hasOwn(raw, field)
    ? { state: raw[field] === null ? 'PRESENT_NULL' : 'PRESENT_EXACT', value: raw[field] }
    : { state: 'ABSENT', value: null };
}

function header(headers, name) {
  const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = normalize(name);
  return headers.find(entry => normalize(entry.name) === key)?.value ?? null;
}

/** Build four deliberately separate clocks. Date strings are preserved, never parsed or coerced. */
export function buildDartClocks(rows, { response_headers, retrieval_started_at, retrieval_finished_at }) {
  if (!Array.isArray(rows) || !Array.isArray(response_headers)) throw new TypeError('INVALID_DART_CLOCK_INPUT');
  const sourceEventClocks = rows.map(row => ({
    source_row_id: row.source_row_id,
    fields: Object.fromEntries(DART_SOURCE_EVENT_FIELDS.map(field => [field, valueState(row.raw, field)])),
  }));
  const created = [...new Set(rows.map(row => valueState(row.raw, ':created_at').value))];
  const updated = [...new Set(rows.map(row => valueState(row.raw, ':updated_at').value))];
  return deepFreeze({
    source_event_clocks: sourceEventClocks,
    publication_snapshot_clock: {
      primary: { authority: 'X-SODA2-Truth-Last-Modified', value: header(response_headers, 'X-SODA2-Truth-Last-Modified') },
      corroborating_metadata: {
        last_modified: header(response_headers, 'Last-Modified'),
        socrata_created_at_values: created,
        socrata_updated_at_values: updated,
      },
    },
    retrieval_clock: {
      primary: { authority: 'HTTP Date', value: header(response_headers, 'Date') },
      retrieval_window_utc: { started_at: retrieval_started_at, finished_at: retrieval_finished_at },
      x_socrata_request_id: header(response_headers, 'X-Socrata-RequestId'),
    },
    first_observed_at: null,
  });
}

export function parseSelectedResponseHeaders(text) {
  return Object.freeze(String(text).split(/\r?\n/).filter(Boolean).map(line => {
    const separator = line.indexOf('=');
    if (separator < 1) throw new TypeError('INVALID_SELECTED_RESPONSE_HEADER');
    return Object.freeze({ name: line.slice(0, separator).replaceAll('_', '-'), value: line.slice(separator + 1) });
  }));
}
