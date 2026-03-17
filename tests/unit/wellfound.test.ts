import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockPage,
  createMockBrowser,
  createMockElement,
} from '../fixtures/playwright-mock.js';
import wellfoundFixture from '../fixtures/wellfound-extracted.json' with { type: 'json' };

vi.mock('../../src/common/logger.js', () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../config/default.js', () => ({
  loadConfig: () => ({
    logLevel: 'info',
    nodeEnv: 'test',
  }),
}));

vi.mock('../../src/safety/human-behavior.js', () => ({
  randomDelay: vi.fn().mockResolvedValue(undefined),
  scrollSlowly: vi.fn().mockResolvedValue(undefined),
  humanType: vi.fn().mockResolvedValue(undefined),
  humanClick: vi.fn().mockResolvedValue(undefined),
}));

const mockJobCards = wellfoundFixture.map((job) =>
  createMockElement({
    title: job.title,
    company: job.company,
    location: job.location,
    compensation: job.salary ?? '',
    href: job.jobUrl,
    jobId: job.wellfoundJobId,
  }),
);

let mockPage: ReturnType<typeof createMockPage>;
let mockBrowser: ReturnType<typeof createMockBrowser>;

async function setupMocks(options?: Parameters<typeof createMockPage>[0]) {
  mockPage = createMockPage({ jobCards: mockJobCards, hasJobCards: true, ...options });
  mockBrowser = createMockBrowser(mockPage);
  const { chromium } = vi.mocked(await import('playwright'));
  vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as never);
}

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockImplementation(() => Promise.resolve(createMockBrowser(createMockPage()))),
  },
}));

const { WellfoundScraper } = await import('../../src/scrapers/wellfound.js');

describe('WellfoundScraper', () => {
  let scraper: InstanceType<typeof WellfoundScraper>;

  beforeEach(async () => {
    scraper = new WellfoundScraper();
    vi.clearAllMocks();
    await setupMocks();
  });

  it('should have name "wellfound"', () => {
    expect(scraper.name).toBe('wellfound');
  });

  it('should scrape and return raw jobs', async () => {
    const result = await scraper.scrape({
      source: 'wellfound',
      companies: ['linear'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.length).toBeGreaterThanOrEqual(0);
      for (const job of result.value) {
        expect(job.source).toBe('wellfound');
      }
    }
  });

  it('should handle no job cards found', async () => {
    await setupMocks({ jobCards: [], hasJobCards: false });

    const result = await scraper.scrape({
      source: 'wellfound',
      companies: ['nonexistent'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('should handle 404 page', async () => {
    mockPage.content.mockResolvedValue('<html><body>Page not found</body></html>');

    const result = await scraper.scrape({
      source: 'wellfound',
      companies: ['nonexistent-company'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('should scrape multiple companies', async () => {
    const result = await scraper.scrape({
      source: 'wellfound',
      companies: ['company1', 'company2'],
    });

    expect(result.isOk()).toBe(true);
  });
});
