/**
 * Stage D — labeled synthetic candidates for the real/synthetic hybrid surface.
 *
 * These populate the early-warning surface where real data does not resolve, so the
 * instrument is demonstrable end to end. They are LABELED synthetic and use ONLY
 * RFC-reserved network ranges (constraint §2):
 *   - IPv4 documentation: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (RFC 5737)
 *   - IPv6 documentation: 2001:db8::/32 (RFC 3849)
 *   - Documentation ASNs: 64496–64511 (RFC 5398)
 *
 * Methodology guard: synthetic sources NEVER combine with real sources to cross the
 * two-source floor. A synthetic candidate is a synthetic demonstration of the gate
 * mechanic, clearly labeled — it is never presented as a real corroborated finding.
 * The NY single-source case encodes the honest Epoch coverage reality: most NY sites
 * get no Epoch match and correctly stay withheld.
 */

const SYNTHETIC_ATTRIBUTION = 'Synthetic (labeled) — RFC-reserved ranges, method demonstration only';

function syntheticSource(id, companyId, type, date, extra = {}) {
  return {
    id,
    company_id: companyId,
    type,
    date,
    provenance: 'synthetic',
    data_source: 'Synthetic fixture',
    attribution: SYNTHETIC_ATTRIBUTION,
    label: 'DESIGN',
    ...extra,
  };
}

export const SYNTHETIC_CANDIDATES = [
  {
    // Honest majority case: a NY data-center candidate with one synthetic network signal
    // and NO Epoch match. Stays single-source => withheld. This is correct behavior.
    id: 'synthetic_ny_hudson_valley_dc',
    name: 'Hudson Valley Compute (synthetic)',
    sector: 'Data Center / Colocation',
    provenance: 'synthetic',
    synthetic: true,
    location_note: 'New York — outside Epoch coverage concentration (record-holder skew)',
    sources: [
      syntheticSource(
        'syn_bgp_hudson_valley_001',
        'synthetic_ny_hudson_valley_dc',
        'bgp_route_signal',
        '2026-02-10',
        { prefix: '192.0.2.0/24', asn: 64496, detector: 'bgp_design' },
      ),
    ],
  },
  {
    // Fully-synthetic corroboration demo: two INDEPENDENT synthetic detections (distinct
    // prefixes/ASNs) crossing the floor — labeled synthetic end to end, never real.
    id: 'synthetic_frontier_west_dc',
    name: 'Frontier West Compute (synthetic)',
    sector: 'Data Center / Colocation',
    provenance: 'synthetic',
    synthetic: true,
    location_note: 'Synthetic demonstration of the two-source mechanic',
    sources: [
      syntheticSource(
        'syn_bgp_frontier_west_001',
        'synthetic_frontier_west_dc',
        'bgp_route_signal',
        '2026-01-05',
        { prefix: '198.51.100.0/24', asn: 64497, detector: 'bgp_design' },
      ),
      syntheticSource(
        'syn_ct_frontier_west_002',
        'synthetic_frontier_west_dc',
        'ct_log_signal',
        '2026-03-22',
        {
          prefix: '203.0.113.0/24',
          asn: 64498,
          ipv6_prefix: '2001:db8:abcd::/48',
          detector: 'ct_design',
          public_visibility_date: '2026-05-01',
        },
      ),
    ],
  },
];

/** Every network address a synthetic source carries (for the §6.5 RFC-reserved check). */
export function collectSyntheticNetworkAddresses(candidates = SYNTHETIC_CANDIDATES) {
  const addrs = [];
  for (const c of candidates) {
    for (const s of c.sources || []) {
      if (s.prefix) addrs.push(s.prefix);
      if (s.ipv6_prefix) addrs.push(s.ipv6_prefix);
    }
  }
  return addrs;
}
