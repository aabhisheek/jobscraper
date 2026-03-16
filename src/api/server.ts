import Fastify from 'fastify';
import cors from '@fastify/cors';
import { jobRoutes } from './routes/jobs.js';
import { applicationRoutes } from './routes/applications.js';
import { statsRoutes } from './routes/stats.js';
import { createChildLogger } from '../common/logger.js';
import { loadConfig } from '../../config/default.js';

export async function createServer() {
  const config = loadConfig();
  const log = createChildLogger('api');

  const app = Fastify({
    logger: false, // We use Pino directly
  });

  await app.register(cors, {
    origin: true,
  });

  // Register routes
  await app.register(jobRoutes, { prefix: '/api/jobs' });
  await app.register(applicationRoutes, { prefix: '/api/applications' });
  await app.register(statsRoutes, { prefix: '/api/stats' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  log.info({ port: config.port, host: config.host }, 'API server configured');
  return app;
}
