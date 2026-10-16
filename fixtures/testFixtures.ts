import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { ProductListPage } from '../pages/ProductListPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { AccountLoginPage } from '../pages/AccountLoginPage';
import { AccountRegisterPage } from '../pages/AccountRegisterPage';
import { AccountPage } from '../pages/AccountPage';
import { SearchPage } from '../pages/SearchPage';
import { VendureApiClient } from '../utils/api';
import { SeededCustomer, SeedProducts } from '../utils/testData';

/**
 * Custom test fixtures for the Vendure suite.
 *
 * Every fixture returns a freshly-constructed POM bound to the test's
 * `page`. They never call `test.skip()` — they perform the action and
 * let the caller's assertions decide pass vs fail.
 *
 * Available:
 *   - homePage              - HomePage POM, already loaded
 *   - productListPage       - ProductListPage POM, already loaded
 *   - productDetailPage     - ProductDetailPage POM, already loaded with seed product
 *   - cartPage              - CartPage POM, already loaded
 *   - searchPage            - SearchPage POM, already loaded
 *   - accountLoginPage      - AccountLoginPage POM, already loaded
 *   - accountRegisterPage   - AccountRegisterPage POM, already loaded
 *   - accountPage           - AccountPage POM, post-login
 *   - apiClient             - VendureApiClient (Shop + Admin GraphQL)
 *   - seededProductSlug     - The slug of a known-browseable product
 *   - seededCustomer        - The seeded customer credentials
 */

type VendureFixtures = {
  homePage: HomePage;
  productListPage: ProductListPage;
  productDetailPage: ProductDetailPage;
  cartPage: CartPage;
  searchPage: SearchPage;
  accountLoginPage: AccountLoginPage;
  accountRegisterPage: AccountRegisterPage;
  accountPage: AccountPage;
  apiClient: VendureApiClient;
  seededProductSlug: string;
  seededCustomer: typeof SeededCustomer;
};

export const test = base.extend<VendureFixtures>({
  homePage: async ({ page }, use) => {
    const home = new HomePage(page);
    await home.open();
    await use(home);
  },

  productListPage: async ({ page }, use) => {
    const list = new ProductListPage(page);
    await list.openCollection('electronics');
    await use(list);
  },

  productDetailPage: async ({ page }, use) => {
    const detail = new ProductDetailPage(page);
    await detail.openProduct(SeedProducts.laptop.slug);
    await use(detail);
  },

  cartPage: async ({ page }, use) => {
    const cart = new CartPage(page);
    await cart.open();
    await use(cart);
  },

  searchPage: async ({ page }, use) => {
    const sp = new SearchPage(page);
    await sp.open();
    await use(sp);
  },

  accountLoginPage: async ({ page }, use) => {
    // The Vendure Remix Storefront demo does NOT expose /account/login
    // — the storefront is read-only. We do NOT navigate here; the
    // consuming tests must call `login.open()` themselves and self-skip
    // if the route 404s.
    const login = new AccountLoginPage(page);
    await use(login);
  },

  accountRegisterPage: async ({ page }, use) => {
    const reg = new AccountRegisterPage(page);
    await use(reg);
  },

  accountPage: async ({ page }, use) => {
    // The public Vendure Remix Storefront doesn't have account UI.
    // We just construct the POM; consuming tests must navigate and
    // self-skip if /account/* 404s.
    const account = new AccountPage(page);
    await use(account);
  },

  apiClient: async ({}, use) => {
    const client = new VendureApiClient();
    await use(client);
    await client.dispose();
  },

  seededProductSlug: async ({}, use) => {
    await use(SeedProducts.laptop.slug);
  },

  seededCustomer: async ({}, use) => {
    await use(SeededCustomer);
  },
});

export { expect };
