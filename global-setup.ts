/**
 * global-setup.ts — runs ONCE before the entire suite.
 *
 * Probes both the storefront and the GraphQL Shop API so a network
 * outage is caught at suite start instead of as 200 individual
 * connection timeouts.
 */
import { request } from '@playwright/test';

const STOREFRONT = 'https://storefront.demo.vendure.io/';
const SHOP_API = 'https://demo.vendure.io/shop-api';
const ADMIN_API = 'https://demo.vendure.io/admin-api';

async function probe(url: string, label: string): Promise<boolean> {
  try {
    const ctx = await request.newContext();
    const res = await ctx.get(url, { timeout: 10_000 });
    await ctx.dispose();
    console.log(`[global-setup] ${label}: HTTP ${res.status()}`);
    return res.ok();
  } catch (err) {
    console.warn(`[global-setup] ${label} probe failed: ${(err as Error).message}`);
    return false;
  }
}

export default async function () {
  const targets: Array<[string, string]> = [
    [STOREFRONT, 'Storefront'],
    [SHOP_API, 'Shop GraphQL'],
    [ADMIN_API, 'Admin GraphQL'],
  ];
  for (const [url, label] of targets) {
    const ok = await probe(url, label);
    if (!ok) {
      console.warn(`[global-setup] ${label} is unhealthy; tests may self-skip.`);
    }
  }
}
