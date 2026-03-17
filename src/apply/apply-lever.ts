import type { Page } from 'playwright';
import { ok, err, type Result } from 'neverthrow';
import { ApplyError } from '../common/errors.js';
import type { Profile } from '../common/types.js';
import type { ApplyBot, ApplyOptions, ApplyResult } from './apply.interface.js';
import { humanType, humanClick, randomDelay, scrollSlowly } from '../safety/human-behavior.js';
import { createChildLogger } from '../common/logger.js';

const log = createChildLogger('apply-lever');

export class LeverApplyBot implements ApplyBot {
  readonly platform = 'lever';

  async apply(
    applyLink: string,
    profile: Profile,
    page: Page,
    options?: ApplyOptions,
  ): Promise<Result<ApplyResult, ApplyError>> {
    log.info({ applyLink }, 'Starting Lever application');

    try {
      await page.goto(applyLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await randomDelay(2000, 4000);

      // Check if application form exists
      const form = await page.$('.application-form, form.postings-form');
      if (!form) {
        return err(new ApplyError('FORM_NOT_FOUND', 'lever', 'No application form found'));
      }

      await scrollSlowly(page);

      // Lever uses name attributes for form fields
      await this.fillField(page, 'input[name="name"]', profile.name);
      await this.fillField(page, 'input[name="email"]', profile.email);
      await this.fillField(page, 'input[name="phone"]', profile.phone);

      // Fill optional URLs
      await this.fillFieldIfExists(
        page,
        'input[name="urls[LinkedIn]"], input[name*="linkedin"]',
        profile.linkedinUrl,
      );
      await this.fillFieldIfExists(
        page,
        'input[name="urls[GitHub]"], input[name*="github"]',
        profile.githubUrl,
      );
      await this.fillFieldIfExists(
        page,
        'input[name="urls[Portfolio]"], input[name*="portfolio"], input[name*="website"]',
        profile.portfolioUrl,
      );

      // Upload resume
      const resumeInput = await page.$('input[type="file"][name="resume"]');
      if (resumeInput && profile.resumePath) {
        await resumeInput.setInputFiles(profile.resumePath);
        await randomDelay(1000, 2000);
      }

      await randomDelay(2000, 5000);

      // Submit
      const submitButton = await page.$('button[type="submit"], .postings-btn-submit');
      if (!submitButton) {
        return err(new ApplyError('SUBMIT_FAILED', 'lever', 'No submit button found'));
      }

      if (options?.dryRun) {
        log.info({ applyLink }, 'DRY RUN: form filled but not submitted');
        return ok({ success: true, message: 'DRY RUN: form filled but not submitted' });
      }

      await humanClick(page, 'button[type="submit"], .postings-btn-submit');
      await randomDelay(3000, 5000);

      log.info({ applyLink }, 'Lever application submitted');
      return ok({ success: true, message: 'Application submitted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error({ applyLink, error: message }, 'Lever application failed');
      return err(new ApplyError('SUBMIT_FAILED', 'lever', message));
    }
  }

  private async fillField(page: Page, selector: string, value: string): Promise<void> {
    const field = await page.$(selector);
    if (field) {
      await humanType(page, selector, value);
      await randomDelay(300, 800);
    }
  }

  private async fillFieldIfExists(page: Page, selector: string, value: string): Promise<void> {
    const field = await page.$(selector);
    if (field) {
      await humanType(page, selector, value);
      await randomDelay(300, 800);
    }
  }
}
