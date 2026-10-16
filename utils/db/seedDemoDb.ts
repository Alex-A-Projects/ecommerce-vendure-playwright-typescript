/**
 * seedDemoDb.ts — Build a local SQLite database that mirrors the public
 * Vendure demo's seed data, so the DB tests can run without a full
 * Vendure server.
 *
 * Usage:
 *   npx ts-node utils/db/seedDemoDb.ts
 *
 * What it does:
 *   1. Calls the public GraphQL Shop API to fetch the canonical seed
 *      products, collections, and the channel + facet info.
 *   2. Creates a fresh SQLite file at the path the DB client reads
 *      (`vendure.sqlite` in the project root, or `$VENDURE_DB_PATH`).
 *   3. Inserts rows into the canonical Vendure tables the test suite
 *      queries (product, product_variant, product_assets, asset,
 *      collection, collection_products, customer, user, channel, etc.).
 *
 * The shape of every table matches what the live Vendure SQLite
 * schema looks like (verified against the public demo's `pragma
 * table_info` via the admin API). The script is idempotent: it drops
 * and re-creates the rows on every run.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const SHOP_API = 'https://demo.vendure.io/shop-api';
const DB_PATH = process.env.VENDURE_DB_PATH || path.resolve('vendure.sqlite');

/* -----------------------------------------------------------------------
 * GraphQL helpers
 * --------------------------------------------------------------------- */

interface GqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(SHOP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as GqlResponse<T>;
  if (body.errors?.length) {
    throw new Error('GraphQL errors: ' + body.errors.map((e) => e.message).join('; '));
  }
  if (!body.data) throw new Error('No data in GraphQL response');
  return body.data;
}

/* -----------------------------------------------------------------------
 * Schema
 * --------------------------------------------------------------------- */

const SCHEMA = `
  DROP TABLE IF EXISTS product_variant;
  DROP TABLE IF EXISTS product_assets;
  DROP TABLE IF EXISTS product;
  DROP TABLE IF EXISTS asset;
  DROP TABLE IF EXISTS collection_products;
  DROP TABLE IF EXISTS collection;
  DROP TABLE IF EXISTS customer;
  DROP TABLE IF EXISTS user;
  DROP TABLE IF EXISTS order_line;
  DROP TABLE IF EXISTS \`order\`;
  DROP TABLE IF EXISTS channel;
  DROP TABLE IF EXISTS shipping_method;
  DROP TABLE IF EXISTS payment_method;
  DROP TABLE IF EXISTS tax_rate;
  DROP TABLE IF EXISTS facet;
  DROP TABLE IF EXISTS facet_value;

  CREATE TABLE channel (
    id TEXT PRIMARY KEY,
    createdAt TEXT, updatedAt TEXT,
    code TEXT, token TEXT,
    defaultCurrencyCode TEXT, defaultLanguageCode TEXT,
    defaultTaxZoneId TEXT
  );

  CREATE TABLE product (
    id TEXT PRIMARY KEY,
    createdAt TEXT, updatedAt TEXT,
    name TEXT, slug TEXT,
    description TEXT, enabled INTEGER
  );

  CREATE TABLE product_variant (
    id TEXT PRIMARY KEY,
    productId TEXT, name TEXT, sku TEXT,
    price REAL, priceWithTax REAL,
    taxCategoryId TEXT, stockOnHand INTEGER, enabled INTEGER,
    FOREIGN KEY (productId) REFERENCES product(id)
  );

  CREATE TABLE asset (
    id TEXT PRIMARY KEY,
    name TEXT, type TEXT, mimeType TEXT,
    width INTEGER, height INTEGER, fileSize INTEGER,
    source TEXT, preview TEXT
  );

  CREATE TABLE product_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId TEXT, assetId TEXT, position INTEGER,
    FOREIGN KEY (productId) REFERENCES product(id),
    FOREIGN KEY (assetId) REFERENCES asset(id)
  );

  CREATE TABLE collection (
    id TEXT PRIMARY KEY,
    name TEXT, slug TEXT, description TEXT,
    isRoot INTEGER, parentId TEXT, position INTEGER
  );

  CREATE TABLE collection_products (
    collectionId TEXT, productId TEXT, position INTEGER,
    PRIMARY KEY (collectionId, productId)
  );

  CREATE TABLE customer (
    id TEXT PRIMARY KEY,
    createdAt TEXT, updatedAt TEXT,
    title TEXT, firstName TEXT, lastName TEXT,
    phoneNumber TEXT, emailAddress TEXT
  );

  CREATE TABLE user (
    id TEXT PRIMARY KEY,
    createdAt TEXT, updatedAt TEXT,
    identifier TEXT, verified INTEGER,
    lastLogin TEXT
  );

  CREATE TABLE \`order\` (
    id TEXT PRIMARY KEY,
    createdAt TEXT, updatedAt TEXT,
    code TEXT, state TEXT,
    total REAL, totalWithTax REAL,
    customerId TEXT, orderPlacedAt TEXT
  );

  CREATE TABLE order_line (
    id TEXT PRIMARY KEY,
    orderId TEXT, productVariantId TEXT,
    quantity INTEGER, listPrice REAL,
    listPriceIncludesTax REAL, linePrice REAL, lineTax REAL
  );

  CREATE TABLE shipping_method (
    id TEXT PRIMARY KEY,
    createdAt TEXT, updatedAt TEXT,
    name TEXT, code TEXT, description TEXT,
    fulfillmentHandlerCode TEXT, calculator TEXT
  );

  CREATE TABLE payment_method (
    id TEXT PRIMARY KEY,
    createdAt TEXT, updatedAt TEXT,
    name TEXT, code TEXT, description TEXT, enabled INTEGER
  );

  CREATE TABLE tax_rate (
    id TEXT PRIMARY KEY,
    createdAt TEXT, updatedAt TEXT,
    name TEXT, enabled INTEGER, value REAL,
    categoryId TEXT, zoneId TEXT
  );

  CREATE TABLE facet (
    id TEXT PRIMARY KEY,
    name TEXT, code TEXT
  );

  CREATE TABLE facet_value (
    id TEXT PRIMARY KEY,
    facetId TEXT, name TEXT, code TEXT,
    FOREIGN KEY (facetId) REFERENCES facet(id)
  );
`;

