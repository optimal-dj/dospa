import type { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { can } from '@dospa/domain';
import { isLocale } from '@dospa/i18n/config';
import { AppNav, type NavItem } from '@/components/app-nav';
import { LanguageSwitcher } from '@/components/language-switcher';
import { requireAuth } from '@/server/auth-context';
import { logoutAction } from '@/server/actions/auth';

export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const auth = await requireAuth(isLocale(locale) ? locale : 'fr');
  const t = await getTranslations();
  const items: NavItem[] = [
    { href: '/dashboard', labelKey: 'navigation.dashboard' },
    { href: '/account', labelKey: 'navigation.account' },
  ];
  if (can(auth, 'users:read')) items.push({ href: '/admin/users', labelKey: 'navigation.users' });
  if (can(auth, 'roles:read')) items.push({ href: '/admin/roles', labelKey: 'navigation.roles' });
  if (can(auth, 'audit:read')) items.push({ href: '/admin/audit', labelKey: 'navigation.audit' });

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-brand-900">{t('common.appName')}</span>
            <span
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              data-testid="tenant-name"
            >
              <bdi>{auth.tenant.name}</bdi>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            <span className="text-sm text-slate-700">
              <bdi>{auth.user.displayName}</bdi>
            </span>
            <form action={logoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
              >
                {t('navigation.logout')}
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <AppNav items={items} />
        </aside>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs text-slate-500">
        {t('common.legalNotice')}
      </footer>
    </div>
  );
}
