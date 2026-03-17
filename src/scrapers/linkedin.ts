import { z } from 'zod/v4';
import { ok, err, type Result } from 'neverthrow';
import { readFile } from 'node:fs/promises';
import type { Cookie } from 'playwright';
import { ScraperError } from '../common/errors.js';
import type { ScrapeConfig } from '../common/types.js';
import type { RawJob, Scraper } from './scraper.interface.js';
import { withBrowser, createStealthPage } from './browser-helpers.js';
import { randomDelay, scrollSlowly } from '../safety/human-behavior.js';
import { createChildLogger } from '../common/logger.js';
import { loadConfig } from '../../config/default.js';

const log = createChildLogger('linkedin-scraper');

const SELECTORS = {
  jobCard: '.jobs-search__results-list li, .job-card-container, div[data-job-id]',
  title: '.base-search-card__title, .job-card-list__title, a.job-card-container__link span',
  company: '.base-search-card__subtitle, .job-card-container__company-name',
  location: '.job-search-card__location, .job-card-container__metadata-wrapper span',
  link: 'a.base-card__full-link, a[href*="/jobs/view/"]',
  description: '.description__text, .show-more-less-html__markup',
  easyApplyBadge: '.jobs-apply-button--top-card, button[aria-label*="Easy Apply"]',
  authWall: '.join-form, .login-form, form[action*="login"]',
} as const;

export const linkedInJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string(),
  description: z.string(),
  jobUrl: z.string(),
  linkedinJobId: z.string().min(1),
  isEasyApply: z.boolean(),
});

export type LinkedInRawJobData = z.infer<typeof linkedInJobSchema> & { company: string };

let cachedCookies: Cookie[] | null = null;

async function loadCookies(): Promise<Result<Cookie[], ScraperError>> {
  if (cachedCookies) return ok(cachedCookies);

  const config = loadConfig();
  if (!config.linkedinCookiePath) {
    return err(
      new ScraperError(
        'AUTH_WALL',
        'linkedin',
        'LINKEDIN_COOKIE_PATH not set — export cookies from a logged-in LinkedIn session',
      ),
    );
  }

  try {
    const raw = await readFile(config.linkedinCookiePath, 'utf-8');
    cachedCookies = JSON.parse(raw) as Cookie[];
    return ok(cachedCookies);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err(new ScraperError('AUTH_WALL', 'linkedin', `Failed to load cookies: ${message}`));
  }
}

export class LinkedInScraper implements Scraper {
  readonly name = 'linkedin' as const;

  async scrape(config: ScrapeConfig): Promise<Result<RawJob[], ScraperError>> {
    const cookiesResult = await loadCookies();
    if (cookiesResult.isErr()) {
      return err(cookiesResult.error);
    }
    const cookies = cookiesResult.value;

    const allJobs: RawJob[] = [];

    for (const company of config.companies) {
      const result = await this.scrapeCompany(company, cookies, config.maxPages ?? 3);
      if (result.isOk()) {
        allJobs.push(...result.value);
      } else {
        log.warn({ company, error: result.error.message }, 'Failed to scrape company');
      }
    }

    log.info({ totalJobs: allJobs.length }, 'LinkedIn scrape complete');
    return ok(allJobs);
  }

  private async scrapeCompany(
    company: string,
    cookies: Cookie[],
    maxScrolls: number,
  ): Promise<Result<RawJob[], ScraperError>> {
    const url = `https://www.linkedin.com/company/${company}/jobs/`;
    log.info({ company, url }, 'Scraping LinkedIn company');

    return withBrowser(async (browser) => {
      const { page, close } = await createStealthPage(browser, cookies);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(3000, 5000);

        // Check for auth wall
        const authWall = await page.$(SELECTORS.authWall);
        if (authWall) {
          return err(
            new ScraperError('AUTH_WALL', 'linkedin', `${company}: Redirected to login page`),
          );
        }

        // Wait for job cards
        try {
          await page.waitForSelector(SELECTORS.jobCard, { timeout: 10000 });
        } catch {
          log.warn({ company }, 'No job cards found');
          return ok([]);
        }

        // Scroll to load more jobs
        for (let i = 0; i < maxScrolls; i++) {
          await scrollSlowly(page, 800);
          await randomDelay(1500, 3000);
        }

        // Extract job cards
        const jobCards = await page.$$(SELECTORS.jobCard);
        const jobs: RawJob[] = [];

        for (const card of jobCards) {
          try {
            const title = await card
              .$eval(SELECTORS.title, (el) => el.textContent?.trim() ?? '')
              .catch(() => '');
            const companyName = await card
              .$eval(SELECTORS.company, (el) => el.textContent?.trim() ?? '')
              .catch(() => company);
            const location = await card
              .$eval(SELECTORS.location, (el) => el.textContent?.trim() ?? '')
              .catch(() => '');
            const linkEl = await card.$(SELECTORS.link);
            const href = linkEl ? ((await linkEl.getAttribute('href')) ?? '') : '';

            // Extract job ID from URL or data attribute
            const jobIdAttr = await card.getAttribute('data-job-id');
            const jobIdFromUrl = href.match(/\/jobs\/view\/(\d+)/)?.[1];
            const linkedinJobId = jobIdAttr ?? jobIdFromUrl ?? '';

            if (!title || !linkedinJobId) continue;

            // Navigate to job detail for description + Easy Apply detection
            let description = '';
            let isEasyApply = false;

            if (href) {
              const fullUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
              await randomDelay(3000, 6000);
              await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
              await randomDelay(2000, 4000);

              description = await page
                .$eval(SELECTORS.description, (el) => el.textContent?.trim() ?? '')
                .catch(() => '');
              isEasyApply = (await page.$(SELECTORS.easyApplyBadge)) !== null;

              // Go back to company jobs page
              await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
              await randomDelay(2000, 3000);
            }

            const rawData: LinkedInRawJobData = {
              title,
              company: companyName || company,
              location,
              description,
              jobUrl: href.startsWith('http') ? href : `https://www.linkedin.com${href}`,
              linkedinJobId,
              isEasyApply,
            };

            jobs.push({
              rawData,
              source: 'linkedin',
              sourceId: linkedinJobId,
            });
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown';
            log.warn({ company, error: msg }, 'Failed to extract job card');
          }
        }

        log.info({ company, count: jobs.length }, 'Scraped LinkedIn company');
        return ok(jobs);
      } finally {
        await close();
      }
    });
  }
}
