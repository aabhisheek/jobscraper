import { chromium, type Browser, type Page, type Cookie } from 'playwright';
import { getStealthLaunchOptions, getStealthContextOptions } from '../safety/stealth-config.js';
import { createChildLogger } from '../common/logger.js';

const log = createChildLogger('browser-helpers');

export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await chromium.launch(getStealthLaunchOptions());
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

export async function createStealthPage(
  browser: Browser,
  cookies?: Cookie[],
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext(getStealthContextOptions());

  if (cookies?.length) {
    await context.addCookies(cookies);
    log.debug({ count: cookies.length }, 'Injected cookies into browser context');
  }

  const page = await context.newPage();

  return {
    page,
    close: async () => {
      await context.close();
    },
  };
}
