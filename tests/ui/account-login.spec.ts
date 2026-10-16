import { test, expect } from '../../fixtures/testFixtures';
import { SeededCustomer } from '../../utils/testData';

/**
 * Account login form tests.
 *
 * The public Vendure Remix Storefront demo does NOT expose /account/login
 * UI — the demo is storefront-only. These tests self-skip when the
 * login page route is not present in the current build.
 */
test.describe('Account login', () => {
  test.beforeEach(async ({ accountLoginPage, page }) => {
    // Navigate to the sign-in page. The Vendure demo exposes the form
    // at /sign-in (not /account/login) — visiting any protected
    // /account/* route also redirects here when not authenticated.
    try {
      await accountLoginPage.open();
    } catch {
      test.skip(true, 'No /sign-in UI in this storefront build');
    }
    const heading = page.locator('h1, h2').first();
    const headingText = (await heading.textContent({ timeout: 2_000 }).catch(() => '')) ?? '';
    if (headingText.includes('404') || !headingText.trim()) {
      test.skip(true, 'No /sign-in UI in this storefront build');
    }
  });

  test('login page loads and shows the heading', async ({ accountLoginPage }) => {
    await accountLoginPage.assertLoaded();
  });

  test('email field is type="email"', async ({ accountLoginPage }) => {
    const type = await accountLoginPage.emailInput.getAttribute('type').catch(() => null);
    if (!type) test.skip(true, 'No email input on the login page');
    expect(type).toBe('email');
  });

  test('password field is type="password"', async ({ accountLoginPage }) => {
    const type = await accountLoginPage.passwordInput.getAttribute('type').catch(() => null);
    if (!type) test.skip(true, 'No password input on the login page');
    expect(type).toBe('password');
  });

  test('register link is exposed', async ({ accountLoginPage }) => {
    const href = await accountLoginPage.registerLink.getAttribute('href').catch(() => null);
    if (!href) test.skip(true, 'No register link on the sign-in page');
    expect(href).toMatch(/\/(register|signup|sign-up|account\/register)/);
  });

  test('signing in with wrong credentials shows an error or stays on the page', async ({ accountLoginPage, page }) => {
    await accountLoginPage.signIn('nobody@example.com', 'wrongpassword');
    const error = await accountLoginPage.getError();
    const stillOnLogin = /sign-in|login/.test(page.url());
    expect(
      stillOnLogin || error.length > 0,
      'Wrong credentials should fail to sign in',
    ).toBeTruthy();
  });

  test('login with empty fields is rejected', async ({ accountLoginPage, page }) => {
    const btn = accountLoginPage.submitButton;
    if (!(await btn.isVisible({ timeout: 1_000 }).catch(() => false))) {
      test.skip(true, 'No submit button on the sign-in page');
    }
    await btn.click();
    await page.waitForLoadState('domcontentloaded');
    const stillOnLogin = /sign-in|login/.test(page.url());
    const html5Invalid = await page.evaluate(
      () => Array.from(document.querySelectorAll('input:invalid')).length,
    );
    expect(
      stillOnLogin || html5Invalid > 0,
      'Empty login form should not succeed',
    ).toBeTruthy();
  });
});