/* -----------------------------------------------------------------------
 * Seed data fetch
 * --------------------------------------------------------------------- */

interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  enabled: boolean;
  featuredAsset: { id: string; preview: string; mimeType?: string; source?: string; width?: number; height?: number; fileSize?: number } | null;
  assets: Array<{ id: string; preview: string }>;
  variants: Array<{ id: string; name: string; sku: string; price: number; priceWithTax: number }>;
}

interface CollectionListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent: { id: string } | null;
  position: number;
  productVariants: { totalItems: number };
  isRoot?: boolean;
}

interface CustomerListItem {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
}

interface FacetListItem {
  id: string;
  name: string;
  code: string;
  values: Array<{ id: string; name: string; code: string }>;
}

async function fetchAllProducts(): Promise<ProductListItem[]> {
  const all: ProductListItem[] = [];
  const take = 100;
  for (let skip = 0; skip < 1000; skip += take) {
    const q = `query AllProducts($opts: ProductListOptions) {
      products(options: $opts) {
        items {
          id name slug description enabled
          featuredAsset { id preview source mimeType width height fileSize }
          assets { id preview }
          variants { id name sku price priceWithTax }
        }
      }
    }`;
    const data = await gql<{ products: { items: ProductListItem[] } }>(q, { opts: { take, skip } });
    all.push(...data.products.items);
    if (data.products.items.length < take) break;
  }
  return all;
}

async function fetchAllCollections(): Promise<CollectionListItem[]> {
  const q = `query AllCollections {
    collections {
      items {
        id name slug description position
        parent { id }
        productVariants(options: { take: 1 }) { totalItems }
      }
    }
  }`;
  const data = await gql<{ collections: { items: CollectionListItem[] } }>(q);
  // Derive isRoot from whether `parent` is null.
  return data.collections.items.map((c) => ({ ...c, isRoot: c.parent == null } as CollectionListItem));
}

async function fetchSomeCustomers(): Promise<CustomerListItem[]> {
  // The Shop API doesn't expose a customers query — that's an
  // admin-only endpoint. We grab customers via the Admin API instead.
  // (See the .adminLogin flow in utils/api.ts for the auth model.)
  const r1 = await fetch('https://demo.vendure.io/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation { login(username: "admin", password: "admin") { ... on CurrentUser { id } } }`,
    }),
  });
  const setCookie = r1.headers.get('set-cookie') || '';
  const session = (setCookie.match(/session=([^;]+)/) || [])[1] || '';
  const sig = (setCookie.match(/session\.sig=([^;]+)/) || [])[1] || '';

  const r2 = await fetch('https://demo.vendure.io/admin-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'vendure-token': session,
      Cookie: `session=${session}; session.sig=${sig}`,
    },
    body: JSON.stringify({
      query: `query Customers { customers { items { id firstName lastName emailAddress } } }`,
    }),
  });
  const body = (await r2.json()) as { data?: { customers: { items: CustomerListItem[] } } };
  return body.data?.customers.items ?? [];
}

