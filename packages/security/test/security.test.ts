import { generateSync } from 'otplib';
import { describe, expect, it } from 'vitest';
import {
  decrypt,
  encrypt,
  generateTotpSecret,
  generateToken,
  hashPassword,
  safeEqual,
  sha256,
  verifyPassword,
  verifyTotp,
} from '../src/index';

const KEY = Buffer.alloc(32, 9).toString('base64');

describe('password hashing', () => {
  it('uses argon2id and verifies only the right password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true);
    expect(await verifyPassword(hash, 'wrong password!!')).toBe(false);
    expect(await verifyPassword('not-a-hash', 'x')).toBe(false);
  });
});

describe('encryption', () => {
  it('round-trips and detects tampering', () => {
    const c = encrypt('secret value', KEY);
    expect(c).not.toContain('secret value');
    expect(decrypt(c, KEY)).toBe('secret value');
    const parts = c.split('.');
    parts[3] = Buffer.from('tampered').toString('base64url');
    expect(() => decrypt(parts.join('.'), KEY)).toThrow();
  });

  it('rejects keys that are not 32 bytes', () => {
    expect(() => encrypt('x', Buffer.alloc(16).toString('base64'))).toThrow();
  });
});

describe('tokens and TOTP', () => {
  it('generates unique opaque tokens and hashes them', () => {
    const a = generateToken();
    expect(a).not.toBe(generateToken());
    expect(sha256(a)).toHaveLength(64);
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
  });

  it('accepts the current TOTP code and rejects others', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, generateSync({ secret }))).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
    expect(verifyTotp(secret, 'abcdef')).toBe(false);
  });
});
