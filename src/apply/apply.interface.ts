import type { Result } from 'neverthrow';
import type { Page } from 'playwright';
import type { ApplyError } from '../common/errors.js';
import type { Profile } from '../common/types.js';

export interface ApplyResult {
  readonly success: boolean;
  readonly message: string;
  readonly screenshotPath?: string;
}

export interface ApplyBot {
  readonly platform: string;
  apply(applyLink: string, profile: Profile, page: Page): Promise<Result<ApplyResult, ApplyError>>;
}
