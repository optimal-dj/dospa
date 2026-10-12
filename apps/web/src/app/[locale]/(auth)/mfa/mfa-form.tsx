'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Field, FormError, SubmitButton } from '@/components/form';
import { mfaAction, type FormState } from '@/server/actions/auth';

export function MfaForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const [state, action] = useActionState<FormState, FormData>(mfaAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <FormError code={state.error} />
      <Field
        label={t('auth.mfa.code')}
        name="code"
        autoComplete="one-time-code"
        inputMode="numeric"
        dir="ltr"
        hint={t('auth.mfa.recoveryHint')}
      />
      <SubmitButton>{t('auth.mfa.submit')}</SubmitButton>
    </form>
  );
}
