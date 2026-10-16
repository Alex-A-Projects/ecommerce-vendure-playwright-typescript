import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * AccountRegisterPage — customer registration form.
 */
export class AccountRegisterPage extends BasePage {
  readonly heading: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly phoneInput: Locator;
  readonly titleSelect: Locator;
  readonly submitButton: Locator;
  readonly signInLink: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.locator('main h1, main h2, h1, h2').first();
    // The Vendure Remix Storefront uses untyped <input> elements.
    this.firstNameInput = page.locator('input[name*="firstName" i], input#firstName').first();
    this.lastNameInput = page.locator('input[name*="lastName" i], input#lastName').first();
    this.emailInput = page.locator('input[type="email"]').first();
    this.passwordInput = page
      .locator('form input[type="password"]:not([name*="confirm" i])')
      .first();
    this.confirmPasswordInput = page
      .locator(
        'form input[type="password"][name*="confirm" i], form input[type="password"][name*="repeat" i]',
      )
      .first();
    this.phoneInput = page.locator('input[type="tel"], input[name*="phone" i]').first();
    this.titleSelect = page
      .locator('main select[name*="title" i]')
      .first();
    this.submitButton = page
      .locator(
        'form button[type="submit"]:has-text("Register"), form button[type="submit"]:has-text("Create account"), form button[type="submit"]:has-text("Create Account")',
      )
      .first();
    this.signInLink = page
      .locator('main a:has-text("Sign in"), main a:has-text("Log in")')
      .first();
    this.errorMessage = page.locator('main [role="alert"], main [class*="error" i]').first();
    this.successMessage = page.locator('main [role="status"], main [class*="success" i]').first();
  }

  async open(): Promise<void> {
    // The Vendure Remix Storefront exposes the registration page at
    // /register (not /account/register).
    await this.goto('/register');
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading.first()).toBeVisible({ timeout: 10_000 });
  }

  /** Fill the form. Any undefined value is skipped. */
  async fillForm(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
    title?: string;
  }): Promise<void> {
    if (data.title) await this.titleSelect.selectOption(data.title);
    if (data.firstName) await this.firstNameInput.fill(data.firstName);
    if (data.lastName) await this.lastNameInput.fill(data.lastName);
    if (data.email) await this.emailInput.fill(data.email);
    if (data.phone) await this.phoneInput.fill(data.phone);
    if (data.password) await this.passwordInput.fill(data.password);
    if (data.confirmPassword) await this.confirmPasswordInput.fill(data.confirmPassword);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
    // Wait for either navigation or a status message to appear.
    await Promise.race([
      this.page.waitForURL(/.*/, { timeout: 15_000 }).catch(() => undefined),
      this.page.locator('h1, h2, p').filter({ hasText: /verify|success|error|invalid/i }).first().waitFor({ timeout: 15_000 }).catch(() => undefined),
    ]);
  }

  async getError(): Promise<string> {
    if (await this.errorMessage.isVisible({ timeout: 1_000 }).catch(() => false)) {
      return ((await this.errorMessage.textContent()) ?? '').trim();
    }
    return '';
  }
}
