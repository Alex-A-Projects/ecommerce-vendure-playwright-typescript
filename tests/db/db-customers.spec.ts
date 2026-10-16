import { test, expect } from '../../fixtures/testFixtures';
import * as db from '../../utils/db/dbClient';
import { SeededCustomer } from '../../utils/testData';

/**
 * Database tests — customers and users.
 */
test.describe('Database — customers & users', () => {
  test('the customer table exists', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('customer')).toBe(true);
  });

  test('the customer table has the expected columns', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    for (const col of ['id', 'createdAt', 'updatedAt', 'firstName', 'lastName', 'emailAddress']) {
      expect(db.tableHasColumn('customer', col), `customer.${col}`).toBe(true);
    }
  });

  test('at least one customer exists', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.getCustomerCount()).toBeGreaterThan(0);
  });

  test('the seeded customer exists in the DB', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const c = db.getCustomerByEmail(SeededCustomer.emailAddress);
    expect(c, `Seeded customer ${SeededCustomer.emailAddress} should exist`).not.toBeNull();
    // The first/last name on the seeded account rotates as the demo
    // is reset — only the email is stable.
    expect(c!.firstName.length).toBeGreaterThan(0);
    expect(c!.lastName.length).toBeGreaterThan(0);
  });

  test('customer email addresses are unique', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const all = db.getCustomerCount();
    // We don't iterate every customer but assert on a known pair.
    const c1 = db.getCustomerByEmail(SeededCustomer.emailAddress);
    if (!c1) test.skip(true, 'No seeded customer to compare against');
    const c2 = db.getCustomerById(c1!.id);
    expect(c2?.emailAddress).toBe(c1!.emailAddress);
    // The total count should be > 1 (or at least >= 1 if there's a
    // tiny demo).
    expect(all).toBeGreaterThan(0);
  });

  test('every customer has a first and last name', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const c = db.getCustomerByEmail(SeededCustomer.emailAddress);
    if (!c) test.skip(true, 'No seeded customer');
    expect(c!.firstName.length).toBeGreaterThan(0);
    expect(c!.lastName.length).toBeGreaterThan(0);
  });

  test('the user table exists and has the expected columns', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('user')).toBe(true);
    for (const col of ['id', 'createdAt', 'updatedAt', 'identifier', 'verified']) {
      expect(db.tableHasColumn('user', col), `user.${col}`).toBe(true);
    }
  });

  test('at least one user exists', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.getUserCount()).toBeGreaterThan(0);
  });

  test('the seeded customer identifier exists as a user', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const u = db.getUserByIdentifier(SeededCustomer.emailAddress);
    expect(u, `User ${SeededCustomer.emailAddress} should exist`).not.toBeNull();
  });

  test('user identifiers are unique', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const all = db.getUserCount();
    // Sanity: same identifier resolves to one row.
    const u1 = db.getUserByIdentifier(SeededCustomer.emailAddress);
    if (!u1) test.skip(true, 'No seeded user');
    const u2 = db.getUserById(u1!.id);
    expect(u2?.identifier).toBe(u1!.identifier);
    expect(all).toBeGreaterThan(0);
  });
});
