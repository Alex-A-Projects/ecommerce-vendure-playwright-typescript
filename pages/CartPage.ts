import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/** The storefront cart, scoped to its heading container (there is no main element). */
export class CartPage extends BasePage {
  readonly cartContents: Locator;
  readonly cartItems: Locator;
  readonly cartItemName: Locator;
  readonly cartItemPrice: Locator;
  readonly cartItemQuantity: Locator;
  readonly cartItemTotal: Locator;
  readonly cartItemRemove: Locator;
  readonly emptyCartMessage: Locator;
  readonly emptyCartLink: Locator;
  readonly subtotalLabel: Locator;
  readonly subtotalValue: Locator;
  readonly shippingLabel: Locator;
  readonly shippingValue: Locator;
  readonly taxLabel: Locator;
  readonly taxValue: Locator;
  readonly totalLabel: Locator;
  readonly totalValue: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingLink: Locator;

  constructor(page: Page) {
    super(page);
    this.cartContents = page.locator('div:has(> h1)').filter({
      has: page.getByRole('heading', { name: 'Shopping Cart', exact: true }),
    });
    // Each row has a direct product-image link. Nested text links are not rows.
    this.cartItems = this.cartContents.locator('div:has(> a[href*="/product/"] > img)');
    const firstItem = this.cartItems.first();
    this.cartItemName = firstItem.locator('a[href*="/product/"]').filter({ hasNot: page.locator('img') });
    this.cartItemPrice = firstItem.locator('p:visible').filter({ hasText: /each$/ });
    this.cartItemQuantity = firstItem.locator('span.tabular-nums');
    this.cartItemTotal = firstItem.locator('p:visible').filter({ hasText: /^\$[\d,.]+$/ });
    // The storefront's icon-only controls have no accessible names.
    this.cartItemRemove = firstItem.locator('button:has(svg.lucide-x)');
    this.emptyCartMessage = this.cartContents.getByRole('heading', { name: /your cart is empty/i });
    this.continueShoppingLink = this.cartContents.getByRole('button', { name: /continue shopping/i });
    this.emptyCartLink = this.continueShoppingLink;
    this.subtotalLabel = this.cartContents.getByText('Subtotal', { exact: true });
    this.subtotalValue = this.subtotalLabel.locator('+ span');
    this.shippingLabel = this.cartContents.getByText('Shipping', { exact: true });
    this.shippingValue = this.shippingLabel.locator('+ span');
    this.taxLabel = this.cartContents.getByText('Tax', { exact: true });
    this.taxValue = this.taxLabel.locator('+ span');
    this.totalLabel = this.cartContents.getByText('Total', { exact: true });
    this.totalValue = this.totalLabel.locator('+ span');
    this.checkoutButton = this.cartContents.getByRole('button', { name: /proceed to checkout/i });
  }

  async open(): Promise<void> {
    await this.goto('/cart');
    await this.assertLoaded();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.cartContents).toBeVisible();
    await expect(this.emptyCartMessage.or(this.checkoutButton)).toBeVisible();
  }

  async getItemCount(): Promise<number> {
    await this.assertLoaded();
    return this.cartItems.count();
  }

  async getItemNames(): Promise<string[]> {
    await this.assertLoaded();
    return this.cartItems.locator('a[href*="/product/"]').filter({ hasNot: this.page.locator('img') }).allTextContents();
  }

  async removeFirstItem(): Promise<void> {
    const before = await this.getItemCount();
    expect(before, 'Cart must contain an item to remove').toBeGreaterThan(0);
    await this.cartItemRemove.click();
    await expect(this.cartItems).toHaveCount(before - 1);
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await expect(this.page).toHaveURL(/\/en\/checkout/);
  }
}
