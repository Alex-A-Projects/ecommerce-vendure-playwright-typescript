import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * HomePage — the storefront's landing page.
 *   - Hero / featured collections
 *   - Featured product grid
 *   - Newsletter signup (if present)
 */
export class HomePage extends BasePage {
  // Hero / featured
  readonly heroSection: Locator;
  readonly heroHeading: Locator;
  readonly heroCta: Locator;

  // Featured product grid
  readonly featuredSection: Locator;
  readonly featuredHeading: Locator;
  readonly featuredProductCards: Locator;

  // Generic product card (used in many places on the storefront)
  readonly productCard: Locator;
  readonly productCardName: Locator;
  readonly productCardPrice: Locator;
  readonly productCardLink: Locator;
  readonly productCardImage: Locator;

  // Promotion / banner
  readonly promoBanner: Locator;

  // Newsletter
  readonly newsletterSection: Locator;
  readonly newsletterInput: Locator;
  readonly newsletterSubmit: Locator;

  constructor(page: Page) {
    super(page);

    this.heroSection = page.locator('main >> section').first();
    this.heroHeading = page.locator('main >> h1').first();
    this.heroCta = page
      .locator('main >> a:has-text("Shop"), main >> button:has-text("Shop")')
      .first();

    this.featuredSection = page
      .locator('main section:has(h2), main section:has(h1)')
      .nth(1);
    this.featuredHeading = this.featuredSection.locator('h1, h2').first();
    this.featuredProductCards = this.featuredSection.locator('a[href*="/product/"]');

    this.productCard = page
      .locator('a[href*="/product/"]')
      .filter({ has: page.locator('img') });
    this.productCardName = this.productCard.locator('h2, h3, [class*="name" i]').first();
    this.productCardPrice = this.productCard
      .locator(':text-matches("\\\\$\\\\d"), [class*="price" i], [data-testid*="price" i]')
      .first();
    this.productCardLink = this.productCard;
    this.productCardImage = this.productCard.locator('img').first();

    this.promoBanner = page.locator('main [class*="banner" i], main [class*="promo" i]').first();

    this.newsletterSection = page
      .locator('section:has(input[type="email"]), section:has-text("newsletter" i)')
      .first();
    this.newsletterInput = page
      .locator('input[type="email"][name*="newsletter" i], input[type="email"][placeholder*="email" i]')
      .first();
    this.newsletterSubmit = page
      .locator('form:has(input[type="email"]) button[type="submit"]')
      .first();
  }

  /** Open the home page. */
  async open(): Promise<void> {
    await this.goto('/');
    await this.assertLoaded();
  }

  /** Assert the hero is present. */
  async assertHeroVisible(): Promise<void> {
    await expect(this.heroHeading).toBeVisible();
  }

  /** Click the first featured product. */
  async clickFirstFeaturedProduct(): Promise<void> {
    const first = this.productCard.first();
    await first.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Get the names of all featured products visible on the home page. */
  async getFeaturedProductNames(): Promise<string[]> {
    const cards = await this.productCard.all();
    const names: string[] = [];
    for (const card of cards) {
      const name = ((await card.locator('h2, h3').first().textContent()) ?? '').trim();
      if (name) names.push(name);
    }
    return names;
  }

  /** Get the prices of all featured products. Reads the whole card
   * text and parses the first $-prefixed value, since the Remix
   * storefront puts the price in a non-classed <p>. */
  async getFeaturedProductPrices(): Promise<number[]> {
    const cards = await this.productCard.all();
    const prices: number[] = [];
    for (const card of cards) {
      const text = ((await card.textContent()) ?? '').trim();
      const match = text.match(/\$([\d,]+\.\d+|\d+)/);
      if (match) {
        const parsed = Number(match[1].replace(/,/g, ''));
        if (!Number.isNaN(parsed) && parsed > 0) prices.push(parsed);
      }
    }
    return prices;
  }
}
