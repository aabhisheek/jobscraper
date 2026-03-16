import type { FastifyPluginAsync } from 'fastify';
import { getPrismaClient } from '../../database/client.js';
import { JobRepository } from '../../database/job-repository.js';
import { ApplicationRepository } from '../../database/application-repository.js';

export const statsRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrismaClient();
  const jobRepo = new JobRepository(prisma);
  const appRepo = new ApplicationRepository(prisma);

  // GET /api/stats — dashboard stats
  app.get('/', async (_request, reply) => {
    const [jobCounts, appCounts, totalJobs, todayJobs] = await Promise.all([
      jobRepo.countByStatus(),
      appRepo.countByStatus(),
      prisma.job.count(),
      prisma.job.count({
        where: {
          dateScraped: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return reply.send({
      jobs: {
        total: totalJobs,
        scrapedToday: todayJobs,
        byStatus: jobCounts.isOk() ? jobCounts.value : {},
      },
      applications: {
        byStatus: appCounts.isOk() ? appCounts.value : {},
      },
    });
  });
};
