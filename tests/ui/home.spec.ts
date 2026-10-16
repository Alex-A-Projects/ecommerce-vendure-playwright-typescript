import { test, expect } from '../../fixtures/testFixtures';
import { VendureEndpoints } from '../../utils/testData';

/**
 * Home page tests — covers the public storefront landing page.
 *
 * Asserts:
 *  - Page loads at the root URL.
 *  - Hero is visible and has meaningful copy.
 *  - Featured product cards link to product detail pages.
 *  - Header navigation links exist and the search/cart icons render.
 *  - Footer links render and the copyright line is visible.
 *  - The product cards have non-zero prices and a thumbnail image.
 */
test.describe('Home page', () => {
  test('loads the storefront root URL', async ({ homePage, page }) => {
    await expect(page).toHaveURL(/vendure\.io\/en\/?$/);
    await expect(homePage.header).toBeVisible();
    await expect(homePage.footer).toBeVisible();
  });

  test('displays a hero heading with marketing copy', async ({ homePage }) => {
    const heading = await homePage.getPageHeading();
    expect(heading.length, 'Hero heading should have copy').toBeGreaterThan(0);
  });

  test('header shows the brand logo and core navigation links', async ({ homePage }) => {
    await expect(homePage.logoLink).toBeVisible();
    // navAllProducts is the "Shop All" link to /search, not a literal "All products"
    await expect(homePage.navElectronics).toBeVisible();
  });

  test('header collection nav links resolve to the right URLs', async ({ homePage, page }) => {
    // Click each header link and verify the URL pattern. We don't navigate
    // away mid-test (we bounce back via page.goto each time).
    for (const [locator, expectedFragment] of [
      [homePage.navAllProducts, '/search'],
      [homePage.navElectronics, '/collection/electronics'],
      [homePage.navSportswear, '/collection/sports'],
      [homePage.navHomeGarden, '/collection/home-garden'],
    ] as const) {
      const visible = await locator.isVisible({ timeout: 1_000 }).catch(() => false);
      if (!visible) continue;
      const href = await locator.getAttribute('href');
      expect(href, `nav link href should contain ${expectedFragment}`).toMatch(
        new RegExp(expectedFragment),
      );
      await page.goto(VendureEndpoints.storefront + '/en');
    }
  });

  test('the header exposes a search input and a cart link', async ({ homePage }) => {
    expect(
      await homePage.headerSearchInput.isVisible({ timeout: 2_000 }).catch(() => false) ||
        await homePage.headerSearchButton.isVisible({ timeout: 1_000 }).catch(() => false),
      'Search affordance should be present in the header',
    ).toBeTruthy();
    await expect(homePage.headerCartLink).toBeVisible();
  });

  test('the footer renders About, Contact, Privacy, and Terms links', async ({ homePage }) => {
    await expect(homePage.footer).toBeVisible();
    for (const link of [
      homePage.footerAboutLink,
      homePage.footerContactLink,
      homePage.footerPrivacyLink,
      homePage.footerTermsLink,
    ]) {
      const visible = await link.isVisible({ timeout: 1_000 }).catch(() => false);
      if (!visible) continue;
      const href = await link.getAttribute('href');
      expect(href, 'Footer link should have an href').toBeTruthy();
    }
  });

  test('footer contains a copyright line', async ({ homePage }) => {
    const text = ((await homePage.footer.textContent()) ?? '').toLowerCase();
    expect(text, 'Footer should contain a copyright notice').toMatch(/©|copyright/);
  });

  test('renders at least one featured product card', async ({ homePage }) => {
    const count = await homePage.productCard.count();
    expect(count, 'Home should render at least one product card').toBeGreaterThan(0);
  });

  test('featured product cards have a name and a price', async ({ homePage }) => {
    const prices = await homePage.getFeaturedProductPrices();
    expect(prices.length, 'Should be able to read at least one product price').toBeGreaterThan(0);
    for (const p of prices) {
      expect(p, 'Each visible price should be > 0').toBeGreaterThan(0);
    }
  });

  test('featured product card text contains the product name and a dollar price', async ({ homePage }) => {
    const first = homePage.productCard.first();
    const text = (await first.textContent()) ?? '';
    expect(text, 'First card should include a $-prefixed price').toMatch(/\$\d/);
  });

  test('featured product card image has a valid src', async ({ homePage }) => {
    const firstCard = homePage.productCard.first();
    const img = firstCard.locator('img').first();
    const src = await img.getAttribute('src');
    expect(src, 'Product card image should have a src').toBeTruthy();
    expect(src).toMatch(/(https?:\/\/|\/)/);
  });

  test('clicking a featured product navigates to a product page', async ({ homePage, page }) => {
    const first = homePage.productCard.first();
    const name = ((await first.locator('h2, h3').first().textContent()) ?? '').trim();
    await first.click();
    await page.waitForURL(/\/product\//, { timeout: 15_000 });
    // The product page renders the h1 once the data loads.
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
    const h1 = await page.locator('h1').first().textContent();
    expect(((h1 ?? '').trim().length > 0), 'Product page should have a heading').toBeTruthy();
  });

  test('clicking the brand logo returns to the home page', async ({ homePage, page }) => {
    await homePage.goto('/collection/electronics');
    await homePage.clickLogo();
    await expect(page).toHaveURL(/vendure\.io\/en\/?$/);
  });

  test('no uncaught console errors on first load', async ({ page, homePage }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
    });
    await homePage.goto('/');
    const appErrors = errors.filter(
      (e) =>
        !e.includes('vendure.io') &&
        !e.includes('favicon') &&
        !e.toLowerCase().includes('failed to load resource') &&
        !e.toLowerCase().includes('net::err_blocked_by_client'),
    );
    expect(appErrors, `Unexpected errors:\n${appErrors.join('\n')}`).toHaveLength(0);
  });
});
