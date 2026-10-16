import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type CheckoutAddress = {
  fullName: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
};

/** Guest checkout: contact, address, delivery, payment, and review. */
export class CheckoutPage extends BasePage {
  readonly heading: Locator;
  readonly contactSection: Locator;
  readonly addressSection: Locator;
  readonly deliverySection: Locator;
  readonly paymentSection: Locator;
  readonly reviewSection: Locator;
  readonly emailInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly fullNameInput: Locator;
  readonly streetInput: Locator;
  readonly cityInput: Locator;
  readonly provinceInput: Locator;
  readonly postalCodeInput: Locator;
  readonly countrySelect: Locator;
  readonly phoneInput: Locator;
  readonly shippingOptions: Locator;
  readonly paymentOptions: Locator;
  readonly orderSummary: Locator;
  readonly summaryTotal: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Checkout', exact: true });
    this.contactSection = page.getByRole('region', { name: /Contact Information/ });
    this.addressSection = page.getByRole('region', { name: /Shipping Address/ });
    this.deliverySection = page.getByRole('region', { name: /Delivery Method/ });
    this.paymentSection = page.getByRole('region', { name: /Payment Method/ });
    this.reviewSection = page.getByRole('region', { name: /Review & Place Order/ });
    this.emailInput = this.contactSection.getByRole('textbox', { name: 'Email Address *', exact: true });
    this.firstNameInput = this.contactSection.getByRole('textbox', { name: 'First Name *', exact: true });
    this.lastNameInput = this.contactSection.getByRole('textbox', { name: 'Last Name *', exact: true });
    this.fullNameInput = this.addressSection.getByRole('textbox', { name: 'Full Name *', exact: true });
    this.streetInput = this.addressSection.getByRole('textbox', { name: 'Street Address *', exact: true });
    this.cityInput = this.addressSection.getByRole('textbox', { name: 'City *', exact: true });
    this.provinceInput = this.addressSection.getByRole('textbox', { name: 'State/Province', exact: true });
    this.postalCodeInput = this.addressSection.getByRole('textbox', { name: 'Postal Code *', exact: true });
    this.countrySelect = this.addressSection.getByRole('combobox');
    this.phoneInput = this.addressSection.getByRole('textbox', { name: 'Phone Number *', exact: true });
    this.shippingOptions = this.deliverySection.getByRole('radio');
    this.paymentOptions = this.paymentSection.getByRole('radio');
    this.orderSummary = page.locator('[data-slot="card"]').filter({
      has: page.getByText('Order Summary', { exact: true }),
    });
    this.summaryTotal = this.orderSummary.getByText('Total', { exact: true }).locator('+ span');
    this.placeOrderButton = this.reviewSection.getByRole('button', { name: /^place order/i });
  }

  async open(): Promise<void> {
    await this.goto('/checkout');
    await this.assertLoaded();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/en\/checkout$/);
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
  }

  async setEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillContact(email: string, firstName: string, lastName: string): Promise<void> {
    await this.setEmail(email);
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.contactSection.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(this.fullNameInput).toBeVisible();
  }

  async fillAddress(address: CheckoutAddress): Promise<void> {
    await this.fullNameInput.fill(address.fullName);
    await this.streetInput.fill(address.street);
    await this.cityInput.fill(address.city);
    await this.provinceInput.fill(address.province);
    await this.postalCodeInput.fill(address.postalCode);
    await this.phoneInput.fill(address.phone);
    await this.countrySelect.click();
    await this.page.getByRole('option', { name: address.country, exact: true }).click();
    await this.addressSection.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(this.shippingOptions.first()).toBeVisible();
  }

  async selectFirstShipping(): Promise<void> {
    await this.shippingOptions.first().check();
    await expect(this.shippingOptions.first()).toBeChecked();
    await this.deliverySection.getByRole('button', { name: 'Continue to payment', exact: true }).click();
    await expect(this.paymentSection).toBeVisible();
  }

  async selectFirstPayment(): Promise<void> {
    await this.paymentOptions.first().check();
    await expect(this.paymentOptions.first()).toBeChecked();
    await this.paymentSection.getByRole('button', { name: 'Continue to review', exact: true }).click();
    // The accordion opens before the saved order details finish refreshing.
    await expect(this.placeOrderButton).toBeEnabled();
  }
}