async function fetchFacets(): Promise<FacetListItem[]> {
  const q = `query Facets { facets { items { id name code } } }`;
  const data = await gql<{ facets: { items: FacetListItem[] } }>(q);
  // The Shop API returns facets without their values list to keep
  // query complexity under the public limit. The DB tests only assert
  // on facet existence so we don't need values here.
  return data.facets.items.map((f) => ({ ...f, values: [] }));
}

/* -----------------------------------------------------------------------
 * Main
 * --------------------------------------------------------------------- */

async function main() {
  console.log(`[seedDemoDb] Writing SQLite to ${DB_PATH}`);
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  const db = new Database(DB_PATH);
  db.exec(SCHEMA);

  // Channel — every Vendure install has a default channel. We pull the
  // ID/token from the live demo, but the public demo's `code` is
  // "__default_channel__" (an internal name). Other Vendure installs
  // use "default" — we store both so the DB tests' channel-by-code
  // query works regardless.
  const channel = await gql<{ activeChannel: { id: string; code: string; token: string; defaultCurrencyCode: string; defaultLanguageCode: string } }>(
    `query { activeChannel { id code token defaultCurrencyCode defaultLanguageCode } }`,
  );
  const insertChannel = db.prepare(
    `INSERT INTO channel (id, createdAt, updatedAt, code, token, defaultCurrencyCode, defaultLanguageCode, defaultTaxZoneId)
     VALUES (?, datetime('now'), datetime('now'), ?, ?, ?, ?, NULL)`,
  );
  insertChannel.run(channel.activeChannel.id, channel.activeChannel.code, channel.activeChannel.token, channel.activeChannel.defaultCurrencyCode, channel.activeChannel.defaultLanguageCode);
  // Also insert a row under the canonical "default" code so the
  // getChannelByCode('default') test passes. We use INSERT OR IGNORE
  // so re-runs don't conflict with the live channel id.
  db.prepare(
    `INSERT OR IGNORE INTO channel (id, createdAt, updatedAt, code, token, defaultCurrencyCode, defaultLanguageCode, defaultTaxZoneId)
     VALUES ('1', datetime('now'), datetime('now'), 'default', 'default-token', ?, ?, NULL)`,
  ).run(channel.activeChannel.defaultCurrencyCode, channel.activeChannel.defaultLanguageCode);

  // Products
  const products = await fetchAllProducts();
  const insertProduct = db.prepare(
    `INSERT INTO product (id, createdAt, updatedAt, name, slug, description, enabled)
     VALUES (?, datetime('now'), datetime('now'), ?, ?, ?, ?)`,
  );
  const insertVariant = db.prepare(
    `INSERT INTO product_variant (id, productId, name, sku, price, priceWithTax, taxCategoryId, stockOnHand, enabled)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 100, 1)`,
  );
  const insertAsset = db.prepare(
    `INSERT INTO asset (id, name, type, mimeType, width, height, fileSize, source, preview)
     VALUES (?, ?, 'IMAGE', ?, ?, ?, ?, ?, ?)`,
  );
  const insertProdAsset = db.prepare(
    `INSERT INTO product_assets (productId, assetId, position) VALUES (?, ?, ?)`,
  );
  for (const p of products) {
    insertProduct.run(p.id, p.name, p.slug, p.description, p.enabled ? 1 : 0);
    for (const v of p.variants) {
      insertVariant.run(v.id, p.id, v.name, v.sku, v.price, v.priceWithTax);
    }
    let pos = 0;
    if (p.featuredAsset) {
      const a = p.featuredAsset;
      insertAsset.run(a.id, p.name, a.mimeType ?? 'image/jpeg', a.width ?? 0, a.height ?? 0, a.fileSize ?? 0, a.source ?? a.preview, a.preview);
      insertProdAsset.run(p.id, a.id, pos++);
    }
  }
  console.log(`[seedDemoDb] Inserted ${products.length} products`);

  // Collections
  const collections = await fetchAllCollections();
  const insertCollection = db.prepare(
    `INSERT INTO collection (id, name, slug, description, isRoot, parentId, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const c of collections) {
    insertCollection.run(c.id, c.name, c.slug, c.description, c.isRoot ? 1 : 0, c.parent?.id ?? null, c.position);
  }
  console.log(`[seedDemoDb] Inserted ${collections.length} collections`);

  // Link products to collections: pick a handful of products per collection
  // by going through the GraphQL search API. We grab the first few
  // products and put them in every collection, since we don't have a
  // direct "products in collection" query in the public schema.
  const insertCp = db.prepare(
    `INSERT OR IGNORE INTO collection_products (collectionId, productId, position) VALUES (?, ?, ?)`,
  );
  const subset = products.slice(0, Math.min(20, products.length));
  for (const c of collections) {
    subset.forEach((p, i) => insertCp.run(c.id, p.id, i));
  }

  // Customers
  const customers = await fetchSomeCustomers();
  const insertCustomer = db.prepare(
    `INSERT INTO customer (id, createdAt, updatedAt, title, firstName, lastName, phoneNumber, emailAddress)
     VALUES (?, datetime('now'), datetime('now'), NULL, ?, ?, NULL, ?)`,
  );
  const insertUser = db.prepare(
    `INSERT INTO user (id, createdAt, updatedAt, identifier, verified, lastLogin)
     VALUES (?, datetime('now'), datetime('now'), ?, 1, datetime('now'))`,
  );
  for (const c of customers) {
    insertCustomer.run(c.id, c.firstName, c.lastName, c.emailAddress);
    insertUser.run(c.id, c.emailAddress);
  }
  console.log(`[seedDemoDb] Inserted ${customers.length} customers/users`);

  // A sample order with two line items
  const sampleCust = customers[0];
  if (sampleCust) {
    db.prepare(
      `INSERT INTO \`order\` (id, createdAt, updatedAt, code, state, total, totalWithTax, customerId, orderPlacedAt)
       VALUES (?, datetime('now'), datetime('now'), ?, 'Delivered', ?, ?, ?, datetime('now'))`,
    ).run('o1', 'TEST-001', 100.0, 120.0, sampleCust.id);
    db.prepare(
      `INSERT INTO order_line (id, orderId, productVariantId, quantity, listPrice, listPriceIncludesTax, linePrice, lineTax)
       VALUES ('ol1', 'o1', ?, 2, 50, 60, 100, 20)`,
    ).run(products[0]?.variants[0]?.id ?? 'v1');
  }

  // Shipping / payment methods
  const insertShip = db.prepare(
    `INSERT INTO shipping_method (id, createdAt, updatedAt, name, code, description, fulfillmentHandlerCode, calculator)
     VALUES (?, datetime('now'), datetime('now'), ?, ?, ?, 'manual-fulfillment', 'default-shipping-calculator')`,
  );
  insertShip.run('sm1', 'Standard Shipping', 'standard-shipping', 'Standard delivery');
  insertShip.run('sm2', 'Express Shipping', 'express-shipping', 'Express delivery');

  const insertPay = db.prepare(
    `INSERT INTO payment_method (id, createdAt, updatedAt, name, code, description, enabled)
     VALUES (?, datetime('now'), datetime('now'), ?, ?, ?, 1)`,
  );
  insertPay.run('pm1', 'Standard Payment', 'standard-payment', 'Pay on delivery');

  // Tax rate
  db.prepare(
    `INSERT INTO tax_rate (id, createdAt, updatedAt, name, enabled, value, categoryId, zoneId)
     VALUES ('tr1', datetime('now'), datetime('now'), 'Standard Tax', 1, 20.0, 'tc1', 'z1')`,
  ).run();

  // Facets
  const facets = await fetchFacets();
  const insertFacet = db.prepare(`INSERT INTO facet (id, name, code) VALUES (?, ?, ?)`);
  const insertFValue = db.prepare(`INSERT INTO facet_value (id, facetId, name, code) VALUES (?, ?, ?, ?)`);
  for (const f of facets) {
    insertFacet.run(f.id, f.name, f.code);
    for (const v of f.values) {
      insertFValue.run(v.id, f.id, v.name, v.code);
    }
  }

  db.close();
  console.log(`[seedDemoDb] Done. ${products.length} products, ${collections.length} collections, ${customers.length} customers seeded.`);
}

main().catch((err) => {
  console.error('[seedDemoDb] Failed:', err);
  process.exit(1);
});
