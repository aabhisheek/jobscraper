import { z } from 'zod/v4';
import { ok, type Result } from 'neverthrow';
import type { ScraperError } from '../common/errors.js';
import type { ScrapeConfig } from '../common/types.js';
import type { RawJob, Scraper } from './scraper.interface.js';
import { withBrowser, createStealthPage } from './browser-helpers.js';
import { randomDelay, scrollSlowly } from '../safety/human-behavior.js';
import { createChildLogger } from '../common/logger.js';

const log = createChildLogger('wellfound-scraper');

const SELECTORS = {
  jobCard: '[data-test="JobListing"], div[class*="JobListing"], .styles_component__',
  title: '[data-test="JobListingTitle"], a[class*="jobTitle"], h2 a, a[href*="/jobs/"]',
  compensation:
    '[data-test="JobListingCompensation"], div[class*="compensation"], span[class*="salary"]',
  location: '[data-test="JobListingLocation"], div[class*="location"], span[class*="location"]',
  description:
    '[data-test="JobDescription"], div[class*="description"], div[class*="jobDescription"]',
  link: 'a[href*="/jobs/"]',
} as const;

export const wellfoundJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string(),
  description: z.string(),
  salary: z.string().nullable(),
  jobUrl: z.string(),
  wellfoundJobId: z.string().min(1),
});

export type WellfoundRawJobData = z.infer<typeof wellfoundJobSchema> & { company: string };

export class WellfoundScraper implements Scraper {
  readonly name = 'wellfound' as const;

  async scrape(config: ScrapeConfig): Promise<Result<RawJob[], ScraperError>> {
    const allJobs: RawJob[] = [];

    for (const company of config.companies) {
      const result = await this.scrapeCompany(company);
      if (result.isOk()) {
        allJobs.push(...result.value);
      } else {
        log.warn({ company, error: result.error.message }, 'Failed to scrape company');
      }
    }

    log.info({ totalJobs: allJobs.length }, 'Wellfound scrape complete');
    return ok(allJobs);
  }

  private async scrapeCompany(company: string): Promise<Result<RawJob[], ScraperError>> {
    const url = `https://wellfound.com/company/${company}/jobs`;
    log.info({ company, url }, 'Scraping Wellfound company');

    return withBrowser(async (browser) => {
      const { page, close } = await createStealthPage(browser);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(2000, 4000);

        // Check for 404 or no jobs
        const pageContent = await page.content();
        if (pageContent.includes('Page not found') || pageContent.includes('404')) {
          log.warn({ company }, 'Company page not found');
          return ok([]);
        }

        // Scroll to load all content
        await scrollSlowly(page, 600);
        await randomDelay(1000, 2000);

        // Wait for job cards
        try {
          await page.waitForSelector(SELECTORS.jobCard, { timeout: 10000 });
        } catch {
          log.warn({ company }, 'No job cards found');
          return ok([]);
        }

        // Extract job cards
        const jobCards = await page.$$(SELECTORS.jobCard);
        const jobs: RawJob[] = [];

        for (const card of jobCards) {
          try {
            const title = await card
              .$eval(SELECTORS.title, (el) => el.textContent?.trim() ?? '')
              .catch(() => '');
            const location = await card
              .$eval(SELECTORS.location, (el) => el.textContent?.trim() ?? '')
              .catch(() => '');
            const salary = await card
              .$eval(SELECTORS.compensation, (el) => el.textContent?.trim() ?? null)
              .catch(() => null);
            const linkEl = await card.$(SELECTORS.link);
            const href = linkEl ? ((await linkEl.getAttribute('href')) ?? '') : '';

            // Extract job ID from URL path
            const jobIdMatch = href.match(/\/jobs\/([^/?#]+)/);
            const wellfoundJobId = jobIdMatch?.[1] ?? '';

            if (!title || !wellfoundJobId) continue;

            // Try to get description from the card
            let description = await card
              .$eval(SELECTORS.description, (el) => el.textContent?.trim() ?? '')
              .catch(() => '');

            // If no description in card, navigate to detail page
            if (!description && href) {
              const fullUrl = href.startsWith('http') ? href : `https://wellfound.com${href}`;
              await randomDelay(2000, 4000);
              await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
              await randomDelay(1500, 3000);

              description = await page
                .$eval(SELECTORS.description, (el) => el.textContent?.trim() ?? '')
                .catch(() => '');

              // Navigate back
              await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
              await randomDelay(1000, 2000);
            }

            const rawData: WellfoundRawJobData = {
              title,
              company,
              location,
              description,
              salary: salary || null,
              jobUrl: href.startsWith('http') ? href : `https://wellfound.com${href}`,
              wellfoundJobId,
            };

            jobs.push({
              rawData,
              source: 'wellfound',
              sourceId: wellfoundJobId,
            });
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown';
            log.warn({ company, error: msg }, 'Failed to extract job card');
          }
        }

        log.info({ company, count: jobs.length }, 'Scraped Wellfound company');
        return ok(jobs);
      } finally {
        await close();
      }
    });
  }
}
