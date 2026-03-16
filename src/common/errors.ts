export const SCRAPER_ERROR_CODES = [
  'SELECTOR_NOT_FOUND',
  'TIMEOUT',
  'RATE_LIMITED',
  'NETWORK_ERROR',
  'PARSE_FAILED',
] as const;
export type ScraperErrorCode = (typeof SCRAPER_ERROR_CODES)[number];

export class ScraperError extends Error {
  readonly code: ScraperErrorCode;
  readonly source: string;

  constructor(code: ScraperErrorCode, source: string, message: string) {
    super(`[${source}] ${code}: ${message}`);
    this.name = 'ScraperError';
    this.code = code;
    this.source = source;
  }
}

export const APPLY_ERROR_CODES = [
  'FORM_NOT_FOUND',
  'FIELD_MISSING',
  'UPLOAD_FAILED',
  'SUBMIT_FAILED',
  'ALREADY_APPLIED',
] as const;
export type ApplyErrorCode = (typeof APPLY_ERROR_CODES)[number];

export class ApplyError extends Error {
  readonly code: ApplyErrorCode;
  readonly platform: string;

  constructor(code: ApplyErrorCode, platform: string, message: string) {
    super(`[${platform}] ${code}: ${message}`);
    this.name = 'ApplyError';
    this.code = code;
    this.platform = platform;
  }
}

export const DATABASE_ERROR_CODES = ['CONNECTION_FAILED', 'UNIQUE_VIOLATION', 'NOT_FOUND'] as const;
export type DatabaseErrorCode = (typeof DATABASE_ERROR_CODES)[number];

export class DatabaseError extends Error {
  readonly code: DatabaseErrorCode;

  constructor(code: DatabaseErrorCode, message: string) {
    super(`DB ${code}: ${message}`);
    this.name = 'DatabaseError';
    this.code = code;
  }
}

export const QUEUE_ERROR_CODES = ['REDIS_DOWN', 'JOB_STALLED', 'RATE_LIMITED'] as const;
export type QueueErrorCode = (typeof QUEUE_ERROR_CODES)[number];

export class QueueError extends Error {
  readonly code: QueueErrorCode;

  constructor(code: QueueErrorCode, message: string) {
    super(`Queue ${code}: ${message}`);
    this.name = 'QueueError';
    this.code = code;
  }
}
