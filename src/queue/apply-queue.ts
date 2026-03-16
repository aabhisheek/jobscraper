import { Queue } from 'bullmq';
import type { Job } from '@prisma/client';
import { loadConfig } from '../../config/default.js';

export interface ApplyJobData {
  readonly jobId: string;
  readonly applyLink: string;
  readonly applyType: string;
  readonly company: string;
  readonly title: string;
}

let queueInstance: Queue<ApplyJobData> | null = null;

export function getApplyQueue(): Queue<ApplyJobData> {
  if (queueInstance) return queueInstance;

  const config = loadConfig();

  queueInstance = new Queue<ApplyJobData>('apply', {
    connection: { url: config.redisUrl },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  return queueInstance;
}

export function jobToApplyData(job: Job): ApplyJobData {
  return {
    jobId: job.id,
    applyLink: job.applyLink,
    applyType: job.applyType,
    company: job.company,
    title: job.title,
  };
}

export async function enqueueApplication(job: Job): Promise<string> {
  const queue = getApplyQueue();
  const bullJob = await queue.add('apply', jobToApplyData(job), {
    jobId: `apply-${job.id}`,
  });
  return bullJob.id ?? job.id;
}
