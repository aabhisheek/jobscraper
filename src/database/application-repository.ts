import type { Application, PrismaClient } from '@prisma/client';
import { ok, err, type Result } from 'neverthrow';
import { DatabaseError } from '../common/errors.js';
import type { ApplicationStatus } from '../common/types.js';

export class ApplicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(jobId: string, resumeUsed?: string): Promise<Result<Application, DatabaseError>> {
    try {
      const application = await this.prisma.application.create({
        data: {
          jobId,
          resumeUsed: resumeUsed ?? null,
        },
      });
      return ok(application);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new DatabaseError('CONNECTION_FAILED', message));
    }
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string,
  ): Promise<Result<Application, DatabaseError>> {
    try {
      const application = await this.prisma.application.update({
        where: { id },
        data: {
          status,
          notes: notes ?? undefined,
          dateApplied: status === 'applied' ? new Date() : undefined,
        },
      });
      return ok(application);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new DatabaseError('NOT_FOUND', message));
    }
  }

  async findByJobId(jobId: string): Promise<Result<Application[], DatabaseError>> {
    try {
      const applications = await this.prisma.application.findMany({
        where: { jobId },
        orderBy: { createdAt: 'desc' },
      });
      return ok(applications);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return err(new DatabaseError('CONNECTION_FAILED', message));
    }
  }

  async countByStatus(): Promise<Result<Record<string, number>, DatabaseError>> {
    try {
      const results = await this.prisma.application.groupBy({
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
