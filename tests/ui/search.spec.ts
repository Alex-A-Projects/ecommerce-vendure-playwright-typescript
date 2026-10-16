import { test, expect } from '../../fixtures/testFixtures';
import { SearchPage } from '../../pages/SearchPage';
import { SeedProducts, SeedSearchTerms } from '../../utils/testData';

/** Search queries, header form submission, and rendered result quality. */
test.describe('Search', () => {
  test('searching for an existing term returns at least one result', async ({ page }) => {
    const search = new SearchPage(page);
    await search.open(SeedSearchTerms.exactMatch);
    await expect(search.resultCards.first()).toBeVisible();
    expect(await search.getResultCount()).toBeGreaterThan(0);
  });

  test('searching for a nonsense term returns no results', async ({ page }) => {
    const search = new SearchPage(page);
    await search.open(SeedSearchTerms.noResults);
    await expect(search.emptyState).toBeVisible();
    await expect(search.resultCards).toHaveCount(0);
  });

  test('searching for "bike" returns the road bike', async ({ page }) => {
    const search = new SearchPage(page);
    await search.open(SeedSearchTerms.broad);
    await expect(search.resultCards.getByRole('heading', {
      name: SeedProducts.roadBike.nameContains, exact: true,
    })).toBeVisible();
  });

  test('searching for "laptop" returns the laptop', async ({ page }) => {
    const search = new SearchPage(page);
    await search.open(SeedSearchTerms.exactMatch);
    await expect(search.resultName).toHaveText(SeedProducts.laptop.nameContains);
    await expect(search.resultCards.first()).toHaveAttribute('href', `/en/product/${SeedProducts.laptop.slug}`);
  });

  test('unmatched plural query "bikes" shows the empty state', async ({ page }) => {
    // The public demo does not match "bikes" to the singular "bike" catalog term.
    const search = new SearchPage(page);
    await search.open(SeedSearchTerms.plural);
    await expect(search.emptyState).toBeVisible();
    await expect(search.resultCards).toHaveCount(0);
  });

  test('search input on /search route is interactive', async ({ searchPage }) => {
    await expect(searchPage.searchInput).toBeVisible();
    await searchPage.search(SeedSearchTerms.exactMatch);
    await expect(searchPage.searchInput).toHaveValue(SeedSearchTerms.exactMatch);
    await expect(searchPage.resultName).toHaveText(SeedProducts.laptop.nameContains);
    await expect(searchPage.resultCards.first()).toHaveAttribute('href', `/en/product/${SeedProducts.laptop.slug}`);
  });

  test('case-insensitive search returns the same result', async ({ page }) => {
    const search = new SearchPage(page);
    await search.open(SeedSearchTerms.exactMatch.toUpperCase());
    const upperNames = await search.getResultNames();
    const upperLinks = await search.resultCards.evaluateAll(cards => cards.map(card => card.getAttribute('href')));
    expect(upperNames).toContain(SeedProducts.laptop.nameContains);

    await search.open(SeedSearchTerms.exactMatch.toLowerCase());
    const lowerNames = await search.getResultNames();
    const lowerLinks = await search.resultCards.evaluateAll(cards => cards.map(card => card.getAttribute('href')));
    expect(lowerNames).toEqual(upperNames);
    expect(lowerLinks).toEqual(upperLinks);
  });

  test('search results have a name, price, and image', async ({ page }) => {
    const search = new SearchPage(page);
    await search.open(SeedSearchTerms.exactMatch);
    await expect(search.resultCards.first()).toBeVisible();
    for (const card of await search.resultCards.all()) {
      const name = card.getByRole('heading', { level: 3 });
      await expect(name).toHaveText(/\S/);
      await expect(card.locator('h3 + p')).toHaveText(/^(?:From\s*)?\$[\d,]+\.\d{2}$/);
      await expect(card.getByRole('img')).toHaveAttribute('src', /\S/);
      await expect(card.getByRole('img')).toHaveAttribute('alt', (await name.innerText()).trim());
    }
  });

  test('empty search query shows the product catalog', async ({ page }) => {
    const search = new SearchPage(page);
    await search.open('');
    await expect(search.heading).toHaveText('Search');
    await expect(search.resultCards.first()).toBeVisible();
    await expect(search.resultsCount).toHaveText(/^[1-9]\d* products?$/);
  });

  test('searching for special characters shows the empty state without crashing', async ({ page }) => {
    const term = '!@#$%^&*()';
    const search = new SearchPage(page);
    await search.open(term);
    await expect(page).toHaveURL(url => url.searchParams.get('q') === term);
    await expect(search.emptyState).toBeVisible();
    await expect(search.resultCards).toHaveCount(0);
  });
});
