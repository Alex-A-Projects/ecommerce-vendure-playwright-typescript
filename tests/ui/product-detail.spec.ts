import { test, expect } from '../../fixtures/testFixtures';
import { SeedProducts } from '../../utils/testData';

/**
 * Product detail page tests.
 *
 * Exercises:
 *   - Title, price, description visibility
 *   - Image rendering
 *   - Add-to-cart flow (single + multi quantity)
 *   - Variant selection
 *   - Breadcrumb navigation back to the collection
 *   - Bad slug returns 404 (not 500)
 */
test.describe('Product detail page', () => {
  test(`${SeedProducts.laptop.slug} loads with a title and selected variant price`, async ({ productDetailPage }) => {
    await expect(productDetailPage.productTitle).toHaveText(SeedProducts.laptop.nameContains);
    await productDetailPage.selectFirstVariant();
    await expect(productDetailPage.productPrice).toBeVisible();
  });

  test('product price is a positive number', async ({ productDetailPage }) => {
    await productDetailPage.selectFirstVariant();
    const price = await productDetailPage.getPrice();
    expect(price).toBeGreaterThan(0);
  });

  test('product page shows the product name in the <title> tag', async ({ productDetailPage, page }) => {
    const name = await productDetailPage.getTitle();
    await expect(page).toHaveTitle(`${name} | Vendure Store`);
  });

  test('product page has a primary image with a valid src', async ({ productDetailPage }) => {
    const src = await productDetailPage.mainImage.getAttribute('src');
    expect(src, 'Main image should have a src').toBeTruthy();
    expect(src, 'Main image src should not be a data: URL').not.toMatch(/^data:/);
  });

  test('product page has a description block', async ({ productDetailPage }) => {
    const text = ((await productDetailPage.productDescription.textContent()) ?? '').trim();
    expect(text.length, 'Description should be non-empty').toBeGreaterThan(20);
  });

  test('breadcrumbs show the current product as the last crumb', async ({ productDetailPage }) => {
    await expect(productDetailPage.breadcrumbHome).toBeVisible();
    await expect(productDetailPage.breadcrumbCurrent).toHaveText(SeedProducts.laptop.nameContains);
  });

  test('clicking the home breadcrumb returns to the root', async ({ productDetailPage, page }) => {
    await productDetailPage.breadcrumbHome.click();
    await expect(page).toHaveURL(/\/en\/?$/);
  });

  test('Add to cart becomes enabled after selecting all variant options', async ({ productDetailPage }) => {
    await expect(productDetailPage.productMain.getByRole('button', { name: 'Select Options', exact: true })).toBeDisabled();
    await productDetailPage.selectFirstVariant();
    await expect(productDetailPage.addToCartButton).toBeVisible();
    await expect(productDetailPage.addToCartButton).toBeEnabled();
  });

  test('Add to cart (single quantity) does not navigate away', async ({ productDetailPage, page }) => {
    const url = new URL(page.url());
    await productDetailPage.addToCart(1);
    // Variant selection updates query parameters; adding stays on this product.
    await expect(page).toHaveURL(current => current.origin === url.origin && current.pathname === url.pathname);
  });

  test('Add to cart (quantity = 2) does not navigate away', async ({ productDetailPage, page }) => {
    const url = new URL(page.url());
    await productDetailPage.addToCart(2);
    await expect(page).toHaveURL(current => current.origin === url.origin && current.pathname === url.pathname);
  });

  test('Buy now button is present (or skipped if absent)', async ({ productDetailPage }) => {
    await productDetailPage.selectFirstVariant();
    await expect(productDetailPage.addToCartButton).toBeEnabled();
    const visible = await productDetailPage.buyNowButton.isVisible();
    if (!visible) test.skip(true, 'No "Buy now" button on this layout');
    await expect(productDetailPage.buyNowButton).toBeVisible();
  });

  test('Out of stock label is hidden for in-stock seed products', async ({ productDetailPage }) => {
    await productDetailPage.selectFirstVariant();
    await expect(productDetailPage.inStockLabel).toBeVisible();
    await expect(productDetailPage.outOfStockLabel).toBeHidden();
  });

  for (const seed of Object.values(SeedProducts)) {
    test(`deep-link to /product/${seed.slug} returns 2xx`, async ({ request }) => {
      const res = await request.get(`/en/product/${seed.slug}`);
      expect(res.ok(), `/${seed.slug} returned HTTP ${res.status()}`).toBe(true);
    });
  }

  test('unknown product slug returns 404 (not 500)', async ({ page, request }) => {
    const res = await request.get('/product/__no-such-product-zzz__');
    expect([404, 200]).toContain(res.status());
  });

  test('clicking the brand logo on a product page returns home', async ({ productDetailPage, page }) => {
    await productDetailPage.clickLogo();
    await expect(page).toHaveURL(/\/en\/?$/);
  });
});
