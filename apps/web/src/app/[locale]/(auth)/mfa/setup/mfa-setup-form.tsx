'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Field, FormError, SubmitButton } from '@/components/form';
import { mfaSetupAction, type FormState } from '@/server/actions/auth';

export function MfaSetupForm({
  locale,
  qrDataUrl,
  secret,
}: {
  locale: string;
  qrDataUrl: string;
  secret: string;
}) {
  const t = useTranslations();
  const [state, action] = useActionState<FormState, FormData>(mfaSetupAction, {});
  if (state.done && state.recoveryCodes) {
    return (
      <div className="space-y-4">
        <h2 className="font-semibold">{t('auth.mfaSetup.recoveryTitle')}</h2>
        <p className="text-sm text-slate-600">{t('auth.mfaSetup.recoveryDescription')}</p>
        <ul
          dir="ltr"
          className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-3 font-mono text-sm"
          data-testid="recovery-codes"
        >
          {state.recoveryCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Link
          href="/dashboard"
          className="block rounded-md bg-brand-600 px-4 py-2 text-center font-medium text-white"
        >
          {t('auth.mfaSetup.continue')}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <FormError code={state.error} />
      <img src={qrDataUrl} alt={t('auth.mfaSetup.qrAlt')} width={200} height={200} className="mx-auto" />
      <div>
        <p className="text-sm text-slate-600">{t('auth.mfaSetup.secretLabel')}</p>
        <code dir="ltr" className="block break-all rounded bg-slate-100 p-2 text-sm" data-testid="mfa-secret">
          {secret}
        </code>
      </div>
      <Field
        label={t('auth.mfa.code')}
        name="code"
        autoComplete="one-time-code"
        inputMode="numeric"
        dir="ltr"
      />
      <SubmitButton>{t('auth.mfaSetup.submit')}</SubmitButton>
    </form>
  );
}
