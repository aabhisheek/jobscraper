import type { FastifyPluginAsync } from 'fastify';
import { getPrismaClient } from '../../database/client.js';
import { JobRepository } from '../../database/job-repository.js';

export const jobRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrismaClient();
  const jobRepo = new JobRepository(prisma);

  // GET /api/jobs — list jobs with optional filters
  app.get<{
    Querystring: {
      source?: string;
      status?: string;
      minScore?: string;
      limit?: string;
      offset?: string;
    };
  }>('/', async (request, reply) => {
    const { source, status, minScore, limit = '50', offset = '0' } = request.query;

    const where: Record<string, unknown> = {};
    if (source) where['source'] = source;
    if (status) where['status'] = status;
    if (minScore) where['score'] = { gte: parseInt(minScore, 10) };

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { dateScraped: 'desc' },
      take: Math.min(parseInt(limit, 10), 100),
      skip: parseInt(offset, 10),
    });

    const total = await prisma.job.count({ where });

    return reply.send({ jobs, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
  });

  // GET /api/jobs/:id — single job with applications
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const job = await prisma.job.findUnique({
      where: { id: request.params.id },
      include: { applications: true },
    });

    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    return reply.send(job);
  });

  // PATCH /api/jobs/:id/score — update score
  app.patch<{ Params: { id: string }; Body: { score: number } }>(
    '/:id/score',
    async (request, reply) => {
      const result = await jobRepo.updateScore(request.params.id, request.body.score);
      if (result.isErr()) {
        return reply.status(404).send({ error: result.error.message });
      }
      return reply.send(result.value);
    },
  );
};
