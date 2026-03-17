import { GreenhouseScraper } from '../src/scrapers/greenhouse.js';
import { LeverScraper } from '../src/scrapers/lever.js';
import { LinkedInScraper } from '../src/scrapers/linkedin.js';
import { WellfoundScraper } from '../src/scrapers/wellfound.js';
import { NaukriScraper } from '../src/scrapers/naukri.js';
import {
  normalizeGreenhouseJob,
  normalizeLeverJob,
  normalizeLinkedInJob,
  normalizeWellfoundJob,
  normalizeNaukriJob,
} from '../src/parser/normalizer.js';
import { JobRepository } from '../src/database/job-repository.js';
import { getPrismaClient, disconnectPrisma } from '../src/database/client.js';
import {
  GREENHOUSE_COMPANIES,
  LEVER_COMPANIES,
  LINKEDIN_COMPANIES,
  WELLFOUND_COMPANIES,
  NAUKRI_KEYWORDS,
} from '../src/scrapers/company-list.js';
import type { RawJob } from '../src/scrapers/scraper.interface.js';
import type { NormalizedJob, JobSource } from '../src/common/types.js';
import { createChildLogger } from '../src/common/logger.js';

const log = createChildLogger('scrape-once');

function parseArgs(): { source: JobSource; company?: string } {
  const args = process.argv.slice(2);
  let source: JobSource = 'greenhouse';
  let company: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      source = args[i + 1] as JobSource;
      i++;
    } else if (args[i] === '--company' && args[i + 1]) {
      company = args[i + 1];
      i++;
    }
  }

  return { source, company };
}

async function main() {
  const { source, company } = parseArgs();
  log.info({ source, company }, 'Starting one-shot scrape');

  let rawJobs: RawJob[] = [];

  if (source === 'greenhouse') {
    const scraper = new GreenhouseScraper();
    const companies = company ? [company] : [...GREENHOUSE_COMPANIES];
    const result = await scraper.scrape({ source: 'greenhouse', companies });
    if (result.isErr()) {
      log.error({ error: result.error.message }, 'Scrape failed');
      process.exit(1);
    }
    rawJobs = result.value;
  } else if (source === 'lever') {
    const scraper = new LeverScraper();
    const companies = company ? [company] : [...LEVER_COMPANIES];
    const result = await scraper.scrape({ source: 'lever', companies });
    if (result.isErr()) {
      log.error({ error: result.error.message }, 'Scrape failed');
      process.exit(1);
    }
    rawJobs = result.value;
  } else if (source === 'linkedin') {
    const scraper = new LinkedInScraper();
    const companies = company ? [company] : [...LINKEDIN_COMPANIES];
    const result = await scraper.scrape({ source: 'linkedin', companies });
    if (result.isErr()) {
      log.error({ error: result.error.message }, 'Scrape failed');
      process.exit(1);
    }
    rawJobs = result.value;
  } else if (source === 'wellfound') {
    const scraper = new WellfoundScraper();
    const companies = company ? [company] : [...WELLFOUND_COMPANIES];
    const result = await scraper.scrape({ source: 'wellfound', companies });
    if (result.isErr()) {
      log.error({ error: result.error.message }, 'Scrape failed');
      process.exit(1);
    }
    rawJobs = result.value;
  } else if (source === 'naukri') {
    const scraper = new NaukriScraper();
    const keywords = company ? [company] : [...NAUKRI_KEYWORDS];
    const result = await scraper.scrape({ source: 'naukri', companies: keywords });
    if (result.isErr()) {
      log.error({ error: result.error.message }, 'Scrape failed');
      process.exit(1);
    }
    rawJobs = result.value;
  } else {
    log.error({ source }, 'Unsupported source');
    process.exit(1);
  }

  log.info({ rawCount: rawJobs.length }, 'Scrape complete, normalizing...');

  const normalizedJobs: NormalizedJob[] = [];
  for (const raw of rawJobs) {
    const data = raw.rawData as Record<string, unknown>;
    let result;
    if (source === 'greenhouse') {
      result = normalizeGreenhouseJob(data as Parameters<typeof normalizeGreenhouseJob>[0]);
    } else if (source === 'lever') {
      result = normalizeLeverJob(data as Parameters<typeof normalizeLeverJob>[0]);
    } else if (source === 'linkedin') {
      result = normalizeLinkedInJob(data as Parameters<typeof normalizeLinkedInJob>[0]);
    } else if (source === 'wellfound') {
      result = normalizeWellfoundJob(data as Parameters<typeof normalizeWellfoundJob>[0]);
    } else {
      result = normalizeNaukriJob(data as Parameters<typeof normalizeNaukriJob>[0]);
    }

    if (result.isOk()) {
      normalizedJobs.push(result.value);
    } else {
      log.warn({ error: result.error.message }, 'Normalization failed for job');
    }
  }

  log.info({ normalizedCount: normalizedJobs.length }, 'Normalization complete, storing...');

  const prisma = getPrismaClient();
  const repo = new JobRepository(prisma);
  const storeResult = await repo.upsertMany(normalizedJobs);

  if (storeResult.isOk()) {
    log.info({ stored: storeResult.value }, 'Jobs stored successfully');
    console.log(`\nSummary:`);
    console.log(`  Source: ${source}`);
    console.log(`  Raw jobs scraped: ${rawJobs.length}`);
    console.log(`  Jobs normalized: ${normalizedJobs.length}`);
    console.log(`  Jobs stored/updated: ${storeResult.value}`);
  } else {
    log.error({ error: storeResult.error.message }, 'Failed to store jobs');
  }

  await disconnectPrisma();
}

main().catch((error: unknown) => {
  log.error({ error }, 'Unexpected error');
  process.exit(1);
});
