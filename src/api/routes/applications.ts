import type { FastifyPluginAsync } from 'fastify';
import { getPrismaClient } from '../../database/client.js';
import { ApplicationRepository } from '../../database/application-repository.js';
import type { ApplicationStatus } from '../../common/types.js';

export const applicationRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrismaClient();
  const appRepo = new ApplicationRepository(prisma);

  // GET /api/applications — list applications
  app.get<{
    Querystring: { status?: string; limit?: string; offset?: string };
  }>('/', async (request, reply) => {
    const { status, limit = '50', offset = '0' } = request.query;

    const where: Record<string, unknown> = {};
    if (status) where['status'] = status;

    const applications = await prisma.application.findMany({
      where,
      include: { job: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit, 10), 100),
      skip: parseInt(offset, 10),
    });

    const total = await prisma.application.count({ where });

    return reply.send({
      applications,
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  });

  // PATCH /api/applications/:id — update status
  app.patch<{ Params: { id: string }; Body: { status: ApplicationStatus; notes?: string } }>(
    '/:id',
    async (request, reply) => {
      const result = await appRepo.updateStatus(
        request.params.id,
        request.body.status,
        request.body.notes,
      );

      if (result.isErr()) {
        return reply.status(404).send({ error: result.error.message });
      }

      return reply.send(result.value);
    },
  );
};
