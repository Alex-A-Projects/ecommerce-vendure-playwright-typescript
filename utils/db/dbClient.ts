/**
 * dbClient.ts — Vendure DB read API.
 *
 * Vendure stores its data in a SQL database (SQLite by default, or
 * PostgreSQL/MySQL in production). For a LOCAL Vendure instance we open
 * the SQLite file directly via `better-sqlite3`. The public demo is
 * read-only, so all functions return defensive copies and never mutate.
 *
 * For tests to actually exercise this client, set:
 *   VENDURE_DB_PATH=/absolute/path/to/vendure.sqlite
 *
 * If the env var is missing or the file is unreadable, every helper
 * returns sensible "empty" defaults so the tests can self-skip
 * gracefully instead of crashing the whole suite.
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.VENDURE_DB_PATH || path.resolve('vendure.sqlite');

/* -----------------------------------------------------------------------
 * Connection
 * --------------------------------------------------------------------- */

let _db: Database.Database | null = null;

export function getDb(): Database.Database | null {
  if (_db) return _db;
  try {
    _db = new Database(DB_PATH, { readonly: true, fileMustExist: false });
    return _db;
  } catch (err) {
    console.warn(
      `[dbClient] Cannot open Vendure SQLite at ${DB_PATH}: ${(err as Error).message}`,
    );
    return null;
  }
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** True when a Vendure DB file is available and openable. */
export function isDbAvailable(): boolean {
  return getDb() !== null;
}

/* -----------------------------------------------------------------------
 * Domain types
 * --------------------------------------------------------------------- */

export interface ProductRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  slug: string;
  description: string;
  enabled: number;
}

export interface ProductVariantRow {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  taxCategoryId: string;
  stockOnHand: number;
  enabled: number;
}

export interface ProductAssetRow {
  id: string;
  productId: string;
  assetId: string;
  position: number;
}

export interface AssetRow {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  source: string;
  preview: string;
}

export interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  isRoot: number;
  parentId: string | null;
  position: number;
}

export interface CollectionProductRow {
  collectionId: string;
  productId: string;
  position: number;
}

export interface CustomerRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress: string;
}

export interface UserRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  identifier: string;
  verified: number;
  lastLogin: string | null;
}

export interface OrderRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  code: string;
  state: string;
  total: number;
  totalWithTax: number;
  customerId: string;
  orderPlacedAt: string | null;
}

export interface OrderLineRow {
  id: string;
  orderId: string;
  productVariantId: string;
  quantity: number;
  listPrice: number;
  listPriceIncludesTax: number;
  linePrice: number;
  lineTax: number;
}

export interface ShippingMethodRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  code: string;
  description: string;
  fulfillmentHandlerCode: string;
  calculator: string;
}

export interface PaymentMethodRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  code: string;
  description: string;
  enabled: number;
}

export interface ChannelRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  code: string;
  token: string;
  defaultCurrencyCode: string;
  defaultLanguageCode: string;
  defaultTaxZoneId: string | null;
}

export interface TaxRateRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  enabled: number;
  value: number;
  categoryId: string;
  zoneId: string;
}

/* -----------------------------------------------------------------------
 * Products
 * --------------------------------------------------------------------- */

export function getProductCount(): number {
  const db = getDb();
  if (!db) return 0;
  const r = db.prepare('SELECT COUNT(*) AS c FROM product').get() as { c: number };
  return r.c;
}

export function getProductBySlug(slug: string): ProductRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db
    .prepare('SELECT * FROM product WHERE slug = ?')
    .get(slug) as ProductRow | undefined;
  return r ?? null;
}

export function getProductById(id: string): ProductRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db.prepare('SELECT * FROM product WHERE id = ?').get(id) as ProductRow | undefined;
  return r ?? null;
}

export function listEnabledProducts(limit = 100): ProductRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM product WHERE enabled = 1 ORDER BY name LIMIT ?')
    .all(limit) as ProductRow[];
}

export function listProducts(limit = 100): ProductRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM product ORDER BY name LIMIT ?')
    .all(limit) as ProductRow[];
}

