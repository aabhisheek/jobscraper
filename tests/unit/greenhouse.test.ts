import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GreenhouseScraper } from '../../src/scrapers/greenhouse.js';
import greenhouseFixture from '../fixtures/greenhouse-response.json' with { type: 'json' };

// Mock the logger to avoid needing real config/env
vi.mock('../../src/common/logger.js', () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('GreenhouseScraper', () => {
  let scraper: GreenhouseScraper;

  beforeEach(() => {
    scraper = new GreenhouseScraper();
    vi.restoreAllMocks();
  });

  it('should have name "greenhouse"', () => {
    expect(scraper.name).toBe('greenhouse');
  });

  it('should scrape and return raw jobs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(greenhouseFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await scraper.scrape({
      source: 'greenhouse',
      companies: ['testco'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(3);
      expect(result.value[0]?.source).toBe('greenhouse');
      expect(result.value[0]?.sourceId).toBe('12345');
    }
  });

  it('should handle HTTP errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', { status: 404 }));

    const result = await scraper.scrape({
      source: 'greenhouse',
      companies: ['nonexistent'],
    });

    // Should return ok with empty array since individual company failure is a warning
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
      source: 'greenhouse',
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
      source: 'greenhouse',
      companies: ['testco'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('should handle invalid JSON response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not json', { status: 200 }));

    const result = await scraper.scrape({
      source: 'greenhouse',
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
        new Response(JSON.stringify(greenhouseFixture), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await scraper.scrape({
      source: 'greenhouse',
      companies: ['company1', 'company2'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(6); // 3 jobs per company
    }
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
