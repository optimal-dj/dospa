import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth-card';
import { ForgotForm } from './forgot-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('auth.forgot.title') };
}

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <AuthCard title={t('auth.forgot.title')} description={t('auth.forgot.description')}>
      <ForgotForm locale={locale} />
    </AuthCard>
  );
}
