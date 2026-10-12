'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@dospa/domain';

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  const t = useTranslations();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? t('common.loading') : children}
    </button>
  );
}

/** Affiche un code d'erreur (errors.* / validation.*) traduit ; jamais un message technique. */
export function FormError({ code }: { code?: string | undefined }) {
  const t = useTranslations();
  if (!code) return null;
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {t(code, { min: String(PASSWORD_MIN_LENGTH), max: String(PASSWORD_MAX_LENGTH) })}
    </p>
  );
}

export function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  required = true,
  hint,
  inputMode,
  defaultValue,
  dir,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  inputMode?: 'numeric' | 'email' | 'text';
  defaultValue?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        defaultValue={defaultValue}
        aria-describedby={hintId}
        dir={dir}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-start"
      />
      {hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
