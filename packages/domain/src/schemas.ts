import { z } from 'zod';

/** Les messages de validation sont des clés i18n (namespace `validation`), traduites côté interface. */
export const LOCALE_CODES = ['fr', 'en', 'ar', 'so', 'aa'] as const;
export const localeSchema = z.enum(LOCALE_CODES, { error: 'validation.locale_invalid' });

export const emailSchema = z
  .string({ error: 'validation.required' })
  .trim()
  .toLowerCase()
  .min(1, { error: 'validation.required' })
  .max(254, { error: 'validation.email_invalid' })
  .pipe(z.email({ error: 'validation.email_invalid' }));

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const newPasswordSchema = z
  .string({ error: 'validation.required' })
  .min(PASSWORD_MIN_LENGTH, { error: 'validation.password_too_short' })
  .max(PASSWORD_MAX_LENGTH, { error: 'validation.password_too_long' });

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' })
    .max(PASSWORD_MAX_LENGTH),
});

export const totpCodeSchema = z
  .string({ error: 'validation.required' })
  .trim()
  .regex(/^(\d{6}|[a-z0-9]{4}-[a-z0-9]{4})$/i, { error: 'validation.mfa_code_invalid' });

export const passwordResetRequestSchema = z.object({ email: emailSchema });

export const passwordResetSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { error: 'validation.password_mismatch', path: ['confirm'] });

export const updateLocaleSchema = z.object({ locale: localeSchema });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
