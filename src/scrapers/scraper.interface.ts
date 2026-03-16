import type { Result } from 'neverthrow';
import type { ScraperError } from '../common/errors.js';
import type { JobSource, ScrapeConfig } from '../common/types.js';

export interface RawJob {
  readonly rawData: unknown;
  readonly source: JobSource;
  readonly sourceId: string;
}

export interface Scraper {
  readonly name: JobSource;
  scrape(config: ScrapeConfig): Promise<Result<RawJob[], ScraperError>>;
}
