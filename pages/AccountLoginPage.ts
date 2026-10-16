import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * AccountLoginPage — sign-in form.
 */
export class AccountLoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.locator('main h1, main h2, h1, h2').first();
    // The Vendure Remix Storefront uses untyped <input> elements inside
    // a form — match by type only, not by name.
    this.emailInput = page.locator('input[type="email"]').first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.submitButton = page
      .locator(
        'form button[type="submit"]:has-text("Sign in"), form button[type="submit"]:has-text("Log in"), form button[type="submit"]:has-text("Sign In")',
      )
      .first();
    this.registerLink = page
      .locator('main a:has-text("Register"), main a:has-text("Sign up")')
      .first();
    this.forgotPasswordLink = page
      .locator('main a:has-text("Forgot"), main a:has-text("Reset password")')
      .first();
    this.errorMessage = page.locator('main [role="alert"], main [class*="error" i]').first();
    this.successMessage = page.locator('main [role="status"], main [class*="success" i]').first();
  }

  async open(): Promise<void> {
    // The Vendure Remix Storefront exposes the sign-in page at
    // /sign-in (not /account/login). Visiting any /account/* page
    // redirects here when the user is not authenticated.
    await this.goto('/sign-in');
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading.first()).toBeVisible({ timeout: 10_000 });
  }

  /** Fill + submit the form. */
  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Get the visible error message (empty if none). */
  async getError(): Promise<string> {
    if (await this.errorMessage.isVisible({ timeout: 1_000 }).catch(() => false)) {
      return ((await this.errorMessage.textContent()) ?? '').trim();
    }
    return '';
  }
}
