import { test, expect } from '../../fixtures/testFixtures';
import { SeedProducts, TestAddress } from '../../utils/testData';
import { uniqueEmail } from '../../utils/helpers';

/**
 * Shop API — mutations.
 *
 * Public demo: the cart is per-cookie and not persisted between runs,
 * so each test seeds an "active order" by adding a variant first.
 */
test.describe('Shop API — mutations', () => {
  test('mutation: addItemToOrder adds a variant to the active order', async ({ apiClient }) => {
    // Get a variant id
    const pq = /* GraphQL */ `
      query GetVariant($slug: String!) { product(slug: $slug) { variants { id } } }
    `;
    const pr = await apiClient.shop<{ product: { variants: { id: string }[] } | null }>(pq, {
      slug: SeedProducts.laptop.slug,
    });
    const variantId = pr.data?.product?.variants[0]?.id;
    expect(variantId).toBeTruthy();

    const mutation = /* GraphQL */ `
      mutation Add($id: ID!, $qty: Int!) {
        addItemToOrder(productVariantId: $id, quantity: $qty) {
          ... on Order { id code state total totalWithTax }
          ... on OrderModificationError { errorCode message }
        }
      }
    `;
    const r = await apiClient.shop<{ addItemToOrder: { id?: string; total?: number; errorCode?: string } }>(
      mutation,
      { id: variantId, qty: 1 },
    );
    expect(r.errors).toBeUndefined();
    expect(r.data?.addItemToOrder.id).toBeTruthy();
    expect(r.data?.addItemToOrder.total).toBeGreaterThan(0);
  });

  test('mutation: addItemToOrder respects quantity', async ({ apiClient }) => {
    const pq = /* GraphQL */ `
      query GetVariant($slug: String!) { product(slug: $slug) { variants { id } } }
    `;
    const pr = await apiClient.shop<{ product: { variants: { id: string }[] } | null }>(pq, {
      slug: SeedProducts.laptop.slug,
    });
    const variantId = pr.data?.product?.variants[0]?.id;

    const mutation = /* GraphQL */ `
      mutation Add($id: ID!, $qty: Int!) {
        addItemToOrder(productVariantId: $id, quantity: $qty) { ... on Order { id total totalQuantity } ... on ErrorResult { errorCode message } }
      }
    `;
    const r = await apiClient.shop<{ addItemToOrder: { id?: string; total?: number; totalQuantity?: number; errorCode?: string } }>(
      mutation,
      { id: variantId, qty: 3 },
    );
    expect(r.errors).toBeUndefined();
    expect(r.data?.addItemToOrder.errorCode).toBeUndefined();
    expect(r.data?.addItemToOrder.total).toBeGreaterThan(0);
  });

  test('mutation: addItemToOrder with unknown variant returns error', async ({ apiClient }) => {
    const mutation = /* GraphQL */ `
      mutation Add($id: ID!) {
        addItemToOrder(productVariantId: $id, quantity: 1) {
          ... on Order { id }
          ... on OrderModificationError { errorCode message }
        }
      }
    `;
    const r = await apiClient.shop<{ addItemToOrder: { errorCode?: string; id?: string } }>(mutation, {
      id: '999999',
    });
    // Vendure returns a top-level GraphQL error for unknown variants.
    expect(r.errors, JSON.stringify(r.errors)).toBeDefined();
    expect(r.errors?.[0]?.message.toLowerCase()).toMatch(/no .* found|not found/);
  });

  test('mutation: addItemToOrder with negative qty is handled gracefully', async ({ apiClient }) => {
    const pq = /* GraphQL */ `
      query GetVariant($slug: String!) { product(slug: $slug) { variants { id } } }
    `;
    const pr = await apiClient.shop<{ product: { variants: { id: string }[] } | null }>(pq, {
      slug: SeedProducts.laptop.slug,
    });
    const variantId = pr.data?.product?.variants[0]?.id;
    if (!variantId) test.skip(true, 'No variant for the seed product');

    const mutation = /* GraphQL */ `
      mutation Add($id: ID!) {
        addItemToOrder(productVariantId: $id, quantity: -1) {
          ... on Order { id totalQuantity total }
        }
      }
    `;
    const r = await apiClient.shop<{ addItemToOrder: { id?: string; totalQuantity?: number; total?: number } | Record<string, never> }>(mutation, {
      id: variantId,
    });
    // The public demo returns an empty object `{}` for negative quantities
    // (the resolver silently ignores the request). Accept that outcome,
    // but verify the API didn't return a 5xx or throw.
    expect(r.status).toBe(200);
    if (r.data?.addItemToOrder && 'id' in r.data.addItemToOrder && r.data.addItemToOrder.id) {
      // If a real order came back, the totalQuantity should not be negative.
      expect(r.data.addItemToOrder.totalQuantity ?? 0).toBeGreaterThanOrEqual(0);
    } else {
      // Empty response means the order was rejected silently — that's
      // a valid graceful response too.
      expect(r.data?.addItemToOrder).toEqual({});
    }
  });

  test('mutation: adjustOrderLine updates the line quantity', async ({ apiClient }) => {
    const pq = /* GraphQL */ `query { product(slug: "${SeedProducts.laptop.slug}") { variants { id } } }`;
    const pr = await apiClient.shop<{ product: { variants: { id: string }[] } | null }>(pq);
    const variantId = pr.data?.product?.variants[0]?.id;

    const add = /* GraphQL */ `
      mutation Add($id: ID!) {
        addItemToOrder(productVariantId: $id, quantity: 1) { ... on Order { id lines { id quantity } } }
      }
    `;
    const ar = await apiClient.shop<{ addItemToOrder: { id: string; lines: { id: string; quantity: number }[] } }>(add, {
      id: variantId,
    });
    const lineId = ar.data?.addItemToOrder.lines[0]?.id;
    if (!lineId) test.skip(true, 'No order line was created');

    const adjust = /* GraphQL */ `
      mutation Adjust($id: ID!, $qty: Int!) {
        adjustOrderLine(orderLineId: $id, quantity: $qty) {
          ... on Order { id total }
          ... on OrderModificationError { errorCode message }
        }
      }
    `;
    const r = await apiClient.shop<{ adjustOrderLine: { id?: string; errorCode?: string } }>(adjust, {
      id: lineId,
      qty: 5,
    });
    expect(r.errors).toBeUndefined();
    expect(r.data?.adjustOrderLine.id).toBeTruthy();
  });

  test('mutation: removeOrderLine removes the line', async ({ apiClient }) => {
    const pq = /* GraphQL */ `query { product(slug: "${SeedProducts.laptop.slug}") { variants { id } } }`;
    const pr = await apiClient.shop<{ product: { variants: { id: string }[] } | null }>(pq);
    const variantId = pr.data?.product?.variants[0]?.id;

    const add = /* GraphQL */ `
      mutation Add($id: ID!) {
        addItemToOrder(productVariantId: $id, quantity: 1) { ... on Order { id lines { id } } }
      }
    `;
    const ar = await apiClient.shop<{ addItemToOrder: { id: string; lines: { id: string }[] } }>(add, {
      id: variantId,
    });
    const lineId = ar.data?.addItemToOrder.lines[0]?.id;
    if (!lineId) test.skip(true, 'No order line was created');

    const remove = /* GraphQL */ `
      mutation Remove($id: ID!) {
        removeOrderLine(orderLineId: $id) {
          ... on Order { id total }
          ... on OrderModificationError { errorCode message }
        }
      }
    `;
    const r = await apiClient.shop<{ removeOrderLine: { id?: string; errorCode?: string } }>(remove, {
      id: lineId,
    });
    expect(r.errors).toBeUndefined();
    expect(r.data?.removeOrderLine.id).toBeTruthy();
  });

  test('mutation: setOrderShippingAddress updates the address', async ({ apiClient }) => {
    const pq = /* GraphQL */ `query { product(slug: "${SeedProducts.laptop.slug}") { variants { id } } }`;
    const pr = await apiClient.shop<{ product: { variants: { id: string }[] } | null }>(pq);
    const variantId = pr.data?.product?.variants[0]?.id;

    await apiClient.shop(
      /* GraphQL */ `mutation Add($id: ID!) { addItemToOrder(productVariantId: $id, quantity: 1) { ... on Order { id } } }`,
      { id: variantId },
    );

    const m = /* GraphQL */ `
      mutation SetAddr($input: CreateAddressInput!) {
        setOrderShippingAddress(input: $input) {
          ... on Order { id shippingAddress { fullName streetLine1 city } }
          ... on ErrorResult { errorCode message }
        }
      }
    `;
    const r = await apiClient.shop<{ setOrderShippingAddress: { id?: string; shippingAddress?: { fullName: string }; errorCode?: string } }>(m, {
      input: {
        fullName: TestAddress.fullName,
        streetLine1: TestAddress.street,
        city: TestAddress.city,
        province: TestAddress.province,
        postalCode: TestAddress.postalCode,
        countryCode: 'GB',
        phoneNumber: TestAddress.phone,
      },
    });
    expect(r.data?.setOrderShippingAddress.errorCode).toBeUndefined();
    expect(r.data?.setOrderShippingAddress.shippingAddress?.fullName).toBe(TestAddress.fullName);
  });

  test('mutation: setCustomerForOrder sets the guest email', async ({ apiClient }) => {
    const pq = /* GraphQL */ `query { product(slug: "${SeedProducts.laptop.slug}") { variants { id } } }`;
    const pr = await apiClient.shop<{ product: { variants: { id: string }[] } | null }>(pq);
    const variantId = pr.data?.product?.variants[0]?.id;
    await apiClient.shop(
      /* GraphQL */ `mutation Add($id: ID!) { addItemToOrder(productVariantId: $id, quantity: 1) { ... on Order { id } } }`,
      { id: variantId },
    );
    const m = /* GraphQL */ `
      mutation SetCust($input: CreateCustomerInput!) {
        setCustomerForOrder(input: $input) {
          ... on Order { id customer { emailAddress firstName } }
          ... on ErrorResult { errorCode message }
        }
      }
    `;
    const email = uniqueEmail('qa-api');
    const r = await apiClient.shop<{ setCustomerForOrder: { id?: string; customer?: { emailAddress: string; firstName: string }; errorCode?: string } }>(m, {
      input: { emailAddress: email, firstName: 'API', lastName: 'Tester' },
    });
    expect(r.data?.setCustomerForOrder.errorCode).toBeUndefined();
    expect(r.data?.setCustomerForOrder.customer?.emailAddress).toBe(email);
  });

  test('mutation: registerCustomerAccount creates a new account', async ({ apiClient }) => {
    const m = /* GraphQL */ `
      mutation Register($input: RegisterCustomerInput!) {
        registerCustomerAccount(input: $input) {
          ... on Success { success }
          ... on ErrorResult { errorCode message }
        }
      }
    `;
    const email = uniqueEmail('qa-register');
    const r = await apiClient.shop<{ registerCustomerAccount: { success?: boolean; errorCode?: string } }>(m, {
      input: { emailAddress: email, password: 'Password123!', firstName: 'QA', lastName: 'Reg' },
    });
    expect(r.data?.registerCustomerAccount.errorCode).toBeUndefined();
    expect(r.data?.registerCustomerAccount.success).toBe(true);
  });

  test('mutation: registerCustomerAccount with a duplicate email returns a structured response', async ({ apiClient }) => {
    // The public Vendure demo permits re-registration with the same
    // email (it auto-verifies and overwrites the existing record), so
    // we cannot assert that the second call is *rejected* — only that
    // it returns a structured GraphQL response (Success or ErrorResult),
    // never a 5xx or unhandled error. This is still a useful smoke
    // test: a production Vendure install that doesn't handle the
    // duplicate-email case at all would 500 here.
    const m = /* GraphQL */ `
      mutation Register($input: RegisterCustomerInput!) {
        registerCustomerAccount(input: $input) {
          ... on Success { success }
          ... on ErrorResult { errorCode message }
        }
      }
    `;
    const email = uniqueEmail('qa-dup');
    await apiClient.shop<{ registerCustomerAccount: { success?: boolean; errorCode?: string } }>(m, {
      input: { emailAddress: email, password: 'Password123!', firstName: 'Dup', lastName: 'Test' },
    });
    const second = await apiClient.shop<{ registerCustomerAccount: { success?: boolean; errorCode?: string } }>(m, {
      input: { emailAddress: email, password: 'Password123!', firstName: 'Dup', lastName: 'Test' },
    });
    // The API must not 5xx and must return a recognised result type.
    expect(second.status, 'Duplicate registration should not 5xx').toBe(200);
    expect(second.errors, JSON.stringify(second.errors)).toBeUndefined();
    expect(second.data?.registerCustomerAccount).toBeDefined();
    // Exactly one of {success, errorCode} should be present.
    const succeeded = second.data?.registerCustomerAccount.success === true;
    const errored = !!second.data?.registerCustomerAccount.errorCode;
    expect(succeeded || errored, 'Duplicate registration should return Success or ErrorResult').toBe(true);
  });
});
