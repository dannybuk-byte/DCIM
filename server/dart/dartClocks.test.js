import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDartRowsArtifact } from './parseDartRows.js';
import { buildDartClocks, DART_SOURCE_EVENT_FIELDS, parseSelectedResponseHeaders } from './dartClocks.js';

const root = path.resolve('data/dart-v0.9/fixtures/h8r1');
const at = relative => path.join(root, relative);

function clocks() {
  const parsed = parseDartRowsArtifact(at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_RESPONSE_BODY.json'), { relativeTo: root });
  const selected = JSON.parse(fs.readFileSync(at('candidate/orangetown/SELECTED_ROWS.json')));
  const rows = selected.ordered_source_row_ids.map(id => parsed.by_source_row_id.get(id));
  const response_headers = parseSelectedResponseHeaders(fs.readFileSync(at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_SELECTED_RESPONSE_HEADERS.txt'), 'utf8'));
  return buildDartClocks(rows, {
    response_headers,
    retrieval_started_at: fs.readFileSync(at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_START_UTC.txt'), 'utf8').trim(),
    retrieval_finished_at: fs.readFileSync(at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_FINISH_UTC.txt'), 'utf8').trim(),
  });
}

describe('four-clock separation', () => {
  it('preserves all five source-event fields per physical row, including absence, without coercion', () => {
    const model = clocks();
    expect(model.source_event_clocks).toHaveLength(4);
    for (const row of model.source_event_clocks) expect(Object.keys(row.fields)).toEqual(DART_SOURCE_EVENT_FIELDS);
    expect(model.source_event_clocks[0].fields.enb_publication_date).toEqual({ state: 'ABSENT', value: null });
    expect(model.source_event_clocks[1].fields.date_received).toEqual({ state: 'PRESENT_EXACT', value: '2018-08-28T00:00:00.000' });
    expect(model.source_event_clocks[0].fields.permit_expration_date.value).toBe('2029-08-06T00:00:00.000');
  });

  it('keeps publication, retrieval, and first observation separate at the adopted values', () => {
    const model = clocks();
    expect(model.publication_snapshot_clock.primary).toEqual({ authority: 'X-SODA2-Truth-Last-Modified', value: 'Sat, 01 Aug 2026 09:29:16 GMT' });
    expect(model.publication_snapshot_clock.corroborating_metadata.last_modified).toBe('Sat, 01 Aug 2026 09:29:16 GMT');
    expect(model.publication_snapshot_clock.corroborating_metadata.socrata_created_at_values).toEqual(['2026-08-01T09:29:16.008Z']);
    expect(model.retrieval_clock).toEqual({
      primary: { authority: 'HTTP Date', value: 'Sun, 23 Aug 2026 19:58:54 GMT' },
      retrieval_window_utc: { started_at: '2026-08-23T19:58:54Z', finished_at: '2026-08-23T19:58:54Z' },
      x_socrata_request_id: '29efe5b599bd2a1e90b90154d07b9c02',
    });
    expect(model.first_observed_at).toBeNull();
    expect(Object.isFrozen(model)).toBe(true);
  });
});

