/**
 * @vitest-environment node
 *
 * S1 acceptance assertions §6.4 and §6.5 over the labeled-synthetic fixtures.
 *   §6.4  no record / field / fixture value is an individual's name
 *   §6.5  every synthetic network address is within an RFC-reserved range
 */
import { describe, expect, it } from 'vitest';
import {
  SYNTHETIC_CANDIDATES,
  collectSyntheticNetworkAddresses,
} from './syntheticCandidates.js';

// RFC 5737 (IPv4 doc), RFC 3849 (IPv6 doc).
const RFC5737 = [/^192\.0\.2\./, /^198\.51\.100\./, /^203\.0\.113\./];
const RFC3849 = /^2001:db8:/i;

function ipv4Reserved(prefix) {
  const ip = prefix.split('/')[0];
  return RFC5737.some(re => re.test(ip));
}
function ipv6Reserved(prefix) {
  return RFC3849.test(prefix);
}

describe('§6.5 synthetic network addresses are RFC-reserved', () => {
  it('every prefix is documentation-range; no routable address', () => {
    const addrs = collectSyntheticNetworkAddresses();
    expect(addrs.length).toBeGreaterThan(0);
    for (const a of addrs) {
      const ok = a.includes(':') ? ipv6Reserved(a) : ipv4Reserved(a);
      expect(ok, `address not RFC-reserved: ${a}`).toBe(true);
    }
  });

  it('every synthetic ASN is in the RFC 5398 documentation range 64496–64511', () => {
    for (const c of SYNTHETIC_CANDIDATES) {
      for (const s of c.sources || []) {
        if (s.asn === undefined) continue;
        expect(s.asn, `ASN out of doc range: ${s.asn}`).toBeGreaterThanOrEqual(64496);
        expect(s.asn).toBeLessThanOrEqual(64511);
      }
    }
  });
});

describe('§6.4 no individual names in the synthetic fixtures', () => {
  it('no string value is a bare personal name', () => {
    const person = /^[A-Z][a-z]+ [A-Z][a-z]+$/;
    // Corporate/geographic bigrams that are NOT people (allowed).
    const allowed = new Set(['Hudson Valley', 'Frontier West', 'Data Center']);
    const walk = value => {
      if (typeof value === 'string') {
        const cleaned = value.replace(/\(synthetic\)/i, '').trim();
        if (person.test(cleaned) && !allowed.has(cleaned)) {
          throw new Error(`possible individual name: ${cleaned}`);
        }
      } else if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach(walk);
      }
    };
    expect(() => walk(SYNTHETIC_CANDIDATES)).not.toThrow();
  });
});

describe('§6.6 synthetic candidates are labeled synthetic and distinguishable', () => {
  it('each carries provenance=synthetic and a DESIGN label on its sources', () => {
    for (const c of SYNTHETIC_CANDIDATES) {
      expect(c.provenance).toBe('synthetic');
      for (const s of c.sources || []) {
        expect(s.provenance).toBe('synthetic');
        expect(s.label).toBe('DESIGN');
      }
    }
  });
});
