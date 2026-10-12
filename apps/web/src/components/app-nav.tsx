'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

export interface NavItem {
  href: string;
  labelKey: string;
}

export function AppNav({ items }: { items: NavItem[] }) {
  const t = useTranslations();
  const pathname = usePathname();
  return (
    <nav aria-label={t('navigation.mainMenu')}>
      <ul className="flex flex-row gap-1 overflow-x-auto md:flex-col">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                  active ? 'bg-brand-100 font-medium text-brand-900' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
