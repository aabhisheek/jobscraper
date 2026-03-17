import type { Page, Locator } from 'playwright';
import { ok, err, type Result } from 'neverthrow';
import { ApplyError } from '../common/errors.js';
import type { Profile } from '../common/types.js';
import type { ApplyBot, ApplyOptions, ApplyResult } from './apply.interface.js';
import { randomDelay, scrollSlowly } from '../safety/human-behavior.js';
import { createChildLogger } from '../common/logger.js';

const log = createChildLogger('apply-greenhouse');

export class GreenhouseApplyBot implements ApplyBot {
  readonly platform = 'greenhouse';

  async apply(
    applyLink: string,
    profile: Profile,
    page: Page,
    options?: ApplyOptions,
  ): Promise<Result<ApplyResult, ApplyError>> {
    log.info({ applyLink }, 'Starting Greenhouse application');

    try {
      // Rewrite company career page URLs to direct Greenhouse form
      const directUrl = this.toDirectGreenhouseUrl(applyLink);
      log.info({ directUrl }, 'Navigating to application form');

      await page.goto(directUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await randomDelay(2000, 4000);

      // Detect form — broad selectors, page.$() with catch (proven to work)
      const FORM_SELECTORS = [
        '#application_form',
        'form[action*="applications"]',
        'form[data-controller*="application"]',
        '[class*="application"]',
      ];

      let formFound = false;
      for (const sel of FORM_SELECTORS) {
        const el = await page.$(sel).catch(() => null);
        if (el) {
          formFound = true;
          log.info({ selector: sel }, 'Form detected');
          break;
        }
      }

      // If no form yet, try clicking an Apply button
      if (!formFound) {
        const applyButton = await page
          .$(
            'a[href*="greenhouse"], a[href*="apply"], button:has-text("Apply"), a:has-text("Apply")',
          )
          .catch(() => null);
        if (applyButton) {
          await applyButton.click();
          await randomDelay(2000, 4000);
          for (const sel of FORM_SELECTORS) {
            const el = await page.$(sel).catch(() => null);
            if (el) {
              formFound = true;
              break;
            }
          }
        }
      }

      if (!formFound) {
        return err(new ApplyError('FORM_NOT_FOUND', 'greenhouse', 'No application form found'));
      }

      await scrollSlowly(page);

      // Fill basic fields
      const firstName = profile.name.split(' ')[0] ?? '';
      const lastName = profile.name.split(' ').slice(1).join(' ');

      await this.fillByLabel(page, 'First Name', firstName);
      await this.fillByLabel(page, 'Last Name', lastName);
      await this.fillByLabel(page, 'Email', profile.email);
      await this.fillByLabel(page, 'Phone', profile.phone);
      await this.fillByLabel(page, 'LinkedIn', profile.linkedinUrl);
      await this.fillByLabel(page, 'GitHub', profile.githubUrl);
      await this.fillByLabel(page, 'Portfolio', profile.portfolioUrl);
      await this.fillByLabel(page, 'Website', profile.portfolioUrl);

      // Upload resume
      if (profile.resumePath) {
        const resumeInput = await page
          .$(
            'input[type="file"][id*="resume"], input[type="file"][name*="resume"], input[type="file"]',
          )
          .catch(() => null);
        if (resumeInput) {
          await resumeInput.setInputFiles(profile.resumePath);
          log.info('Resume uploaded');
          await randomDelay(1000, 2000);
        }
      }

      await randomDelay(2000, 5000);

      // Scroll all the way to bottom to ensure lazy-loaded content is rendered
      await this.scrollToBottom(page);
      await randomDelay(1000, 2000);

      // Find submit button
      const submitLocator = await this.findSubmitButton(page);
      if (!submitLocator) {
        return err(new ApplyError('SUBMIT_FAILED', 'greenhouse', 'No submit button found'));
      }

      if (options?.dryRun) {
        log.info({ applyLink }, 'DRY RUN: form filled but not submitted');
        return ok({ success: true, message: 'DRY RUN: form filled but not submitted' });
      }

      await submitLocator.scrollIntoViewIfNeeded();
      await submitLocator.click();
      await randomDelay(3000, 5000);

      log.info({ applyLink }, 'Greenhouse application submitted');
      return ok({ success: true, message: 'Application submitted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error({ applyLink, error: message }, 'Greenhouse application failed');
      return err(new ApplyError('SUBMIT_FAILED', 'greenhouse', message));
    }
  }

  private toDirectGreenhouseUrl(url: string): string {
    const ghJidMatch = url.match(/[?&]gh_jid=(\d+)/);
    if (ghJidMatch) {
      const parsed = new URL(url);
      const companySlug = parsed.hostname.replace('.com', '').replace('www.', '');
      return `https://boards.greenhouse.io/${companySlug}/jobs/${ghJidMatch[1]}#app`;
    }

    if (url.includes('boards.greenhouse.io') && !url.includes('#app')) {
      return `${url}#app`;
    }

    return url;
  }

  private async fillByLabel(page: Page, labelText: string, value: string): Promise<void> {
    if (!value) return;

    // Strategy 1: Playwright getByLabel (handles label[for] + aria-label)
    try {
      const field = page.getByLabel(labelText, { exact: false }).first();
      if ((await field.count()) > 0) {
        await field.click();
        await field.fill(value);
        log.info({ labelText }, 'Filled field via getByLabel');
        await randomDelay(300, 800);
        return;
      }
    } catch {
      // Fall through
    }

    // Strategy 2: id/name/placeholder containing the label slug
    const slug = labelText.toLowerCase().replace(/\s+/g, '_');
    const selectors = [
      `#${slug}`,
      `input[name*="${slug}"]`,
      `input[autocomplete*="${slug}"]`,
      `input[id*="${slug}"]`,
      `input[placeholder*="${labelText}"]`,
      `textarea[name*="${slug}"]`,
    ];

    for (const sel of selectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        await el.click();
        await el.fill(value);
        log.info({ labelText, selector: sel }, 'Filled field via selector');
        await randomDelay(300, 800);
        return;
      }
    }

    log.debug({ labelText }, 'Field not found — skipping');
  }

  private async scrollToBottom(page: Page): Promise<void> {
    let previousHeight = 0;
    for (let i = 0; i < 20; i++) {
      const currentHeight = await page.evaluate('document.body.scrollHeight') as number;
      if (currentHeight === previousHeight) break;
      previousHeight = currentHeight;
      await page.evaluate('window.scrollBy(0, 500)');
      await randomDelay(300, 600);
    }
    // Scroll back to top so we can work with the full page
    await page.evaluate('window.scrollTo(0, 0)');
    await randomDelay(500, 1000);
  }

  private async findSubmitButton(page: Page): Promise<Locator | null> {
    const candidates = [
      page.locator('#submit_app'),
      page.locator('input[type="submit"]'),
      page.locator('button[type="submit"]'),
      page.locator('button:has-text("Submit Application")'),
      page.locator('button:has-text("Submit application")'),
      page.locator('button:has-text("Submit")'),
      page.locator('input[value*="Submit"]'),
      page.locator('[data-action*="submit"]'),
      page.locator('button[class*="submit"]'),
      page.locator('a[class*="submit"]'),
    ];

    for (const loc of candidates) {
      const count = await loc.count().catch(() => 0);
      if (count > 0) {
        log.info({ selector: loc.toString(), count }, 'Submit button found');
        return loc.first();
      }
    }

    // Last resort: log what buttons exist on the page for debugging
    const allButtons = await page.$$eval(
      'button, input[type="submit"], [role="button"]',
      (els) => els.map((e) => ({ tag: e.tagName, text: e.textContent?.trim().slice(0, 50), id: e.id, type: e.getAttribute('type') })),
    ).catch(() => []);
    log.warn({ allButtons }, 'No submit button matched — listing all buttons for debug');

    return null;
  }
}
