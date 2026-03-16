import { z } from 'zod/v4';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  databaseUrl: z.string().min(1),
  redisUrl: z.string().min(1),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  maxDailyApplications: z.coerce.number().int().positive().default(100),
  rateLimitMs: z.coerce.number().int().positive().default(30000),
  port: z.coerce.number().int().positive().default(3000),
  host: z.string().default('0.0.0.0'),
});

export type AppConfig = z.infer<typeof configSchema>;

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const result = configSchema.safeParse({
    databaseUrl: process.env['DATABASE_URL'],
    redisUrl: process.env['REDIS_URL'],
    nodeEnv: process.env['NODE_ENV'],
    logLevel: process.env['LOG_LEVEL'],
    maxDailyApplications: process.env['MAX_DAILY_APPLICATIONS'],
    rateLimitMs: process.env['RATE_LIMIT_MS'],
    port: process.env['PORT'],
    host: process.env['HOST'],
  });

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    throw new Error(`Invalid configuration:\n${formatted}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}
