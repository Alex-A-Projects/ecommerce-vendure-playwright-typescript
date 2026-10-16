import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * ProductDetailPage — single product / product variant.
 *   - Product images
 *   - Title, price, description
 *   - Variant pickers
 *   - Quantity selector
 *   - Add-to-cart button
 *   - Breadcrumbs
 */
export class ProductDetailPage extends BasePage {
  // Layout
  readonly productMain: Locator;
  readonly breadcrumbs: Locator;
  readonly breadcrumbHome: Locator;
  readonly breadcrumbCurrent: Locator;

  // Images
  readonly mainImage: Locator;
  readonly thumbnailImages: Locator;

  // Title / price / description
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly productDescription: Locator;
  readonly productSku: Locator;

  // Variants
  readonly variantGroup: Locator;
  readonly variantOptions: Locator;
  readonly variantOption: Locator;

  // Quantity + add to cart
  readonly quantityInput: Locator;
  readonly quantityDecrement: Locator;
  readonly quantityIncrement: Locator;
  readonly addToCartButton: Locator;
  readonly buyNowButton: Locator;

  // Stock state
  readonly outOfStockLabel: Locator;
  readonly inStockLabel: Locator;

  constructor(page: Page) {
    super(page);

    // The product container excludes the header, footer, and related products.
    // This storefront does not render a <main> element.
    this.productMain = page.locator('div.container').filter({ has: page.getByRole('heading', { level: 1 }) });
    this.breadcrumbs = this.productMain.getByRole('navigation', { name: 'breadcrumb' });
    this.breadcrumbHome = this.breadcrumbs.getByRole('link', { name: 'Home', exact: true });
    this.breadcrumbCurrent = this.breadcrumbs.getByRole('listitem').last();

    this.mainImage = this.productMain.getByRole('img', { name: 'Product image 1', exact: true });
    this.thumbnailImages = this.productMain.locator('button:has(img) img');

    this.productTitle = this.productMain.getByRole('heading', { level: 1 });
    this.productPrice = this.productMain.locator('h1 + p');
    this.productDescription = this.productMain.locator('.prose');
    this.productSku = this.productMain.getByText(/^SKU:\s*\S+/i);

    this.variantGroup = this.productMain.getByRole('radiogroup').first();
    this.variantOptions = this.variantGroup.getByRole('radio');
    this.variantOption = this.variantOptions.first();

    this.quantityInput = this.productMain
      .locator('input[type="number"][name*="quant" i], input[aria-label*="quant" i]')
      .first();
    this.quantityDecrement = this.productMain
      .locator('button[aria-label*="decrement" i], button:has-text("−")')
      .first();
    this.quantityIncrement = this.productMain
      .locator('button[aria-label*="increment" i], button:has-text("+")')
      .first();
    this.addToCartButton = this.productMain.getByRole('button', { name: /^add to (cart|basket|order)$/i });
    this.buyNowButton = this.productMain.getByRole('button', { name: /^buy now$/i });

    this.outOfStockLabel = this.productMain.getByText(/^out of stock$/i);
    this.inStockLabel = this.productMain.getByText(/^in stock$/i);
  }

  /** Open a product by slug. */
  async openProduct(slug: string): Promise<void> {
    await this.goto(`/product/${slug}`);
    await expect(this.page).toHaveURL(url => url.pathname === `/en/product/${slug}`);
    await this.assertLoaded();
  }

  /** Wait for product content; variant price appears only after selection. */
  async assertLoaded(): Promise<void> {
    await expect(this.productTitle).toBeVisible({ timeout: 30_000 });
    await expect(this.mainImage).toBeVisible();
  }

  /** Get the visible product title. */
  async getTitle(): Promise<string> {
    return ((await this.productTitle.textContent()) ?? '').trim();
  }

  /** Get the visible product price (as a number). */
  async getPrice(): Promise<number> {
    await expect(this.productPrice).toHaveText(/^\$[\d,]+\.\d{2}$/);
    const text = ((await this.productPrice.textContent()) ?? '').trim();
    return Number(text.replace(/[^0-9.]/g, ''));
  }

  /** Set the quantity. Falls back to clearing+typing if no <input type="number">. */
  async setQuantity(qty: number): Promise<void> {
    if (await this.quantityInput.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await this.quantityInput.fill(String(qty));
    }
  }

  /** Click the Add to cart button. */
  async addToCart(qty = 1): Promise<void> {
    await this.selectFirstVariant();
    const cartButton = this.page.getByRole('button', { name: /shopping cart/i });
    const previousCount = Number((await cartButton.innerText()).match(/\d+/)?.[0] ?? 0);
    // This storefront adds one unit per click and has no product quantity input.
    for (let added = 1; added <= qty; added++) {
      await this.addToCartButton.click();
      await expect(cartButton).toHaveText(new RegExp(`^${previousCount + added}\\s*Shopping Cart$`, 'i'));
    }
  }

  /** Choose an option in every unselected variant group. */
  async selectFirstVariant(): Promise<void> {
    await this.assertLoaded();
    for (const group of await this.productMain.getByRole('radiogroup').all()) {
      if (await group.getByRole('radio', { checked: true }).count()) continue;
      // The radio itself is visually hidden; its label is the clickable tile.
      await group.locator('label').first().click();
      await expect(group.getByRole('radio').first()).toBeChecked();
    }
  }
}
