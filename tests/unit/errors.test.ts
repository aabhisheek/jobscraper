import { describe, it, expect } from 'vitest';
import { ScraperError, ApplyError, DatabaseError, QueueError } from '../../src/common/errors.js';

describe('error classes', () => {
  it('ScraperError should contain code and source', () => {
    const error = new ScraperError('TIMEOUT', 'greenhouse', 'Request timed out');
    expect(error.code).toBe('TIMEOUT');
    expect(error.source).toBe('greenhouse');
    expect(error.message).toBe('[greenhouse] TIMEOUT: Request timed out');
    expect(error.name).toBe('ScraperError');
    expect(error).toBeInstanceOf(Error);
  });

  it('ApplyError should contain code and platform', () => {
    const error = new ApplyError('FORM_NOT_FOUND', 'lever', 'No form element');
    expect(error.code).toBe('FORM_NOT_FOUND');
    expect(error.platform).toBe('lever');
    expect(error.message).toBe('[lever] FORM_NOT_FOUND: No form element');
    expect(error.name).toBe('ApplyError');
  });

  it('DatabaseError should contain code', () => {
    const error = new DatabaseError('NOT_FOUND', 'Job not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('DB NOT_FOUND: Job not found');
    expect(error.name).toBe('DatabaseError');
  });

  it('QueueError should contain code', () => {
    const error = new QueueError('REDIS_DOWN', 'Connection refused');
    expect(error.code).toBe('REDIS_DOWN');
    expect(error.message).toBe('Queue REDIS_DOWN: Connection refused');
    expect(error.name).toBe('QueueError');
  });
});
