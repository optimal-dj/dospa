import { NAMESPACES, SOURCE_LOCALE, type Locale } from './config';

export type MessageTree = { [key: string]: string | MessageTree };

async function loadLocale(locale: Locale): Promise<MessageTree> {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        const mod = (await import(`../messages/${locale}/${ns}.json`)) as { default: MessageTree };
        return [ns, mod.default] as const;
      } catch {
        return [ns, {}] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

export function flatten(tree: MessageTree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

/** Fusion profonde : les clés absentes de `target` sont prises dans `fallback` (langue source). */
export function mergeWithFallback(fallback: MessageTree, target: MessageTree): MessageTree {
  const out: MessageTree = {};
  for (const [k, v] of Object.entries(fallback)) {
    const t = target[k];
    if (typeof v === 'string') out[k] = typeof t === 'string' && t.length > 0 ? t : v;
    else out[k] = mergeWithFallback(v, typeof t === 'object' && t ? t : {});
  }
  return out;
}

const cache = new Map<Locale, { messages: MessageTree; missing: string[] }>();

/**
 * Messages d'une locale, complétés par la langue source pour les clés manquantes.
 * Les clés manquantes sont renvoyées pour journalisation ; une clé brute n'est jamais affichée.
 */
export async function loadMessages(locale: Locale): Promise<{ messages: MessageTree; missing: string[] }> {
  const cached = cache.get(locale);
  if (cached && process.env['NODE_ENV'] === 'production') return cached;
  const source = await loadLocale(SOURCE_LOCALE);
  if (locale === SOURCE_LOCALE) return { messages: source, missing: [] };
  const target = await loadLocale(locale);
  const targetKeys = new Set(Object.keys(flatten(target)));
  const missing = Object.keys(flatten(source)).filter((k) => !targetKeys.has(k));
  const result = { messages: mergeWithFallback(source, target), missing };
  cache.set(locale, result);
  return result;
}
