import { test, expect } from '../../fixtures/testFixtures';

/**
 * Schema introspection — verifies the GraphQL schema exposes the
 * core queries the storefront depends on.
 */
test.describe('GraphQL schema introspection', () => {
  test('shop API: __schema has the Query type', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Introspect {
        __schema { queryType { name } }
      }
    `;
    const r = await apiClient.shop<{ __schema: { queryType: { name: string } } }>(q);
    expect(r.data?.__schema.queryType.name).toBe('Query');
  });

  test('shop API: __schema has the Mutation type', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Introspect {
        __schema { mutationType { name } }
      }
    `;
    const r = await apiClient.shop<{ __schema: { mutationType: { name: string } | null } }>(q);
    expect(r.data?.__schema.mutationType?.name).toBe('Mutation');
  });

  for (const field of [
    'product',
    'products',
    'collection',
    'collections',
    'search',
    'activeOrder',
    'activeCustomer',
    'activeChannel',
  ]) {
    test(`shop API: __schema has Query.${field}`, async ({ apiClient }) => {
      const q = /* GraphQL */ `
        query Introspect {
          __schema { queryType { fields { name } } }
        }
      `;
      const r = await apiClient.shop<{ __schema: { queryType: { fields: { name: string }[] } } }>(q);
      const names = r.data?.__schema.queryType.fields.map((f) => f.name) ?? [];
      expect(names, `Shop API Query should include "${field}"`).toContain(field);
    });
  }

  for (const field of [
    'addItemToOrder',
    'adjustOrderLine',
    'removeOrderLine',
    'setOrderShippingAddress',
    'setCustomerForOrder',
    'applyCouponCode',
    'removeCouponCode',
    'login',
    'logout',
    'registerCustomerAccount',
  ]) {
    test(`shop API: __schema has Mutation.${field}`, async ({ apiClient }) => {
      const q = /* GraphQL */ `
        query Introspect {
          __schema { mutationType { fields { name } } }
        }
      `;
      const r = await apiClient.shop<{
        __schema: { mutationType: { fields: { name: string }[] } | null };
      }>(q);
      const fields = r.data?.__schema.mutationType?.fields.map((f) => f.name) ?? [];
      expect(fields, `Shop API Mutation should include "${field}"`).toContain(field);
    });
  }

  test('shop API: Product type has the expected fields', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Introspect {
        __schema { types { name fields { name } } }
      }
    `;
    const r = await apiClient.shop<{ __schema: { types: { name: string; fields: { name: string }[] }[] } }>(q);
    const productType = r.data?.__schema.types.find((t) => t.name === 'Product');
    expect(productType, 'Product type should exist in the schema').toBeDefined();
    const fieldNames = (productType?.fields ?? []).map((f) => f.name);
    for (const expected of ['id', 'name', 'slug', 'description', 'enabled', 'variants']) {
      expect(fieldNames, `Product.${expected} should exist`).toContain(expected);
    }
  });

  test('shop API: ProductVariant type has price fields', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Introspect {
        __schema { types { name fields { name } } }
      }
    `;
    const r = await apiClient.shop<{ __schema: { types: { name: string; fields: { name: string }[] }[] } }>(q);
    const variant = r.data?.__schema.types.find((t) => t.name === 'ProductVariant');
    const fieldNames = (variant?.fields ?? []).map((f) => f.name);
    for (const expected of ['id', 'name', 'price', 'priceWithTax', 'sku', 'stockLevel']) {
      expect(fieldNames, `ProductVariant.${expected} should exist`).toContain(expected);
    }
  });

  test('shop API: Order type has totals and lines', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Introspect {
        __schema { types { name fields { name } } }
      }
    `;
    const r = await apiClient.shop<{ __schema: { types: { name: string; fields: { name: string }[] }[] } }>(q);
    const order = r.data?.__schema.types.find((t) => t.name === 'Order');
    const fieldNames = (order?.fields ?? []).map((f) => f.name);
    for (const expected of ['id', 'code', 'state', 'total', 'totalWithTax', 'lines']) {
      expect(fieldNames, `Order.${expected} should exist`).toContain(expected);
    }
  });

  test('shop API: __type(kind=ENUM) lists SortOrder', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Introspect($name: String!) {
        __type(name: $name) { name kind }
      }
    `;
    const r = await apiClient.shop<{ __type: { name: string; kind: string } | null }>(q, {
      name: 'SortOrder',
    });
    expect(r.data?.__type?.kind).toBe('ENUM');
  });

  test('shop API: __type(kind=OBJECT) lists Asset', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Introspect($name: String!) {
        __type(name: $name) { name kind }
      }
    `;
    const r = await apiClient.shop<{ __type: { name: string; kind: string } | null }>(q, {
      name: 'Asset',
    });
    expect(r.data?.__type?.kind).toBe('OBJECT');
  });

  test('admin API: __schema has the Query type', async ({ apiClient }) => {
    const q = /* GraphQL */ `query { __schema { queryType { name } } }`;
    const r = await apiClient.admin<{ __schema: { queryType: { name: string } } }>(q);
    expect(r.data?.__schema.queryType.name).toBe('Query');
  });

  test('admin API: __schema has the Mutation type', async ({ apiClient }) => {
    const q = /* GraphQL */ `query { __schema { mutationType { name } } }`;
    const r = await apiClient.admin<{ __schema: { mutationType: { name: string } | null } }>(q);
    expect(r.data?.__schema.mutationType?.name).toBe('Mutation');
  });
});
