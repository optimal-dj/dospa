/**
 * Vérification des ressources de traduction (utilisé par scripts/check.ts et les tests).
 * Détecte : JSON invalide, ICU invalide, clés manquantes ou en trop, variables incohérentes,
 * arguments ICU number/date/time interdits (le formatage passe par @dospa/i18n/format),
 * clés inutilisées ou inconnues dans le code, registre qualité incomplet.
 */
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LOCALES, NAMESPACES, SOURCE_LOCALE } from './config';
import { flatten, type MessageTree } from './messages';

export const QUALITY_STATUSES = ['source', 'a_reviser', 'revise', 'valide'] as const;

export interface CheckIssue {
  kind:
    | 'invalid_json'
    | 'invalid_icu'
    | 'missing_key'
    | 'extra_key'
    | 'variable_mismatch'
    | 'forbidden_argument'
    | 'unused_key'
    | 'unknown_key_in_code'
    | 'quality_registry';
  locale?: string;
  key?: string;
  file?: string;
  detail?: string;
}

function argumentsOf(elements: MessageFormatElement[], acc = new Map<string, string>()): Map<string, string> {
  for (const el of elements) {
    switch (el.type) {
      case TYPE.argument:
        acc.set(el.value, 'string');
        break;
      case TYPE.number:
        acc.set(el.value, 'number');
        break;
      case TYPE.date:
        acc.set(el.value, 'date');
        break;
      case TYPE.time:
        acc.set(el.value, 'time');
        break;
      case TYPE.plural:
        acc.set(el.value, 'plural');
        Object.values(el.options).forEach((o) => argumentsOf(o.value, acc));
        break;
      case TYPE.select:
        acc.set(el.value, 'select');
        Object.values(el.options).forEach((o) => argumentsOf(o.value, acc));
        break;
      case TYPE.tag:
        acc.set(`<${el.value}>`, 'tag');
        argumentsOf(el.children, acc);
        break;
      default:
        break;
    }
  }
  return acc;
}

function signature(args: Map<string, string>): string {
  return [...args.entries()]
    .map(([k, v]) => `${k}:${v}`)
    .sort()
    .join(',');
}

export interface CheckOptions {
  messagesDir: string;
  qualityFile: string;
  sourceDirs: string[];
}

export function loadTree(file: string): MessageTree {
  return JSON.parse(readFileSync(file, 'utf8')) as MessageTree;
}

function listSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'generated' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listSourceFiles(p));
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

export function checkTranslations(opts: CheckOptions): { issues: CheckIssue[]; keyCount: number } {
  const issues: CheckIssue[] = [];
  const flat: Record<string, Record<string, string>> = {};

  for (const locale of LOCALES) {
    flat[locale] = {};
    for (const ns of NAMESPACES) {
      const file = join(opts.messagesDir, locale, `${ns}.json`);
      if (!existsSync(file)) {
        issues.push({
          kind: 'invalid_json',
          locale,
          file: relative(opts.messagesDir, file),
          detail: 'file missing',
        });
        continue;
      }
      try {
        const tree = loadTree(file);
        Object.assign(flat[locale], flatten({ [ns]: tree }));
      } catch (e) {
        issues.push({
          kind: 'invalid_json',
          locale,
          file: relative(opts.messagesDir, file),
          detail: String(e),
        });
      }
    }
  }

  const source = flat[SOURCE_LOCALE] ?? {};
  const sourceArgs = new Map<string, string>();
  for (const [key, msg] of Object.entries(source)) {
    try {
      const args = argumentsOf(parse(msg));
      for (const [name, type] of args) {
        if (type === 'number' || type === 'date' || type === 'time') {
          issues.push({ kind: 'forbidden_argument', locale: SOURCE_LOCALE, key, detail: `${name}:${type}` });
        }
      }
      sourceArgs.set(key, signature(args));
    } catch (e) {
      issues.push({ kind: 'invalid_icu', locale: SOURCE_LOCALE, key, detail: String(e) });
    }
  }

  for (const locale of LOCALES) {
    if (locale === SOURCE_LOCALE) continue;
    const msgs = flat[locale] ?? {};
    for (const key of Object.keys(source)) {
      if (!(key in msgs)) issues.push({ kind: 'missing_key', locale, key });
    }
    for (const [key, msg] of Object.entries(msgs)) {
      if (!(key in source)) {
        issues.push({ kind: 'extra_key', locale, key });
        continue;
      }
      try {
        const sig = signature(argumentsOf(parse(msg)));
        if (sig !== sourceArgs.get(key)) {
          issues.push({ kind: 'variable_mismatch', locale, key, detail: `${sig} ≠ ${sourceArgs.get(key)}` });
        }
      } catch (e) {
        issues.push({ kind: 'invalid_icu', locale, key, detail: String(e) });
      }
    }
  }

  // Usage dans le code : toute chaîne littérale égale à une clé compte comme utilisation.
  const keyPattern = new RegExp(`['"\`]((?:${NAMESPACES.join('|')})\\.[A-Za-z0-9_.]+)['"\`]`, 'g');
  const prefixPattern = new RegExp(
    `\`((?:${NAMESPACES.join('|')})\\.[A-Za-z0-9_.]*[A-Za-z0-9_])\\.\\$\\{`,
    'g',
  );
  const used = new Set<string>();
  for (const dir of opts.sourceDirs) {
    for (const file of listSourceFiles(dir)) {
      const content = readFileSync(file, 'utf8');
      // Clés dynamiques : `ns.prefix.${…}` couvre toutes les clés sous ce préfixe.
      for (const m of content.matchAll(prefixPattern)) used.add(m[1]!);
      for (const m of content.matchAll(keyPattern)) {
        const key = m[1]!;
        used.add(key);
        const isPrefix = Object.keys(source).some((k) => k.startsWith(`${key}.`));
        if (!(key in source) && !isPrefix) {
          issues.push({ kind: 'unknown_key_in_code', key, file: relative(process.cwd(), file) });
        }
      }
    }
  }
  for (const key of Object.keys(source)) {
    const coveredByPrefix = [...used].some((u) => key.startsWith(`${u}.`));
    if (!used.has(key) && !coveredByPrefix) issues.push({ kind: 'unused_key', key });
  }

  // Registre qualité : chaque locale × namespace a un statut connu.
  try {
    const quality = JSON.parse(readFileSync(opts.qualityFile, 'utf8')) as {
      locales: Record<string, Record<string, { status: string }>>;
    };
    for (const locale of LOCALES) {
      for (const ns of NAMESPACES) {
        const status = quality.locales?.[locale]?.[ns]?.status;
        if (!status || !(QUALITY_STATUSES as readonly string[]).includes(status)) {
          issues.push({ kind: 'quality_registry', locale, key: ns, detail: `status=${String(status)}` });
        }
      }
    }
  } catch (e) {
    issues.push({ kind: 'quality_registry', detail: String(e) });
  }

  return { issues, keyCount: Object.keys(source).length };
}
