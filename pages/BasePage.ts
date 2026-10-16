import { Page, Locator } from '@playwright/test';
import { VendureEndpoints } from '../utils/testData';

/**
 * BasePage — shared behaviour for every Page Object.
 *
 * Provides:
 *  - Navigation helpers (open, goto, BASE_URL).
 *  - The Vendure Remix Storefront global header / footer link locators
 *    which exist on every page.
 *  - Common error-message helpers.
 */
export class BasePage {
  /** Canonical storefront base URL. */
  static readonly BASE_URL = VendureEndpoints.storefront;

  readonly page: Page;

  /** The base URL every POM uses for navigation. Override via setBaseUrl(). */
  private baseUrl: string = BasePage.BASE_URL;

  // Global header
  readonly header: Locator;
  readonly logoLink: Locator;
  readonly navAllProducts: Locator;
  readonly navElectronics: Locator;
  readonly navSportswear: Locator;
  readonly navHomeGarden: Locator;
  readonly navGroceries: Locator;
  readonly navFurniture: Locator;
  readonly headerSearchInput: Locator;
  readonly headerSearchButton: Locator;
  readonly headerCartLink: Locator;
  readonly headerAccountLink: Locator;
  readonly headerSignInLink: Locator;
  readonly headerSignOutLink: Locator;
  readonly headerSignUpLink: Locator;

  // Global footer
  readonly footer: Locator;
  readonly footerAboutLink: Locator;
  readonly footerContactLink: Locator;
  readonly footerPrivacyLink: Locator;
  readonly footerTermsLink: Locator;
  readonly footerCopyright: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header container
    this.header = page.locator('header, [role="banner"]').first();
    // The storefront logo is a link to "/" with no aria-label; the only
    // hint is that it's the first link in the header.
    this.logoLink = page.locator('header a, [role="banner"] a').first();
    this.navAllProducts = page.locator('header a:has-text("Shop All"), header a[href*="/search"]').first();
    this.navElectronics = page.locator('header a:has-text("Electronics")').first();
    this.navSportswear = page.locator('header a:has-text("Sportswear"), header a:has-text("Sports & Outdoor")').first();
    this.navHomeGarden = page.locator('header a:has-text("Home & Garden")').first();
    this.navGroceries = page.locator('header a:has-text("Groceries")').first();
    this.navFurniture = page.locator('header a:has-text("Furniture")').first();

    // Search box in the header
    this.headerSearchInput = page
      .locator('header input[type="search"], header input[name*="search" i], header input[placeholder*="search" i]')
      .first();
    this.headerSearchButton = page
      .locator('header button[type="submit"]:has(svg), header button[aria-label*="search" i]')
      .first();

    // Account / cart / sign-in links
    this.headerCartLink = page
      .locator('header a[href*="/cart" i], header a[aria-label*="cart" i]')
      .first();
    this.headerAccountLink = page
      .locator('header a[href*="/account" i], header a[aria-label*="account" i]')
      .first();
    this.headerSignInLink = page
      .locator('header a:has-text("Sign in"), header a:has-text("Log in")')
      .first();
    this.headerSignOutLink = page.locator('header a:has-text("Sign out"), header button:has-text("Sign out")').first();
    this.headerSignUpLink = page
      .locator('header a:has-text("Sign up"), header a:has-text("Register")')
      .first();

    // Footer
    this.footer = page.locator('footer, [role="contentinfo"]').first();
    this.footerAboutLink = page.locator('footer a:has-text("About"), footer a[href*="about"]').first();
    this.footerContactLink = page.locator('footer a:has-text("Contact")').first();
    this.footerPrivacyLink = page.locator('footer a:has-text("Privacy")').first();
    this.footerTermsLink = page.locator('footer a:has-text("Terms")').first();
    this.footerCopyright = page.locator('footer, [role="contentinfo"]').first();
  }

  /** Override the base URL for this instance. */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /** The base URL currently in use. */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /** Navigate to the supplied path (resolved against BASE_URL).
   * The Vendure demo storefront lives under /en (locale prefix), so
   * relative paths are rewritten to /en/<path> automatically.
   */
  async goto(path = ''): Promise<void> {
    const cleaned = path.startsWith('/') ? path.slice(1) : path;
    // Use the page-level baseURL (which Playwright resolves relative
    // URLs against) — but strip the trailing slash so we can build a
    // clean absolute URL with the /en locale prefix.
    const base = this.baseUrl.replace(/\/$/, '');
    const url = cleaned ? `${base}/en/${cleaned}` : `${base}/en/`;
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
  }

  /** Wait for the page's main content area to be visible. */
  async assertLoaded(): Promise<void> {
    await this.page.locator('main, [role="main"], body').first().waitFor({ state: 'visible' });
  }

  /** Get the current page <title>. */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  /** Get the visible H1 (most page-level POMs use this). */
  async getPageHeading(): Promise<string> {
    const h1 = this.page.locator('h1').first();
    return ((await h1.textContent()) ?? '').trim();
  }

  /** Click the storefront logo to return to the home page. */
  async clickLogo(): Promise<void> {
    await this.logoLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Open the cart page from the header. */
  async openCart(): Promise<void> {
    await this.headerCartLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Use the header search box to search for `term`. */
  async search(term: string): Promise<void> {
    if (await this.headerSearchInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await this.headerSearchInput.fill(term);
      await Promise.race([
        this.headerSearchButton.click(),
        this.headerSearchInput.press('Enter'),
      ]).catch(() => undefined);
      await this.page.waitForLoadState('domcontentloaded');
    }
  }
}
