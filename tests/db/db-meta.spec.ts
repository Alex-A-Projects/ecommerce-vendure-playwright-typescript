import { test, expect } from '../../fixtures/testFixtures';
import * as db from '../../utils/db/dbClient';
import { DefaultChannelCode } from '../../utils/testData';

/**
 * Database tests — meta tables (channels, shipping methods, payment
 * methods, tax rates, schema introspection).
 */
test.describe('Database — meta', () => {
  test('the channel table exists with at least one row', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('channel')).toBe(true);
    expect(db.listChannels().length).toBeGreaterThan(0);
  });

  test('channel table has the expected columns', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    for (const col of ['id', 'code', 'token', 'defaultCurrencyCode', 'defaultLanguageCode']) {
      expect(db.tableHasColumn('channel', col), `channel.${col}`).toBe(true);
    }
  });

  test('the default channel exists by code', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const c = db.getChannelByCode(DefaultChannelCode);
    expect(c, `Default channel "${DefaultChannelCode}" should exist`).not.toBeNull();
  });

  test('channel codes are unique', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const channels = db.listChannels();
    const codes = new Set(channels.map((c) => c.code));
    expect(codes.size).toBe(channels.length);
  });

  test('the shipping_method table exists with rows', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('shipping_method')).toBe(true);
    expect(db.listShippingMethods().length).toBeGreaterThan(0);
  });

  test('every shipping method has a unique code', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const methods = db.listShippingMethods();
    const codes = new Set(methods.map((m) => m.code));
    expect(codes.size).toBe(methods.length);
  });

  test('every shipping method has a non-empty name', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    for (const m of db.listShippingMethods()) {
      expect(m.name.length, `Shipping method ${m.code} should have a name`).toBeGreaterThan(0);
    }
  });

  test('looking up shipping method by code returns the same row', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const methods = db.listShippingMethods();
    for (const m of methods) {
      const fresh = db.getShippingMethodByCode(m.code);
      expect(fresh?.id).toBe(m.id);
    }
  });

  test('the payment_method table exists with rows', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('payment_method')).toBe(true);
    expect(db.listPaymentMethods().length).toBeGreaterThan(0);
  });

  test('every payment method has a unique code', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const methods = db.listPaymentMethods();
    const codes = new Set(methods.map((m) => m.code));
    expect(codes.size).toBe(methods.length);
  });

  test('the tax_rate table exists with rows', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('tax_rate')).toBe(true);
    expect(db.listTaxRates().length).toBeGreaterThan(0);
  });

  test('every tax rate is non-negative', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    for (const r of db.listTaxRates()) {
      expect(r.value).toBeGreaterThanOrEqual(0);
    }
  });

  test('the highest enabled tax rate is positive', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.getHighestTaxRate()).toBeGreaterThan(0);
  });

  test('__schema: listTables() returns the canonical Vendure tables', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const tables = db.listTables();
    for (const expected of [
      'product',
      'product_variant',
      'product_assets',
      'asset',
      'collection',
      'collection_products',
      'customer',
      'user',
      'order',
      'order_line',
      'channel',
      'shipping_method',
      'payment_method',
      'tax_rate',
    ]) {
      expect(tables, `Tables list should include "${expected}"`).toContain(expected);
    }
  });

  test('__schema: getRowCount() returns a positive number for the product table', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.getRowCount('product')).toBeGreaterThan(0);
  });

  test('__schema: getRowCount() returns 0 for an unknown table', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.getRowCount('__no_such_table__')).toBe(0);
  });

  test('__schema: tableExists() returns true for a known table', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('product')).toBe(true);
  });

  test('__schema: tableExists() returns false for an unknown table', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('__no_such_table__')).toBe(false);
  });

  test('__schema: tableHasColumn() returns true for a real column', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableHasColumn('product', 'slug')).toBe(true);
  });

  test('__schema: tableHasColumn() returns false for a fake column', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableHasColumn('product', '__no_such_column__')).toBe(false);
  });
});
