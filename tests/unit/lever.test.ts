import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeverScraper } from '../../src/scrapers/lever.js';
import leverFixture from '../fixtures/lever-response.json' with { type: 'json' };

vi.mock('../../src/common/logger.js', () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('LeverScraper', () => {
  let scraper: LeverScraper;

  beforeEach(() => {
    scraper = new LeverScraper();
    vi.restoreAllMocks();
  });

  it('should have name "lever"', () => {
    expect(scraper.name).toBe('lever');
  });

  it('should scrape and return raw jobs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(leverFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await scraper.scrape({
      source: 'lever',
      companies: ['testco'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]?.source).toBe('lever');
      expect(result.value[0]?.sourceId).toBe('abc-123-def');
    }
  });

  it('should handle HTTP errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', { status: 404 }));

    const result = await scraper.scrape({
      source: 'lever',
      companies: ['nonexistent'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('should handle rate limiting', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Too Many Requests', { status: 429 }),
    );

    const result = await scraper.scrape({
      source: 'lever',
      companies: ['testco'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('should handle network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await scraper.scrape({
      source: 'lever',
      companies: ['testco'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('should scrape multiple companies', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(leverFixture), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await scraper.scrape({
      source: 'lever',
      companies: ['company1', 'company2'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(4);
    }
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
