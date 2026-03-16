import { createChildLogger } from './common/logger.js';
import { createServer } from './api/server.js';
import { loadConfig } from '../config/default.js';

const log = createChildLogger('main');

async function main() {
  const config = loadConfig();
  log.info('JobPilot starting...');

  // Start API server
  const server = await createServer();
  await server.listen({ port: config.port, host: config.host });
  log.info({ port: config.port }, 'API server listening');

  // Graceful shutdown
  const shutdown = async () => {
    log.info('Shutting down...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  log.error({ error }, 'Fatal error');
  process.exit(1);
});
