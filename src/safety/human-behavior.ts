import type { Page } from 'playwright';

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function randomDelay(minMs = 500, maxMs = 2000): Promise<void> {
  const delay = randomBetween(minMs, maxMs);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector);
  await randomDelay(200, 500);

  for (const char of text) {
    await page.keyboard.type(char, { delay: randomBetween(30, 120) });
  }
}

export async function humanClick(page: Page, selector: string): Promise<void> {
  const element = await page.$(selector);
  if (!element) return;

  const box = await element.boundingBox();
  if (!box) return;

  // Click at a random position within the element
  const x = box.x + randomBetween(5, Math.max(10, box.width - 5));
  const y = box.y + randomBetween(3, Math.max(5, box.height - 3));

  await page.mouse.move(x, y, { steps: randomBetween(5, 15) });
  await randomDelay(100, 300);
  await page.mouse.click(x, y);
}

export async function scrollSlowly(page: Page, distance = 300): Promise<void> {
  const steps = randomBetween(3, 8);
  const stepDistance = Math.floor(distance / steps);

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepDistance);
    await randomDelay(100, 400);
  }
}
