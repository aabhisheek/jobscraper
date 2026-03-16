import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, resetConfigCache } from '../../config/default.js';

describe('config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetConfigCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfigCache();
  });

  it('should load valid configuration from environment', () => {
    process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/test';
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    process.env['NODE_ENV'] = 'test';
    process.env['LOG_LEVEL'] = 'debug';

    const config = loadConfig();

    expect(config.databaseUrl).toBe('postgresql://user:pass@localhost:5432/test');
    expect(config.redisUrl).toBe('redis://localhost:6379');
    expect(config.nodeEnv).toBe('test');
    expect(config.logLevel).toBe('debug');
  });

  it('should use defaults for optional values', () => {
    process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/test';
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    delete process.env['NODE_ENV'];
    delete process.env['LOG_LEVEL'];
    delete process.env['MAX_DAILY_APPLICATIONS'];
    delete process.env['RATE_LIMIT_MS'];
    delete process.env['PORT'];
    delete process.env['HOST'];

    const config = loadConfig();

    expect(config.nodeEnv).toBe('development');
    expect(config.logLevel).toBe('info');
    expect(config.maxDailyApplications).toBe(100);
    expect(config.rateLimitMs).toBe(30000);
    expect(config.port).toBe(3000);
    expect(config.host).toBe('0.0.0.0');
  });

  it('should throw on missing required fields', () => {
    delete process.env['DATABASE_URL'];
    delete process.env['REDIS_URL'];

    expect(() => loadConfig()).toThrow('Invalid configuration');
  });

  it('should cache the config after first load', () => {
    process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/test';
    process.env['REDIS_URL'] = 'redis://localhost:6379';

    const config1 = loadConfig();
    process.env['DATABASE_URL'] = 'postgresql://changed@localhost/other';
    const config2 = loadConfig();

    expect(config1).toBe(config2);
    expect(config2.databaseUrl).toBe('postgresql://user:pass@localhost:5432/test');
  });
});
