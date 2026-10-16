import { test, expect } from '../../fixtures/testFixtures';
import * as db from '../../utils/db/dbClient';

/**
 * Database tests — orders and order lines.
 */
test.describe('Database — orders', () => {
  test('the order table exists', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('order')).toBe(true);
  });

  test('the order table has the expected columns', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    for (const col of [
      'id',
      'createdAt',
      'updatedAt',
      'code',
      'state',
      'total',
      'totalWithTax',
      'customerId',
    ]) {
      expect(db.tableHasColumn('order', col), `order.${col}`).toBe(true);
    }
  });

  test('at least one order exists in the demo dataset', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.getOrderCount()).toBeGreaterThan(0);
  });

  test('every order has a non-empty code', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const orders = db.listOrders(50);
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) {
      expect(o.code.length, `Order ${o.id} should have a code`).toBeGreaterThan(0);
    }
  });

  test('every order has a state', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const orders = db.listOrders(50);
    for (const o of orders) {
      expect(o.state.length, `Order ${o.id} should have a state`).toBeGreaterThan(0);
    }
  });

  test('every order has totalWithTax >= total', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const orders = db.listOrders(50);
    for (const o of orders) {
      expect(o.totalWithTax, `Order ${o.code} totalWithTax should be >= total`).toBeGreaterThanOrEqual(o.total);
    }
  });

  test('order code is unique across the table', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const orders = db.listOrders(100);
    const codes = new Set(orders.map((o) => o.code));
    expect(codes.size, 'All order codes should be unique').toBe(orders.length);
  });

  test('order state distribution contains a non-empty set', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const counts = db.getStateCounts();
    expect(Object.keys(counts).length).toBeGreaterThan(0);
    for (const [state, n] of Object.entries(counts)) {
      expect(n, `state ${state} should have >= 1 order`).toBeGreaterThan(0);
    }
  });

  test('every order has at least one order line', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const orders = db.listOrders(20);
    for (const o of orders) {
      const n = db.getOrderLineCountForOrder(o.id);
      expect(n, `Order ${o.code} should have at least one line`).toBeGreaterThan(0);
    }
  });

  test('the order_line table has the expected columns', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    for (const col of [
      'id',
      'orderId',
      'productVariantId',
      'quantity',
      'listPrice',
      'linePrice',
    ]) {
      expect(db.tableHasColumn('order_line', col), `order_line.${col}`).toBe(true);
    }
  });

  test('every order line has quantity > 0', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const orders = db.listOrders(20);
    for (const o of orders) {
      const lines = db.getOrderLines(o.id);
      for (const l of lines) {
        expect(l.quantity, `Line ${l.id} of ${o.code} should have quantity > 0`).toBeGreaterThan(0);
        expect(l.listPrice, `Line ${l.id} of ${o.code} should have a list price`).toBeGreaterThanOrEqual(0);
        expect(l.linePrice, `Line ${l.id} of ${o.code} should have a line price`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('line totals sum to roughly the order total (within rounding)', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const orders = db.listOrders(10);
    for (const o of orders) {
      const lines = db.getOrderLines(o.id);
      const sum = lines.reduce((s, l) => s + l.linePrice, 0);
      // Allow rounding difference.
      expect(
        Math.abs(sum - o.total),
        `Order ${o.code} line sum ${sum} should match total ${o.total}`,
      ).toBeLessThan(1);
    }
  });

  test('order codes match a known shape (alpha + digits)', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const orders = db.listOrders(10);
    for (const o of orders) {
      expect(o.code).toMatch(/^[A-Z0-9-]+$/);
    }
  });

  test('looking up an order by code returns the same row', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const orders = db.listOrders(5);
    for (const o of orders) {
      const fresh = db.getOrderByCode(o.code);
      expect(fresh?.id).toBe(o.id);
    }
  });
});
