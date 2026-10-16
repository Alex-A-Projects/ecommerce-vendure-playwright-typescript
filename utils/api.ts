import { request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { VendureEndpoints } from './testData';

/**
 * Vendure GraphQL client — wraps the Shop and Admin APIs with typed
 * helpers for the queries / mutations the test suite uses.
 *
 * Vendure's GraphQL endpoints:
 *   - Shop:  https://demo.vendure.io/shop-api   (public, customer session)
 *   - Admin: https://demo.vendure.io/admin-api  (session cookie + vendure-token)
 *
 * Admin auth model: the Admin API uses an HTTP-only session cookie
 * (`session`) plus a CSRF token sent as the `vendure-token` request
 * header. The token value is the value of the `session` cookie.
 * `adminLogin` performs the login mutation, captures the cookies, and
 * sets the `vendure-token` header for subsequent calls.
 *
 * A `LastResponse` is captured on every call so tests can assert on
 * GraphQL `errors[]` if a query is expected to fail.
 */

export interface GraphQLError {
  message: string;
  path?: ReadonlyArray<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
  status: number;
}

export class VendureApiClient {
  readonly shopUrl: string;
  readonly adminUrl: string;
  private context: APIRequestContext | null = null;
  /** Captured for the most recent call (or last batch within a closure). */
  lastResponse: GraphQLResponse<unknown> | null = null;
  /** Bearer token for the Admin API's vendure-token CSRF header. */
  adminToken: string | null = null;
  /** Bearer token for the Shop API (set by `customerLogin`). */
  customerToken: string | null = null;

  constructor(opts?: { shopUrl?: string; adminUrl?: string }) {
    this.shopUrl = opts?.shopUrl ?? VendureEndpoints.shopApi;
    this.adminUrl = opts?.adminUrl ?? VendureEndpoints.adminApi;
  }

  /** Lazily create the request context. */
  private async ctx(): Promise<APIRequestContext> {
    if (!this.context) {
      this.context = await playwrightRequest.newContext();
    }
    return this.context;
  }

  /** Build the headers for a Shop API call. */
  private shopHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.customerToken ? { Authorization: `Bearer ${this.customerToken}` } : {}),
      ...(extra ?? {}),
    };
  }

  /** Build the headers for an Admin API call. */
  private adminHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.adminToken ? { 'vendure-token': this.adminToken } : {}),
      ...(extra ?? {}),
    };
  }

  /** Run a Shop API query/mutation. */
  async shop<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<GraphQLResponse<T>> {
    const ctx = await this.ctx();
    const res = await ctx.post(this.shopUrl, {
      headers: this.shopHeaders(),
      data: { query, variables },
    });
    const body = await res.json().catch(() => ({}));
    const result: GraphQLResponse<T> = { ...(body as object), status: res.status() };
    this.lastResponse = result;
    return result;
  }

  /** Run an Admin API query/mutation. */
  async admin<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<GraphQLResponse<T>> {
    const ctx = await this.ctx();
    const res = await ctx.post(this.adminUrl, {
      headers: this.adminHeaders(),
      data: { query, variables },
    });
    const body = await res.json().catch(() => ({}));
    const result: GraphQLResponse<T> = { ...(body as object), status: res.status() };
    this.lastResponse = result;
    return result;
  }

  /** Close the request context. Call from afterAll/afterEach. */
  async dispose(): Promise<void> {
    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }
  }

  /* -------------------------------------------------------------------
   * Auth helpers
   * ----------------------------------------------------------------- */

  /** Log a customer in via the Shop API and store the bearer token. */
  async customerLogin(
    username: string,
    password: string,
  ): Promise<{ __typename?: string; id?: string; errorMessage?: string } | null> {
    const mutation = /* GraphQL */ `
      mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          ... on CurrentUser { id identifier }
          ... on InvalidCredentialsError { errorCode message }
          ... on NotVerifiedError { errorCode message }
        }
      }
    `;
    const r = await this.shop<{ login: { id: string; identifier: string } }>(mutation, {
      username,
      password,
    });
    const login = r.data?.login;
    if (login && 'id' in login) {
      this.customerToken = `customer:${login.id}`;
      return login;
    }
    return null;
  }

  /**
   * Authenticate the admin via the Admin API and capture both the
   * vendure-token (CSRF) header and the session cookies. The Admin
   * API requires the cookie for permission-protected queries, not
   * just the CSRF header.
   */
  async adminLogin(username: string, password: string): Promise<boolean> {
    const mutation = /* GraphQL */ `
      mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          ... on CurrentUser { id identifier }
          ... on InvalidCredentialsError { errorCode message }
        }
      }
    `;
    const ctx = await this.ctx();
    const res = await ctx.post(this.adminUrl, {
      headers: { 'Content-Type': 'application/json' },
      data: { query: mutation, variables: { username, password } },
    });
    const setCookie = res.headers()['set-cookie'] || '';
    const sessionMatch = String(setCookie).match(/session=([^;]+)/);
    if (sessionMatch) {
      this.adminToken = sessionMatch[1];
    }
    // The response sets HTTP-only cookies. Playwright's request
    // context stores them automatically; no further work needed.
    const body = (await res.json().catch(() => ({}))) as {
      data?: { login: { id: string } | { errorCode: string } };
    };
    const login = body.data?.login;
    if (login && 'id' in login) {
      return true;
    }
    return false;
  }

  /** Clear any active shop customer session. */
  async customerLogout(): Promise<void> {
    await this.shop(/* GraphQL */ `mutation { logout { success } }`);
    this.customerToken = null;
  }

  /* -------------------------------------------------------------------
   * Convenience queries — small typed helpers for the most common reads.
   * ----------------------------------------------------------------- */

  /** Fetch a product by slug. */
  async getProductBySlug(slug: string): Promise<ProductNode | null> {
    const q = /* GraphQL */ `
      query ProductBySlug($slug: String!) {
        product(slug: $slug) {
          id name slug description enabled
          assets { id preview }
          variants { id name sku price priceWithTax }
        }
      }
    `;
    const r = await this.shop<{ product: ProductNode | null }>(q, { slug });
    return r.data?.product ?? null;
  }

  /** List collection children. */
  async getCollectionBySlug(slug: string): Promise<CollectionNode | null> {
    const q = /* GraphQL */ `
      query CollectionBySlug($slug: String!) {
        collection(slug: $slug) {
          id name slug description
          children { id name slug }
          productVariants { totalItems items { id name } }
        }
      }
    `;
    const r = await this.shop<{ collection: CollectionNode | null }>(q, { slug });
    return r.data?.collection ?? null;
  }

  /** Search products. */
  async search(q: string, take = 10): Promise<SearchNode> {
    const query = /* GraphQL */ `
      query Search($input: SearchInput!) {
        search(input: $input) {
          totalItems
          items { productId productName slug inStock }
        }
      }
    `;
    const r = await this.shop<{ search: SearchNode }>(query, {
      input: { term: q, take, groupByProduct: true },
    });
    return (
      r.data?.search ?? { totalItems: 0, items: [] }
    );
  }
}

/* -----------------------------------------------------------------------
 * Public types
 * --------------------------------------------------------------------- */

export interface AssetNode {
  id: string;
  preview: string;
  source?: string;
}

export interface ProductVariantNode {
  id: string;
  name: string;
  sku: string;
  price: number;
  priceWithTax: number;
}

export interface ProductNode {
  id: string;
  name: string;
  slug: string;
  description: string;
  enabled: boolean;
  assets: AssetNode[];
  variants: ProductVariantNode[];
}

export interface CollectionNode {
  id: string;
  name: string;
  slug: string;
  description: string;
  children: { id: string; name: string; slug: string }[];
  productVariants: { totalItems: number; items: { id: string; name: string }[] };
}

export interface SearchNode {
  totalItems: number;
  items: { productId: string; productName: string; slug: string; inStock: boolean }[];
}
