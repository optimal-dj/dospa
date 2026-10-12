import type { Page } from '@playwright/test';
import { generateSync } from 'otplib';

export const DEMO_PASSWORD = process.env['SEED_DEMO_PASSWORD'] ?? '';
export const DEMO_TOTP_SECRET = process.env['SEED_DEMO_TOTP_SECRET'] ?? '';

export async function login(page: Page, email: string, locale = 'fr'): Promise<void> {
  await page.goto(`/${locale}/login`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|mfa)/);
  if (page.url().includes('/mfa')) {
    await page.locator('input[name="code"]').fill(generateSync({ secret: DEMO_TOTP_SECRET }));
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/);
  }
}
