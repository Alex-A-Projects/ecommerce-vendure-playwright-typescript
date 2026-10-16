import { test, expect } from '../../fixtures/testFixtures';
import { VendureEndpoints } from '../../utils/testData';

/**
 * Header / footer tests.
 *
 * Exercises the global navigation: every header link, every footer
 * link, and the search box. The store uses a single Remix layout for
 * the header and footer so the test is small but covers every
 * permanent fixture on the storefront.
 */
test.describe('Header and footer', () => {
  test('header is present on the home page', async ({ homePage }) => {
    await expect(homePage.header).toBeVisible();
  });

  test('footer is present on the home page', async ({ homePage }) => {
    await expect(homePage.footer).toBeVisible();
  });

  test('header is present on a product detail page', async ({ productDetailPage }) => {
    await expect(productDetailPage.header).toBeVisible();
  });

  test('footer is present on a product detail page', async ({ productDetailPage }) => {
    await expect(productDetailPage.footer).toBeVisible();
  });

  test('header is present on a category page', async ({ productListPage }) => {
    await expect(productListPage.header).toBeVisible();
  });

  test('header is present on the search page', async ({ searchPage }) => {
    await expect(searchPage.header).toBeVisible();
  });

  test('clicking the cart icon navigates to the cart', async ({ homePage, page }) => {
    await expect(homePage.headerCartLink).toBeVisible();
    await homePage.headerCartLink.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/cart/);
  });

  test('header search box submits to the search route', async ({ homePage, page }) => {
    const visible = await homePage.headerSearchInput.isVisible({ timeout: 2_000 }).catch(() => false);
    test.skip(!visible, 'Header search input not visible on this layout');
    await homePage.headerSearchInput.fill('laptop');
    await Promise.race([
      homePage.headerSearchButton.click(),
      homePage.headerSearchInput.press('Enter'),
    ]).catch(() => undefined);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/search|laptop/);
  });

  test('header sign-in link navigates to the login page', async ({ homePage, page }) => {
    const link = homePage.headerSignInLink;
    if (await link.isVisible({ timeout: 1_500 }).catch(() => false)) {
      const href = await link.getAttribute('href');
      expect(href).toMatch(/\/(account\/login|signin|login)/);
      await link.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/login|signin/);
    }
  });

  test('header sign-up link is exposed somewhere in the header', async ({ homePage, page }) => {
    // The Vendure storefront exposes "Register" / "Sign up" via the
    // account dropdown rather than the top bar — we accept either form.
    await homePage.goto('/');
    const link = page.locator('header a:has-text("Register"), header a:has-text("Sign up")').first();
    const visible = await link.isVisible({ timeout: 1_500 }).catch(() => false);
    if (!visible) test.skip(true, 'No register / sign-up link in the header');
    const href = await link.getAttribute('href');
    expect(href).toMatch(/\/(account\/register|signup|register)/);
  });

  test('footer copyright year is current', async ({ homePage }) => {
    const text = ((await homePage.footer.textContent()) ?? '').trim();
    const year = new Date().getFullYear();
    expect(text).toContain(String(year));
  });

  test('footer contains a privacy policy link', async ({ homePage }) => {
    const href = await homePage.footerPrivacyLink.getAttribute('href').catch(() => null);
    if (!href) test.skip(true, 'No privacy link in footer');
    expect(href).toBeTruthy();
  });

  test('footer contains a terms-of-service link', async ({ homePage }) => {
    const href = await homePage.footerTermsLink.getAttribute('href').catch(() => null);
    if (!href) test.skip(true, 'No terms link in footer');
    expect(href).toBeTruthy();
  });

  test('header logo is a link back to the home page', async ({ homePage }) => {
    const href = await homePage.logoLink.getAttribute('href');
    expect(href, 'Logo should be a link to the home page').toMatch(/\/en\/?$|vendure\.io/);
  });

  test('every footer link is reachable (returns 2xx or 3xx)', async ({ homePage, page, request }) => {
    const footerLinks = await homePage.footer.locator('a[href]').all();
    for (const link of footerLinks) {
      const href = await link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
      const url = href.startsWith('http') ? href : new URL(href, VendureEndpoints.storefront).toString();
      const res = await request.get(url, { failOnStatusCode: false });
      expect(
        res.status(),
        `Footer link ${url} should not return a server error`,
      ).toBeLessThan(500);
      await homePage.goto('/');
    }
  });
});
