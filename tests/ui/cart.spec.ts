import { test, expect } from '../../fixtures/testFixtures';
import { CartPage } from '../../pages/CartPage';
import { SeedProducts } from '../../utils/testData';

/** Each test has an isolated browser session and creates its own cart contents. */
test.describe('Cart', () => {
  test('empty cart shows the empty state', async ({ cartPage }) => {
    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect(cartPage.cartItems).toHaveCount(0);
  });

  test('empty cart shows a link to continue shopping', async ({ cartPage, page }) => {
    await expect(cartPage.emptyCartLink).toHaveAttribute('href', '/en');
    await cartPage.emptyCartLink.click();
    await expect(page).toHaveURL(/\/en\/?$/);
  });

  test('adding a product to cart shows it on the cart page', async ({ productDetailPage, page }) => {
    await productDetailPage.addToCart();
    const cart = new CartPage(page);
    await cart.open();
    await expect(cart.cartItems).toHaveCount(1);
    await expect(cart.cartItemName).toHaveText(SeedProducts.laptop.nameContains);
  });

  test('cart item line has a name, price, and quantity control', async ({ productDetailPage, page }) => {
    await productDetailPage.addToCart();
    const cart = new CartPage(page);
    await cart.open();
    await expect(cart.cartItems).toHaveCount(1);
    await expect(cart.cartItemName).toHaveText(SeedProducts.laptop.nameContains);
    await expect(cart.cartItemPrice).toHaveText(/\$[\d,.]+ each/);
    await expect(cart.cartItemQuantity).toHaveText('1');
    await expect(cart.cartItems.first().locator('button:has(svg.lucide-plus)')).toBeEnabled();
  });

  test('cart page exposes a checkout button', async ({ productDetailPage, page }) => {
    await productDetailPage.addToCart();
    const cart = new CartPage(page);
    await cart.open();
    await expect(cart.checkoutButton).toBeVisible();
    await expect(cart.checkoutButton).toHaveAttribute('href', '/en/checkout');
  });

  test('adding two different products results in two line items', async ({ productDetailPage, page }) => {
    await productDetailPage.addToCart();
    await productDetailPage.openProduct(SeedProducts.football.slug);
    await productDetailPage.addToCart();
    const cart = new CartPage(page);
    await cart.open();
    await expect(cart.cartItems).toHaveCount(2);
    expect(await cart.getItemNames()).toEqual(expect.arrayContaining([
      SeedProducts.laptop.nameContains,
      SeedProducts.football.nameContains,
    ]));
  });

  test('removing a line item drops the item count', async ({ productDetailPage, page }) => {
    await productDetailPage.addToCart();
    const cart = new CartPage(page);
    await cart.open();
    await expect(cart.cartItems).toHaveCount(1);
    await cart.removeFirstItem();
    await expect(cart.emptyCartMessage).toBeVisible();
    // Verify the removal survives a fresh server render.
    await cart.open();
    await expect(cart.cartItems).toHaveCount(0);
  });

  test('cart total is greater than zero when there are items', async ({ productDetailPage, page }) => {
    await productDetailPage.addToCart();
    const cart = new CartPage(page);
    await cart.open();
    await expect(cart.totalValue).toHaveText(/^\$[\d,.]+$/);
    const total = Number((await cart.totalValue.innerText()).replace(/[$,]/g, ''));
    expect(total).toBeGreaterThan(0);
  });
});
