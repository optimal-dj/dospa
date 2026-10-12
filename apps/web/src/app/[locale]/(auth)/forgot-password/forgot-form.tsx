'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Field, FormError, SubmitButton } from '@/components/form';
import { forgotPasswordAction, type FormState } from '@/server/actions/auth';

export function ForgotForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const [state, action] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <div className="space-y-4">
      {state.done ? (
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {t('auth.forgot.sent')}
        </p>
      ) : (
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
          <SubmitButton>{t('auth.forgot.submit')}</SubmitButton>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-brand-700 underline">
          {t('auth.forgot.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
