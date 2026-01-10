import { describe, expect, it } from 'vitest';

import { RpkiValidatorService } from './rpkiValidation';

describe('RpkiValidatorService (IPv4)', () => {
  it('returns valid when a VRP covers route prefix and ASN matches', async () => {
    const svc = new RpkiValidatorService();
    // @ts-expect-error test-only monkeypatch
    svc.getVrps = async () => [{ prefix: '1.2.0.0/16', maxLength: 24, asn: '15169' }];

    const r = await svc.validateRoute('1.2.3.0/24', 'AS15169');
    expect(r.state).toBe('valid');
  });

  it('returns invalid when VRPs cover but ASN does not match', async () => {
    const svc = new RpkiValidatorService();
    // @ts-expect-error test-only monkeypatch
    svc.getVrps = async () => [{ prefix: '1.2.0.0/16', maxLength: 24, asn: '15169' }];

    const r = await svc.validateRoute('1.2.3.0/24', 'AS13335');
    expect(r.state).toBe('invalid');
  });

  it('returns not_found when no VRP covers route prefix', async () => {
    const svc = new RpkiValidatorService();
    // @ts-expect-error test-only monkeypatch
    svc.getVrps = async () => [{ prefix: '10.0.0.0/8', maxLength: 24, asn: '64512' }];

    const r = await svc.validateRoute('1.2.3.0/24', '15169');
    expect(r.state).toBe('not_found');
  });
});

