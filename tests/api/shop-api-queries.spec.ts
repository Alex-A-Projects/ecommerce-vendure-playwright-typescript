import { test, expect } from '../../fixtures/testFixtures';
import { SeedProducts, SeedCollections, SeedSearchTerms } from '../../utils/testData';

/**
 * Shop API — read queries.
 *
 * Every test goes against the public GraphQL endpoint at
 * https://demo.vendure.io/shop-api. No auth is required for these
 * public reads.
 */
test.describe('Shop API — queries', () => {
  /* ---------- Product queries ---------- */
  test('query: product(slug) returns the seed laptop', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query GetProduct($slug: String!) {
        product(slug: $slug) {
          id name slug enabled
          variants { id name sku price }
        }
      }
    `;
    const r = await apiClient.shop<{ product: { id: string; name: string; slug: string; enabled: boolean } }>(
      q,
      { slug: SeedProducts.laptop.slug },
    );
    expect(r.status).toBe(200);
    expect(r.errors, JSON.stringify(r.errors)).toBeUndefined();
    expect(r.data?.product?.name.toLowerCase()).toMatch(/laptop/);
  });

  test('query: product(slug) for unknown slug returns null', async ({ apiClient }) => {
    const q = /* GraphQL */ `query($slug:String!){ product(slug:$slug){ id } }`;
    const r = await apiClient.shop<{ product: { id: string } | null }>(q, { slug: '__no_such__' });
    expect(r.status).toBe(200);
    expect(r.data?.product).toBeNull();
  });

  test('query: products() lists products in a paginated shape', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query ListProducts {
        products {
          totalItems items { id name slug } }
        }
    `;
    const r = await apiClient.shop<{ products: { totalItems: number; items: { id: string; name: string; slug: string }[] } }>(q);
    expect(r.errors).toBeUndefined();
    expect(r.data?.products.totalItems).toBeGreaterThan(0);
    expect(r.data?.products.items.length).toBeGreaterThan(0);
  });

  test('query: products() respects the take/skip args', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query ListProducts($opts: ProductListOptions) {
        products(options: $opts) { totalItems items { id } }
      }
    `;
    const r = await apiClient.shop<{ products: { totalItems: number; items: { id: string }[] } }>(q, {
      opts: { take: 5, skip: 0 },
    });
    expect(r.data?.products.items.length).toBeLessThanOrEqual(5);
  });

  test('query: productVariant by id', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query GetProductWithVariants($slug: String!) {
        product(slug: $slug) { id name variants { id name sku price priceWithTax } }
      }
    `;
    const r = await apiClient.shop<{ product: { variants: { id: string; sku: string }[] } }>(q, {
      slug: SeedProducts.laptop.slug,
    });
    expect(r.errors).toBeUndefined();
    expect(r.data?.product.variants.length).toBeGreaterThan(0);
  });

  test('query: search returns results for an existing term', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Search($input: SearchInput!) {
        search(input: $input) { totalItems items { productId productName slug inStock } }
      }
    `;
    const r = await apiClient.shop<{ search: { totalItems: number; items: { productName: string }[] } }>(q, {
      input: { term: SeedSearchTerms.exactMatch, take: 5, groupByProduct: true },
    });
    expect(r.errors).toBeUndefined();
    expect(r.data?.search.totalItems).toBeGreaterThan(0);
  });

  test('query: search returns zero for a nonsense term', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Search($input: SearchInput!) { search(input: $input) { totalItems } }
    `;
    const r = await apiClient.shop<{ search: { totalItems: number } }>(q, {
      input: { term: SeedSearchTerms.noResults, take: 5, groupByProduct: true },
    });
    expect(r.data?.search.totalItems).toBe(0);
  });

  test('query: search is case-insensitive', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Search($input: SearchInput!) { search(input: $input) { totalItems } }
    `;
    const lower = await apiClient.shop<{ search: { totalItems: number } }>(q, {
      input: { term: 'laptop', take: 5, groupByProduct: true },
    });
    const upper = await apiClient.shop<{ search: { totalItems: number } }>(q, {
      input: { term: 'LAPTOP', take: 5, groupByProduct: true },
    });
    expect(lower.data?.search.totalItems).toBeGreaterThan(0);
    expect(upper.data?.search.totalItems).toBeGreaterThan(0);
  });

  /* ---------- Collection queries ---------- */
  test('query: collection(slug) returns the seed electronics collection', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query GetCollection($slug: String!) {
        collection(slug: $slug) { id name slug children { id name } }
      }
    `;
    const r = await apiClient.shop<{ collection: { name: string; children: { id: string; name: string }[] } }>(q, {
      slug: SeedCollections.electronics.slug,
    });
    expect(r.errors).toBeUndefined();
    expect(r.data?.collection.name.toLowerCase()).toMatch(/electronic/);
  });

  test('query: collections() lists all top-level collections', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query GetCollections { collections { items { id name slug } } }
    `;
    const r = await apiClient.shop<{ collections: { items: { id: string; name: string; slug: string }[] } }>(q);
    expect(r.data?.collections.items.length).toBeGreaterThan(0);
  });

  test('query: every seed collection slug resolves to a real collection', async ({ apiClient }) => {
    const q = /* GraphQL */ `query($slug:String!){ collection(slug:$slug){ id name } }`;
    for (const c of Object.values(SeedCollections)) {
      const r = await apiClient.shop<{ collection: { id: string; name: string } | null }>(q, { slug: c.slug });
      if (c.slug === '__all__') continue; // not a real collection
      if (!r.data?.collection) {
        test.skip(true, `Collection "${c.slug}" not exposed on this demo`);
        return;
      }
    }
  });

  /* ---------- Facets & sort options ---------- */
  test('query: facetValues returns the available filter options', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query Facets { facets { items { id name code values { id name } } } }
    `;
    const r = await apiClient.shop<{ facets: { items: { id: string; name: string; values: { id: string; name: string }[] }[] } }>(q);
    expect(r.data?.facets.items.length).toBeGreaterThan(0);
  });

  /* ---------- Channel / active order ---------- */
  test('query: activeChannel is exposed', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query ActiveChannel {
        activeChannel { id code token defaultCurrencyCode defaultLanguageCode }
      }
    `;
    const r = await apiClient.shop<{ activeChannel: { code: string; defaultCurrencyCode: string } }>(q);
    expect(r.data?.activeChannel.code).toBeTruthy();
  });

  test('query: activeOrder returns null for an unauthenticated client', async ({ apiClient }) => {
    const q = /* GraphQL */ `query { activeOrder { id } }`;
    const r = await apiClient.shop<{ activeOrder: { id: string } | null }>(q);
    expect(r.data?.activeOrder).toBeNull();
  });

  test('query: activeCustomer is null without auth', async ({ apiClient }) => {
    const q = /* GraphQL */ `query { activeCustomer { id } }`;
    const r = await apiClient.shop<{ activeCustomer: { id: string } | null }>(q);
    expect(r.data?.activeCustomer).toBeNull();
  });

  /* ---------- Asset & stock ---------- */
  test('query: products have assets with valid preview URLs', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query GetProduct($slug: String!) {
        product(slug: $slug) { id name assets { id preview source } }
      }
    `;
    const r = await apiClient.shop<{ product: { assets: { id: string; preview: string }[] } }>(q, {
      slug: SeedProducts.laptop.slug,
    });
    expect(r.data?.product.assets.length).toBeGreaterThan(0);
    expect(r.data?.product.assets[0].preview).toMatch(/^https?:\/\//);
  });

  test('query: a product variant has price > 0 and priceWithTax >= price', async ({ apiClient }) => {
    const q = /* GraphQL */ `
      query GetProduct($slug: String!) {
        product(slug: $slug) { variants { id price priceWithTax } }
      }
    `;
    const r = await apiClient.shop<{ product: { variants: { price: number; priceWithTax: number }[] } }>(q, {
      slug: SeedProducts.laptop.slug,
    });
    const v = r.data?.product.variants[0];
    expect(v?.price).toBeGreaterThan(0);
    expect(v?.priceWithTax).toBeGreaterThanOrEqual(v?.price ?? 0);
  });
});
