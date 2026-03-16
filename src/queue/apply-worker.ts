import { Worker } from 'bullmq';
import type { Job as BullJob } from 'bullmq';
import type { ApplyJobData } from './apply-queue.js';
import { getPrismaClient } from '../database/client.js';
import { JobRepository } from '../database/job-repository.js';
import { ApplicationRepository } from '../database/application-repository.js';
import { createChildLogger } from '../common/logger.js';
import { loadConfig } from '../../config/default.js';

const log = createChildLogger('apply-worker');

async function processApplyJob(bullJob: BullJob<ApplyJobData>): Promise<void> {
  const { jobId, applyLink, applyType, company, title } = bullJob.data;
  log.info({ jobId, company, title, applyType }, 'Processing apply job');

  const prisma = getPrismaClient();
  const jobRepo = new JobRepository(prisma);
  const appRepo = new ApplicationRepository(prisma);

  // Create application record
  const appResult = await appRepo.create(jobId);
  if (appResult.isErr()) {
    log.error({ error: appResult.error.message }, 'Failed to create application record');
    throw new Error(appResult.error.message);
  }

  const application = appResult.value;

  try {
    // TODO: Phase 5 — Dispatch to apply bot based on applyType
    // For now, just mark as applied (placeholder)
    log.info({ applyLink, applyType }, 'Would apply here (bot not yet implemented)');

    await appRepo.updateStatus(application.id, 'applied');
    await jobRepo.updateStatus(jobId, 'applied');

    log.info({ jobId, company, title }, 'Application recorded');
  } catch (error) {
    await appRepo.updateStatus(
      application.id,
      'not_applied',
      error instanceof Error ? error.message : 'Unknown error',
    );
    await jobRepo.updateStatus(jobId, 'failed');
    throw error;
  }
}

export function startApplyWorker(): Worker<ApplyJobData> {
  const config = loadConfig();

  const worker = new Worker<ApplyJobData>('apply', processApplyJob, {
    connection: { url: config.redisUrl },
    concurrency: 1,
    limiter: {
      max: 1,
      duration: config.rateLimitMs,
    },
  });

  worker.on('completed', (job) => {
    log.info({ jobId: job.data.jobId }, 'Apply job completed');
  });

  worker.on('failed', (job, error) => {
    log.error({ jobId: job?.data.jobId, error: error.message }, 'Apply job failed');
  });

  log.info('Apply worker started');
  return worker;
}
