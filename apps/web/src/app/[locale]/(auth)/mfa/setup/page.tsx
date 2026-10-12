import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@dospa/i18n/config';
import { AuthCard } from '@/components/auth-card';
import { redirect } from '@/i18n/navigation';
import { getAuth } from '@/server/auth-context';
import { startMfaSetup } from '@/server/auth-service';
import { MfaSetupForm } from './mfa-setup-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('auth.mfaSetup.title') };
}

export default async function MfaSetupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = isLocale(locale) ? locale : 'fr';
  const auth = await getAuth();
  if (!auth) return redirect({ href: '/login', locale: loc });
  if (auth.next === 'mfa') return redirect({ href: '/mfa', locale: loc });
  const t = await getTranslations();
  if (auth.user.mfaEnabled) return redirect({ href: '/dashboard', locale: loc });
  const setup = await startMfaSetup(auth.session);
  if (!setup.ok) return redirect({ href: '/dashboard', locale: loc });
  const qr = await QRCode.toDataURL(setup.value.uri, { margin: 1, width: 200 });
  return (
    <AuthCard title={t('auth.mfaSetup.title')} description={t('auth.mfaSetup.description')}>
      <MfaSetupForm locale={locale} qrDataUrl={qr} secret={setup.value.secret} />
    </AuthCard>
  );
}
