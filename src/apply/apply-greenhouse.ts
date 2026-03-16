import type { Page } from 'playwright';
import { ok, err, type Result } from 'neverthrow';
import { ApplyError } from '../common/errors.js';
import type { Profile } from '../common/types.js';
import type { ApplyBot, ApplyResult } from './apply.interface.js';
import { humanType, humanClick, randomDelay, scrollSlowly } from '../safety/human-behavior.js';
import { createChildLogger } from '../common/logger.js';

const log = createChildLogger('apply-greenhouse');

export class GreenhouseApplyBot implements ApplyBot {
  readonly platform = 'greenhouse';

  async apply(
    applyLink: string,
    profile: Profile,
    page: Page,
  ): Promise<Result<ApplyResult, ApplyError>> {
    log.info({ applyLink }, 'Starting Greenhouse application');

    try {
      await page.goto(applyLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await randomDelay(2000, 4000);

      // Check if application form exists
      const form = await page.$('#application_form, form[action*="applications"]');
      if (!form) {
        return err(new ApplyError('FORM_NOT_FOUND', 'greenhouse', 'No application form found'));
      }

      await scrollSlowly(page);

      // Fill basic fields
      await this.fillField(page, '#first_name', profile.name.split(' ')[0] ?? '');
      await this.fillField(page, '#last_name', profile.name.split(' ').slice(1).join(' '));
      await this.fillField(page, '#email', profile.email);
      await this.fillField(page, '#phone', profile.phone);

      // Fill LinkedIn and other URLs if fields exist
      await this.fillFieldIfExists(
        page,
        '[id*="linkedin"], [name*="linkedin"]',
        profile.linkedinUrl,
      );
      await this.fillFieldIfExists(page, '[id*="github"], [name*="github"]', profile.githubUrl);
      await this.fillFieldIfExists(
        page,
        '[id*="portfolio"], [id*="website"], [name*="website"]',
        profile.portfolioUrl,
      );

      // Upload resume if file input exists
      const resumeInput = await page.$('input[type="file"]');
      if (resumeInput && profile.resumePath) {
        await resumeInput.setInputFiles(profile.resumePath);
        await randomDelay(1000, 2000);
      }

      await randomDelay(2000, 5000);

      // Submit the form
      const submitButton = await page.$('input[type="submit"], button[type="submit"], #submit_app');
      if (!submitButton) {
        return err(new ApplyError('SUBMIT_FAILED', 'greenhouse', 'No submit button found'));
      }

      await humanClick(page, 'input[type="submit"], button[type="submit"], #submit_app');
      await randomDelay(3000, 5000);

      log.info({ applyLink }, 'Greenhouse application submitted');
      return ok({ success: true, message: 'Application submitted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error({ applyLink, error: message }, 'Greenhouse application failed');
      return err(new ApplyError('SUBMIT_FAILED', 'greenhouse', message));
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
