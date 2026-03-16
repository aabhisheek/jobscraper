import pino from 'pino';
import { loadConfig } from '../../config/default.js';

const config = loadConfig();

export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: [
      'email',
      'phone',
      'profile.email',
      'profile.phone',
      'profile.name',
      '*.email',
      '*.phone',
    ],
  },
  transport:
    config.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
});

export function createChildLogger(component: string) {
  return logger.child({ component });
}
