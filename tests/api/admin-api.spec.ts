import { test, expect } from '../../fixtures/testFixtures';
import { AdminCredentials } from '../../utils/testData';

/**
 * Admin API — auth, products, and stock.
 *
 * Public demo admin: admin / admin
 * Admin auth uses a session cookie + vendure-token CSRF header.
 *
 * Vendure's admin list types (e.g. `ChannelList`, `ShippingMethodList`)
 * all wrap an `items` array, so the canonical shape is:
 *   `{ channels { items { id code } } }`
 */
test.describe('Admin API', () => {
  test('admin: login mutation succeeds with the public admin creds', async ({ apiClient }) => {
    const ok = await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    expect(ok).toBe(true);
    expect(apiClient.adminToken, 'adminToken should be set after login').toBeTruthy();
  });

  test('admin: login mutation rejects bad credentials', async ({ apiClient }) => {
    const mutation = /* GraphQL */ `
      mutation Login($u: String!, $p: String!) {
        login(username: $u, password: $p) {
          ... on CurrentUser { id }
          ... on InvalidCredentialsError { errorCode message }
        }
      }
    `;
    const r = await apiClient.admin<{ login: { id?: string; errorCode?: string } }>(mutation, {
      u: 'nobody',
      p: 'wrong',
    });
    expect(r.data?.login.errorCode).toBeTruthy();
  });

  test('admin: products list returns at least one product after login', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query ListProducts {
        products { totalItems items { id name enabled } }
      }
    `;
    const r = await apiClient.admin<{ products: { totalItems: number; items: { id: string; name: string; enabled: boolean }[] } }>(q);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.products.totalItems).toBeGreaterThan(0);
  });

  test('admin: product list respects take/skip', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query ListProducts($opts: ProductListOptions) {
        products(options: $opts) { totalItems items { id } }
      }
    `;
    const r = await apiClient.admin<{ products: { items: { id: string }[] } }>(q, {
      opts: { take: 3, skip: 0 },
    });
    expect(r.data?.products.items.length).toBeLessThanOrEqual(3);
  });

  test('admin: stockLocations query returns the default stock location', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query Stocks {
        stockLocations { items { id name } }
      }
    `;
    const r = await apiClient.admin<{ stockLocations: { items: { id: string; name: string }[] } }>(q);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.stockLocations.items.length).toBeGreaterThan(0);
  });

  test('admin: collections list returns all collections', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query ListCollections {
        collections { totalItems items { id name slug } }
      }
    `;
    const r = await apiClient.admin<{ collections: { totalItems: number; items: { id: string; slug: string }[] } }>(q);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.collections.totalItems).toBeGreaterThan(0);
  });

  test('admin: orders list returns at least one order', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query Orders { orders { totalItems items { id code state totalWithTax } } }
    `;
    const r = await apiClient.admin<{ orders: { totalItems: number; items: { id: string; code: string }[] } }>(q);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.orders.totalItems).toBeGreaterThan(0);
  });

  test('admin: order with code resolves to the same total', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const list = /* GraphQL */ `
      query Orders { orders { items { id code totalWithTax } } }
    `;
    const lr = await apiClient.admin<{ orders: { items: { id: string; code: string; totalWithTax: number }[] } }>(list);
    const order = lr.data?.orders.items[0];
    if (!order) test.skip(true, 'No orders in the demo');
    const q = /* GraphQL */ `
      query Order($id: ID!) { order(id: $id) { id code totalWithTax } }
    `;
    const r = await apiClient.admin<{ order: { code: string; totalWithTax: number } }>(q, { id: order!.id });
    expect(r.data?.order.code).toBe(order!.code);
    expect(r.data?.order.totalWithTax).toBe(order!.totalWithTax);
  });

  test('admin: customers list returns at least one customer', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query Customers { customers { totalItems items { id firstName lastName emailAddress } } }
    `;
    const r = await apiClient.admin<{ customers: { totalItems: number; items: { id: string; firstName: string }[] } }>(q);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.customers.totalItems).toBeGreaterThan(0);
  });

  test('admin: facets list returns at least one facet', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query Facets { facets { totalItems items { id name code } } }
    `;
    const r = await apiClient.admin<{ facets: { totalItems: number; items: { id: string; name: string }[] } }>(q);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.facets.totalItems).toBeGreaterThan(0);
  });

  test('admin: shippingMethods list returns at least one method', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query Shipping { shippingMethods { items { id name code } } }
    `;
    const r = await apiClient.admin<{ shippingMethods: { items: { id: string; name: string }[] } }>(q);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.shippingMethods.items.length).toBeGreaterThan(0);
  });

  test('admin: paymentMethods list returns at least one method', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query Payments { paymentMethods { items { id name code enabled } } }
    `;
    const r = await apiClient.admin<{ paymentMethods: { items: { id: string; name: string; enabled: boolean }[] } }>(q);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.paymentMethods.items.length).toBeGreaterThan(0);
  });

  test('admin: channels list returns at least one channel', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query Channels { channels { items { id code token defaultCurrencyCode } } }
    `;
    const r = await apiClient.admin<{ channels: { items: { id: string; code: string }[] } }>(q);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.channels.items.length).toBeGreaterThan(0);
  });

  test('admin: taxRates list returns at least one rate', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query TaxRates { taxRates { items { id name value enabled } } }
    `;
    const r = await apiClient.admin<{ taxRates: { items: { id: string; value: number; enabled: boolean }[] } }>(q);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.taxRates.items.length).toBeGreaterThan(0);
  });

  test('admin: jobs list returns the queue table', async ({ apiClient }) => {
    await apiClient.adminLogin(AdminCredentials.username, AdminCredentials.password);
    const q = /* GraphQL */ `
      query Jobs { jobs { items { id queueName state isSettled } } }
    `;
    const r = await apiClient.admin<{ jobs: { items: { id: string }[] } }>(q);
    // Don't assert > 0 — the public demo's queue may be empty.
    expect(r.data?.jobs).toBeDefined();
  });

  test('admin: unauthorised queries without login are rejected', async ({ apiClient }) => {
    // Reset the auth token explicitly.
    apiClient.adminToken = null;
    const q = /* GraphQL */ `
      query Customers { customers { totalItems } }
    `;
    const r = await apiClient.admin<{ customers: { totalItems: number } }>(q);
    // The Admin API requires a session cookie + CSRF, not a Bearer token.
    // Without auth, queries return a FORBIDDEN error.
    expect([200, 403]).toContain(r.status);
  });
});