export function getProductVariants(productId: string): ProductVariantRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM product_variant WHERE productId = ? ORDER BY name')
    .all(productId) as ProductVariantRow[];
}

export function getVariantBySku(sku: string): ProductVariantRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db
    .prepare('SELECT * FROM product_variant WHERE sku = ?')
    .get(sku) as ProductVariantRow | undefined;
  return r ?? null;
}

export function getProductAssets(productId: string): ProductAssetRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM product_assets WHERE productId = ? ORDER BY position')
    .all(productId) as ProductAssetRow[];
}

export function getAsset(id: string): AssetRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db.prepare('SELECT * FROM asset WHERE id = ?').get(id) as AssetRow | undefined;
  return r ?? null;
}

export function getAllAssetCount(): number {
  const db = getDb();
  if (!db) return 0;
  const r = db.prepare('SELECT COUNT(*) AS c FROM asset').get() as { c: number };
  return r.c;
}

/* -----------------------------------------------------------------------
 * Collections
 * --------------------------------------------------------------------- */

export function getCollectionCount(): number {
  const db = getDb();
  if (!db) return 0;
  const r = db.prepare('SELECT COUNT(*) AS c FROM collection').get() as { c: number };
  return r.c;
}

export function getCollectionBySlug(slug: string): CollectionRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db
    .prepare('SELECT * FROM collection WHERE slug = ?')
    .get(slug) as CollectionRow | undefined;
  return r ?? null;
}

export function listRootCollections(): CollectionRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM collection WHERE isRoot = 1 ORDER BY position')
    .all() as CollectionRow[];
}

export function listChildCollections(parentId: string): CollectionRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM collection WHERE parentId = ? ORDER BY position')
    .all(parentId) as CollectionRow[];
}

export function getProductsInCollection(collectionId: string): ProductRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare(
      `SELECT p.* FROM product p
       JOIN collection_products cp ON cp.productId = p.id
       WHERE cp.collectionId = ?
       ORDER BY cp.position`,
    )
    .all(collectionId) as ProductRow[];
}

export function getProductCountInCollection(collectionId: string): number {
  const db = getDb();
  if (!db) return 0;
  const r = db
    .prepare('SELECT COUNT(*) AS c FROM collection_products WHERE collectionId = ?')
    .get(collectionId) as { c: number };
  return r.c;
}

/* -----------------------------------------------------------------------
 * Customers / users
 * --------------------------------------------------------------------- */

export function getCustomerByEmail(email: string): CustomerRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db
    .prepare('SELECT * FROM customer WHERE emailAddress = ?')
    .get(email) as CustomerRow | undefined;
  return r ?? null;
}

export function getCustomerById(id: string): CustomerRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db
    .prepare('SELECT * FROM customer WHERE id = ?')
    .get(id) as CustomerRow | undefined;
  return r ?? null;
}

export function getCustomerCount(): number {
  const db = getDb();
  if (!db) return 0;
  const r = db.prepare('SELECT COUNT(*) AS c FROM customer').get() as { c: number };
  return r.c;
}

export function getUserByIdentifier(identifier: string): UserRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db
    .prepare('SELECT * FROM user WHERE identifier = ?')
    .get(identifier) as UserRow | undefined;
  return r ?? null;
}

export function getUserById(id: string): UserRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db.prepare('SELECT * FROM user WHERE id = ?').get(id) as UserRow | undefined;
  return r ?? null;
}

export function getUserCount(): number {
  const db = getDb();
  if (!db) return 0;
  const r = db.prepare('SELECT COUNT(*) AS c FROM user').get() as { c: number };
  return r.c;
}

/* -----------------------------------------------------------------------
 * Orders
 * --------------------------------------------------------------------- */

export function getOrderCount(): number {
  const db = getDb();
  if (!db) return 0;
  const r = db.prepare('SELECT COUNT(*) AS c FROM `order`').get() as { c: number };
  return r.c;
}

export function getOrderByCode(code: string): OrderRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db
    .prepare('SELECT * FROM `order` WHERE code = ?')
    .get(code) as OrderRow | undefined;
  return r ?? null;
}

