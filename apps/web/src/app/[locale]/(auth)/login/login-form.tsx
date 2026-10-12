'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Field, FormError, SubmitButton } from '@/components/form';
import { loginAction, type FormState } from '@/server/actions/auth';

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <FormError code={state.error} />
      <Field
        label={t('auth.login.email')}
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        dir="ltr"
      />
      <Field
        label={t('auth.login.password')}
        name="password"
        type="password"
        autoComplete="current-password"
      />
      <SubmitButton>{t('auth.login.submit')}</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-brand-700 underline">
          {t('auth.login.forgot')}
        </Link>
      </p>
    </form>
  );
}
