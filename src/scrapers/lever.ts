import { z } from 'zod/v4';
import { ok, err, type Result } from 'neverthrow';
import { ScraperError } from '../common/errors.js';
import type { ScrapeConfig } from '../common/types.js';
import type { RawJob, Scraper } from './scraper.interface.js';
import { createChildLogger } from '../common/logger.js';

const log = createChildLogger('lever-scraper');

const leverPostingSchema = z.object({
  id: z.string(),
  text: z.string(),
  categories: z.object({
    commitment: z.string().optional(),
    department: z.string().optional(),
    location: z.string().optional(),
    team: z.string().optional(),
  }),
  description: z.string().optional(),
  descriptionPlain: z.string().optional(),
  lists: z
    .array(
      z.object({
        text: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
  hostedUrl: z.string().optional(),
  applyUrl: z.string().optional(),
  createdAt: z.number(),
});

const leverResponseSchema = z.array(leverPostingSchema);

export type LeverRawJob = z.infer<typeof leverPostingSchema>;

export class LeverScraper implements Scraper {
  readonly name = 'lever' as const;

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

    log.info({ totalJobs: allJobs.length }, 'Lever scrape complete');
    return ok(allJobs);
  }

  private async scrapeCompany(company: string): Promise<Result<RawJob[], ScraperError>> {
    const url = `https://api.lever.co/v0/postings/${company}`;
    log.info({ company, url }, 'Scraping Lever company');

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new ScraperError('NETWORK_ERROR', 'lever', `${company}: ${message}`));
    }

    if (response.status === 429) {
      return err(new ScraperError('RATE_LIMITED', 'lever', `${company}: Rate limited`));
    }

    if (!response.ok) {
      return err(new ScraperError('NETWORK_ERROR', 'lever', `${company}: HTTP ${response.status}`));
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return err(new ScraperError('PARSE_FAILED', 'lever', `${company}: Invalid JSON`));
    }

    const parsed = leverResponseSchema.safeParse(json);
    if (!parsed.success) {
      return err(
        new ScraperError('PARSE_FAILED', 'lever', `${company}: ${z.prettifyError(parsed.error)}`),
      );
    }

    const jobs: RawJob[] = parsed.data.map((posting) => ({
      rawData: { ...posting, company },
      source: 'lever' as const,
      sourceId: posting.id,
    }));

    log.info({ company, count: jobs.length }, 'Scraped Lever company');
    return ok(jobs);
  }
}
