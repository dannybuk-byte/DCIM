import { db } from '../db/database';
import type { RpkiCacheRecord, RpkiVrp } from '../db/database';
import { fetchWithRateLimit } from '../utils/rateLimitedFetch';

type IpVersion = 4 | 6;

export type RpkiValidationState = 'valid' | 'invalid' | 'not_found' | 'unsupported' | 'error';

export interface RpkiValidationResult {
  state: RpkiValidationState;
  reason?: string;
  matchedVrps?: Array<{ prefix: string; maxLength: number; asn: string }>;
}

interface ParsedPrefixV4 {
  version: 4;
  addr: number; // 32-bit unsigned
  length: number;
}

function parseIpv4(s: string): number | null {
  const parts = s.split('.');
  if (parts.length !== 4) return null;
  let out = 0;
  for (const p of parts) {
    if (p.length === 0) return null;
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    out = (out << 8) | n;
  }
  return out >>> 0;
}

function parsePrefix(prefix: string): { version: IpVersion; parsed: ParsedPrefixV4 | null } {
  const [addrStr, lenStr] = prefix.split('/');
  if (!addrStr || !lenStr) return { version: 6, parsed: null };
  const len = Number(lenStr);
  if (!Number.isInteger(len)) return { version: 6, parsed: null };

  const v4 = parseIpv4(addrStr);
  if (v4 !== null) {
    if (len < 0 || len > 32) return { version: 4, parsed: null };
    return { version: 4, parsed: { version: 4, addr: v4, length: len } };
  }

  // IPv6 not supported in this first pass
  return { version: 6, parsed: null };
}

function mask32(len: number): number {
  if (len <= 0) return 0;
  if (len >= 32) return 0xffffffff >>> 0;
  return (0xffffffff << (32 - len)) >>> 0;
}

function networkOf(addr: number, len: number): number {
  return (addr & mask32(len)) >>> 0;
}

function containsPrefixV4(container: ParsedPrefixV4, child: ParsedPrefixV4): boolean {
  if (container.length > child.length) return false;
  const mask = mask32(container.length);
  return ((container.addr & mask) >>> 0) === ((child.addr & mask) >>> 0);
}

interface VrpV4 {
  prefix: ParsedPrefixV4;
  maxLength: number;
  asn: string;
}

class V4TrieNode {
  left: V4TrieNode | null = null;
  right: V4TrieNode | null = null;
  vrps: VrpV4[] = [];
}

class V4VrpTrie {
  private root = new V4TrieNode();

  insert(vrp: VrpV4) {
    let node = this.root;
    const { addr, length } = vrp.prefix;
    for (let i = 0; i < length; i++) {
      const bit = (addr >>> (31 - i)) & 1;
      if (bit === 0) {
        node.left ??= new V4TrieNode();
        node = node.left;
      } else {
        node.right ??= new V4TrieNode();
        node = node.right;
      }
    }
    node.vrps.push(vrp);
  }

  /**
   * Returns VRPs that could cover `routePrefix` (i.e., all VRPs whose prefix is a prefix of the route prefix).
   */
  candidates(routePrefix: ParsedPrefixV4): VrpV4[] {
    const out: VrpV4[] = [];
    let node: V4TrieNode | null = this.root;

    // root has no vrps by design
    for (let i = 0; i < routePrefix.length && node; i++) {
      if (node.vrps.length) out.push(...node.vrps);
      const bit = (routePrefix.addr >>> (31 - i)) & 1;
      node = bit === 0 ? node.left : node.right;
    }
    if (node?.vrps.length) out.push(...node.vrps);
    return out;
  }
}

function normalizeAsn(asn: string): string {
  return asn.replace(/^AS/i, '').trim();
}

function parseVrpsFromUnknownJson(json: unknown): RpkiVrp[] {
  // Accept a few common shapes; fall back to empty.
  if (!json || typeof json !== 'object') return [];
  const obj = json as Record<string, unknown>;

  const tryArrays: unknown[] = [];
  if (Array.isArray(obj.vrps)) tryArrays.push(obj.vrps);
  if (Array.isArray(obj.roas)) tryArrays.push(obj.roas);
  if (Array.isArray(obj.validated_roas)) tryArrays.push(obj.validated_roas);
  if (obj.data && typeof obj.data === 'object') {
    const d = obj.data as Record<string, unknown>;
    if (Array.isArray(d.roas)) tryArrays.push(d.roas);
    if (Array.isArray(d.vrps)) tryArrays.push(d.vrps);
  }

  for (const candidate of tryArrays) {
    if (!Array.isArray(candidate)) continue;
    const out: RpkiVrp[] = [];
    for (const row of candidate) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;

      const prefix = typeof r.prefix === 'string' ? r.prefix : typeof r.route === 'string' ? r.route : null;
      const maxLength =
        typeof r.maxLength === 'number'
          ? r.maxLength
          : typeof r.max_len === 'number'
            ? r.max_len
            : typeof r.max_length === 'number'
              ? r.max_length
              : null;
      const asn =
        typeof r.asn === 'string'
          ? r.asn
          : typeof r.asn === 'number'
            ? String(r.asn)
            : typeof r.originAsn === 'string'
              ? r.originAsn
              : typeof r.asn0 === 'string'
                ? r.asn0
                : null;

      if (!prefix || maxLength === null || !asn) continue;
      out.push({ prefix, maxLength, asn: normalizeAsn(asn), ta: typeof r.ta === 'string' ? r.ta : undefined });
    }
    if (out.length > 0) return out;
  }

  return [];
}

