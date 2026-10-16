import { Page, expect } from '@playwright/test';

/**
 * Helpers shared across the test files.
 */

/** Wait for the URL to contain a substring (regex-escaped). */
export async function expectUrlContains(page: Page, fragment: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(fragment.replace(/\./g, '\\.')));
}

/** Track every `console.error` and uncaught page error. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

/** Fail the test if any console errors were captured (filtering third-party noise). */
export async function assertNoConsoleErrors(errors: string[]): Promise<void> {
  const appErrors = errors.filter(
    (e) =>
      !e.includes('vendure.io') &&
      !e.includes('favicon') &&
      !e.toLowerCase().includes('net::err_blocked_by_client') &&
      !e.toLowerCase().includes('failed to load resource'),
  );
  expect(appErrors, `Unexpected client-side errors:\n${appErrors.join('\n')}`).toHaveLength(0);
}

/** Generate a unique email for account registration tests. */
export function uniqueEmail(prefix = 'qa'): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1_000_000);
  return `${prefix}-${ts}-${rand}@example.com`;
}

/** Sleep helper — used sparingly to give the storefront a beat to settle. */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Format a number as USD currency string (no fractional cents). */
export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Strip currency symbols and parse to a number. */
export function parsePrice(text: string): number {
  return Number(text.replace(/[^0-9.]/g, ''));
}
