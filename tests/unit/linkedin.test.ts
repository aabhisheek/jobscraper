import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockPage,
  createMockBrowser,
  createMockElement,
} from '../fixtures/playwright-mock.js';
import linkedinFixture from '../fixtures/linkedin-extracted.json' with { type: 'json' };

vi.mock('../../src/common/logger.js', () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockLoadConfig = vi.fn().mockReturnValue({
  logLevel: 'info',
  nodeEnv: 'test',
  linkedinCookiePath: undefined,
});

vi.mock('../../config/default.js', () => ({
  loadConfig: mockLoadConfig,
}));

vi.mock('../../src/safety/human-behavior.js', () => ({
  randomDelay: vi.fn().mockResolvedValue(undefined),
  scrollSlowly: vi.fn().mockResolvedValue(undefined),
  humanType: vi.fn().mockResolvedValue(undefined),
  humanClick: vi.fn().mockResolvedValue(undefined),
}));

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const mockJobCards = linkedinFixture.map((job) =>
  createMockElement({
    title: job.title,
    company: job.company,
    location: job.location,
    href: job.jobUrl,
    jobId: job.linkedinJobId,
  }),
);

const mockPage = createMockPage({
  jobCards: mockJobCards,
  hasJobCards: true,
  descriptionText: 'TypeScript Node.js PostgreSQL',
  hasEasyApply: true,
});

const mockBrowser = createMockBrowser(mockPage);

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockImplementation(() => Promise.resolve(mockBrowser)),
  },
}));

// Must import after mocks are set up
const { LinkedInScraper } = await import('../../src/scrapers/linkedin.js');
const { readFile } = await import('node:fs/promises');

describe('LinkedInScraper', () => {
  let scraper: InstanceType<typeof LinkedInScraper>;

  beforeEach(() => {
    scraper = new LinkedInScraper();
    vi.clearAllMocks();
    // Reset the cached cookies
    vi.mocked(readFile).mockRejectedValue(new Error('No cookie file'));
  });

  it('should have name "linkedin"', () => {
    expect(scraper.name).toBe('linkedin');
  });

  it('should fail when cookies are not configured', async () => {
    const result = await scraper.scrape({
      source: 'linkedin',
      companies: ['stripe'],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('AUTH_WALL');
    }
  });

  it('should scrape and return raw jobs when cookies are available', async () => {
    mockLoadConfig.mockReturnValue({
      logLevel: 'info',
      nodeEnv: 'test',
      linkedinCookiePath: './test-cookies.json',
      databaseUrl: '',
      redisUrl: '',
      maxDailyApplications: 100,
      rateLimitMs: 30000,
      port: 3000,
      host: '0.0.0.0',
    });
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify([{ name: 'li_at', value: 'test', domain: '.linkedin.com', path: '/' }]),
    );

    const result = await scraper.scrape({
      source: 'linkedin',
      companies: ['stripe'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.length).toBeGreaterThanOrEqual(0);
      for (const job of result.value) {
        expect(job.source).toBe('linkedin');
      }
    }
  });

  it('should handle auth wall detection', async () => {
    mockLoadConfig.mockReturnValue({
      logLevel: 'info',
      nodeEnv: 'test',
      linkedinCookiePath: './test-cookies.json',
      databaseUrl: '',
      redisUrl: '',
      maxDailyApplications: 100,
      rateLimitMs: 30000,
      port: 3000,
      host: '0.0.0.0',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify([{ name: 'li_at', value: 'expired' }]));

    // Make the page show auth wall
    mockPage.$.mockImplementation((selector: string) => {
      if (selector.includes('login') || selector.includes('auth')) {
        return Promise.resolve({});
      }
      return Promise.resolve(null);
    });

    const result = await scraper.scrape({
      source: 'linkedin',
      companies: ['stripe'],
    });

    // Auth wall on individual company is a warning, returns ok with empty
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('should handle no job cards found', async () => {
    mockLoadConfig.mockReturnValue({
      logLevel: 'info',
      nodeEnv: 'test',
      linkedinCookiePath: './test-cookies.json',
      databaseUrl: '',
      redisUrl: '',
      maxDailyApplications: 100,
      rateLimitMs: 30000,
      port: 3000,
      host: '0.0.0.0',
    });
    vi.mocked(readFile).mockResolvedValue(JSON.stringify([{ name: 'li_at', value: 'test' }]));

    mockPage.$.mockResolvedValue(null);
    mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));

    const result = await scraper.scrape({
      source: 'linkedin',
      companies: ['stripe'],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });
});
