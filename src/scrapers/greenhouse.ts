import { z } from 'zod/v4';
import { ok, err, type Result } from 'neverthrow';
import { ScraperError } from '../common/errors.js';
import type { ScrapeConfig } from '../common/types.js';
import type { RawJob, Scraper } from './scraper.interface.js';
import { createChildLogger } from '../common/logger.js';

const log = createChildLogger('greenhouse-scraper');

const greenhouseJobSchema = z.object({
  id: z.number(),
  title: z.string(),
  updated_at: z.string(),
  absolute_url: z.string(),
  location: z.object({ name: z.string() }),
  content: z.string().optional(),
  departments: z.array(z.object({ name: z.string() })).optional(),
});

const greenhouseResponseSchema = z.object({
  jobs: z.array(greenhouseJobSchema),
});

export type GreenhouseRawJob = z.infer<typeof greenhouseJobSchema>;

export class GreenhouseScraper implements Scraper {
  readonly name = 'greenhouse' as const;

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

    log.info({ totalJobs: allJobs.length }, 'Greenhouse scrape complete');
    return ok(allJobs);
  }

  private async scrapeCompany(company: string): Promise<Result<RawJob[], ScraperError>> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`;
    log.info({ company, url }, 'Scraping Greenhouse company');

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new ScraperError('NETWORK_ERROR', 'greenhouse', `${company}: ${message}`));
    }

    if (response.status === 429) {
      return err(new ScraperError('RATE_LIMITED', 'greenhouse', `${company}: Rate limited`));
    }

    if (!response.ok) {
      return err(
        new ScraperError('NETWORK_ERROR', 'greenhouse', `${company}: HTTP ${response.status}`),
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return err(new ScraperError('PARSE_FAILED', 'greenhouse', `${company}: Invalid JSON`));
    }

    const parsed = greenhouseResponseSchema.safeParse(json);
    if (!parsed.success) {
      return err(
        new ScraperError(
          'PARSE_FAILED',
          'greenhouse',
          `${company}: ${z.prettifyError(parsed.error)}`,
        ),
      );
    }

    const jobs: RawJob[] = parsed.data.jobs.map((job) => ({
      rawData: { ...job, company },
      source: 'greenhouse' as const,
      sourceId: String(job.id),
    }));

    log.info({ company, count: jobs.length }, 'Scraped Greenhouse company');
    return ok(jobs);
  }
}