export class RpkiValidatorService {
  private cacheKey = 'cloudflare_rpki_vrps';
  private endpoint = 'https://rpki.cloudflare.com/rpki.json';
  private maxAgeMs = 20 * 60 * 1000; // ~20 minutes
  private v4TrieCache: { builtAt: number; trie: V4VrpTrie } | null = null;

  async getVrps(): Promise<RpkiVrp[]> {
    const existing = await db.rpkiCache.get(this.cacheKey);
    if (existing && Date.now() - existing.fetchedAt < this.maxAgeMs) return existing.vrps;

    // Fetch from network (best-effort)
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (existing?.etag) headers['If-None-Match'] = existing.etag;

      const res = await fetchWithRateLimit('rpki', this.endpoint, { headers });
      if (res.status === 304 && existing) {
        const updated: RpkiCacheRecord = { ...existing, fetchedAt: Date.now() };
        await db.rpkiCache.put(updated);
        return updated.vrps;
      }

      if (!res.ok) throw new Error(`RPKI fetch failed (${res.status})`);
      const json = (await res.json()) as unknown;
      const vrps = parseVrpsFromUnknownJson(json);

      const etag = res.headers.get('etag') || undefined;
      const record: RpkiCacheRecord = { key: this.cacheKey, fetchedAt: Date.now(), etag, vrps };
      await db.rpkiCache.put(record);

      // Invalidate in-memory trie
      this.v4TrieCache = null;

      return vrps;
    } catch (e) {
      // Fall back to any cached VRPs, even if stale
      if (existing?.vrps?.length) return existing.vrps;
      return [];
    }
  }

  private async getOrBuildV4Trie(): Promise<V4VrpTrie | null> {
    if (this.v4TrieCache && Date.now() - this.v4TrieCache.builtAt < this.maxAgeMs) return this.v4TrieCache.trie;

    const vrps = await this.getVrps();
    const trie = new V4VrpTrie();
    let count = 0;

    for (const v of vrps) {
      const parsed = parsePrefix(v.prefix);
      if (parsed.version !== 4 || !parsed.parsed) continue;
      if (!Number.isInteger(v.maxLength) || v.maxLength < parsed.parsed.length || v.maxLength > 32) continue;
      trie.insert({ prefix: { ...parsed.parsed }, maxLength: v.maxLength, asn: normalizeAsn(v.asn) });
      count++;
    }

    if (count === 0) return null;
    this.v4TrieCache = { builtAt: Date.now(), trie };
    return trie;
  }

  async validateRoute(prefix: string, originAsn: string): Promise<RpkiValidationResult> {
    const parsed = parsePrefix(prefix);
    const asn = normalizeAsn(originAsn);

    if (parsed.version !== 4) {
      return { state: 'unsupported', reason: 'IPv6 validation not implemented yet' };
    }
    if (!parsed.parsed) return { state: 'error', reason: 'Invalid prefix format' };

    const trie = await this.getOrBuildV4Trie();
    if (!trie) return { state: 'error', reason: 'No VRPs available' };

    const candidates = trie.candidates(parsed.parsed);
    if (candidates.length === 0) return { state: 'not_found' };

    // Filter to VRPs that actually cover the route (prefix containment + maxLength)
    const covering = candidates.filter((v) => containsPrefixV4(v.prefix, parsed.parsed!) && parsed.parsed!.length <= v.maxLength);
    if (covering.length === 0) return { state: 'not_found' };

    const matching = covering.filter((v) => v.asn === asn);
    if (matching.length > 0) {
      return {
        state: 'valid',
        matchedVrps: matching.slice(0, 10).map((v) => ({ prefix: `${ipv4ToString(networkOf(v.prefix.addr, v.prefix.length))}/${v.prefix.length}`, maxLength: v.maxLength, asn: v.asn })),
      };
    }

    return {
      state: 'invalid',
      reason: 'VRPs cover prefix but ASN does not match',
      matchedVrps: covering.slice(0, 10).map((v) => ({ prefix: `${ipv4ToString(networkOf(v.prefix.addr, v.prefix.length))}/${v.prefix.length}`, maxLength: v.maxLength, asn: v.asn })),
    };
  }
}

function ipv4ToString(addr: number): string {
  return [
    (addr >>> 24) & 255,
    (addr >>> 16) & 255,
    (addr >>> 8) & 255,
    addr & 255,
  ].join('.');
}

export const rpkiValidator = new RpkiValidatorService();

