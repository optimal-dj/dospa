import 'server-only';
import { z } from 'zod';

const schema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  APP_ENCRYPTION_KEY: z.string().min(40),
  SESSION_IDLE_MINUTES: z.coerce.number().int().positive().default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().positive().default(12),
  MAIL_TRANSPORT: z.enum(['smtp', 'log']).default('log'),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('DOSPA <no-reply@dospa.local>'),
});

export type ServerEnv = z.infer<typeof schema>;
let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= schema.parse(process.env);
  return cached;
}

export function isSecureCookie(): boolean {
  return serverEnv().APP_URL.startsWith('https://');
}
