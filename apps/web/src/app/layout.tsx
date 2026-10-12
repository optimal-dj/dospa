import type { ReactNode } from 'react';

// Le document HTML (lang, dir) est rendu par app/[locale]/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
