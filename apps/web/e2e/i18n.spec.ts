import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login } from './helpers';

const LOCALES = [
  { code: 'fr', dir: 'ltr', title: 'Connexion' },
  { code: 'en', dir: 'ltr', title: 'Sign in' },
  { code: 'ar', dir: 'rtl', title: 'تسجيل الدخول' },
  { code: 'so', dir: 'ltr', title: 'Gal' },
  { code: 'aa', dir: 'ltr', title: 'Culi' },
] as const;

test.describe('localized login page', () => {
  for (const l of LOCALES) {
    test(`${l.code}: lang, dir, translated title, no a11y violation @mobile`, async ({ page }) => {
      await page.goto(`/${l.code}/login`);
      await expect(page.locator('html')).toHaveAttribute('lang', l.code);
      await expect(page.locator('html')).toHaveAttribute('dir', l.dir);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(l.title);
      // Aucune clé brute affichée.
      await expect(page.locator('body')).not.toContainText(/\b(auth|common|errors|validation)\.[a-z]/);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });
  }

  test('redirects / to a locale', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(fr|en|ar|so|aa)\//);
  });

  test('Arabic layout is mirrored (form starts on the right)', async ({ page }) => {
    await page.goto('/ar/login');
    const input = page.locator('input[name="password"]');
    const box = await input.boundingBox();
    const label = await page.locator('label[for="password"]').boundingBox();
    expect(box && label).toBeTruthy();
    // En RTL, le libellé est aligné sur le bord droit du champ.
    expect(Math.abs(label!.x + label!.width - (box!.x + box!.width))).toBeLessThan(4);
    await page.screenshot({ path: 'test-results/screens/login-ar.png', fullPage: true });
  });
});

test.describe('language switching', () => {
  test('keeps the current page and query string, then remembers the choice', async ({ page }) => {
    await page.goto('/fr/reset-password?token=abc123');
    await page.getByTestId('language-switcher').selectOption('ar');
    await expect(page).toHaveURL(/\/ar\/reset-password\?token=abc123$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar\//);
  });

  test('user preference is applied at login and does not change tenant currency', async ({ page }) => {
    await login(page, 'manager@alpha.example', 'fr');
    await expect(page).toHaveURL(/\/ar\/dashboard/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('sample-money')).toContainText(/Fdj|DJF|ف\.ج/);
    // Contenu mixte : nom arabe isolé via <bdi>.
    await expect(page.locator('header bdi').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/screens/dashboard-ar.png', fullPage: true });
    await page.getByTestId('language-switcher').selectOption('en');
    await expect(page).toHaveURL(/\/en\/dashboard/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('sample-money')).toContainText(/DJF|Fdj/);
    // Restaure la préférence de démo pour que le test reste rejouable.
    await page.getByTestId('language-switcher').selectOption('ar');
    await expect(page).toHaveURL(/\/ar\/dashboard/);
  });
});
