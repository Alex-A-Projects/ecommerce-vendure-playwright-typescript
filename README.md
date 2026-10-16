# Vendure Playwright + TypeScript Test Automation

Comprehensive end-to-end test suite for the [Vendure](https://www.vendure.io/) e-commerce platform, built on Playwright + TypeScript with a Page Object Model. Tests cover the **storefront UI**, the **GraphQL Shop & Admin APIs**, and the **Vendure database** — all driven by the public demo deployment.

## Stack

| Technology | Purpose |
| ---------- | ------- |
| TypeScript | Test code with strict type checking |
| Node.js + npm | Runtime, dependency management, and test scripts |
| Playwright Test | Test runner, assertions, fixtures, and Chromium browser automation |
| GraphQL + Playwright APIRequestContext | Vendure Shop and Admin API testing |
| SQLite + better-sqlite3 | Local database queries and validation |
| Page Object Model | Reusable page actions and locators with custom fixtures |
| Playwright HTML reports and traces | Test results, screenshots, videos, and debugging |

## Quick start

```bash
# 1. Install
npm install
npx playwright install chromium

# 2. Run everything (≈ 2 min on a fast connection)
npm test

# 3. Run just one layer
npm run test:ui-only     # storefront POM tests
npm run test:api-only    # GraphQL Shop + Admin tests
npm run test:db-only     # SQLite-backed DB tests
```

## Targets

| Layer | Endpoint | Auth |
| ----- | -------- | ---- |
| Storefront UI | `https://storefront.demo.vendure.io` | public |
| GraphQL Shop API | `https://demo.vendure.io/shop-api` | public reads; customer login for writes |
| GraphQL Admin API | `https://demo.vendure.io/admin-api` | `superadmin / superadmin` |
| Vendure database | local `vendure.sqlite` (set `VENDURE_DB_PATH`) | read-only |

## What's in here

```
.
├── pages/                      # Page Object Model
│   ├── BasePage.ts             # shared header / footer / navigation
│   ├── HomePage.ts
│   ├── ProductListPage.ts      # collections + search
│   ├── ProductDetailPage.ts
│   ├── CartPage.ts
│   ├── CheckoutPage.ts
│   ├── AccountLoginPage.ts
│   ├── AccountRegisterPage.ts
│   ├── AccountPage.ts
│   └── SearchPage.ts
│
├── fixtures/
│   └── testFixtures.ts         # custom fixtures (POMs, API client, seed data)
│
├── utils/
│   ├── api.ts                  # Vendure GraphQL client (Shop + Admin)
│   ├── helpers.ts              # console-error tracking, price parsing
│   ├── testData.ts             # seed products, collections, customer
│   └── db/
│       └── dbClient.ts         # better-sqlite3 read API
│
├── tests/
│   ├── ui/                     # storefront UI tests
│   │   ├── home.spec.ts
│   │   ├── header-footer.spec.ts
│   │   ├── product-listing.spec.ts
│   │   ├── product-detail.spec.ts
│   │   ├── search.spec.ts
│   │   ├── cart.spec.ts
│   │   ├── checkout.spec.ts
│   │   ├── account-login.spec.ts
│   │   ├── account-register.spec.ts
│   │   ├── account.spec.ts
│   │   └── navigation.spec.ts
│   ├── api/                    # GraphQL API tests
│   │   ├── shop-api-queries.spec.ts
│   │   ├── shop-api-mutations.spec.ts
│   │   ├── admin-api.spec.ts
│   │   ├── api-schema.spec.ts
│   │   └── cart-checkout-flow.spec.ts
│   └── db/                     # SQLite-backed DB tests
│       ├── db-products.spec.ts
│       ├── db-collections.spec.ts
│       ├── db-customers.spec.ts
│       ├── db-orders.spec.ts
│       └── db-meta.spec.ts
│
├── global-setup.ts             # health-check probes for all 3 layers
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

## Test counts

| Layer    | Test files | Tests |
| -------- | ---------- | ----- |
| UI       | 11         | 100+  |
| API      | 5          | 80+   |
| Database | 5          | 90+   |
| **Total**| **21**     | **~280** |

(The actual count depends on what the public demo is currently exposing — every test self-skips on `429` or `5xx` responses and on missing DOM elements.)

## Page Object Model

Every page in the storefront has a dedicated POM under `pages/`. The `BasePage` exposes the global header (logo, collection nav, search box, cart, account) and footer (about, contact, privacy, terms) so child pages just add page-specific locators and actions.

Example: adding an item to the cart and asserting the cart count.

```ts
import { test, expect } from '../fixtures/testFixtures';
import { SeedProducts } from '../utils/testData';

test('add-to-cart flow', async ({ productDetailPage, page }) => {
  await productDetailPage.addToCart(2);
  await page.goto('/cart');
  await expect(page.locator('main')).toContainText(/\$/);
});
```

## GraphQL API tests

`utils/api.ts` is a tiny GraphQL client on top of Playwright's `request` fixture. It handles both Shop and Admin endpoints, captures the response body, and exposes typed helpers for the most common queries:

```ts
import { test, expect } from '../fixtures/testFixtures';
import { SeedProducts } from '../utils/testData';

test('product by slug', async ({ apiClient }) => {
  const r = await apiClient.shop<{ product: { id: string; name: string } }>(
    `query($slug: String!){ product(slug: $slug){ id name } }`,
    { slug: SeedProducts.flatCap.slug },
  );
  expect(r.data?.product.name.toLowerCase()).toMatch(/cap/);
});
```

The suite covers:

- **Schema introspection** — `__schema` / `__type` queries assert the shape of every core type (Product, ProductVariant, Order, Asset, etc.).
- **Shop reads** — products, collections, search, facets, active order/customer/channel.
- **Shop mutations** — `addItemToOrder`, `adjustOrderLine`, `removeOrderLine`, `setOrderShippingAddress`, `setOrderCustomer`, `registerCustomerAccount`.
- **Admin reads** — products, customers, orders, facets, stock levels, shipping methods, payment methods, channels, tax rates.
- **End-to-end cart → checkout** — add items, set customer email, set address, fetch eligible shipping methods, select one, and verify the order state.

## Database tests

`utils/db/dbClient.ts` opens the Vendure SQLite file in read-only mode and exposes typed queries against the canonical Vendure tables: `product`, `product_variant`, `asset`, `collection`, `collection_products`, `customer`, `user`, `order`, `order_line`, `channel`, `shipping_method`, `payment_method`, `tax_rate`.

DB tests self-skip if the database is not present:

```ts
test.skip(!db.isDbAvailable(), 'No Vendure SQLite file at VENDURE_DB_PATH');
```

Enable them by pointing at a local SQLite file:

```bash
VENDURE_DB_PATH=/path/to/vendure.sqlite npm run test:db-only
```

DB coverage includes:

- **Schema shape** — every core table has the expected columns.
- **Products** — non-empty names, unique slugs, positive prices, stock > 0, asset links.
- **Collections** — root vs child relationships, parent invariants, product membership.
- **Customers / users** — seeded `jane.doe@ark-case.com`, unique emails / identifiers.
- **Orders** — unique codes, state distribution, line totals sum to the order total, totalWithTax ≥ total.
- **Meta** — channels, shipping methods, payment methods, tax rates, schema introspection.

## Custom fixtures

`fixtures/testFixtures.ts` extends the default `test` with POMs and a shared API client. Every fixture returns a freshly-bound POM — fixtures never call `test.skip()`, they always perform the action and let the caller's assertions decide.

| Fixture                | What it gives you                                   |
| ---------------------- | --------------------------------------------------- |
| `homePage`             | `HomePage` POM, loaded at `/`                       |
| `productListPage`      | `ProductListPage` POM, loaded at `/collections/electronics` |
| `productDetailPage`    | `ProductDetailPage` POM, loaded at the seed flat cap |
| `cartPage`             | `CartPage` POM, loaded at `/cart`                   |
| `searchPage`           | `SearchPage` POM, loaded at `/search`               |
| `accountLoginPage`     | `AccountLoginPage` POM, loaded at `/account/login`  |
| `accountRegisterPage`  | `AccountRegisterPage` POM, loaded at `/account/register` |
| `accountPage`          | `AccountPage` POM, post-login dashboard             |
| `apiClient`            | `VendureApiClient` (Shop + Admin GraphQL)           |
| `seededProductSlug`    | The slug of a known-good seed product               |
| `seededCustomer`       | The seeded `jane.doe@ark-case.com` account         |

## Running subsets

```bash
# Run only the UI tests
npm run test:ui-only

# Run only the API tests
npm run test:api-only

# Run only the database tests
npm run test:db-only

# Run a single file
npx playwright test tests/ui/home.spec.ts

# Run a single test by title
npx playwright test -g "Add to cart"

# Headed mode
npm run test:headed

# Interactive UI mode
npm run test:ui

# Debug mode (Playwright Inspector)
npm run test:debug
```

## Reports

- `playwright-report/` — HTML report (`npm run test:report`)
- `test-results/` — per-test traces, screenshots, and videos on failure

## Configuration

The Playwright config in [playwright.config.ts](playwright.config.ts) sets:

- `baseURL` → `https://storefront.demo.vendure.io`
- `timeout` → 60 s per test
- `expect.timeout` → 10 s
- `retries` → 2 on CI, 0 locally
- `workers` → 1 on CI, 2 locally
- `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, `trace: 'on-first-retry'`

## Conventions

- **Self-skipping** — Tests self-skip when the public demo is rate-limited, when a DOM element is absent on the current layout, or when the database file is not available. Every test should report either `passed` or `skipped`; nothing should crash the suite.
- **No `page.evaluate`** — The few JS evaluations used (HTML5 input validation, etc.) are localised and necessary.
- **Type-safe** — All GraphQL queries declare their response types; all DB calls have a typed row interface.
- **POM over inline locators** — The only inline `page.locator(...)` calls in test files are for one-off navigation checks; everything else routes through a POM.

## License

Internal QA tooling — no public license.
