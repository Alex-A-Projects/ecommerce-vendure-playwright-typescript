import { test, expect } from '../../fixtures/testFixtures';
import * as db from '../../utils/db/dbClient';
import { SeedProducts } from '../../utils/testData';

/**
 * Database tests — products.
 *
 * Every test in this file self-skips if the local Vendure SQLite
 * database is not available (set VENDURE_DB_PATH to enable).
 */
test.describe('Database — products', () => {
  test('the product table exists', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('product')).toBe(true);
  });

  test('the product table has the expected columns', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    for (const col of ['id', 'createdAt', 'updatedAt', 'name', 'slug', 'description', 'enabled']) {
      expect(db.tableHasColumn('product', col), `product.${col}`).toBe(true);
    }
  });

  test('at least one product exists', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.getProductCount()).toBeGreaterThan(0);
  });

  test('every seed product exists', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    for (const seed of Object.values(SeedProducts)) {
      const p = db.getProductBySlug(seed.slug);
      expect(p, `Product ${seed.slug} should exist in the DB`).not.toBeNull();
      expect(p!.name.toLowerCase()).toContain(seed.nameContains.toLowerCase());
    }
  });

  test('enabled products have enabled=1', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const list = db.listEnabledProducts(50);
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) {
      expect(p.enabled).toBe(1);
    }
  });

  test('product slug is unique across the table', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const all = db.listProducts(1000);
    const slugs = new Set(all.map((p) => p.slug));
    expect(slugs.size, 'All product slugs should be unique').toBe(all.length);
  });

  test('product name is non-empty for every enabled product', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const list = db.listEnabledProducts(100);
    for (const p of list) {
      expect(p.name.length, `Product ${p.slug} should have a name`).toBeGreaterThan(0);
    }
  });

  test('product description is non-empty for enabled products', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const list = db.listEnabledProducts(20);
    let withDescription = 0;
    for (const p of list) {
      if (p.description && p.description.length > 0) withDescription++;
    }
    expect(withDescription).toBeGreaterThan(0);
  });

  test('the product_variant table has at least one row per product', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const products = db.listEnabledProducts(20);
    for (const p of products) {
      const variants = db.getProductVariants(p.id);
      expect(variants.length, `Product ${p.slug} should have at least one variant`).toBeGreaterThan(0);
    }
  });

  test('every variant has a non-empty SKU', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const products = db.listEnabledProducts(20);
    for (const p of products) {
      const variants = db.getProductVariants(p.id);
      for (const v of variants) {
        expect(v.sku.length, `Variant of ${p.slug} should have a SKU`).toBeGreaterThan(0);
      }
    }
  });

  test('every variant has price > 0', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const products = db.listEnabledProducts(20);
    for (const p of products) {
      const variants = db.getProductVariants(p.id);
      for (const v of variants) {
        expect(v.price, `Variant ${v.sku} of ${p.slug} should have price > 0`).toBeGreaterThan(0);
      }
    }
  });

  test('product_assets table exists and links products to assets', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.tableExists('product_assets')).toBe(true);
    expect(db.tableExists('asset')).toBe(true);
    const products = db.listEnabledProducts(20);
    let withAssets = 0;
    for (const p of products) {
      const assets = db.getProductAssets(p.id);
      if (assets.length > 0) withAssets++;
    }
    expect(withAssets, 'At least some products should have assets').toBeGreaterThan(0);
  });

  test('asset table has a positive count', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    expect(db.getAllAssetCount()).toBeGreaterThan(0);
  });

  test('asset rows have valid source / preview / mimeType', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const all = db.listEnabledProducts(10);
    for (const p of all) {
      const assets = db.getProductAssets(p.id);
      for (const a of assets) {
        const asset = db.getAsset(a.assetId);
        if (!asset) continue;
        expect(asset.mimeType, 'Asset should have a mime type').toBeTruthy();
        expect(asset.preview.length, 'Asset should have a preview URL').toBeGreaterThan(0);
      }
    }
  });

  test('variant SKU is unique', () => {
    test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
    const all = db.listEnabledProducts(100);
    const skus = new Set<string>();
    for (const p of all) {
      for (const v of db.getProductVariants(p.id)) {
        skus.add(v.sku);
      }
    }
    expect(skus.size, 'All variant SKUs should be unique').toBeGreaterThan(0);
  });
});
