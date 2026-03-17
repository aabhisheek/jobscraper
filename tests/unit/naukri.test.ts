import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockPage,
  createMockBrowser,
  createMockElement,
} from '../fixtures/playwright-mock.js';
import naukriFixture from '../fixtures/naukri-extracted.json' with { type: 'json' };

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

const mockJobCards = naukriFixture.map((job) =>
  createMockElement({
    title: job.title,
    company: job.company,
    location: job.location,
    exp: job.experience ?? '',
    sal: job.salary ?? '',
    skills: job.skills,
    href: job.jobUrl,
    jobId: job.naukriJobId,
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

const { NaukriScraper } = await import('../../src/scrapers/naukri.js');

describe('NaukriScraper', () => {
  let scraper: InstanceType<typeof NaukriScraper>;

  beforeEach(async () => {
    scraper = new NaukriScraper();
    vi.clearAllMocks();
    await setupMocks();
  });

  it('should have name "naukri"', () => {
    expect(scraper.name).toBe('naukri');
  });

  it('should scrape and return raw jobs', async () => {
    const result = await scraper.scrape({
      source: 'naukri',
      companies: ['typescript-developer'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      for (const job of result.value) {
        expect(job.source).toBe('naukri');
      }
    }
  });

  it('should handle no job cards found', async () => {
    await setupMocks({ jobCards: [], hasJobCards: false });

    const result = await scraper.scrape({
      source: 'naukri',
      companies: ['nonexistent-keyword'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('should respect maxPages config', async () => {
    const result = await scraper.scrape({
      source: 'naukri',
      companies: ['typescript-developer'],
      maxPages: 1,
    });

    expect(result.isOk()).toBe(true);
    // With maxPages=1, only page 1 should be loaded (no pageNo=2 URLs)
    const gotoCalls = (mockPage.goto.mock.calls as string[][]).filter(
      (call: string[]) => typeof call[0] === 'string' && call[0].includes('naukri.com'),
    );
    const page2Calls = gotoCalls.filter((call: string[]) => call[0]?.includes('pageNo=2'));
    expect(page2Calls).toHaveLength(0);
  });

  it('should scrape multiple keywords', async () => {
    const result = await scraper.scrape({
      source: 'naukri',
      companies: ['typescript-developer', 'react-developer'],
    });

    expect(result.isOk()).toBe(true);
  });

  it('should handle network errors on page load', async () => {
    mockPage.goto.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'));

    const result = await scraper.scrape({
      source: 'naukri',
      companies: ['typescript-developer'],
    });

    // Network error on individual keyword is a warning
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });
});
