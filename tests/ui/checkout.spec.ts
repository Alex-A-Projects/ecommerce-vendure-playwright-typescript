import { randomUUID } from 'node:crypto';
import { test as base, expect } from '../../fixtures/testFixtures';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { SeedProducts, TestAddress } from '../../utils/testData';

// Lazy fixtures keep the empty-cart test empty and give every other test its own order.
const test = base.extend<{ checkoutPage: CheckoutPage; deliveryPage: CheckoutPage; reviewPage: CheckoutPage }>({
  checkoutPage: async ({ productDetailPage, page }, use) => {
    await productDetailPage.addToCart();
    const cart = new CartPage(page);
    await cart.open();
    await cart.proceedToCheckout();
    const checkout = new CheckoutPage(page);
    await checkout.assertLoaded();
    await use(checkout);
  },
  deliveryPage: async ({ checkoutPage }, use) => {
    await checkoutPage.fillContact(`qa-checkout-${randomUUID()}@example.com`, 'Alex', 'QA');
    await checkoutPage.fillAddress(TestAddress);
    await use(checkoutPage);
  },
  reviewPage: async ({ deliveryPage }, use) => {
    await deliveryPage.selectFirstShipping();
    await deliveryPage.selectFirstPayment();
    await use(deliveryPage);
  },
});

test.describe('Checkout', () => {
  test('checkout page loads', async ({ checkoutPage }) => {
    await expect(checkoutPage.heading).toBeVisible();
    await expect(checkoutPage.contactSection).toBeVisible();
  });

  test('checkout shows an email field', async ({ checkoutPage }) => {
    await expect(checkoutPage.emailInput).toBeVisible();
    await expect(checkoutPage.emailInput).toHaveAttribute('type', 'email');
  });

  test('checkout with an empty cart redirects to /cart', async ({ page }) => {
    await page.goto('/en/checkout');
    await expect(page).toHaveURL(/\/en\/cart$/);
    const cart = new CartPage(page);
    await expect(cart.emptyCartMessage).toBeVisible();
    await expect(cart.cartItems).toHaveCount(0);
  });

  test('email field accepts a valid email', async ({ checkoutPage }) => {
    await checkoutPage.setEmail('test@example.com');
    await expect(checkoutPage.emailInput).toHaveValue('test@example.com');
  });

  test('checkout shows the order summary when there are items', async ({ checkoutPage }) => {
    await expect(checkoutPage.orderSummary).toBeVisible();
    await expect(checkoutPage.orderSummary.getByText(SeedProducts.laptop.nameContains, { exact: true })).toBeVisible();
    await expect(checkoutPage.orderSummary.getByText('Qty: 1', { exact: true })).toBeVisible();
    await expect(checkoutPage.summaryTotal).toHaveText(/^\$[\d,.]+$/);
    expect(Number((await checkoutPage.summaryTotal.innerText()).replace(/[$,]/g, ''))).toBeGreaterThan(0);
  });

  test('shipping options exist on the checkout', async ({ deliveryPage }) => {
    await expect(deliveryPage.shippingOptions.first()).toBeVisible();
    await expect(deliveryPage.shippingOptions.first()).toBeEnabled();
    await expect(deliveryPage.shippingOptions.first()).toHaveAccessibleName(/shipping.*\$[\d,.]+/i);
  });

  test('payment options exist on the checkout', async ({ deliveryPage }) => {
    await deliveryPage.selectFirstShipping();
    await expect(deliveryPage.paymentOptions.first()).toBeVisible();
    await expect(deliveryPage.paymentOptions.first()).toBeEnabled();
    await expect(deliveryPage.paymentOptions.first()).toHaveAccessibleName(/payment/i);
  });

  test('a place-order button is present at the end of the flow', async ({ reviewPage }) => {
    await expect(reviewPage.reviewSection.getByText(TestAddress.street, { exact: true })).toBeVisible();
    await expect(reviewPage.reviewSection.getByText(TestAddress.country, { exact: true })).toBeVisible();
    await expect(reviewPage.placeOrderButton).toBeVisible();
    await expect(reviewPage.placeOrderButton).toBeEnabled();
  });

  test.describe('order submission (explicit opt-in)', () => {
    // This creates an external order record on the public demo.
    test.skip(process.env.RUN_DEMO_ORDER_TEST !== '1', 'Set RUN_DEMO_ORDER_TEST=1 only when demo order submission is authorized.');

    test('order confirmation page shows a thank-you message', async ({ reviewPage, page }) => {
      await reviewPage.placeOrderButton.click();
      await expect(page).not.toHaveURL(/\/en\/checkout$/);
      await expect(page.getByRole('heading', { name: /thank you/i })).toBeVisible();
    });
  });
});
