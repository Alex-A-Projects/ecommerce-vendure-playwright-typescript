/**
 * Vendure test data — public demo credentials, seed products, and
 * reusable builders for the GraphQL tests.
 *
 * All product slugs and collection slugs below are verified against
 * the live public demo at https://demo.vendure.io/.
 */

/* -----------------------------------------------------------------------
 * Public demo store — public read access, no auth needed for shop-api
 * --------------------------------------------------------------------- */
export const VendureEndpoints = {
  storefront: 'https://storefront.demo.vendure.io',
  shopApi: 'https://demo.vendure.io/shop-api',
  adminApi: 'https://demo.vendure.io/admin-api',
} as const;

/* -----------------------------------------------------------------------
 * Channel code used by the public demo.
 *
 * The Vendure demo's default channel is "__default_channel__", not
 * "default". The DB tests use this constant rather than hardcoding it.
 * --------------------------------------------------------------------- */
export const DefaultChannelCode = '__default_channel__';

/* -----------------------------------------------------------------------
 * Admin credentials for the public demo
 * --------------------------------------------------------------------- */
export const AdminCredentials = {
  username: 'admin',
  password: 'admin',
} as const;

/* -----------------------------------------------------------------------
 * Seeded customer from the Vendure demo dataset
 *   test@vendure.io / test
 *
 *   Note: the first/last name on this account varies as the demo is
 *   reset, so the DB tests only assert on the email address.
 * --------------------------------------------------------------------- */
export const SeededCustomer = {
  emailAddress: 'test@vendure.io',
  password: 'test',
  firstName: 'Rio',
  lastName: 'Test',
} as const;

/* -----------------------------------------------------------------------
 * Known seed products (from the public Vendure demo seed)
 * --------------------------------------------------------------------- */
export const SeedProducts = {
  /** Cheap entry-level laptop (id=1) — used for cart combinatorics. */
  laptop: { slug: 'laptop', nameContains: 'Laptop' },
  /** A 32" monitor used in cart combinatorics. */
  monitor: { slug: '32-inch-monitor', nameContains: '32-Inch Monitor' },
  /** A road bike used for highest-price assertions. */
  roadBike: { slug: 'road-bike', nameContains: 'Road Bike' },
  /** A football used for cart tests. */
  football: { slug: 'football', nameContains: 'Football' },
  /** A wooden stool used in cart combinatorics. */
  woodenStool: { slug: 'wooden-stool', nameContains: 'Wooden Stool' },
  /** A modern cafe chair. */
  cafeChair: { slug: 'modern-cafe-chair', nameContains: 'Modern Cafe Chair' },
} as const;

/* -----------------------------------------------------------------------
 * Known seed collections (public demo)
 * --------------------------------------------------------------------- */
export const SeedCollections = {
  all: { slug: '__all__', nameContains: 'All' },
  electronics: { slug: 'electronics', nameContains: 'Electronics' },
  computers: { slug: 'computers', nameContains: 'Computers' },
  furniture: { slug: 'furniture', nameContains: 'Furniture' },
  equipment: { slug: 'equipment', nameContains: 'Equipment' },
  cameraPhoto: { slug: 'camera-photo', nameContains: 'Camera' },
  homeGarden: { slug: 'home-garden', nameContains: 'Home & Garden' },
  plants: { slug: 'plants', nameContains: 'Plants' },
  footwear: { slug: 'footwear', nameContains: 'Footwear' },
  sportsOutdoor: { slug: 'sports-outdoor', nameContains: 'Sports' },
} as const;

/* -----------------------------------------------------------------------
 * Known search terms
 * --------------------------------------------------------------------- */
export const SeedSearchTerms = {
  noResults: 'xyzzqq__no_such_product',
  broad: 'bike',
  exactMatch: 'laptop',
  multiWord: 'road bike',
  plural: 'bikes',
  monitor: 'monitor',
} as const;

/* -----------------------------------------------------------------------
 * Test billing / shipping address
 * --------------------------------------------------------------------- */
export const TestAddress = {
  fullName: 'Alex QA',
  street: '123 Test Street',
  city: 'Testville',
  province: 'Testshire',
  postalCode: 'TE1 1ST',
  country: 'United Kingdom',
  phone: '+44 1234 567890',
} as const;

/* -----------------------------------------------------------------------
 * Account-type helpers (analogous to the ParaBank project's AccountTypes)
 * --------------------------------------------------------------------- */
export const ProductSortOptions = [
  'NAME',
  'PRICE',
  'CREATED_AT',
  'CREATED_AT_DESC',
  'PRICE_DESC',
  'NAME_DESC',
  'RELEVANCE',
] as const;

export type ProductSortOption = (typeof ProductSortOptions)[number];
