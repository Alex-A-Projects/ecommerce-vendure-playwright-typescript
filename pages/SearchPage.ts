import { Page, Locator, expect } from '@playwright/test';
import { ProductListPage } from './ProductListPage';

/** Search uses the collection grid and the global header's search form. */
export class SearchPage extends ProductListPage {
  readonly searchInput: Locator;
  readonly resultsHeading: Locator;
  readonly results: Locator;
  readonly resultCards: Locator;
  readonly resultName: Locator;
  readonly resultPrice: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = this.header.getByRole('searchbox', { name: 'Search products...' });
    this.resultsHeading = this.heading;
    this.results = this.productGrid;
    this.resultCards = this.productCards;
    this.resultName = this.productCardName;
    this.resultPrice = this.productCardPrice;
  }

  async open(term?: string): Promise<void> {
    const path = term === undefined ? '/search' : `/search?q=${encodeURIComponent(term)}`;
    await this.goto(path);
    await this.assertLoaded();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(url => url.pathname === '/en/search');
    const term = new URL(this.page.url()).searchParams.get('q');
    await expect(this.heading).toHaveText(term ? `Search results for "${term}"` : 'Search');
    await super.assertLoaded();
  }

  /** Submit the actual header form and wait for the requested results. */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    await expect(this.page).toHaveURL(url =>
      url.pathname === '/en/search' && (url.searchParams.get('q') ?? '') === term,
    );
    await this.assertLoaded();
  }

  async getResultCount(): Promise<number> {
    return this.getProductCount();
  }

  async getResultNames(): Promise<string[]> {
    return this.getVisibleProductNames();
  }
}
