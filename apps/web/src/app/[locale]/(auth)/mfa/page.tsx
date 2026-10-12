import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@dospa/i18n/config';
import { AuthCard } from '@/components/auth-card';
import { redirect } from '@/i18n/navigation';
import { getAuth } from '@/server/auth-context';
import { MfaForm } from './mfa-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('auth.mfa.title') };
}

export default async function MfaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = isLocale(locale) ? locale : 'fr';
  const auth = await getAuth();
  if (!auth) return redirect({ href: '/login', locale: loc });
  if (auth.next === 'app') return redirect({ href: '/dashboard', locale: loc });
  if (auth.next === 'mfa_setup') return redirect({ href: '/mfa/setup', locale: loc });
  const t = await getTranslations();
  return (
    <AuthCard title={t('auth.mfa.title')} description={t('auth.mfa.description')}>
      <MfaForm locale={locale} />
    </AuthCard>
  );
}
