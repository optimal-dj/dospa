import { hash, verify } from '@node-rs/argon2';
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';

// Argon2id, paramètres OWASP (m=19 MiB, t=2, p=1).
const ARGON2_OPTIONS = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Hash factice pour égaliser le temps de réponse quand le compte n'existe pas. */
let dummyHash: Promise<string> | undefined;
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(await dummyHash, password);
  return false;
}

/** Jeton opaque (session, réinitialisation) : seule son empreinte SHA-256 est stockée. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Chiffrement AES-256-GCM (secrets MFA ; plus tard secrets des pointeuses, charges brutes).
function keyFrom(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be 32 bytes (base64)');
  return key;
}

export function encrypt(plaintext: string, base64Key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(base64Key), iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    data.toString('base64url'),
  ].join('.');
}

export function decrypt(payload: string, base64Key: string): string {
  const [version, iv, tag, data] = payload.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(base64Key), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

// TOTP (RFC 6238) pour le MFA.
export function generateTotpSecret(): string {
  return generateSecret();
}

export function totpUri(secret: string, accountName: string, issuer = 'DOSPA'): string {
  return generateURI({ secret, label: accountName, issuer });
}

export function verifyTotp(secret: string, code: string): boolean {
  try {
    return verifySync({ secret, token: code, epochTolerance: 30 }).valid;
  } catch {
    return false;
  }
}

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}
