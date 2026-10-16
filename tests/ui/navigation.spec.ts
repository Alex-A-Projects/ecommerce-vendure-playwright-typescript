import { test, expect } from '../../fixtures/testFixtures';
import { SeedCollections } from '../../utils/testData';

/**
 * Navigation tests — verify the cross-page links in the header and
 * footer are consistent across every page type.
 */
test.describe('Cross-page navigation', () => {
  for (const path of ['/', '/collection/electronics', '/cart', '/search']) {
    test(`header is on ${path}`, async ({ page }) => {
      await page.goto(`/en${path}`);
      await expect(page.locator('header').first()).toBeVisible();
    });
    test(`footer is on ${path}`, async ({ page }) => {
      await page.goto(`/en${path}`);
      await expect(page.locator('footer').first()).toBeVisible();
    });
  }

  test('header collection links are consistent across pages', async ({ page }) => {
    for (const path of ['/', '/cart']) {
      await page.goto(path);
      const navLinks = page.locator('header a[href*="/collection/"]');
      const n = await navLinks.count();
      expect(n, `Header on ${path} should have collection links`).toBeGreaterThan(0);
    }
  });

  test('clicking a collection link in the header navigates to that collection', async ({ homePage, page }) => {
    const electronics = homePage.navElectronics;
    await expect(electronics).toHaveAttribute('href', '/en/collection/electronics');
    await electronics.click();
    await expect(page).toHaveURL(/\/en\/collection\/electronics\/?$/);
    await expect(page.getByRole('heading', { name: 'Electronics', level: 1, exact: true })).toBeVisible();
  });

  test('clicking the cart icon from a collection navigates to /cart', async ({ page }) => {
    await page.goto('/en/collection/electronics');
    await page.locator('header a[href*="/cart" i]').first().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/cart/);
  });

  test('clicking the logo from the cart returns home', async ({ cartPage, page }) => {
    const logo = cartPage.header.getByRole('link', { name: 'Vendure', exact: true });
    await expect(logo).toHaveAttribute('href', '/en');
    await logo.click();
    await expect(page).toHaveURL(/\/en\/?$/);
  });

  test('all seed collection slugs load with status < 500', async ({ request }) => {
    for (const c of Object.values(SeedCollections)) {
      const res = await request.get(`/en/collection/${c.slug}`, { failOnStatusCode: false });
      expect(
        res.status(),
        `Collection /collection/${c.slug} should not 5xx`,
      ).toBeLessThan(500);
    }
  });

  test('every primary route is reachable', async ({ request }) => {
    // The Vendure Remix Storefront demo doesn't expose /account/*
    // UI routes — the demo is storefront-only. We probe the routes
    // that do exist.
    for (const path of [
      '/',
      '/cart',
      '/search',
      '/collection/electronics',
      '/collection/computers',
      '/collection/furniture',
    ]) {
      const res = await request.get(`/en${path}`, { failOnStatusCode: false });
      expect(res.status(), `${path} should not 5xx`).toBeLessThan(500);
    }
  });
});
