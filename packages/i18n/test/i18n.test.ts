import { mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkTranslations } from '../src/checker';
import { direction, LOCALES, NAMESPACES } from '../src/config';
import { formatDate, formatMoney, formatNumber, minorToDecimalString } from '../src/format';
import { loadMessages, mergeWithFallback } from '../src/messages';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const messagesDir = fileURLToPath(new URL('../messages', import.meta.url));
const qualityFile = fileURLToPath(new URL('../quality.json', import.meta.url));

function copyFixture(): { dir: string; quality: string } {
  const dir = mkdtempSync(join(tmpdir(), 'dospa-i18n-'));
  cpSync(messagesDir, join(dir, 'messages'), { recursive: true });
  cpSync(qualityFile, join(dir, 'quality.json'));
  return { dir: join(dir, 'messages'), quality: join(dir, 'quality.json') };
}

describe('translation resources', () => {
  it('pass the full check (keys, ICU syntax, variables, usage, quality registry)', () => {
    const { issues, keyCount } = checkTranslations({
      messagesDir,
      qualityFile,
      sourceDirs: [`${root}apps/web/src`, `${root}packages/domain/src`],
    });
    expect(issues).toEqual([]);
    expect(keyCount).toBeGreaterThan(50);
  });

  it('detects a missing key and a variable mismatch', () => {
    const fx = copyFixture();
    const file = join(fx.dir, 'so', 'auth.json');
    writeFileSync(file, JSON.stringify({ reset: { passwordHint: 'Ugu yaraan {count} xaraf.' } }));
    const { issues } = checkTranslations({ messagesDir: fx.dir, qualityFile: fx.quality, sourceDirs: [] });
    expect(
      issues.some((i) => i.kind === 'missing_key' && i.locale === 'so' && i.key === 'auth.login.title'),
    ).toBe(true);
    expect(
      issues.some(
        (i) => i.kind === 'variable_mismatch' && i.locale === 'so' && i.key === 'auth.reset.passwordHint',
      ),
    ).toBe(true);
  });

  it('detects invalid ICU syntax and forbidden number arguments', () => {
    const fx = copyFixture();
    writeFileSync(
      join(fx.dir, 'fr', 'navigation.json'),
      JSON.stringify({ dashboard: 'Total {n, number}', logout: 'Broken {' }),
    );
    const { issues } = checkTranslations({ messagesDir: fx.dir, qualityFile: fx.quality, sourceDirs: [] });
    expect(issues.some((i) => i.kind === 'forbidden_argument' && i.key === 'navigation.dashboard')).toBe(
      true,
    );
    expect(issues.some((i) => i.kind === 'invalid_icu' && i.key === 'navigation.logout')).toBe(true);
  });

  it('detects unknown keys referenced in code', () => {
    const fx = copyFixture();
    const src = mkdtempSync(join(tmpdir(), 'dospa-src-'));
    mkdirSync(join(src, 'a'));
    writeFileSync(join(src, 'a', 'x.tsx'), "t('auth.login.doesNotExist');");
    const { issues } = checkTranslations({ messagesDir: fx.dir, qualityFile: fx.quality, sourceDirs: [src] });
    expect(issues.some((i) => i.kind === 'unknown_key_in_code' && i.key === 'auth.login.doesNotExist')).toBe(
      true,
    );
  });

  it('falls back to French for missing keys instead of showing raw keys', () => {
    const merged = mergeWithFallback({ a: { b: 'Bonjour', c: 'Salut' } }, { a: { b: 'Hello', c: '' } });
    expect(merged).toEqual({ a: { b: 'Hello', c: 'Salut' } });
  });

  it('loads every locale with all namespaces and no missing key', async () => {
    for (const locale of LOCALES) {
      const { messages, missing } = await loadMessages(locale);
      expect(missing).toEqual([]);
      expect(Object.keys(messages).sort()).toEqual([...NAMESPACES].sort());
    }
  });
});

describe('direction', () => {
  it('is rtl for Arabic only', () => {
    expect(LOCALES.map((l) => [l, direction(l)])).toEqual([
      ['fr', 'ltr'],
      ['en', 'ltr'],
      ['ar', 'rtl'],
      ['so', 'ltr'],
      ['aa', 'ltr'],
    ]);
  });
});

describe('formatting (display only)', () => {
  const tz = 'Africa/Djibouti';
  const date = new Date('2026-07-01T22:30:00Z'); // 2 juillet 01:30 à Djibouti (UTC+3)

  it('converts minor units exactly, without floats', () => {
    expect(minorToDecimalString(15_000_000n, 'DJF')).toBe('15000000');
    expect(minorToDecimalString(123_456_789_012_345_678n, 'USD')).toBe('1234567890123456.78');
    expect(minorToDecimalString(-5n, 'EUR')).toBe('-0.05');
  });

  it('formats DJF without decimals in every locale', () => {
    for (const l of LOCALES) {
      const s = formatMoney(150_000n, 'DJF', l);
      expect(s).toMatch(/150[\s\u202f\u00a0.,]?000/);
      expect(s).not.toMatch(/[.,]00\b/);
    }
  });

  it('uses Latin digits for Arabic by default and Arabic-Indic digits on request', () => {
    expect(formatNumber(1234, 'ar')).toMatch(/1.?234/);
    expect(formatNumber(1234, 'ar', { arabicDigits: 'arab' })).toMatch(/[١٢٣٤]/);
  });

  it('formats dates in the tenant time zone', () => {
    expect(formatDate(date, 'fr', tz)).toContain('2 juillet 2026');
    expect(formatDate(date, 'en', tz)).toMatch(/2 July 2026|July 2, 2026/);
  });

  it('uses explicit numeric formats for Afar (no CLDR data)', () => {
    expect(formatDate(date, 'aa', tz)).toBe('02/07/2026');
    expect(formatNumber(1234567, 'aa')).toBe(formatNumber(1234567, 'fr'));
  });
});
