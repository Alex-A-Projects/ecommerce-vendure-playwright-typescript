import { test, expect } from '../../fixtures/testFixtures';
import { ProductListPage } from '../../pages/ProductListPage';
import { ProductDetailPage } from '../../pages/ProductDetailPage';
import { SeedCollections, SeedProducts } from '../../utils/testData';

/** Collection browsing, product-card content, navigation, and empty states. */
test.describe('Product listing page — collection browse', () => {
  for (const collection of Object.values(SeedCollections)) {
    test(`/${collection.slug} loads and shows at least one product card`, async ({ page }) => {
      test.skip(collection.slug === '__all__', '__all__ is synthetic and has no collection route');
      const listing = new ProductListPage(page);
      await listing.openCollection(collection.slug);
      await expect(listing.heading).toContainText(collection.nameContains);
      await listing.assertHasProducts();
    });
  }

  test('electronics collection shows the seed laptop', async ({ productListPage }) => {
    const laptop = productListPage.productCards.getByRole('heading', {
      name: SeedProducts.laptop.nameContains, exact: true,
    });
    // The catalog is paginated; the seed product need not be on the first page.
    while (!(await laptop.isVisible()) && await productListPage.nextPageLink.count()) {
      await productListPage.nextPage();
    }
    await expect(laptop).toBeVisible();
  });

  test('sports-outdoor collection shows apparel or sports equipment', async ({ page }) => {
    const listing = new ProductListPage(page);
    await listing.openCollection(SeedCollections.sportsOutdoor.slug);
    await expect(listing.productCards.filter({ hasText: /shirt|jacket|shorts|shoe|bike|bicycle|ball/i }).first()).toBeVisible();
  });

  for (const collection of [SeedCollections.homeGarden, SeedCollections.plants, SeedCollections.furniture]) {
    test(`${collection.slug} collection has products`, async ({ page }) => {
      const listing = new ProductListPage(page);
      await listing.openCollection(collection.slug);
      await listing.assertHasProducts();
      expect(await listing.getProductCount()).toBeGreaterThan(0);
    });
  }

  test('computers collection has the laptop', async ({ page }) => {
    const listing = new ProductListPage(page);
    await listing.openCollection(SeedCollections.computers.slug);
    await expect(listing.productCards.getByRole('heading', {
      name: SeedProducts.laptop.nameContains, exact: true,
    })).toBeVisible();
  });

  test('product cards have a name, price, and image', async ({ productListPage }) => {
    await productListPage.assertHasProducts();
    for (const card of await productListPage.productCards.all()) {
      const name = card.getByRole('heading', { level: 3 });
      await expect(name).toHaveText(/\S/);
      await expect(card.locator('h3 + p')).toHaveText(/^(?:From\s*)?\$[\d,]+\.\d{2}$/);
      await expect(card.getByRole('img')).toHaveAttribute('src', /\S/);
      await expect(card.getByRole('img')).toHaveAttribute('alt', (await name.innerText()).trim());
    }
  });

  test('all product prices are > 0', async ({ productListPage }) => {
    const prices = await productListPage.getVisibleProductPrices();
    expect(prices.length).toBe(await productListPage.getProductCount());
    expect(prices.length, 'Should read at least one price').toBeGreaterThan(0);
    for (const price of prices) {
      expect(price, 'Each price should be > 0').toBeGreaterThan(0);
    }
  });

  test('no product name contains a "null" or "undefined" placeholder', async ({ productListPage }) => {
    const names = await productListPage.getVisibleProductNames();
    expect(names.length, 'Should read at least one product name').toBeGreaterThan(0);
    expect(names.length).toBe(await productListPage.getProductCount());
    for (const name of names) {
      expect(name, 'Product name should be non-empty').toMatch(/\S/);
      expect(name, `Product name "${name}" should not be a placeholder`).not.toMatch(
        /^(null|undefined|nan|placeholder)$/i,
      );
    }
  });

  test('clicking a product card opens its detail page', async ({ productListPage, page }) => {
    const name = (await productListPage.productCardName.innerText()).trim();
    const href = await productListPage.productCards.first().getAttribute('href');
    expect(href).toMatch(/^\/en\/product\/[^/?]+$/);
    await productListPage.clickProductByName(name);
    await expect(page).toHaveURL(url => url.pathname === href);
    const detail = new ProductDetailPage(page);
    await detail.assertLoaded();
    await expect(detail.productTitle).toHaveText(name);
  });

  test('deep-linking to a specific slug works', async ({ productDetailPage }) => {
    await expect(productDetailPage.productTitle).toHaveText(SeedProducts.laptop.nameContains);
  });

  test('URL with unknown collection slug shows the empty state', async ({ page }) => {
    const slug = '__no-such-collection-zzz__';
    const response = await page.goto(`/en/collection/${slug}`);
    expect(response?.ok(), 'Unknown collection should render its empty state').toBe(true);
    const listing = new ProductListPage(page);
    await listing.assertLoaded();
    await expect(listing.heading).toHaveText(slug);
    await expect(listing.emptyState).toBeVisible();
    await expect(listing.productCards).toHaveCount(0);
  });
});
