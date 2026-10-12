'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { PASSWORD_MIN_LENGTH } from '@dospa/domain';
import { Link } from '@/i18n/navigation';
import { Field, FormError, SubmitButton } from '@/components/form';
import { resetPasswordAction, type FormState } from '@/server/actions/auth';

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations();
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  if (state.done) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {t('auth.reset.success')}
        </p>
        <Link href="/login" className="block text-center text-brand-700 underline">
          {t('auth.forgot.backToLogin')}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormError code={state.error} />
      <Field
        label={t('auth.reset.password')}
        name="password"
        type="password"
        autoComplete="new-password"
        hint={t('auth.reset.passwordHint', { min: String(PASSWORD_MIN_LENGTH) })}
      />
      <Field label={t('auth.reset.confirm')} name="confirm" type="password" autoComplete="new-password" />
      <SubmitButton>{t('auth.reset.submit')}</SubmitButton>
    </form>
  );
}
