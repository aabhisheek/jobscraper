import { z } from 'zod/v4';
import { ok, err, type Result } from 'neverthrow';
import { ScraperError } from '../common/errors.js';
import type { ScrapeConfig } from '../common/types.js';
import type { RawJob, Scraper } from './scraper.interface.js';
import { withBrowser, createStealthPage } from './browser-helpers.js';
import { randomDelay } from '../safety/human-behavior.js';
import { createChildLogger } from '../common/logger.js';

const log = createChildLogger('naukri-scraper');

const SELECTORS = {
  jobCard: '.srp-jobtuple-wrapper, article.jobTuple, .cust-job-tuple',
  title: '.title, a.title, .row1 a',
  company: '.comp-name, .subTitle a, .row2 .comp-dtls-wrap a',
  location: '.loc, .locWdth, .row2 .loc-wrap span',
  experience: '.exp, .expwdth, .row2 .exp-wrap span',
  salary: '.sal, .salwdth, .row2 .sal-wrap span',
  skills: '.tags .tag, .row3 .tag-li, .key-skill .tag',
  link: 'a.title, a[href*="naukri.com/job-listings"]',
  jobId: '[data-job-id], [data-jd-id]',
  description: '.job-desc, .jd-desc, section[class*="styles_JDC__dang-inner-html"]',
} as const;

export const naukriJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string(),
  description: z.string(),
  experience: z.string().nullable(),
  salary: z.string().nullable(),
  skills: z.array(z.string()),
  jobUrl: z.string(),
  naukriJobId: z.string().min(1),
});

export type NaukriRawJobData = z.infer<typeof naukriJobSchema> & { company: string };

export class NaukriScraper implements Scraper {
  readonly name = 'naukri' as const;

  async scrape(config: ScrapeConfig): Promise<Result<RawJob[], ScraperError>> {
    const allJobs: RawJob[] = [];

    for (const keyword of config.companies) {
      const result = await this.scrapeKeyword(keyword, config.maxPages ?? 3);
      if (result.isOk()) {
        allJobs.push(...result.value);
      } else {
        log.warn({ keyword, error: result.error.message }, 'Failed to scrape keyword');
      }
    }

    log.info({ totalJobs: allJobs.length }, 'Naukri scrape complete');
    return ok(allJobs);
  }

  private async scrapeKeyword(
    keyword: string,
    maxPages: number,
  ): Promise<Result<RawJob[], ScraperError>> {
    log.info({ keyword, maxPages }, 'Scraping Naukri keyword');

    return withBrowser(async (browser) => {
      const { page, close } = await createStealthPage(browser);
      const jobs: RawJob[] = [];

      try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          const url =
            pageNum === 1
              ? `https://www.naukri.com/${keyword}-jobs`
              : `https://www.naukri.com/${keyword}-jobs?pageNo=${pageNum}`;

          log.info({ keyword, page: pageNum, url }, 'Scraping Naukri page');

          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown';
            return err(new ScraperError('NETWORK_ERROR', 'naukri', `${keyword}: ${msg}`));
          }

          await randomDelay(2000, 4000);

          // Wait for job cards
          try {
            await page.waitForSelector(SELECTORS.jobCard, { timeout: 10000 });
          } catch {
            if (pageNum === 1) {
              log.warn({ keyword }, 'No job cards found');
            }
            break; // No more pages
          }

          const jobCards = await page.$$(SELECTORS.jobCard);
          if (jobCards.length === 0) break;

          for (const card of jobCards) {
            try {
              const title = await card
                .$eval(SELECTORS.title, (el) => el.textContent?.trim() ?? '')
                .catch(() => '');
              const companyName = await card
                .$eval(SELECTORS.company, (el) => el.textContent?.trim() ?? '')
                .catch(() => '');
              const location = await card
                .$eval(SELECTORS.location, (el) => el.textContent?.trim() ?? '')
                .catch(() => '');
              const experience = await card
                .$eval(SELECTORS.experience, (el) => el.textContent?.trim() ?? null)
                .catch(() => null);
              const salary = await card
                .$eval(SELECTORS.salary, (el) => el.textContent?.trim() ?? null)
                .catch(() => null);

              // Extract skill tags
              const skills = await card
                .$$eval(SELECTORS.skills, (els) =>
                  els.map((el) => el.textContent?.trim() ?? '').filter(Boolean),
                )
                .catch(() => [] as string[]);

              const linkEl = await card.$(SELECTORS.link);
              const href = linkEl ? ((await linkEl.getAttribute('href')) ?? '') : '';

              // Extract job ID
              const jobIdAttr =
                (await card.getAttribute('data-job-id')) ?? (await card.getAttribute('data-jd-id'));
              const jobIdFromUrl = href.match(/job-listings-.*?-(\d+)/)?.[1];
              const naukriJobId = jobIdAttr ?? jobIdFromUrl ?? '';

              if (!title || !naukriJobId) continue;

              // Navigate to detail page for full description
              let description = '';
              if (href) {
                const fullUrl = href.startsWith('http') ? href : `https://www.naukri.com${href}`;
                await randomDelay(2000, 5000);
                await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await randomDelay(1500, 3000);

                description = await page
                  .$eval(SELECTORS.description, (el) => el.textContent?.trim() ?? '')
                  .catch(() => '');

                // Navigate back to search page
                const backUrl =
                  pageNum === 1
                    ? `https://www.naukri.com/${keyword}-jobs`
                    : `https://www.naukri.com/${keyword}-jobs?pageNo=${pageNum}`;
                await page.goto(backUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await randomDelay(1000, 2000);
              }

              const rawData: NaukriRawJobData = {
                title,
                company: companyName,
                location,
                description,
                experience: experience || null,
                salary: salary || null,
                skills,
                jobUrl: href.startsWith('http') ? href : `https://www.naukri.com${href}`,
                naukriJobId,
              };

              jobs.push({
                rawData,
                source: 'naukri',
                sourceId: naukriJobId,
              });
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Unknown';
              log.warn({ keyword, error: msg }, 'Failed to extract job card');
            }
          }

          log.info({ keyword, page: pageNum, count: jobCards.length }, 'Scraped Naukri page');

          if (pageNum < maxPages) {
            await randomDelay(3000, 5000);
          }
        }

        log.info({ keyword, totalJobs: jobs.length }, 'Scraped Naukri keyword');
        return ok(jobs);
      } finally {
        await close();
      }
    });
  }
}
