import 'server-only';
import { headers } from 'next/headers';

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

export async function requestMeta(): Promise<RequestMeta> {
  const h = await headers();
  // Derrière un reverse proxy de confiance uniquement (voir docs/SECURITY.md).
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return {
    ip: forwarded || h.get('x-real-ip') || null,
    userAgent: h.get('user-agent')?.slice(0, 300) ?? null,
  };
}
