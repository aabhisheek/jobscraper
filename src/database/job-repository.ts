import type { Job, PrismaClient } from '@prisma/client';
import { ok, err, type Result } from 'neverthrow';
import { DatabaseError } from '../common/errors.js';
import type { NormalizedJob, JobSource, JobStatus } from '../common/types.js';

export class JobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(job: NormalizedJob): Promise<Result<Job, DatabaseError>> {
    try {
      const result = await this.prisma.job.upsert({
        where: {
          source_sourceId: {
            source: job.source,
            sourceId: job.sourceId,
          },
        },
        create: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          skills: [...job.skills],
          experience: job.experience,
          salary: job.salary,
          applyLink: job.applyLink,
          applyType: job.applyType,
          source: job.source,
          sourceId: job.sourceId,
        },
        update: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          skills: [...job.skills],
          experience: job.experience,
          salary: job.salary,
          applyLink: job.applyLink,
          applyType: job.applyType,
        },
      });
      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Unique constraint')) {
        return err(new DatabaseError('UNIQUE_VIOLATION', message));
      }
      return err(new DatabaseError('CONNECTION_FAILED', message));
    }
  }

  async upsertMany(jobs: readonly NormalizedJob[]): Promise<Result<number, DatabaseError>> {
    let count = 0;
    for (const job of jobs) {
      const result = await this.upsert(job);
      if (result.isOk()) count++;
    }
    return ok(count);
  }

  async findBySource(source: JobSource): Promise<Result<Job[], DatabaseError>> {
    try {
      const jobs = await this.prisma.job.findMany({
        where: { source },
        orderBy: { dateScraped: 'desc' },
      });
      return ok(jobs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new DatabaseError('CONNECTION_FAILED', message));
    }
  }

  async findUnapplied(minScore?: number): Promise<Result<Job[], DatabaseError>> {
    try {
      const jobs = await this.prisma.job.findMany({
        where: {
          status: { in: ['scraped', 'ranked'] },
          ...(minScore != null ? { score: { gte: minScore } } : {}),
        },
        orderBy: { score: 'desc' },
      });
      return ok(jobs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new DatabaseError('CONNECTION_FAILED', message));
    }
  }

  async updateStatus(id: string, status: JobStatus): Promise<Result<Job, DatabaseError>> {
    try {
      const job = await this.prisma.job.update({
        where: { id },
        data: { status },
      });
      return ok(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new DatabaseError('NOT_FOUND', message));
    }
  }

  async updateScore(id: string, score: number): Promise<Result<Job, DatabaseError>> {
    try {
      const job = await this.prisma.job.update({
        where: { id },
        data: { score, status: 'ranked' },
      });
      return ok(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new DatabaseError('NOT_FOUND', message));
    }
  }

  async countByStatus(): Promise<Result<Record<string, number>, DatabaseError>> {
    try {
      const results = await this.prisma.job.groupBy({
        by: ['status'],
        _count: { status: true },
      });
      const counts: Record<string, number> = {};
      for (const row of results) {
        counts[row.status] = row._count.status;
      }
      return ok(counts);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new DatabaseError('CONNECTION_FAILED', message));
    }
  }
}
