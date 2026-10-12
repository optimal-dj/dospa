import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('protected pages redirect to login', async ({ page }) => {
  await page.goto('/fr/dashboard');
  await expect(page).toHaveURL(/\/fr\/login/);
});

test('wrong password shows a translated error', async ({ page }) => {
  await page.goto('/en/login');
  await page.locator('input[name="email"]').fill('salarie@alpha.example');
  await page.locator('input[name="password"]').fill('definitely-wrong');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('form [role="alert"]')).toHaveText('Incorrect email address or password.');
});

test('admin passes MFA, sees admin pages only for their tenant, and logs out', async ({ page }) => {
  await login(page, 'admin@alpha.example');
  await expect(page.getByTestId('tenant-name')).toContainText('Alpha');
  await page.goto('/fr/admin/users');
  const rows = page.getByTestId('user-row');
  await expect(rows.first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('beta.example');
  await page.goto('/fr/admin/audit');
  await expect(page.getByTestId('audit-row').first()).toBeVisible();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/fr\/login/);
  await page.goto('/fr/dashboard');
  await expect(page).toHaveURL(/\/fr\/login/);
});

test('an employee is refused admin pages server-side', async ({ page }) => {
  await login(page, 'salarie@alpha.example');
  await expect(page.getByRole('navigation').getByText('Utilisateurs')).toHaveCount(0);
  await page.goto('/aa/admin/users');
  await expect(page.getByTestId('forbidden')).toBeVisible();
});