export function listOrders(limit = 100): OrderRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM `order` ORDER BY createdAt DESC LIMIT ?')
    .all(limit) as OrderRow[];
}

export function getOrdersForCustomer(customerId: string): OrderRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM `order` WHERE customerId = ? ORDER BY createdAt DESC')
    .all(customerId) as OrderRow[];
}

export function getOrderLines(orderId: string): OrderLineRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM order_line WHERE orderId = ?')
    .all(orderId) as OrderLineRow[];
}

export function getOrderLineCountForOrder(orderId: string): number {
  const db = getDb();
  if (!db) return 0;
  const r = db
    .prepare('SELECT COUNT(*) AS c FROM order_line WHERE orderId = ?')
    .get(orderId) as { c: number };
  return r.c;
}

export function getOrderTotal(orderId: string): number {
  const db = getDb();
  if (!db) return 0;
  const r = db
    .prepare('SELECT totalWithTax AS t FROM `order` WHERE id = ?')
    .get(orderId) as { t: number } | undefined;
  return r?.t ?? 0;
}

export function getStateCounts(): Record<string, number> {
  const db = getDb();
  if (!db) return {};
  const rows = db
    .prepare('SELECT state, COUNT(*) AS c FROM `order` GROUP BY state')
    .all() as { state: string; c: number }[];
  const result: Record<string, number> = {};
  for (const r of rows) result[r.state] = r.c;
  return result;
}

/* -----------------------------------------------------------------------
 * Shipping / payment methods, channels, tax
 * --------------------------------------------------------------------- */

export function listShippingMethods(): ShippingMethodRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM shipping_method ORDER BY name')
    .all() as ShippingMethodRow[];
}

export function getShippingMethodByCode(code: string): ShippingMethodRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db
    .prepare('SELECT * FROM shipping_method WHERE code = ?')
    .get(code) as ShippingMethodRow | undefined;
  return r ?? null;
}

export function listPaymentMethods(): PaymentMethodRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM payment_method ORDER BY name')
    .all() as PaymentMethodRow[];
}

export function getPaymentMethodByCode(code: string): PaymentMethodRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db
    .prepare('SELECT * FROM payment_method WHERE code = ?')
    .get(code) as PaymentMethodRow | undefined;
  return r ?? null;
}

export function listChannels(): ChannelRow[] {
  const db = getDb();
  if (!db) return [];
  return db.prepare('SELECT * FROM channel ORDER BY code').all() as ChannelRow[];
}

export function getChannelByCode(code: string): ChannelRow | null {
  const db = getDb();
  if (!db) return null;
  const r = db
    .prepare('SELECT * FROM channel WHERE code = ?')
    .get(code) as ChannelRow | undefined;
  return r ?? null;
}

export function listTaxRates(): TaxRateRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare('SELECT * FROM tax_rate ORDER BY value DESC')
    .all() as TaxRateRow[];
}

export function getHighestTaxRate(): number {
  const db = getDb();
  if (!db) return 0;
  const r = db
    .prepare('SELECT MAX(value) AS v FROM tax_rate WHERE enabled = 1')
    .get() as { v: number | null };
  return r?.v ?? 0;
}

/* -----------------------------------------------------------------------
 * Schema introspection — for tests that want to assert on the DB shape.
 * --------------------------------------------------------------------- */

export function listTables(): string[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

export function tableExists(name: string): boolean {
  const db = getDb();
  if (!db) return false;
  const r = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(name) as { name: string } | undefined;
  return !!r;
}

export function getRowCount(table: string): number {
  const db = getDb();
  if (!db) return 0;
  try {
    const r = db
      .prepare(`SELECT COUNT(*) AS c FROM "${table}"`)
      .get() as { c: number };
    return r.c;
  } catch {
    return 0;
  }
}

export function tableHasColumn(table: string, column: string): boolean {
  const db = getDb();
  if (!db) return false;
  try {
    const cols = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
    return cols.some((c) => c.name === column);
  } catch {
    return false;
  }
}
