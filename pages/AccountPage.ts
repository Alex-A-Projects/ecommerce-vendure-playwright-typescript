import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * AccountPage — customer account dashboard (post-login landing).
 *   - Sidebar nav (orders, addresses, profile, etc.)
 *   - Order history list
 *   - Default shipping / billing address
 *   - Personal details form
 */
export class AccountPage extends BasePage {
  readonly main: Locator;
  readonly heading: Locator;

  // Sidebar / nav
  readonly navOverview: Locator;
  readonly navOrders: Locator;
  readonly navAddresses: Locator;
  readonly navProfile: Locator;
  readonly navPassword: Locator;
  readonly signOutLink: Locator;

  // Order history
  readonly ordersList: Locator;
  readonly orderItems: Locator;
  readonly orderItemCode: Locator;
  readonly orderItemDate: Locator;
  readonly orderItemTotal: Locator;
  readonly orderItemState: Locator;
  readonly orderItemLink: Locator;

  // Address book
  readonly defaultShippingAddress: Locator;
  readonly defaultBillingAddress: Locator;
  readonly addressBookEmpty: Locator;
  readonly newAddressButton: Locator;

  // Profile form
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly updateProfileButton: Locator;

  // Password form
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmNewPasswordInput: Locator;
  readonly changePasswordButton: Locator;

  constructor(page: Page) {
    super(page);

    this.main = page.locator('main').first();
    this.heading = page.locator('main h1').first();

    this.navOverview = page.locator('main a:has-text("Overview"), main a:has-text("Dashboard")').first();
    this.navOrders = page.locator('main a:has-text("Orders"), main a:has-text("Order history")').first();
    this.navAddresses = page.locator('main a:has-text("Addresses"), main a:has-text("Address book")').first();
    this.navProfile = page.locator('main a:has-text("Profile"), main a:has-text("Personal details")').first();
    this.navPassword = page.locator('main a:has-text("Password"), main a:has-text("Change password")').first();
    this.signOutLink = page.locator('main button:has-text("Sign out"), main a:has-text("Sign out")').first();

    this.ordersList = page
      .locator('main [class*="order" i]:not(a):not(button)')
      .first();
    this.orderItems = page.locator('main a[href*="/orders/"], main tr:has(a[href*="/orders/"])');
    this.orderItemCode = this.orderItems.locator('text=/[A-Z]{2,}[A-Z0-9]+/').first();
    this.orderItemDate = this.orderItems.locator('time').first();
    this.orderItemTotal = this.orderItems.locator('[class*="total" i]').first();
    this.orderItemState = this.orderItems.locator('[class*="state" i], [class*="status" i]').first();
    this.orderItemLink = this.orderItems.first();

    this.defaultShippingAddress = page
      .locator('main section:has(h2:has-text("Shipping")), main [class*="shipping-address" i]')
      .first();
    this.defaultBillingAddress = page
      .locator('main section:has(h2:has-text("Billing")), main [class*="billing-address" i]')
      .first();
    this.addressBookEmpty = page.locator('main >> text=/no address on file/i').first();
    this.newAddressButton = page
      .locator('main a:has-text("New address"), main button:has-text("Add address")')
      .first();

    this.firstNameInput = page
      .locator('main input[name*="firstName" i], main input#firstName')
      .first();
    this.lastNameInput = page
      .locator('main input[name*="lastName" i], main input#lastName')
      .first();
    this.phoneInput = page
      .locator('main input[type="tel"], main input[name*="phone" i]')
      .first();
    this.emailInput = page
      .locator('main input[type="email"][name*="email" i], main input#email')
      .first();
    this.updateProfileButton = page
      .locator('main button:has-text("Update"), main button:has-text("Save")')
      .first();

    this.currentPasswordInput = page
      .locator('main input[type="password"][name*="current" i], main input#currentPassword')
      .first();
    this.newPasswordInput = page
      .locator('main input[type="password"][name*="new" i]:not([name*="confirm" i]), main input#newPassword')
      .first();
    this.confirmNewPasswordInput = page
      .locator('main input[type="password"][name*="confirm" i]')
      .first();
    this.changePasswordButton = page
      .locator('main button:has-text("Change password"), main button:has-text("Update password")')
      .first();
  }

  async open(): Promise<void> {
    await this.goto('/account');
    await this.assertLoaded();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: 10_000 });
  }

  async getOrderCount(): Promise<number> {
    return await this.orderItems.count();
  }

  async signOut(): Promise<void> {
    if (await this.signOutLink.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await this.signOutLink.click();
      await this.page.waitForLoadState('domcontentloaded');
    }
  }
}
