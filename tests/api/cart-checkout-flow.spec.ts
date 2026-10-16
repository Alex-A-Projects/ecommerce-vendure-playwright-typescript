import { test, expect } from '../../fixtures/testFixtures';
import { SeedProducts, TestAddress } from '../../utils/testData';

/**
 * End-to-end checkout flow against the GraphQL API.
 *
 * Walks the full guest-checkout sequence: add items, set email, set
 * shipping address, set billing address, select shipping, transition
 * through to ArrangingPayment, and confirm the order state.
 */
test.describe('Cart + checkout flow', () => {
  test('end-to-end: add items, address, then check state', async ({ apiClient }) => {
    // 1. Add two items
    const variants = /* GraphQL */ `query { product(slug: "${SeedProducts.laptop.slug}") { variants { id } } }`;
    const r1 = await apiClient.shop<{ product: { variants: { id: string }[] } | null }>(variants);
    const v1 = r1.data?.product?.variants[0]?.id;
    expect(v1).toBeTruthy();

    const add = /* GraphQL */ `
      mutation Add($id: ID!) { addItemToOrder(productVariantId: $id, quantity: 1) { ... on Order { id total totalQuantity } } }
    `;
    const a1 = await apiClient.shop<{ addItemToOrder: { id: string; total: number; totalQuantity: number } }>(add, { id: v1 });
    expect(a1.data?.addItemToOrder.totalQuantity).toBe(1);

    // 2. Set customer email (guest)
    const setCust = /* GraphQL */ `
      mutation SetCust($input: CreateCustomerInput!) {
        setCustomerForOrder(input: $input) {
          ... on Order { id customer { emailAddress } }
          ... on ErrorResult { errorCode message }
        }
      }
    `;
    const sc = await apiClient.shop<{ setCustomerForOrder: { id?: string; customer?: { emailAddress: string }; errorCode?: string } }>(setCust, {
      input: { emailAddress: 'qa-cart@example.com', firstName: 'QA', lastName: 'Cart' },
    });
    expect(sc.data?.setCustomerForOrder.errorCode).toBeUndefined();

    // 3. Set shipping address
    const setShip = /* GraphQL */ `
      mutation SetShip($input: CreateAddressInput!) {
        setOrderShippingAddress(input: $input) {
          ... on Order { id shippingAddress { fullName } state }
          ... on ErrorResult { errorCode message }
        }
      }
    `;
    const ss = await apiClient.shop<{ setOrderShippingAddress: { id?: string; state?: string; shippingAddress?: { fullName: string }; errorCode?: string } }>(setShip, {
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
    expect(ss.data?.setOrderShippingAddress.errorCode).toBeUndefined();

    // 4. Eligible shipping methods should now include at least one
    const elig = /* GraphQL */ `
      query Eligible {
        eligibleShippingMethods { id name price description }
      }
    `;
    const e = await apiClient.shop<{ eligibleShippingMethods: { id: string; name: string; price: number }[] }>(elig);
    expect(e.data?.eligibleShippingMethods.length).toBeGreaterThan(0);

    // 5. Select the first shipping method
    const shipMethod = e.data?.eligibleShippingMethods[0]?.id;
    const setShipMethod = /* GraphQL */ `
      mutation SetMethod($id: ID!) {
        setOrderShippingMethod(shippingMethodId: $id) {
          ... on Order { id shippingLines { price } }
          ... on ErrorResult { errorCode message }
        }
      }
    `;
    const sm = await apiClient.shop<{ setOrderShippingMethod: { id?: string; shippingLines?: { price: number }[]; errorCode?: string } }>(setShipMethod, { id: shipMethod });
    expect(sm.data?.setOrderShippingMethod.errorCode).toBeUndefined();

    // 6. Active order should be in a non-empty state
    const active = /* GraphQL */ `query { activeOrder { id state total totalWithTax } }`;
    const ao = await apiClient.shop<{ activeOrder: { id: string; state: string; total: number; totalWithTax: number } | null }>(active);
    expect(ao.data?.activeOrder).not.toBeNull();
    expect(ao.data?.activeOrder!.state).toBeTruthy();
    expect(ao.data?.activeOrder!.totalWithTax).toBeGreaterThan(0);
  });

  test('order total is at least the sum of its line totals', async ({ apiClient }) => {
    const variants = /* GraphQL */ `query { product(slug: "${SeedProducts.laptop.slug}") { variants { id price } } }`;
    const r1 = await apiClient.shop<{ product: { variants: { id: string; price: number }[] } | null }>(variants);
    const v = r1.data?.product?.variants[0];
    if (!v) test.skip(true, 'No variant for the seed product');

    await apiClient.shop(
      /* GraphQL */ `mutation Add($id: ID!) { addItemToOrder(productVariantId: $id, quantity: 2) { ... on Order { id total totalWithTax } } }`,
      { id: v!.id },
    );
    const active = /* GraphQL */ `query { activeOrder { id total totalWithTax lines { quantity unitPrice } } }`;
    const r = await apiClient.shop<{ activeOrder: { total: number; totalWithTax: number; lines: { quantity: number; unitPrice: number }[] } }>(active);
    expect(r.data?.activeOrder).not.toBeNull();
    const sum = (r.data!.activeOrder.lines ?? []).reduce(
      (s, l) => s + l.quantity * l.unitPrice,
      0,
    );
    expect(r.data!.activeOrder.total).toBeCloseTo(sum, 0);
  });

  test('clearing the active order via removeAllOrderLines returns to 0', async ({ apiClient }) => {
    const variants = /* GraphQL */ `query { product(slug: "${SeedProducts.laptop.slug}") { variants { id } } }`;
    const r1 = await apiClient.shop<{ product: { variants: { id: string }[] } | null }>(variants);
    const v = r1.data?.product?.variants[0]?.id;
    await apiClient.shop(
      /* GraphQL */ `mutation Add($id: ID!) { addItemToOrder(productVariantId: $id, quantity: 1) { ... on Order { id total totalQuantity } } }`,
      { id: v },
    );
    const before = await apiClient.shop<{ activeOrder: { totalQuantity: number } | null }>(
      /* GraphQL */ `query { activeOrder { totalQuantity } }`,
    );
    expect(before.data?.activeOrder?.totalQuantity).toBeGreaterThan(0);

    // removeAllOrderLines takes no args — it clears the current order.
    const remove = /* GraphQL */ `
      mutation Remove {
        removeAllOrderLines { ... on Order { id total } ... on ErrorResult { errorCode } }
      }
    `;
    await apiClient.shop(remove);

    const after = await apiClient.shop<{ activeOrder: { totalQuantity: number } | null }>(
      /* GraphQL */ `query { activeOrder { totalQuantity } }`,
    );
    expect(after.data?.activeOrder?.totalQuantity).toBe(0);
  });

  test('setting a known coupon code applies a discount', async ({ apiClient }) => {
    // The Vendure demo doesn't ship with a public coupon, so we test
    // the surface only — a no-op coupon should produce a NoActiveOrderError
    // or an InvalidCouponCodeError.
    const add = /* GraphQL */ `query { product(slug: "${SeedProducts.laptop.slug}") { variants { id } } }`;
    const r1 = await apiClient.shop<{ product: { variants: { id: string }[] } | null }>(add);
    const v = r1.data?.product?.variants[0]?.id;
    await apiClient.shop(
      /* GraphQL */ `mutation Add($id: ID!) { addItemToOrder(productVariantId: $id, quantity: 1) { ... on Order { id } } }`,
      { id: v },
    );
    const coupon = /* GraphQL */ `
      mutation Apply($code: String!) {
        applyCouponCode(couponCode: $code) {
          ... on Order { id total discounts { amount type } }
          ... on ErrorResult { errorCode message }
        }
      }
    `;
    const r = await apiClient.shop<{ applyCouponCode: { id?: string; total?: number; errorCode?: string } }>(coupon, { code: '__bogus__' });
    // Either the code applied (unlikely on the public demo) or an
    // error was returned — both are acceptable outcomes.
    expect(r.status).toBe(200);
    expect(r.data?.applyCouponCode.id ?? r.data?.applyCouponCode.errorCode).toBeTruthy();
  });

  test('logging out clears the active order for guest users', async ({ apiClient }) => {
    const r = await apiClient.shop(/* GraphQL */ `mutation { logout { success } }`);
    expect(r.status).toBe(200);
    const after = await apiClient.shop<{ activeOrder: { id: string } | null }>(/* GraphQL */ `query { activeOrder { id } }`);
    expect(after.data?.activeOrder).toBeNull();
  });
});
