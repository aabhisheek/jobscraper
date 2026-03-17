import { vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockReturn = Record<string, any>;

export function createMockElement(data: Record<string, string | string[] | null> = {}): MockReturn {
  return {
    $eval: vi.fn((selector: string, _fn: (el: unknown) => string) => {
      const key = Object.keys(data).find((k) => selector.includes(k));
      return Promise.resolve(key ? (data[key] ?? '') : '');
    }),
    $$eval: vi.fn((_selector: string, _fn: (els: unknown[]) => string[]) => {
      return Promise.resolve(data['skills'] ?? []);
    }),
    $: vi.fn().mockResolvedValue({
      getAttribute: vi.fn((attr: string) => {
        if (attr === 'href') return data['href'] ?? '';
        if (attr === 'data-job-id') return data['jobId'] ?? null;
        if (attr === 'data-jd-id') return data['jobId'] ?? null;
        return null;
      }),
    }),
    getAttribute: vi.fn((attr: string) => {
      if (attr === 'data-job-id') return data['jobId'] ?? null;
      if (attr === 'data-jd-id') return data['jobId'] ?? null;
      return null;
    }),
  };
}

export function createMockPage(options?: {
  jobCards?: MockReturn[];
  hasAuthWall?: boolean;
  hasJobCards?: boolean;
  descriptionText?: string;
  hasEasyApply?: boolean;
}): MockReturn {
  const {
    jobCards = [],
    hasAuthWall = false,
    hasJobCards = true,
    descriptionText = 'Job description text',
    hasEasyApply = false,
  } = options ?? {};

  const page = {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockImplementation(() => {
      if (!hasJobCards && jobCards.length === 0) {
        return Promise.reject(new Error('Timeout'));
      }
      return Promise.resolve(undefined);
    }),
    $$: vi.fn().mockResolvedValue(jobCards),
    $: vi.fn().mockImplementation((selector: string) => {
      if (selector.includes('auth') || selector.includes('login')) {
        return Promise.resolve(hasAuthWall ? {} : null);
      }
      if (selector.includes('Easy Apply') || selector.includes('apply-button')) {
        return Promise.resolve(hasEasyApply ? {} : null);
      }
      return Promise.resolve(null);
    }),
    $eval: vi.fn().mockImplementation(() => {
      return Promise.resolve(descriptionText);
    }),
    content: vi.fn().mockResolvedValue('<html><body>Page content</body></html>'),
    mouse: {
      wheel: vi.fn().mockResolvedValue(undefined),
      move: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
    },
    keyboard: { type: vi.fn().mockResolvedValue(undefined) },
    click: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return page;
}

export function createMockBrowser(mockPage: MockReturn): MockReturn {
  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    addCookies: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  };
}
