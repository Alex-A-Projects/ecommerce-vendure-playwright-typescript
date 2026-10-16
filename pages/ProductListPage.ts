import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { ProductDetailPage } from './ProductDetailPage';

/**
 * ProductListPage — collection / category / search results.
 *   - Product grid
 *   - Filters (facets)
 *   - Sort dropdown
 *   - Pagination
 */
export class ProductListPage extends BasePage {
  // Layout
  readonly listingContent: Locator;
  readonly heading: Locator;
  readonly productGrid: Locator;
  readonly productCards: Locator;
  readonly resultsCount: Locator;
  readonly emptyState: Locator;

  // Individual product card
  readonly productCardName: Locator;
  readonly productCardPrice: Locator;
  readonly productCardImage: Locator;
  readonly productCardLink: Locator;

  // Filters
  readonly filterSidebar: Locator;
  readonly filterHeading: Locator;

  // Sort
  readonly sortSelect: Locator;

  // Pagination
  readonly pagination: Locator;
  readonly nextPageLink: Locator;
  readonly prevPageLink: Locator;

  constructor(page: Page) {
    super(page);

    // The collection container has no <main>; scope cards away from global content.
    this.listingContent = page.locator('div.container').filter({ has: page.getByRole('heading', { level: 1 }) });
    this.heading = this.listingContent.getByRole('heading', { level: 1 });
    this.productGrid = this.listingContent.locator('div.grid:has(> a[href*="/product/"])');
    this.productCards = this.productGrid.locator('a[href*="/product/"]:has(img)');
    this.resultsCount = this.listingContent.getByText(/^\d+ products?$/i);
    this.emptyState = this.listingContent.getByText(/^no (matching )?products? found$/i);

    this.productCardName = this.productCards.first().getByRole('heading', { level: 3 });
    this.productCardPrice = this.productCards.first().locator('h3 + p');
    this.productCardImage = this.productCards.first().getByRole('img');
    this.productCardLink = this.productCards;

    this.filterSidebar = this.listingContent.getByRole('complementary');
    this.filterHeading = this.filterSidebar.locator('h2, h3, legend').first();

    this.sortSelect = page
      .locator('main select[name*="sort" i], main select[aria-label*="sort" i]')
      .first();
    this.pagination = this.listingContent.locator('nav:has(a[href*="page="])');
    // The pagination arrows are icon-only, with disabled buttons at either end.
    this.nextPageLink = this.pagination.locator('a:has(svg.lucide-chevron-right)');
    this.prevPageLink = this.pagination.locator('a:has(svg.lucide-chevron-left)');
  }

  /** Open a collection page by slug.
   * The Vendure Remix Storefront uses /collection/<slug> (singular).
   */
  async openCollection(slug: string): Promise<void> {
    await this.goto(`/collection/${slug}`);
    await expect(this.page).toHaveURL(url => url.pathname === `/en/collection/${slug}`);
    await this.assertLoaded();
  }

  /** Wait for the streamed listing to resolve to products or its empty state. */
  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.productCards.first().or(this.emptyState)).toBeVisible();
  }

  /** Open the search results page for `term`. */
  async openSearch(term: string): Promise<void> {
    await this.goto(`/search?q=${encodeURIComponent(term)}`);
    await this.assertLoaded();
  }

  /** Open a product using the detail page's loading checks. */
  async openProduct(slug: string): Promise<void> {
    const detail = new ProductDetailPage(this.page);
    detail.setBaseUrl(this.getBaseUrl());
    await detail.openProduct(slug);
  }

  /** Click a product card by visible name. */
  async clickProductByName(name: string): Promise<void> {
    await this.productCards.filter({ has: this.page.getByRole('heading', { name, exact: true }) }).click();
    await expect(this.page).toHaveURL(/\/en\/product\/[^/?]+/);
    await expect(this.page.getByRole('heading', { level: 1 })).toHaveText(name);
  }

  /** Get all visible product names. */
  async getVisibleProductNames(): Promise<string[]> {
    await this.assertLoaded();
    const cards = await this.productCards.all();
    const names: string[] = [];
    for (const card of cards) {
      const text = ((await card.locator('h2, h3').first().textContent()) ?? '').trim();
      names.push(text);
    }
    return names;
  }

  /** Read one price per card, including zero values so callers can reject them. */
  async getVisibleProductPrices(): Promise<number[]> {
    await this.assertLoaded();
    const cards = await this.productCards.all();
    const prices: number[] = [];
    for (const card of cards) {
      const price = card.locator('h3 + p');
      await expect(price).toHaveText(/^(?:From\s*)?\$[\d,]+\.\d{2}$/);
      const text = (await price.innerText()).trim();
      prices.push(Number(text.replace(/^(?:From\s*)?\$|,/g, '')));
    }
    return prices;
  }

  /** Count products currently visible. */
  async getProductCount(): Promise<number> {
    await this.assertLoaded();
    return await this.productCards.count();
  }

  /** Assert the page shows at least one product. */
  async assertHasProducts(): Promise<void> {
    await expect(this.productCards.first(), 'Expected the product list to have at least one product').toBeVisible();
  }

  /** Change the sort order. Best-effort — not every storefront has a <select>. */
  async sortBy(value: string): Promise<void> {
    if (await this.sortSelect.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await this.sortSelect.selectOption(value);
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  /** Follow the next page and wait until its products replace the previous set. */
  async nextPage(): Promise<void> {
    await expect(this.nextPageLink).toBeVisible();
    const href = await this.nextPageLink.getAttribute('href');
    const destination = new URL(href!, this.page.url());
    const currentPage = Number(new URL(this.page.url()).searchParams.get('page') ?? 1);
    expect(Number(destination.searchParams.get('page'))).toBe(currentPage + 1);
    const firstProduct = await this.productCards.first().getAttribute('href');
    await this.nextPageLink.click();
    await expect(this.page).toHaveURL(destination.href);
    await expect(this.productCards.first()).not.toHaveAttribute('href', firstProduct!);
    await this.assertLoaded();
  }
}
