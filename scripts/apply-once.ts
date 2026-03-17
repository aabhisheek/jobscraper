import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GreenhouseApplyBot } from '../src/apply/apply-greenhouse.js';
import { LeverApplyBot } from '../src/apply/apply-lever.js';
import type { ApplyBot } from '../src/apply/apply.interface.js';
import { withBrowser, createStealthPage } from '../src/scrapers/browser-helpers.js';
import { JobRepository } from '../src/database/job-repository.js';
import { ApplicationRepository } from '../src/database/application-repository.js';
import { getPrismaClient, disconnectPrisma } from '../src/database/client.js';
import type { Profile } from '../src/common/types.js';
import { createChildLogger } from '../src/common/logger.js';

const log = createChildLogger('apply-once');

interface CliArgs {
  jobId?: string;
  source?: 'greenhouse' | 'lever';
  dryRun: boolean;
  headless: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let jobId: string | undefined;
  let source: 'greenhouse' | 'lever' | undefined;
  let dryRun = false;
  let headless = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--jobId' && args[i + 1]) {
      jobId = args[i + 1];
      i++;
    } else if (arg === '--source' && args[i + 1]) {
      const val = args[i + 1];
      if (val !== 'greenhouse' && val !== 'lever') {
        console.error(`Unsupported source: ${val}. Only 'greenhouse' and 'lever' have apply bots.`);
        process.exit(1);
      }
      source = val as 'greenhouse' | 'lever';
      i++;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--headless' && args[i + 1]) {
      headless = args[i + 1] !== 'false';
      i++;
    }
  }

  if (!jobId && !source) {
    console.error(
      'Usage: tsx scripts/apply-once.ts --jobId <id> | --source <greenhouse|lever> [--dry-run] [--headless false]',
    );
    process.exit(1);
  }

  return { jobId, source, dryRun, headless };
}

function loadProfile(): Profile {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const profilePath = path.resolve(scriptDir, '../profile/profile.json');

  if (!fs.existsSync(profilePath)) {
    console.error(`Profile not found at ${profilePath}`);
    console.error(
      'Copy profile/profile.example.json to profile/profile.json and fill in your data.',
    );
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(profilePath, 'utf-8')) as Profile;

  if (!raw.name || !raw.email || !raw.phone) {
    console.error('Profile is missing required fields: name, email, and phone are required.');
    process.exit(1);
  }

  return raw;
}

function getBotForPlatform(applyType: string): ApplyBot | null {
  if (applyType === 'greenhouse') return new GreenhouseApplyBot();
  if (applyType === 'lever') return new LeverApplyBot();
  return null;
}

function ensureScreenshotDir(): string {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const dir = path.resolve(scriptDir, '../screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function main() {
  const cliArgs = parseArgs();
  log.info(
    { jobId: cliArgs.jobId, source: cliArgs.source, dryRun: cliArgs.dryRun },
    'Starting apply-once',
  );

  // 1. Load profile
  const profile = loadProfile();
  log.info({ name: profile.name }, 'Profile loaded');

  // Resolve resume path to absolute
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const resolvedResumePath =
    profile.resumePath && !path.isAbsolute(profile.resumePath)
      ? path.resolve(scriptDir, '..', profile.resumePath)
      : profile.resumePath;
  const resolvedProfile: Profile = { ...profile, resumePath: resolvedResumePath };

  // 2. Get job from database
  const prisma = getPrismaClient();
  const jobRepo = new JobRepository(prisma);

  let job;

  if (cliArgs.jobId) {
    const found = await prisma.job.findUnique({ where: { id: cliArgs.jobId } });
    if (!found) {
      log.error({ jobId: cliArgs.jobId }, 'Job not found in database');
      process.exit(1);
    }
    job = found;
  } else {
    const result = await jobRepo.findUnapplied();
    if (result.isErr()) {
      log.error({ error: result.error.message }, 'Failed to query unapplied jobs');
      process.exit(1);
    }
    const filtered = result.value.filter((j) => j.source === cliArgs.source);
    const firstJob = filtered[0];
    if (!firstJob) {
      console.log(`No unapplied jobs found for source: ${cliArgs.source}`);
      process.exit(0);
    }
    job = firstJob;
  }

  log.info(
    { id: job.id, title: job.title, company: job.company, applyType: job.applyType },
    'Selected job',
  );
  console.log(`\nJob: ${job.title} @ ${job.company}`);
  console.log(`Apply link: ${job.applyLink}`);
  console.log(`Apply type: ${job.applyType}`);

  // 3. Select apply bot
  const bot = getBotForPlatform(job.applyType);
  if (!bot) {
    console.error(
      `No apply bot for platform "${job.applyType}". Only greenhouse and lever are supported.`,
    );
    process.exit(1);
  }

  // 4. Setup screenshots
  const screenshotDir = ensureScreenshotDir();

  // 5. Launch browser and apply
  const applyResult = await withBrowser(
    async (browser) => {
      const { page, close } = await createStealthPage(browser);

      try {
        const result = await bot.apply(job.applyLink, resolvedProfile, page, {
          dryRun: cliArgs.dryRun,
        });

        // Take screenshot
        const screenshotPath = path.join(screenshotDir, `apply-${job.id}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        log.info({ screenshotPath }, 'Screenshot saved');
        console.log(`Screenshot: ${screenshotPath}`);

        return result;
      } finally {
        await close();
      }
    },
    { headless: cliArgs.headless },
  );

  // 6. Handle result
  if (applyResult.isOk()) {
    const res = applyResult.value;
    log.info({ message: res.message }, 'Apply completed');

    if (!cliArgs.dryRun) {
      await jobRepo.updateStatus(job.id, 'applied');
      const appRepo = new ApplicationRepository(prisma);
      await appRepo.create(job.id, resolvedProfile.resumePath);
    }

    console.log(`\n--- Result ---`);
    console.log(`  Status:  ${res.message}`);
    console.log(`  Dry Run: ${cliArgs.dryRun}`);
  } else {
    const applyErr = applyResult.error;
    log.error({ code: applyErr.code, message: applyErr.message }, 'Apply failed');

    if (!cliArgs.dryRun) {
      await jobRepo.updateStatus(job.id, 'failed');
    }

    console.error(`\n--- Apply Failed ---`);
    console.error(`  Error: [${applyErr.code}] ${applyErr.message}`);
    process.exit(1);
  }

  await disconnectPrisma();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  log.error({ message, stack }, 'Unexpected error');
  console.error(message);
  process.exit(1);
});
